import React, { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams, useParams, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { IndabaLogo } from '@/components/brand/IndabaLogo'
import { IndabaSymbol } from '@/components/brand/IndabaSymbol'
import { CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react'

export const VerificarEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const routeParams = useParams<{ token?: string }>()
  const location = useLocation()
  const { confirmarEmailComToken } = useAuth()

  const token = useMemo(() => {
    if (searchParams.get('token')) return searchParams.get('token')!.trim()
    if (searchParams.get('t')) return searchParams.get('t')!.trim()
    if (routeParams.token) return routeParams.token.trim()

    if (typeof window !== 'undefined' && window.location.hash) {
      const hashQuery = window.location.hash.split('?')[1]
      if (hashQuery) {
        const parsed = new URLSearchParams(hashQuery)
        if (parsed.get('token')) return parsed.get('token')!.trim()
      }
      const matchHashToken = window.location.hash.match(
        /(?:confirm-verification|verify-email|verificar-email)\/([a-zA-Z0-9._-]+)/,
      )
      if (matchHashToken && matchHashToken[1]) return matchHashToken[1].trim()
    }

    const pathSegments = location.pathname.split('/').filter(Boolean)
    if (pathSegments.length >= 2) {
      const lastSeg = pathSegments[pathSegments.length - 1]
      if (lastSeg && lastSeg.length > 20 && !lastSeg.includes('=')) {
        return lastSeg.trim()
      }
    }

    return ''
  }, [searchParams, routeParams, location.pathname])

  const [status, setStatus] = useState<'verificando' | 'sucesso' | 'erro'>('verificando')
  const [mensagemErro, setMensagemErro] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('erro')
      setMensagemErro('Token de verificação não informado.')
      return
    }

    let isMounted = true
    confirmarEmailComToken(token)
      .then(() => {
        if (isMounted) setStatus('sucesso')
      })
      .catch((err: any) => {
        if (isMounted) {
          setStatus('erro')
          setMensagemErro(getErrorMessage(err, 'Link inválido ou já utilizado.'))
        }
      })

    return () => {
      isMounted = false
    }
  }, [token])

  return (
    <div className="flex min-h-screen flex-col bg-[#F4EFE7] text-[#1E1B18]">
      <header className="border-b border-[#E8E1D6] bg-[#FFFDFA] px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <IndabaLogo size={30} variant="color" />
          <Link to="/login" className="text-xs font-semibold text-[#E39A2B] hover:underline">
            Ir para o Login
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center p-4 sm:p-6">
        <Card className="w-full max-w-md border border-[#E8E1D6] bg-[#FFFDFA] shadow-[0_4px_24px_rgba(30,27,24,0.06)] rounded-[12px]">
          <CardHeader className="text-center pb-2 pt-6">
            <div className="mx-auto mb-3 flex items-center justify-center">
              <IndabaSymbol size={44} variant="color" />
            </div>
            <CardTitle className="text-2xl font-semibold tracking-[-0.02em] text-[#1E1B18]">
              Confirmação de E-mail
            </CardTitle>
            <CardDescription className="text-xs text-[#6B6259]">
              Plataforma Indaba — Verificação cadastral
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4 space-y-4">
            {status === 'verificando' && (
              <div className="flex flex-col items-center py-6 text-center space-y-3">
                <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#E39A2B] border-t-transparent" />
                <p className="text-xs font-medium text-[#6B6259]">
                  Validando autenticidade do link...
                </p>
              </div>
            )}

            {status === 'sucesso' && (
              <Alert className="border border-[#E39A2B]/40 bg-[#E39A2B]/10 text-[#1E1B18] rounded-[10px]">
                <CheckCircle2 className="h-5 w-5 text-[#E39A2B]" />
                <AlertTitle className="font-semibold text-[#1E1B18]">
                  E-mail verificado com sucesso
                </AlertTitle>
                <AlertDescription className="text-xs text-[#1E1B18] mt-1">
                  Sua conta está confirmada e habilitada para credenciamento e votação na
                  plataforma.
                </AlertDescription>
              </Alert>
            )}

            {status === 'erro' && (
              <Alert
                variant="destructive"
                className="border border-[#C75B39]/30 bg-[#C75B39]/10 text-[#1E1B18] rounded-[10px]"
              >
                <AlertTriangle className="h-4 w-4 text-[#C75B39]" />
                <AlertTitle className="font-semibold text-[#C75B39]">
                  Falha na verificação
                </AlertTitle>
                <AlertDescription className="text-xs text-[#1E1B18] mt-1">
                  {mensagemErro || 'Não foi possível validar este token de e-mail.'}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>

          <CardFooter className="flex justify-center border-t border-[#E8E1D6] pt-4">
            <Link to="/login" className="w-full">
              <Button className="w-full h-10 bg-[#E39A2B] text-[#1E1B18] font-semibold hover:bg-[#d48c20] rounded-[10px] shadow-none border-0">
                Ir para o Login <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </main>

      <footer className="border-t border-[#E8E1D6] bg-[#1E1B18] py-4 px-6 text-white text-xs">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <IndabaLogo size={22} variant="negative" />
          <p className="text-[#E8E1D6]/70 text-[11px]">Segurança e integridade Indaba</p>
        </div>
      </footer>
    </div>
  )
}
export default VerificarEmailPage
