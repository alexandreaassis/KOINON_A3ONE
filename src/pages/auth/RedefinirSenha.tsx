import React, { useState, useMemo } from 'react'
import { Link, useSearchParams, useParams, useLocation, useNavigate } from 'react-router-dom'
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
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { KoinonLogo } from '@/components/brand/KoinonLogo'
import { KoinonSymbol } from '@/components/brand/KoinonSymbol'
import { Lock, CheckCircle2, AlertTriangle, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { EndossoA3One } from '@/components/brand/EndossoA3One'

export const RedefinirSenhaPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const routeParams = useParams<{ token?: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const { redefinirSenhaComToken } = useAuth()

  // Extração robusta do token de múltiplos formatos:
  // 1. Query parameter ?token=... ou ?t=...
  // 2. Route path parameter /redefinir-senha/:token ou /reset-password/:token
  // 3. Hash routing fallback ex: /#/redefinir-senha?token=... ou window.location.hash
  const token = useMemo(() => {
    if (searchParams.get('token')) return searchParams.get('token')!.trim()
    if (searchParams.get('t')) return searchParams.get('t')!.trim()
    if (routeParams.token) return routeParams.token.trim()

    // Fallback: verificar se o token veio na hash da URL (ex: #/redefinir-senha?token=...)
    if (typeof window !== 'undefined' && window.location.hash) {
      const hashQuery = window.location.hash.split('?')[1]
      if (hashQuery) {
        const parsed = new URLSearchParams(hashQuery)
        if (parsed.get('token')) return parsed.get('token')!.trim()
        if (parsed.get('t')) return parsed.get('t')!.trim()
      }
      const matchHashToken = window.location.hash.match(
        /(?:confirm-password-reset|reset-password|redefinir-senha)\/([a-zA-Z0-9._-]+)/,
      )
      if (matchHashToken && matchHashToken[1]) return matchHashToken[1].trim()
    }

    // Fallback: verificar se pathname contém segmento final de token
    const pathSegments = location.pathname.split('/').filter(Boolean)
    if (pathSegments.length >= 2) {
      const lastSeg = pathSegments[pathSegments.length - 1]
      if (lastSeg && lastSeg.length > 20 && !lastSeg.includes('=')) {
        return lastSeg.trim()
      }
    }

    return ''
  }, [searchParams, routeParams, location.pathname])

  const [novaSenha, setNovaSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [mostrarNovaSenha, setMostrarNovaSenha] = useState(false)
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false)
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
      console.error('Erro ao redefinir senha:', err)
      const msg = getErrorMessage(
        err,
        'Falha ao redefinir a senha. O link pode ter expirado ou já foi utilizado.',
      )
      setErro(msg)
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F3F7FC] text-[#002B5E]">
      <header className="border-b border-[#5A6B82]/20 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <KoinonLogo size={50} variant="color" />
          <Link to="/login" className="text-xs font-semibold text-[#0066FF] hover:underline">
            Voltar para o Login
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
                Nova Senha
              </CardTitle>
              <CardDescription className="text-xs text-[#5A6B82]">
                Plataforma Virtual Koinon — Defina sua nova senha de acesso
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
              {sucesso ? (
                <Alert className="border border-[#0066FF]/30 bg-[#0066FF]/10 text-[#002B5E] rounded-[10px]">
                  <CheckCircle2 className="h-5 w-5 text-[#0066FF]" />
                  <AlertTitle className="font-semibold text-[#002B5E]">
                    Senha alterada com sucesso
                  </AlertTitle>
                  <AlertDescription className="text-xs text-[#002B5E] mt-1">
                    Sua senha foi redefinida. Redirecionando para o login em instantes...
                  </AlertDescription>
                </Alert>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {erro && (
                    <Alert
                      variant="destructive"
                      className="border border-red-200 bg-red-50 text-red-900 rounded-[10px]"
                    >
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <AlertTitle className="text-xs font-semibold text-red-700">
                        Atenção
                      </AlertTitle>
                      <AlertDescription className="text-xs text-[#002B5E]">{erro}</AlertDescription>
                    </Alert>
                  )}

                  {!token && (
                    <Alert className="border border-red-200 bg-red-50 text-red-900 rounded-[10px]">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-xs text-[#002B5E]">
                        Nenhum token fornecido na URL. Utilize o link enviado por e-mail para
                        continuar.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="novaSenha" className="text-xs font-medium text-[#002B5E]">
                      Nova Senha (mínimo 8 caracteres)
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-[#5A6B82]" />
                      <Input
                        id="novaSenha"
                        type={mostrarNovaSenha ? 'text' : 'password'}
                        required
                        placeholder="••••••••"
                        value={novaSenha}
                        onChange={(e) => setNovaSenha(e.target.value)}
                        className="pl-10 pr-10 h-10 border-[#5A6B82]/30 bg-white text-[#002B5E] placeholder:text-[#5A6B82] rounded-[10px] focus-visible:ring-[#0066FF]"
                      />
                      <button
                        type="button"
                        onClick={() => setMostrarNovaSenha(!mostrarNovaSenha)}
                        className="absolute right-3 top-2.5 text-[#5A6B82] hover:text-[#002B5E] p-0.5 rounded transition-colors"
                        title={mostrarNovaSenha ? 'Ocultar senha' : 'Ver senha'}
                        tabIndex={-1}
                      >
                        {mostrarNovaSenha ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirmacao" className="text-xs font-medium text-[#002B5E]">
                      Confirme a Nova Senha
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-[#5A6B82]" />
                      <Input
                        id="confirmacao"
                        type={mostrarConfirmacao ? 'text' : 'password'}
                        required
                        placeholder="••••••••"
                        value={confirmacao}
                        onChange={(e) => setConfirmacao(e.target.value)}
                        className="pl-10 pr-10 h-10 border-[#5A6B82]/30 bg-white text-[#002B5E] placeholder:text-[#5A6B82] rounded-[10px] focus-visible:ring-[#0066FF]"
                      />
                      <button
                        type="button"
                        onClick={() => setMostrarConfirmacao(!mostrarConfirmacao)}
                        className="absolute right-3 top-2.5 text-[#5A6B82] hover:text-[#002B5E] p-0.5 rounded transition-colors"
                        title={mostrarConfirmacao ? 'Ocultar senha' : 'Ver senha'}
                        tabIndex={-1}
                      >
                        {mostrarConfirmacao ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={carregando || !token}
                    className="w-full h-10 bg-[#0066FF] text-white font-semibold hover:bg-[#0052CC] rounded-[10px] shadow-none border-0"
                  >
                    {carregando ? 'Salvando...' : 'Salvar Nova Senha'}
                  </Button>
                </form>
              )}
            </CardContent>

            <CardFooter className="flex justify-center border-t border-[#5A6B82]/15 pt-4">
              <Link
                to="/login"
                className="inline-flex items-center text-xs font-semibold text-[#002B5E] hover:text-[#0066FF]"
              >
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar para o Login
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
export default RedefinirSenhaPage
