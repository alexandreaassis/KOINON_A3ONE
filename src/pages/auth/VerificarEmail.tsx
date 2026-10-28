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
import { KoinonLogo } from '@/components/brand/KoinonLogo'
import { KoinonSymbol } from '@/components/brand/KoinonSymbol'
import { CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react'
import { EndossoA3One } from '@/components/brand/EndossoA3One'

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
    <div className="flex min-h-screen flex-col bg-[#F3F7FC] text-[#002B5E]">
      <header className="border-b border-[#5A6B82]/20 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <KoinonLogo size={50} variant="color" />
          <Link to="/login" className="text-xs font-semibold text-[#0066FF] hover:underline">
            Ir para o Login
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md flex flex-col items-center gap-4">
          <Card className="w-full border border-[#5A6B82]/20 bg-white shadow-[0_4px_24px_rgba(0,43,94,0.06)] rounded-[14px]">
            <CardHeader className="text-center pb-2 pt-6">
              <div className="mx-auto mb-3 flex items-center justify-center">
                <KoinonSymbol size={72} variant="color" />
              </div>
              <CardTitle className="text-2xl font-semibold tracking-[-0.02em] text-[#002B5E]">
                Confirmação de E-mail
              </CardTitle>
              <CardDescription className="text-xs text-[#5A6B82]">
                Plataforma Virtual Koinon — Verificação cadastral
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
              {status === 'verificando' && (
                <div className="flex flex-col items-center py-6 text-center space-y-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#0066FF] border-t-transparent" />
                  <p className="text-xs font-medium text-[#5A6B82]">
                    Validando autenticidade do link...
                  </p>
                </div>
              )}

              {status === 'sucesso' && (
                <Alert className="border border-[#0066FF]/30 bg-[#0066FF]/10 text-[#002B5E] rounded-[10px]">
                  <CheckCircle2 className="h-5 w-5 text-[#0066FF]" />
                  <AlertTitle className="font-semibold text-[#002B5E]">
                    E-mail verificado com sucesso
                  </AlertTitle>
                  <AlertDescription className="text-xs text-[#002B5E] mt-1">
                    Sua conta está confirmada e habilitada para credenciamento e votação na
                    plataforma.
                  </AlertDescription>
                </Alert>
              )}

              {status === 'erro' && (
                <Alert
                  variant="destructive"
                  className="border border-red-200 bg-red-50 text-red-900 rounded-[10px]"
                >
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertTitle className="font-semibold text-red-700">
                    Falha na verificação
                  </AlertTitle>
                  <AlertDescription className="text-xs text-[#002B5E] mt-1">
                    {mensagemErro || 'Não foi possível validar este token de e-mail.'}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>

            <CardFooter className="flex justify-center border-t border-[#5A6B82]/15 pt-4">
              <Link to="/login" className="w-full">
                <Button className="w-full h-10 bg-[#0066FF] text-white font-semibold hover:bg-[#0052CC] rounded-[10px] shadow-none border-0">
                  Ir para o Login <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardFooter>
          </Card>

          <EndossoA3One variant="color" layout="stacked" className="py-2" />
        </div>
      </main>

      <footer className="border-t border-white/10 bg-[#002B5E] py-4 px-6 text-white text-xs">
        <div className="mx-auto flex max-w-5xl items-center justify-between flex-wrap gap-3">
          <KoinonLogo size={36} variant="negative" />
          <EndossoA3One variant="on-navy" layout="inline" />
        </div>
      </footer>
    </div>
  )
}
export default VerificarEmailPage
