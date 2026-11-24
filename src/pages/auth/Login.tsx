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
import { Mail, Lock, AlertTriangle, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { useCondoConfig } from '@/context/CondoConfigContext'
import { EndossoA3One } from '@/components/brand/EndossoA3One'

/**
 * Divide o nome do condomínio em duas linhas para o destaque de marca do login:
 * o trecho que antecede "Lago Azul" fica na primeira linha e "Lago Azul"
 * centralizado na segunda. Quando o nome não termina com "Lago Azul",
 * retorna uma única linha (comportamento atual).
 */
const dividirNomeCondominioEmDuasLinhas = (nome: string): string[] => {
  const m = nome.trim().match(/^(.*?)\s+(Lago Azul)$/i)
  if (!m) return [nome.trim()]
  return [m[1].trim(), m[2]]
}

export const LoginPage: React.FC = () => {
  const { login } = useAuth()
  const { nomeCondominio } = useCondoConfig()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as any)?.from?.pathname || '/'

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
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

  return (
    <div className="flex min-h-screen flex-col bg-[#F3F7FC] text-[#002B5E]">
      {/* Cabeçalho Público Koinon */}
      <header className="border-b border-[#5A6B82]/20 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <KoinonLogo size={50} variant="color" />
          <nav className="hidden sm:flex items-center gap-6 text-xs text-[#5A6B82]">
            <span>Assembleias</span>
            <span>Deliberações</span>
            <span>Segurança Criptográfica</span>
          </nav>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#5A6B82] hidden md:inline">Ambiente seguro</span>
            <div className="h-2 w-2 rounded-full bg-[#0066FF]" />
          </div>
        </div>
      </header>

      {/* Área Central de Login */}
      <main className="flex flex-1 items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md flex flex-col items-center gap-4">
          <Card className="w-full border border-[#5A6B82]/20 bg-white shadow-[0_4px_24px_rgba(0,43,94,0.06)] rounded-[14px]">
            <CardHeader className="text-center pb-2 pt-6">
              <div className="mx-auto mb-3 flex items-center justify-center">
                <KoinonSymbol size={72} variant="color" />
              </div>
              <div className="inline-block self-center text-[11px] font-semibold tracking-wider text-[#002B5E] bg-[#0066FF]/10 border border-[#0066FF]/25 px-2.5 py-0.5 rounded-[8px] mb-2">
                Plataforma Virtual Koinon
              </div>
              <CardTitle className="text-2xl font-semibold tracking-[-0.02em] text-[#002B5E]">
                {/* Nome em duas linhas: "Lago Azul" centralizado abaixo de "Condomínio Residencial" */}
                {dividirNomeCondominioEmDuasLinhas(nomeCondominio).map((linha, i) => (
                  <span key={i} className="block leading-tight">
                    {linha}
                  </span>
                ))}
              </CardTitle>
              <CardDescription className="text-xs text-[#5A6B82]">
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
                  <AlertDescription className="text-xs text-[#002B5E]">{erro}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium text-[#002B5E]">
                    E-mail do Condômino ou Mesa
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-[#5A6B82]" />
                    <Input
                      id="email"
                      type="email"
                      required
                      placeholder="ex: morador@lagoazul.com.br"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-10 border-[#5A6B82]/30 bg-white text-[#002B5E] placeholder:text-[#5A6B82] rounded-[10px] focus-visible:ring-[#0066FF] focus-visible:border-[#0066FF]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="senha" className="text-xs font-medium text-[#002B5E]">
                      Senha de Acesso
                    </Label>
                    <Link
                      to="/esqueci-senha"
                      className="text-xs text-[#0066FF] hover:underline font-semibold"
                    >
                      Esqueci minha senha
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-[#5A6B82]" />
                    <Input
                      id="senha"
                      type={mostrarSenha ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      className="pl-10 pr-10 h-10 border-[#5A6B82]/30 bg-white text-[#002B5E] placeholder:text-[#5A6B82] rounded-[10px] focus-visible:ring-[#0066FF] focus-visible:border-[#0066FF]"
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarSenha(!mostrarSenha)}
                      className="absolute right-3 top-2.5 text-[#5A6B82] hover:text-[#002B5E] p-0.5 rounded transition-colors"
                      title={mostrarSenha ? 'Ocultar senha' : 'Ver senha'}
                      tabIndex={-1}
                    >
                      {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={carregando}
                  className="w-full h-10 bg-[#0066FF] text-white font-semibold hover:bg-[#0052CC] rounded-[10px] shadow-none border-0 focus-visible:ring-2 focus-visible:ring-[#0066FF] focus-visible:ring-offset-2"
                >
                  {carregando ? 'Autenticando...' : 'Acessar Assembleia'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </CardContent>

            <CardFooter className="flex flex-col items-center justify-center border-t border-[#5A6B82]/15 py-3 text-center">
              <p className="text-[11px] text-[#5A6B82]">
                1 Unidade = 1 Voto • Token Desacoplado • Chave Criptográfica SHA-256
              </p>
            </CardFooter>
          </Card>

          {/* Selo Koinon: uma solução A3ONE centralizado abaixo do card */}
          <EndossoA3One variant="color" layout="stacked" className="py-2" />
        </div>
      </main>

      {/* Rodapé Institucional Koinon */}
      <footer className="border-t border-white/10 bg-[#002B5E] py-5 px-6 text-white text-xs">
        <div className="mx-auto flex max-w-5xl flex-col sm:flex-row items-center justify-between gap-3">
          <KoinonLogo size={38} variant="negative" />
          <EndossoA3One variant="on-navy" layout="inline" />
        </div>
      </footer>
    </div>
  )
}
export default LoginPage
