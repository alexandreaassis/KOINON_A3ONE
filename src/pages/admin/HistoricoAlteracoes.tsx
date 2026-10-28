import React, { useEffect, useState, useMemo } from 'react'
import {
  History,
  Search,
  Filter,
  RotateCw,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Calendar,
  User,
  Database,
  ArrowRight,
  PlusCircle,
  FileEdit,
  Trash2,
  Info,
  CheckCircle2,
} from 'lucide-react'
import {
  api,
  HistoricoAlteracaoRecord,
  CampoAlteradoDiff,
  HistoricoAcao,
  UserRecord,
} from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

const ENTIDADES_CONFIG: Record<string, { label: string; singular: string; cor: string }> = {
  unidades: {
    label: 'Unidades do Condomínio',
    singular: 'Unidade',
    cor: '#1F6B94',
  },
  cadastros_unidade: {
    label: 'Cadastros da Unidade',
    singular: 'Cadastro de Unidade',
    cor: '#4E8B7E',
  },
  users: {
    label: 'Usuários do Sistema',
    singular: 'Usuário',
    cor: '#12314F',
  },
  deliberacoes: {
    label: 'Deliberações e Assembleias',
    singular: 'Deliberação',
    cor: '#1F6B94',
  },
  itens_pauta: {
    label: 'Itens de Pauta',
    singular: 'Item de Pauta',
    cor: '#4E8B7E',
  },
  editais_deliberacao: {
    label: 'Editais Convocatórios',
    singular: 'Edital',
    cor: '#5C6B7A',
  },
  documentos_pauta: {
    label: 'Documentos da Pauta',
    singular: 'Documento da Pauta',
    cor: '#5C6B7A',
  },
}

const ROTULOS_CAMPOS: Record<string, string> = {
  identificador: 'Identificador / Número',
  bloco: 'Bloco / Torre',
  grupo: 'Grupo / Setor',
  andar: 'Andar',
  posicao_numero: 'Posição / Porta',
  fracao_ideal: 'Fração Ideal',
  tipo_unidade: 'Tipo de Unidade',
  inadimplente: 'Situação de Inadimplência',
  nome: 'Nome Completo',
  email: 'E-mail Institucional',
  cpf: 'CPF',
  telefone: 'Telefone de Contato',
  vinculo: 'Vínculo com a Unidade',
  morador_residente: 'Residente no Imóvel',
  documento_comprobatorio: 'Documento Comprobatório',
  observacoes: 'Observações Internas',
  status_aprovacao: 'Status de Aprovação',
  titulo: 'Título',
  descricao: 'Descrição / Texto',
  data_inicio: 'Data / Horário de Início',
  data_fim: 'Data / Horário de Término',
  status: 'Status da Deliberação',
  tipo_cedula: 'Formato da Cédula',
  quorum_instalacao: 'Quórum de Instalação',
  quorum_materia: 'Quórum da Matéria',
  inadimplente_pode_votar: 'Inadimplente com Direito a Voto',
  locatario_pode_votar: 'Locatário com Direito a Voto',
  ordem: 'Ordem de Apresentação',
  peso: 'Peso do Voto',
  role: 'Perfil de Acesso (Cargo)',
  ativo: 'Usuário Ativo',
  primeira_convocacao: 'Primeira Convocação',
  segunda_convocacao: 'Segunda Convocação',
  local_texto: 'Local da Assembleia',
  sindico_nome: 'Síndico Convocante',
  sindico_cpf: 'CPF do Síndico',
}

