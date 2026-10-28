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
import { EndossoA3One } from '@/components/brand/EndossoA3One'

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
                Recuperação de Senha
              </CardTitle>
              <CardDescription className="text-xs text-[#5A6B82]">
                Plataforma Virtual Koinon — Instruções para redefinição de acesso
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
              {enviado ? (
                <Alert className="border border-[#0066FF]/30 bg-[#0066FF]/10 text-[#002B5E] rounded-[10px]">
                  <CheckCircle2 className="h-5 w-5 text-[#0066FF]" />
                  <AlertTitle className="font-semibold text-[#002B5E]">
                    Solicitação enviada
                  </AlertTitle>
                  <AlertDescription className="text-xs text-[#002B5E] mt-1">
                    Se houver uma conta para este e-mail ({email}), você receberá um link com
                    instruções para redefinição de senha. Verifique também sua caixa de spam.
                  </AlertDescription>
                </Alert>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-medium text-[#002B5E]">
                      E-mail cadastrado
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
                        className="pl-10 h-10 border-[#5A6B82]/30 bg-white text-[#002B5E] placeholder:text-[#5A6B82] rounded-[10px] focus-visible:ring-[#0066FF]"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={carregando}
                    className="w-full h-10 bg-[#0066FF] text-white font-semibold hover:bg-[#0052CC] rounded-[10px] shadow-none border-0"
                  >
                    {carregando ? 'Enviando...' : 'Enviar link de redefinição'}
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
export default EsqueciSenhaPage
