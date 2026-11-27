import { useCallback, useEffect, useState } from 'react'
import { toast } from '@/hooks/use-toast'
import { api, MeetConfigResponse } from '@/lib/api'

export interface MeetSalaEstado {
  /** Credenciais do Meet configuradas no servidor (service account cifrada) */
  credenciaisConfiguradas: boolean
  /** true enquanto o hook busca o status inicial */
  carregando: boolean
  /** true enquanto o hook está criando a sala */
  criando: boolean
  criarSala: (deliberacaoId: number) => Promise<{ meet_link: string } | null>
  recarregarStatus: () => void
}

/**
 * Hook central do Google Meet (Fase 1): expõe o status das credenciais e a
 * ação de criar a sala da assembleia ativa, com erros amigáveis via toast.
 */
export const useMeetSala = (): MeetSalaEstado => {
  const [credenciaisConfiguradas, setCredenciaisConfiguradas] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [criando, setCriando] = useState(false)

  useEffect(() => {
    let ativo = true
    api
      .obterMeetConfig()
      .then((resp: MeetConfigResponse) => {
        if (ativo) setCredenciaisConfiguradas(!!resp.configurado)
      })
      .catch(() => {
        if (ativo) setCredenciaisConfiguradas(false)
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })
    return () => {
      ativo = false
    }
  }, [])

  const criarSala = useCallback(
    async (deliberacaoId: number) => {
      if (criando) return null
      setCriando(true)
      try {
        const resp = await api.criarSalaMeet(deliberacaoId)
        return { meet_link: resp.meet_link || '' }
      } catch (err: any) {
        const mensagem = typeof err?.message === 'string' ? err.message : ''
        const amigavel = mensagem.includes('Configure as credenciais')
          ? 'Configure as credenciais do Google Meet em Administração antes de criar a sala.'
          : mensagem || 'Não foi possível criar a sala do Google Meet. Tente novamente.'
        toast({
          title: 'Falha ao criar a sala Meet',
          description: amigavel,
          variant: 'destructive',
        })
        return null
      } finally {
        setCriando(false)
      }
    },
    [criando],
  )

  const recarregarStatus = useCallback(() => {
    api
      .obterMeetConfig()
      .then((resp: MeetConfigResponse) => setCredenciaisConfiguradas(!!resp.configurado))
      .catch(() => setCredenciaisConfiguradas(false))
  }, [])

  return { credenciaisConfiguradas, carregando, criando, criarSala, recarregarStatus }
}