export function HistoricoAlteracoesPage() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [registros, setRegistros] = useState<HistoricoAlteracaoRecord[]>([])
  const [carregando, setCarregando] = useState(true)
  const [totalItens, setTotalItens] = useState(0)
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [porPagina] = useState(25)

  // Filtros
  const [filtroEntidade, setFiltroEntidade] = useState<string>('todas')
  const [filtroAcao, setFiltroAcao] = useState<string>('todas')
  const [filtroUsuario, setFiltroUsuario] = useState<string>('todos')
  const [filtroDataInicio, setFiltroDataInicio] = useState<string>('')
  const [filtroDataFim, setFiltroDataFim] = useState<string>('')
  const [buscaLivre, setBuscaLivre] = useState<string>('')

  // Linhas expandidas
  const [linhasExpandidas, setLinhasExpandidas] = useState<Record<string, boolean>>({})

  // Lista de operadores para o filtro
  const [usuariosSistema, setUsuariosSistema] = useState<UserRecord[]>([])

  // Carregar lista de usuários para compor o filtro de operador
  useEffect(() => {
    async function carregarOperadores() {
      try {
        const users = await api.getTodosUsuarios()
        setUsuariosSistema(users)
      } catch (err) {
        console.warn('Não foi possível carregar a lista de operadores:', err)
      }
    }
    carregarOperadores()
  }, [])

  // Carregar histórico
  const carregarHistorico = async (pagina = 1) => {
    setCarregando(true)
    try {
      const res = await api.getHistoricoAlteracoes({
        entidade: filtroEntidade !== 'todas' ? filtroEntidade : undefined,
        acao: filtroAcao !== 'todas' ? filtroAcao : undefined,
        userId: filtroUsuario !== 'todos' ? filtroUsuario : undefined,
        dataInicio: filtroDataInicio || undefined,
        dataFim: filtroDataFim || undefined,
        termo: buscaLivre || undefined,
        page: pagina,
        perPage: porPagina,
      })
      setRegistros(res.items || [])
      setTotalItens(res.totalItems || 0)
      setPaginaAtual(pagina)
    } catch (err: any) {
      console.error('Falha ao carregar histórico de alterações:', err)
      toast({
        title: 'Falha ao consultar histórico',
        description:
          err?.message || 'Não foi possível recuperar a trilha de alterações operacionais.',
        variant: 'destructive',
      })
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarHistorico(1)
  }, [filtroEntidade, filtroAcao, filtroUsuario, filtroDataInicio, filtroDataFim])

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault()
    carregarHistorico(1)
  }

  const handleLimparFiltros = () => {
    setFiltroEntidade('todas')
    setFiltroAcao('todas')
    setFiltroUsuario('todos')
    setFiltroDataInicio('')
    setFiltroDataFim('')
    setBuscaLivre('')
  }

  const alternarLinha = (id: string) => {
    setLinhasExpandidas((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  const expandirTodas = () => {
    const novo: Record<string, boolean> = {}
    registros.forEach((r) => {
      novo[r.id] = true
    })
    setLinhasExpandidas(novo)
  }

  const recolherTodas = () => {
    setLinhasExpandidas({})
  }

  const formatarDataHora = (iso?: string) => {
    if (!iso) return '—'
    try {
      const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z')
      if (isNaN(d.getTime())) {
        return iso
      }
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    } catch {
      return iso
    }
  }

  const renderBadgeAcao = (acao: HistoricoAcao) => {
    switch (acao) {
      case 'criacao':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#4E8B7E]/12 text-[#12314F] border border-[#4E8B7E]/30">
            <PlusCircle className="h-3 w-3 text-[#4E8B7E]" />
            Criação
          </span>
        )
      case 'atualizacao':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#1F6B94]/12 text-[#12314F] border border-[#1F6B94]/30">
            <FileEdit className="h-3 w-3 text-[#1F6B94]" />
            Atualização
          </span>
        )
      case 'exclusao':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#C75B39]/12 text-[#12314F] border border-[#C75B39]/30">
            <Trash2 className="h-3 w-3 text-[#C75B39]" />
            Exclusão
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-[#12314F]">
            {acao}
          </span>
        )
    }
  }

  const formatarValorDiff = (val: any) => {
    if (val === null || val === undefined || val === '') {
      return <span className="text-[#5C6B7A]/60 italic font-sans text-xs">vazio</span>
    }
    if (typeof val === 'boolean') {
      return (
        <span
          className={`font-mono text-xs font-semibold ${val ? 'text-[#4E8B7E]' : 'text-[#5C6B7A]'}`}
        >
          {val ? 'Sim (Verdadeiro)' : 'Não (Falso)'}
        </span>
      )
    }
    if (typeof val === 'object') {
      try {
        return <span className="font-mono text-xs">{JSON.stringify(val)}</span>
      } catch {
        return <span className="font-mono text-xs">{String(val)}</span>
      }
    }
    return <span className="font-mono text-xs break-all">{String(val)}</span>
  }

  const totalPaginas = Math.ceil(totalItens / porPagina) || 1

  return (
    <div className="space-y-6 pb-12">
      {/* Cabeçalho da Seção */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#D5DCE5] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-[#1F6B94]/12 text-[#12314F] border border-[#1F6B94]/25">
              Auditoria de Dados
            </span>
            <span className="text-xs text-[#5C6B7A]">Módulo de Administração</span>
          </div>
          <h1 className="text-2xl font-bold text-[#12314F] tracking-tight">
            Histórico de Alterações de Dados
          </h1>
          <p className="text-sm text-[#5C6B7A] mt-1 max-w-3xl">
            Rastreabilidade integral das operações de criação, modificação e exclusão de dados
            gerenciados pela plataforma Koinon. Registrado de forma autônoma via procedimentos
            server-side.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => carregarHistorico(paginaAtual)}
            disabled={carregando}
            className="border-[#D5DCE5] text-[#12314F] hover:bg-[#F1F4F8] rounded-[10px]"
          >
            <RotateCw className={`h-3.5 w-3.5 mr-1.5 ${carregando ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Cartão de Resumo Informativo */}
      <Card className="border-[#D5DCE5] bg-gradient-to-r from-[#F1F4F8] to-white rounded-[12px] shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-[10px] bg-[#12314F] text-white flex items-center justify-center shrink-0 shadow-sm">
                <Database className="h-5 w-5 text-[#D5DCE5]" />
              </div>
              <div>
                <p className="text-xs text-[#5C6B7A] uppercase font-semibold tracking-wider">
                  Total de Alterações Registradas
                </p>
                <p className="text-xl font-bold text-[#12314F] mt-0.5">{totalItens}</p>
                <p className="text-[11px] text-[#5C6B7A] mt-0.5">
                  Operações auditadas cronologicamente
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-[10px] bg-[#1F6B94] text-white flex items-center justify-center shrink-0 shadow-sm">
                <ShieldCheck className="h-5 w-5 text-[#D5DCE5]" />
              </div>
              <div>
                <p className="text-xs text-[#5C6B7A] uppercase font-semibold tracking-wider">
                  Trilha Server-side & LGPD
                </p>
                <p className="text-sm font-semibold text-[#12314F] mt-0.5">
                  Segurança e Imutabilidade
                </p>
                <p className="text-[11px] text-[#5C6B7A] mt-0.5">
                  Senhas e credenciais blindadas contra exposição
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-[10px] bg-[#4E8B7E] text-white flex items-center justify-center shrink-0 shadow-sm">
                <History className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-[#5C6B7A] uppercase font-semibold tracking-wider">
                  Auditoria de Votação
                </p>
                <p className="text-sm font-semibold text-[#12314F] mt-0.5">Urna Eletrônica</p>
                <p className="text-[11px] text-[#5C6B7A] mt-0.5">
                  Votos e cédulas protegidos na trilha de hash encadeado
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Painel de Filtros e Busca */}
      <Card className="border-[#D5DCE5] bg-white rounded-[12px] shadow-sm">
        <CardContent className="p-4 sm:p-5 space-y-4">
          <form onSubmit={handleBuscar} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Entidade */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#5C6B7A] uppercase tracking-wider">
                  Entidade de Dados
                </label>
                <Select value={filtroEntidade} onValueChange={setFiltroEntidade}>
                  <SelectTrigger className="border-[#D5DCE5] bg-white rounded-[10px] text-xs h-9 text-[#12314F]">
                    <SelectValue placeholder="Todas as entidades" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#D5DCE5]">
                    <SelectItem value="todas">Todas as entidades</SelectItem>
                    {Object.entries(ENTIDADES_CONFIG).map(([chave, cfg]) => (
                      <SelectItem key={chave} value={chave} className="text-xs text-[#12314F]">
                        {cfg.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Ação */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#5C6B7A] uppercase tracking-wider">
                  Operação / Ação
                </label>
                <Select value={filtroAcao} onValueChange={setFiltroAcao}>
                  <SelectTrigger className="border-[#D5DCE5] bg-white rounded-[10px] text-xs h-9 text-[#12314F]">
                    <SelectValue placeholder="Todas as ações" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#D5DCE5]">
                    <SelectItem value="todas">Todas as ações</SelectItem>
                    <SelectItem value="criacao" className="text-xs text-[#12314F]">
                      Criação de Registro
                    </SelectItem>
                    <SelectItem value="atualizacao" className="text-xs text-[#12314F]">
                      Atualização de Dados
                    </SelectItem>
                    <SelectItem value="exclusao" className="text-xs text-[#12314F]">
                      Exclusão de Registro
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Usuário / Operador */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#5C6B7A] uppercase tracking-wider">
                  Operador Responsável
                </label>
                <Select value={filtroUsuario} onValueChange={setFiltroUsuario}>
                  <SelectTrigger className="border-[#D5DCE5] bg-white rounded-[10px] text-xs h-9 text-[#12314F]">
                    <SelectValue placeholder="Todos os operadores" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#D5DCE5] max-h-60">
                    <SelectItem value="todos">Todos os operadores</SelectItem>
                    {usuariosSistema.map((u) => (
                      <SelectItem key={u.id} value={u.id} className="text-xs text-[#12314F]">
                        {u.name || u.email} ({u.role || 'usuário'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Busca Livre */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#5C6B7A] uppercase tracking-wider">
                  Busca Textual
                </label>
                <div className="relative">
                  <Input
                    value={buscaLivre}
                    onChange={(e) => setBuscaLivre(e.target.value)}
                    placeholder="Nome, e-mail, rótulo ou ID..."
                    className="border-[#D5DCE5] bg-white rounded-[10px] text-xs h-9 pr-8 text-[#12314F]"
                  />
                  <Search className="h-4 w-4 text-[#5C6B7A] absolute right-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Segunda linha de filtros: Período e Botões */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-3 pt-2 border-t border-[#D5DCE5]/60">
              <div className="flex flex-wrap items-center gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[#5C6B7A] uppercase tracking-wider">
                    Data Inicial
                  </label>
                  <Input
                    type="date"
                    value={filtroDataInicio}
                    onChange={(e) => setFiltroDataInicio(e.target.value)}
                    className="border-[#D5DCE5] bg-white rounded-[10px] text-xs h-8 text-[#12314F]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[#5C6B7A] uppercase tracking-wider">
                    Data Final
                  </label>
                  <Input
                    type="date"
                    value={filtroDataFim}
                    onChange={(e) => setFiltroDataFim(e.target.value)}
                    className="border-[#D5DCE5] bg-white rounded-[10px] text-xs h-8 text-[#12314F]"
                  />
                </div>
                {(filtroEntidade !== 'todas' ||
                  filtroAcao !== 'todas' ||
                  filtroUsuario !== 'todos' ||
                  filtroDataInicio ||
                  filtroDataFim ||
                  buscaLivre) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleLimparFiltros}
                    className="h-8 text-xs text-[#5C6B7A] hover:text-[#12314F] self-end"
                  >
                    Limpar filtros
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2 self-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={expandirTodas}
                  disabled={registros.length === 0}
                  className="border-[#D5DCE5] text-[#5C6B7A] hover:text-[#12314F] text-xs h-8 rounded-[8px]"
                >
                  Expandir todas
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={recolherTodas}
                  disabled={registros.length === 0}
                  className="border-[#D5DCE5] text-[#5C6B7A] hover:text-[#12314F] text-xs h-8 rounded-[8px]"
                >
                  Recolher todas
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-[#1F6B94] hover:bg-[#185577] text-white text-xs h-8 px-4 rounded-[8px] font-semibold border-0"
                >
                  Filtrar
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Tabela Principal de Histórico de Alterações */}
      <Card className="border-[#D5DCE5] bg-white rounded-[12px] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            {/* Cabeçalho Mármore Azulado com texto Grafite em caixa alta pequena */}
            <thead className="bg-[#F1F4F8] border-b border-[#D5DCE5] text-[#5C6B7A] font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-3 w-8"></th>
                <th className="py-3 px-3">Data e Hora</th>
                <th className="py-3 px-3">Operação</th>
                <th className="py-3 px-3">Entidade</th>
                <th className="py-3 px-3">Registro Afetado</th>
                <th className="py-3 px-3">Operador Responsável</th>
                <th className="py-3 px-3 text-center">Campos Modificados</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D5DCE5]">
              {carregando ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-[#5C6B7A]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1F6B94] border-t-transparent" />
                      <p className="text-xs">Carregando trilha de alterações de dados...</p>
                    </div>
                  </td>
                </tr>
              ) : registros.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-[#5C6B7A]">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <History className="h-8 w-8 text-[#5C6B7A]/40" />
                      <p className="text-sm font-semibold text-[#12314F]">
                        Nenhuma alteração localizada
                      </p>
                      <p className="text-xs text-[#5C6B7A]">
                        Nenhum evento de criação, alteração ou exclusão coincide com os critérios de
                        filtro selecionados.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                registros.map((reg) => {
                  const expandida = !!linhasExpandidas[reg.id]
                  const diffs: CampoAlteradoDiff[] = Array.isArray(reg.campos_alterados)
                    ? reg.campos_alterados
                    : []
                  const entidadeInfo = ENTIDADES_CONFIG[reg.entidade] || {
                    label: reg.entidade,
                    singular: reg.entidade,
                    cor: '#12314F',
                  }

                  return (
                    <React.Fragment key={reg.id}>
                      <tr
                        onClick={() => alternarLinha(reg.id)}
                        className={`cursor-pointer transition-colors hover:bg-[#F1F4F8]/60 ${
                          expandida ? 'bg-[#F1F4F8]/40' : ''
                        }`}
                      >
                        <td className="py-3 px-3 text-[#5C6B7A]">
                          {expandida ? (
                            <ChevronDown className="h-4 w-4 text-[#1F6B94]" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-[#5C6B7A]" />
                          )}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px] text-[#12314F]">
                          {formatarDataHora(reg.data_hora || reg.created)}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">{renderBadgeAcao(reg.acao)}</td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="font-semibold text-[#12314F]">
                            {entidadeInfo.singular}
                          </span>
                          <span className="block text-[10px] font-mono text-[#5C6B7A]">
                            {reg.entidade}
                          </span>
                        </td>
                        <td className="py-3 px-3 max-w-xs">
                          <p
                            className="font-semibold text-[#12314F] truncate"
                            title={reg.registro_rotulo}
                          >
                            {reg.registro_rotulo || reg.registro_id}
                          </p>
                          <p className="text-[10px] font-mono text-[#5C6B7A] truncate">
                            ID: {reg.registro_id}
                          </p>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-[#5C6B7A] shrink-0" />
                            <div className="truncate">
                              <p className="font-medium text-[#12314F] truncate">
                                {reg.user_nome || 'Sistema'}
                              </p>
                              {reg.user_email && (
                                <p className="text-[10px] text-[#5C6B7A] truncate font-mono">
                                  {reg.user_email}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] text-[11px] font-semibold bg-[#12314F]/5 text-[#12314F] border border-[#D5DCE5]">
                            {diffs.length} {diffs.length === 1 ? 'campo' : 'campos'}
                          </span>
                        </td>
                      </tr>

                      {/* Linha de Detalhamento Expandida */}
                      {expandida && (
                        <tr className="bg-[#F1F4F8]/80 border-b border-[#D5DCE5]">
                          <td colSpan={7} className="p-4 sm:p-5">
                            <div className="space-y-4 bg-white p-4 rounded-[10px] border border-[#D5DCE5] shadow-xs">
                              {/* Metadados Técnicos do Evento */}
                              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#D5DCE5] text-[11px] text-[#5C6B7A]">
                                <div className="flex items-center gap-4 flex-wrap">
                                  <span>
                                    <strong>ID do Registro no Banco:</strong>{' '}
                                    <code className="bg-[#F1F4F8] px-1.5 py-0.5 rounded text-[#12314F]">
                                      {reg.registro_id}
                                    </code>
                                  </span>
                                  {reg.ip && (
                                    <span>
                                      <strong>Endereço IP:</strong>{' '}
                                      <code className="bg-[#F1F4F8] px-1.5 py-0.5 rounded text-[#12314F]">
                                        {reg.ip}
                                      </code>
                                    </span>
                                  )}
                                  {reg.user_role && (
                                    <span>
                                      <strong>Cargo do Operador:</strong>{' '}
                                      <span className="capitalize">{reg.user_role}</span>
                                    </span>
                                  )}
                                </div>
                                {reg.user_agent && (
                                  <span
                                    className="text-[10px] font-mono text-[#5C6B7A]/80 truncate max-w-md"
                                    title={reg.user_agent}
                                  >
                                    {reg.user_agent}
                                  </span>
                                )}
                              </div>

                              {/* Tabela de Diffs Campo a Campo */}
                              <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-[#12314F] mb-2.5 flex items-center gap-1.5">
                                  <Info className="h-3.5 w-3.5 text-[#1F6B94]" />
                                  Detalhamento de Modificações Campo a Campo
                                </h4>

                                {diffs.length === 0 ? (
                                  <p className="text-xs text-[#5C6B7A] italic py-2">
                                    Nenhum campo com alteração de valor registrado para esta
                                    operação.
                                  </p>
                                ) : (
                                  <div className="overflow-x-auto border border-[#D5DCE5] rounded-[8px]">
                                    <table className="w-full text-left text-xs">
                                      <thead className="bg-[#F1F4F8] border-b border-[#D5DCE5] text-[#5C6B7A] font-semibold text-[10px] uppercase tracking-wider">
                                        <tr>
                                          <th className="py-2 px-3 w-1/4">Campo Operacional</th>
                                          <th className="py-2 px-3 w-3/8">
                                            {reg.acao === 'criacao'
                                              ? 'Estado Anterior'
                                              : 'Valor Anterior'}
                                          </th>
                                          <th className="py-2 px-3 w-3/8">
                                            {reg.acao === 'exclusao'
                                              ? 'Estado Excluído'
                                              : 'Novo Valor'}
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-[#D5DCE5]/70">
                                        {diffs.map((diff, idx) => {
                                          const nomeAmigavel =
                                            ROTULOS_CAMPOS[diff.campo] || diff.campo

                                          return (
                                            <tr
                                              key={idx}
                                              className="hover:bg-[#F1F4F8]/40 transition-colors"
                                            >
                                              <td className="py-2.5 px-3">
                                                <p className="font-semibold text-[#12314F]">
                                                  {nomeAmigavel}
                                                </p>
                                                <p className="text-[10px] font-mono text-[#5C6B7A]">
                                                  {diff.campo}
                                                </p>
                                              </td>
                                              <td className="py-2.5 px-3 bg-[#F1F4F8]/30">
                                                {reg.acao === 'criacao' ? (
                                                  <span className="text-[#5C6B7A]/60 italic">
                                                    (registro inexistente)
                                                  </span>
                                                ) : (
                                                  <div className="text-[#5C6B7A]">
                                                    {formatarValorDiff(diff.anterior)}
                                                  </div>
                                                )}
                                              </td>
                                              <td className="py-2.5 px-3 bg-[#1F6B94]/5">
                                                {reg.acao === 'exclusao' ? (
                                                  <span className="text-[#C75B39] font-semibold">
                                                    (registro removido da base)
                                                  </span>
                                                ) : (
                                                  <div className="text-[#12314F] font-medium flex items-center gap-1.5">
                                                    <ArrowRight className="h-3 w-3 text-[#1F6B94] shrink-0" />
                                                    {formatarValorDiff(diff.novo)}
                                                  </div>
                                                )}
                                              </td>
                                            </tr>
                                          )
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé de Paginação */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-[#D5DCE5] bg-[#F1F4F8]/50 text-xs text-[#5C6B7A]">
          <div>
            Mostrando{' '}
            <strong className="text-[#12314F]">
              {registros.length === 0 ? 0 : (paginaAtual - 1) * porPagina + 1}
            </strong>{' '}
            a{' '}
            <strong className="text-[#12314F]">
              {Math.min(paginaAtual * porPagina, totalItens)}
            </strong>{' '}
            de <strong className="text-[#12314F]">{totalItens}</strong> registros auditados
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => carregarHistorico(paginaAtual - 1)}
              disabled={paginaAtual <= 1 || carregando}
              className="border-[#D5DCE5] text-[#12314F] h-8 text-xs rounded-[8px]"
            >
              Anterior
            </Button>
            <span className="px-2 font-medium text-[#12314F]">
              Página {paginaAtual} de {totalPaginas}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => carregarHistorico(paginaAtual + 1)}
              disabled={paginaAtual >= totalPaginas || carregando}
              className="border-[#D5DCE5] text-[#12314F] h-8 text-xs rounded-[8px]"
            >
              Próxima
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default HistoricoAlteracoesPage
