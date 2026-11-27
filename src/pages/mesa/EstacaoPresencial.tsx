import React, { useEffect, useMemo, useState, useRef } from 'react'
import {
  api,
  normalizarModalidadePresencial,
  type DeliberacaoRecord,
  type ItemPautaRecord,
} from '@/lib/api'
import pbClient from '@/lib/pocketbase/client'
const pb = pbClient
import { useAuth } from '@/context/AuthContext'
import { limparCpf, formatarCpf, validarCpf, MSG_CPF_INVALIDO } from '@/lib/cpf'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import {
  MonitorSmartphone,
  Lock,
  Unlock,
  KeyRound,
  Fingerprint,
  Vote,
  CheckCircle2,
  ArrowLeft,
  ShieldCheck,
  Loader2,
  ScanLine,
} from 'lucide-react'

type Etapa = 'bloqueada' | 'aguardando' | 'votando' | 'concluido'

type OpcaoVoto = 'favoravel' | 'contrario' | 'abstencao' | `candidato:${number}`

interface ReciboEstacao {
  reciboCodigo: string
  hashAbreviado: string
  dataHora: string
}

const ROTULO_OPCAO: Record<OpcaoVoto, string> = {
  favoravel: 'Favorável',
  contrario: 'Contrário',
  abstencao: 'Abstenção',
}

/**
 * Estação de Voto Presencial (tablet do salão).
 *
 * Fluxo: a mesa desbloqueia a estação (senha da própria conta da mesa);
 * em seguida o morador se autentica com CPF + senha do Koinon (ou CPF +
 * código de uso único gerado pela mesa) e registra o voto na urna
 * criptográfica existente, recebendo recibo com hash abreviado SHA-256.
 *
 * Regras de "1 unidade = 1 voto" e bloqueio cruzado remoto x presencial
 * ficam no backend (hooks estacao_presencial.js).
 */
