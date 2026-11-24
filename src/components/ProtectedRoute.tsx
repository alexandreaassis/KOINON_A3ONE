import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShieldAlert, LogOut, Home } from 'lucide-react'

/** Rota da troca obrigatória de senha (conta provisionada, users.deve_trocar_senha) */
export const ROTA_TROCA_OBRIGATORIA = '/trocar-senha'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireMesa?: boolean
  requireAdmin?: boolean
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireMesa = false,
  requireAdmin = false,
}) => {
  const { user, role, isAdmin, isMesaOuAdmin, isLoading, logout, deveTrocarSenha } = useAuth()
  const location = useLocation()

  // Gate de troca obrigatória de senha: conta provisionada (deve_trocar_senha=true)
  // só pode navegar até a tela de troca — nenhuma outra rota é acessível antes.
  if (deveTrocarSenha && location.pathname !== ROTA_TROCA_OBRIGATORIA) {
    return <Navigate to={ROTA_TROCA_OBRIGATORIA} state={{ from: location }} replace />
  }

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#F3F7FC]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0066FF] border-t-transparent" />
          <p className="text-sm font-medium text-[#5A6B82]">Carregando sistema Lago Azul...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F3F7FC] p-4 text-[#002B5E]">
        <Card className="max-w-md border-[#5A6B82]/25 bg-white shadow-[0_4px_24px_rgba(0,43,94,0.06)] rounded-[14px]">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-[#0066FF]/10 text-[#0066FF]">
              <ShieldAlert className="h-7 w-7" />
            </div>
            <CardTitle className="text-xl font-semibold tracking-[-0.02em] text-[#002B5E]">
              Acesso Restrito à Administração
            </CardTitle>
            <CardDescription className="text-xs text-[#5A6B82]">
              Esta seção é restrita aos administradores do condomínio. Seu perfil atual está
              classificado como{' '}
              <strong className="text-[#002B5E] font-semibold">
                {role || 'Morador'} ({user.name || user.email})
              </strong>
              .
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 pt-2">
            <Button
              variant="default"
              className="bg-[#0066FF] hover:bg-[#0052CC] text-white font-medium rounded-[10px] shadow-none border-0"
              onClick={() => {
                window.location.href = '/'
              }}
            >
              <Home className="mr-2 h-4 w-4" /> Voltar para o Painel
            </Button>
            <Button
              variant="outline"
              className="border-[#5A6B82]/25 hover:bg-[#F3F7FC] text-[#002B5E] rounded-[10px]"
              onClick={logout}
            >
              <LogOut className="mr-2 h-4 w-4" /> Trocar de Conta
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (requireMesa && !isMesaOuAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F3F7FC] p-4 text-[#002B5E]">
        <Card className="max-w-md border-[#5A6B82]/25 bg-white shadow-[0_4px_24px_rgba(0,43,94,0.06)] rounded-[14px]">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-[#0066FF]/10 text-[#0066FF]">
              <ShieldAlert className="h-7 w-7" />
            </div>
            <CardTitle className="text-xl font-semibold tracking-[-0.02em] text-[#002B5E]">
              Acesso Restrito à Mesa e Administração
            </CardTitle>
            <CardDescription className="text-xs text-[#5A6B82]">
              Esta seção é restrita aos membros da mesa diretora e administradores da assembleia.
              Seu perfil atual está classificado como{' '}
              <strong className="text-[#002B5E] font-semibold">
                Morador ({user.name || user.email})
              </strong>
              .
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 pt-2">
            <Button
              variant="default"
              className="bg-[#0066FF] hover:bg-[#0052CC] text-white font-medium rounded-[10px] shadow-none border-0"
              onClick={() => {
                window.location.href = '/'
              }}
            >
              <Home className="mr-2 h-4 w-4" /> Voltar para Minha Situação
            </Button>
            <Button
              variant="outline"
              className="border-[#5A6B82]/25 hover:bg-[#F3F7FC] text-[#002B5E] rounded-[10px]"
              onClick={logout}
            >
              <LogOut className="mr-2 h-4 w-4" /> Trocar de Conta
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}
