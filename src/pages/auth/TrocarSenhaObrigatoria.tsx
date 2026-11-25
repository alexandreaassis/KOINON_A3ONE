import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { api } from '@/lib/api'
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
import { KoinonSymbol } from '@/components/brand/KoinonSymbol'
import { EndossoA3One } from '@/components/brand/EndossoA3One'
import { useAuth } from '@/context/AuthContext'
import { KeyRound, AlertTriangle, Eye, EyeOff, LogOut, Loader2 } from 'lucide-react'

/**
 * Troca obrigatória de senha no primeiro acesso (conta provisionada pela
 * aprovação do cadastro de unidade — users.deve_trocar_senha = true).
 *
 * Enquanto o flag estiver ativo, ProtectedRoute redireciona TODA navegação
 * para cá: nenhuma outra tela é acessível antes da troca.
 *
 * A troca é feita pela rota de backend /backend/v1/usuario/trocar-senha
 * (hook trocar_senha_obrigatoria.js), que valida a senha atual, grava a nova
 * e limpa o flag server-side na mesma gravação. A senha nunca aparece em log
 * nem na resposta.
 */
export const TrocarSenhaObrigatoriaPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, role, logout, atualizarUsuarioLocal } = useAuth()

  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [mostrarAtual, setMostrarAtual] = useState(false)
  const [mostrarNova, setMostrarNova] = useState(false)
  const [mostrarConf, setMostrarConf] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  const destinoPosTroca = (location.state as { from?: { pathname?: string } } | null)?.from
    ?.pathname

  useEffect(() => {
    if (!user) navigate('/login', { replace: true })
  }, [user, navigate])

  const validarLocal = (): string | null => {
    if (!senhaAtual) return 'Informe a senha temporária recebida por e-mail.'
    if (
      novaSenha.length < 10 ||
      !/[a-zA-Z]/.test(novaSenha) ||
      !/\d/.test(novaSenha) ||
      !/[^a-zA-Z0-9]/.test(novaSenha)
    ) {
      return 'A nova senha deve ter ao menos 10 caracteres, com letras, números e um símbolo (ex.: ! @ # %).'
    }
    if (novaSenha !== confirmacao) return 'A confirmação não corresponde à nova senha.'
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const erroLocal = validarLocal()
    if (erroLocal) {
      setErro(erroLocal)
      return
    }
    setErro(null)
    setCarregando(true)
    try {
      const resp = await api.trocarSenhaObrigatoria({
        senha_atual: senhaAtual,
        nova_senha: novaSenha,
        confirmacao_senha: confirmacao,
      })
      if (!resp?.success) {
        setErro(
          getErrorMessage(
            null,
            resp?.message || 'Não foi possível trocar a senha. Tente novamente.',
          ),
        )
        return
      }
      // Flag limpo server-side: atualiza a sessão local e libera a navegação
      await atualizarUsuarioLocal()
      navigate(
        destinoPosTroca ||
          (role === 'admin' ? '/admin/configuracoes' : role === 'mesa' ? '/mesa' : '/'),
        { replace: true },
      )
    } catch (err) {
      setErro(getErrorMessage(err))
    } finally {
      setCarregando(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const classeInput =
    'h-10 border-[#5A6B82]/30 bg-white text-[#002B5E] rounded-[10px] focus-visible:ring-[#0066FF] focus-visible:border-[#0066FF]'

  return (
    <div className="flex min-h-dvh flex-col bg-[#F3F7FC] text-[#002B5E]">
      <main className="flex flex-1 items-center justify-center p-4 sm:p-6">
        <div className="flex w-full max-w-md flex-col items-center gap-4">
          <Card className="w-full rounded-[14px] border border-[#5A6B82]/20 bg-white shadow-[0_4px_24px_rgba(0,43,94,0.06)]">
            <CardHeader className="pb-2 pt-6 text-center">
              <div className="mx-auto mb-3 flex items-center justify-center">
                <KoinonSymbol size={64} variant="color" />
              </div>
              <div className="mb-2 inline-block self-center rounded-[8px] border border-[#0066FF]/25 bg-[#0066FF]/10 px-2.5 py-0.5 text-[11px] font-semibold tracking-wider text-[#002B5E]">
                Plataforma Virtual Koinon
              </div>
              <CardTitle className="text-2xl font-semibold tracking-[-0.02em] text-[#002B5E]">
                Troca obrigatória de senha
              </CardTitle>
              <CardDescription className="text-xs text-[#5A6B82]">
                Por segurança, defina uma senha pessoal antes de acessar a plataforma. A senha
                temporária recebida por e-mail deixa de valer após a troca.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-3">
              {erro && (
                <Alert
                  variant="destructive"
                  className="rounded-[10px] border border-red-200 bg-red-50 text-red-900"
                >
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertTitle className="text-xs font-semibold text-red-700">
                    Não foi possível concluir
                  </AlertTitle>
                  <AlertDescription className="text-xs text-[#002B5E]">{erro}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="senhaAtual" className="text-xs font-medium text-[#002B5E]">
                    Senha temporária atual <span aria-hidden="true">*</span>
                  </Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-3 h-4 w-4 text-[#5A6B82]" />
                    <Input
                      id="senhaAtual"
                      name="senha_atual"
                      type={mostrarAtual ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={senhaAtual}
                      onChange={(e2) => setSenhaAtual(e2.target.value)}
                      className={`pl-10 pr-10 ${classeInput}`}
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarAtual((v) => !v)}
                      aria-label={mostrarAtual ? 'Ocultar senha atual' : 'Mostrar senha atual'}
                      aria-pressed={mostrarAtual}
                      className="absolute right-3 top-2.5 rounded p-0.5 text-[#5A6B82] transition-colors hover:text-[#002B5E]"
                    >
                      {mostrarAtual ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="novaSenha" className="text-xs font-medium text-[#002B5E]">
                    Nova senha <span aria-hidden="true">*</span>
                  </Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-3 h-4 w-4 text-[#5A6B82]" />
                    <Input
                      id="novaSenha"
                      name="nova_senha"
                      type={mostrarNova ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={novaSenha}
                      onChange={(e2) => setNovaSenha(e2.target.value)}
                      aria-describedby="requisitos-senha"
                      className={`pl-10 pr-10 ${classeInput}`}
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarNova((v) => !v)}
                      aria-label={mostrarNova ? 'Ocultar nova senha' : 'Mostrar nova senha'}
                      aria-pressed={mostrarNova}
                      className="absolute right-3 top-2.5 rounded p-0.5 text-[#5A6B82] transition-colors hover:text-[#002B5E]"
                    >
                      {mostrarNova ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p id="requisitos-senha" className="text-[11px] text-[#5A6B82]">
                    Mínimo de 10 caracteres, com letras, números e um símbolo.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmacao" className="text-xs font-medium text-[#002B5E]">
                    Confirmar nova senha <span aria-hidden="true">*</span>
                  </Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-3 h-4 w-4 text-[#5A6B82]" />
                    <Input
                      id="confirmacao"
                      name="confirmacao_senha"
                      type={mostrarConf ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={confirmacao}
                      onChange={(e2) => setConfirmacao(e2.target.value)}
                      className={`pl-10 pr-10 ${classeInput}`}
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarConf((v) => !v)}
                      aria-label={mostrarConf ? 'Ocultar confirmação' : 'Mostrar confirmação'}
                      aria-pressed={mostrarConf}
                      className="absolute right-3 top-2.5 rounded p-0.5 text-[#5A6B82] transition-colors hover:text-[#002B5E]"
                    >
                      {mostrarConf ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={carregando}
                  className="h-10 w-full rounded-[10px] border-0 bg-[#0066FF] font-semibold text-white shadow-none hover:bg-[#0052CC] focus-visible:ring-2 focus-visible:ring-[#0066FF] focus-visible:ring-offset-2"
                >
                  {carregando ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                      Salvando nova senha...
                    </>
                  ) : (
                    'Salvar nova senha e acessar'
                  )}
                </Button>
              </form>
            </CardContent>

            <CardFooter className="flex flex-col items-center justify-center gap-2 border-t border-[#5A6B82]/15 py-3 text-center">
              <p className="text-[11px] text-[#5A6B82]">
                Acessando como <strong className="text-[#002B5E]">{user?.email}</strong>
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="rounded-[10px] border-[#5A6B82]/25 text-[#002B5E] hover:bg-[#F3F7FC]"
              >
                <LogOut className="mr-2 h-3.5 w-3.5" /> Sair da conta
              </Button>
            </CardFooter>
          </Card>

          <EndossoA3One variant="color" layout="stacked" className="py-2" />
        </div>
      </main>
    </div>
  )
}
export default TrocarSenhaObrigatoriaPage
