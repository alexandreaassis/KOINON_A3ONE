import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { api, type DeliberacaoRecord } from '@/lib/api'
import { VotingStatusBar } from './VotingStatusBar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { IndabaLogo } from '@/components/brand/IndabaLogo'
import {
  Menu,
  LogOut,
  Home,
  Vote,
  Receipt,
  Users,
  ShieldCheck,
  FileSpreadsheet,
  History,
  WifiOff,
  UserCheck,
  ChevronRight,
  Settings,
  SlidersHorizontal,
  FileText,
  FolderArchive,
} from 'lucide-react'
import { useCondoConfig } from '@/context/CondoConfigContext'

interface AppLayoutProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, title, subtitle }) => {
  const {
    user,
    role,
    isAdmin,
    unidadeSelecionada,
    unidadesDisponiveis,
    selecionarUnidade,
    logout,
    isOnline,
  } = useAuth()
  const { nomeCondominio, rotuloUnidade } = useCondoConfig()
  const location = useLocation()
  const navigate = useNavigate()

  const [deliberacaoAtiva, setDeliberacaoAtiva] = useState<DeliberacaoRecord | null>(null)
  const [jaVotou, setJaVotou] = useState(false)
  const [isPresencial, setIsPresencial] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Carregar dados de status da votação
  useEffect(() => {
    let ativo = true
    const carregarStatus = async () => {
      try {
        const delib = await api.getDeliberacaoAtiva()
        if (!ativo) return
        setDeliberacaoAtiva(delib)

        if (delib && unidadeSelecionada) {
          try {
            // Checar se já votou
            const comp = await api.getComparecimento(delib.id, unidadeSelecionada.id)
            if (!ativo) return
            setJaVotou(!!comp)
          } catch (compErr) {
            console.warn('Erro ao verificar comparecimento da unidade:', compErr)
            if (!ativo) return
            setJaVotou(false)
          }

          try {
            // Checar reconciliação física presencial
            const presencas = await api.getPresencas(delib.id)
            if (!ativo) return
            const temPresencial = Array.isArray(presencas)
              ? presencas.some(
                  (p) => p.unidade === unidadeSelecionada.id && p.tipo === 'presencial',
                )
              : false
            setIsPresencial(temPresencial)
          } catch (presErr) {
            console.warn('Erro ao verificar presenças da deliberação:', presErr)
            if (!ativo) return
            setIsPresencial(false)
          }
        } else if (!delib && ativo) {
          setJaVotou(false)
          setIsPresencial(false)
        }
      } catch (err) {
        // Degradação graciosa: falha na consulta nunca derruba a renderização da aplicação
        console.warn('Erro ao verificar status da deliberação no AppLayout:', err)
        if (ativo) {
          setDeliberacaoAtiva(null)
          setJaVotou(false)
          setIsPresencial(false)
        }
      }
    }

    carregarStatus()
    const timer = setInterval(carregarStatus, 15000) // polling a cada 15s
    return () => {
      ativo = false
      clearInterval(timer)
    }
  }, [unidadeSelecionada])

  // Menus de navegação
  const navMorador = [
    { label: 'Minha Situação', path: '/', icon: Home },
    { label: 'Ata da Assembleia', path: '/ata-assembleia', icon: FileText },
    { label: 'Documentos da Pauta', path: '/documentos-assembleia', icon: FolderArchive },
    { label: 'Credenciamento', path: '/credenciamento', icon: UserCheck },
    { label: 'Cabine de Votação', path: '/votacao', icon: Vote },
    { label: 'Meus Recibos', path: '/recibo', icon: Receipt },
  ]

  const navMesa = [
    { label: 'Painel da Mesa', path: '/mesa', icon: ShieldCheck },
    { label: 'Ata da Assembleia (IA)', path: '/mesa/ata', icon: FileText },
    { label: 'Documentos & Edital', path: '/mesa/documentos', icon: FolderArchive },
    { label: 'Lista de Presença', path: '/mesa/presenca', icon: UserCheck },
    { label: 'Credenciais Pendentes', path: '/mesa/credenciamentos', icon: Users },
    { label: 'Deliberações e Pautas', path: '/mesa/deliberacoes', icon: FileSpreadsheet },
    { label: 'Auditoria e Urna', path: '/mesa/auditoria', icon: History },
  ]

  const navAdmin = [
    { label: 'Configurações do Condomínio', path: '/admin/configuracoes', icon: Settings },
    { label: 'Gestão de Usuários', path: '/admin/usuarios', icon: Users },
    { label: 'Parâmetros da Convenção', path: '/admin/parametros', icon: SlidersHorizontal },
  ]

