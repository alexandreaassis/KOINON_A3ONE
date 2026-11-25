import React, { createContext, useContext, useEffect, useState, useMemo } from 'react'
import type { RecordModel } from 'pocketbase'
import pb from '@/lib/pocketbase/client'
import type { UserRecord, UnidadeRecord } from '@/lib/api'
import { api } from '@/lib/api'

import type { UserRole } from '@/lib/api'

interface AuthContextType {
  user: UserRecord | null
  role: UserRole | null
  isAdmin: boolean
  isMesaOuAdmin: boolean
  unidadeSelecionada: UnidadeRecord | null
  unidadesDisponiveis: UnidadeRecord[]
  sessaoAtivaId: string | null
  isLoading: boolean
  isOnline: boolean
  login: (email: string, pass: string) => Promise<{ user: UserRecord; role: UserRole }>
  logout: () => void
  selecionarUnidade: (unidade: UnidadeRecord) => void
  solicitarRedefinicaoSenha: (email: string) => Promise<boolean>
  redefinirSenhaComToken: (token: string, novaSenha: string) => Promise<boolean>
  confirmarEmailComToken: (token: string) => Promise<boolean>
  recadastrarSessaoUnica: (unidadeId: string, deliberacaoId: string) => Promise<string | null>
  /** Recarrega o registro do usuário autenticado do servidor (ex.: pós troca de senha obrigatória) */
  atualizarUsuarioLocal: () => Promise<void>
  /** Conta provisionada aguarda troca obrigatória de senha (users.deve_trocar_senha) */
  deveTrocarSenha: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const UNIDADE_STORAGE_KEY = 'lagoazul_unidade_selecionada'

/**
 * Carrega TODAS as unidades às quais o usuário responde:
 * campo multi-relação users.unidades (novo) unificado com o legado users.unidade.
 * Sem vínculo real (morador OU gestor mesa/admin), nenhuma unidade é atribuída:
 * não há unidade fantasma — as páginas exibem o aviso de conta sem unidade vinculada.
 */
const carregarUnidadesDoUsuario = async (authUser: UserRecord): Promise<UnidadeRecord[]> => {
  const ids = new Set<string>()

  const unidsRel = Array.isArray((authUser as any).unidades) ? (authUser as any).unidades : []
  for (const id of unidsRel) {
    if (id && id !== 'none') ids.add(String(id))
  }
  const legado = authUser.unidade
  if (legado && legado !== 'none') ids.add(String(legado))

  // Sem vínculos (ou vínculos irrecuperáveis): nenhuma unidade ativa automática
  if (ids.size === 0) return []

  const lista = await Promise.all(Array.from(ids).map((id) => api.getUnidade(id).catch(() => null)))
  return lista.filter((u): u is UnidadeRecord => !!u)
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserRecord | null>(() => {
    return (pb.authStore.record as unknown as UserRecord) || null
  })
  const [unidadesDisponiveis, setUnidadesDisponiveis] = useState<UnidadeRecord[]>([])
  const [unidadeSelecionada, setUnidadeSelecionada] = useState<UnidadeRecord | null>(null)
  const [sessaoAtivaId, setSessaoAtivaId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine)

  // Monitoramento de conectividade (rede do navegador e eventos de rede do PocketBase)
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    const handleNetworkStatus = (e: Event) => {
      const custom = e as CustomEvent<{ online: boolean }>
      if (typeof custom?.detail?.online === 'boolean') {
        setIsOnline(custom.detail.online)
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('koinon:network-status', handleNetworkStatus)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('koinon:network-status', handleNetworkStatus)
    }
  }, [])

