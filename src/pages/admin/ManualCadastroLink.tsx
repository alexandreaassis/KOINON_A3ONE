import React from 'react'
import { useNavigate } from 'react-router-dom'
import { KoinonSymbol } from '@/components/brand/KoinonSymbol'
import { EndossoA3One } from '@/components/brand/EndossoA3One'
import { Button } from '@/components/ui/button'
import {
  Printer,
  ArrowLeft,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  FileText,
  ShieldCheck,
  Users,
  Building,
  Share2,
  MessageCircle,
  Mail,
  Copy,
  ExternalLink,
  UserCheck,
  FileCheck2,
  Clock,
  LogOut,
  XCircle,
  HelpCircle,
  Lock,
  Smartphone,
  AlertCircle,
  UserPlus,
} from 'lucide-react'

/**
 * Badge de destaque numerado para sobreposição nas ilustrações da tela
 */
const DestaqueNumero: React.FC<{
  numero: number | string
  cor?: 'azul' | 'marinho' | 'verde' | 'ambar' | 'vermelho'
  className?: string
  titulo?: string
}> = ({ numero, cor = 'azul', className = '', titulo }) => {
  const cores = {
    azul: 'bg-[#0066FF] text-white border-2 border-white shadow-md ring-2 ring-[#0066FF]/30',
    marinho: 'bg-[#002B5E] text-white border-2 border-white shadow-md ring-2 ring-[#002B5E]/30',
    verde: 'bg-[#10B981] text-white border-2 border-white shadow-md ring-2 ring-[#10B981]/30',
    ambar: 'bg-[#F59E0B] text-white border-2 border-white shadow-md ring-2 ring-[#F59E0B]/30',
    vermelho: 'bg-[#EF4444] text-white border-2 border-white shadow-md ring-2 ring-[#EF4444]/30',
  }

  return (
    <span
      title={titulo}
      className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs select-none shrink-0 ${cores[cor]} ${className}`}
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      {numero}
    </span>
  )
}

/**
 * Caixa de Alerta IMPORTANTE (Âmbar)
 */
const CaixaImportante: React.FC<{ children: React.ReactNode; titulo?: string }> = ({
  children,
  titulo = 'IMPORTANTE',
}) => (
  <div className="my-2.5 p-3 rounded-lg bg-amber-50/90 border-l-4 border-amber-500 border border-amber-200 text-slate-800 text-xs">
    <div className="flex items-center gap-1.5 font-bold text-amber-900 mb-1">
      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
      <span className="uppercase tracking-wide text-[11px]">{titulo}</span>
    </div>
    <div className="text-slate-700 leading-relaxed text-[11px]">{children}</div>
  </div>
)

/**
 * Caixa de Alerta DICA (Azul Claro)
 */
const CaixaDica: React.FC<{ children: React.ReactNode; titulo?: string }> = ({
  children,
  titulo = 'DICA PRÁTICA',
}) => (
  <div className="my-2.5 p-3 rounded-lg bg-[#F3F7FC] border-l-4 border-[#0066FF] border border-[#D5DCE5] text-slate-800 text-xs">
    <div className="flex items-center gap-1.5 font-bold text-[#002B5E] mb-1">
      <Lightbulb className="h-4 w-4 text-[#0066FF] shrink-0" />
      <span className="uppercase tracking-wide text-[11px]">{titulo}</span>
    </div>
    <div className="text-slate-700 leading-relaxed text-[11px]">{children}</div>
  </div>
)

/**
 * Caixa de Erro Comum / Regra Crítica (Vermelho)
 */
const CaixaErro: React.FC<{ children: React.ReactNode; titulo?: string }> = ({
  children,
  titulo = 'ATENÇÃO — ERRO COMUM / BLOQUEIO',
}) => (
  <div className="my-2.5 p-3 rounded-lg bg-red-50/90 border-l-4 border-red-500 border border-red-200 text-slate-800 text-xs">
    <div className="flex items-center gap-1.5 font-bold text-red-900 mb-1">
      <XCircle className="h-4 w-4 text-red-600 shrink-0" />
      <span className="uppercase tracking-wide text-[11px]">{titulo}</span>
    </div>
    <div className="text-slate-700 leading-relaxed text-[11px]">{children}</div>
  </div>
)

/**
 * Rodapé padrão das páginas A4 do Manual
 */
const RodapeManual: React.FC<{ pagina: number; totalPaginas?: number }> = ({
  pagina,
  totalPaginas = 4,
}) => (
  <footer className="mt-auto pt-3 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500 font-sans print:pt-2">
    <div className="flex items-center gap-2">
      <span className="font-semibold text-[#002B5E]">Plataforma Virtual Koinon</span>
      <span className="text-slate-300">•</span>
      <span className="text-slate-500">Autoatendimento e Credenciamento por Link</span>
    </div>
    <div className="flex items-center gap-4">
      <EndossoA3One variant="color" layout="inline" />
      <span className="font-mono text-slate-400 font-semibold">
        Pág. {pagina} de {totalPaginas}
      </span>
    </div>
  </footer>
)

/**
 * Cabeçalho de página interna do manual
 */
const CabecalhoPaginaManual: React.FC<{
  secaoNumero: string
  secaoTitulo: string
}> = ({ secaoNumero, secaoTitulo }) => (
  <header className="border-b-2 border-[#002B5E] pb-2.5 mb-3.5 flex items-center justify-between font-sans">
    <div className="flex items-center gap-2.5">
      <KoinonSymbol size={26} variant="color" />
      <div>
        <span className="text-[9px] uppercase tracking-widest font-bold text-[#0066FF] block">
          Manual de Operação • Cadastro por Link da Unidade
        </span>
        <h2 className="text-sm font-bold text-[#002B5E] uppercase tracking-tight">
          {secaoNumero} — {secaoTitulo}
        </h2>
      </div>
    </div>
    <div className="text-right text-[10px] font-sans text-slate-500">
      <span className="font-semibold text-slate-700">Módulo de Gestão de Cadastros</span>
      <br />
      <span>
        Rotas: <code className="font-mono text-[#0066FF]">/admin/cadastros</code> e{' '}
        <code className="font-mono text-[#0066FF]">/cadastro/:token</code>
      </span>
    </div>
  </header>
)

export const ManualCadastroLinkPage: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-100 py-6 print:py-0 print:bg-white text-slate-900 font-sans antialiased">
      {/* Barra de Ações Superior (Oculta na Impressão) */}
      <div className="max-w-[850px] mx-auto mb-4 px-4 flex items-center justify-between print:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/admin/cadastros')}
          className="text-xs h-8 gap-1.5 bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar a Cadastros por Unidade
        </Button>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            Layout A4 • 4 Páginas Otimizadas
          </span>
          <Button
            size="sm"
            onClick={() => window.print()}
            className="bg-[#0066FF] hover:bg-[#0052cc] text-white text-xs h-8 gap-1.5 shadow-sm font-medium"
          >
            <Printer className="h-3.5 w-3.5" /> Imprimir / Salvar em PDF (Ctrl+P)
          </Button>
        </div>
      </div>

      {/* CONTAINER PRINCIPAL A4 COM AS PÁGINAS DO MANUAL */}
      <div className="max-w-[850px] mx-auto space-y-8 print:space-y-0">
        {/* ========================================================================= */}
        {/* PÁGINA 1: CAPA OFICIAL KOINON + APRESENTAÇÃO + SUMÁRIO OPERACIONAL        */}
        {/* ========================================================================= */}
        <article className="bg-[#002B5E] text-white p-10 sm:p-14 border border-slate-300 print:border-none print:shadow-none shadow-md rounded-lg print:rounded-none min-h-[1120px] flex flex-col justify-between print:min-h-screen print:page-break-after-always">
          {/* Topo da Capa */}
          <div className="flex items-center justify-between border-b border-white/20 pb-5">
            <div className="flex items-center gap-3">
              <KoinonSymbol size={46} variant="on-navy" />
              <div>
                <div className="font-semibold text-2xl tracking-tight leading-none text-white">
                  <span>K</span>
                  <span>o</span>
                  <span style={{ color: '#0066FF' }}>i</span>
                  <span>n</span>
                  <span>o</span>
                  <span>n</span>
                </div>
                <span className="text-[10px] text-blue-200 tracking-wider uppercase block mt-0.5">
                  Plataforma de Governança e Assembleia Híbrida
                </span>
              </div>
            </div>
            <div className="text-right text-[11px] text-blue-200 font-sans">
              <span className="px-2.5 py-1 rounded-full bg-white/10 text-white font-semibold text-[10px] border border-white/20">
                GUIA OFICIAL DE CADASTRO
              </span>
            </div>
          </div>

          {/* Miolo da Capa: Título e Identidade */}
          <div className="my-auto py-8 space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#0066FF]/30 border border-[#0066FF] text-blue-100 text-xs font-semibold tracking-wide uppercase">
                <Share2 className="h-4 w-4 text-[#0066FF]" /> Autoatendimento Seguro por Token
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                Manual do Cadastro da Unidade por Link Exclusivo
              </h1>
              <p className="text-sm sm:text-base text-blue-100 max-w-2xl leading-relaxed font-normal">
                Guia completo e ilustrado para a mesa diretora e administração: geração e envio do
                link via WhatsApp Web e e-mail, preenchimento público pelo morador, declaração legal
                dinâmica (Código Civil e Lei do Inquilinato), assinatura eletrônica qualificada,
                aprovação pela mesa e matriz de bloqueio por unidade.
              </p>
            </div>

            {/* Sumário Operacional */}
            <div className="bg-white/10 backdrop-blur-xs border border-white/20 rounded-xl p-5 text-left text-xs space-y-3.5 max-w-2xl">
              <div className="flex items-center justify-between border-b border-white/20 pb-2">
                <span className="font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#0066FF]" /> Sumário Operacional
                </span>
                <span className="text-[10px] text-blue-200">10 Tópicos em Ordem de Uso</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="flex items-start gap-2 text-blue-50">
                  <span className="w-5 h-5 rounded-full bg-[#0066FF] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <strong className="text-white block">O que é o Cadastro por Link</strong>
                    <span className="text-blue-200 text-[10px]">
                      Token da unidade, capacidade de até 2 vínculos e status pendente
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-blue-50">
                  <span className="w-5 h-5 rounded-full bg-[#10B981] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <strong className="text-white block">Geração e Envio pela Mesa</strong>
                    <span className="text-blue-200 text-[10px]">
                      Modal em /admin/cadastros, WhatsApp (wa.me) e e-mail
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-blue-50">
                  <span className="w-5 h-5 rounded-full bg-[#0066FF] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    <strong className="text-white block">A Página Pública de Cadastro</strong>
                    <span className="text-blue-200 text-[10px]">
                      Identificação da unidade (Apto e bloco opcional) e validação de token
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-blue-50">
                  <span className="w-5 h-5 rounded-full bg-[#F59E0B] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    4
                  </span>
                  <div>
                    <strong className="text-white block">Quem Deve se Cadastrar</strong>
                    <span className="text-blue-200 text-[10px]">
                      Condômino residente, inquilino ou proprietário não morador
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-blue-50">
                  <span className="w-5 h-5 rounded-full bg-[#0066FF] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    5
                  </span>
                  <div>
                    <strong className="text-white block">Preenchimento de Dados Pessoais</strong>
                    <span className="text-blue-200 text-[10px]">
                      Nome, CPF, data de nascimento, telefone com máscara e e-mail
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-blue-50">
                  <span className="w-5 h-5 rounded-full bg-[#0066FF] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    6
                  </span>
                  <div>
                    <strong className="text-white block">Declaração Legal Dinâmica</strong>
                    <span className="text-blue-200 text-[10px]">
                      Lei 8.245/91 (Inquilinato) e Código Civil arts. 1.228 / 1.331 + LGPD
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-blue-50">
                  <span className="w-5 h-5 rounded-full bg-[#002B5E] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 border border-white/40">
                    7
                  </span>
                  <div>
                    <strong className="text-white block">Assinatura Eletrônica e Indicação</strong>
                    <span className="text-blue-200 text-[10px]">
                      Carimbo com data, hora e IP; indicação opcional do outro morador
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-blue-50">
                  <span className="w-5 h-5 rounded-full bg-[#10B981] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    8
                  </span>
                  <div>
                    <strong className="text-white block">Aprovação pela Mesa Diretora</strong>
                    <span className="text-blue-200 text-[10px]">
                      Painel em /mesa/credenciamentos com declaração, IP e liberação de vaga
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-blue-50 sm:col-span-2 border-t border-white/10 pt-2">
                  <span className="w-5 h-5 rounded-full bg-[#EF4444] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    9-10
                  </span>
                  <div>
                    <strong className="text-white block">
                      Matriz de Bloqueio por Unidade & Regras do WhatsApp
                    </strong>
                    <span className="text-blue-200 text-[10px]">
                      Erros comuns e disparos diretos via WhatsApp Web sem dependência de API paga
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Rodapé da Capa com Endosso A3ONE */}
          <div className="border-t border-white/20 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-blue-200">
            <div>
              <span className="font-semibold text-white">Assembleia Eletrônica Lago Azul</span>
              <p className="text-[10px] text-blue-300">
                Homologação e apuração sob fé pública da Mesa Diretora • Código Civil Brasileiro
              </p>
            </div>
            <EndossoA3One variant="on-navy" layout="inline" />
          </div>
        </article>

        {/* ========================================================================= */}
        {/* PÁGINA 2: SEÇÃO 1 (CONCEITO) + SEÇÃO 2 (MODAL MESA) + REGRAS WHATSAPP     */}
        {/* ========================================================================= */}
        <article className="bg-white p-8 sm:p-12 border border-slate-300 print:border-none print:shadow-none shadow-md rounded-lg print:rounded-none min-h-[1120px] flex flex-col justify-between print:min-h-screen print:page-break-after-always">
          <div>
            <CabecalhoPaginaManual
              secaoNumero="Seções 1 e 2"
              secaoTitulo="Conceito do Cadastro e Geração de Link pela Mesa Diretora"
            />

            {/* SEÇÃO 1: O QUE É O CADASTRO POR LINK */}
            <div className="mb-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#002B5E] flex items-center gap-1.5 mb-2">
                <DestaqueNumero numero={1} cor="marinho" />
                <span>1. O que é o Cadastro por Link e Regras da Unidade</span>
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed mb-2">
                O cadastro por link é uma página pública segura da plataforma Koinon que permite ao
                morador preencher seus próprios dados cadastrais e assinar digitalmente a declaração
                de vínculo utilizando o token exclusivo de sua unidade autônoma.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2 text-[11px]">
                <div className="p-2 rounded bg-slate-50 border border-slate-200">
                  <strong className="text-[#002B5E] block">Regra da Capacidade</strong>
                  <span className="text-slate-600">
                    Até 2 pessoas ativas: <strong>1 Morador</strong> (Condômino ou Inquilino) +{' '}
                    <strong>1 Proprietário</strong> (não morador).
                  </span>
                </div>
                <div className="p-2 rounded bg-slate-50 border border-slate-200">
                  <strong className="text-[#002B5E] block">Definição de Morador</strong>
                  <span className="text-slate-600">
                    Morador = <strong>Condômino residente</strong> ou <strong>Inquilino</strong>{' '}
                    residente.
                  </span>
                </div>
                <div className="p-2 rounded bg-slate-50 border border-slate-200">
                  <strong className="text-[#002B5E] block">Bloco é Opcional</strong>
                  <span className="text-slate-600">
                    Condomínios de torre única não possuem bloco; o sistema exibe apenas o
                    apartamento.
                  </span>
                </div>
              </div>
            </div>

            {/* SEÇÃO 2: ONDE A MESA GERA E ENVIA O LINK */}
            <div className="mb-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#002B5E] flex items-center gap-1.5 mb-2">
                <DestaqueNumero numero={2} cor="azul" />
                <span>2. Onde a Mesa Gera e Envia o Link (/admin/cadastros)</span>
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed mb-2">
                No menu administrativo, em <code>/admin/cadastros</code>, o botão{' '}
                <strong>"Link de Cadastro"</strong> no cabeçalho ou o ícone de link em cada linha da
                tabela abre o modal de compartilhamento oficial com WhatsApp, e-mail e cópia direta.
              </p>

              {/* MOCKUP 1: MODAL DE GERAÇÃO E ENVIO DO LINK */}
              <div className="border border-[#D5DCE5] rounded-lg p-3.5 bg-slate-50/80 mb-2 relative">
                <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs space-y-3">
                  {/* Cabeçalho do Modal */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-1.5">
                      <Share2 className="h-4 w-4 text-[#0066FF]" />
                      <span className="font-bold text-xs text-[#002B5E]">
                        Link Oficial de Cadastro da Unidade (Até 2 Vínculos)
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">Modal Ativo</span>
                  </div>

                  {/* Campo Seletor de Unidade */}
                  <div className="relative border border-slate-200 rounded p-2 bg-slate-50/50 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold block">
                        Unidade Selecionada:
                      </span>
                      <strong className="text-xs text-[#002B5E]">Apto 1203 — Bloco A</strong>
                    </div>
                    <DestaqueNumero
                      numero="1"
                      cor="marinho"
                      className="absolute -top-2.5 -right-2 scale-85"
                    />
                  </div>

                  {/* Campo de Link Copiável */}
                  <div className="space-y-1 relative">
                    <span className="text-[10px] font-semibold text-slate-600 block">
                      Endereço Web Exclusivo:
                    </span>
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 bg-slate-50 border border-slate-300 rounded px-2 py-1 text-[10px] font-mono text-slate-700 truncate">
                        https://koinon.goskip.app/cadastro/tok_a1203_lagoazul
                      </div>
                      <div className="bg-[#002B5E] text-white text-[10px] font-semibold px-2 py-1 rounded flex items-center gap-1">
                        <Copy className="h-3 w-3" /> Copiar
                      </div>
                    </div>
                    <DestaqueNumero
                      numero="2"
                      cor="azul"
                      className="absolute -top-1.5 -right-2 scale-85"
                    />
                  </div>

                  {/* Seção WhatsApp */}
                  <div className="p-2.5 rounded border border-emerald-200 bg-emerald-50/50 space-y-1.5 relative">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-emerald-900 flex items-center gap-1">
                        <MessageCircle className="h-3.5 w-3.5 text-emerald-700" /> Enviar pelo
                        WhatsApp
                      </span>
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded border border-emerald-300 font-semibold">
                        Contato Cadastrado
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 bg-white border border-emerald-200 rounded px-2 py-1 text-[11px] font-mono text-slate-800">
                        (61) 98765-4321
                      </div>
                      <div className="bg-emerald-600 text-white text-[10px] font-semibold px-2.5 py-1 rounded flex items-center gap-1 shrink-0">
                        <ExternalLink className="h-3 w-3" /> Abrir WhatsApp
                      </div>
                    </div>
                    <div className="text-[9px] text-emerald-800">
                      Converte para <code>+5561987654321</code> e abre wa.me com mensagem
                      personalizada.
                    </div>
                    <DestaqueNumero
                      numero="3"
                      cor="verde"
                      className="absolute -top-2 -right-2 scale-85"
                    />
                  </div>

                  {/* Seção E-mail */}
                  <div className="p-2 rounded border border-slate-200 bg-slate-50 flex items-center justify-between relative">
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-[#0066FF]" />
                      <span className="text-[10px] text-slate-700 font-medium">
                        E-mail do destinatário: morador.1203@exemplo.com
                      </span>
                    </div>
                    <div className="bg-[#0066FF] text-white text-[10px] font-semibold px-2 py-0.5 rounded">
                      Enviar E-mail
                    </div>
                    <DestaqueNumero
                      numero="4"
                      cor="ambar"
                      className="absolute -top-2 -right-2 scale-85"
                    />
                  </div>
                </div>

                {/* Grade de Legendas Explicativas do Mockup 1 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-200 text-[10.5px]">
                  <div className="flex items-start gap-1.5">
                    <DestaqueNumero numero="1" cor="marinho" className="w-4 h-4 text-[9px]" />
                    <span>
                      <strong className="text-slate-900">Seletor da Unidade:</strong> seleciona o
                      apartamento e carrega o celular oficial já salvo no sistema.
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <DestaqueNumero numero="2" cor="azul" className="w-4 h-4 text-[9px]" />
                    <span>
                      <strong className="text-slate-900">Link e Copiar:</strong> transfere a URL
                      única com token para a área de transferência com um clique.
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <DestaqueNumero numero="3" cor="verde" className="w-4 h-4 text-[9px]" />
                    <span>
                      <strong className="text-slate-900">WhatsApp Pré-preenchido:</strong> máscara
                      progressiva e validação que avisa se faltam dígitos para DDD + número.
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <DestaqueNumero numero="4" cor="ambar" className="w-4 h-4 text-[9px]" />
                    <span>
                      <strong className="text-slate-900">Disparo por E-mail:</strong> envia o
                      convite formal pela infraestrutura institucional do Koinon.
                    </span>
                  </div>
                </div>
              </div>

              {/* Box de Regras do WhatsApp Oficial */}
              <div className="p-3 bg-emerald-50/80 border border-emerald-300 rounded-lg space-y-1 text-xs">
                <span className="font-bold text-emerald-950 uppercase text-[11px] flex items-center gap-1.5">
                  <Smartphone className="h-4 w-4 text-emerald-700" /> Regras de Funcionamento do
                  WhatsApp Oficial Koinon
                </span>
                <p className="text-[11px] text-emerald-900 leading-relaxed">
                  • <strong>Sem necessidade de API paga:</strong> O sistema gera a URL padrão{' '}
                  <code>https://wa.me/55...</code>. A mensagem sai diretamente do número logado no
                  WhatsApp Web ou App do navegador de quem está operando a mesa.
                  <br />• <strong>Destinatário fora da agenda:</strong> Não é necessário que o
                  morador esteja salvo nos contatos do celular de quem envia.
                  <br />• <strong>Validação em tempo real:</strong> Se o operador digitar menos de
                  10 dígitos, o alerta âmbar informa exatamente quantos números faltam para
                  completar o DDD e o telefone válido.
                </p>
              </div>
            </div>
          </div>

          <RodapeManual pagina={2} />
        </article>

        {/* ========================================================================= */}
        {/* PÁGINA 3: SEÇÕES 3, 4, 5 E 6 (A TELA PÚBLICA, DADOS E DECLARAÇÃO)        */}
        {/* ========================================================================= */}
        <article className="bg-white p-8 sm:p-12 border border-slate-300 print:border-none print:shadow-none shadow-md rounded-lg print:rounded-none min-h-[1120px] flex flex-col justify-between print:min-h-screen print:page-break-after-always">
          <div>
            <CabecalhoPaginaManual
              secaoNumero="Seções 3, 4, 5 e 6"
              secaoTitulo="Página Pública, Identificação, Dados e Declarações Legais"
            />

            {/* SEÇÃO 3: A PÁGINA PÚBLICA E SEÇÃO 4: QUEM DEVE SE CADASTRAR */}
            <div className="mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#002B5E] flex items-center gap-1.5 mb-1.5">
                <DestaqueNumero numero={3} cor="azul" />
                <span>
                  3. Acesso à Página Pública e Identificação da Unidade (/cadastro/:token)
                </span>
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed mb-2">
                O morador abre o link no celular ou computador. O Koinon valida o token, identifica
                o apartamento e o bloco (quando existente) e exibe os 3 tópicos orientativos antes
                do preenchimento. Se a unidade já atingiu o limite de ocupação, exibe aviso de
                bloqueio com orientações.
              </p>
            </div>

            {/* MOCKUP 2: TELA PÚBLICA DE CADASTRO COM DESTAQUES NUMERADOS */}
            <div className="border border-[#D5DCE5] rounded-lg p-3 bg-slate-50/80 mb-3 relative">
              <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2.5 shadow-xs">
                {/* Header Mockup */}
                <div className="text-center border-b border-slate-100 pb-2">
                  <span className="text-[10px] font-bold text-[#0066FF] uppercase tracking-wider block">
                    Condomínio Residencial Lago Azul • Plataforma Virtual Koinon
                  </span>
                  <div className="inline-flex items-center gap-1.5 bg-[#002B5E]/5 border border-[#002B5E]/20 px-2 py-0.5 rounded text-xs font-bold text-[#002B5E] mt-1 relative">
                    <Building className="h-3.5 w-3.5 text-[#0066FF]" />
                    <span>Apto 1203 (Bloco A)</span>
                    <DestaqueNumero
                      numero="5"
                      cor="marinho"
                      className="absolute -top-2.5 -right-2 scale-75"
                    />
                  </div>
                </div>

                {/* 3 Tópicos Explicativos */}
                <div className="p-2 rounded bg-blue-50/50 border border-blue-200 text-[10px] text-slate-700 space-y-1 relative">
                  <span className="font-bold text-[#002B5E] block flex items-center gap-1">
                    <HelpCircle className="h-3 w-3 text-[#0066FF]" /> Quem deve se cadastrar nesta
                    unidade?
                  </span>
                  <div className="space-y-0.5 pl-1">
                    <div>
                      • <strong>Condômino residente:</strong> proprietário que mora no imóvel.
                    </div>
                    <div>
                      • <strong>Inquilino:</strong> morador locatário da unidade.
                    </div>
                    <div>
                      • <strong>Proprietário (não morador):</strong> titular que não reside na
                      unidade.
                    </div>
                  </div>
                  <DestaqueNumero
                    numero="6"
                    cor="azul"
                    className="absolute -top-2 -right-2 scale-75"
                  />
                </div>

                {/* Campos de Dados */}
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="p-1.5 border border-slate-200 rounded bg-slate-50 relative">
                    <span className="text-slate-500 block text-[9px]">Nome Completo:</span>
                    <strong className="text-slate-900">José Exemplo da Silva</strong>
                  </div>
                  <div className="p-1.5 border border-slate-200 rounded bg-slate-50 relative">
                    <span className="text-slate-500 block text-[9px]">CPF e Nascimento:</span>
                    <strong className="text-slate-900 font-mono">
                      123.***.***-00 • 15/04/1982
                    </strong>
                  </div>
                </div>

                {/* Seleção do Vínculo com Declaração Dinâmica */}
                <div className="p-2 rounded border border-[#0066FF]/30 bg-blue-50/30 space-y-1.5 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#002B5E] flex items-center gap-1">
                      <FileCheck2 className="h-3.5 w-3.5 text-[#0066FF]" /> Vínculo: Condômino
                      (Residente)
                    </span>
                    <DestaqueNumero
                      numero="7"
                      cor="verde"
                      className="absolute -top-2 -right-2 scale-75"
                    />
                  </div>
                  <div className="p-2 bg-white rounded border border-slate-200 text-[9.5px] italic text-slate-800 leading-relaxed font-serif">
                    "Declaro, sob as penas da lei, que sou proprietário legítimo da unidade para a
                    qual estou me cadastrando, na forma dos arts. 1.228 e 1.331 do Código Civil (Lei
                    nº 10.406/2002), que resido na unidade e que as informações prestadas neste
                    cadastro são verdadeiras. Autorizo o tratamento dos meus dados pessoais nos
                    termos da LGPD (Lei nº 13.709/2018)."
                  </div>
                </div>

                {/* Assinatura Eletrônica e Botões */}
                <div className="flex items-center justify-between pt-1 relative">
                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <Clock className="h-3.5 w-3.5 text-[#0066FF]" />
                    <span>Grava Nome, Data/Hora e IP</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">Sair sem cadastrar</span>
                    <div className="bg-[#0066FF] text-white text-[10px] font-bold px-3 py-1 rounded">
                      Assinar eletronicamente
                    </div>
                  </div>
                  <DestaqueNumero
                    numero="8"
                    cor="marinho"
                    className="absolute -top-2 -right-2 scale-75"
                  />
                </div>
              </div>

              {/* Legendas do Mockup 2 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 pt-1.5 border-t border-slate-200 text-[10px]">
                <div className="flex items-start gap-1">
                  <DestaqueNumero numero="5" cor="marinho" className="w-3.5 h-3.5 text-[8px]" />
                  <span>
                    <strong>Unidade Validada:</strong> número e bloco identificados pelo token.
                  </span>
                </div>
                <div className="flex items-start gap-1">
                  <DestaqueNumero numero="6" cor="azul" className="w-3.5 h-3.5 text-[8px]" />
                  <span>
                    <strong>Os 3 Tópicos:</strong> orienta quem deve preencher o formulário.
                  </span>
                </div>
                <div className="flex items-start gap-1">
                  <DestaqueNumero numero="7" cor="verde" className="w-3.5 h-3.5 text-[8px]" />
                  <span>
                    <strong>Declaração Legal:</strong> texto dinâmico ajustado ao vínculo.
                  </span>
                </div>
                <div className="flex items-start gap-1">
                  <DestaqueNumero numero="8" cor="marinho" className="w-3.5 h-3.5 text-[8px]" />
                  <span>
                    <strong>Assinatura:</strong> formaliza o aceite com fé pública e IP.
                  </span>
                </div>
              </div>
            </div>

            {/* SEÇÃO 6: AS 3 DECLARAÇÕES LEGAIS DINÂMICAS */}
            <div className="space-y-1.5 mb-2">
              <h4 className="text-[11px] font-bold text-[#002B5E] uppercase tracking-wide">
                As Declarações Legais Dinâmicas Exatas Utilizadas pelo Sistema:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
                <div className="p-2 rounded bg-purple-50/70 border border-purple-200 space-y-1">
                  <strong className="text-purple-900 block">Locatário / Inquilino</strong>
                  <p className="text-slate-700 leading-relaxed italic">
                    "Declaro, sob as penas da lei, que sou locatário e morador da unidade na
                    qualidade de inquilino na forma da <strong>Lei nº 8.245/91</strong> (Lei do
                    Inquilinato)... LGPD Lei 13.709/2018."
                  </p>
                </div>
                <div className="p-2 rounded bg-cyan-50/70 border border-cyan-200 space-y-1">
                  <strong className="text-cyan-900 block">Condômino (Residente)</strong>
                  <p className="text-slate-700 leading-relaxed italic">
                    "Declaro que sou proprietário legítimo na forma dos{' '}
                    <strong>arts. 1.228 e 1.331 do Código Civil</strong>, que resido na unidade e
                    que as informações prestadas são verdadeiras... LGPD."
                  </p>
                </div>
                <div className="p-2 rounded bg-amber-50/70 border border-amber-200 space-y-1">
                  <strong className="text-amber-900 block">Proprietário (Não Morador)</strong>
                  <p className="text-slate-700 leading-relaxed italic">
                    "Declaro que sou proprietário na forma dos arts. 1.228 e 1.331 do Código Civil,
                    e que <strong>não resido na unidade</strong>, cujo cadastro de morador é
                    realizado separadamente... LGPD."
                  </p>
                </div>
              </div>
            </div>

            <CaixaDica titulo="OPÇÃO DE INDICAÇÃO DE FATO">
              Ao selecionar Inquilino ou Proprietário, o morador pode clicar no botão{' '}
              <strong>"Indicar o morador/proprietário de fato"</strong> e informar o nome e telefone
              da outra pessoa. A mesa diretora recebe a indicação para entrar em contato e enviar o
              link complementar.
            </CaixaDica>
          </div>

          <RodapeManual pagina={3} />
        </article>

        {/* ========================================================================= */}
        {/* PÁGINA 4: SEÇÃO 8 (APROVAÇÃO MESA) + SEÇÃO 9 (MATRIZ ERROS / BLOQUEIO)    */}
        {/* ========================================================================= */}
        <article className="bg-white p-8 sm:p-12 border border-slate-300 print:border-none print:shadow-none shadow-md rounded-lg print:rounded-none min-h-[1120px] flex flex-col justify-between print:min-h-screen">
          <div>
            <CabecalhoPaginaManual
              secaoNumero="Seções 8, 9 e 10"
              secaoTitulo="Homologação pela Mesa e Matriz de Bloqueio por Unidade"
            />

            {/* SEÇÃO 8: APROVAÇÃO PELA MESA */}
            <div className="mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#002B5E] flex items-center gap-1.5 mb-1.5">
                <DestaqueNumero numero={8} cor="verde" />
                <span>8. Envio e Aprovação de Cadastros pela Mesa (/mesa/credenciamentos)</span>
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed mb-2">
                Após a assinatura eletrônica pelo morador, o cadastro não entra diretamente na lista
                de votação: ele recebe o status <strong>PENDENTE</strong>. A mesa diretora analisa a
                submissão na aba <em>"Aprovação de Cadastros"</em> em{' '}
                <code>/mesa/credenciamentos</code>.
              </p>

              {/* MOCKUP 3: CARD DE APROVAÇÃO DA MESA COM DECLARAÇÃO E IP */}
              <div className="border border-[#D5DCE5] rounded-lg p-3 bg-slate-50/80 mb-2 relative">
                <div className="bg-white border border-slate-200 rounded p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#002B5E]">Apto 1203 (Bloco A)</span>
                      <span className="text-slate-400">•</span>
                      <strong className="text-slate-900">José Exemplo da Silva</strong>
                      <span className="text-[10px] text-slate-500 font-mono">
                        (CPF: 123.456.789-00)
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px] border border-amber-300">
                      PENDENTE DE APROVAÇÃO
                    </span>
                  </div>

                  {/* Declaração com IP */}
                  <div className="p-2 rounded bg-blue-50/60 border border-blue-200 space-y-1 text-[10.5px]">
                    <div className="flex items-center justify-between text-[#002B5E] font-semibold text-[10px]">
                      <span>Assinado por: José Exemplo da Silva (15/04/2025 às 14:32)</span>
                      <span className="font-mono text-slate-600 bg-white px-1.5 py-0.2 rounded border border-slate-300">
                        IP: 189.120.45.67
                      </span>
                    </div>
                    <p className="italic text-slate-700 text-[10px]">
                      "Declaro, sob as penas da lei, que sou proprietário legítimo na forma dos
                      arts. 1.228 e 1.331 do Código Civil..."
                    </p>
                  </div>

                  {/* Ações da Mesa */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10.5px] text-slate-500">
                      Vínculo: <strong>CONDÔMINO (RESIDENTE)</strong>
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="border border-red-300 text-red-700 bg-red-50 text-[10px] font-semibold px-2.5 py-1 rounded">
                        Rejeitar Cadastro
                      </div>
                      <div className="bg-emerald-600 text-white text-[10px] font-semibold px-3 py-1 rounded">
                        Aprovar e Homologar
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-1.5 text-[10px] text-slate-600">
                  <strong>Efeito da Rejeição ou Exclusão:</strong> Se a mesa rejeitar o cadastro ou
                  excluí-lo, a vaga da unidade é liberada imediatamente para um novo envio pelo
                  mesmo link.
                </div>
              </div>
            </div>

            {/* SEÇÃO 9: MATRIZ DE BLOQUEIO POR UNIDADE (ERROS COMUNS EM VERMELHO) */}
            <div className="mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-red-900 flex items-center gap-1.5 mb-2">
                <DestaqueNumero numero={9} cor="vermelho" />
                <span>9. Matriz de Bloqueio por Unidade & Prevenção de Erros Comuns</span>
              </h3>

              <div className="border border-red-200 rounded-lg overflow-hidden mb-2">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-red-50 text-red-950 font-bold text-[10px] uppercase border-b border-red-200">
                      <th className="p-2 border-r border-red-200 w-44">
                        Situação Atual da Unidade
                      </th>
                      <th className="p-2 border-r border-red-200">Tentativa de Novo Cadastro</th>
                      <th className="p-2 text-center w-32">Comportamento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100 text-[10.5px]">
                    <tr className="bg-white">
                      <td className="p-2 border-r border-red-100 font-semibold text-slate-800">
                        Condômino Residente ativo ou pendente
                      </td>
                      <td className="p-2 border-r border-red-100 text-slate-700">
                        Qualquer novo cadastro pelo link (Condômino, Inquilino ou Proprietário)
                      </td>
                      <td className="p-2 text-center font-bold text-red-700 bg-red-50/50">
                        BLOQUEADO
                      </td>
                    </tr>
                    <tr className="bg-white">
                      <td className="p-2 border-r border-red-100 font-semibold text-slate-800">
                        Inquilino cadastrado / pendente
                      </td>
                      <td className="p-2 border-r border-red-100 text-slate-700">
                        Outro Inquilino ou Condômino Residente
                      </td>
                      <td className="p-2 text-center font-bold text-red-700 bg-red-50/50">
                        BLOQUEADO
                      </td>
                    </tr>
                    <tr className="bg-white">
                      <td className="p-2 border-r border-red-100 font-semibold text-slate-800">
                        Inquilino cadastrado / pendente
                      </td>
                      <td className="p-2 border-r border-red-100 text-emerald-800 font-medium">
                        Proprietário (não morador) da unidade
                      </td>
                      <td className="p-2 text-center font-bold text-emerald-700 bg-emerald-50/50">
                        PERMITIDO
                      </td>
                    </tr>
                    <tr className="bg-white">
                      <td className="p-2 border-r border-red-100 font-semibold text-slate-800">
                        Proprietário (não morador) cadastrado
                      </td>
                      <td className="p-2 border-r border-red-100 text-slate-700">
                        Outro Proprietário ou Condômino Residente
                      </td>
                      <td className="p-2 text-center font-bold text-red-700 bg-red-50/50">
                        BLOQUEADO
                      </td>
                    </tr>
                    <tr className="bg-white">
                      <td className="p-2 border-r border-red-100 font-semibold text-slate-800">
                        Proprietário (não morador) cadastrado
                      </td>
                      <td className="p-2 border-r border-red-100 text-emerald-800 font-medium">
                        Inquilino (morador) da unidade
                      </td>
                      <td className="p-2 text-center font-bold text-emerald-700 bg-emerald-50/50">
                        PERMITIDO
                      </td>
                    </tr>
                    <tr className="bg-white">
                      <td className="p-2 border-r border-red-100 font-semibold text-slate-800">
                        Unidade completa (1 Morador + 1 Proprietário)
                      </td>
                      <td className="p-2 border-r border-red-100 text-slate-700">
                        Qualquer nova submissão pelo link
                      </td>
                      <td className="p-2 text-center font-bold text-red-700 bg-red-50/50">
                        BLOQUEADO
                      </td>
                    </tr>
                    <tr className="bg-white">
                      <td className="p-2 border-r border-red-100 font-semibold text-slate-800">
                        CPF já cadastrado no condomínio
                      </td>
                      <td className="p-2 border-r border-red-100 text-slate-700">
                        Tentativa de recadastramento com mesmo CPF
                      </td>
                      <td className="p-2 text-center font-bold text-red-700 bg-red-50/50">
                        BLOQUEADO
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <CaixaErro titulo="COMO DESBLOQUEAR UMA UNIDADE COM MORADOR ANTERIOR">
                Se um morador antigo mudou-se do condomínio e uma nova pessoa precisa se cadastrar,
                a mesa diretora deve acessar <code>/admin/cadastros</code> e inativar ou excluir o
                vínculo antigo. Automaticamente a vaga correspondente é reaberta para o link.
              </CaixaErro>
            </div>

            {/* CHECKLIST FINAL */}
            <div className="p-3 bg-[#F3F7FC] border border-[#0066FF]/30 rounded-lg space-y-1 text-xs">
              <span className="font-bold text-[#002B5E] uppercase text-[11px] flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-[#0066FF]" /> Checklist Rápido de Envio e
                Conferência
              </span>
              <ul className="list-disc list-inside text-slate-700 text-[10px] space-y-0.5 pl-1">
                <li>
                  Gere o link individual em <code>/admin/cadastros</code> para o WhatsApp do
                  destinatário.
                </li>
                <li>
                  Oriente o morador a preencher nome, CPF válido e selecionar o vínculo correto.
                </li>
                <li>
                  Acesse <code>/mesa/credenciamentos</code> e confira a declaração assinada, data e
                  IP.
                </li>
                <li>
                  Clique em "Aprovar" para habilitar o morador nas deliberações e votações oficiais.
                </li>
              </ul>
            </div>
          </div>

          <RodapeManual pagina={4} />
        </article>
      </div>
    </div>
  )
}

export default ManualCadastroLinkPage
