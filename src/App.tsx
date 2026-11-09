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
import RelatoriosMesaPage from '@/pages/mesa/RelatoriosMesa'

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
import AtaMoradorPage from '@/pages/morador/AtaMorador'
import ManualMoradorPage from '@/pages/morador/ManualMorador'
import ManualMesaPage from '@/pages/mesa/ManualMesa'

// Páginas do Módulo da Mesa Diretora
import PainelMesaPage from '@/pages/mesa/PainelMesa'
import AtaAssembleiaPage from '@/pages/mesa/AtaAssembleia'
import AtaImprimirPage from '@/pages/mesa/AtaImprimir'
import DocumentosEditalPage from '@/pages/mesa/DocumentosEdital'
import ListaPresencaPage from '@/pages/mesa/ListaPresenca'
import ManualPresencaPage from '@/pages/mesa/ManualPresenca'
import CredenciaisPendentesPage from '@/pages/mesa/CredenciaisPendentes'
import DeliberacoesPage from '@/pages/mesa/Deliberacoes'
import AuditoriaPage from '@/pages/mesa/Auditoria'

// Páginas do Módulo de Administração
import ConfiguracoesPage from '@/pages/admin/Configuracoes'
import GestaoUsuariosPage from '@/pages/admin/Usuarios'
import HistoricoAlteracoesPage from '@/pages/admin/HistoricoAlteracoes'
import ParametrosConvencaoPage from '@/pages/admin/ParametrosConvencao'
import CadastrosUnidadesPage from '@/pages/admin/CadastrosUnidades'
import ManualCadastroLinkPage from '@/pages/admin/ManualCadastroLink'
import CadastroMoradorPublicoPage from '@/pages/public/CadastroMoradorPublico'
import ApresentacaoVideoCadastroPage from '@/pages/video/ApresentacaoVideoCadastro'

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
            <Route path="/forgot-password" element={<EsqueciSenhaPage />} />

            {/* Rotas de Redefinição de Senha (com query param ou path param do token) */}
            <Route path="/redefinir-senha" element={<RedefinirSenhaPage />} />
            <Route path="/redefinir-senha/:token" element={<RedefinirSenhaPage />} />
            <Route path="/reset-password" element={<RedefinirSenhaPage />} />
            <Route path="/reset-password/:token" element={<RedefinirSenhaPage />} />
            <Route path="/confirm-password-reset" element={<RedefinirSenhaPage />} />
            <Route path="/confirm-password-reset/:token" element={<RedefinirSenhaPage />} />
            <Route path="/auth/confirm-password-reset" element={<RedefinirSenhaPage />} />
            <Route path="/auth/confirm-password-reset/:token" element={<RedefinirSenhaPage />} />
            <Route
              path="/_/#/auth/confirm-password-reset/:token"
              element={<RedefinirSenhaPage />}
            />

            {/* Confirmação e Verificação de E-mail */}
            <Route path="/verificar-email" element={<VerificarEmailPage />} />
            <Route path="/verificar-email/:token" element={<VerificarEmailPage />} />
            <Route path="/verify-email" element={<VerificarEmailPage />} />
            <Route path="/verify-email/:token" element={<VerificarEmailPage />} />
            <Route path="/confirm-verification" element={<VerificarEmailPage />} />
            <Route path="/confirm-verification/:token" element={<VerificarEmailPage />} />

            {/* Rota Pública de Cadastro de Moradores por Unidade */}
            <Route path="/cadastro/:token" element={<CadastroMoradorPublicoPage />} />
            <Route path="/auth/confirm-verification" element={<VerificarEmailPage />} />
            <Route path="/auth/confirm-verification/:token" element={<VerificarEmailPage />} />

            {/* Apresentação HTML Animada e Roteiro de Vídeo Institucional (Fora do menu lateral) */}
            <Route path="/video/cadastro" element={<ApresentacaoVideoCadastroPage />} />
            <Route path="/video" element={<ApresentacaoVideoCadastroPage />} />

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
              element={<Navigate to="/mesa/credenciamento" replace />}
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
            <Route
              path="/ata-assembleia"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <AtaMoradorPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/ata-assembleia/:id"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <AtaMoradorPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/morador/manual"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <ManualMoradorPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* Manual do Módulo da Mesa Diretora */}
            <Route
              path="/mesa/manual"
              element={
                <ProtectedRoute requireMesa>
                  <AppLayout>
                    <ManualMesaPage />
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
              path="/mesa/credenciamento"
              element={
                <ProtectedRoute requireMesa>
                  <AppLayout>
                    <CredenciamentoPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/mesa/ata"
              element={
                <ProtectedRoute requireMesa>
                  <AppLayout>
                    <AtaAssembleiaPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/mesa/ata/:id"
              element={
                <ProtectedRoute requireMesa>
                  <AppLayout>
                    <AtaAssembleiaPage />
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
            <Route
              path="/mesa/relatorios"
              element={
                <ProtectedRoute requireMesa>
                  <AppLayout>
                    <RelatoriosMesaPage />
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
            {/* Visão de Impressão Dedicada do Manual de Uso da Lista de Presença A4 */}
            <Route
              path="/mesa/presenca/manual"
              element={
                <ProtectedRoute requireMesa>
                  <ManualPresencaPage />
                </ProtectedRoute>
              }
            />
            {/* Visão de Impressão Dedicada da Ata Notarial A4 */}
            <Route
              path="/mesa/ata/imprimir/:id"
              element={
                <ProtectedRoute requireMesa>
                  <AtaImprimirPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/mesa/ata/imprimir"
              element={
                <ProtectedRoute requireMesa>
                  <AtaImprimirPage />
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

            {/* Visão de Impressão Dedicada do Manual de Cadastro por Link da Unidade A4 */}
            <Route
              path="/admin/cadastros/manual"
              element={
                <ProtectedRoute requireMesa>
                  <ManualCadastroLinkPage />
                </ProtectedRoute>
              }
            />

            {/* Rotas Protegidas - Módulo de Administração */}
            <Route
              path="/admin/configuracoes"
              element={
                <ProtectedRoute requireAdmin>
                  <AppLayout>
                    <ConfiguracoesPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/cadastros"
              element={
                <ProtectedRoute requireMesa>
                  <AppLayout>
                    <CadastrosUnidadesPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/usuarios"
              element={
                <ProtectedRoute requireAdmin>
                  <AppLayout>
                    <GestaoUsuariosPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/historico"
              element={
                <ProtectedRoute requireAdmin>
                  <AppLayout>
                    <HistoricoAlteracoesPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/parametros"
              element={
                <ProtectedRoute requireAdmin>
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
