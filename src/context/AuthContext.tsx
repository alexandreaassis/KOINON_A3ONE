import React, { createContext, useContext, useEffect, useState, useMemo } from 'react'
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const UNIDADE_STORAGE_KEY = 'lagoazul_unidade_selecionada'

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserRecord | null>(() => {
    return (pb.authStore.record as unknown as UserRecord) || null
  })
  const [unidadesDisponiveis, setUnidadesDisponiveis] = useState<UnidadeRecord[]>([])
  const [unidadeSelecionada, setUnidadeSelecionada] = useState<UnidadeRecord | null>(null)
  const [sessaoAtivaId, setSessaoAtivaId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine)

  // Monitoramento de conectividade
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Sincroniza usuário e recarrega unidades se autenticado
  const carregarDadosIniciais = async () => {
    if (pb.authStore.isValid && pb.authStore.record) {
      const authUser = pb.authStore.record as unknown as UserRecord
      setUser(authUser)

      try {
        const unidades = await api.getUnidades()
        setUnidadesDisponiveis(unidades)

        // Restaurar unidade selecionada se houver no localStorage
        const storedUnidadeId = localStorage.getItem(UNIDADE_STORAGE_KEY)
        if (storedUnidadeId) {
          const encontrada = unidades.find((u) => u.id === storedUnidadeId)
          if (encontrada) {
            setUnidadeSelecionada(encontrada)
          } else if (unidades.length > 0) {
            setUnidadeSelecionada(unidades[0])
          }
        } else if (unidades.length > 0) {
          // Padrão: 101A se for morador ou primeira da lista
          const padrao101 = unidades.find((u) => u.identificador === '101A') || unidades[0]
          setUnidadeSelecionada(padrao101)
          localStorage.setItem(UNIDADE_STORAGE_KEY, padrao101.id)
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
    const authData = await pb.collection('users').authWithPassword<UserRecord>(email.trim(), pass)
    const authUser = authData.record
    setUser(authUser)

    // Carregar unidades
    try {
      const unidades = await api.getUnidades()
      setUnidadesDisponiveis(unidades)
      if (unidades.length > 0 && !unidadeSelecionada) {
        const padrao = unidades.find((u) => u.identificador === '101A') || unidades[0]
        setUnidadeSelecionada(padrao)
        localStorage.setItem(UNIDADE_STORAGE_KEY, padrao.id)
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
