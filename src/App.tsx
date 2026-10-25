/* Main App Component - Sistema de Votação Eletrônica Residencial Lago Azul */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { CondoConfigProvider } from '@/context/CondoConfigContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'

// Documentos Oficiais de Impressão (Sem sidebar/layout geral)
import BoletimUrnaDocumentoPage from '@/pages/mesa/BoletimUrnaDocumento'
import InformativoDeliberacoesPage from '@/pages/mesa/InformativoDeliberacoes'
import DossieCartorioPage from '@/pages/mesa/DossieCartorio'
import EditalDocumentoPage from '@/pages/mesa/EditalDocumento'

// Páginas de Autenticação
import LoginPage from '@/pages/auth/Login'
import EsqueciSenhaPage from '@/pages/auth/EsqueciSenha'
import RedefinirSenhaPage from '@/pages/auth/RedefinirSenha'
import VerificarEmailPage from '@/pages/auth/VerificarEmail'

// Páginas do Módulo do Morador
import MinhaSituacaoPage from '@/pages/morador/MinhaSituacao'
import CredenciamentoPage from '@/pages/morador/Credenciamento'
import VotacaoPage from '@/pages/morador/Votacao'
import ReciboPage from '@/pages/morador/Recibo'
import DocumentosAssembleiaMoradorPage from '@/pages/morador/DocumentosAssembleia'

// Páginas do Módulo da Mesa Diretora
import PainelMesaPage from '@/pages/mesa/PainelMesa'
import DocumentosEditalPage from '@/pages/mesa/DocumentosEdital'
import ListaPresencaPage from '@/pages/mesa/ListaPresenca'
import CredenciaisPendentesPage from '@/pages/mesa/CredenciaisPendentes'
import DeliberacoesPage from '@/pages/mesa/Deliberacoes'
import AuditoriaPage from '@/pages/mesa/Auditoria'

// Páginas do Módulo de Administração
import ConfiguracoesPage from '@/pages/admin/Configuracoes'
import GestaoUsuariosPage from '@/pages/admin/Usuarios'
import ParametrosConvencaoPage from '@/pages/admin/ParametrosConvencao'

import NotFound from '@/pages/NotFound'

// Rota raiz inteligente: redireciona para a home de acordo com o perfil
const RootRoute = () => {
  const { user, role, isLoading } = useAuth()

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
    return <Navigate to="/login" replace />
  }

  if (role === 'admin') {
    return <Navigate to="/admin/configuracoes" replace />
  }

  if (role === 'mesa') {
    return <Navigate to="/mesa" replace />
  }

  return (
    <ProtectedRoute>
      <AppLayout>
        <MinhaSituacaoPage />
      </AppLayout>
    </ProtectedRoute>
  )
}

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <CondoConfigProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            {/* Rota Raiz Inteligente */}
            <Route path="/" element={<RootRoute />} />

            {/* Rotas Públicas de Autenticação */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/esqueci-senha" element={<EsqueciSenhaPage />} />
            <Route path="/redefinir-senha" element={<RedefinirSenhaPage />} />
            <Route path="/verificar-email" element={<VerificarEmailPage />} />

            {/* Rotas Protegidas - Módulo do Morador */}
            <Route
              path="/situacao"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <MinhaSituacaoPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/credenciamento"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <CredenciamentoPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/votacao"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <VotacaoPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/recibo"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <ReciboPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/documentos-assembleia"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <DocumentosAssembleiaMoradorPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* Rotas Protegidas - Módulo da Mesa Diretora */}
            <Route
              path="/mesa"
              element={
                <ProtectedRoute requireMesa>
                  <AppLayout>
                    <PainelMesaPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/mesa/documentos"
              element={
                <ProtectedRoute requireMesa>
                  <AppLayout>
                    <DocumentosEditalPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/mesa/presenca"
              element={
                <ProtectedRoute requireMesa>
                  <AppLayout>
                    <ListaPresencaPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/mesa/credenciamentos"
              element={
                <ProtectedRoute requireMesa>
                  <AppLayout>
                    <CredenciaisPendentesPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/mesa/deliberacoes"
              element={
                <ProtectedRoute requireMesa>
                  <AppLayout>
                    <DeliberacoesPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/mesa/auditoria"
              element={
                <ProtectedRoute requireMesa>
                  <AppLayout>
                    <AuditoriaPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            {/* Visão de Impressão Dedicada do Boletim de Urna (layout limpo, sem sidebar) */}
            <Route
              path="/mesa/auditoria/boletim/:deliberacaoId"
              element={
                <ProtectedRoute requireMesa>
                  <BoletimUrnaDocumentoPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/mesa/auditoria/boletim"
              element={
                <ProtectedRoute requireMesa>
                  <BoletimUrnaDocumentoPage />
                </ProtectedRoute>
              }
            />
            {/* Visões de Impressão Dedicadas: Edital Oficial A4, Informativo de Deliberações e Dossiê Completo Cartório */}
            <Route
              path="/mesa/documentos/edital/:deliberacaoId"
              element={
                <ProtectedRoute requireMesa>
                  <EditalDocumentoPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/mesa/documentos/edital"
              element={
                <ProtectedRoute requireMesa>
                  <EditalDocumentoPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/mesa/documentos/informativo/:deliberacaoId"
              element={
                <ProtectedRoute requireMesa>
                  <InformativoDeliberacoesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/mesa/documentos/informativo"
              element={
                <ProtectedRoute requireMesa>
                  <InformativoDeliberacoesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/mesa/auditoria/dossie/:deliberacaoId"
              element={
                <ProtectedRoute requireMesa>
                  <DossieCartorioPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/mesa/auditoria/dossie"
              element={
                <ProtectedRoute requireMesa>
                  <DossieCartorioPage />
                </ProtectedRoute>
              }
            />

            {/* Rotas Protegidas - Módulo de Administração */}
            <Route
              path="/admin/configuracoes"
              element={
                <ProtectedRoute requireMesa>
                  <AppLayout>
                    <ConfiguracoesPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/usuarios"
              element={
                <ProtectedRoute requireMesa>
                  <AppLayout>
                    <GestaoUsuariosPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/parametros"
              element={
                <ProtectedRoute requireMesa>
                  <AppLayout>
                    <ParametrosConvencaoPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* 404 Não Encontrado */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </CondoConfigProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
