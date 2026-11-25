import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { api, type CredenciamentoRecord, type UnidadeRecord } from '@/lib/api'
import { useCondoConfig } from '@/context/CondoConfigContext'
import pb from '@/lib/pocketbase/client'
import {
  formatarIdentificadorUnidade,
  normalizarBloco,
  temBlocoReal,
} from '@/lib/formatadorUnidade'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatarCpf } from '@/lib/cpf'
import { formatarTelefone } from '@/lib/telefone'
import ModalAnaliseCadastro from './ModalAnaliseCadastro'
import DialogWhatsapp from '@/components/whatsapp/DialogWhatsapp'
import { montarMensagemCadastroAprovado, normalizarNumeroWhatsapp } from '@/lib/whatsapp'
import { MessageCircle } from 'lucide-react'
import type { CadastroUnidadeRecord } from '@/lib/api'
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
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Search,
  Building,
  UserCheck,
  Download,
  FileCheck2,
  Globe,
  UserPlus,
  ShieldCheck,
  Eye,
  AlertTriangle,
  ClipboardList,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'

// Ordem natural/numérica para identificadores de unidade ("9" < "101", "12A" após "12")
const normalizarIdentificador = (valor?: string | null): string =>
  (valor || '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/(\d+)/g, (m) => m.padStart(10, '0'))
    .toLowerCase()

export const CredenciaisPendentesPage: React.FC = () => {
  const { user } = useAuth()
  const { rotuloUnidade } = useCondoConfig()

  const [credenciamentos, setCredenciamentos] = useState<CredenciamentoRecord[]>([])
  const [cadastrosPublicos, setCadastrosPublicos] = useState<CadastroUnidadeRecord[]>([])
  const [unidades, setUnidades] = useState<UnidadeRecord[]>([])
  const [abaAtiva, setAbaAtiva] = useState<'cadastros' | 'credenciais'>('cadastros')
  const [filtroStatus, setFiltroStatus] = useState<string>('pendente')
  const [filtroUnidade, setFiltroUnidade] = useState<string>('todas')
  const [ordemCadastros, setOrdemCadastros] = useState<'unidade' | 'nome' | 'nascimento'>('unidade')
  const [direcaoOrdemCadastros, setDirecaoOrdemCadastros] = useState<'asc' | 'desc'>('asc')
  const [processandoCad, setProcessandoCad] = useState(false)
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)

  // Modal de análise completa de cadastro
  const [modalAnaliseAberto, setModalAnaliseAberto] = useState(false)
  const [cadEmAnalise, setCadEmAnalise] = useState<CadastroUnidadeRecord | null>(null)

  // Dialog de Rejeição Credenciamento
  const [dialogRejeicaoAberto, setDialogRejeicaoAberto] = useState(false)
  const [credParaRejeitar, setCredParaRejeitar] = useState<CredenciamentoRecord | null>(null)
  const [motivoRejeicao, setMotivoRejeicao] = useState('')

  // Dialog de Rejeição Cadastro Público
  const [dialogRejeicaoCadAberto, setDialogRejeicaoCadAberto] = useState(false)
  const [cadParaRejeitar, setCadParaRejeitar] = useState<any | null>(null)
  const [motivoRejeicaoCad, setMotivoRejeicaoCad] = useState('')

  const [processando, setProcessando] = useState(false)

  // Envio manual por WhatsApp (cadastro aprovado) — sem integração de API
  const [dialogWhatsAberto, setDialogWhatsAberto] = useState(false)
  const [nomeWhats, setNomeWhats] = useState('')
  const [telefoneWhats, setTelefoneWhats] = useState<string | null>(null)
  const [mensagemWhats, setMensagemWhats] = useState('')

  const abrirWhatsappCadastro = (nome: string, telefone?: string) => {
    setNomeWhats(nome)
    setTelefoneWhats(telefone || null)
    setMensagemWhats(montarMensagemCadastroAprovado(nome))
    setDialogWhatsAberto(true)
  }

  const carregarDados = async () => {
    setCarregando(true)
    try {
      const [creds, cads, unids] = await Promise.all([
        api.getCredenciamentos(),
        api.getCadastrosUnidades(),
        api.getUnidades(),
      ])
      setCredenciamentos(creds)
      setCadastrosPublicos(cads)
      setUnidades(unids)
    } catch (err) {
      console.error('Erro ao carregar dados de credenciamentos/cadastros:', err)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  const aprovar = async (cred: CredenciamentoRecord) => {
    if (!user) return
    try {
      await api.aprovarCredenciamento(cred.id, user.id)
      toast({
        title: 'Credenciamento Aprovado',
        description: `Unidade habilitada para voto.`,
      })
      carregarDados()
    } catch (err: any) {
      toast({
        title: 'Erro ao aprovar',
        description: err?.message || 'Falha ao processar aprovação.',
        variant: 'destructive',
      })
    }
  }

  // Ações de aprovação e rejeição de cadastro de morador público
  const aprovarCadastro = async (cad: any) => {
    if (!user) return
    setProcessandoCad(true)
    try {
      const resp = await api.aprovarCadastroUnidade(cad.id)
      toast({
        title: 'Cadastro Aprovado',
        description:
          resp?.message || `Cadastro de "${cad.nome}" homologado. Candidato notificado por e-mail.`,
      })
      setCadEmAnalise(null)
      carregarDados()
      // Atalho de envio manual por WhatsApp (e-mail pode falhar — caixa cheia, endereço errado)
      if (cad.telefone) {
        abrirWhatsappCadastro(cad.nome, cad.telefone)
      }
    } catch (err: any) {
      toast({
        title: 'Erro ao aprovar cadastro',
        description: err?.data?.message || err?.message || 'Falha ao aprovar cadastro.',
        variant: 'destructive',
      })
    } finally {
      setProcessandoCad(false)
    }
  }

  const abrirAnalise = (cad: CadastroUnidadeRecord) => {
    setCadEmAnalise(cad)
    setModalAnaliseAberto(true)
  }

  const abrirRejeicaoCadastro = (cad: any) => {
    setCadParaRejeitar(cad)
    setMotivoRejeicaoCad('')
    setDialogRejeicaoCadAberto(true)
  }

  const confirmarRejeicaoCadastro = async () => {
    if (!user || !cadParaRejeitar) return
    setProcessandoCad(true)
    try {
      const resp = await api.rejeitarCadastroUnidade(
        cadParaRejeitar.id,
        motivoRejeicaoCad || 'Documentação ou dados não conferem com a unidade',
      )
      toast({
        title: 'Cadastro Rejeitado',
        description: resp?.message || 'O cadastro foi marcado como rejeitado.',
      })
      setDialogRejeicaoCadAberto(false)
      setCadParaRejeitar(null)
      carregarDados()
    } catch (err: any) {
      toast({
        title: 'Erro ao rejeitar',
        description: err?.data?.message || err?.message || 'Falha ao rejeitar cadastro.',
        variant: 'destructive',
      })
    } finally {
      setProcessandoCad(false)
    }
  }

  const abrirRejeicao = (cred: CredenciamentoRecord) => {
    setCredParaRejeitar(cred)
    setMotivoRejeicao('')
    setDialogRejeicaoAberto(true)
  }

  const confirmarRejeicao = async () => {
    if (!user || !credParaRejeitar) return
    setProcessando(true)
    try {
      await api.rejeitarCredenciamento(
        credParaRejeitar.id,
        user.id,
        motivoRejeicao || 'Documentação incompleta ou não comprobatória.',
      )
      toast({
        title: 'Credenciamento Rejeitado',
        description: 'O morador foi informado do motivo da recusa.',
      })
      setDialogRejeicaoAberto(false)
      carregarDados()
    } catch (err: any) {
      toast({
        title: 'Erro ao rejeitar',
        description: err?.message || 'Falha ao processar rejeição.',
        variant: 'destructive',
      })
    } finally {
      setProcessando(false)
    }
  }

  const termoBusca = busca.trim().toLowerCase()
  const termoBuscaNumeros = termoBusca.replace(/\D/g, '')

  // Filtragem Credenciamentos (pendentes primeiro, mais antigos antes)
  const credsFiltrados = credenciamentos
    .filter((c) => {
      const matchStatus = filtroStatus === 'todos' ? true : c.status === filtroStatus
      const matchUnidade = filtroUnidade === 'todas' || c.unidade === filtroUnidade
      const unid = unidades.find((u) => u.id === c.unidade)
      const matchBusca =
        !termoBusca ||
        c.titular_nome.toLowerCase().includes(termoBusca) ||
        (termoBuscaNumeros && (c.cpf || '').replace(/\D/g, '').includes(termoBuscaNumeros)) ||
        (unid?.identificador || '').toLowerCase().includes(termoBusca)
      return matchStatus && matchUnidade && matchBusca
    })
    .sort((a, b) => {
      if (a.status === 'pendente' && b.status !== 'pendente') return -1
      if (b.status === 'pendente' && a.status !== 'pendente') return 1
      return (a.created || '').localeCompare(b.created || '')
    })

  // Cabeçalho clicável: primeira ordena pela coluna; segunda inverte a direção
  const alternarOrdemPorColuna = (coluna: 'unidade' | 'nome' | 'nascimento') => {
    if (ordemCadastros === coluna) {
      setDirecaoOrdemCadastros((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setOrdemCadastros(coluna)
      setDirecaoOrdemCadastros('asc')
    }
  }

  // Filtragem Cadastros de Moradores (pendentes primeiro, mais antigos antes)
  const cadastrosFiltrados = cadastrosPublicos
    .filter((cad) => {
      const statusCad = cad.status_aprovacao || 'aprovado'
      const matchStatus = filtroStatus === 'todos' ? true : statusCad === filtroStatus
      const matchUnidade = filtroUnidade === 'todas' || cad.unidade === filtroUnidade
      const unid = unidades.find((u) => u.id === cad.unidade)
      const matchBusca =
        !termoBusca ||
        (cad.nome || '').toLowerCase().includes(termoBusca) ||
        (termoBuscaNumeros && (cad.cpf || '').replace(/\D/g, '').includes(termoBuscaNumeros)) ||
        (cad.email || '').toLowerCase().includes(termoBusca) ||
        (unid?.identificador || '').toLowerCase().includes(termoBusca)
      return matchStatus && matchUnidade && matchBusca
    })
    .sort((a, b) => {
      const ra = a.status_aprovacao || 'aprovado'
      const rb = b.status_aprovacao || 'aprovado'
      // Pendentes sempre no topo, independente da coluna/direção escolhida
      if (ra === 'pendente' && rb !== 'pendente') return -1
      if (rb === 'pendente' && ra !== 'pendente') return 1
      const fator = direcaoOrdemCadastros === 'asc' ? 1 : -1
      if (ordemCadastros === 'nome') {
        return fator * (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' })
      }
      if (ordemCadastros === 'nascimento') {
        // data_nascimento chega como 'YYYY-MM-DD 00:00:00.000Z' — a comparação
        // lexicográfica do prefixo ISO equivale à comparação cronológica
        return (
          fator *
          (a.data_nascimento || '9999-12-31')
            .slice(0, 10)
            .localeCompare((b.data_nascimento || '9999-12-31').slice(0, 10))
        )
      }
      // 'unidade': ordem natural/numérica do identificador (101 < 910)
      const ua = unidades.find((u) => u.id === a.unidade)
      const ub = unidades.find((u) => u.id === b.unidade)
      const da = normalizarIdentificador(ua?.identificador)
      const db = normalizarIdentificador(ub?.identificador)
      if (da && db && da !== db) return fator * (da < db ? -1 : 1)
      if (da !== db) return da ? fator : -fator
      return fator * (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' })
    })

  const totalCadastrosPendentes = cadastrosPublicos.filter(
    (c) => (c.status_aprovacao || 'aprovado') === 'pendente',
  ).length
  const totalCredsPendentes = credenciamentos.filter((c) => c.status === 'pendente').length

  // Pendências antigas: aguardando análise há 7 dias ou mais
  const DIAS_ALERTA_PENDENCIA = 7
  const diasAguardando = (data?: string) => {
    if (!data) return 0
    const diff = Date.now() - new Date(data).getTime()
    return Math.max(0, Math.floor(diff / 86400000))
  }
  const cadastrosPendentes = cadastrosPublicos.filter(
    (c) => (c.status_aprovacao || 'aprovado') === 'pendente',
  )
  const credsPendentes = credenciamentos.filter((c) => c.status === 'pendente')
  const cadastrosPendentesAntigos = cadastrosPendentes.filter(
    (c) => diasAguardando(c.created) >= DIAS_ALERTA_PENDENCIA,
  )
  const credsPendentesAntigos = credsPendentes.filter(
    (c) => diasAguardando(c.created) >= DIAS_ALERTA_PENDENCIA,
  )
  const totalPendentesGeral = totalCadastrosPendentes + totalCredsPendentes
  const pendentesAntigosGeral = cadastrosPendentesAntigos.length + credsPendentesAntigos.length

  // Contagens clicáveis por status/categoria
  const contagensCadastros = {
    pendente: totalCadastrosPendentes,
    aprovado: cadastrosPublicos.filter((c) => (c.status_aprovacao || 'aprovado') === 'aprovado')
      .length,
    rejeitado: cadastrosPublicos.filter((c) => (c.status_aprovacao || 'aprovado') === 'rejeitado')
      .length,
  }
  const contagensCreds = {
    pendente: totalCredsPendentes,
    aprovado: credenciamentos.filter((c) => c.status === 'aprovado').length,
    rejeitado: credenciamentos.filter((c) => c.status === 'rejeitado').length,
  }

  const selecionarResumo = (aba: 'cadastros' | 'credenciais', status: string) => {
    setAbaAtiva(aba)
    setFiltroStatus(status)
    setFiltroUnidade('todas')
    setBusca('')
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-amber-600" /> Aprovação de Cadastros e Vínculos
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Homologação dos cadastros de moradores enviados via link público e conferência de
            credenciais de votação.
          </p>
        </div>

        {/* Abas Superiores: Cadastros Públicos vs Credenciamento de Votação */}
        <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-lg text-xs">
          <Button
            variant={abaAtiva === 'cadastros' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setAbaAtiva('cadastros')}
            className={`text-xs h-8 ${
              abaAtiva === 'cadastros'
                ? 'bg-[#002B5E] text-white hover:bg-[#001D40]'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            Cadastros de Moradores
            {totalCadastrosPendentes > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-bold">
                {totalCadastrosPendentes}
              </span>
            )}
          </Button>

          <Button
            variant={abaAtiva === 'credenciais' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setAbaAtiva('credenciais')}
            className={`text-xs h-8 ${
              abaAtiva === 'credenciais'
                ? 'bg-[#002B5E] text-white hover:bg-[#001D40]'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            Credenciais de Assembleia
            {totalCredsPendentes > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-bold">
                {totalCredsPendentes}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Painel de Resumo de Pendências (Dashboard) */}
      <Card className="border-[#0066FF]/20 bg-gradient-to-r from-blue-50/80 to-white shadow-xs">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-[#0066FF]" /> Resumo de Pendências
            </CardTitle>
            {totalPendentesGeral === 0 ? (
              <Badge className="bg-emerald-600 text-white text-xs shrink-0 text-center leading-normal">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Nenhuma pendência — tudo em ordem
              </Badge>
            ) : (
              <Badge className="bg-amber-600 text-white text-xs shrink-0 text-center leading-normal">
                {totalPendentesGeral} pendência{totalPendentesGeral > 1 ? 's' : ''} aguardando
                análise
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {pendentesAntigosGeral > 0 && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-300 text-[11px] text-amber-900">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>{pendentesAntigosGeral}</strong> pendência
                {pendentesAntigosGeral > 1 ? 's' : ''} aguardando há <strong>7 dias ou mais</strong>{' '}
                — priorize a análise destas, destacadas em âmbar na lista abaixo.
              </span>
            </div>
          )}

          {/* Contagens clicáveis por categoria e status */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div
              className={`text-left p-3 rounded-lg border ${
                pendentesAntigosGeral > 0
                  ? 'border-amber-400 bg-amber-50/70'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Pendências Antigas (≥7 dias)
              </span>
              <span className="flex items-end gap-1.5">
                <span
                  className={`text-2xl font-extrabold ${pendentesAntigosGeral > 0 ? 'text-amber-700' : 'text-slate-300'}`}
                >
                  {pendentesAntigosGeral}
                </span>
                <span className="text-[10px] text-slate-500 mb-1">
                  {cadastrosPendentesAntigos.length} cad • {credsPendentesAntigos.length} cred
                </span>
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                mais antigos vêm primeiro na lista
              </span>
            </div>
            <button
              type="button"
              onClick={() => selecionarResumo('cadastros', 'pendente')}
              className={`text-left p-3 rounded-lg border transition-all ${
                abaAtiva === 'cadastros' && filtroStatus === 'pendente'
                  ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-400'
                  : 'border-slate-200 bg-white hover:border-amber-400 hover:bg-amber-50/40'
              }`}
            >
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Cadastros de Moradores
              </span>
              <span className="flex items-end gap-1.5">
                <span
                  className={`text-2xl font-extrabold ${totalCadastrosPendentes > 0 ? 'text-amber-700' : 'text-slate-300'}`}
                >
                  {totalCadastrosPendentes}
                </span>
                <span className="text-[10px] text-slate-500 mb-1">pendentes</span>
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {contagensCadastros.aprovado} aprovados • {contagensCadastros.rejeitado} rejeitados
              </span>
            </button>

            <button
              type="button"
              onClick={() => selecionarResumo('credenciais', 'pendente')}
              className={`text-left p-3 rounded-lg border transition-all ${
                abaAtiva === 'credenciais' && filtroStatus === 'pendente'
                  ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-400'
                  : 'border-slate-200 bg-white hover:border-amber-400 hover:bg-amber-50/40'
              }`}
            >
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Credenciais de Assembleia
              </span>
              <span className="flex items-end gap-1.5">
                <span
                  className={`text-2xl font-extrabold ${totalCredsPendentes > 0 ? 'text-amber-700' : 'text-slate-300'}`}
                >
                  {totalCredsPendentes}
                </span>
                <span className="text-[10px] text-slate-500 mb-1">pendentes</span>
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {contagensCreds.aprovado} aprovadas • {contagensCreds.rejeitado} rejeitadas
              </span>
            </button>

            <button
              type="button"
              onClick={() => selecionarResumo('cadastros', 'aprovado')}
              className={`text-left p-3 rounded-lg border transition-all ${
                filtroStatus === 'aprovado' &&
                (abaAtiva === 'cadastros' || abaAtiva === 'credenciais')
                  ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-400'
                  : 'border-slate-200 bg-white hover:border-emerald-400 hover:bg-emerald-50/40'
              }`}
            >
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Aprovados (Geral)
              </span>
              <span className="flex items-end gap-1.5">
                <span className="text-2xl font-extrabold text-emerald-700">
                  {contagensCadastros.aprovado + contagensCreds.aprovado}
                </span>
                <span className="text-[10px] text-slate-500 mb-1">registros</span>
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {contagensCadastros.aprovado} cadastros • {contagensCreds.aprovado} credenciais
              </span>
            </button>

            <button
              type="button"
              onClick={() => selecionarResumo('cadastros', 'rejeitado')}
              className={`text-left p-3 rounded-lg border transition-all ${
                filtroStatus === 'rejeitado' &&
                (abaAtiva === 'cadastros' || abaAtiva === 'credenciais')
                  ? 'border-red-500 bg-red-50 ring-1 ring-red-400'
                  : 'border-slate-200 bg-white hover:border-red-400 hover:bg-red-50/40'
              }`}
            >
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Rejeitados (Geral)
              </span>
              <span className="flex items-end gap-1.5">
                <span className="text-2xl font-extrabold text-red-700">
                  {contagensCadastros.rejeitado + contagensCreds.rejeitado}
                </span>
                <span className="text-[10px] text-slate-500 mb-1">registros</span>
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {contagensCadastros.rejeitado} cadastros • {contagensCreds.rejeitado} credenciais
              </span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Barra de Busca */}
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder={
              abaAtiva === 'cadastros'
                ? 'Buscar por unidade, morador, CPF ou e-mail...'
                : 'Buscar por unidade (ex: 101), titular ou CPF...'
            }
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        {/* Filtros por Status */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs self-start sm:self-auto">
          <Button
            variant={filtroStatus === 'pendente' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFiltroStatus('pendente')}
            className={`text-xs h-8 ${
              filtroStatus === 'pendente'
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'text-slate-600'
            }`}
          >
            Pendentes ({abaAtiva === 'cadastros' ? totalCadastrosPendentes : totalCredsPendentes})
          </Button>
          <Button
            variant={filtroStatus === 'aprovado' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFiltroStatus('aprovado')}
            className={`text-xs h-8 ${
              filtroStatus === 'aprovado'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'text-slate-600'
            }`}
          >
            Aprovados
          </Button>
          <Button
            variant={filtroStatus === 'rejeitado' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFiltroStatus('rejeitado')}
            className={`text-xs h-8 ${
              filtroStatus === 'rejeitado'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'text-slate-600'
            }`}
          >
            Rejeitados
          </Button>
          <Button
            variant={filtroStatus === 'todos' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFiltroStatus('todos')}
            className="text-xs h-8 text-slate-600"
          >
            Todos
          </Button>
        </div>

        {/* Classificação da aba de cadastros (unidade, nome ou nascimento) */}
        {abaAtiva === 'cadastros' && (
          <Select
            value={ordemCadastros}
            onValueChange={(v) => {
              setOrdemCadastros(v as 'unidade' | 'nome' | 'nascimento')
              setDirecaoOrdemCadastros('asc')
            }}
          >
            <SelectTrigger
              className="w-full sm:w-48 h-9 text-xs"
              aria-label="Classificar lista de cadastros por"
            >
              <SelectValue placeholder="Classificar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unidade">Classificar por: Unidade</SelectItem>
              <SelectItem value="nome">Classificar por: Nome</SelectItem>
              <SelectItem value="nascimento">Classificar por: Nascimento</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Filtro por Unidade */}
        <Select value={filtroUnidade} onValueChange={setFiltroUnidade}>
          <SelectTrigger className="w-full sm:w-56 h-9 text-xs">
            <SelectValue placeholder="Filtrar por unidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as unidades</SelectItem>
            {unidades
              .slice()
              .sort((a, b) => (a.identificador || '').localeCompare(b.identificador || '', 'pt-BR'))
              .map((u) => {
                const rotulo = formatarIdentificadorUnidade(
                  u.identificador,
                  u.tipo_unidade,
                  rotuloUnidade,
                )
                const bloco = temBlocoReal(u.bloco, u.tipo_unidade)
                  ? ` (${normalizarBloco(u.bloco, u.tipo_unidade)})`
                  : ''
                return (
                  <SelectItem key={u.id} value={u.id}>
                    {rotulo}
                    {bloco}
                  </SelectItem>
                )
              })}
          </SelectContent>
        </Select>
      </div>

      {/* Cabeçalho clicável de ordenação (apenas aba Cadastros de Moradores) */}
      {abaAtiva === 'cadastros' && cadastrosFiltrados.length > 0 && (
        <div
          role="row"
          aria-label="Ordenar cadastros por coluna"
          className="hidden md:grid md:grid-cols-[minmax(0,1fr)_auto] gap-4 px-4 py-1.5 rounded-md bg-slate-100/80 border border-slate-200 text-xs font-semibold text-slate-600"
        >
          <div className="flex items-center gap-4">
            {(
              [
                { coluna: 'unidade' as const, rotulo: 'Unidade' },
                { coluna: 'nome' as const, rotulo: 'Nome' },
                { coluna: 'nascimento' as const, rotulo: 'Nascimento' },
              ] as const
            ).map(({ coluna, rotulo }) => {
              const ativo = ordemCadastros === coluna
              return (
                <button
                  key={coluna}
                  type="button"
                  onClick={() => alternarOrdemPorColuna(coluna)}
                  aria-label={`Ordenar por ${rotulo}${
                    ativo
                      ? direcaoOrdemCadastros === 'asc'
                        ? ' (crescente)'
                        : ' (decrescente)'
                      : ''
                  }`}
                  className={`flex items-center gap-1 rounded px-1 py-0.5 -mx-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0066FF] ${
                    ativo ? 'text-[#0066FF]' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {rotulo}
                  {ativo &&
                    (direcaoOrdemCadastros === 'asc' ? (
                      <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                    ))}
                </button>
              )
            })}
          </div>
          <div className="pr-24">Ações</div>
        </div>
      )}

      {/* Lista de Registros Conforme a Aba Ativa */}
      <div className="space-y-3">
        {abaAtiva === 'cadastros' ? (
          /* ABA 1: Cadastros Públicos de Moradores */
          cadastrosFiltrados.length === 0 ? (
            <Card className="p-8 text-center border-slate-200">
              <UserCheck className="h-10 w-10 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">
                Nenhum cadastro de morador encontrado neste filtro
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Alterne o filtro de status ou busque por outro termo.
              </p>
            </Card>
          ) : (
            cadastrosFiltrados.map((cad) => {
              const unid = unidades.find((u) => u.id === cad.unidade)
              const statusCad = cad.status_aprovacao || 'aprovado'

              // Formatação de data de nascimento e idade
              let idadeStr: string | null = null
              if (cad.data_nascimento) {
                try {
                  const parte = cad.data_nascimento.slice(0, 10).split('-').map(Number)
                  const dt = new Date(parte[0], parte[1] - 1, parte[2])
                  const hoje = new Date()
                  let anos = hoje.getFullYear() - dt.getFullYear()
                  const m = hoje.getMonth() - dt.getMonth()
                  if (m < 0 || (m === 0 && hoje.getDate() < dt.getDate())) anos--
                  if (anos >= 0) {
                    idadeStr = `${String(parte[2]).padStart(2, '0')}/${String(parte[1]).padStart(2, '0')}/${parte[0]} (${anos} anos)`
                  }
                } catch {
                  /* intentionally ignored */
                }
              }

              return (
                <Card
                  key={cad.id}
                  className={`shadow-xs transition-all ${
                    statusCad === 'pendente'
                      ? 'border-amber-400 border-2 bg-amber-50/40 hover:border-amber-500'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-md bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-800">
                          {unid?.identificador || '—'}
                        </div>
                        <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5 flex-wrap">
                          <span>
                            {unid
                              ? formatarIdentificadorUnidade(
                                  unid.identificador,
                                  unid.tipo_unidade,
                                  rotuloUnidade,
                                )
                              : '—'}
                          </span>
                          <span className="text-xs text-slate-400 font-normal">
                            (
                            {unid && temBlocoReal(unid.bloco, unid.tipo_unidade)
                              ? normalizarBloco(unid.bloco, unid.tipo_unidade)
                              : '—'}
                            )
                          </span>
                          <span className="text-slate-400 font-normal">—</span>
                          <span>{cad.nome}</span>
                        </span>
                        <Badge
                          className={`shrink-0 text-center leading-normal ${
                            statusCad === 'aprovado'
                              ? 'bg-emerald-600 text-white text-[10px]'
                              : statusCad === 'rejeitado'
                                ? 'bg-red-600 text-white text-[10px]'
                                : 'bg-amber-600 text-white text-[10px]'
                          }`}
                        >
                          {statusCad.toUpperCase()}
                        </Badge>
                        {statusCad === 'pendente' && diasAguardando(cad.created) > 0 && (
                          <span
                            className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                              diasAguardando(cad.created) >= DIAS_ALERTA_PENDENCIA
                                ? 'bg-amber-200 text-amber-900 border border-amber-400'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            <Clock className="h-3 w-3" />
                            {diasAguardando(cad.created)}d aguardando
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-700">Vínculo:</span>
                          {cad.vinculo === 'proprietario' && (
                            <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px]">
                              PROPRIETÁRIO (NÃO MORA)
                            </Badge>
                          )}
                          {cad.vinculo === 'condomino' && (
                            <Badge className="bg-cyan-100 text-cyan-900 border-cyan-300 text-[10px]">
                              CONDÔMINO (MORADOR)
                            </Badge>
                          )}
                          {cad.vinculo === 'locatario' && (
                            <Badge className="bg-purple-100 text-purple-900 border-purple-300 text-[10px]">
                              INQUILINO (MORADOR)
                            </Badge>
                          )}
                        </div>

                        <span>
                          <strong>CPF:</strong> {cad.cpf}
                        </span>

                        {idadeStr && (
                          <span>
                            <strong>Nascimento:</strong> {idadeStr}
                          </span>
                        )}

                        {cad.email && (
                          <span>
                            <strong>E-mail:</strong> {cad.email}
                          </span>
                        )}

                        {cad.telefone && (
                          <span>
                            <strong>Tel:</strong> {cad.telefone}
                          </span>
                        )}

                        <span>
                          <strong>Origem:</strong>{' '}
                          {cad.origem === 'link_publico' ? 'Link Público' : 'Administração'}
                        </span>
                      </div>

                      {/* Bloco de Assinatura Eletrônica e Declaração Legal */}
                      {(cad.declaracao_assinatura || cad.declaracao_vinculo) && (
                        <div className="mt-2 p-2.5 rounded-lg bg-blue-50/70 border border-blue-200/80 space-y-1.5 text-xs">
                          <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] font-semibold text-[#002B5E]">
                            <span className="flex items-center gap-1.5">
                              <FileCheck2 className="h-3.5 w-3.5 text-[#0066FF]" />
                              Assinatura Eletrônica da Declaração
                            </span>
                            <span className="text-[10px] text-slate-500 font-normal flex items-center gap-1">
                              <ShieldCheck className="h-3 w-3 text-emerald-600" />
                              Aceite registrado
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-700">
                            {cad.declaracao_assinatura && (
                              <span>
                                <strong>Assinado por:</strong> {cad.declaracao_assinatura}
                              </span>
                            )}
                            {cad.declaracao_data && (
                              <span>
                                <strong>Data/Hora:</strong>{' '}
                                {new Date(cad.declaracao_data).toLocaleString('pt-BR')}
                              </span>
                            )}
                            {cad.declaracao_ip && (
                              <span className="flex items-center gap-1 text-slate-600">
                                <Globe className="h-3 w-3 text-slate-400" />
                                <strong>IP:</strong>{' '}
                                <code className="bg-white px-1 py-0.2 rounded border border-slate-200 text-[10px] font-mono">
                                  {cad.declaracao_ip}
                                </code>
                              </span>
                            )}
                          </div>

                          {cad.declaracao_vinculo && (
                            <details className="text-[10px] text-slate-600 cursor-pointer pt-0.5">
                              <summary className="font-medium text-[#0066FF] hover:underline">
                                Ver texto da declaração aceita
                              </summary>
                              <p className="mt-1 p-2 bg-white rounded border border-slate-200 italic leading-relaxed text-slate-700">
                                "{cad.declaracao_vinculo}"
                              </p>
                            </details>
                          )}
                        </div>
                      )}

                      {/* Bloco de Indicação do morador/proprietário de fato se houver */}
                      {(cad.indicacao_nome || cad.indicacao_telefone) && (
                        <div className="mt-1.5 p-2 rounded-lg bg-amber-50/70 border border-amber-200 text-xs space-y-1">
                          <span className="text-[11px] font-semibold text-amber-900 flex items-center gap-1">
                            <UserPlus className="h-3.5 w-3.5 text-amber-700" />
                            Indicação de Morador / Proprietário de Fato:
                          </span>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-amber-900">
                            {cad.indicacao_nome && (
                              <span>
                                <strong>Nome:</strong> {cad.indicacao_nome}
                              </span>
                            )}
                            {cad.indicacao_telefone && (
                              <span>
                                <strong>Telefone:</strong> {cad.indicacao_telefone}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {(cad.motivo_rejeicao ||
                        (cad.observacoes && cad.observacoes.includes('Rejeição:'))) && (
                        <p className="text-xs text-red-700 font-medium">
                          Motivo de recusa:{' '}
                          {cad.motivo_rejeicao ||
                            cad.observacoes.slice(cad.observacoes.indexOf('Rejeição:') + 9)}
                        </p>
                      )}
                    </div>

                    {/* Ações da Mesa para Cadastro */}
                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => abrirAnalise(cad)}
                        className="border-[#0066FF]/40 text-[#0066FF] hover:bg-blue-50 text-xs h-8"
                      >
                        <Eye className="mr-1 h-3.5 w-3.5" /> Analisar
                      </Button>
                      {statusCad !== 'aprovado' && (
                        <Button
                          size="sm"
                          onClick={() => aprovarCadastro(cad)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
                        >
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Aprovar Cadastro
                        </Button>
                      )}
                      {statusCad !== 'rejeitado' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => abrirRejeicaoCadastro(cad)}
                          className="border-red-300 text-red-700 hover:bg-red-50 text-xs h-8"
                        >
                          <XCircle className="mr-1 h-3.5 w-3.5" /> Rejeitar com Justificativa
                        </Button>
                      )}
                      {cad.telefone && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => abrirWhatsappCadastro(cad.nome, cad.telefone)}
                          title="Enviar mensagem manualmente pelo WhatsApp (sem integração)"
                          className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs h-8"
                        >
                          <MessageCircle className="mr-1 h-3.5 w-3.5" /> WhatsApp
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )
        ) : /* ABA 2: Credenciais de Assembleia */
        credsFiltrados.length === 0 ? (
          <Card className="p-8 text-center border-slate-200">
            <UserCheck className="h-10 w-10 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">
              Nenhum credenciamento de assembleia encontrado neste filtro
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Alterne o filtro ou busque por outro termo.
            </p>
          </Card>
        ) : (
          credsFiltrados.map((cred) => {
            const unid = unidades.find((u) => u.id === cred.unidade)

            return (
              <Card
                key={cred.id}
                className={`shadow-xs transition-all ${
                  cred.status === 'pendente'
                    ? 'border-amber-400 border-2 bg-amber-50/40 hover:border-amber-500'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-md bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-800">
                        {unid?.identificador || '—'}
                      </div>
                      <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5 flex-wrap">
                        <span>
                          {unid
                            ? formatarIdentificadorUnidade(
                                unid.identificador,
                                unid.tipo_unidade,
                                rotuloUnidade,
                              )
                            : '—'}
                        </span>
                        <span className="text-xs text-slate-400 font-normal">
                          (
                          {unid && temBlocoReal(unid.bloco, unid.tipo_unidade)
                            ? normalizarBloco(unid.bloco, unid.tipo_unidade)
                            : '—'}
                          )
                        </span>
                        <span className="text-slate-400 font-normal">—</span>
                        <span>{cred.titular_nome}</span>
                      </span>
                      <Badge
                        className={`shrink-0 text-center leading-normal ${
                          cred.status === 'aprovado'
                            ? 'bg-emerald-600 text-white text-[10px]'
                            : cred.status === 'rejeitado'
                              ? 'bg-red-600 text-white text-[10px]'
                              : 'bg-amber-600 text-white text-[10px]'
                        }`}
                      >
                        {cred.status}
                      </Badge>
                      {cred.status === 'pendente' && diasAguardando(cred.created) > 0 && (
                        <span
                          className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                            diasAguardando(cred.created) >= DIAS_ALERTA_PENDENCIA
                              ? 'bg-amber-200 text-amber-900 border border-amber-400'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <Clock className="h-3 w-3" />
                          {diasAguardando(cred.created)}d aguardando
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-700">Vínculo Declarado:</span>
                        {cred.tipo_vinculo === 'proprietario' && (
                          <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px]">
                            PROPRIETÁRIO (NÃO RESIDENTE)
                          </Badge>
                        )}
                        {cred.tipo_vinculo === 'condomino' && (
                          <Badge className="bg-cyan-100 text-cyan-900 border-cyan-300 text-[10px]">
                            CONDÔMINO (RESIDENTE)
                          </Badge>
                        )}
                        {cred.tipo_vinculo === 'locatario' && (
                          <Badge className="bg-purple-100 text-purple-900 border-purple-300 text-[10px]">
                            LOCATÁRIO (INQUILINO)
                          </Badge>
                        )}
                        {cred.tipo_vinculo !== 'proprietario' &&
                          cred.tipo_vinculo !== 'condomino' &&
                          cred.tipo_vinculo !== 'locatario' && (
                            <Badge variant="outline" className="text-[10px] uppercase">
                              {cred.tipo_vinculo}
                            </Badge>
                          )}
                      </div>
                      <span>
                        <strong>CPF:</strong> {cred.cpf}
                      </span>
                      <span>
                        <strong>Submetido:</strong>{' '}
                        {new Date(cred.created).toLocaleDateString('pt-BR')}
                      </span>
                      {cred.status === 'pendente' && diasAguardando(cred.created) > 0 && (
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                            diasAguardando(cred.created) >= DIAS_ALERTA_PENDENCIA
                              ? 'bg-amber-200 text-amber-900 border border-amber-400'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <Clock className="h-3 w-3" />
                          {diasAguardando(cred.created)}d aguardando
                        </span>
                      )}
                    </div>

                    {cred.motivo_rejeicao && (
                      <p className="text-xs text-red-700 font-medium">
                        Motivo de recusa: {cred.motivo_rejeicao}
                      </p>
                    )}

                    {/* Documentos Anexos */}
                    {cred.documentos && cred.documentos.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {cred.documentos.map((doc, idx) => {
                          const fileUrl = pb.files.getURL(cred, doc)
                          return (
                            <a
                              key={idx}
                              href={fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-cyan-700 hover:text-cyan-900 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200"
                            >
                              <FileText className="h-3 w-3" /> Ver Documento {idx + 1}
                            </a>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Ações da Mesa */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    {cred.status !== 'aprovado' && (
                      <Button
                        size="sm"
                        onClick={() => aprovar(cred)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
                      >
                        <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Aprovar
                      </Button>
                    )}
                    {cred.status !== 'rejeitado' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => abrirRejeicao(cred)}
                        className="border-red-300 text-red-700 hover:bg-red-50 text-xs h-8"
                      >
                        <XCircle className="mr-1 h-3.5 w-3.5" /> Rejeitar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Modal de Análise Completa do Cadastro */}
      <ModalAnaliseCadastro
        cad={cadEmAnalise}
        unidade={unidades.find((u) => u.id === cadEmAnalise?.unidade)}
        rotuloUnidade={rotuloUnidade}
        aberto={modalAnaliseAberto}
        processando={processandoCad}
        onFechar={() => {
          setModalAnaliseAberto(false)
          setCadEmAnalise(null)
        }}
        onAprovar={(cad) => {
          setModalAnaliseAberto(false)
          aprovarCadastro(cad)
        }}
        onPedirRejeicao={(cad) => {
          setModalAnaliseAberto(false)
          abrirRejeicaoCadastro(cad)
        }}
      />

      {/* Modal de Rejeição Credenciamento */}
      <Dialog open={dialogRejeicaoAberto} onOpenChange={setDialogRejeicaoAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" /> Rejeitar Credenciamento
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Informe a justificativa da recusa para que o morador possa regularizar a documentação.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Motivo da Recusa</label>
              <Input
                placeholder="Ex: Documento de identidade ilegível ou ausência de procuração assinada."
                value={motivoRejeicao}
                onChange={(e) => setMotivoRejeicao(e.target.value)}
                className="text-xs h-10"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              disabled={processando}
              onClick={() => setDialogRejeicaoAberto(false)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={processando}
              onClick={confirmarRejeicao}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              {processando ? 'Gravando...' : 'Confirmar Rejeição'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Rejeição Cadastro de Morador */}
      <Dialog open={dialogRejeicaoCadAberto} onOpenChange={setDialogRejeicaoCadAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" /> Rejeitar Cadastro de Morador
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Informe o motivo para que a recusa fique registrada no histórico da unidade.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Motivo da Recusa</label>
              <Input
                placeholder="Ex: CPF ou nome não conferem com o registro de moradores ou locatários da unidade."
                value={motivoRejeicaoCad}
                onChange={(e) => setMotivoRejeicaoCad(e.target.value)}
                className="text-xs h-10"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              disabled={processandoCad}
              onClick={() => setDialogRejeicaoCadAberto(false)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={processandoCad}
              onClick={confirmarRejeicaoCadastro}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              {processandoCad ? 'Gravando...' : 'Confirmar Rejeição'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Envio manual por WhatsApp (mensagem editável, deep link wa.me, cópia de texto) */}
      <DialogWhatsapp
        aberto={dialogWhatsAberto}
        onFechar={() => setDialogWhatsAberto(false)}
        titulo={`Enviar por WhatsApp — ${nomeWhats || 'morador'}`}
        descricao="A mensagem abaixo é apenas um modelo pronto: edite antes de enviar se quiser."
        contato={telefoneWhats ? normalizarNumeroWhatsapp(telefoneWhats) : null}
        mensagem={mensagemWhats}
        onMensagemChange={setMensagemWhats}
      />
    </div>
  )
}
export default CredenciaisPendentesPage
