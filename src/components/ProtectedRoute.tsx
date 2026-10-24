import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShieldAlert, LogOut, Home } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireMesa?: boolean
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireMesa = false,
}) => {
  const { user, role, isLoading, logout } = useAuth()
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

  if (requireMesa && role !== 'mesa') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <Card className="max-w-md border-amber-200 shadow-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <ShieldAlert className="h-7 w-7" />
            </div>
            <CardTitle className="text-xl font-bold text-slate-900">
              Acesso Restrito à Mesa
            </CardTitle>
            <CardDescription className="text-sm text-slate-600">
              Esta seção é destinada exclusivamente aos membros da mesa diretora e administradores
              da assembleia. Seu perfil atual está classificado como{' '}
              <strong className="text-slate-800">Morador ({user.name})</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 pt-2">
            <Button
              variant="default"
              className="bg-cyan-700 hover:bg-cyan-800"
              onClick={() => {
                window.location.href = '/'
              }}
            >
              <Home className="mr-2 h-4 w-4" /> Voltar para Minha Situação
            </Button>
            <Button variant="outline" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" /> Trocar de Conta
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}
