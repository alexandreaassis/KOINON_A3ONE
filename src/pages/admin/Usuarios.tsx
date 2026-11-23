import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useCondoConfig } from '@/context/CondoConfigContext'
import {
  api,
  type UserRecord,
  type UserRole,
  type UnidadeRecord,
  type LogAcessoRecord,
} from '@/lib/api'
import {
  formatarIdentificadorUnidade,
  formatarUnidadeComBloco,
  normalizarBloco,
  temBlocoReal,
} from '@/lib/formatadorUnidade'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
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
import { formatarCpf, validarCpf, limparCpf, mascararCpf, MSG_CPF_INVALIDO } from '@/lib/cpf'
import {
  Users,
  UserPlus,
  KeyRound,
  Shield,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Mail,
  Home,
  Check,
  Building,
  UserCheck,
  History,
  Clock,
  RotateCw,
  Eye,
  EyeOff,
} from 'lucide-react'

const ITENS_POR_PAGINA = 10

/**
 * Resolve TODAS as unidades de um usuário: multi-relação users.unidades
 * (expandida em getTodosUsuarios) unificada com o campo legado users.unidade.
 */
const unidadesDeUsuario = (u: UserRecord): string[] => {
  const ids = new Set<string>()
  const multi = Array.isArray(u.unidades) ? u.unidades : []
  for (const id of multi) if (id) ids.add(id)
  if (u.unidade) ids.add(u.unidade)
  return Array.from(ids)
}

