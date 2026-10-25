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
import {
  Droplets,
  Menu,
  LogOut,
  Home,
  Vote,
  FileCheck2,
  Receipt,
  Users,
  ShieldCheck,
  FileSpreadsheet,
  History,
  Wifi,
  WifiOff,
  UserCheck,
  ChevronRight,
  Settings,
  ShieldAlert,
  SlidersHorizontal,
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
    isMesaOuAdmin,
    unidadeSelecionada,
    unidadesDisponiveis,
    selecionarUnidade,
    logout,
    isOnline,
  } = useAuth()
  const { nomeCondominio, logoUrl, rotuloUnidade } = useCondoConfig()
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
          // Checar se já votou
          const comp = await api.getComparecimento(delib.id, unidadeSelecionada.id)
          if (!ativo) return
          setJaVotou(!!comp)

          // Checar reconciliação física presencial
          const presencas = await api.getPresencas(delib.id)
          if (!ativo) return
          const temPresencial = presencas.some(
            (p) => p.unidade === unidadeSelecionada.id && p.tipo === 'presencial',
          )
          setIsPresencial(temPresencial)
        }
      } catch (err) {
        console.error('Erro ao verificar status da deliberação:', err)
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
    { label: 'Credenciamento', path: '/credenciamento', icon: UserCheck },
    { label: 'Cabine de Votação', path: '/votacao', icon: Vote },
    { label: 'Meus Recibos', path: '/recibo', icon: Receipt },
  ]

  const navMesa = [
    { label: 'Painel da Mesa', path: '/mesa', icon: ShieldCheck },
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
    if (p === '/mesa/credenciamentos') return ['Mesa Diretora', 'Credenciais']
    if (p === '/mesa/deliberacoes') return ['Mesa Diretora', 'Deliberações']
    if (p === '/mesa/auditoria') return ['Mesa Diretora', 'Auditoria & Boletim']
    if (p === '/admin/configuracoes') return ['Administração', 'Configurações']
    if (p === '/admin/usuarios') return ['Administração', 'Usuários']
    if (p === '/admin/parametros') return ['Administração', 'Parâmetros Globais']
    return ['Sistema', nomeCondominio]
  }

  const breadcrumbs = getBreadcrumbs()

  const SidebarContent = () => (
    <div className="flex h-full flex-col justify-between bg-slate-900 text-slate-100">
      <div>
        {/* Brand Header com Logo Dinâmico */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-900/40 overflow-hidden shrink-0">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={nomeCondominio}
                className="h-full w-full object-contain p-1"
              />
            ) : (
              <Droplets className="h-6 w-6 text-cyan-200" />
            )}
          </div>
          <div className="leading-tight min-w-0 flex-1">
            <span
              className="font-bold text-sm text-white tracking-wide block truncate"
              title={nomeCondominio}
            >
              {nomeCondominio}
            </span>
            <span className="text-[10px] font-medium text-cyan-400 uppercase tracking-wider block">
              Votação Condominial
            </span>
          </div>
        </div>

        {/* Seletor de Unidade Ativa */}
        {unidadesDisponiveis.length > 0 && (
          <div className="p-3 border-b border-slate-800/80 bg-slate-950/40">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-1 px-1">
              Unidade Ativa
            </div>
            <Select
              value={unidadeSelecionada?.id || ''}
              onValueChange={(val) => {
                const u = unidadesDisponiveis.find((item) => item.id === val)
                if (u) selecionarUnidade(u)
              }}
            >
              <SelectTrigger className="w-full bg-slate-900 border-slate-700 text-xs text-slate-200 h-9">
                <SelectValue placeholder="Selecione sua unidade" />
              </SelectTrigger>
              <SelectContent className="max-h-64 bg-slate-900 text-slate-100 border-slate-700">
                {unidadesDisponiveis.map((u) => (
                  <SelectItem
                    key={u.id}
                    value={u.id}
                    className="text-xs focus:bg-cyan-950 focus:text-cyan-200"
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
            <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
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
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-cyan-700 text-white shadow-xs font-semibold'
                        : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-cyan-300" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Módulo da Mesa (visível com destaque se role === mesa) */}
          <div>
            <div className="px-3 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-amber-400 mb-2">
              <span>Módulo da Mesa</span>
              {role === 'mesa' && (
                <Badge
                  variant="outline"
                  className="text-[9px] px-1 py-0 border-amber-500/50 text-amber-300"
                >
                  Operador
                </Badge>
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
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-amber-600 text-white shadow-xs font-semibold'
                        : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-amber-300" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Módulo de Administração (visível para admin ou mesa administradora) */}
          {(isAdmin || role === 'mesa') && (
            <div>
              <div className="px-3 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-purple-400 mb-2">
                <span>Administração</span>
                <Badge
                  variant="outline"
                  className="text-[9px] px-1 py-0 border-purple-500/50 text-purple-300"
                >
                  Admin
                </Badge>
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
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-purple-700 text-white shadow-xs font-semibold'
                          : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0 text-purple-300" />
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </nav>
            </div>
          )}
        </div>
      </div>

      {/* Perfil & Logout no rodapé da Sidebar */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/30">
        <div className="flex items-center justify-between gap-2 px-2 py-1.5">
          <div className="truncate">
            <p className="text-xs font-medium text-white truncate">{user?.name || user?.email}</p>
            <p className="text-[10px] text-slate-400 truncate">
              {role === 'admin'
                ? 'Administrador Geral'
                : role === 'mesa'
                  ? 'Membro da Mesa'
                  : `Condômino ${unidadeSelecionada?.tipo_unidade || rotuloUnidade} ${unidadeSelecionada?.identificador || '—'}`}
            </p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={logout}
            title="Sair do sistema"
            className="text-slate-400 hover:text-white hover:bg-slate-800 h-8 w-8"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Offline Alert Overlay (não bloqueante para leitura) */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white text-xs font-medium py-1.5 px-4 text-center shadow-md flex items-center justify-center gap-2">
          <WifiOff className="h-4 w-4 animate-bounce" />
          <span>
            Modo Offline: reconectando ao servidor {nomeCondominio}... Voto temporariamente
            desabilitado.
          </span>
        </div>
      )}

      {/* Desktop Sidebar (Fixa à esquerda) */}
      <aside className="hidden lg:block w-64 shrink-0 border-r border-slate-800 h-screen sticky top-0 shadow-lg">
        <SidebarContent />
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Barra Superior */}
        <header className="sticky top-0 z-30 h-16 border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shadow-xs">
          {/* Mobile Drawer Trigger & Breadcrumb */}
          <div className="flex items-center gap-3">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden text-slate-700">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72 bg-slate-900 border-r-0">
                <SheetHeader className="sr-only">
                  <SheetTitle>Menu de Navegação {nomeCondominio}</SheetTitle>
                </SheetHeader>
                <SidebarContent />
              </SheetContent>
            </Sheet>

            {/* Breadcrumb */}
            <div className="flex items-center text-xs text-slate-500 gap-1.5">
              <span>{breadcrumbs[0]}</span>
              <ChevronRight className="h-3 w-3 text-slate-400" />
              <span className="font-semibold text-slate-800">{breadcrumbs[1]}</span>
            </div>
          </div>

          {/* Indicadores & Usuário à direita */}
          <div className="flex items-center gap-3">
            {/* Indicador de Conectividade */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                isOnline
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
              title={isOnline ? 'Conexão ativa com o Skip Cloud' : 'Tentando reconectar...'}
            >
              {isOnline ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="hidden sm:inline">Online</span>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <span>Reconectando...</span>
                </>
              )}
            </div>

            {/* Badge de Perfil */}
            <Badge
              className={`text-[11px] font-bold px-2 py-0.5 uppercase tracking-wider shrink-0 text-center leading-normal ${
                role === 'admin'
                  ? 'bg-purple-700 text-white hover:bg-purple-800'
                  : role === 'mesa'
                    ? 'bg-amber-600 text-white hover:bg-amber-700'
                    : 'bg-cyan-700 text-white hover:bg-cyan-800'
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
                  className="gap-2 border-slate-200 text-slate-700"
                >
                  <span className="max-w-[120px] truncate text-xs font-semibold">
                    {user?.name || user?.email}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-xs font-medium leading-none text-slate-900">{user?.name}</p>
                    <p className="text-[11px] leading-none text-slate-500">{user?.email}</p>
                    <p className="text-[11px] font-semibold text-cyan-700">
                      Unidade: {unidadeSelecionada?.tipo_unidade || rotuloUnidade}{' '}
                      {unidadeSelecionada?.identificador || 'Não selecionada'}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/credenciamento')}>
                  <UserCheck className="mr-2 h-4 w-4" /> Situação Cadastral
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/recibo')}>
                  <Receipt className="mr-2 h-4 w-4" /> Comprovantes de Voto
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-700">
                  <LogOut className="mr-2 h-4 w-4" /> Encerrar Sessão
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Corpo da Página */}
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
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
                )}
                {subtitle && <p className="text-sm text-slate-600 mt-1">{subtitle}</p>}
              </div>
            )}

            {/* Conteúdo Injetado */}
            {children}
          </div>
        </main>

        {/* Rodapé Compacto com alinhamento LGPD */}
        <footer className="border-t border-slate-200 bg-white py-4 px-6 text-center text-xs text-slate-500">
          <div className="mx-auto max-w-[1200px] flex flex-col sm:flex-row items-center justify-between gap-2">
            <p>
              Assembleia Eletrônica {nomeCondominio} — apuração conferida e auditada pela mesa
              diretora.
            </p>
            <p className="text-slate-400 text-[11px]">
              Sigilo de cédula criptografado SHA-256 • Em conformidade com a LGPD (Lei nº
              13.709/2018).
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}
export default AppLayout
