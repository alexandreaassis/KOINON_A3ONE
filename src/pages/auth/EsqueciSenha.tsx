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
import { KoinonLogo } from '@/components/brand/KoinonLogo'
import { KoinonSymbol } from '@/components/brand/KoinonSymbol'
import { Mail, CheckCircle2, ArrowLeft } from 'lucide-react'

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
              Recuperação de Senha
            </CardTitle>
            <CardDescription className="text-xs text-[#5C6B7A]">
              Plataforma Virtual Koinon — Instruções para redefinição de acesso
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4 space-y-4">
            {enviado ? (
              <Alert className="border border-[#4E8B7E]/40 bg-[#4E8B7E]/10 text-[#12314F] rounded-[10px]">
                <CheckCircle2 className="h-5 w-5 text-[#4E8B7E]" />
                <AlertTitle className="font-semibold text-[#12314F]">
                  Solicitação enviada
                </AlertTitle>
                <AlertDescription className="text-xs text-[#12314F] mt-1">
                  Se houver uma conta para este e-mail ({email}), você receberá um link com
                  instruções para redefinição de senha. Verifique também sua caixa de spam.
                </AlertDescription>
              </Alert>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium text-[#12314F]">
                    E-mail cadastrado
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
                      className="pl-10 h-10 border-[#D5DCE5] bg-white text-[#12314F] placeholder:text-[#5C6B7A] rounded-[10px] focus-visible:ring-[#1F6B94]"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={carregando}
                  className="w-full h-10 bg-[#1F6B94] text-white font-semibold hover:bg-[#185577] rounded-[10px] shadow-none border-0"
                >
                  {carregando ? 'Enviando...' : 'Enviar link de redefinição'}
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
export default EsqueciSenhaPage