export const EstacaoPresencialPage: React.FC = () => {
  const { user } = useAuth()

  const [etapa, setEtapa] = useState<Etapa>('bloqueada')
  const [deliberacoes, setDeliberacoes] = useState<DeliberacaoRecord[]>([])
  const [deliberacaoId, setDeliberacaoId] = useState('')
  const [senhaMesa, setSenhaMesa] = useState('')
  const [desbloqueando, setDesbloqueando] = useState(false)

  const [cpf, setCpf] = useState('')
  const [senhaMorador, setSenhaMorador] = useState('')
  const [codigo, setCodigo] = useState('')
  const [usarCodigo, setUsarCodigo] = useState(false)
  const [processando, setProcessando] = useState(false)

  const [sessao, setSessao] = useState<{
    tokenVoto: string
    nome: string
    unidade: string
    vinculo: string
  } | null>(null)
  const [itens, setItens] = useState<ItemPautaRecord[]>([])
  const [votos, setVotos] = useState<Record<string, OpcaoVoto>>({})
  const [recibo, setRecibo] = useState<ReciboEstacao | null>(null)

  const refCpf = useRef<HTMLInputElement>(null)

  // Deliberações elegíveis: em votação e com modalidade 'estacao'
  const deliberacoesEstacao = useMemo(
    () =>
      deliberacoes.filter(
        (d) =>
          d.status === 'EM_VOTACAO' &&
          normalizarModalidadePresencial(d.modalidade_presencial) === 'estacao',
      ),
    [deliberacoes],
  )

  useEffect(() => {
    if (etapa === 'bloqueada') return
    let cancel = false
    ;(async () => {
      try {
        const lista = await api.getDeliberacoes()
        if (!cancel) setDeliberacoes(lista)
      } catch {
        /* silencioso: re-tentativa no próximo ciclo */
      }
    })()
    return () => {
      cancel = true
    }
  }, [etapa])

  useEffect(() => {
    if (deliberacoesEstacao.length > 0 && !deliberacaoId) {
      setDeliberacaoId(deliberacoesEstacao[0].id)
    }
    if (deliberacaoId && !deliberacoesEstacao.some((d) => d.id === deliberacaoId)) {
      setDeliberacaoId(deliberacoesEstacao[0]?.id || '')
    }
  }, [deliberacoesEstacao, deliberacaoId])

  const handleDesbloquear = async () => {
    if (!senhaMesa) {
      toast({
        title: 'Informe a senha da mesa',
        description: 'A estação só é desbloqueada por um membro da mesa diretora.',
        variant: 'destructive',
      })
      return
    }
    setDesbloqueando(true)
    try {
      // Autenticação real da mesa via PocketBase (auth com email + senha).
      // O usuário logado neste dispositivo é o operador da estação.
      const emailMesa = user?.email || ''
      if (!emailMesa) {
        toast({
          title: 'Sessão da mesa não encontrada',
          description: 'Entre com a conta da mesa antes de abrir a estação.',
          variant: 'destructive',
        })
        return
      }
      await pb.collection('users').authWithPassword(emailMesa, senhaMesa)
      setEtapa('aguardando')
      setSenhaMesa('')
      toast({
        title: 'Estação desbloqueada',
        description: 'Modo estação ativo até nova trava pela mesa.',
      })
    } catch (err: unknown) {
      toast({
        title: 'Não foi possível desbloquear',
        description: getErrorMessage(err, 'Senha da mesa incorreta ou falha de conexão.'),
        variant: 'destructive',
      })
    } finally {
      setDesbloqueando(false)
    }
  }

  const handleTravar = () => {
    setEtapa('bloqueada')
    setSessao(null)
    setRecibo(null)
    setVotos({})
    setCpf('')
    setSenhaMorador('')
    setCodigo('')
    setUsarCodigo(false)
    setDeliberacaoId('')
    setDeliberacoes([])
  }

  const handleAutenticarEMostrarUrna = async () => {
    const cpfLimpo = limparCpf(cpf)
    if (!validarCpf(cpfLimpo)) {
      toast({ title: MSG_CPF_INVALIDO, variant: 'destructive' })
      return
    }
    if (!usarCodigo && !senhaMorador) {
      toast({ title: 'Informe a senha do Koinon', variant: 'destructive' })
      return
    }
    if (usarCodigo && !codigo.trim()) {
      toast({ title: 'Informe o código de uso único', variant: 'destructive' })
      return
    }
    if (!deliberacaoId) {
      toast({
        title: 'Nenhuma deliberação aberta em modo estação',
        description:
          'A mesa deve abrir a deliberação com a modalidade "Estação de voto presencial".',
        variant: 'destructive',
      })
      return
    }

    setProcessando(true)
    try {
      const resp = await api.estacaoLogin({
        deliberacaoId,
        cpf: cpfLimpo,
        ...(usarCodigo ? { codigo: codigo.trim() } : { senha: senhaMorador }),
      })
      if (!resp.success || !resp.tokenVoto) {
        throw new Error(resp.message || 'Autenticação recusada pela urna.')
      }
      setSessao({
        tokenVoto: resp.tokenVoto,
        nome: resp.nomeTitular || 'Morador',
        unidade: resp.unidadeIdentificador || '',
        vinculo: resp.vinculoVotante || 'proprietario',
      })
      // Carrega os itens da pauta para a cédula
      const itensCarregados = await api.getItensPauta(deliberacaoId)
      setItens(itensCarregados)
      setVotos({})
      setEtapa('votando')
    } catch (err: unknown) {
      toast({
        title: 'Autenticação recusada',
        description: getErrorMessage(
          err,
          'CPF/senha ou CPF/código inválidos, ou unidade sem credenciamento presencial.',
        ),
        variant: 'destructive',
      })
    } finally {
      setProcessando(false)
    }
  }

  const handleRegistrarVoto = async () => {
    if (!deliberacaoId || !sessao) return
    if (itens.length === 0 || itens.some((i) => !votos[i.id])) {
      toast({
        title: 'Cédula incompleta',
        description: 'Registre o voto em todos os itens da pauta.',
        variant: 'destructive',
      })
      return
    }
    setProcessando(true)
    try {
      const resp = await api.estacaoRegistrarVoto({
        tokenVoto: sessao.tokenVoto,
        deliberacaoId,
        votos: itens.map((i) => ({ itemId: i.id, opcao: votos[i.id] })),
      })
      if (!resp.success || !resp.reciboCodigo) {
        throw new Error(resp.message || 'Falha ao registrar o voto na urna.')
      }
      setRecibo({
        reciboCodigo: resp.reciboCodigo,
        hashAbreviado: resp.hashAbreviado || '',
        dataHora: resp.dataHora || '',
      })
      setEtapa('concluido')
    } catch (err: unknown) {
      toast({
        title: 'Voto não registrado',
        description: getErrorMessage(
          err,
          'Falha ao registrar o voto na urna. Procure a mesa diretora.',
        ),
        variant: 'destructive',
      })
      // Sessão/token possivelmente consumido: volta para nova autenticação
      setSessao(null)
      setVotos({})
      setEtapa('aguardando')
    } finally {
      setProcessando(false)
    }
  }

  const limparParaProximo = () => {
    setRecibo(null)
    setSessao(null)
    setVotos({})
    setItens([])
    setCpf('')
    setSenhaMorador('')
    setCodigo('')
    setUsarCodigo(false)
    setEtapa('aguardando')
    setTimeout(() => refCpf.current?.focus(), 50)
  }

  // ---------------------------------------------------------------- Render

  if (etapa === 'bloqueada') {
    return (
      <div className="min-h-dvh bg-gradient-to-b from-[#002B5E] to-[#001838] flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-none shadow-2xl">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto h-14 w-14 rounded-full bg-[#0066FF]/10 flex items-center justify-center">
              <Lock className="h-7 w-7 text-[#0066FF]" />
            </div>
            <CardTitle className="text-xl font-bold text-slate-900">
              Estação de Voto Presencial
            </CardTitle>
            <p className="text-sm text-slate-500">
              Este equipamento permanece travado até que a mesa diretora o desbloqueie.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="senha-mesa">Senha da mesa diretora</Label>
              <Input
                id="senha-mesa"
                type="password"
                autoComplete="current-password"
                value={senhaMesa}
                onChange={(e) => setSenhaMesa(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void handleDesbloquear()}
                placeholder="Confirme a senha da sua conta de mesa"
              />
            </div>
            <Button
              className="w-full bg-[#0066FF] hover:bg-[#0055d4]"
              onClick={() => void handleDesbloquear()}
              disabled={desbloqueando}
            >
              {desbloqueando ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Unlock className="mr-2 h-4 w-4" />
              )}
              Desbloquear estação
            </Button>
            <p className="text-[11px] text-center text-slate-400 flex items-center justify-center gap-1">
              <ShieldCheck className="h-3 w-3" /> A urna criptográfica e o bloqueio cruzado de votos
              são controlados pelo servidor.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (etapa === 'concluido' && recibo) {
    return (
      <div className="min-h-dvh bg-gradient-to-b from-[#002B5E] to-[#001838] flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-none shadow-2xl">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            </div>
            <CardTitle className="text-xl font-bold text-slate-900">Voto registrado</CardTitle>
            <p className="text-sm text-slate-500">
              Obrigado, {sessao?.nome || 'morador'}. Seu voto entrou na urna criptográfica do
              condomínio.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">
                Recibo de conferência
              </span>
              <p className="font-mono text-xl font-bold text-slate-900 bg-white border border-slate-300 p-2 text-center tracking-[0.2em] select-all">
                {recibo.reciboCodigo}
              </p>
              {recibo.hashAbreviado && (
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">
                    Hash SHA-256 (abreviado)
                  </span>
                  <p className="font-mono text-[11px] font-bold text-slate-900 bg-white border border-slate-300 p-2 break-all select-all">
                    {recibo.hashAbreviado}
                  </p>
                </div>
              )}
              {recibo.dataHora && (
                <p className="text-[11px] text-slate-500">Registrado em {recibo.dataHora}</p>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              Anote ou fotografe este recibo. Em caso de questionamento, a mesa diretora pode
              conferir o código e o hash na trilha de auditoria.
            </p>
            <Button className="w-full bg-[#0066FF] hover:bg-[#0055d4]" onClick={limparParaProximo}>
              <Vote className="mr-2 h-4 w-4" /> Próximo morador
            </Button>
            <Button variant="ghost" className="w-full text-xs" onClick={handleTravar}>
              <Lock className="mr-1.5 h-3.5 w-3.5" /> Travar estação (mesa)
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (etapa === 'votando' && sessao) {
    return (
      <div className="min-h-dvh bg-slate-100 p-4 overflow-y-auto">
        <div className="max-w-lg mx-auto space-y-4 py-6">
          <div className="flex items-center justify-between">
            <Badge className="bg-[#0066FF] text-white gap-1">
              <MonitorSmartphone className="h-3 w-3" /> Estação presencial
            </Badge>
            <span className="text-xs text-slate-500 font-semibold">
              {sessao.nome}
              {sessao.unidade ? ` • Unidade ${sessao.unidade}` : ''}
            </span>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Fingerprint className="h-4 w-4 text-[#0066FF]" /> Cédula da assembleia
              </CardTitle>
              <p className="text-xs text-slate-500">
                Confira cada item e registre o voto. O voto é sigiloso: a cédula é criptografada e o
                recibo não revela o conteúdo.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {itens.length === 0 && (
                <p className="text-sm text-slate-500">
                  Nenhum item de pauta disponível para esta deliberação.
                </p>
              )}
              {itens.map((item) => (
                <div key={item.id} className="border border-slate-200 rounded-lg p-3">
                  <p className="text-sm font-semibold text-slate-900 mb-2">
                    {item.ordem ? `${item.ordem}. ` : ''}
                    {item.titulo}
                  </p>
                  {item.tipo_eleicao === 'eleicao' &&
                  Array.isArray(item.candidatos_eleicao) &&
                  item.candidatos_eleicao.length > 0 ? (
                    <div
                      role="radiogroup"
                      aria-label={`Candidatos do item ${item.ordem ?? ''}`}
                      className="grid grid-cols-1 gap-2"
                    >
                      {item.candidatos_eleicao.map((candidato, idx) => {
                        const opcaoCandidato = `candidato:${idx}` as OpcaoVoto
                        const selecionado = votos[item.id] === opcaoCandidato
                        return (
                          <Button
                            key={`${item.id}-candidato-${idx}`}
                            type="button"
                            role="radio"
                            aria-checked={selecionado}
                            variant={selecionado ? 'default' : 'outline'}
                            className={
                              selecionado
                                ? 'bg-[#0066FF] hover:bg-[#0055d4] text-white justify-start'
                                : 'text-slate-700 justify-start'
                            }
                            onClick={() => setVotos((v) => ({ ...v, [item.id]: opcaoCandidato }))}
                          >
                            <span className="flex flex-col items-start leading-tight">
                              <span>{candidato.nome}</span>
                              {candidato.cargo && (
                                <span
                                  className={`text-[10px] ${selecionado ? 'text-blue-100' : 'text-slate-400'}`}
                                >
                                  {candidato.cargo}
                                </span>
                              )}
                            </span>
                          </Button>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {(['favoravel', 'contrario', 'abstencao'] as const).map((op) => (
                        <Button
                          key={op}
                          type="button"
                          variant={votos[item.id] === op ? 'default' : 'outline'}
                          className={
                            votos[item.id] === op
                              ? 'bg-[#0066FF] hover:bg-[#0055d4] text-white'
                              : 'text-slate-700'
                          }
                          onClick={() => setVotos((v) => ({ ...v, [item.id]: op }))}
                          aria-pressed={votos[item.id] === op}
                        >
                          {ROTULO_OPCAO[op]}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-500"
                onClick={() => void handleRegistrarVoto()}
                disabled={processando || itens.length === 0}
              >
                {processando ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Confirmar voto na urna
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Etapa 'aguardando'
  return (
    <div className="min-h-dvh bg-gradient-to-b from-[#002B5E] to-[#001838] flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-none shadow-2xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto h-14 w-14 rounded-full bg-[#0066FF]/10 flex items-center justify-center">
            <MonitorSmartphone className="h-7 w-7 text-[#0066FF]" />
          </div>
          <CardTitle className="text-xl font-bold text-slate-900">
            Estação de Voto Presencial
          </CardTitle>
          <p className="text-sm text-slate-500">
            Estação desbloqueada. Aguardando autenticação do morador.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="delib-estacao">Assembleia em votação</Label>
            <select
              id="delib-estacao"
              className="w-full h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF]"
              value={deliberacaoId}
              onChange={(e) => setDeliberacaoId(e.target.value)}
            >
              {deliberacoesEstacao.length === 0 && (
                <option value="">Nenhuma deliberação aberta em modo estação</option>
              )}
              {deliberacoesEstacao.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.titulo}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cpf-estacao">CPF do morador</Label>
            <Input
              id="cpf-estacao"
              ref={refCpf}
              inputMode="numeric"
              autoComplete="off"
              placeholder="000.000.000-00"
              value={formatarCpf(limparCpf(cpf))}
              onChange={(e) => setCpf(e.target.value)}
              maxLength={14}
            />
          </div>

          {!usarCodigo ? (
            <div className="space-y-2">
              <Label htmlFor="senha-estacao">Senha do Koinon</Label>
              <Input
                id="senha-estacao"
                type="password"
                autoComplete="off"
                value={senhaMorador}
                onChange={(e) => setSenhaMorador(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void handleAutenticarEMostrarUrna()}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="codigo-estacao" className="flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-[#0066FF]" /> Código de uso único (gerado pela
                mesa)
              </Label>
              <Input
                id="codigo-estacao"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && void handleAutenticarEMostrarUrna()}
                placeholder="Ex.: KX72-4810"
              />
            </div>
          )}

          <button
            type="button"
            onClick={() => setUsarCodigo((u) => !u)}
            className="text-xs text-[#0066FF] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] rounded"
          >
            {usarCodigo ? 'Usar senha do Koinon' : 'Não tem senha? Usar código de uso único'}
          </button>

          <Button
            className="w-full bg-[#0066FF] hover:bg-[#0055d4]"
            onClick={() => void handleAutenticarEMostrarUrna()}
            disabled={processando}
          >
            {processando ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Vote className="mr-2 h-4 w-4" />
            )}
            Autenticar e abrir cédula
          </Button>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              <ScanLine className="h-3 w-3" />
              {user ? `Operador: ${user.name || user.email}` : ''}
            </p>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleTravar}>
              <ArrowLeft className="mr-1 h-3 w-3" /> Travar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default EstacaoPresencialPage
