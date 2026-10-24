import React, { useState, useEffect } from 'react'
import {
  api,
  type DeliberacaoRecord,
  type DeliberacaoStatus,
  type PresencaRecord,
  type ComparecimentoRecord,
  type UnidadeRecord,
} from '@/lib/api'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'
import {
  ShieldCheck,
  Users,
  Vote,
  Play,
  Square,
  FileCheck2,
  Share2,
  UserCheck,
  Building,
  CheckCircle,
} from 'lucide-react'

export const PainelMesaPage: React.FC = () => {
  const [deliberacoes, setDeliberacoes] = useState<DeliberacaoRecord[]>([])
  const [deliberacaoAtiva, setDeliberacaoAtiva] = useState<DeliberacaoRecord | null>(null)
  const [presencas, setPresencas] = useState<PresencaRecord[]>([])
  const [comparecimentos, setComparecimentos] = useState<ComparecimentoRecord[]>([])
  const [unidades, setUnidades] = useState<UnidadeRecord[]>([])

  // Registro de presença presencial
  const [unidadePresencialId, setUnidadePresencialId] = useState<string>('')
  const [salvandoPresenca, setSalvandoPresenca] = useState(false)

  // Transição de estado
  const [novoStatusSelecionado, setNovoStatusSelecionado] = useState<DeliberacaoStatus | null>(null)
  const [dialogTransicaoAberto, setDialogTransicaoAberto] = useState(false)
  const [executandoTransicao, setExecutandoTransicao] = useState(false)

  const [carregando, setCarregando] = useState(true)

  const carregarDados = async () => {
    try {
      const [delibs, unids] = await Promise.all([api.getDeliberacoes(), api.getUnidades()])
      setDeliberacoes(delibs)
      setUnidades(unids)

      const ativa = delibs.find((d) => d.status !== 'PUBLICADA') || delibs[0] || null
      setDeliberacaoAtiva(ativa)

      if (ativa) {
        const [pres, comps] = await Promise.all([
          api.getPresencas(ativa.id),
          api.getComparecimentos(ativa.id),
        ])
        setPresencas(pres)
        setComparecimentos(comps)
      }
    } catch (err) {
      console.error('Erro ao carregar dados da mesa:', err)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarDados()
    const timer = setInterval(carregarDados, 10000)
    return () => clearInterval(timer)
  }, [])

  const selecionarDeliberacao = async (id: string) => {
    const d = deliberacoes.find((item) => item.id === id) || null
    setDeliberacaoAtiva(d)
    if (d) {
      const [pres, comps] = await Promise.all([
        api.getPresencas(d.id),
        api.getComparecimentos(d.id),
      ])
      setPresencas(pres)
      setComparecimentos(comps)
    }
  }

  // Quórum ao vivo
  const totalUnidades = 52
  const presencasPresenciais = presencas.filter((p) => p.tipo === 'presencial')
  const presencasRemotas = presencas.filter((p) => p.tipo === 'remoto')
  const totalPresentes = presencas.length
  const quorumExigido = deliberacaoAtiva?.quorum_instalacao || 27 // 50% + 1
  const percentualQuorum = Math.min(100, Math.round((totalPresentes / quorumExigido) * 100))
  const quorumAtingido = totalPresentes >= quorumExigido

  // Registrar Presença Presencial (bloqueia canal online da unidade)
  const handleRegistrarPresencial = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!deliberacaoAtiva || !unidadePresencialId) return

    setSalvandoPresenca(true)
    try {
      await api.registrarPresencaPresencial(deliberacaoAtiva.id, unidadePresencialId)
      toast({
        title: 'Presença Física Registrada',
        description: 'A unidade foi computada no quórum e seu canal online foi bloqueado.',
      })
      setUnidadePresencialId('')
      carregarDados()
    } catch (err: any) {
      toast({
        title: 'Erro ao Registrar Presença',
        description: err?.message || 'Unidade já pode ter presença registrada.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoPresenca(false)
    }
  }

  // Confirmar Transição de Status
  const abrirConfirmacaoTransicao = (status: DeliberacaoStatus) => {
    setNovoStatusSelecionado(status)
    setDialogTransicaoAberto(true)
  }

  const handleExecutarTransicao = async () => {
    if (!deliberacaoAtiva || !novoStatusSelecionado) return

    setExecutandoTransicao(true)
    try {
      const resp = await api.transitarDeliberacao(deliberacaoAtiva.id, novoStatusSelecionado)
      toast({
        title: 'Status Alterado com Sucesso',
        description: resp.message || `Transição para ${novoStatusSelecionado} concluída.`,
      })
      setDialogTransicaoAberto(false)
      carregarDados()
    } catch (err: any) {
      toast({
        title: 'Falha na Transição',
        description: err?.message || 'Apenas membros da Mesa podem alterar o status.',
        variant: 'destructive',
      })
    } finally {
      setExecutandoTransicao(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-amber-600" /> Painel de Controle da Mesa Diretora
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Gestão do ciclo da assembleia, controle do quórum de instalação, presenças físicas e
            apuração oficial.
          </p>
        </div>

        {/* Seletor de Deliberação */}
        {deliberacoes.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Deliberação:</span>
            <Select value={deliberacaoAtiva?.id || ''} onValueChange={selecionarDeliberacao}>
              <SelectTrigger className="w-[260px] h-9 text-xs">
                <SelectValue placeholder="Selecione a deliberação" />
              </SelectTrigger>
              <SelectContent>
                {deliberacoes.map((d) => (
                  <SelectItem key={d.id} value={d.id} className="text-xs">
                    {d.titulo} ({d.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Ciclo de Vida da Deliberação Ativa */}
      {deliberacaoAtiva && (
        <Card className="border-amber-200 bg-amber-50/30 shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-800 tracking-wider">
                  Controle de Ciclo Eleitoral
                </span>
                <CardTitle className="text-base font-bold text-slate-900 mt-0.5">
                  {deliberacaoAtiva.titulo}
                </CardTitle>
              </div>
              <Badge className="bg-amber-600 text-white text-xs uppercase px-2.5 py-1 self-start sm:self-center">
                Status Atual: {deliberacaoAtiva.status}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-1">
            <p className="text-xs text-slate-600">
              Conduza as etapas regimentais da assembleia em conformidade com a convenção do
              condomínio Lago Azul:
            </p>

            {/* Botoeira de Transições */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {/* 1. AGUARDANDO_ABERTURA */}
              <Button
                variant={deliberacaoAtiva.status === 'AGUARDANDO_ABERTURA' ? 'default' : 'outline'}
                size="sm"
                onClick={() => abrirConfirmacaoTransicao('AGUARDANDO_ABERTURA')}
                disabled={deliberacaoAtiva.status === 'AGUARDANDO_ABERTURA'}
                className="text-xs h-9 justify-center"
              >
                1. Aguardando
              </Button>

              {/* 2. ABERTA */}
              <Button
                variant={deliberacaoAtiva.status === 'ABERTA' ? 'default' : 'outline'}
                size="sm"
                onClick={() => abrirConfirmacaoTransicao('ABERTA')}
                disabled={deliberacaoAtiva.status === 'ABERTA'}
                className="text-xs h-9 justify-center bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Play className="mr-1 h-3.5 w-3.5" /> 2. Abrir
              </Button>

              {/* 3. EM_VOTACAO */}
              <Button
                variant={deliberacaoAtiva.status === 'EM_VOTACAO' ? 'default' : 'outline'}
                size="sm"
                onClick={() => abrirConfirmacaoTransicao('EM_VOTACAO')}
                disabled={deliberacaoAtiva.status === 'EM_VOTACAO'}
                className="text-xs h-9 justify-center bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                <Vote className="mr-1 h-3.5 w-3.5" /> 3. Votação
              </Button>

              {/* 4. ENCERRADA */}
              <Button
                variant={deliberacaoAtiva.status === 'ENCERRADA' ? 'default' : 'outline'}
                size="sm"
                onClick={() => abrirConfirmacaoTransicao('ENCERRADA')}
                disabled={deliberacaoAtiva.status === 'ENCERRADA'}
                className="text-xs h-9 justify-center bg-amber-600 hover:bg-amber-700 text-white"
              >
                <Square className="mr-1 h-3.5 w-3.5" /> 4. Encerrar
              </Button>

              {/* 5. APURADA */}
              <Button
                variant={deliberacaoAtiva.status === 'APURADA' ? 'default' : 'outline'}
                size="sm"
                onClick={() => abrirConfirmacaoTransicao('APURADA')}
                disabled={deliberacaoAtiva.status === 'APURADA'}
                className="text-xs h-9 justify-center bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <FileCheck2 className="mr-1 h-3.5 w-3.5" /> 5. Apurar
              </Button>

              {/* 6. PUBLICADA */}
              <Button
                variant={deliberacaoAtiva.status === 'PUBLICADA' ? 'default' : 'outline'}
                size="sm"
                onClick={() => abrirConfirmacaoTransicao('PUBLICADA')}
                disabled={deliberacaoAtiva.status === 'PUBLICADA'}
                className="text-xs h-9 justify-center bg-teal-600 hover:bg-teal-700 text-white"
              >
                <Share2 className="mr-1 h-3.5 w-3.5" /> 6. Publicar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quórum ao Vivo & Reconciliação */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel de Quórum */}
        <Card className="border-slate-200 shadow-xs lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Users className="h-4 w-4 text-cyan-700" /> Quórum de Instalação e Comparecimento
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Total de 52 unidades • Exigência de quórum: {quorumExigido} unidades
                </CardDescription>
              </div>
              <Badge
                className={
                  quorumAtingido
                    ? 'bg-emerald-600 text-white text-xs'
                    : 'bg-amber-600 text-white text-xs'
                }
              >
                {quorumAtingido ? 'Quórum Atingido' : 'Aguardando Quórum'}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-2">
            {/* Barra de Progresso do Quórum */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-slate-700">
                  {totalPresentes} unidades presentes ({percentualQuorum}% da meta de instalação)
                </span>
                <span className="text-slate-500">Meta: {quorumExigido} unidades</span>
              </div>
              <Progress value={percentualQuorum} className="h-3" />
            </div>

            {/* Métricas Detalhadas */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Presenças Físicas
                </span>
                <span className="text-xl font-extrabold text-amber-700">
                  {presencasPresenciais.length}
                </span>
                <span className="text-[10px] text-slate-500 block">no plenário</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Presenças Remotas
                </span>
                <span className="text-xl font-extrabold text-cyan-700">
                  {presencasRemotas.length}
                </span>
                <span className="text-[10px] text-slate-500 block">via internet</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Cédulas Depositadas
                </span>
                <span className="text-xl font-extrabold text-emerald-700">
                  {comparecimentos.length}
                </span>
                <span className="text-[10px] text-slate-500 block">votos na urna</span>
              </div>
            </div>

            {/* Lista Resumida de Presentes */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                Unidades com Presença Confirmada ({presencas.length})
              </h4>
              <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                {presencas.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">
                    Nenhuma presença computada ainda.
                  </p>
                ) : (
                  presencas.map((p) => {
                    const unid = unidades.find((u) => u.id === p.unidade)
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <Building className="h-3.5 w-3.5 text-slate-400" />
                          <span className="font-semibold text-slate-800">
                            Apto {unid?.identificador || p.unidade}
                          </span>
                          <span className="text-slate-500 text-[11px]">
                            ({unid?.responsavel_nome || 'Condômino'})
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            p.tipo === 'presencial'
                              ? 'border-amber-400 text-amber-800 bg-amber-50 text-[10px]'
                              : 'border-cyan-400 text-cyan-800 bg-cyan-50 text-[10px]'
                          }
                        >
                          {p.tipo === 'presencial' ? 'Física' : 'Remota'}
                        </Badge>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card: Registro de Presença Física / Procuração */}
        <Card className="border-slate-200 shadow-xs flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-amber-600" /> Registro Presencial e Procurações
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Registrar presença física da unidade ou procurador presente no plenário.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-1">
            <form onSubmit={handleRegistrarPresencial} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Selecione a Unidade</label>
                <Select value={unidadePresencialId} onValueChange={setUnidadePresencialId}>
                  <SelectTrigger className="w-full text-xs h-10">
                    <SelectValue placeholder="Selecione a unidade presente..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {unidades.map((u) => {
                      const jaPresente = presencas.some((p) => p.unidade === u.id)
                      return (
                        <SelectItem key={u.id} value={u.id} className="text-xs">
                          Apto {u.identificador} — {u.responsavel_nome}{' '}
                          {jaPresente ? '(Já presente)' : ''}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-900 space-y-1">
                <strong>Regra de Reconciliação:</strong> Ao registrar presença física, o canal de
                votação eletrônica remoto desta unidade será{' '}
                <strong>bloqueado imediatamente</strong> na urna, evitando duplicidade de voto (1
                Unidade = 1 Voto). Procuradores podem representar múltiplas unidades.
              </div>

              <Button
                type="submit"
                disabled={salvandoPresenca || !unidadePresencialId}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs h-10"
              >
                {salvandoPresenca ? 'Registrando...' : 'Confirmar Presença Física'}
              </Button>
            </form>
          </CardContent>

          <div className="p-3 border-t border-slate-100 text-[11px] text-slate-400 text-center">
            Auditoria encadeada ativada via Hook de Reconciliação.
          </div>
        </Card>
      </div>

      {/* Modal de Confirmação de Transição */}
      <Dialog open={dialogTransicaoAberto} onOpenChange={setDialogTransicaoAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-amber-600" /> Confirmação de Transição Regimental
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Você está prestes a alterar o status da deliberação oficial:
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 text-xs space-y-2">
            <p>
              <strong>Deliberação:</strong> {deliberacaoAtiva?.titulo}
            </p>
            <p>
              <strong>Status Atual:</strong> {deliberacaoAtiva?.status}
            </p>
            <p className="text-amber-800 font-bold">
              Novo Status Solicitado: {novoStatusSelecionado}
            </p>
            {novoStatusSelecionado === 'APURADA' && (
              <p className="p-2 rounded bg-indigo-50 border border-indigo-200 text-indigo-900 text-[11px]">
                A transição para APURADA consolida todas as cédulas e gera o Hash Raiz imutável da
                Urna Eletrônica.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              disabled={executandoTransicao}
              onClick={() => setDialogTransicaoAberto(false)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={executandoTransicao}
              onClick={handleExecutarTransicao}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
            >
              {executandoTransicao ? 'Processando Transição...' : 'Confirmar e Gravar no Log'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default PainelMesaPage