  // Breadcrumb simples derivado da rota
  const getBreadcrumbs = () => {
    const p = location.pathname
    if (p === '/') return ['Início', 'Minha Situação']
    if (p === '/credenciamento') return ['Morador', 'Credenciamento']
    if (p === '/votacao') return ['Morador', 'Cabine de Votação']
    if (p === '/recibo') return ['Morador', 'Comprovante']
    if (p === '/mesa') return ['Mesa Diretora', 'Painel Geral']
    if (p === '/ata-assembleia') return ['Morador', 'Ata Notarial']
    if (p === '/documentos-assembleia') return ['Morador', 'Documentos da Assembleia']
    if (p === '/mesa/ata') return ['Mesa Diretora', 'Ata da Assembleia']
    if (p === '/mesa/documentos') return ['Mesa Diretora', 'Documentos & Edital']
    if (p === '/mesa/presenca') return ['Mesa Diretora', 'Lista de Presença']
    if (p === '/mesa/credenciamentos') return ['Mesa Diretora', 'Credenciais']
    if (p === '/mesa/deliberacoes') return ['Mesa Diretora', 'Deliberações']
    if (p === '/mesa/auditoria') return ['Mesa Diretora', 'Auditoria & Boletim']
    if (p === '/admin/configuracoes') return ['Administração', 'Configurações']
    if (p === '/admin/usuarios') return ['Administração', 'Usuários']
    if (p === '/admin/parametros') return ['Administração', 'Parâmetros Globais']
    return ['Sistema', nomeCondominio]
  }

  const breadcrumbs = getBreadcrumbs()

  const getIniciais = (nomeOuEmail?: string) => {
    if (!nomeOuEmail) return 'U'
    const partes = nomeOuEmail.trim().split(/\s+/)
    if (partes.length >= 2) {
      return (partes[0][0] + partes[1][0]).toUpperCase()
    }
    return nomeOuEmail.slice(0, 2).toUpperCase()
  }

