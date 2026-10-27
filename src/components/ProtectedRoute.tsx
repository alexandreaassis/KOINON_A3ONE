import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShieldAlert, LogOut, Home } from 'lucide-react'

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
  const { user, role, isAdmin, isMesaOuAdmin, isLoading, logout } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-600 border-t-transparent" />
          <p className="text-sm font-medium text-slate-600">Carregando sistema Lago Azul...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F2F1ED] p-4 text-[#1C2331]">
        <Card className="max-w-md border-[#D9D4C8] bg-white shadow-[0_4px_24px_rgba(28,35,49,0.08)] rounded-[14px]">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-[#216E75]/10 text-[#216E75]">
              <ShieldAlert className="h-7 w-7" />
            </div>
            <CardTitle className="text-xl font-semibold tracking-[-0.02em] text-[#1C2331]">
              Acesso Restrito à Administração
            </CardTitle>
            <CardDescription className="text-xs text-[#626A76]">
              Esta seção é restrita aos administradores do condomínio. Seu perfil atual está
              classificado como{' '}
              <strong className="text-[#1C2331] font-semibold">
                {role || 'Morador'} ({user.name || user.email})
              </strong>
              .
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 pt-2">
            <Button
              variant="default"
              className="bg-[#216E75] hover:bg-[#1a585e] text-white font-semibold rounded-[10px] shadow-none border-0"
              onClick={() => {
                window.location.href = '/'
              }}
            >
              <Home className="mr-2 h-4 w-4" /> Voltar para o Painel
            </Button>
            <Button
              variant="outline"
              className="border-[#D9D4C8] hover:bg-[#F2F1ED] rounded-[10px]"
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
      <div className="flex min-h-screen items-center justify-center bg-[#F2F1ED] p-4 text-[#1C2331]">
        <Card className="max-w-md border-[#D9D4C8] bg-white shadow-[0_4px_24px_rgba(28,35,49,0.08)] rounded-[14px]">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-[#216E75]/10 text-[#216E75]">
              <ShieldAlert className="h-7 w-7" />
            </div>
            <CardTitle className="text-xl font-semibold tracking-[-0.02em] text-[#1C2331]">
              Acesso Restrito à Mesa e Administração
            </CardTitle>
            <CardDescription className="text-xs text-[#626A76]">
              Esta seção é restrita aos membros da mesa diretora e administradores da assembleia.
              Seu perfil atual está classificado como{' '}
              <strong className="text-[#1C2331] font-semibold">
                Morador ({user.name || user.email})
              </strong>
              .
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 pt-2">
            <Button
              variant="default"
              className="bg-[#216E75] hover:bg-[#1a585e] text-white font-semibold rounded-[10px] shadow-none border-0"
              onClick={() => {
                window.location.href = '/'
              }}
            >
              <Home className="mr-2 h-4 w-4" /> Voltar para Minha Situação
            </Button>
            <Button
              variant="outline"
              className="border-[#D9D4C8] hover:bg-[#F2F1ED] rounded-[10px]"
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
