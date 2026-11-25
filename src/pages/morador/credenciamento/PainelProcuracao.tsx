import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  api,
  type SolicitacaoProcuracaoRecord,
  type StatusSolicitacaoProcuracao,
  type UnidadeRecord,
} from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { useCondoConfig } from '@/context/CondoConfigContext'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/hooks/use-toast'
import { formatarCpf, validarCpf, MSG_CPF_INVALIDO } from '@/lib/cpf'
import { formatarIdentificadorUnidade, formatarUnidadeComBloco } from '@/lib/formatadorUnidade'
import { resolverNomesTitularesEmLote } from '@/lib/titularUnidade'
import {
  FileSignature,
  Plus,
  UploadCloud,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Search,
  Building,
  Ban,
  ShieldCheck,
} from 'lucide-react'

const LIMITE_ARQUIVO_BYTES = 5 * 1024 * 1024 // 5 MB
const ACEITOS = '.pdf,image/png,image/jpeg,image/webp'

interface OpcaoAssembleia {
  id: string
  titulo: string
  status: string
}

const rotuloStatus = (s: StatusSolicitacaoProcuracao): string => {
  if (s === 'em_analise') return 'Em análise'
  if (s === 'aprovado') return 'Aprovado'
  if (s === 'cancelado') return 'Cancelado'
  return 'Rejeitado'
}

const classeStatus = (s: StatusSolicitacaoProcuracao): string => {
  if (s === 'em_analise') return 'bg-blue-600 text-white'
  if (s === 'aprovado') return 'bg-emerald-600 text-white'
  if (s === 'cancelado') return 'bg-slate-500 text-white'
  return 'bg-red-600 text-white'
}

const iconeStatus = (s: StatusSolicitacaoProcuracao) => {
  if (s === 'em_analise') return <Clock className="h-4 w-4 text-blue-600" />
  if (s === 'aprovado') return <CheckCircle2 className="h-4 w-4 text-emerald-600" />
  if (s === 'cancelado') return <Ban className="h-4 w-4 text-slate-500" />
  return <XCircle className="h-4 w-4 text-red-600" />
}

const rotuloAssembleia = (d?: { titulo?: string } | null): string => d?.titulo || 'Assembleia'

const formatarDataHora = (iso?: string): string => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

interface PainelProcuracaoProps {
  deliberacaoAtiva: { id: string; titulo: string; status: string } | null
  convocacaoPublicada: boolean
}

