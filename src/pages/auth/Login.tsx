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
import { IndabaLogo } from '@/components/brand/IndabaLogo'
import { IndabaSymbol } from '@/components/brand/IndabaSymbol'
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
    <div className="flex min-h-screen flex-col bg-[#F4EFE7] text-[#1E1B18]">
      {/* Cabeçalho Público Indaba */}
      <header className="border-b border-[#E8E1D6] bg-[#FFFDFA] px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <IndabaLogo size={30} variant="color" />
          <nav className="hidden sm:flex items-center gap-6 text-xs text-[#6B6259]">
            <span>Assembleias</span>
            <span>Deliberações</span>
            <span>Segurança Criptográfica</span>
          </nav>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#6B6259] hidden md:inline">Ambiente seguro</span>
            <div className="h-2 w-2 rounded-full bg-[#E39A2B]" />
          </div>
        </div>
      </header>

      {/* Área Central de Login */}
      <main className="flex flex-1 items-center justify-center p-4 sm:p-6">
        <Card className="w-full max-w-md border border-[#E8E1D6] bg-[#FFFDFA] shadow-[0_4px_24px_rgba(30,27,24,0.06)] rounded-[12px]">
          <CardHeader className="text-center pb-2 pt-6">
            <div className="mx-auto mb-3 flex items-center justify-center">
              <IndabaSymbol size={44} variant="color" />
            </div>
            <div className="inline-block self-center text-[11px] font-semibold tracking-wider text-[#1E1B18] bg-[#E39A2B]/15 border border-[#E39A2B]/30 px-2.5 py-0.5 rounded-[8px] mb-2">
              Plataforma de Votação
            </div>
            <CardTitle className="text-2xl font-semibold tracking-[-0.02em] text-[#1E1B18]">
              {nomeCondominio}
            </CardTitle>
            <CardDescription className="text-xs text-[#6B6259]">
              Acesse a cabine de votação e participe das deliberações
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-3">
            {erro && (
              <Alert
                variant="destructive"
                className="border border-[#C75B39]/30 bg-[#C75B39]/10 text-[#1E1B18] rounded-[10px]"
              >
                <AlertTriangle className="h-4 w-4 text-[#C75B39]" />
                <AlertTitle className="text-xs font-semibold text-[#C75B39]">
                  Falha de autenticação
                </AlertTitle>
                <AlertDescription className="text-xs text-[#1E1B18]">{erro}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium text-[#1E1B18]">
                  E-mail do Condômino ou Mesa
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-[#6B6259]" />
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="ex: morador@lagoazul.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-10 border-[#E8E1D6] bg-[#FFFDFA] text-[#1E1B18] placeholder:text-[#6B6259] rounded-[10px]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="senha" className="text-xs font-medium text-[#1E1B18]">
                    Senha de Acesso
                  </Label>
                  <Link
                    to="/esqueci-senha"
                    className="text-xs text-[#E39A2B] hover:underline font-semibold"
                  >
                    Esqueci minha senha
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-[#6B6259]" />
                  <Input
                    id="senha"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="pl-10 h-10 border-[#E8E1D6] bg-[#FFFDFA] text-[#1E1B18] placeholder:text-[#6B6259] rounded-[10px]"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={carregando}
                className="w-full h-10 bg-[#E39A2B] text-[#1E1B18] font-semibold hover:bg-[#d48c20] rounded-[10px] shadow-none border-0"
              >
                {carregando ? 'Autenticando...' : 'Acessar Assembleia'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>

            {/* Atalhos Rápidos para Demonstração / Homologação */}
            <div className="pt-3 border-t border-[#E8E1D6]">
              <p className="text-[11px] font-medium text-[#6B6259] uppercase tracking-[0.04em] text-center mb-2">
                Acesso Rápido para Testes
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-9 border-[#E8E1D6] text-[#1E1B18] hover:bg-[#F4EFE7] rounded-[10px]"
                  onClick={() => preencherCredencial('mesa')}
                >
                  <ShieldCheck className="mr-1.5 h-3.5 w-3.5 text-[#E39A2B]" /> Mesa Diretora
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-9 border-[#E8E1D6] text-[#1E1B18] hover:bg-[#F4EFE7] rounded-[10px]"
                  onClick={() => preencherCredencial('morador')}
                >
                  <User className="mr-1.5 h-3.5 w-3.5 text-[#6B6259]" /> Morador (101A)
                </Button>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col items-center justify-center border-t border-[#E8E1D6] py-3 text-center">
            <p className="text-[11px] text-[#6B6259]">
              1 Unidade = 1 Voto • Token Desacoplado • Chave Criptográfica SHA-256
            </p>
          </CardFooter>
        </Card>
      </main>

      {/* Rodapé Institucional Indaba */}
      <footer className="border-t border-[#E8E1D6] bg-[#1E1B18] py-5 px-6 text-white text-xs">
        <div className="mx-auto flex max-w-5xl flex-col sm:flex-row items-center justify-between gap-3">
          <IndabaLogo size={24} variant="negative" />
          <p className="text-[#E8E1D6]/80 text-center sm:text-right text-[11px]">
            Plataforma Indaba — Governança assemblear com integridade e transparência
          </p>
        </div>
      </footer>
    </div>
  )
}
export default LoginPage
