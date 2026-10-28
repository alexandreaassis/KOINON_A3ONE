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
import { KoinonLogo } from '@/components/brand/KoinonLogo'
import { KoinonSymbol } from '@/components/brand/KoinonSymbol'
import { Mail, Lock, AlertTriangle, ArrowRight, ShieldCheck, User } from 'lucide-react'
import { useCondoConfig } from '@/context/CondoConfigContext'

export const LoginPage: React.FC = () => {
  const { login } = useAuth()
  const { nomeCondominio } = useCondoConfig()
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
      if (role === 'admin') {
        navigate('/admin/configuracoes')
      } else if (role === 'mesa') {
        navigate('/mesa')
      } else {
        navigate(from === '/login' ? '/' : from)
      }
    } catch (err: any) {
      console.error('Erro de login:', err)
      const rawMsg = err?.message || err?.data?.message || ''
      if (rawMsg.includes('Usuário inativo') || rawMsg.includes('inativo')) {
        setErro('Usuário inativo — contate a administração.')
      } else {
        setErro('Credenciais inválidas. Verifique seu e-mail e senha cadastrados.')
      }
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
    <div className="flex min-h-screen flex-col bg-[#F1F4F8] text-[#12314F]">
      {/* Cabeçalho Público Koinon */}
      <header className="border-b border-[#D5DCE5] bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <KoinonLogo size={38} variant="color" />
          <nav className="hidden sm:flex items-center gap-6 text-xs text-[#5C6B7A]">
            <span>Assembleias</span>
            <span>Deliberações</span>
            <span>Segurança Criptográfica</span>
          </nav>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#5C6B7A] hidden md:inline">Ambiente seguro</span>
            <div className="h-2 w-2 rounded-full bg-[#1F6B94]" />
          </div>
        </div>
      </header>

      {/* Área Central de Login */}
      <main className="flex flex-1 items-center justify-center p-4 sm:p-6">
        <Card className="w-full max-w-md border border-[#D5DCE5] bg-white shadow-[0_4px_24px_rgba(18,49,79,0.06)] rounded-[14px]">
          <CardHeader className="text-center pb-2 pt-6">
            <div className="mx-auto mb-3 flex items-center justify-center">
              <KoinonSymbol size={56} variant="color" />
            </div>
            <div className="inline-block self-center text-[11px] font-semibold tracking-wider text-[#12314F] bg-[#1F6B94]/10 border border-[#1F6B94]/25 px-2.5 py-0.5 rounded-[8px] mb-2">
              Plataforma Virtual Koinon
            </div>
            <CardTitle className="text-2xl font-semibold tracking-[-0.02em] text-[#12314F]">
              {nomeCondominio}
            </CardTitle>
            <CardDescription className="text-xs text-[#5C6B7A]">
              Acesse a cabine de votação e participe das deliberações
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-3">
            {erro && (
              <Alert
                variant="destructive"
                className="border border-red-200 bg-red-50 text-red-900 rounded-[10px]"
              >
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertTitle className="text-xs font-semibold text-red-700">
                  Falha de autenticação
                </AlertTitle>
                <AlertDescription className="text-xs text-[#12314F]">{erro}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium text-[#12314F]">
                  E-mail do Condômino ou Mesa
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-[#5C6B7A]" />
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="ex: morador@lagoazul.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-10 border-[#D5DCE5] bg-white text-[#12314F] placeholder:text-[#5C6B7A] rounded-[10px] focus-visible:ring-[#1F6B94] focus-visible:border-[#1F6B94]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="senha" className="text-xs font-medium text-[#12314F]">
                    Senha de Acesso
                  </Label>
                  <Link
                    to="/esqueci-senha"
                    className="text-xs text-[#1F6B94] hover:underline font-semibold"
                  >
                    Esqueci minha senha
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-[#5C6B7A]" />
                  <Input
                    id="senha"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="pl-10 h-10 border-[#D5DCE5] bg-white text-[#12314F] placeholder:text-[#5C6B7A] rounded-[10px] focus-visible:ring-[#1F6B94] focus-visible:border-[#1F6B94]"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={carregando}
                className="w-full h-10 bg-[#1F6B94] text-white font-semibold hover:bg-[#185577] rounded-[10px] shadow-none border-0 focus-visible:ring-2 focus-visible:ring-[#1F6B94] focus-visible:ring-offset-2"
              >
                {carregando ? 'Autenticando...' : 'Acessar Assembleia'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>

            {/* Atalhos Rápidos para Demonstração / Homologação */}
            <div className="pt-3 border-t border-[#D5DCE5]">
              <p className="text-[11px] font-medium text-[#5C6B7A] uppercase tracking-[0.06em] text-center mb-2">
                Acesso Rápido para Testes
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-9 border-[#D5DCE5] text-[#12314F] hover:bg-[#F1F4F8] rounded-[10px]"
                  onClick={() => preencherCredencial('mesa')}
                >
                  <ShieldCheck className="mr-1.5 h-3.5 w-3.5 text-[#1F6B94]" /> Mesa Diretora
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-9 border-[#D5DCE5] text-[#12314F] hover:bg-[#F1F4F8] rounded-[10px]"
                  onClick={() => preencherCredencial('morador')}
                >
                  <User className="mr-1.5 h-3.5 w-3.5 text-[#5C6B7A]" /> Morador (101A)
                </Button>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col items-center justify-center border-t border-[#D5DCE5] py-3 text-center">
            <p className="text-[11px] text-[#5C6B7A]">
              1 Unidade = 1 Voto • Token Desacoplado • Chave Criptográfica SHA-256
            </p>
          </CardFooter>
        </Card>
      </main>

      {/* Rodapé Institucional Koinon */}
      <footer className="border-t border-[#D5DCE5]/30 bg-[#12314F] py-5 px-6 text-white text-xs">
        <div className="mx-auto flex max-w-5xl flex-col sm:flex-row items-center justify-between gap-3">
          <KoinonLogo size={28} variant="negative" />
          <p className="text-[#D5DCE5] text-center sm:text-right text-[11px]">
            Plataforma Virtual Koinon — Governança assemblear com integridade e transparência
          </p>
        </div>
      </footer>
    </div>
  )
}
export default LoginPage