export const PainelProcuracao: React.FC<PainelProcuracaoProps> = ({ deliberacaoAtiva }) => {
  const { user } = useAuth()
  const { rotuloUnidade } = useCondoConfig()

  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoProcuracaoRecord[]>([])
  const [formAberto, setFormAberto] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [carregando, setCarregando] = useState(true)

  const [assembleiaId, setAssembleiaId] = useState<string>('')
  const [unidadeId, setUnidadeId] = useState<string>('')
  const [buscaUnidade, setBuscaUnidade] = useState('')
  const [listaUnidades, setListaUnidades] = useState<UnidadeRecord[]>([])
  // Nome do titular por unidade: cadastros_unidade (vínculo ativo/aprovado mais
  // recente) com fallback para unidades.responsavel_nome (nunca placeholder).
  const [titulares, setTitulares] = useState<Record<string, string>>({})
  const [cpfProcurador, setCpfProcurador] = useState('')
  const [cpfErro, setCpfErro] = useState<string | null>(null)
  const [qualificacao, setQualificacao] = useState('Procurador com Poderes Específicos')
  const [arquivos, setArquivos] = useState<File[]>([])
  const [listaAberta, setListaAberta] = useState(false)
  const [assembleias, setAssembleias] = useState<OpcaoAssembleia[]>([])
  const [cancelando, setCancelando] = useState<SolicitacaoProcuracaoRecord | null>(null)

  const inputArquivoRef = useRef<HTMLInputElement>(null)

  const carregarMinhas = async () => {
    if (!user) return
    setCarregando(true)
    try {
      const lista = await api.getMinhasSolicitacoesProcuracao(user.id)
      setSolicitacoes(lista)
    } catch (err) {
      console.error('Erro ao carregar minhas solicitações de procuração:', err)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    let ativo = true
    const carregar = async () => {
      try {
        const todas = await api.getDeliberacoes()
        if (!ativo) return
        const vigentes = todas
          .filter((d) => {
            const s = d.status || ''
            return s !== 'PUBLICADA' && s !== 'ENCERRADA'
          })
          .slice(0, 10)
        setAssembleias(
          vigentes.map((d) => ({ id: d.id, titulo: d.titulo, status: d.status || '' })),
        )
      } catch (err) {
        console.error('Erro ao carregar assembleias para procuração:', err)
      }
    }
    carregar()
    carregarMinhas()
    return () => {
      ativo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Busca TODAS as unidades do condomínio (não só as vinculadas à conta),
  // incluindo a própria unidade do usuário — caso do titular que outorga procuração.
  useEffect(() => {
    let ativo = true
    const carregar = async () => {
      try {
        const todas = await api.getUnidades()
        if (!ativo) return
        setListaUnidades(todas)

        // Nome do titular em lote: cadastros_unidade → fallback responsavel_nome
        const mapa = await resolverNomesTitularesEmLote(todas)
        if (ativo) setTitulares(mapa)
      } catch (err) {
        console.error('Erro ao carregar unidades para procuração:', err)
      }
    }
    carregar()
    return () => {
      ativo = false
    }
  }, [])

  const unidadesFiltradas = useMemo(() => {
    const t = buscaUnidade.trim().toLowerCase()
    const base = listaUnidades.slice(0, 400)
    if (!t) return base
    return base.filter((u) => {
      const ident = (u.identificador || '').toLowerCase()
      const bloco = (u.bloco || '').toLowerCase()
      const resp = (titulares[u.id] || u.responsavel_nome || '').toLowerCase()
      return ident.includes(t) || bloco.includes(t) || resp.includes(t)
    })
  }, [buscaUnidade, listaUnidades, titulares])

  const unidadeEscolhida = listaUnidades.find((u) => u.id === unidadeId) || null
  // Titular exibido/submetido: cadastro de vínculo ativo/aprovado da unidade,
  // nunca o placeholder "Condômino Apto NNNN" de unidades.responsavel_nome.
  const nomeTitularEscolhida = (unidadeEscolhida && titulares[unidadeEscolhida.id]) || ''

  const escolherUnidade = (id: string) => {
    setUnidadeId(id)
    setListaAberta(false)
    const u = listaUnidades.find((x) => x.id === id)
    if (u) setBuscaUnidade(formatarUnidadeComBloco(u, rotuloUnidade))
  }

  const handleCpfChange = (val: string) => {
    const formatado = formatarCpf(val)
    setCpfProcurador(formatado)
    if (cpfErro) {
      const raw = formatado.replace(/\D/g, '')
      if (raw.length === 11 && validarCpf(formatado)) setCpfErro(null)
    }
  }

  const validar = (): string | null => {
    if (!assembleiaId) return 'Escolha a assembleia para a qual a procuração se destina.'
    if (!unidadeId) return 'Busque e escolha a unidade representada.'
    const raw = cpfProcurador.replace(/\D/g, '')
    if (!raw) return 'Informe o CPF do procurador.'
    if (raw.length !== 11 || !validarCpf(cpfProcurador)) return MSG_CPF_INVALIDO
    if (arquivos.length === 0)
      return 'Anexe a procuração e o documento de identidade com foto (PDF ou imagem, até 5 MB cada).'
    return null
  }

  const submeter = async () => {
    if (!user) return
    const erro = validar()
    if (erro) {
      toast({ title: 'Dados incompletos', description: erro, variant: 'destructive' })
      return
    }
    setEnviando(true)
    try {
      const fd = new FormData()
      fd.append('solicitante', user.id)
      fd.append('deliberacao', assembleiaId)
      fd.append('unidade', unidadeId)
      fd.append('titular_outorgante', nomeTitularEscolhida)
      fd.append('cpf_procurador', cpfProcurador)
      fd.append('qualificacao', qualificacao)
      fd.append('status', 'em_analise')
      for (const a of arquivos) fd.append('anexos', a)

      await api.criarSolicitacaoProcuracao(fd)
      toast({
        title: 'Solicitação enviada',
        description:
          'Sua solicitação de credenciamento como procurador foi registrada e aguarda homologação da Mesa.',
      })
      setFormAberto(false)
      setAssembleiaId('')
      setUnidadeId('')
      setBuscaUnidade('')
      setCpfProcurador('')
      setCpfErro(null)
      setArquivos([])
      if (inputArquivoRef.current) inputArquivoRef.current.value = ''
      await carregarMinhas()
    } catch (err: unknown) {
      toast({
        title: 'Falha no envio',
        description: getErrorMessage(err, 'Verifique os dados e tente novamente.'),
        variant: 'destructive',
      })
    } finally {
      setEnviando(false)
    }
  }

  const confirmarCancelamento = async () => {
    if (!cancelando) return
    try {
      await api.cancelarSolicitacaoProcuracao(cancelando.id)
      toast({
        title: 'Solicitação cancelada',
        description: 'A mesa verá o cancelamento na homologação.',
      })
      setCancelando(null)
      await carregarMinhas()
    } catch (err: unknown) {
      toast({
        title: 'Falha ao cancelar',
        description: getErrorMessage(err, 'Tente novamente.'),
        variant: 'destructive',
      })
    }
  }

  const podeCancelar = (s: SolicitacaoProcuracaoRecord) => s.status === 'em_analise'

  const enviarArquivo = (fl: FileList | null) => {
    if (!fl) return
    const novos: File[] = []
    for (let i = 0; i < fl.length; i++) {
      const f = fl[i]
      if (f.size > LIMITE_ARQUIVO_BYTES) {
        toast({
          title: 'Arquivo muito grande',
          description: `"${f.name}" excede 5 MB. Reduza o tamanho e tente novamente.`,
          variant: 'destructive',
        })
        continue
      }
      novos.push(f)
    }
    setArquivos((anteriores) => [...anteriores, ...novos].slice(0, 3))
  }

  const removerArquivo = (idx: number) => {
    setArquivos((a) => a.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-4">
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
                <FileSignature className="h-4 w-4 text-cyan-700" />
                Solicitações de credenciamento como procurador
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-1">
                Recebeu procuração de outro condômino? Solicite aqui seu credenciamento para
                representar a unidade na assembleia. Uma solicitação por unidade e por assembleia.
              </CardDescription>
            </div>
            <Button
              onClick={() => setFormAberto((v) => !v)}
              className="bg-cyan-700 hover:bg-cyan-800 text-white font-semibold text-xs h-9 shrink-0"
            >
              <Plus className="h-4 w-4 mr-1" />
              {formAberto ? 'Fechar formulário' : 'Nova solicitação'}
            </Button>
          </div>
        </CardHeader>

        {formAberto && (
          <CardContent className="border-t border-slate-100 pt-4 space-y-4">
            {/* 1. Assembleia vigente */}
            <div className="space-y-1.5">
              <Label htmlFor="proc-assembleia" className="text-xs font-semibold text-slate-700">
                Assembleia vigente *
              </Label>
              <Select value={assembleiaId} onValueChange={setAssembleiaId}>
                <SelectTrigger id="proc-assembleia" className="h-10 text-xs">
                  <SelectValue placeholder="Selecione a assembleia" />
                </SelectTrigger>
                <SelectContent>
                  {assembleias.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-slate-500">
                      Nenhuma assembleia em andamento no momento.
                    </p>
                  ) : (
                    assembleias.map((a) => (
                      <SelectItem key={a.id} value={a.id} className="text-xs">
                        {a.titulo}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-slate-400">
                A procuração é sempre destinada a uma assembleia específica.
              </p>
            </div>

            {/* 2. Unidade representada (busca em todas, incluindo a própria) */}
            <div className="space-y-1.5">
              <Label htmlFor="proc-unidade-busca" className="text-xs font-semibold text-slate-700">
                Unidade representada *
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="proc-unidade-busca"
                  placeholder="Digite o número/bloco ou nome do titular..."
                  value={buscaUnidade}
                  onChange={(e) => {
                    setBuscaUnidade(e.target.value)
                    setListaAberta(true)
                    setUnidadeId('')
                  }}
                  onFocus={() => setListaAberta(true)}
                  className="pl-9 h-10 text-xs"
                  autoComplete="off"
                />
              </div>
              {listaAberta && (
                <div className="border rounded-md bg-white shadow-sm max-h-48 overflow-y-auto">
                  {unidadesFiltradas.length === 0 ? (
                    <p className="text-xs text-slate-500 p-3">Nenhuma unidade encontrada.</p>
                  ) : (
                    unidadesFiltradas.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => escolherUnidade(u.id)}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between gap-2"
                      >
                        <span className="font-semibold text-slate-800">
                          {formatarUnidadeComBloco(u, rotuloUnidade)}
                        </span>
                        {titulares[u.id] && (
                          <span className="text-slate-500 truncate max-w-[45%]">
                            {titulares[u.id]}
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
              {unidadeEscolhida && (
                <>
                  <div className="flex items-center gap-2 h-10 px-3 rounded-md bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800">
                    <Building className="h-4 w-4 text-cyan-700" />
                    <span>Titular (outorgante): {nomeTitularEscolhida || '—'}</span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Preenchido automaticamente a partir do cadastro da unidade — o CPF do outorgante
                    não é exibido ao solicitante (conferido pela mesa contra a procuração).
                  </p>
                </>
              )}
            </div>

            {/* 3. Qualificação + CPF do procurador */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="proc-qualificacao" className="text-xs font-semibold text-slate-700">
                  Qualificação do votante *
                </Label>
                <Input
                  id="proc-qualificacao"
                  value={qualificacao}
                  onChange={(e) => setQualificacao(e.target.value)}
                  className="h-10 text-xs"
                />
                <p className="text-[10px] text-slate-400">
                  Ex.: "Procurador com Poderes Específicos"
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="proc-cpf" className="text-xs font-semibold text-slate-700">
                  CPF do procurador (você) *
                </Label>
                <Input
                  id="proc-cpf"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="000.000.000-00"
                  maxLength={14}
                  value={cpfProcurador}
                  onChange={(e) => handleCpfChange(e.target.value)}
                  className={`h-10 text-xs font-mono ${
                    cpfErro ? 'border-red-500 focus-visible:ring-red-500' : ''
                  }`}
                />
                {cpfErro && <p className="text-[11px] font-medium text-red-600">{cpfErro}</p>}
              </div>
            </div>

            {/* 4. Anexos */}
            <div className="space-y-1.5 pt-2">
              <Label htmlFor="proc-anexos" className="text-xs font-semibold text-slate-700">
                Procuração + documento de identidade com foto (PDF ou imagem, máx. 5 MB cada) *
              </Label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:bg-slate-50 transition-colors">
                <UploadCloud className="h-7 w-7 text-cyan-600 mx-auto mb-2" />
                <label
                  htmlFor="proc-anexos"
                  className="text-xs font-semibold text-cyan-700 hover:text-cyan-800 cursor-pointer underline"
                >
                  Clique para selecionar os arquivos
                </label>
                <input
                  ref={inputArquivoRef}
                  id="proc-anexos"
                  type="file"
                  multiple
                  accept={ACEITOS}
                  onChange={(e) => {
                    enviarArquivo(e.target.files)
                    e.target.value = ''
                  }}
                  className="hidden"
                />
              </div>
              {arquivos.length > 0 && (
                <div className="space-y-1">
                  {arquivos.map((a, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-xs text-slate-600 bg-slate-100 p-1.5 px-2.5 rounded"
                    >
                      <FileText className="h-3.5 w-3.5 text-cyan-700 shrink-0" />
                      <span className="font-medium truncate">{a.name}</span>
                      <span className="text-[10px] text-slate-400">
                        ({(a.size / 1024).toFixed(1)} KB)
                      </span>
                      <button
                        type="button"
                        onClick={() => removerArquivo(i)}
                        className="ml-auto text-red-600 hover:text-red-800 text-xs font-bold"
                        aria-label={`Remover arquivo ${a.name}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Alert className="border-cyan-200 bg-cyan-50/60 text-cyan-950">
              <ShieldCheck className="h-4 w-4 text-cyan-700" />
              <AlertTitle className="text-xs font-bold">Privacidade do outorgante</AlertTitle>
              <AlertDescription className="text-xs">
                O nome do titular é preenchido automaticamente e o CPF dele não é exibido ao
                solicitante — será conferido pela Mesa Diretora contra a procuração apresentada.
              </AlertDescription>
            </Alert>

            <CardFooter className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3 px-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFormAberto(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                onClick={submeter}
                disabled={enviando}
                className="bg-cyan-700 hover:bg-cyan-800 text-white font-semibold text-xs"
              >
                {enviando ? 'Enviando...' : 'Submeter credenciamento à mesa'}
              </Button>
            </CardFooter>
          </CardContent>
        )}
      </Card>

      {/* Minhas solicitações */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold text-slate-800">Minhas solicitações</CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Acompanhe o status das suas solicitações de credenciamento como procurador.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {carregando ? (
            <p className="text-xs text-slate-500 py-4">Carregando solicitações...</p>
          ) : solicitacoes.length === 0 ? (
            <p className="text-xs text-slate-500 py-4">
              Você ainda não submeteu solicitações de credenciamento como procurador.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[10px] uppercase font-bold text-slate-400 border-b border-slate-200">
                    <th className="py-2 pr-3">Assembleia</th>
                    <th className="py-2 pr-3">Apto/Unidade</th>
                    <th className="py-2 pr-3">Data e hora</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {solicitacoes.map((s) => {
                    const unid = s.expand?.unidade
                    return (
                      <tr key={s.id} className="border-b border-slate-100">
                        <td className="py-2 pr-3 font-semibold text-slate-800">
                          {rotuloAssembleia(s.expand?.deliberacao)}
                        </td>
                        <td className="py-2 pr-3 text-slate-700">
                          {unid
                            ? formatarIdentificadorUnidade(
                                unid.identificador,
                                unid.tipo_unidade,
                                rotuloUnidade,
                              )
                            : '—'}
                        </td>
                        <td className="py-2 pr-3 text-slate-600">{formatarDataHora(s.created)}</td>
                        <td className="py-2 pr-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${classeStatus(s.status)}`}
                          >
                            {iconeStatus(s.status)}
                            {rotuloStatus(s.status)}
                          </span>
                          {s.status === 'rejeitado' && s.motivo_rejeicao && (
                            <p className="text-[10px] text-red-700 mt-1 font-medium">
                              Motivo: {s.motivo_rejeicao}
                            </p>
                          )}
                        </td>
                        <td className="py-2 text-right">
                          {podeCancelar(s) && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[11px] text-red-700 border-red-300 hover:bg-red-50"
                              onClick={() => setCancelando(s)}
                            >
                              <Ban className="h-3.5 w-3.5 mr-1" /> Cancelar
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de cancelamento */}
      <Dialog open={!!cancelando} onOpenChange={(o) => !o && setCancelando(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Cancelar solicitação?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              A mesa deixará de analisar esta solicitação e a unidade não será credenciada por
              procuração. A ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCancelando(null)}
              className="text-xs"
            >
              Voltar
            </Button>
            <Button
              size="sm"
              onClick={confirmarCancelamento}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
            >
              Confirmar cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default PainelProcuracao
