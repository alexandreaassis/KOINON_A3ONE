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
import { IndabaSymbol } from '@/components/brand/IndabaSymbol'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
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
  UserCheck,
  ChevronRight,
  Settings,
  SlidersHorizontal,
  Contact,
  FileText,
  FolderArchive,
} from 'lucide-react'
import { useCondoConfig } from '@/context/CondoConfigContext'

interface AppLayoutProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
}

// Chave e memória persistente para a rolagem do menu lateral
const SIDEBAR_SCROLL_STORAGE_KEY = 'indaba_sidebar_scroll_top'
let memoriaSidebarScrollTop = 0
try {
  const salvo = sessionStorage.getItem(SIDEBAR_SCROLL_STORAGE_KEY)
  if (salvo) memoriaSidebarScrollTop = Number(salvo) || 0
} catch {
  /* ignore */
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

  // Estado de sidebar colapsada persistido no localStorage
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('indaba_sidebar_collapsed') === 'true'
    } catch {
      return false
    }
  })

  // Ref e persistência de rolagem do menu lateral para evitar qualquer salto/auto-scroll
  const desktopNavRef = React.useRef<HTMLDivElement | null>(null)

  const handleSidebarScroll = (e: React.UIEvent<HTMLDivElement>) => {
    memoriaSidebarScrollTop = e.currentTarget.scrollTop
    try {
      sessionStorage.setItem(SIDEBAR_SCROLL_STORAGE_KEY, String(memoriaSidebarScrollTop))
    } catch {
      /* ignore */
    }
  }

  const setDesktopNavRef = React.useCallback((node: HTMLDivElement | null) => {
    if (node) {
      node.scrollTop = memoriaSidebarScrollTop
    }
    desktopNavRef.current = node
  }, [])

  // Preserva a posição de rolagem do menu lateral na troca de rotas sem qualquer animação ou salto
  React.useLayoutEffect(() => {
    if (desktopNavRef.current) {
      desktopNavRef.current.scrollTop = memoriaSidebarScrollTop
    }
  }, [location.pathname, collapsed])

  const alternarCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem('indaba_sidebar_collapsed', String(next))
      } catch {
        /* intentionally ignored */
      }
      return next
    })
  }

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
    { label: 'Cadastros da Unidade', path: '/admin/cadastros', icon: Contact },
    { label: 'Deliberações e Pautas', path: '/mesa/deliberacoes', icon: FileSpreadsheet },
    { label: 'Auditoria e Urna', path: '/mesa/auditoria', icon: History },
  ]

  const navAdmin = [
    { label: 'Configurações do Condomínio', path: '/admin/configuracoes', icon: Settings },
    { label: 'Cadastros da Unidade', path: '/admin/cadastros', icon: Contact },
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
    if (p === '/admin/cadastros') return ['Administração', 'Cadastros da Unidade']
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

  // Renderizador de item de menu com suporte a modo colapsado e tooltip
  const renderNavItem = (
    item: { label: string; path: string; icon: React.ComponentType<{ className?: string }> },
    isCollapsed: boolean,
    onNavigate?: () => void,
  ) => {
    const isActive = location.pathname === item.path
    const Icon = item.icon

    const linkContent = (
      <Link
        key={item.path}
        to={item.path}
        preventScrollReset={true}
        onClick={onNavigate}
        className={`relative flex items-center rounded-[10px] text-xs font-medium transition-colors ${
          isCollapsed ? 'justify-center p-2.5 mx-auto' : 'gap-3 px-3 py-2'
        } ${
          isActive
            ? `bg-[#2A2622] text-[#FFFDFA] font-semibold ${
                isCollapsed
                  ? 'border-l-[3px] border-l-[#E39A2B] rounded-l-none'
                  : 'border-l-[3px] border-l-[#E39A2B] rounded-l-none'
              }`
            : 'text-[#E8E1D6]/80 hover:bg-[#2A2622]/60 hover:text-[#FFFDFA]'
        }`}
      >
        <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-[#E39A2B]' : 'text-[#6B6259]'}`} />
        {!isCollapsed && <span className="truncate">{item.label}</span>}
      </Link>
    )

    if (isCollapsed) {
      return (
        <Tooltip key={item.path} delayDuration={150}>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent
            side="right"
            className="bg-[#1E1B18] text-[#FFFDFA] border-[#2E2A26] text-xs font-semibold px-2.5 py-1 rounded-[8px] shadow-lg z-50"
          >
            {item.label}
          </TooltipContent>
        </Tooltip>
      )
    }

    return linkContent
  }

  // Componente de Conteúdo da Sidebar (compartilhado entre desktop e mobile)
  const SidebarContent = ({
    isCollapsed = false,
    navRef,
    onScroll,
  }: {
    isCollapsed?: boolean
    navRef?: (node: HTMLDivElement | null) => void
    onScroll?: (e: React.UIEvent<HTMLDivElement>) => void
  }) => {
    // Regras de visibilidade por perfil:
    // - morador vê Módulo do Morador
    // - mesa vê Módulo da Mesa
    // - admin (administrador geral) vê Morador, Mesa e Administração
    const mostrarMorador = role === 'morador' || role === 'admin' || (!role && !isAdmin)
    const mostrarMesa = role === 'mesa' || role === 'admin'
    const mostrarAdmin = role === 'admin'

    return (
      <div className="flex h-full flex-col justify-between bg-[#1E1B18] text-[#E8E1D6] select-none">
        <div ref={navRef} onScroll={onScroll} className="overflow-y-auto overflow-x-hidden">
          {/* Brand Header com Logotipo Indaba Negativo no topo da Sidebar e Botão de Colapso */}
          <div
            className={`border-b border-[#2E2A26] flex items-center justify-between ${
              isCollapsed ? 'p-3 flex-col gap-2' : 'px-4 py-4'
            }`}
          >
            {isCollapsed ? (
              <Tooltip delayDuration={150}>
                <TooltipTrigger asChild>
                  <Link
                    to="/"
                    className="flex items-center justify-center p-1 rounded hover:opacity-90"
                  >
                    <IndabaSymbol size={28} variant="negative" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  className="bg-[#1E1B18] text-[#FFFDFA] border-[#2E2A26] text-xs font-semibold px-2.5 py-1 rounded-[8px]"
                >
                  Indaba — {nomeCondominio}
                </TooltipContent>
              </Tooltip>
            ) : (
              <div className="truncate flex-1 min-w-0">
                <IndabaLogo size={26} variant="negative" subtitle={nomeCondominio} />
              </div>
            )}

            {/* Botão de Alternar Colapso da Barra Lateral (Desktop apenas, SVG inline padrão da marca) */}
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={alternarCollapse}
                  aria-label={isCollapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
                  className="hidden lg:flex items-center justify-center h-7 w-7 rounded-[8px] text-[#6B6259] hover:text-[#FFFDFA] hover:bg-[#2A2622] transition-colors shrink-0"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="shrink-0"
                    aria-hidden="true"
                  >
                    <rect
                      x="1.5"
                      y="2"
                      width="13"
                      height="12"
                      rx="2.5"
                      stroke="currentColor"
                      strokeWidth="1.3"
                    />
                    <line
                      x1="5.5"
                      y1="2"
                      x2="5.5"
                      y2="14"
                      stroke="currentColor"
                      strokeWidth="1.3"
                    />
                    {isCollapsed ? (
                      <path
                        d="M8.5 6L10.5 8L8.5 10"
                        stroke="currentColor"
                        strokeWidth="1.3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ) : (
                      <path
                        d="M10.5 6L8.5 8L10.5 10"
                        stroke="currentColor"
                        strokeWidth="1.3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}
                  </svg>
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                className="bg-[#1E1B18] text-[#FFFDFA] border-[#2E2A26] text-xs font-semibold px-2.5 py-1 rounded-[8px]"
              >
                {isCollapsed ? 'Expandir menu lateral' : 'Recolher para ícones'}
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Seletor de Unidade Ativa */}
          {unidadesDisponiveis.length > 0 && !isCollapsed && (
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
                      {u.tipo_unidade || rotuloUnidade} {u.identificador} (
                      {u.bloco || nomeCondominio})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Links de navegação filtrados estritamente por perfil */}
          <div className={`py-4 ${isCollapsed ? 'px-1.5 space-y-4' : 'px-3 space-y-5'}`}>
            {/* Módulo do Morador: Apenas para moradores ou morador autenticado */}
            {mostrarMorador && (
              <div>
                {!isCollapsed && (
                  <div className="px-3 text-[11px] font-medium uppercase tracking-[0.04em] text-[#6B6259] mb-2">
                    Módulo do Morador
                  </div>
                )}
                <nav className="space-y-1">
                  {navMorador.map((item) =>
                    renderNavItem(item, isCollapsed, () => setMobileMenuOpen(false)),
                  )}
                </nav>
              </div>
            )}

            {/* Módulo da Mesa: Apenas para membros da mesa e administradores */}
            {mostrarMesa && (
              <div>
                {!isCollapsed && (
                  <div className="px-3 flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.04em] text-[#6B6259] mb-2">
                    <span>Módulo da Mesa</span>
                    {role === 'mesa' && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-[8px] bg-[#E39A2B]/20 text-[#E39A2B] font-semibold">
                        Operador
                      </span>
                    )}
                  </div>
                )}
                <nav className="space-y-1">
                  {navMesa.map((item) =>
                    renderNavItem(item, isCollapsed, () => setMobileMenuOpen(false)),
                  )}
                </nav>
              </div>
            )}

            {/* Módulo de Administração: Rigorosamente restrito ao Perfil Admin */}
            {mostrarAdmin && (
              <div>
                {!isCollapsed && (
                  <div className="px-3 flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.04em] text-[#6B6259] mb-2">
                    <span>Administração</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-[8px] bg-[#2E2A26] text-[#E8E1D6] font-semibold">
                      Admin
                    </span>
                  </div>
                )}
                <nav className="space-y-1">
                  {navAdmin.map((item) =>
                    renderNavItem(item, isCollapsed, () => setMobileMenuOpen(false)),
                  )}
                </nav>
              </div>
            )}
          </div>
        </div>

        {/* Bloco do usuário no rodapé da Sidebar: avatar circular, nome e cargo */}
        <div className="p-2.5 border-t border-[#2E2A26] bg-[#171412]">
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-2 py-1">
              <Tooltip delayDuration={150}>
                <TooltipTrigger asChild>
                  <div className="h-9 w-9 rounded-full bg-[#2A2622] border border-[#2E2A26] flex items-center justify-center text-[#E39A2B] font-semibold text-xs cursor-pointer">
                    {getIniciais(user?.name || user?.email)}
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  className="bg-[#1E1B18] text-[#FFFDFA] border-[#2E2A26] text-xs p-2 rounded-[8px] shadow-lg"
                >
                  <p className="font-semibold text-xs text-[#FFFDFA]">
                    {user?.name || user?.email}
                  </p>
                  <p className="text-[10px] text-[#6B6259]">
                    {role === 'admin'
                      ? 'Administrador Geral'
                      : role === 'mesa'
                        ? 'Membro da Mesa'
                        : `Condômino ${unidadeSelecionada?.tipo_unidade || rotuloUnidade} ${unidadeSelecionada?.identificador || '—'}`}
                  </p>
                </TooltipContent>
              </Tooltip>

              <Tooltip delayDuration={150}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={logout}
                    aria-label="Sair da plataforma"
                    className="text-[#6B6259] hover:text-[#FFFDFA] hover:bg-[#2A2622] h-7 w-7 rounded-[8px] flex items-center justify-center transition-colors"
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="shrink-0"
                      aria-hidden="true"
                    >
                      <path
                        d="M6 14H3.33333C2.97971 14 2.64057 13.8595 2.39052 13.6095C2.14048 13.3594 2 13.0203 2 12.6667V3.33333C2 2.97971 2.14048 2.64057 2.39052 2.39052C2.64057 2.14048 2.97971 2 3.33333 2H6"
                        stroke="currentColor"
                        strokeWidth="1.3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M10.6667 11.3333L14 8L10.6667 4.66667"
                        stroke="currentColor"
                        strokeWidth="1.3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M14 8H6"
                        stroke="currentColor"
                        strokeWidth="1.3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  className="bg-[#1E1B18] text-[#FFFDFA] border-[#2E2A26] text-xs font-semibold px-2 py-1 rounded-[8px]"
                >
                  Sair
                </TooltipContent>
              </Tooltip>
            </div>
          ) : (
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
              <button
                type="button"
                onClick={logout}
                title="Sair da plataforma"
                aria-label="Sair da plataforma"
                className="text-[#6B6259] hover:text-[#FFFDFA] hover:bg-[#2A2622] h-8 w-8 rounded-[10px] shrink-0 flex items-center justify-center transition-colors"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="shrink-0"
                  aria-hidden="true"
                >
                  <path
                    d="M6 14H3.33333C2.97971 14 2.64057 13.8595 2.39052 13.6095C2.14048 13.3594 2 13.0203 2 12.6667V3.33333C2 2.97971 2.14048 2.64057 2.39052 2.39052C2.64057 2.14048 2.97971 2 3.33333 2H6"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M10.6667 11.3333L14 8L10.6667 4.66667"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M14 8H6"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-[#F4EFE7] text-[#1E1B18]">
      {/* Alerta de Conexão Indaba */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-[#C75B39] text-[#FFFDFA] text-xs font-semibold py-2 px-4 text-center shadow-md flex items-center justify-center gap-2">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="shrink-0"
          >
            <path
              d="M1 1L15 15M11.1333 4.86667C12.4497 6.18305 13.2929 7.89286 13.5606 9.73426M1.46667 6.26667C2.46325 5.27008 3.69342 4.54284 5.04412 4.14498M4.2 9.8C4.94586 9.05414 5.92211 8.57143 6.96914 8.42398M11.8 9.8C11.3957 9.39572 10.9169 9.07663 10.3908 8.85764M8 13.3333H8.00667"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>
            Conexão interrompida com o servidor. Ações de voto aguardam restabelecimento da rede.
          </span>
        </div>
      )}

      {/* Desktop Sidebar com largura dinâmica (w-64 expandida ou w-[68px] colapsada) */}
      <aside
        className={`hidden lg:block shrink-0 border-r border-[#2E2A26] h-screen sticky top-0 shadow-[0_4px_24px_rgba(30,27,24,0.06)] transition-[width] duration-200 ease-in-out ${
          collapsed ? 'w-[68px]' : 'w-64'
        }`}
      >
        <SidebarContent
          isCollapsed={collapsed}
          navRef={setDesktopNavRef}
          onScroll={handleSidebarScroll}
        />
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
