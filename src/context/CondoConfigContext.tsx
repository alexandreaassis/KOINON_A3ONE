import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import pb from '@/lib/pocketbase/client'
import { api, type CondoConfigRecord } from '@/lib/api'

interface CondoConfigContextType {
  config: CondoConfigRecord | null
  nomeCondominio: string
  logoUrl: string | null
  somVotoUrl: string | null
  rotuloUnidade: string
  tipoCondominio: string
  modelosMensagem: CondoConfigRecord | null
  isLoading: boolean
  recarregarConfig: () => Promise<void>
}

const CondoConfigContext = createContext<CondoConfigContextType | undefined>(undefined)

const DEFAULT_NOME = 'Condomínio Residencial Lago Azul'
const DEFAULT_ROTULO = 'Apartamento'

export const CondoConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<CondoConfigRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const carregar = useCallback(async () => {
    try {
      const cfg = await api.getConfiguracao()
      setConfig(cfg)
    } catch (err) {
      console.warn('Não foi possível carregar configurações do condomínio:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let unsubscribe: (() => void) | undefined

    const conectarRealtime = () => {
      pb.collection('configuracoes')
        .subscribe('*', (e) => {
          if (e.action === 'update' || e.action === 'create') {
            setConfig(e.record as unknown as CondoConfigRecord)
          }
        })
        .then((unsub) => {
          unsubscribe = unsub
        })
        .catch((err) => {
          console.warn('Realtime configuracoes indisponível:', err)
        })
    }

    const desconectarRealtime = () => {
      if (unsubscribe) {
        try {
          unsubscribe()
        } catch {
          /* já desconectado */
        }
        unsubscribe = undefined
      }
    }

    // O carregamento no boot acontece ANTES do login (a API rule da collection
    // exige @request.auth.id != '' e devolve lista vazia), o que deixava config
    // null por toda a sessão aberta sem reload — a página /admin/configuracoes
    // aparecia em branco. Recarrega também sempre que a sessão muda (login e
    // logout), e reconecta o realtime autenticado.
    carregar()
    const removerAuthListener = pb.authStore.onChange(() => {
      carregar()
      desconectarRealtime()
      conectarRealtime()
    })

    if (pb.authStore.isValid) conectarRealtime()

    return () => {
      removerAuthListener()
      desconectarRealtime()
    }
  }, [carregar])

  const nomeCondominio = config?.nome_condominio?.trim() || DEFAULT_NOME
  const rotuloUnidade = config?.rotulo_unidade?.trim() || DEFAULT_ROTULO
  const tipoCondominio = config?.tipo_condominio || 'vertical'
  const modelosMensagem = config ?? null

  const logoUrl = config && config.logo ? pb.files.getURL(config, config.logo) : null
  const somVotoUrl = config && config.som_voto ? pb.files.getURL(config, config.som_voto) : null

  return (
    <CondoConfigContext.Provider
      value={{
        config,
        nomeCondominio,
        logoUrl,
        somVotoUrl,
        rotuloUnidade,
        tipoCondominio,
        modelosMensagem,
        isLoading,
        recarregarConfig: carregar,
      }}
    >
      {children}
    </CondoConfigContext.Provider>
  )
}

export const useCondoConfig = () => {
  const context = useContext(CondoConfigContext)
  if (!context) {
    throw new Error('useCondoConfig deve ser utilizado dentro de um CondoConfigProvider')
  }
  return context
}
