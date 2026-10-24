import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Mail, CheckCircle2, ArrowLeft, Droplets } from 'lucide-react'

export const EsqueciSenhaPage: React.FC = () => {
  const { solicitarRedefinicaoSenha } = useAuth()
  const [email, setEmail] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [carregando, setCarregando] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setCarregando(true)
    try {
      await solicitarRedefinicaoSenha(email)
      setEnviado(true)
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-cyan-50 via-slate-50 to-blue-100 p-4">
      <Card className="w-full max-w-md border-cyan-100 shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-700 text-white shadow-md shadow-cyan-200">
            <Droplets className="h-8 w-8 text-cyan-200" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
            Recuperação de Senha
          </CardTitle>
          <CardDescription className="text-slate-600 text-sm">
            Condomínio Residencial Lago Azul — Sistema de Votação
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4">
          {enviado ? (
            <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <AlertTitle className="font-semibold text-emerald-900">
                Solicitação enviada
              </AlertTitle>
              <AlertDescription className="text-emerald-800 text-sm mt-1">
                Se houver uma conta para este e-mail ({email}), você receberá um link com instruções
                para redefinição de senha. Por favor, verifique também sua caixa de spam.
              </AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 text-sm font-medium">
                  E-mail cadastrado
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="ex: morador@lagoazul.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11 border-slate-300 focus-visible:ring-cyan-600"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={carregando}
                className="w-full h-11 bg-cyan-700 hover:bg-cyan-800 font-semibold shadow-sm"
              >
                {carregando ? 'Enviando...' : 'Enviar link de redefinição'}
              </Button>
            </form>
          )}
        </CardContent>

        <CardFooter className="flex justify-center border-t border-slate-100 pt-4">
          <Link
            to="/login"
            className="inline-flex items-center text-sm font-medium text-cyan-700 hover:text-cyan-900 hover:underline"
          >
            <ArrowLeft className="mr-1 h-4 w-4" /> Voltar para o Login
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
export default EsqueciSenhaPage
