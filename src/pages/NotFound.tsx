/* 404 Page - Displays when a user attempts to access a non-existent route */
import { useLocation, Link, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { KoinonLogo } from '@/components/brand/KoinonLogo'
import { KoinonSymbol } from '@/components/brand/KoinonSymbol'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Home } from 'lucide-react'

const NotFound = () => {
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    console.error('404 Error: Usuário tentou acessar rota inexistente:', location.pathname)

    // Se a rota ou hash contiver padrões de redefinição de senha ou token
    // Ex: /#/redefinir-senha, /#/reset-password, ou se o pathname contiver token de reset
    const fullUrl = window.location.href
    if (
      fullUrl.includes('confirm-password-reset') ||
      fullUrl.includes('reset-password') ||
      fullUrl.includes('redefinir-senha')
    ) {
      // Extrair token se existir
      const tokenMatch =
        fullUrl.match(/token=([a-zA-Z0-9._-]+)/) ||
        fullUrl.match(/confirm-password-reset\/([a-zA-Z0-9._-]+)/)
      const token = tokenMatch ? tokenMatch[1] : ''
      if (token) {
        navigate(`/redefinir-senha?token=${encodeURIComponent(token)}`, { replace: true })
      }
    }
  }, [location.pathname, navigate])

  return (
    <div className="flex min-h-screen flex-col bg-[#F2F1ED] text-[#1C2331]">
      <header className="border-b border-[#D9D4C8] bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <KoinonLogo size={30} variant="color" />
          <Link to="/" className="text-xs font-semibold text-[#216E75] hover:underline">
            Início
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md border border-[#D9D4C8] bg-white shadow-[0_4px_24px_rgba(28,35,49,0.08)] rounded-[14px] p-6 text-center space-y-4">
          <div className="mx-auto flex items-center justify-center">
            <KoinonSymbol size={48} variant="color" />
          </div>
          <div className="space-y-1">
            <p className="text-4xl font-bold tracking-tight text-[#1C2331]">404</p>
            <h1 className="text-lg font-semibold text-[#1C2331]">Página não encontrada</h1>
            <p className="text-xs text-[#626A76]">
              O endereço solicitado não existe ou foi modificado.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
            <Link to="/login" className="w-full sm:w-auto">
              <Button
                variant="outline"
                className="w-full text-xs h-9 border-[#D9D4C8] bg-white text-[#1C2331] hover:bg-[#F2F1ED] rounded-[10px]"
              >
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Ir para o login
              </Button>
            </Link>
            <Link to="/" className="w-full sm:w-auto">
              <Button className="w-full text-xs h-9 bg-[#216E75] hover:bg-[#1a585e] text-white font-semibold rounded-[10px] shadow-none border-0">
                <Home className="mr-1.5 h-3.5 w-3.5" /> Página inicial
              </Button>
            </Link>
          </div>
        </div>
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

export default NotFound
