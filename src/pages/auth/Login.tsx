import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
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
import { Droplets, Mail, Lock, AlertTriangle, ArrowRight, ShieldCheck, User } from 'lucide-react'

export const LoginPage: React.FC = () => {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as any)?.from?.pathname || '/'

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro(null)
    setCarregando(true)

    try {
      const { role } = await login(email, senha)
      if (role === 'mesa') {
        navigate('/mesa')
      } else {
        navigate(from === '/login' ? '/' : from)
      }
    } catch (err: any) {
      console.error('Erro de login:', err)
      setErro('Credenciais inválidas. Verifique seu e-mail e senha cadastrados.')
    } finally {
      setCarregando(false)
    }
  }

  // Preencher rapidamente para teste da banca
  const preencherCredencial = (tipo: 'mesa' | 'morador') => {
    if (tipo === 'mesa') {
      setEmail('alexandre@a3one.com.br')
      setSenha('Skip@Pass')
    } else {
      setEmail('morador@lagoazul.com.br')
      setSenha('Skip@Pass')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-cyan-950 via-slate-900 to-blue-950 p-4">
      <Card className="w-full max-w-md border-slate-800 bg-white shadow-2xl">
        <CardHeader className="text-center pb-2 pt-6">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-700 text-white shadow-lg shadow-cyan-900/30">
            <Droplets className="h-9 w-9 text-cyan-200" />
          </div>
          <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-cyan-700 bg-cyan-50 px-2.5 py-1 rounded-full mb-1">
            Sistema de Votação Eletrônica
          </span>
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
            Condomínio Lago Azul
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Plataforma segura para assembleias e deliberações condominiais
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-3">
          {erro && (
            <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-900">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertTitle className="text-xs font-semibold">Falha de autenticação</AlertTitle>
              <AlertDescription className="text-xs">{erro}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
                E-mail do Condômino ou Mesa
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
                  className="pl-10 h-11 border-slate-300"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="senha" className="text-xs font-semibold text-slate-700">
                  Senha de Acesso
                </Label>
                <Link
                  to="/esqueci-senha"
                  className="text-xs text-cyan-700 hover:text-cyan-900 hover:underline font-medium"
                >
                  Esqueci minha senha
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="senha"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="pl-10 h-11 border-slate-300"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={carregando}
              className="w-full h-11 bg-cyan-700 hover:bg-cyan-800 text-white font-semibold shadow-md transition-all"
            >
              {carregando ? 'Autenticando...' : 'Acessar Assembleia'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

          {/* Atalhos Rápidos para Demonstração / Homologação */}
          <div className="pt-3 border-t border-slate-100">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center mb-2">
              Acesso Rápido para Testes
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs h-9 border-amber-300 text-amber-900 hover:bg-amber-50"
                onClick={() => preencherCredencial('mesa')}
              >
                <ShieldCheck className="mr-1 h-3.5 w-3.5 text-amber-600" /> Mesa Diretora
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs h-9 border-cyan-300 text-cyan-900 hover:bg-cyan-50"
                onClick={() => preencherCredencial('morador')}
              >
                <User className="mr-1 h-3.5 w-3.5 text-cyan-600" /> Morador (101A)
              </Button>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col items-center justify-center border-t border-slate-100 py-3 text-center">
          <p className="text-[11px] text-slate-400">
            1 Unidade = 1 Voto • Token de Voto Desacoplado • Chave Criptográfica SHA-256
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
export default LoginPage