export const GestaoUsuariosPage: React.FC = () => {
  const { user: currentUser } = useAuth()
  const { rotuloUnidade, nomeCondominio } = useCondoConfig()

  const [usuarios, setUsuarios] = useState<UserRecord[]>([])
  const [unidades, setUnidades] = useState<UnidadeRecord[]>([])
  const [carregando, setCarregando] = useState(true)

  // Filtros e busca
  const [busca, setBusca] = useState('')
  const [filtroRole, setFiltroRole] = useState<string>('todos')
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [filtroUnidadeId, setFiltroUnidadeId] = useState<string>('todos')
  const [paginaAtual, setPaginaAtual] = useState(1)

  // Modal Criar Usuário
  const [modalNovoAberto, setModalNovoAberto] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [novoEmail, setNovoEmail] = useState('')
  const [novoSenha, setNovoSenha] = useState('')
  const [mostrarNovoSenha, setMostrarNovoSenha] = useState(false)
  const [novoCpf, setNovoCpf] = useState('')
  const [novoCpfErro, setNovoCpfErro] = useState<string | null>(null)
  const [novoRole, setNovoRole] = useState<UserRole>('morador')
  const [novoUnidadesIds, setNovoUnidadesIds] = useState<string[]>([])
  const [novoAtivo, setNovoAtivo] = useState(true)
  const [novoEnviarConvite, setNovoEnviarConvite] = useState(true)
  const [salvandoNovo, setSalvandoNovo] = useState(false)
  // Modal Editar Usuário
  const [modalEditarAberto, setModalEditarAberto] = useState(false)
  const [usuarioEditando, setUsuarioEditando] = useState<UserRecord | null>(null)
  const [editNome, setEditNome] = useState('')
  const [editCpf, setEditCpf] = useState('')
  const [editCpfErro, setEditCpfErro] = useState<string | null>(null)
  const [editRole, setEditRole] = useState<UserRole>('morador')
  const [editUnidadesIds, setEditUnidadesIds] = useState<string[]>([])
  const [editAtivo, setEditAtivo] = useState(true)
  const [salvandoEdit, setSalvandoEdit] = useState(false)

  // Modal Redefinir Senha
  const [modalResetAberto, setModalResetAberto] = useState(false)
  const [usuarioReset, setUsuarioReset] = useState<UserRecord | null>(null)
  const [enviandoReset, setEnviandoReset] = useState(false)

  // Modal Logs de Acesso
  const [modalLogsAberto, setModalLogsAberto] = useState(false)
  const [usuarioLogs, setUsuarioLogs] = useState<UserRecord | null>(null)
  const [logsAcesso, setLogsAcesso] = useState<LogAcessoRecord[]>([])
  const [carregandoLogs, setCarregandoLogs] = useState(false)

  // Carregar dados
  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const [todosUsersRes, undsRes] = await Promise.allSettled([
        api.getTodosUsuarios(),
        api.getUnidades(),
      ])

      if (todosUsersRes.status === 'fulfilled') {
        setUsuarios(todosUsersRes.value || [])
      } else {
        console.error('Erro ao carregar usuários:', todosUsersRes.reason)
        const msg = getErrorMessage(todosUsersRes.reason, 'Não foi possível listar os usuários.')
        toast({
          title: 'Falha ao consultar usuários',
          description: msg,
          variant: 'destructive',
        })
      }

      if (undsRes.status === 'fulfilled') {
        setUnidades(undsRes.value || [])
      } else {
        console.warn('Aviso ao carregar unidades:', undsRes.reason)
      }
    } catch (err) {
      console.error('Erro inesperado em carregar:', err)
      toast({
        title: 'Falha na comunicação',
        description: getErrorMessage(err, 'Não foi possível carregar os dados de gestão.'),
        variant: 'destructive',
      })
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  // Contagem de gestores ativos (admin ou mesa) para prevenir bloqueio acidental do condomínio
  const totalGestoresAtivos = useMemo(() => {
    return usuarios.filter((u) => (u.role === 'admin' || u.role === 'mesa') && u.ativo !== false)
      .length
  }, [usuarios])

  // Filtragem local multi-critério
  const usuariosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    const termoCpfLimpo = termo.replace(/\D/g, '')

    return usuarios.filter((u) => {
      // Filtro por texto: nome, email, CPF ou unidade
      const matchTexto =
        !termo ||
        (u.name || '').toLowerCase().includes(termo) ||
        (u.email || '').toLowerCase().includes(termo) ||
        (termoCpfLimpo && (u.cpf || '').replace(/\D/g, '').includes(termoCpfLimpo)) ||
        (() => {
          // Busca em TODAS as unidades do usuário (multi + legado)
          const idsDoUsuario = unidadesDeUsuario(u)
          return idsDoUsuario.some((idU) => {
            const und = unidades.find((item) => item.id === idU)
            if (!und) return false
            return (
              und.identificador.toLowerCase().includes(termo) ||
              (und.bloco || '').toLowerCase().includes(termo) ||
              (und.tipo_unidade || '').toLowerCase().includes(termo)
            )
          })
        })()

      // Filtro por papel
      const matchRole =
        filtroRole === 'todos' ||
        (filtroRole === 'gestores'
          ? u.role === 'admin' || u.role === 'mesa'
          : u.role === filtroRole)

      // Filtro por status ativo/inativo
      const isAtivo = u.ativo !== false
      const matchStatus =
        filtroStatus === 'todos' ||
        (filtroStatus === 'ativo' && isAtivo) ||
        (filtroStatus === 'inativo' && !isAtivo)

      // Filtro por unidade: pega TODAS as unidades do usuário (multi + legado)
      const matchUnidade =
        filtroUnidadeId === 'todos' || unidadesDeUsuario(u).includes(filtroUnidadeId)

      return matchTexto && matchRole && matchStatus && matchUnidade
    })
  }, [usuarios, unidades, busca, filtroRole, filtroStatus, filtroUnidadeId])

  // Paginação
  const totalPaginas = Math.max(1, Math.ceil(usuariosFiltrados.length / ITENS_POR_PAGINA))
  const paginaCorrente = Math.min(paginaAtual, totalPaginas)
  const indiceInicial = (paginaCorrente - 1) * ITENS_POR_PAGINA
  const usuariosPaginados = usuariosFiltrados.slice(indiceInicial, indiceInicial + ITENS_POR_PAGINA)

  // Abrir Modal de Novo Usuário
  const abrirNovoUsuario = () => {
    setNovoNome('')
    setNovoEmail('')
    setNovoSenha('')
    setNovoCpf('')
    setNovoCpfErro(null)
    setNovoRole('morador')
    setNovoUnidadesIds([])
    setNovoAtivo(true)
    setNovoEnviarConvite(true)
    setModalNovoAberto(true)
  }

  // Abrir Modal de Edição
  const abrirEditarUsuario = (u: UserRecord) => {
    setUsuarioEditando(u)
    setEditNome(u.name || '')
    setEditCpf(formatarCpf(u.cpf || ''))
    setEditCpfErro(null)
    setEditRole(u.role || 'morador')
    setEditUnidadesIds(unidadesDeUsuario(u))
    setEditAtivo(u.ativo !== false)
    setModalEditarAberto(true)
  }

  // Submissão Criar Usuário
  const handleCriarUsuario = async (e: React.FormEvent) => {
    e.preventDefault()

    const rawCpf = limparCpf(novoCpf)
    if (rawCpf && !validarCpf(rawCpf)) {
      setNovoCpfErro(MSG_CPF_INVALIDO)
      return
    }

    if (novoSenha && novoSenha.length < 8) {
      toast({
        title: 'Senha muito curta',
        description: 'A senha informada deve ter pelo menos 8 caracteres.',
        variant: 'destructive',
      })
      return
    }

    setSalvandoNovo(true)
    try {
      const res = await api.criarUsuarioGestao({
        name: novoNome.trim(),
        email: novoEmail.trim(),
        password: novoSenha.trim() || undefined,
        cpf: rawCpf,
        role: novoRole,
        unidades: novoUnidadesIds,
        unidade: novoUnidadesIds[0] || '',
        ativo: novoAtivo,
        enviarConvite: novoEnviarConvite,
      })

      toast({
        title: 'Usuário cadastrado com sucesso',
        description: res?.conviteEnviado
          ? 'Convite para definição de senha enviado por e-mail.'
          : 'Registro adicionado à base de condôminos.',
      })

      setModalNovoAberto(false)
      carregar()
    } catch (err: any) {
      console.error('Erro ao cadastrar usuário:', err)
      const msg = getErrorMessage(err, 'Falha ao salvar usuário no sistema.')
      toast({
        title: 'Erro ao cadastrar usuário',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setSalvandoNovo(false)
    }
  }

  // Submissão Editar Usuário
  const handleEditarUsuario = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!usuarioEditando) return

    const rawCpf = limparCpf(editCpf)
    if (rawCpf && !validarCpf(rawCpf)) {
      setEditCpfErro(MSG_CPF_INVALIDO)
      return
    }

    // Regras de segurança no front para feedback imediato
    if (currentUser?.id === usuarioEditando.id) {
      if (!editAtivo) {
        toast({
          title: 'Ação não permitida',
          description: 'Você não pode desativar seu próprio usuário em sessão.',
          variant: 'destructive',
        })
        return
      }
      if (
        (usuarioEditando.role === 'admin' || usuarioEditando.role === 'mesa') &&
        editRole === 'morador'
      ) {
        toast({
          title: 'Ação não permitida',
          description: 'Você não pode revogar seus próprios privilégios de gestor.',
          variant: 'destructive',
        })
        return
      }
    }

    const eraGestorAtivo =
      (usuarioEditando.role === 'admin' || usuarioEditando.role === 'mesa') &&
      usuarioEditando.ativo !== false
    const deixaraDeSer = !editAtivo || (editRole !== 'admin' && editRole !== 'mesa')

    if (eraGestorAtivo && deixaraDeSer && totalGestoresAtivos <= 1) {
      toast({
        title: 'Ação bloqueada',
        description: 'Não é permitido desativar ou demover o único gestor ativo do condomínio.',
        variant: 'destructive',
      })
      return
    }

    setSalvandoEdit(true)
    try {
      const res = await api.atualizarUsuarioGestao({
        id: usuarioEditando.id,
        name: editNome.trim(),
        role: editRole,
        cpf: rawCpf,
        unidades: editUnidadesIds,
        unidade: editUnidadesIds[0] || '',
        ativo: editAtivo,
      })

      toast({
        title: 'Usuário atualizado com sucesso',
        description: res?.message || 'Dados e permissões gravados na trilha de auditoria.',
      })

      setModalEditarAberto(false)
      carregar()
    } catch (err: any) {
      console.error('Erro ao atualizar usuário:', err)
      const msg = getErrorMessage(err, 'Falha ao atualizar dados do usuário.')
      toast({
        title: 'Erro ao atualizar usuário',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setSalvandoEdit(false)
    }
  }

  // Alternar status ativo/inativo direto na tabela
  const handleAlternarStatusAtivo = async (u: UserRecord) => {
    const isAtivoAtual = u.ativo !== false
    const novoStatus = !isAtivoAtual

    // Verificação de auto-desativação
    if (currentUser?.id === u.id && !novoStatus) {
      toast({
        title: 'Ação não permitida',
        description: 'Você não pode desativar sua própria conta de gestor.',
        variant: 'destructive',
      })
      return
    }

    // Verificação do último gestor ativo
    const eraGestorAtivo = (u.role === 'admin' || u.role === 'mesa') && isAtivoAtual
    if (eraGestorAtivo && !novoStatus && totalGestoresAtivos <= 1) {
      toast({
        title: 'Ação bloqueada',
        description: 'Não é possível desativar o último gestor ativo do sistema.',
        variant: 'destructive',
      })
      return
    }

    try {
      await api.atualizarUsuarioGestao({
        id: u.id,
        ativo: novoStatus,
      })

      toast({
        title: novoStatus ? 'Acesso Ativado' : 'Acesso Desativado',
        description: novoStatus
          ? `O condômino ${u.name} agora pode autenticar-se na plataforma.`
          : `O acesso de ${u.name} foi revogado imediatamente.`,
      })
      carregar()
    } catch (err: any) {
      console.error('Erro ao alternar status do usuário:', err)
      const msg = getErrorMessage(err, 'Falha ao alterar status de acesso.')
      toast({
        title: 'Erro ao alterar status',
        description: msg,
        variant: 'destructive',
      })
    }
  }

  // Redefinir Senha (dispara e-mail)
  const handleDispararResetSenha = async () => {
    if (!usuarioReset) return

    setEnviandoReset(true)
    try {
      const res = await api.redefinirSenhaUsuarioGestao(usuarioReset.id)
      toast({
        title: 'Instruções Enviadas',
        description: res?.message || `E-mail de recuperação enviado para ${usuarioReset.email}.`,
      })
      setModalResetAberto(false)
      setUsuarioReset(null)
    } catch (err: any) {
      console.error('Erro ao enviar recuperação de senha:', err)
      const msg = getErrorMessage(err, 'Falha ao disparar e-mail de redefinição de senha.')
      toast({
        title: 'Erro no envio',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setEnviandoReset(false)
    }
  }

  // Abrir Modal de Logs de Acesso
  const abrirLogsAcesso = async (u: UserRecord) => {
    setUsuarioLogs(u)
    setModalLogsAberto(true)
    setCarregandoLogs(true)
    try {
      const res = await api.getLogsAcesso({ userId: u.id, limit: 50 })
      setLogsAcesso(res?.items || [])
    } catch (err) {
      console.error('Erro ao consultar logs de acesso:', err)
      const msg = getErrorMessage(
        err,
        'Não foi possível carregar o histórico de acessos deste usuário.',
      )
      toast({
        title: 'Falha ao buscar logs',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setCarregandoLogs(false)
    }
  }

  // Recarregar logs do usuário selecionado
  const recarregarLogs = async () => {
    if (!usuarioLogs) return
    setCarregandoLogs(true)
    try {
      const res = await api.getLogsAcesso({ userId: usuarioLogs.id, limit: 50 })
      setLogsAcesso(res?.items || [])
    } catch (err) {
      console.error('Erro ao recarregar logs:', err)
      const msg = getErrorMessage(err, 'Falha ao recarregar os logs de acesso.')
      toast({
        title: 'Falha ao atualizar logs',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setCarregandoLogs(false)
    }
  }

  // Formatador de data
  const formatarData = (iso?: string) => {
    if (!iso) return '—'
    try {
      const d = new Date(iso)
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    } catch {
      return '—'
    }
  }

  const formatarDataHoraCompleta = (iso?: string) => {
    if (!iso) return '—'
    try {
      const d = new Date(iso)
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    } catch {
      return '—'
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Cabeçalho Institucional Koinon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D5DCE5] pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[8px] bg-[#1F6B94]/10 text-[#12314F] border border-[#1F6B94]/25 text-[11px] font-semibold mb-2">
            <Shield className="h-3.5 w-3.5 text-[#1F6B94]" /> Controle de Acesso e Governança
          </div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#12314F] flex items-center gap-2">
            Gestão de Usuários e Permissões
          </h1>
          <p className="text-xs text-[#5C6B7A] mt-1 max-w-2xl">
            Gerencie os operadores da mesa, membros da administração e condôminos habilitados no
            condomínio <strong className="text-[#12314F]">{nomeCondominio}</strong>. Toda alteração
            de perfil é registrada para auditoria.
          </p>
        </div>

        <Button
          onClick={abrirNovoUsuario}
          className="bg-[#1F6B94] hover:bg-[#185577] text-white font-semibold text-xs h-9 px-3.5 rounded-[10px] shadow-none border-0 self-start sm:self-center"
        >
          <UserPlus className="mr-1.5 h-4 w-4" /> Novo Usuário
        </Button>
      </div>
      {/* Cartão de Resumo e Métricas Operacionais */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-[#D5DCE5] bg-white rounded-[14px] shadow-[0_4px_24px_rgba(18,49,79,0.06)]">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#5C6B7A]">
                Total de Usuários
              </p>
              <p className="text-xl font-bold text-[#12314F] mt-0.5">{usuarios.length}</p>
            </div>
            <div className="h-9 w-9 rounded-full bg-[#F1F4F8] flex items-center justify-center text-[#12314F]">
              <Users className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#D5DCE5] bg-white rounded-[14px] shadow-[0_4px_24px_rgba(18,49,79,0.06)]">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#5C6B7A]">
                Usuários Ativos
              </p>
              <p className="text-xl font-bold text-[#4E8B7E] mt-0.5">
                {usuarios.filter((u) => u.ativo !== false).length}
              </p>
            </div>
            <div className="h-9 w-9 rounded-full bg-[#4E8B7E]/15 flex items-center justify-center text-[#4E8B7E]">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#D5DCE5] bg-white rounded-[14px] shadow-[0_4px_24px_rgba(18,49,79,0.06)]">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#5C6B7A]">
                Gestores / Operadores
              </p>
              <p className="text-xl font-bold text-[#1F6B94] mt-0.5">
                {totalGestoresAtivos}{' '}
                <span className="text-[11px] font-normal text-[#5C6B7A]">ativos</span>
              </p>
            </div>
            <div className="h-9 w-9 rounded-full bg-[#1F6B94]/10 flex items-center justify-center text-[#1F6B94]">
              <Shield className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros e Busca */}
      <Card className="border-[#D5DCE5] bg-white rounded-[12px] shadow-[0_4px_24px_rgba(18,49,79,0.04)]">
        <CardContent className="p-3.5">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            {/* Campo de Busca */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#5C6B7A]" />
              <Input
                placeholder="Buscar por nome, e-mail, CPF ou unidade..."
                value={busca}
                onChange={(e) => {
                  setBusca(e.target.value)
                  setPaginaAtual(1)
                }}
                className="pl-9 h-9 text-xs border-[#D5DCE5] bg-white text-[#12314F] placeholder:text-[#5C6B7A] rounded-[10px]"
              />
            </div>

            {/* Filtro por Perfil */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-[#5C6B7A] hidden sm:block shrink-0" />
              <Select
                value={filtroRole}
                onValueChange={(val) => {
                  setFiltroRole(val)
                  setPaginaAtual(1)
                }}
              >
                <SelectTrigger className="w-full sm:w-44 h-9 text-xs border-[#D5DCE5] bg-white text-[#12314F] rounded-[10px]">
                  <SelectValue placeholder="Perfil" />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#D5DCE5] text-[#12314F]">
                  <SelectItem value="todos">Todos os perfis</SelectItem>
                  <SelectItem value="morador">Morador (Votante)</SelectItem>
                  <SelectItem value="mesa">Mesa Diretora</SelectItem>
                  <SelectItem value="admin">Administrador Geral</SelectItem>
                  <SelectItem value="gestores">Todos os gestores</SelectItem>
                </SelectContent>
              </Select>

              {/* Filtro por Status */}
              <Select
                value={filtroStatus}
                onValueChange={(val) => {
                  setFiltroStatus(val)
                  setPaginaAtual(1)
                }}
              >
                <SelectTrigger className="w-full sm:w-36 h-9 text-xs border-[#D5DCE5] bg-white text-[#12314F] rounded-[10px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#D5DCE5] text-[#12314F]">
                  <SelectItem value="todos">Todos status</SelectItem>
                  <SelectItem value="ativo">Apenas Ativos</SelectItem>
                  <SelectItem value="inativo">Apenas Inativos</SelectItem>
                </SelectContent>
              </Select>

              {/* Filtro por Unidade (cobre multi + legado) */}
              <Select
                value={filtroUnidadeId}
                onValueChange={(val) => {
                  setFiltroUnidadeId(val)
                  setPaginaAtual(1)
                }}
              >
                <SelectTrigger className="w-full sm:w-40 h-9 text-xs border-[#D5DCE5] bg-white text-[#12314F] rounded-[10px]">
                  <SelectValue placeholder="Unidade" />
                </SelectTrigger>
                <SelectContent className="max-h-56 bg-white border-[#D5DCE5] text-[#12314F]">
                  <SelectItem value="todos">Todas as unidades</SelectItem>
                  {unidades.map((und) => (
                    <SelectItem key={und.id} value={und.id}>
                      {formatarUnidadeComBloco(und, rotuloUnidade, ' (—)')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Usuários - Tabela Desktop com Cabeçalho Mármore / Cartões Mobile */}
      <Card className="border-[#D5DCE5] bg-white rounded-[12px] shadow-[0_4px_24px_rgba(18,49,79,0.06)] overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-[#D5DCE5] flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold text-[#12314F]">
              Usuários Registrados ({usuariosFiltrados.length})
            </CardTitle>
            <CardDescription className="text-xs text-[#5C6B7A]">
              Credenciais individuais vinculadas a chaves de voto e trilhas de auditoria.
            </CardDescription>
          </div>
          {busca ||
          filtroRole !== 'todos' ||
          filtroStatus !== 'todos' ||
          filtroUnidadeId !== 'todos' ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setBusca('')
                setFiltroRole('todos')
                setFiltroStatus('todos')
                setFiltroUnidadeId('todos')
                setPaginaAtual(1)
              }}
              className="text-xs text-[#5C6B7A] hover:text-[#12314F]"
            >
              Limpar filtros
            </Button>
          ) : null}
        </CardHeader>

        <CardContent className="p-0">
          {carregando ? (
            <div className="py-12 flex flex-col items-center justify-center text-[#5C6B7A] gap-2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1F6B94] border-t-transparent" />
              <p className="text-xs">Consultando base de usuários...</p>
            </div>
          ) : usuariosFiltrados.length === 0 ? (
            <div className="py-12 px-4 text-center text-[#5C6B7A]">
              <Users className="h-8 w-8 mx-auto mb-2 text-[#5C6B7A]/50" />
              <p className="text-sm font-medium text-[#12314F]">Nenhum usuário localizado</p>
              <p className="text-xs mt-1">
                Ajuste os filtros de busca ou cadastre um novo condômino no sistema.
              </p>
            </div>
          ) : (
            <>
              {/* VISÃO DESKTOP (Tabela padrão Koinon com Cabeçalho Mármore) */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#F1F4F8] border-y border-[#D5DCE5] text-[#5C6B7A] font-semibold uppercase text-[10px] tracking-wider">
                    {' '}
                    <tr>
                      <th className="py-3 px-4">Nome / Identificação</th>
                      <th className="py-3 px-4">E-mail</th>
                      <th className="py-3 px-4">CPF</th>
                      <th className="py-3 px-4">Unidade</th>
                      <th className="py-3 px-4">Perfil</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Cadastro</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D5DCE5]/60">
                    {usuariosPaginados.map((u) => {
                      const unidadesVinc = unidadesDeUsuario(u)
                        .map((idU) => unidades.find((item) => item.id === idU))
                        .filter((und): und is UnidadeRecord => !!und)
                      const isAtivo = u.ativo !== false
                      const isSelf = currentUser?.id === u.id

                      return (
                        <tr key={u.id} className="hover:bg-[#F1F4F8]/50 transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-semibold text-[#12314F] block">
                              {u.name || 'Sem nome'}
                              {isSelf && (
                                <span className="ml-1.5 text-[10px] font-normal text-[#1F6B94] bg-[#1F6B94]/15 px-1.5 py-0.2 rounded">
                                  você
                                </span>
                              )}
                            </span>
                            <span className="text-[10px] text-[#5C6B7A] font-mono">ID: {u.id}</span>
                          </td>

                          <td className="py-3 px-4 font-mono text-[11px] text-[#12314F]">
                            {u.email}
                          </td>

                          <td className="py-3 px-4 font-mono text-[11px] text-[#5C6B7A]">
                            {u.cpf ? mascararCpf(u.cpf) : <span className="italic">Não inf.</span>}
                          </td>

                          <td className="py-3 px-4 text-[#12314F]">
                            {unidadesVinc.length > 0 ? (
                              <span className="inline-flex flex-wrap gap-1">
                                {unidadesVinc.map((und) => (
                                  <Badge
                                    key={und.id}
                                    className="font-mono text-[10px] font-normal inline-flex items-center gap-1 bg-[#F1F4F8] text-[#12314F] border-[#D5DCE5] rounded-[6px]"
                                  >
                                    <Building className="h-3 w-3 text-[#5C6B7A]" />
                                    {formatarUnidadeComBloco(und, rotuloUnidade, ' (—)')}
                                  </Badge>
                                ))}
                              </span>
                            ) : (
                              <span className="text-[#5C6B7A] italic">Sem unidade</span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <Badge
                              className={`text-[10px] uppercase font-bold tracking-wider shrink-0 text-center leading-normal border rounded-[6px] ${
                                u.role === 'admin'
                                  ? 'bg-[#12314F] text-[#FFFFFF] border-[#12314F]'
                                  : u.role === 'mesa'
                                    ? 'bg-[#1F6B94]/15 text-[#12314F] border-[#1F6B94]/30'
                                    : 'bg-[#F1F4F8] text-[#12314F] border-[#D5DCE5]'
                              }`}
                            >
                              {u.role === 'admin'
                                ? 'Admin'
                                : u.role === 'mesa'
                                  ? 'Mesa'
                                  : 'Morador'}
                            </Badge>
                          </td>

                          <td className="py-3 px-4">
                            <button
                              type="button"
                              onClick={() => handleAlternarStatusAtivo(u)}
                              disabled={isSelf && isAtivo}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors border ${
                                isAtivo
                                  ? 'bg-[#2A6E3F]/10 text-[#2A6E3F] border-[#2A6E3F]/30 hover:bg-[#2A6E3F]/20'
                                  : 'bg-[#C75B39]/10 text-[#C75B39] border-[#C75B39]/30 hover:bg-[#C75B39]/20'
                              } ${isSelf && isAtivo ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                              title={
                                isSelf && isAtivo
                                  ? 'Não é permitido desativar sua própria conta'
                                  : 'Alternar status de acesso'
                              }
                            >
                              {isAtivo ? (
                                <>
                                  <CheckCircle2 className="h-3 w-3 text-[#2A6E3F]" /> Ativo
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-3 w-3 text-[#C75B39]" /> Inativo
                                </>
                              )}
                            </button>
                          </td>

                          <td className="py-3 px-4 text-[#5C6B7A] text-[11px]">
                            {formatarData(u.created)}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7 px-2.5 border-[#D5DCE5] hover:bg-[#F1F4F8] rounded-[8px]"
                                onClick={() => abrirEditarUsuario(u)}
                              >
                                Editar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7 px-2 border-[#D5DCE5] text-[#5C6B7A] hover:text-[#12314F] hover:bg-[#F1F4F8] rounded-[8px]"
                                title="Visualizar histórico e logs de acesso"
                                onClick={() => abrirLogsAcesso(u)}
                              >
                                <History className="h-3.5 w-3.5 mr-1 text-[#1F6B94]" /> Logs
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs h-7 px-2 text-[#5C6B7A] hover:text-[#12314F] hover:bg-[#F1F4F8] rounded-[8px]"
                                title="Enviar redefinição de senha por e-mail"
                                onClick={() => {
                                  setUsuarioReset(u)
                                  setModalResetAberto(true)
                                }}
                              >
                                <KeyRound className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* VISÃO MOBILE: Cartões Empilhados */}
              <div className="md:hidden divide-y divide-[#D5DCE5]/70">
                {usuariosPaginados.map((u) => {
                  const unidadesVinc = unidadesDeUsuario(u)
                    .map((idU) => unidades.find((item) => item.id === idU))
                    .filter((und): und is UnidadeRecord => !!und)
                  const isAtivo = u.ativo !== false
                  const isSelf = currentUser?.id === u.id

                  return (
                    <div key={u.id} className="p-4 space-y-3 bg-white">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-[#12314F] text-sm">
                              {u.name || 'Sem nome'}
                            </span>
                            {isSelf && (
                              <span className="text-[10px] font-normal text-[#1F6B94] bg-[#1F6B94]/15 px-1.5 py-0.2 rounded">
                                você
                              </span>
                            )}
                          </div>
                          <p className="font-mono text-[11px] text-[#5C6B7A] mt-0.5">{u.email}</p>
                        </div>

                        <Badge
                          className={`text-[9px] uppercase font-bold tracking-wider shrink-0 border rounded-[6px] ${
                            u.role === 'admin'
                              ? 'bg-[#12314F] text-white border-[#12314F]'
                              : u.role === 'mesa'
                                ? 'bg-[#1F6B94]/15 text-[#12314F] border-[#1F6B94]/30'
                                : 'bg-[#F1F4F8] text-[#12314F] border-[#D5DCE5]'
                          }`}
                        >
                          {u.role === 'admin' ? 'Admin' : u.role === 'mesa' ? 'Mesa' : 'Morador'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-[#5C6B7A] pt-1">
                        <div>
                          <span className="block text-[10px] uppercase font-semibold text-[#5C6B7A]/80">
                            CPF:
                          </span>
                          <span className="font-mono text-[#12314F]">
                            {u.cpf ? mascararCpf(u.cpf) : 'Não informado'}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase font-semibold text-[#5C6B7A]/80">
                            Unidades:
                          </span>
                          {unidadesVinc.length > 0 ? (
                            <span className="inline-flex flex-wrap gap-1 mt-0.5">
                              {unidadesVinc.map((und) => (
                                <Badge
                                  key={und.id}
                                  className="font-mono text-[9px] font-normal bg-[#F1F4F8] text-[#12314F] border-[#D5DCE5] rounded-[6px]"
                                >
                                  {formatarUnidadeComBloco(und, rotuloUnidade, ' (—)')}
                                </Badge>
                              ))}
                            </span>
                          ) : (
                            <span className="text-[#12314F] italic">Sem vínculo</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-[#D5DCE5]/50">
                        <button
                          type="button"
                          onClick={() => handleAlternarStatusAtivo(u)}
                          disabled={isSelf && isAtivo}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors border ${
                            isAtivo
                              ? 'bg-[#4E8B7E]/10 text-[#4E8B7E] border-[#4E8B7E]/30'
                              : 'bg-[#C75B39]/10 text-[#C75B39] border-[#C75B39]/30'
                          }`}
                        >
                          {isAtivo ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 text-[#4E8B7E]" /> Ativo
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3 text-[#C75B39]" /> Inativo
                            </>
                          )}
                        </button>

                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 px-2.5 border-[#D5DCE5] rounded-[8px]"
                            onClick={() => abrirEditarUsuario(u)}
                          >
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 px-2 border-[#D5DCE5] text-[#5C6B7A] rounded-[8px]"
                            onClick={() => abrirLogsAcesso(u)}
                          >
                            <History className="h-3.5 w-3.5 mr-1 text-[#1F6B94]" /> Logs
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs h-7 px-2 text-[#5C6B7A]"
                            onClick={() => {
                              setUsuarioReset(u)
                              setModalResetAberto(true)
                            }}
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* Paginação */}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-[#D5DCE5] bg-white">
              <p className="text-xs text-[#5C6B7A]">
                Mostrando{' '}
                <strong className="text-[#12314F]">
                  {(paginaAtual - 1) * ITENS_POR_PAGINA + 1}
                </strong>{' '}
                a{' '}
                <strong className="text-[#12314F]">
                  {Math.min(paginaAtual * ITENS_POR_PAGINA, usuariosFiltrados.length)}
                </strong>{' '}
                de <strong className="text-[#12314F]">{usuariosFiltrados.length}</strong> usuários
              </p>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={paginaAtual <= 1}
                  onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                  className="h-8 w-8 p-0 border-[#D5DCE5] rounded-[8px]"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs font-medium px-2 text-[#12314F]">
                  {paginaAtual} / {totalPaginas}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={paginaAtual >= totalPaginas}
                  onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))}
                  className="h-8 w-8 p-0 border-[#D5DCE5] rounded-[8px]"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {/* MODAL 1: Criar Usuário */}
      <Dialog open={modalNovoAberto} onOpenChange={setModalNovoAberto}>
        <DialogContent className="max-w-md bg-white border-[#D5DCE5] rounded-[12px] text-[#12314F]">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-[#12314F] flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-[#1F6B94]" /> Criar usuário
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5C6B7A]">
              Cadastre um novo condômino ou membro da mesa. Um convite de primeiro acesso pode ser
              enviado automaticamente.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCriarUsuario} className="space-y-3.5 py-1 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-[#12314F]">Nome Completo</Label>
              <Input
                required
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                placeholder="Ex: Carlos Alberto Souza"
                className="text-xs h-9 border-[#D5DCE5] bg-white rounded-[10px]"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium text-[#12314F]">E-mail</Label>
              <Input
                type="email"
                required
                value={novoEmail}
                onChange={(e) => setNovoEmail(e.target.value)}
                placeholder="usuario@lagoazul.com.br"
                className="text-xs h-9 border-[#D5DCE5] bg-white rounded-[10px]"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-[#12314F]">
                  Senha Inicial (Opcional)
                </Label>
                <span className="text-[10px] text-[#5C6B7A]">Mínimo 8 caracteres</span>
              </div>
              <div className="relative">
                <Input
                  type={mostrarNovoSenha ? 'text' : 'password'}
                  value={novoSenha}
                  onChange={(e) => setNovoSenha(e.target.value)}
                  placeholder="Deixe em branco para gerar senha temporária segura"
                  className="pr-10 text-xs h-9 border-[#D5DCE5] bg-white rounded-[10px]"
                />
                <button
                  type="button"
                  onClick={() => setMostrarNovoSenha(!mostrarNovoSenha)}
                  className="absolute right-2.5 top-2 text-[#5C6B7A] hover:text-[#12314F] p-0.5 rounded transition-colors"
                  title={mostrarNovoSenha ? 'Ocultar senha' : 'Ver senha'}
                  tabIndex={-1}
                >
                  {mostrarNovoSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[10px] text-[#5C6B7A]">
                Se deixada em branco, uma senha forte aleatória será gerada e enviada via convite.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-[#12314F]">CPF</Label>
                <Input
                  value={novoCpf}
                  onChange={(e) => {
                    setNovoCpf(formatarCpf(e.target.value))
                    setNovoCpfErro(null)
                  }}
                  placeholder="000.000.000-00"
                  className={`text-xs h-9 font-mono border-[#D5DCE5] bg-white rounded-[10px] ${
                    novoCpfErro ? 'border-[#C75B39]' : ''
                  }`}
                />
                {novoCpfErro && (
                  <p className="text-[10px] text-[#C75B39] font-medium">{novoCpfErro}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium text-[#12314F]">Perfil de Acesso</Label>
                <Select value={novoRole} onValueChange={(val: UserRole) => setNovoRole(val)}>
                  <SelectTrigger className="text-xs h-9 border-[#D5DCE5] bg-white rounded-[10px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#D5DCE5] text-[#12314F]">
                    <SelectItem value="morador">Morador (Votante)</SelectItem>
                    <SelectItem value="mesa">Mesa Diretora</SelectItem>
                    <SelectItem value="admin">Administrador Geral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-[#12314F]">Unidades Vinculadas</Label>
                {novoUnidadesIds.length > 0 && (
                  <span className="text-[10px] text-[#5C6B7A]">
                    {novoUnidadesIds.length} selecionada{novoUnidadesIds.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <Select
                value="__multi__"
                onValueChange={(val) => {
                  if (!val || val === '__multi__') return
                  setNovoUnidadesIds((prev) =>
                    prev.includes(val) ? prev.filter((id) => id !== val) : [...prev, val],
                  )
                }}
              >
                <SelectTrigger className="text-xs h-9 border-[#D5DCE5] bg-white rounded-[10px]">
                  <SelectValue
                    placeholder={
                      novoUnidadesIds.length === 0
                        ? 'Nenhuma unidade (operador avulso)'
                        : `${novoUnidadesIds.length} unidade${novoUnidadesIds.length > 1 ? 's' : ''} vinculada${novoUnidadesIds.length > 1 ? 's' : ''}`
                    }
                  />
                </SelectTrigger>
                <SelectContent className="max-h-56 bg-white border-[#D5DCE5] text-[#12314F]">
                  {unidades.map((u) => {
                    const marcada = novoUnidadesIds.includes(u.id)
                    return (
                      <SelectItem key={u.id} value={u.id}>
                        <span className="inline-flex items-center gap-1.5">
                          {marcada && <Check className="h-3 w-3 text-[#1F6B94]" />}
                          {formatarUnidadeComBloco(u, rotuloUnidade, ' (—)')}
                        </span>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              {novoUnidadesIds.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {novoUnidadesIds.map((idU) => {
                    const und = unidades.find((item) => item.id === idU)
                    if (!und) return null
                    return (
                      <Badge
                        key={idU}
                        className="font-mono text-[10px] font-normal inline-flex items-center gap-1 bg-[#1F6B94]/10 text-[#12314F] border-[#1F6B94]/30 rounded-[6px]"
                      >
                        {formatarUnidadeComBloco(und, rotuloUnidade, ' (—)')}
                        <button
                          type="button"
                          onClick={() =>
                            setNovoUnidadesIds((prev) => prev.filter((id) => id !== idU))
                          }
                          className="hover:text-[#C75B39]"
                          title="Remover unidade"
                        >
                          <XCircle className="h-3 w-3" />
                        </button>
                      </Badge>
                    )
                  })}
                </div>
              )}
              <p className="text-[10px] text-[#5C6B7A]">
                Um condômino pode responder por mais de uma unidade (ex.: proprietário de duas
                frações). Selecione todas as unidades que ele representa.
              </p>
            </div>

            {/* Configurações de convite e ativação */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between p-2.5 rounded-[10px] border border-[#D5DCE5] bg-[#F1F4F8]/40">
                <div>
                  <p className="font-semibold text-[#12314F] text-xs">Enviar convite por e-mail</p>
                  <p className="text-[10px] text-[#5C6B7A]">
                    O usuário receberá link para definir sua própria senha de acesso.
                  </p>
                </div>
                <Switch checked={novoEnviarConvite} onCheckedChange={setNovoEnviarConvite} />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-[10px] border border-[#D5DCE5] bg-[#F1F4F8]/40">
                <div>
                  <p className="font-semibold text-[#12314F] text-xs">Usuário Ativo</p>
                  <p className="text-[10px] text-[#5C6B7A]">
                    Se inativo, o usuário fica impedido de autenticar na assembleia.
                  </p>
                </div>
                <Switch checked={novoAtivo} onCheckedChange={setNovoAtivo} />
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-[#D5DCE5]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalNovoAberto(false)}
                className="border-[#D5DCE5] rounded-[10px]"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={salvandoNovo}
                size="sm"
                className="bg-[#1F6B94] hover:bg-[#185577] text-white font-semibold rounded-[10px] shadow-none border-0"
              >
                {salvandoNovo ? 'Salvando...' : 'Criar usuário'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Editar Usuário */}
      <Dialog open={modalEditarAberto} onOpenChange={setModalEditarAberto}>
        <DialogContent className="max-w-md bg-white border-[#D5DCE5] rounded-[12px] text-[#12314F]">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-[#12314F]">
              Editar Usuário
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5C6B7A]">
              Atualize os dados cadastrais, unidades vinculadas ou perfil de autoridade.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditarUsuario} className="space-y-3.5 py-1 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-[#12314F]">Nome Completo</Label>
              <Input
                required
                value={editNome}
                onChange={(e) => setEditNome(e.target.value)}
                className="text-xs h-9 border-[#D5DCE5] bg-white rounded-[10px]"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium text-[#12314F]">E-mail (fixo)</Label>
              <Input
                disabled
                value={usuarioEditando?.email || ''}
                className="text-xs h-9 border-[#D5DCE5] bg-[#F1F4F8]/50 text-[#5C6B7A] rounded-[10px] cursor-not-allowed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-[#12314F]">CPF</Label>
                <Input
                  value={editCpf}
                  onChange={(e) => {
                    setEditCpf(formatarCpf(e.target.value))
                    setEditCpfErro(null)
                  }}
                  placeholder="000.000.000-00"
                  className={`text-xs h-9 font-mono border-[#D5DCE5] bg-white rounded-[10px] ${
                    editCpfErro ? 'border-[#C75B39]' : ''
                  }`}
                />
                {editCpfErro && (
                  <p className="text-[10px] text-[#C75B39] font-medium">{editCpfErro}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium text-[#12314F]">Perfil</Label>
                <Select value={editRole} onValueChange={(val: UserRole) => setEditRole(val)}>
                  <SelectTrigger className="text-xs h-9 border-[#D5DCE5] bg-white rounded-[10px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#D5DCE5] text-[#12314F]">
                    <SelectItem value="morador">Morador (Votante)</SelectItem>
                    <SelectItem value="mesa">Mesa Diretora</SelectItem>
                    <SelectItem value="admin">Administrador Geral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-[#12314F]">Unidades Vinculadas</Label>
                {editUnidadesIds.length > 0 && (
                  <span className="text-[10px] text-[#5C6B7A]">
                    {editUnidadesIds.length} selecionada{editUnidadesIds.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <Select
                value="__multi__"
                onValueChange={(val) => {
                  if (!val || val === '__multi__') return
                  setEditUnidadesIds((prev) =>
                    prev.includes(val) ? prev.filter((id) => id !== val) : [...prev, val],
                  )
                }}
              >
                <SelectTrigger className="text-xs h-9 border-[#D5DCE5] bg-white rounded-[10px]">
                  <SelectValue
                    placeholder={
                      editUnidadesIds.length === 0
                        ? 'Nenhuma unidade (operador avulso)'
                        : `${editUnidadesIds.length} unidade${editUnidadesIds.length > 1 ? 's' : ''} vinculada${editUnidadesIds.length > 1 ? 's' : ''}`
                    }
                  />
                </SelectTrigger>
                <SelectContent className="max-h-56 bg-white border-[#D5DCE5] text-[#12314F]">
                  {unidades.map((u) => {
                    const marcada = editUnidadesIds.includes(u.id)
                    return (
                      <SelectItem key={u.id} value={u.id}>
                        <span className="inline-flex items-center gap-1.5">
                          {marcada && <Check className="h-3 w-3 text-[#1F6B94]" />}
                          {formatarUnidadeComBloco(u, rotuloUnidade, ' (—)')}
                        </span>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              {editUnidadesIds.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {editUnidadesIds.map((idU) => {
                    const und = unidades.find((item) => item.id === idU)
                    if (!und) return null
                    return (
                      <Badge
                        key={idU}
                        className="font-mono text-[10px] font-normal inline-flex items-center gap-1 bg-[#1F6B94]/10 text-[#12314F] border-[#1F6B94]/30 rounded-[6px]"
                      >
                        {formatarUnidadeComBloco(und, rotuloUnidade, ' (—)')}
                        <button
                          type="button"
                          onClick={() =>
                            setEditUnidadesIds((prev) => prev.filter((id) => id !== idU))
                          }
                          className="hover:text-[#C75B39]"
                          title="Remover unidade"
                        >
                          <XCircle className="h-3 w-3" />
                        </button>
                      </Badge>
                    )
                  })}
                </div>
              )}
              <p className="text-[10px] text-[#5C6B7A]">
                Um condômino pode responder por mais de uma unidade. Selecione todas as unidades que
                ele representa.
              </p>
            </div>

            {/* Ativação */}
            <div className="flex items-center justify-between p-2.5 rounded-[10px] border border-[#D5DCE5] bg-[#F1F4F8]/40">
              <div>
                <p className="font-semibold text-[#12314F] text-xs">Usuário Ativo</p>
                <p className="text-[10px] text-[#5C6B7A]">
                  Desative para bloquear imediatamente o acesso à assembleia.
                </p>
              </div>
              <Switch checked={editAtivo} onCheckedChange={setEditAtivo} />
            </div>

            <DialogFooter className="pt-3 border-t border-[#D5DCE5]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalEditarAberto(false)}
                className="border-[#D5DCE5] rounded-[10px]"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={salvandoEdit}
                size="sm"
                className="bg-[#1F6B94] hover:bg-[#185577] text-white font-semibold rounded-[10px] shadow-none border-0"
              >
                {salvandoEdit ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: Redefinir Senha */}
      <Dialog open={modalResetAberto} onOpenChange={setModalResetAberto}>
        <DialogContent className="max-w-md bg-white border-[#D5DCE5] rounded-[12px] text-[#12314F]">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-[#12314F] flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-[#1F6B94]" /> Redefinir senha de acesso
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5C6B7A]">
              Será enviado um e-mail com instruções e link seguro para que o usuário redefina sua
              própria senha.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-3">
            <div className="p-3 rounded-[10px] border border-[#D5DCE5] bg-[#F1F4F8]/50 space-y-1">
              <p className="text-xs font-semibold text-[#12314F]">
                {usuarioReset?.name || 'Sem nome'}
              </p>
              <p className="text-xs font-mono text-[#5C6B7A]">{usuarioReset?.email}</p>
            </div>
            <p className="text-xs text-[#5C6B7A]">
              Por motivos de sigilo e integridade criptográfica, novas senhas nunca são exibidas ou
              armazenadas em texto puro pelos operadores.
            </p>
          </div>

          <DialogFooter className="pt-2 border-t border-[#D5DCE5]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalResetAberto(false)}
              className="border-[#D5DCE5] rounded-[10px]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={enviandoReset}
              size="sm"
              onClick={handleDispararResetSenha}
              className="bg-[#1F6B94] hover:bg-[#185577] text-white font-semibold rounded-[10px] shadow-none border-0"
            >
              {enviandoReset ? 'Enviando...' : 'Enviar redefinição'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: Logs de Acesso por Usuário */}
      <Dialog open={modalLogsAberto} onOpenChange={setModalLogsAberto}>
        <DialogContent className="max-w-2xl bg-white border-[#D5DCE5] rounded-[12px] text-[#12314F]">
          <DialogHeader className="border-b border-[#D5DCE5] pb-3">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-semibold text-[#12314F] flex items-center gap-2">
                <History className="h-4 w-4 text-[#1F6B94]" /> Histórico de Logs de Acesso
              </DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={recarregarLogs}
                disabled={carregandoLogs}
                className="h-7 px-2 text-xs text-[#5C6B7A] hover:text-[#12314F]"
                title="Atualizar lista de logs"
              >
                <RotateCw className={`h-3.5 w-3.5 mr-1 ${carregandoLogs ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
            <DialogDescription className="text-xs text-[#5C6B7A]">
              Registro cronológico de autenticações e tentativas de acesso de{' '}
              <strong className="text-[#12314F]">
                {usuarioLogs?.name || usuarioLogs?.email}
              </strong>{' '}
              ({usuarioLogs?.email}).
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            {carregandoLogs ? (
              <div className="py-12 flex flex-col items-center justify-center text-[#5C6B7A] gap-2">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1F6B94] border-t-transparent" />
                <p className="text-xs">Carregando eventos de autenticação...</p>
              </div>
            ) : logsAcesso.length === 0 ? (
              <div className="py-10 text-center text-[#5C6B7A] space-y-1">
                <Clock className="h-8 w-8 mx-auto text-[#5C6B7A]/40 mb-1" />
                <p className="text-sm font-medium text-[#12314F]">Nenhum acesso registrado ainda</p>
                <p className="text-xs">
                  Eventos de login deste usuário serão registrados automaticamente nesta trilha
                  operacional.
                </p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto border border-[#D5DCE5] rounded-[10px]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F1F4F8] border-b border-[#D5DCE5] text-[#5C6B7A] font-semibold uppercase text-[10px] tracking-wider sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Data e Hora</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Método</th>
                      <th className="py-2.5 px-3">IP / Origem</th>
                      <th className="py-2.5 px-3">Detalhes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D5DCE5]/60">
                    {logsAcesso.map((log) => {
                      const isSucesso = log.status === 'sucesso'
                      return (
                        <tr key={log.id} className="hover:bg-[#F1F4F8]/40 transition-colors">
                          <td className="py-2 px-3 font-mono text-[11px] text-[#12314F] whitespace-nowrap">
                            {formatarDataHoraCompleta(log.data_hora || log.created)}
                          </td>
                          <td className="py-2 px-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                isSucesso
                                  ? 'bg-[#4E8B7E]/10 text-[#4E8B7E] border-[#4E8B7E]/30'
                                  : 'bg-[#C75B39]/10 text-[#C75B39] border-[#C75B39]/30'
                              }`}
                            >
                              {isSucesso ? (
                                <>
                                  <CheckCircle2 className="h-3 w-3" /> Sucesso
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-3 w-3" /> Falha
                                </>
                              )}
                            </span>
                          </td>
                          <td className="py-2 px-3 uppercase text-[10px] font-mono text-[#5C6B7A]">
                            {log.metodo || 'senha'}
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px] text-[#5C6B7A]">
                            {log.ip || '—'}
                          </td>
                          <td
                            className="py-2 px-3 text-[11px] text-[#5C6B7A] max-w-[200px] truncate"
                            title={log.motivo_falha || log.user_agent || ''}
                          >
                            {log.motivo_falha ? (
                              <span className="text-[#C75B39]">{log.motivo_falha}</span>
                            ) : log.user_agent ? (
                              <span className="truncate block font-mono text-[10px] text-[#5C6B7A]/80">
                                {log.user_agent}
                              </span>
                            ) : (
                              'Autenticação efetuada'
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

          <DialogFooter className="pt-2 border-t border-[#D5DCE5]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalLogsAberto(false)}
              className="border-[#D5DCE5] rounded-[10px]"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default GestaoUsuariosPage
