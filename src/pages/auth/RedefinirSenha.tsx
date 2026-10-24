import React, { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
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
import { Lock, CheckCircle2, AlertTriangle, ArrowLeft, Droplets } from 'lucide-react'

export const RedefinirSenhaPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const navigate = useNavigate()
  const { redefinirSenhaComToken } = useAuth()

  const [novaSenha, setNovaSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro(null)

    if (!token) {
      setErro('Token de redefinição não encontrado ou expirado na URL.')
      return
    }

    if (novaSenha.length < 8) {
      setErro('A nova senha deve possuir no mínimo 8 caracteres.')
      return
    }

    if (novaSenha !== confirmacao) {
      setErro('As senhas digitadas não coincidem.')
      return
    }

    setCarregando(true)
    try {
      await redefinirSenhaComToken(token, novaSenha)
      setSucesso(true)
      setTimeout(() => {
        navigate('/login')
      }, 3000)
    } catch (err: any) {
      setErro(err?.message || 'Falha ao redefinir a senha. O link pode ter expirado.')
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
            Nova Senha
          </CardTitle>
          <CardDescription className="text-slate-600 text-sm">
            Condomínio Residencial Lago Azul — Crie uma senha segura
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4">
          {sucesso ? (
            <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <AlertTitle className="font-semibold">Senha alterada com sucesso!</AlertTitle>
              <AlertDescription className="text-sm mt-1">
                Sua senha foi redefinida com segurança. Redirecionando para o login em instantes...
              </AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {erro && (
                <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-900">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertTitle className="text-sm font-semibold">Atenção</AlertTitle>
                  <AlertDescription className="text-xs">{erro}</AlertDescription>
                </Alert>
              )}

              {!token && (
                <Alert className="border-amber-200 bg-amber-50 text-amber-900">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-xs">
                    Nenhum token fornecido na URL. Utilize o link enviado por e-mail para continuar.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="novaSenha">Nova Senha (mín. 8 dígitos)</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="novaSenha"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    className="pl-10 h-11"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmacao">Confirme a Nova Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="confirmacao"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmacao}
                    onChange={(e) => setConfirmacao(e.target.value)}
                    className="pl-10 h-11"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={carregando || !token}
                className="w-full h-11 bg-cyan-700 hover:bg-cyan-800 font-semibold"
              >
                {carregando ? 'Salvando...' : 'Salvar Nova Senha'}
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
export default RedefinirSenhaPage
