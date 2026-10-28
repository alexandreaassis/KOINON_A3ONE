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
import { Lock, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react'

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
    <div className="flex min-h-screen flex-col bg-[#F1F4F8] text-[#12314F]">
      <header className="border-b border-[#D5DCE5] bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <KoinonLogo size={38} variant="color" />
          <Link to="/login" className="text-xs font-semibold text-[#1F6B94] hover:underline">
            Voltar para o Login
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center p-4 sm:p-6">
        <Card className="w-full max-w-md border border-[#D5DCE5] bg-white shadow-[0_4px_24px_rgba(18,49,79,0.06)] rounded-[14px]">
          <CardHeader className="text-center pb-2 pt-6">
            <div className="mx-auto mb-3 flex items-center justify-center">
              <KoinonSymbol size={56} variant="color" />
            </div>
            <CardTitle className="text-2xl font-semibold tracking-[-0.02em] text-[#12314F]">
              Nova Senha
            </CardTitle>
            <CardDescription className="text-xs text-[#5C6B7A]">
              Plataforma Virtual Koinon — Defina sua nova senha de acesso
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4 space-y-4">
            {sucesso ? (
              <Alert className="border border-[#4E8B7E]/40 bg-[#4E8B7E]/10 text-[#12314F] rounded-[10px]">
                <CheckCircle2 className="h-5 w-5 text-[#4E8B7E]" />
                <AlertTitle className="font-semibold text-[#12314F]">
                  Senha alterada com sucesso
                </AlertTitle>
                <AlertDescription className="text-xs text-[#12314F] mt-1">
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
                    <AlertTitle className="text-xs font-semibold text-red-700">Atenção</AlertTitle>
                    <AlertDescription className="text-xs text-[#12314F]">{erro}</AlertDescription>
                  </Alert>
                )}

                {!token && (
                  <Alert className="border border-red-200 bg-red-50 text-red-900 rounded-[10px]">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-xs text-[#12314F]">
                      Nenhum token fornecido na URL. Utilize o link enviado por e-mail para
                      continuar.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="novaSenha" className="text-xs font-medium text-[#12314F]">
                    Nova Senha (mínimo 8 caracteres)
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-[#5C6B7A]" />
                    <Input
                      id="novaSenha"
                      type="password"
                      required
                      placeholder="••••••••"
                      value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value)}
                      className="pl-10 h-10 border-[#D5DCE5] bg-white text-[#12314F] placeholder:text-[#5C6B7A] rounded-[10px] focus-visible:ring-[#1F6B94]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmacao" className="text-xs font-medium text-[#12314F]">
                    Confirme a Nova Senha
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-[#5C6B7A]" />
                    <Input
                      id="confirmacao"
                      type="password"
                      required
                      placeholder="••••••••"
                      value={confirmacao}
                      onChange={(e) => setConfirmacao(e.target.value)}
                      className="pl-10 h-10 border-[#D5DCE5] bg-white text-[#12314F] placeholder:text-[#5C6B7A] rounded-[10px] focus-visible:ring-[#1F6B94]"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={carregando || !token}
                  className="w-full h-10 bg-[#1F6B94] text-white font-semibold hover:bg-[#185577] rounded-[10px] shadow-none border-0"
                >
                  {carregando ? 'Salvando...' : 'Salvar Nova Senha'}
                </Button>
              </form>
            )}
          </CardContent>

          <CardFooter className="flex justify-center border-t border-[#D5DCE5] pt-4">
            <Link
              to="/login"
              className="inline-flex items-center text-xs font-semibold text-[#12314F] hover:text-[#1F6B94]"
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar para o Login
            </Link>
          </CardFooter>
        </Card>
      </main>

      <footer className="border-t border-[#D5DCE5]/30 bg-[#12314F] py-4 px-6 text-white text-xs">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <KoinonLogo size={26} variant="negative" />
          <p className="text-[#D5DCE5] text-[11px]">Segurança e integridade Koinon</p>
        </div>
      </footer>
    </div>
  )
}
export default RedefinirSenhaPage
