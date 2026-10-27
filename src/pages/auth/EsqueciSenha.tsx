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
    <div className="flex min-h-screen flex-col bg-[#F2F1ED] text-[#1C2331]">
      <header className="border-b border-[#D9D4C8] bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <KoinonLogo size={30} variant="color" />
          <Link to="/login" className="text-xs font-semibold text-[#216E75] hover:underline">
            Voltar para o Login
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center p-4 sm:p-6">
        <Card className="w-full max-w-md border border-[#D9D4C8] bg-white shadow-[0_4px_24px_rgba(28,35,49,0.08)] rounded-[14px]">
          <CardHeader className="text-center pb-2 pt-6">
            <div className="mx-auto mb-3 flex items-center justify-center">
              <KoinonSymbol size={44} variant="color" />
            </div>
            <CardTitle className="text-2xl font-semibold tracking-[-0.02em] text-[#1C2331]">
              Recuperação de Senha
            </CardTitle>
            <CardDescription className="text-xs text-[#626A76]">
              Plataforma Virtual Koinon — Instruções para redefinição de acesso
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4 space-y-4">
            {enviado ? (
              <Alert className="border border-[#7D8F72]/40 bg-[#7D8F72]/10 text-[#1C2331] rounded-[10px]">
                <CheckCircle2 className="h-5 w-5 text-[#7D8F72]" />
                <AlertTitle className="font-semibold text-[#1C2331]">
                  Solicitação enviada
                </AlertTitle>
                <AlertDescription className="text-xs text-[#1C2331] mt-1">
                  Se houver uma conta para este e-mail ({email}), você receberá um link com
                  instruções para redefinição de senha. Verifique também sua caixa de spam.
                </AlertDescription>
              </Alert>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium text-[#1C2331]">
                    E-mail cadastrado
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-[#626A76]" />
                    <Input
                      id="email"
                      type="email"
                      required
                      placeholder="ex: morador@lagoazul.com.br"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-10 border-[#D9D4C8] bg-white text-[#1C2331] placeholder:text-[#626A76] rounded-[10px] focus-visible:ring-[#216E75]"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={carregando}
                  className="w-full h-10 bg-[#216E75] text-white font-semibold hover:bg-[#1a585e] rounded-[10px] shadow-none border-0"
                >
                  {carregando ? 'Enviando...' : 'Enviar link de redefinição'}
                </Button>
              </form>
            )}
          </CardContent>

          <CardFooter className="flex justify-center border-t border-[#D9D4C8] pt-4">
            <Link
              to="/login"
              className="inline-flex items-center text-xs font-semibold text-[#1C2331] hover:text-[#216E75]"
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar para o Login
            </Link>
          </CardFooter>
        </Card>
      </main>

      <footer className="border-t border-[#2C364A] bg-[#1C2331] py-4 px-6 text-white text-xs">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <KoinonLogo size={22} variant="negative" />
          <p className="text-[#D1CFCD] text-[11px]">Segurança e integridade Koinon</p>
        </div>
      </footer>
    </div>
  )
}
export default EsqueciSenhaPage
