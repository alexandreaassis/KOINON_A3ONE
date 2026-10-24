import React, { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
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
import { CheckCircle2, AlertTriangle, ArrowRight, Droplets } from 'lucide-react'

export const VerificarEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const { confirmarEmailComToken } = useAuth()

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
          setMensagemErro(err?.message || 'Link inválido ou já utilizado.')
        }
      })

    return () => {
      isMounted = false
    }
  }, [token])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-cyan-50 via-slate-50 to-blue-100 p-4">
      <Card className="w-full max-w-md border-cyan-100 shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-700 text-white shadow-md shadow-cyan-200">
            <Droplets className="h-8 w-8 text-cyan-200" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
            Confirmação de E-mail
          </CardTitle>
          <CardDescription className="text-slate-600 text-sm">
            Condomínio Residencial Lago Azul
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4">
          {status === 'verificando' && (
            <div className="flex flex-col items-center py-6 text-center space-y-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-600 border-t-transparent" />
              <p className="text-sm font-medium text-slate-700">
                Validando autenticidade do link...
              </p>
            </div>
          )}

          {status === 'sucesso' && (
            <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <AlertTitle className="font-semibold text-emerald-900">
                E-mail verificado com sucesso!
              </AlertTitle>
              <AlertDescription className="text-emerald-800 text-sm mt-1">
                Sua conta está confirmada e habilitada para credenciamento e votação eletrônica na
                assembleia.
              </AlertDescription>
            </Alert>
          )}

          {status === 'erro' && (
            <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-900">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertTitle className="font-semibold">Falha na verificação</AlertTitle>
              <AlertDescription className="text-xs mt-1">
                {mensagemErro || 'Não foi possível validar este token de e-mail.'}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>

        <CardFooter className="flex justify-center border-t border-slate-100 pt-4">
          <Link to="/login" className="w-full">
            <Button className="w-full bg-cyan-700 hover:bg-cyan-800">
              Ir para o Login <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
export default VerificarEmailPage