  const SidebarContent = () => (
    <div className="flex h-full flex-col justify-between bg-[#1E1B18] text-[#E8E1D6]">
      <div className="overflow-y-auto">
        {/* Brand Header com Logotipo Indaba Negativo no topo da Sidebar */}
        <div className="px-5 py-5 border-b border-[#2E2A26]">
          <IndabaLogo size={28} variant="negative" subtitle={nomeCondominio} />
        </div>

        {/* Seletor de Unidade Ativa */}
        {unidadesDisponiveis.length > 0 && (
          <div className="p-3 border-b border-[#2E2A26] bg-[#171412]">
            <div className="text-[11px] uppercase tracking-[0.04em] font-medium text-[#6B6259] mb-1 px-1">
              Unidade Ativa
            </div>
            <Select
              value={unidadeSelecionada?.id || ''}
              onValueChange={(val) => {
                const u = unidadesDisponiveis.find((item) => item.id === val)
                if (u) selecionarUnidade(u)
              }}
            >
              <SelectTrigger className="w-full bg-[#1E1B18] border-[#2E2A26] text-xs text-[#E8E1D6] h-9 rounded-[10px] focus:ring-[#E39A2B]">
                <SelectValue placeholder="Selecione sua unidade" />
              </SelectTrigger>
              <SelectContent className="max-h-64 bg-[#1E1B18] text-[#E8E1D6] border-[#2E2A26]">
                {unidadesDisponiveis.map((u) => (
                  <SelectItem
                    key={u.id}
                    value={u.id}
                    className="text-xs text-[#E8E1D6] focus:bg-[#2A2622] focus:text-[#FFFDFA]"
                  >
                    {u.tipo_unidade || rotuloUnidade} {u.identificador} ({u.bloco || nomeCondominio}
                    )
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Links de navegação */}
        <div className="px-3 py-4 space-y-6">
          {/* Módulo do Morador */}
          <div>
            <div className="px-3 text-[11px] font-medium uppercase tracking-[0.04em] text-[#6B6259] mb-2">
              Módulo do Morador
            </div>
            <nav className="space-y-1">
              {navMorador.map((item) => {
                const isActive = location.pathname === item.path
                const Icon = item.icon
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`relative flex items-center gap-3 px-3 py-2 rounded-[10px] text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-[#2A2622] text-[#FFFDFA] font-semibold border-l-[3px] border-l-[#E39A2B] rounded-l-none'
                        : 'text-[#E8E1D6]/80 hover:bg-[#2A2622]/60 hover:text-[#FFFDFA]'
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 shrink-0 ${
                        isActive ? 'text-[#E39A2B]' : 'text-[#6B6259]'
                      }`}
                    />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Módulo da Mesa (visível com destaque se role === mesa) */}
          <div>
            <div className="px-3 flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.04em] text-[#6B6259] mb-2">
              <span>Módulo da Mesa</span>
              {role === 'mesa' && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-[8px] bg-[#E39A2B]/20 text-[#E39A2B] font-semibold">
                  Operador
                </span>
              )}
            </div>
            <nav className="space-y-1">
              {navMesa.map((item) => {
                const isActive = location.pathname === item.path
                const Icon = item.icon
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`relative flex items-center gap-3 px-3 py-2 rounded-[10px] text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-[#2A2622] text-[#FFFDFA] font-semibold border-l-[3px] border-l-[#E39A2B] rounded-l-none'
                        : 'text-[#E8E1D6]/80 hover:bg-[#2A2622]/60 hover:text-[#FFFDFA]'
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 shrink-0 ${
                        isActive ? 'text-[#E39A2B]' : 'text-[#6B6259]'
                      }`}
                    />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Módulo de Administração (Apenas Perfil Admin) */}
          {isAdmin && (
            <div>
              <div className="px-3 flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.04em] text-[#6B6259] mb-2">
                <span>Administração</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-[8px] bg-[#2E2A26] text-[#E8E1D6] font-semibold">
                  Admin
                </span>
              </div>
              <nav className="space-y-1">
                {navAdmin.map((item) => {
                  const isActive = location.pathname === item.path
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`relative flex items-center gap-3 px-3 py-2 rounded-[10px] text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-[#2A2622] text-[#FFFDFA] font-semibold border-l-[3px] border-l-[#E39A2B] rounded-l-none'
                          : 'text-[#E8E1D6]/80 hover:bg-[#2A2622]/60 hover:text-[#FFFDFA]'
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 shrink-0 ${
                          isActive ? 'text-[#E39A2B]' : 'text-[#6B6259]'
                        }`}
                      />
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </nav>
            </div>
          )}
        </div>
      </div>

      {/* Bloco do usuário no rodapé da Sidebar: avatar circular, nome e cargo */}
      <div className="p-3 border-t border-[#2E2A26] bg-[#171412]">
        <div className="flex items-center justify-between gap-2.5 px-2 py-1.5">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="h-9 w-9 rounded-full bg-[#2A2622] border border-[#2E2A26] flex items-center justify-center text-[#E39A2B] font-semibold text-xs shrink-0">
              {getIniciais(user?.name || user?.email)}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-[#FFFDFA] truncate leading-tight">
                {user?.name || user?.email}
              </p>
              <p className="text-[10px] text-[#6B6259] truncate mt-0.5">
                {role === 'admin'
                  ? 'Administrador Geral'
                  : role === 'mesa'
                    ? 'Membro da Mesa'
                    : `Condômino ${unidadeSelecionada?.tipo_unidade || rotuloUnidade} ${unidadeSelecionada?.identificador || '—'}`}
              </p>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={logout}
            title="Sair da plataforma"
            className="text-[#6B6259] hover:text-[#FFFDFA] hover:bg-[#2A2622] h-8 w-8 rounded-[10px] shrink-0"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex bg-[#F4EFE7] text-[#1E1B18]">
      {/* Alerta de Conexão Indaba */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-[#C75B39] text-[#FFFDFA] text-xs font-semibold py-2 px-4 text-center shadow-md flex items-center justify-center gap-2">
          <WifiOff className="h-4 w-4" />
          <span>
            Conexão interrompida com o servidor. Ações de voto aguardam restabelecimento da rede.
          </span>
        </div>
      )}

      {/* Desktop Sidebar (Fundo Indaba Deep #1E1B18, 64px de largura mínima) */}
      <aside className="hidden lg:block w-64 shrink-0 border-r border-[#2E2A26] h-screen sticky top-0 shadow-[0_4px_24px_rgba(30,27,24,0.06)]">
        <SidebarContent />
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Barra Superior Institucional */}
        <header className="sticky top-0 z-30 h-16 border-b border-[#E8E1D6] bg-[#FFFDFA]/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shadow-[0_4px_24px_rgba(30,27,24,0.04)]">
          {/* Mobile Drawer Trigger & Breadcrumb */}
          <div className="flex items-center gap-3">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden text-[#1E1B18] hover:bg-[#F4EFE7]"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72 bg-[#1E1B18] border-r-0">
                <SheetHeader className="sr-only">
                  <SheetTitle>Menu de Navegação {nomeCondominio}</SheetTitle>
                </SheetHeader>
                <SidebarContent />
              </SheetContent>
            </Sheet>

            {/* Breadcrumb em Grafite com último item em Indaba Deep */}
            <div className="flex items-center text-xs text-[#6B6259] gap-1.5">
              <span>{breadcrumbs[0]}</span>
              <ChevronRight className="h-3 w-3 text-[#6B6259]" />
              <span className="font-semibold text-[#1E1B18]">{breadcrumbs[1]}</span>
            </div>
          </div>

          {/* Indicadores & Usuário à direita */}
          <div className="flex items-center gap-3">
            {/* Indicador de Conectividade */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] text-[11px] font-medium border ${
                isOnline
                  ? 'bg-[#E39A2B]/10 text-[#1E1B18] border-[#E39A2B]/30'
                  : 'bg-[#C75B39]/10 text-[#C75B39] border-[#C75B39]/30'
              }`}
              title={isOnline ? 'Conexão ativa com a plataforma' : 'Reconectando ao servidor...'}
            >
              {isOnline ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-[#E39A2B]" />
                  <span className="hidden sm:inline">Online</span>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-[#C75B39]" />
                  <span>Reconectando...</span>
                </>
              )}
            </div>

            {/* Selo de Perfil */}
            <Badge
              className={`text-[11px] font-semibold px-2 py-0.5 uppercase tracking-wider shrink-0 text-center rounded-[8px] border ${
                role === 'admin'
                  ? 'bg-[#1E1B18] text-[#FFFDFA] border-[#2E2A26]'
                  : role === 'mesa'
                    ? 'bg-[#E39A2B]/15 text-[#1E1B18] border-[#E39A2B]/40'
                    : 'bg-[#F4EFE7] text-[#1E1B18] border-[#E8E1D6]'
              }`}
            >
              {role === 'admin' ? 'ADMIN' : role === 'mesa' ? 'MESA' : 'MORADOR'}
            </Badge>

            {/* Menu do Usuário */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 border-[#E8E1D6] bg-[#FFFDFA] text-[#1E1B18] hover:bg-[#F4EFE7] rounded-[10px]"
                >
                  <span className="max-w-[120px] truncate text-xs font-semibold">
                    {user?.name || user?.email}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 bg-[#FFFDFA] border-[#E8E1D6] rounded-[12px] shadow-[0_4px_24px_rgba(30,27,24,0.06)] text-[#1E1B18]"
              >
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-xs font-semibold text-[#1E1B18]">{user?.name}</p>
                    <p className="text-[11px] text-[#6B6259]">{user?.email}</p>
                    <p className="text-[11px] font-medium text-[#E39A2B] mt-1">
                      Unidade: {unidadeSelecionada?.tipo_unidade || rotuloUnidade}{' '}
                      {unidadeSelecionada?.identificador || 'Não selecionada'}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[#E8E1D6]" />
                <DropdownMenuItem
                  onClick={() => navigate('/credenciamento')}
                  className="text-xs text-[#1E1B18] focus:bg-[#F4EFE7] focus:text-[#1E1B18]"
                >
                  <UserCheck className="mr-2 h-4 w-4 text-[#6B6259]" /> Situação Cadastral
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate('/recibo')}
                  className="text-xs text-[#1E1B18] focus:bg-[#F4EFE7] focus:text-[#1E1B18]"
                >
                  <Receipt className="mr-2 h-4 w-4 text-[#6B6259]" /> Comprovantes de Voto
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[#E8E1D6]" />
                <DropdownMenuItem
                  onClick={logout}
                  className="text-xs text-[#C75B39] focus:bg-[#C75B39]/10 focus:text-[#C75B39]"
                >
                  <LogOut className="mr-2 h-4 w-4 text-[#C75B39]" /> Encerrar Sessão
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Corpo da Página (Fundo Areia #F4EFE7 com cartões em Papel #FFFDFA) */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-[1200px]">
            {/* Banner contextual de status da votação persistente */}
            <VotingStatusBar
              deliberacao={deliberacaoAtiva}
              jaVotou={jaVotou}
              isPresencial={isPresencial}
            />

            {/* Cabeçalho da Página com Título e Subtítulo */}
            {(title || subtitle) && (
              <div className="mb-6">
                {title && (
                  <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#1E1B18]">
                    {title}
                  </h1>
                )}
                {subtitle && <p className="text-sm text-[#6B6259] mt-1">{subtitle}</p>}
              </div>
            )}

            {/* Conteúdo Injetado */}
            {children}
          </div>
        </main>

        {/* Rodapé Institucional Indaba */}
        <footer className="border-t border-[#E8E1D6] bg-[#1E1B18] py-4 px-6 text-center text-xs text-[#E8E1D6]">
          <div className="mx-auto max-w-[1200px] flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <IndabaLogo size={20} variant="negative" />
              <p className="text-[#E8E1D6]/80 text-[11px] text-left">
                Assembleia {nomeCondominio} — apuração conferida e auditada pela mesa diretora.
              </p>
            </div>
            <p className="text-[#E8E1D6]/60 text-[11px]">
              Sigilo criptográfico SHA-256 • Conformidade com a LGPD (Lei nº 13.709/2018).
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}
export default AppLayout
