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
import { IndabaLogo } from '@/components/brand/IndabaLogo'
import { IndabaSymbol } from '@/components/brand/IndabaSymbol'
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
    <div className="flex min-h-screen flex-col bg-[#F4EFE7] text-[#1E1B18]">
      <header className="border-b border-[#E8E1D6] bg-[#FFFDFA] px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <IndabaLogo size={30} variant="color" />
          <Link to="/login" className="text-xs font-semibold text-[#E39A2B] hover:underline">
            Voltar para o Login
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center p-4 sm:p-6">
        <Card className="w-full max-w-md border border-[#E8E1D6] bg-[#FFFDFA] shadow-[0_4px_24px_rgba(30,27,24,0.06)] rounded-[12px]">
          <CardHeader className="text-center pb-2 pt-6">
            <div className="mx-auto mb-3 flex items-center justify-center">
              <IndabaSymbol size={44} variant="color" />
            </div>
            <CardTitle className="text-2xl font-semibold tracking-[-0.02em] text-[#1E1B18]">
              Recuperação de Senha
            </CardTitle>
            <CardDescription className="text-xs text-[#6B6259]">
              Plataforma Indaba — Instruções para redefinição de acesso
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4 space-y-4">
            {enviado ? (
              <Alert className="border border-[#E39A2B]/40 bg-[#E39A2B]/10 text-[#1E1B18] rounded-[10px]">
                <CheckCircle2 className="h-5 w-5 text-[#E39A2B]" />
                <AlertTitle className="font-semibold text-[#1E1B18]">
                  Solicitação enviada
                </AlertTitle>
                <AlertDescription className="text-xs text-[#1E1B18] mt-1">
                  Se houver uma conta para este e-mail ({email}), você receberá um link com
                  instruções para redefinição de senha. Verifique também sua caixa de spam.
                </AlertDescription>
              </Alert>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium text-[#1E1B18]">
                    E-mail cadastrado
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

                <Button
                  type="submit"
                  disabled={carregando}
                  className="w-full h-10 bg-[#E39A2B] text-[#1E1B18] font-semibold hover:bg-[#d48c20] rounded-[10px] shadow-none border-0"
                >
                  {carregando ? 'Enviando...' : 'Enviar link de redefinição'}
                </Button>
              </form>
            )}
          </CardContent>

          <CardFooter className="flex justify-center border-t border-[#E8E1D6] pt-4">
            <Link
              to="/login"
              className="inline-flex items-center text-xs font-semibold text-[#1E1B18] hover:text-[#E39A2B]"
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar para o Login
            </Link>
          </CardFooter>
        </Card>
      </main>

      <footer className="border-t border-[#E8E1D6] bg-[#1E1B18] py-4 px-6 text-white text-xs">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <IndabaLogo size={22} variant="negative" />
          <p className="text-[#E8E1D6]/70 text-[11px]">Segurança e integridade Indaba</p>
        </div>
      </footer>
    </div>
  )
}
export default EsqueciSenhaPage