  // Sincroniza usuário e recarrega unidades se autenticado
  const carregarDadosIniciais = async () => {
    if (pb.authStore.isValid && pb.authStore.record) {
      const authUser = pb.authStore.record as unknown as UserRecord
      setUser(authUser)

      try {
        const unidades = await carregarUnidadesDoUsuario(authUser)
        setUnidadesDisponiveis(unidades)

        if (unidades.length > 0) {
          // Restaurar unidade selecionada se houver no localStorage; senão, a primeira vinculada
          const storedUnidadeId = localStorage.getItem(UNIDADE_STORAGE_KEY)
          const encontrada = storedUnidadeId
            ? unidades.find((u) => u.id === storedUnidadeId)
            : undefined
          const padrao = encontrada || unidades[0]
          setUnidadeSelecionada(padrao)
          localStorage.setItem(UNIDADE_STORAGE_KEY, padrao.id)
        } else {
          // Sem unidade vinculada: nenhuma unidade ativa padrão
          setUnidadeSelecionada(null)
        }
      } catch (err) {
        console.error('Erro ao carregar unidades:', err)
      }
    } else {
      setUser(null)
      setUnidadeSelecionada(null)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    carregarDadosIniciais()

    const unsubscribe = pb.authStore.onChange((token, model) => {
      setUser((model as unknown as UserRecord) || null)
      if (!model) {
        setUnidadeSelecionada(null)
        setSessaoAtivaId(null)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const selecionarUnidade = (unidade: UnidadeRecord) => {
    setUnidadeSelecionada(unidade)
    localStorage.setItem(UNIDADE_STORAGE_KEY, unidade.id)
  }

  /**
   * Sessão única por unidade:
   * Ao registrar uma sessão para a unidade, busca sessões anteriores abertas
   * para a mesma unidade e revoga com revogada=true e revogada_sessao_id
   */
  const recadastrarSessaoUnica = async (
    unidadeId: string,
    deliberacaoId: string,
  ): Promise<string | null> => {
    if (!user) return null
    try {
      // 1. Buscar sessões ativas da mesma unidade
      const ativas = await pb.collection('sessoes').getList<any>(1, 10, {
        filter: pb.filter("unidade = {:unidade} && status = 'ativa'", { unidade: unidadeId }),
        sort: '-created',
      })

      let idSessaoAnteriorRevogada: string | undefined

      // 2. Criar a nova sessão
      const expira = new Date(Date.now() + 60 * 60 * 1000).toISOString()
      const novaSessao = await pb.collection('sessoes').create({
        user: user.id,
        unidade: unidadeId,
        deliberacao: deliberacaoId,
        status: 'ativa',
        expira_em: expira,
        tentativas_falhas: 0,
      })

      // 3. Revogar anteriores apontando para a nova ou marcando revogada
      for (const s of ativas.items) {
        if (s.id !== novaSessao.id) {
          idSessaoAnteriorRevogada = s.id
          await pb.collection('sessoes').update(s.id, {
            status: 'revogada',
            revogada_sessao_id: novaSessao.id,
          })
        }
      }

      setSessaoAtivaId(novaSessao.id)
      return novaSessao.id
    } catch (err) {
      console.warn('Registro de sessão única simplificado:', err)
      return null
    }
  }

  const login = async (email: string, pass: string) => {
    let authData
    try {
      authData = await pb.collection('users').authWithPassword<UserRecord>(email.trim(), pass)
    } catch (err: any) {
      // Registrar log de tentativa malsucedida no backend
      api.registrarLogFalhaAutenticacao(
        email.trim(),
        err?.message || 'Falha de autenticação / credenciais incorretas',
      )
      throw err
    }

    const authUser = authData.record

    // Validação adicional preventiva do lado do cliente: usuário inativo
    if (authUser.ativo === false) {
      pb.authStore.clear()
      setUser(null)
      throw new Error('Usuário inativo — contate a administração.')
    }

    setUser(authUser)

    // Carregar TODAS as unidades do usuário (multi-relação + legado)
    try {
      const unidades = await carregarUnidadesDoUsuario(authUser)
      setUnidadesDisponiveis(unidades)

      if (unidades.length > 0) {
        // Revalida a unidade persistida no localStorage contra as unidades reais do usuário
        const storedUnidadeId = localStorage.getItem(UNIDADE_STORAGE_KEY)
        const aindaValida = storedUnidadeId
          ? unidades.find((u) => u.id === storedUnidadeId)
          : undefined
        const atual = aindaValida || unidadeSelecionada
        const validaAtual = atual && unidades.some((u) => u.id === atual.id) ? atual : undefined
        const padrao = validaAtual || unidades[0]
        setUnidadeSelecionada(padrao)
        localStorage.setItem(UNIDADE_STORAGE_KEY, padrao.id)
      } else {
        // Sem unidade vinculada: nenhuma unidade ativa padrão
        setUnidadeSelecionada(null)
      }
    } catch {
      /* intentionally ignored */
    }

    return { user: authUser, role: authUser.role }
  }

  const logout = () => {
    pb.authStore.clear()
    setUser(null)
    setUnidadeSelecionada(null)
    setSessaoAtivaId(null)
    localStorage.removeItem(UNIDADE_STORAGE_KEY)
  }

  const solicitarRedefinicaoSenha = async (email: string): Promise<boolean> => {
    try {
      await pb.collection('users').requestPasswordReset(email.trim())
      return true
    } catch (err) {
      // Por segurança contra enumeração de e-mails, sempre retorna true
      return true
    }
  }

  const redefinirSenhaComToken = async (token: string, novaSenha: string): Promise<boolean> => {
    await pb.collection('users').confirmPasswordReset(token, novaSenha, novaSenha)
    return true
  }

  const confirmarEmailComToken = async (token: string): Promise<boolean> => {
    await pb.collection('users').confirmVerification(token)
    return true
  }

  // Recarrega o registro do usuário autenticado direto do servidor — usado após
  // a troca obrigatória de senha para refletir deve_trocar_senha=false sem relogin.
  const atualizarUsuarioLocal = async () => {
    if (!pb.authStore.isValid) return
    try {
      const rec = await pb.collection('users').getOne<UserRecord>(pb.authStore.record!.id)
      const mesclado = { ...(pb.authStore.record as unknown as UserRecord), ...rec } as UserRecord
      pb.authStore.save(pb.authStore.token, mesclado as unknown as RecordModel)
      setUser(mesclado)
    } catch (err) {
      console.warn('Falha ao atualizar usuário local:', err)
    }
  }

  const deveTrocarSenha = useMemo<boolean>(() => {
    return !!user && user.deve_trocar_senha === true
  }, [user])

  const role = useMemo<UserRole | null>(() => {
    if (!user) return null
    return user.role || 'morador'
  }, [user])

  const isAdmin = useMemo(() => {
    return role === 'admin'
  }, [role])

  const isMesaOuAdmin = useMemo(() => {
    return role === 'mesa' || role === 'admin'
  }, [role])

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAdmin,
        isMesaOuAdmin,
        unidadeSelecionada,
        unidadesDisponiveis,
        sessaoAtivaId,
        isLoading,
        isOnline,
        login,
        logout,
        selecionarUnidade,
        solicitarRedefinicaoSenha,
        redefinirSenhaComToken,
        confirmarEmailComToken,
        recadastrarSessaoUnica,
        atualizarUsuarioLocal,
        deveTrocarSenha,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider')
  }
  return context
}
