import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  api,
  type DeliberacaoRecord,
  type DeliberacaoStatus,
  type PresencaRecord,
  type ComparecimentoRecord,
  type UnidadeRecord,
} from '@/lib/api'
import { formatarCpf, validarCpf, MSG_CPF_INVALIDO } from '@/lib/cpf'
import { useCondoConfig } from '@/context/CondoConfigContext'
import {
  formatarIdentificadorUnidade,
  normalizarBloco,
  temBlocoReal,
} from '@/lib/formatadorUnidade'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  UserCog,
  Save,
  FileText,
} from 'lucide-react'

export const PainelMesaPage: React.FC = () => {
  const navigate = useNavigate()
  const { rotuloUnidade } = useCondoConfig()
  const [deliberacoes, setDeliberacoes] = useState<DeliberacaoRecord[]>([])
  const [deliberacaoAtiva, setDeliberacaoAtiva] = useState<DeliberacaoRecord | null>(null)
  const [presencas, setPresencas] = useState<PresencaRecord[]>([])
  const [comparecimentos, setComparecimentos] = useState<ComparecimentoRecord[]>([])
  const [unidades, setUnidades] = useState<UnidadeRecord[]>([])

  // Registro de presença presencial
  const [unidadePresencialId, setUnidadePresencialId] = useState<string>('')
  const [salvandoPresenca, setSalvandoPresenca] = useState(false)

  // Edição da Mesa Diretora (Presidente e Secretário)
  const [modalMesaAberto, setModalMesaAberto] = useState(false)
  const modalMesaAbertoRef = useRef(false)
  modalMesaAbertoRef.current = modalMesaAberto

  const deliberacaoAtivaIdRef = useRef<string | null>(null)
  deliberacaoAtivaIdRef.current = deliberacaoAtiva?.id || null

  const [mesaPresNome, setMesaPresNome] = useState('')
  const [mesaPresCpf, setMesaPresCpf] = useState('')
  const [mesaPresCpfErro, setMesaPresCpfErro] = useState<string | null>(null)
  const [mesaSecNome, setMesaSecNome] = useState('')
  const [mesaSecCpf, setMesaSecCpf] = useState('')
  const [mesaSecCpfErro, setMesaSecCpfErro] = useState<string | null>(null)
  const [salvandoMesa, setSalvandoMesa] = useState(false)

  // Transição de estado
  const [novoStatusSelecionado, setNovoStatusSelecionado] = useState<DeliberacaoStatus | null>(null)
  const [dialogTransicaoAberto, setDialogTransicaoAberto] = useState(false)
  const [executandoTransicao, setExecutandoTransicao] = useState(false)

  const [carregando, setCarregando] = useState(true)

  const carregarDados = async (isBackgroundPoll = false) => {
    try {
      const [delibs, unids] = await Promise.all([api.getDeliberacoes(), api.getUnidades()])
      setDeliberacoes(delibs)
      setUnidades(unids)

      // Se o usuário já está visualizando uma deliberação específica, preserva ela; caso contrário pega a ativa
      const idAtual = deliberacaoAtivaIdRef.current
      const ativa =
        (idAtual ? delibs.find((d) => d.id === idAtual) : null) ||
        delibs.find((d) => d.status !== 'PUBLICADA') ||
        delibs[0] ||
        null

      setDeliberacaoAtiva(ativa)

      if (ativa) {
        // NUNCA sobrescrever os campos de digitação do modal se o modal da mesa estiver aberto ou se for background poll
        if (!modalMesaAbertoRef.current && !isBackgroundPoll) {
          setMesaPresNome(ativa.mesa_presidente_nome || '')
          setMesaPresCpf(formatarCpf(ativa.mesa_presidente_cpf || ''))
          setMesaPresCpfErro(null)
          setMesaSecNome(ativa.mesa_secretario_nome || '')
          setMesaSecCpf(formatarCpf(ativa.mesa_secretario_cpf || ''))
          setMesaSecCpfErro(null)
        }

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
    carregarDados(false)
    const timer = setInterval(() => {
      carregarDados(true)
    }, 10000)
    return () => clearInterval(timer)
  }, [])

  const selecionarDeliberacao = async (id: string) => {
    const d = deliberacoes.find((item) => item.id === id) || null
    setDeliberacaoAtiva(d)
    if (d) {
      if (!modalMesaAbertoRef.current) {
        setMesaPresNome(d.mesa_presidente_nome || '')
        setMesaPresCpf(formatarCpf(d.mesa_presidente_cpf || ''))
        setMesaPresCpfErro(null)
        setMesaSecNome(d.mesa_secretario_nome || '')
        setMesaSecCpf(formatarCpf(d.mesa_secretario_cpf || ''))
        setMesaSecCpfErro(null)
      }

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

  // Salvar Mesa Diretora
  const handleSalvarMesaDiretora = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!deliberacaoAtiva) return

    // Validação de CPF (se preenchido, deve ser válido de acordo com o cálculo da Receita Federal)
    let temErro = false
    const rawPresCpf = mesaPresCpf.replace(/\D/g, '')
    if (rawPresCpf.length > 0 && !validarCpf(mesaPresCpf)) {
      setMesaPresCpfErro(MSG_CPF_INVALIDO)
      temErro = true
    } else {
      setMesaPresCpfErro(null)
    }

    const rawSecCpf = mesaSecCpf.replace(/\D/g, '')
    if (rawSecCpf.length > 0 && !validarCpf(mesaSecCpf)) {
      setMesaSecCpfErro(MSG_CPF_INVALIDO)
      temErro = true
    } else {
      setMesaSecCpfErro(null)
    }

    if (temErro) {
      toast({
        title: 'CPF inválido',
        description: 'Corrija os campos de CPF destacados antes de salvar a Mesa Diretora.',
        variant: 'destructive',
      })
      return
    }

    setSalvandoMesa(true)
    try {
      const atualizada = await api.updateDeliberacao(deliberacaoAtiva.id, {
        mesa_presidente_nome: mesaPresNome.trim(),
        mesa_presidente_cpf: mesaPresCpf.trim(),
        mesa_secretario_nome: mesaSecNome.trim(),
        mesa_secretario_cpf: mesaSecCpf.trim(),
      })
      setDeliberacaoAtiva(atualizada)
      setDeliberacoes((prev) => prev.map((d) => (d.id === atualizada.id ? atualizada : d)))
      toast({
        title: 'Mesa Diretora Atualizada',
        description:
          'Os nomes do Presidente e Secretário(a) foram gravados e constarão no boletim de urna.',
      })
      setModalMesaAberto(false)
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar Mesa Diretora',
        description: err?.message || 'Falha ao salvar dados da mesa.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoMesa(false)
    }
  }

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
              <div className="min-w-0 flex-1">
                <span className="text-[10px] uppercase font-bold text-amber-800 tracking-wider">
                  Controle de Ciclo Eleitoral
                </span>
                <CardTitle className="text-base font-bold text-slate-900 mt-0.5">
                  {deliberacaoAtiva.titulo}
                </CardTitle>
              </div>
              <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/mesa/documentos')}
                  className="text-xs h-7 bg-white text-slate-700 border-slate-300"
                >
                  <FileText className="h-3.5 w-3.5 mr-1 text-amber-600" /> Documentos & Edital
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/mesa/presenca')}
                  className="text-xs h-7 bg-white text-slate-700 border-slate-300"
                >
                  <UserCheck className="h-3.5 w-3.5 mr-1 text-amber-600" /> Lista de Presença
                </Button>
                <Badge className="bg-amber-600 text-white text-xs uppercase px-2.5 py-1 shrink-0 text-center leading-normal">
                  Status Atual: {deliberacaoAtiva.status}
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-1">
            <p className="text-xs text-slate-600">
              Conduza as etapas regimentais da assembleia em conformidade com a convenção do
              condomínio Lago Azul:
            </p>

            {/* Bloco: Mesa Diretora (Presidente e Secretário da Assembleia) */}
            <div className="p-3.5 rounded-lg bg-white border border-amber-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <UserCog className="h-4 w-4 text-amber-700" />
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Mesa Diretora Designada
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-700">
                  <span>
                    <strong className="text-slate-900">Presidente:</strong>{' '}
                    {deliberacaoAtiva.mesa_presidente_nome ? (
                      <span className="text-slate-800 font-semibold">
                        {deliberacaoAtiva.mesa_presidente_nome}
                        {deliberacaoAtiva.mesa_presidente_cpf && (
                          <span className="text-slate-500 font-normal ml-1 font-mono">
                            (CPF: {formatarCpf(deliberacaoAtiva.mesa_presidente_cpf)})
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-amber-800 italic">
                        Não configurado (clique em Configurar)
                      </span>
                    )}
                  </span>
                  <span className="text-slate-300 hidden sm:inline">•</span>
                  <span>
                    <strong className="text-slate-900">Secretário(a):</strong>{' '}
                    {deliberacaoAtiva.mesa_secretario_nome ? (
                      <span className="text-slate-800 font-semibold">
                        {deliberacaoAtiva.mesa_secretario_nome}
                        {deliberacaoAtiva.mesa_secretario_cpf && (
                          <span className="text-slate-500 font-normal ml-1 font-mono">
                            (CPF: {formatarCpf(deliberacaoAtiva.mesa_secretario_cpf)})
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-amber-800 italic">Não configurado</span>
                    )}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Estes nomes e CPFs assinam o boletim de urna oficial (sem vinculação obrigatória
                  ao síndico).
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setMesaPresNome(deliberacaoAtiva.mesa_presidente_nome || '')
                  setMesaPresCpf(formatarCpf(deliberacaoAtiva.mesa_presidente_cpf || ''))
                  setMesaPresCpfErro(null)
                  setMesaSecNome(deliberacaoAtiva.mesa_secretario_nome || '')
                  setMesaSecCpf(formatarCpf(deliberacaoAtiva.mesa_secretario_cpf || ''))
                  setMesaSecCpfErro(null)
                  setModalMesaAberto(true)
                }}
                className="text-xs border-amber-300 text-amber-900 hover:bg-amber-100 h-8 shrink-0 self-start md:self-center"
              >
                <UserCog className="mr-1.5 h-3.5 w-3.5 text-amber-700" /> Configurar Mesa Diretora
              </Button>
            </div>

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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Users className="h-4 w-4 shrink-0 text-cyan-700" /> Quórum de Instalação e
                  Comparecimento
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Total de 52 unidades • Exigência de quórum: {quorumExigido} unidades
                </CardDescription>
              </div>
              <Badge
                className={`self-start sm:self-center shrink-0 text-center leading-normal px-2.5 py-1 text-xs font-semibold ${
                  quorumAtingido ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
                }`}
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
                            {unid
                              ? formatarIdentificadorUnidade(
                                  unid.identificador,
                                  unid.tipo_unidade,
                                  rotuloUnidade,
                                )
                              : p.unidade}
                          </span>
                          <span className="text-slate-500 text-[11px]">
                            ({unid?.responsavel_nome || 'Condômino'})
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className={`shrink-0 text-center leading-normal ${
                            p.tipo === 'presencial'
                              ? 'border-amber-400 text-amber-800 bg-amber-50 text-[10px]'
                              : 'border-cyan-400 text-cyan-800 bg-cyan-50 text-[10px]'
                          }`}
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
                      const idFormatado = formatarIdentificadorUnidade(
                        u.identificador,
                        u.tipo_unidade,
                        rotuloUnidade,
                      )
                      return (
                        <SelectItem key={u.id} value={u.id} className="text-xs">
                          {idFormatado} — {u.responsavel_nome} {jaPresente ? '(Já presente)' : ''}
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

      {/* Modal de Configuração da Mesa Diretora */}
      <Dialog open={modalMesaAberto} onOpenChange={setModalMesaAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <UserCog className="h-5 w-5 text-amber-600" /> Configurar Mesa Diretora da Assembleia
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Informe os dados do Presidente e do Secretário(a). Estes nomes substituirão
              referências fixas no boletim de urna e no encerramento da assembleia.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvarMesaDiretora} className="space-y-4 py-2 text-xs">
            {/* Presidente */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-[11px] uppercase font-bold text-slate-700 block">
                Presidente da Mesa
              </span>
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700">Nome Completo</Label>
                <Input
                  value={mesaPresNome}
                  onChange={(e) => setMesaPresNome(e.target.value)}
                  placeholder="Ex: Carlos Eduardo Silveira"
                  className="text-xs h-8 bg-white"
                />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-semibold text-slate-700">CPF</Label>
                  <span className="text-[10px] text-slate-400">Opcional</span>
                </div>
                <Input
                  value={mesaPresCpf}
                  onChange={(e) => {
                    const formatado = formatarCpf(e.target.value)
                    setMesaPresCpf(formatado)
                    if (mesaPresCpfErro) {
                      const raw = formatado.replace(/\D/g, '')
                      if (raw.length === 0 || validarCpf(formatado)) {
                        setMesaPresCpfErro(null)
                      }
                    }
                  }}
                  onBlur={() => {
                    const raw = mesaPresCpf.replace(/\D/g, '')
                    if (raw.length > 0 && !validarCpf(mesaPresCpf)) {
                      setMesaPresCpfErro(MSG_CPF_INVALIDO)
                    } else {
                      setMesaPresCpfErro(null)
                    }
                  }}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className={`text-xs h-8 bg-white font-mono ${
                    mesaPresCpfErro ? 'border-red-500 focus-visible:ring-red-500' : ''
                  }`}
                />
                {mesaPresCpfErro && (
                  <p className="text-[11px] font-medium text-red-600">{mesaPresCpfErro}</p>
                )}
              </div>
            </div>

            {/* Secretário(a) */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-[11px] uppercase font-bold text-slate-700 block">
                Secretário(a) da Mesa
              </span>
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700">Nome Completo</Label>
                <Input
                  value={mesaSecNome}
                  onChange={(e) => setMesaSecNome(e.target.value)}
                  placeholder="Ex: Maria Fernandes de Souza"
                  className="text-xs h-8 bg-white"
                />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-semibold text-slate-700">CPF</Label>
                  <span className="text-[10px] text-slate-400">Opcional</span>
                </div>
                <Input
                  value={mesaSecCpf}
                  onChange={(e) => {
                    const formatado = formatarCpf(e.target.value)
                    setMesaSecCpf(formatado)
                    if (mesaSecCpfErro) {
                      const raw = formatado.replace(/\D/g, '')
                      if (raw.length === 0 || validarCpf(formatado)) {
                        setMesaSecCpfErro(null)
                      }
                    }
                  }}
                  onBlur={() => {
                    const raw = mesaSecCpf.replace(/\D/g, '')
                    if (raw.length > 0 && !validarCpf(mesaSecCpf)) {
                      setMesaSecCpfErro(MSG_CPF_INVALIDO)
                    } else {
                      setMesaSecCpfErro(null)
                    }
                  }}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className={`text-xs h-8 bg-white font-mono ${
                    mesaSecCpfErro ? 'border-red-500 focus-visible:ring-red-500' : ''
                  }`}
                />
                {mesaSecCpfErro && (
                  <p className="text-[11px] font-medium text-red-600">{mesaSecCpfErro}</p>
                )}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalMesaAberto(false)}
                disabled={salvandoMesa}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={salvandoMesa}
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
              >
                <Save className="mr-1.5 h-3.5 w-3.5" />
                {salvandoMesa ? 'Gravando...' : 'Salvar Mesa Diretora'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
