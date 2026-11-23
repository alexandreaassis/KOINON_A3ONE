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
  UserCheck,
  FileCheck,
  PenTool,
  Lock,
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
 * Rodapé padrão das páginas A4 do Manual
 */
const RodapeManual: React.FC<{ pagina: number; totalPaginas?: number }> = ({
  pagina,
  totalPaginas = 4,
}) => (
  <footer className="mt-auto pt-3 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500 font-sans print:pt-2">
    <div className="flex items-center gap-2">
      <span className="font-semibold text-[#002B5E]">Assembleia Eletrônica Lago Azul</span>
      <span className="text-slate-300">•</span>
      <span className="text-slate-500">apuração conferida pela mesa</span>
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
          Manual de Operação • Mesa Diretora
        </span>
        <h2 className="text-sm font-bold text-[#002B5E] uppercase tracking-tight">
          {secaoNumero} — {secaoTitulo}
        </h2>
      </div>
    </div>
    <div className="text-right text-[10px] font-sans text-slate-500">
      <span className="font-semibold text-slate-700">Plataforma Virtual Koinon</span>
      <br />
      <span>
        Rota: <code className="font-mono text-[#0066FF]">/mesa/presenca</code>
      </span>
    </div>
  </header>
)

export const ManualPresencaPage: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-100 py-6 print:py-0 print:bg-white text-slate-900 font-sans antialiased">
      {/* Barra de Ações Superior (Oculta na Impressão) */}
      <div className="max-w-[850px] mx-auto mb-4 px-4 flex items-center justify-between print:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/mesa/presenca')}
          className="text-xs h-8 gap-1.5 bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar à Lista de Presença
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
        {/* PÁGINA 1: CAPA OFICIAL KOINON + APRESENTAÇÃO + SUMÁRIO EXECUTIVO          */}
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
                GUIA OPERACIONAL DA MESA
              </span>
            </div>
          </div>

          {/* Miolo da Capa: Título e Identidade */}
          <div className="my-auto py-8 space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#0066FF]/30 border border-[#0066FF] text-blue-100 text-xs font-semibold tracking-wide uppercase">
                <ShieldCheck className="h-4 w-4 text-[#0066FF]" /> Assembleia Presencial e Virtual
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                Manual da Lista de Presença & Registro de Comparecimento
              </h1>
              <p className="text-sm sm:text-base text-blue-100 max-w-2xl leading-relaxed font-normal">
                Instruções passo a passo para o Presidente e Secretário da Mesa Diretora:
                credenciamento de unidades, controle de procurações, assinaturas eletrônicas com
                integridade criptográfica e apuração do quórum de instalação em tempo real.
              </p>
            </div>

            {/* Sumário Executivo */}
            <div className="bg-white/10 backdrop-blur-xs border border-white/20 rounded-xl p-5 text-left text-xs space-y-3.5 max-w-2xl">
              <div className="flex items-center justify-between border-b border-white/20 pb-2">
                <span className="font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#0066FF]" /> Sumário Operacional
                </span>
                <span className="text-[10px] text-blue-200">7 Seções em Ordem de Uso</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="flex items-start gap-2 text-blue-50">
                  <span className="w-5 h-5 rounded-full bg-[#0066FF] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <strong className="text-white block">Selecionar a Assembleia</strong>
                    <span className="text-blue-200 text-[10px]">
                      Escolha da deliberação ativa na mesa
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-blue-50">
                  <span className="w-5 h-5 rounded-full bg-[#10B981] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <strong className="text-white block">Presença Presencial (Verde)</strong>
                    <span className="text-blue-200 text-[10px]">
                      Bloqueio imediato do canal online
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-blue-50">
                  <span className="w-5 h-5 rounded-full bg-[#0066FF] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    <strong className="text-white block">Presença Remota / Virtual (Azul)</strong>
                    <span className="text-blue-200 text-[10px]">
                      Credenciamento pelo link/plataforma
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-blue-50">
                  <span className="w-5 h-5 rounded-full bg-[#F59E0B] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    4
                  </span>
                  <div>
                    <strong className="text-white block">Presença por Procuração</strong>
                    <span className="text-blue-200 text-[10px]">
                      Dados do procurador e anexo em PDF
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-blue-50">
                  <span className="w-5 h-5 rounded-full bg-[#0066FF] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    5
                  </span>
                  <div>
                    <strong className="text-white block">Assinatura Eletrônica</strong>
                    <span className="text-blue-200 text-[10px]">
                      Desenho/texto + carimbo SHA-256 e hora
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-blue-50">
                  <span className="w-5 h-5 rounded-full bg-[#0066FF] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    6
                  </span>
                  <div>
                    <strong className="text-white block">Acompanhar Quórum</strong>
                    <span className="text-blue-200 text-[10px]">
                      Contadores físicas x virtuais x total
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-blue-50 sm:col-span-2 border-t border-white/10 pt-2">
                  <span className="w-5 h-5 rounded-full bg-white text-[#002B5E] flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    7
                  </span>
                  <div>
                    <strong className="text-white block">Integração com a Ata da Assembleia</strong>
                    <span className="text-blue-200 text-[10px]">
                      Como as rubricas física e virtual constam no documento final
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
        {/* PÁGINA 2: SEÇÃO 1 (SELEÇÃO) + SEÇÃO 2 (PRESENCIAL) + SEÇÃO 3 (REMOTA)     */}
        {/* ========================================================================= */}
        <article className="bg-white p-8 sm:p-12 border border-slate-300 print:border-none print:shadow-none shadow-md rounded-lg print:rounded-none min-h-[1120px] flex flex-col justify-between print:min-h-screen print:page-break-after-always">
          <div>
            <CabecalhoPaginaManual
              secaoNumero="Seções 1, 2 e 3"
              secaoTitulo="Identificação da Assembleia e Modalidades de Presença"
            />

            {/* SEÇÃO 1: SELECIONAR A ASSEMBLEIA */}
            <div className="mb-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#002B5E] flex items-center gap-1.5 mb-2">
                <DestaqueNumero numero={1} cor="marinho" />
                <span>1. Selecionar a Assembleia / Deliberação Ativa</span>
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed mb-2.5">
                No topo direito da tela, a mesa localiza o seletor com todas as assembleias
                cadastradas. A seleção carrega automaticamente a lista de unidades e os registros
                prévios daquela deliberação.
              </p>

              {/* MOCKUP 1: CABEÇALHO DA TELA COM DESTAQUES */}
              <div className="border border-[#D5DCE5] rounded-lg p-3 bg-slate-50/70 mb-2 relative">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-amber-600" />
                    <span className="font-bold text-xs text-slate-900">
                      Lista de Presença & Assinatura Eletrônica
                    </span>
                  </div>

                  <div className="flex items-center gap-2 relative">
                    {/* Elemento 1 */}
                    <div className="relative border border-[#0066FF] rounded px-2 py-1 bg-white flex items-center gap-2 text-xs">
                      <span className="text-[11px] font-semibold text-slate-800 truncate max-w-[150px]">
                        Assembleia Geral Ordinária (EM_VOTACAO)
                      </span>
                      <DestaqueNumero
                        numero="1"
                        cor="azul"
                        className="absolute -top-3 -right-2 scale-90"
                      />
                    </div>

                    {/* Elemento 2 */}
                    <div className="relative border border-slate-300 rounded px-2 py-1 bg-white text-xs text-slate-700 flex items-center gap-1">
                      <Printer className="h-3 w-3 text-slate-500" />
                      <span className="text-[11px]">Imprimir A4</span>
                      <DestaqueNumero
                        numero="2"
                        cor="marinho"
                        className="absolute -top-3 -right-2 scale-90"
                      />
                    </div>

                    {/* Elemento 3 */}
                    <div className="relative bg-amber-600 text-white rounded px-2 py-1 text-xs font-semibold flex items-center gap-1">
                      <UserCheck className="h-3 w-3" />
                      <span className="text-[11px]">Registrar Presença</span>
                      <DestaqueNumero
                        numero="3"
                        cor="ambar"
                        className="absolute -top-3 -right-2 scale-90"
                      />
                    </div>
                  </div>
                </div>

                {/* Legendas do Mockup 1 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2 pt-1 text-[10.5px]">
                  <div className="flex items-start gap-1.5">
                    <DestaqueNumero numero="1" cor="azul" className="w-4 h-4 text-[9px]" />
                    <span>
                      <strong className="text-slate-900">Seletor de Assembleia:</strong> alterna
                      entre pautas em andamento ou encerradas.
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <DestaqueNumero numero="2" cor="marinho" className="w-4 h-4 text-[9px]" />
                    <span>
                      <strong className="text-slate-900">Imprimir Documento A4:</strong> gera a
                      folha oficial de presença para arquivamento.
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <DestaqueNumero numero="3" cor="ambar" className="w-4 h-4 text-[9px]" />
                    <span>
                      <strong className="text-slate-900">Registrar Presença:</strong> abre o
                      formulário de credenciamento e assinatura.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* SEÇÃO 2: REGISTRAR PRESENÇA PRESENCIAL (VERDE) */}
            <div className="mb-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#002B5E] flex items-center gap-1.5 mb-2">
                <DestaqueNumero numero={2} cor="verde" />
                <span>2. Registrar Presença Presencial (Selo Verde) & Bloqueio Online</span>
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed mb-2.5">
                Para o condômino presente no salão de festas ou plenário físico, selecione a
                modalidade <strong className="text-[#10B981]">Presencial</strong>. O sistema atribui
                o selo verde na lista e ativa a regra de reconciliação de quórum.
              </p>

              {/* MOCKUP 2: LINHA PRESENCIAL NA TABELA COM DESTAQUES */}
              <div className="border border-[#D5DCE5] rounded-lg overflow-hidden bg-white mb-2">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F1F4F8] text-[#002B5E] text-[10px] font-bold uppercase border-b border-[#D5DCE5]">
                      <th className="p-2 border-r border-[#D5DCE5] text-center w-20">Unidade</th>
                      <th className="p-2 border-r border-[#D5DCE5]">Nome</th>
                      <th className="p-2 border-r border-[#D5DCE5] text-center w-28">Situação</th>
                      <th className="p-2 border-r border-[#D5DCE5] w-36">Procurador(a)</th>
                      <th className="p-2 text-center w-44">Assinatura Eletrônica</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#D5DCE5] bg-white">
                      <td className="p-2 border-r border-[#D5DCE5] text-center font-bold text-[#002B5E] font-mono relative">
                        <span>1203</span>
                        <span className="block text-[9px] font-normal text-slate-500">Bl. A</span>
                        <DestaqueNumero
                          numero="4"
                          cor="marinho"
                          className="absolute -top-1.5 -left-1.5 scale-75"
                        />
                      </td>
                      <td className="p-2 border-r border-[#D5DCE5] relative">
                        <strong className="text-[#002B5E] block">José Exemplo da Silva</strong>
                        <span className="text-[9px] text-slate-500 font-mono">
                          CPF: 123.456.789-00
                        </span>
                      </td>
                      <td className="p-2 border-r border-[#D5DCE5] text-center relative">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                          PRESENCIAL
                        </span>
                        <DestaqueNumero
                          numero="5"
                          cor="verde"
                          className="absolute -top-1.5 -right-1 scale-75"
                        />
                      </td>
                      <td className="p-2 border-r border-[#D5DCE5] text-slate-400 italic text-center">
                        —
                      </td>
                      <td className="p-2 text-center font-mono text-[9px] relative">
                        <div className="font-bold text-emerald-700">✓ ASSINADO</div>
                        <div className="text-[8px] text-slate-500">SHA: 7a8f3b29c1d4...</div>
                        <div className="text-[8px] text-slate-500">Credenciado às 19:42</div>
                        <DestaqueNumero
                          numero="6"
                          cor="azul"
                          className="absolute -top-1.5 -right-1 scale-75"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Explicações Numeradas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10.5px]">
                <div className="flex items-start gap-1.5">
                  <DestaqueNumero numero="4" cor="marinho" className="w-4 h-4 text-[9px]" />
                  <span>
                    <strong className="text-slate-900">Identificador da Unidade:</strong> exibe
                    apenas o número limpo (com bloco reduzido) para leitura ágil.
                  </span>
                </div>
                <div className="flex items-start gap-1.5">
                  <DestaqueNumero numero="5" cor="verde" className="w-4 h-4 text-[9px]" />
                  <span>
                    <strong className="text-slate-900">Selo Presencial (Verde):</strong> confirma o
                    comparecimento no plenário físico e bloqueia voto online.
                  </span>
                </div>
                <div className="flex items-start gap-1.5">
                  <DestaqueNumero numero="6" cor="azul" className="w-4 h-4 text-[9px]" />
                  <span>
                    <strong className="text-slate-900">Carimbo e Hora:</strong> hash SHA-256 e
                    horário exato gravados com valor probatório.
                  </span>
                </div>
              </div>

              <CaixaImportante titulo="REGRA CRÍTICA: BLOQUEIO DO CANAL ONLINE (1 UNIDADE = 1 VOTO)">
                Ao registrar presença presencial, o canal de votação remota desta unidade é{' '}
                <strong>bloqueado imediatamente</strong> na urna virtual. Se o morador tentar votar
                pelo celular ou computador, o sistema informará que ele já consta como presente no
                salão, evitando qualquer duplicidade de voto.
              </CaixaImportante>
            </div>

            {/* SEÇÃO 3: REGISTRAR PRESENÇA REMOTA / VIRTUAL (AZUL) */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#002B5E] flex items-center gap-1.5 mb-2">
                <DestaqueNumero numero={3} cor="azul" />
                <span>3. Presença Remota / Virtual (Selo Azul na Plataforma Koinon)</span>
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed mb-2">
                Condôminos que participam à distância autenticam-se com link seguro e código de
                verificação ou credenciamento aprovado pela mesa. O sistema marca automaticamente o
                selo <strong className="text-[#0066FF]">REMOTO</strong> e libera a cédula na urna
                eletrônica.
              </p>

              <CaixaDica titulo="DICA PARA A MESA DIRETORA">
                Se um condômino informou que votará online mas a mesa o marcou por engano como
                PRESENCIAL, ele ficará impedido de votar na tela dele. A mesa deve abrir a linha e
                retificar a situação para REMOTO imediatamente.
              </CaixaDica>
            </div>
          </div>

          <RodapeManual pagina={2} />
        </article>

        {/* ========================================================================= */}
        {/* PÁGINA 3: SEÇÃO 4 (PROCURAÇÃO) + SEÇÃO 5 (ASSINATURA ELETRÔNICA)          */}
        {/* ========================================================================= */}
        <article className="bg-white p-8 sm:p-12 border border-slate-300 print:border-none print:shadow-none shadow-md rounded-lg print:rounded-none min-h-[1120px] flex flex-col justify-between print:min-h-screen print:page-break-after-always">
          <div>
            <CabecalhoPaginaManual
              secaoNumero="Seções 4 e 5"
              secaoTitulo="Procurações Legais e Assinatura Eletrônica com Carimbo SHA-256"
            />

            {/* SEÇÃO 4: PRESENÇA POR PROCURAÇÃO */}
            <div className="mb-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#002B5E] flex items-center gap-1.5 mb-2">
                <DestaqueNumero numero={4} cor="ambar" />
                <span>4. Presença por Procuração (Documento Anexo + Dados do Procurador)</span>
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed mb-2.5">
                Caso a unidade seja representada por terceiro (com ou sem vínculo com o condomínio),
                a mesa seleciona a opção <strong>"Por Procuração / Representante Legal"</strong>.
                Campos específicos para Nome e CPF do procurador tornam-se obrigatórios, além de
                upload do instrumento de mandato.
              </p>

              {/* MOCKUP 3: LINHA POR PROCURAÇÃO NA TABELA */}
              <div className="border border-[#D5DCE5] rounded-lg overflow-hidden bg-white mb-2">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F1F4F8] text-[#002B5E] text-[10px] font-bold uppercase border-b border-[#D5DCE5]">
                      <th className="p-2 border-r border-[#D5DCE5] text-center w-20">Unidade</th>
                      <th className="p-2 border-r border-[#D5DCE5]">Titular</th>
                      <th className="p-2 border-r border-[#D5DCE5] text-center w-28">Situação</th>
                      <th className="p-2 border-r border-[#D5DCE5] w-48">Procurador(a)</th>
                      <th className="p-2 text-center w-40">Assinatura</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#D5DCE5] bg-amber-50/20">
                      <td className="p-2 border-r border-[#D5DCE5] text-center font-bold text-[#002B5E] font-mono">
                        804
                      </td>
                      <td className="p-2 border-r border-[#D5DCE5]">
                        <strong className="text-[#002B5E] block">Maria Aparecida Lima</strong>
                        <span className="text-[9px] text-slate-500 font-mono">
                          CPF: 345.678.901-22
                        </span>
                      </td>
                      <td className="p-2 border-r border-[#D5DCE5] text-center relative">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-[#002B5E] border border-blue-200">
                          PROCURAÇÃO
                        </span>
                        <DestaqueNumero
                          numero="7"
                          cor="ambar"
                          className="absolute -top-1.5 -right-1 scale-75"
                        />
                      </td>
                      <td className="p-2 border-r border-[#D5DCE5] relative">
                        <strong className="text-[#002B5E] block text-[11px]">
                          Carlos Alberto Fernandes
                        </strong>
                        <span className="text-[9px] text-slate-500 font-mono block">
                          CPF: 987.654.321-00
                        </span>
                        <span className="inline-flex items-center gap-1 text-[9px] text-[#0066FF] font-semibold mt-0.5">
                          <FileCheck className="h-3 w-3" /> procuracao_unid804.pdf
                        </span>
                        <DestaqueNumero
                          numero="8"
                          cor="marinho"
                          className="absolute -top-1.5 -right-1 scale-75"
                        />
                      </td>
                      <td className="p-2 text-center font-mono text-[9px]">
                        <div className="font-bold text-emerald-700">✓ ASSINADO</div>
                        <div className="text-[8px] text-slate-500">SHA: c4d8e210a59f...</div>
                        <div className="text-[8px] text-slate-500">Credenciado às 19:55</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Explicações Numeradas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10.5px]">
                <div className="flex items-start gap-1.5">
                  <DestaqueNumero numero="7" cor="ambar" className="w-4 h-4 text-[9px]" />
                  <span>
                    <strong className="text-slate-900">Selo de Procuração:</strong> identifica que a
                    unidade está exercendo voto por mandato expresso, mantendo o vínculo com o
                    titular.
                  </span>
                </div>
                <div className="flex items-start gap-1.5">
                  <DestaqueNumero numero="8" cor="marinho" className="w-4 h-4 text-[9px]" />
                  <span>
                    <strong className="text-slate-900">Nome, CPF e Arquivo Anexo:</strong> exibidos
                    diretamente na lista para fiscalização imediata de qualquer condômino ou fiscal.
                  </span>
                </div>
              </div>
            </div>

            {/* SEÇÃO 5: ASSINATURA ELETRÔNICA DO PARTICIPANTE */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#002B5E] flex items-center gap-1.5 mb-2">
                <DestaqueNumero numero={5} cor="azul" />
                <span>5. Assinatura Eletrônica (Desenho, Texto Cursivo e Carimbo SHA-256)</span>
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed mb-2.5">
                No momento do registro, o condômino ou procurador assina digitalmente no componente
                integrado. A plataforma aceita duas modalidades visuais amparadas pela Lei
                14.063/2020:
              </p>

              {/* MOCKUP 4: COMPONENTE SELETOR DE ASSINATURA */}
              <div className="border border-[#D5DCE5] rounded-lg p-3 bg-slate-50/80 mb-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Modo Desenho */}
                  <div className="bg-white p-2.5 rounded border border-slate-200 relative">
                    <span className="text-[10px] font-bold text-[#002B5E] uppercase block mb-1">
                      Modo A: Desenhar na Tela (Touch / Mouse)
                    </span>
                    <div className="h-16 border border-dashed border-slate-300 rounded bg-slate-50 flex items-center justify-center relative">
                      <span
                        className="text-slate-700 text-lg font-serif italic"
                        style={{ fontFamily: '"Dancing Script", cursive' }}
                      >
                        José Exemplo
                      </span>
                      <DestaqueNumero
                        numero="9"
                        cor="azul"
                        className="absolute top-1 right-1 scale-75"
                      />
                    </div>
                    <span className="text-[9px] text-slate-500 block mt-1">
                      Ideal para tablets e smartphones na mesa receptora
                    </span>
                  </div>

                  {/* Modo Texto Cursivo */}
                  <div className="bg-white p-2.5 rounded border border-slate-200 relative">
                    <span className="text-[10px] font-bold text-[#002B5E] uppercase block mb-1">
                      Modo B: Digitar Nome (Estilo Manuscrito)
                    </span>
                    <div className="h-16 border border-dashed border-slate-300 rounded bg-slate-50 flex items-center justify-center relative">
                      <span
                        className="text-slate-900 text-base font-bold"
                        style={{ fontFamily: '"Dancing Script", cursive' }}
                      >
                        Carlos Alberto Fernandes
                      </span>
                      <DestaqueNumero
                        numero="10"
                        cor="marinho"
                        className="absolute top-1 right-1 scale-75"
                      />
                    </div>
                    <span className="text-[9px] text-slate-500 block mt-1">
                      Gera representação manuscrita padronizada instantaneamente
                    </span>
                  </div>
                </div>

                {/* Bloco de Integridade Criptográfica Explicada */}
                <div className="mt-2.5 p-2 bg-[#F3F7FC] border border-[#0066FF]/30 rounded text-[10px] font-mono text-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[#0066FF] block">
                      CARIMBO DIGITAL SHA-256 AUTOMÁTICO:
                    </span>
                    <span className="text-slate-600">
                      Hash imutável composto por: Unidade + Nome + CPF + Data/Hora + IP/Dispositivo
                    </span>
                  </div>
                  <DestaqueNumero numero="11" cor="verde" className="scale-80" />
                </div>
              </div>

              {/* Explicações Numeradas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10.5px]">
                <div className="flex items-start gap-1.5">
                  <DestaqueNumero numero="9" cor="azul" className="w-4 h-4 text-[9px]" />
                  <span>
                    <strong className="text-slate-900">Traço Digital:</strong> captura a rubrica do
                    participante com suavização de curvas em canvas HTML5.
                  </span>
                </div>
                <div className="flex items-start gap-1.5">
                  <DestaqueNumero numero="10" cor="marinho" className="w-4 h-4 text-[9px]" />
                  <span>
                    <strong className="text-slate-900">Nome Digitado:</strong> gera rubrica estética
                    para agilidade no credenciamento em fila.
                  </span>
                </div>
                <div className="flex items-start gap-1.5">
                  <DestaqueNumero numero="11" cor="verde" className="w-4 h-4 text-[9px]" />
                  <span>
                    <strong className="text-slate-900">Auditoria Blindada:</strong> carimbo
                    criptográfico que comprova que a assinatura não foi alterada após o registro.
                  </span>
                </div>
              </div>

              <CaixaImportante titulo="ASSINATURA DA MESA DIRETORA">
                Ao final da assembleia, no rodapé da folha de presença, o{' '}
                <strong>Presidente</strong> e o <strong>Secretário</strong> também devem apor suas
                assinaturas eletrônicas clicando nos botões "Assinar como Presidente" e "Assinar
                como Secretário" para fechar formalmente a lista de presença.
              </CaixaImportante>
            </div>
          </div>

          <RodapeManual pagina={3} />
        </article>

        {/* ========================================================================= */}
        {/* PÁGINA 4: SEÇÃO 6 (QUÓRUM) + SEÇÃO 7 (INTEGRAÇÃO ATA) + BOAS PRÁTICAS     */}
        {/* ========================================================================= */}
        <article className="bg-white p-8 sm:p-12 border border-slate-300 print:border-none print:shadow-none shadow-md rounded-lg print:rounded-none min-h-[1120px] flex flex-col justify-between print:min-h-screen">
          <div>
            <CabecalhoPaginaManual
              secaoNumero="Seções 6 e 7"
              secaoTitulo="Apuração de Quórum e Integração Automática com a Ata"
            />

            {/* SEÇÃO 6: ACOMPANHAR QUÓRUM DE INSTALAÇÃO */}
            <div className="mb-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#002B5E] flex items-center gap-1.5 mb-2">
                <DestaqueNumero numero={6} cor="marinho" />
                <span>6. Acompanhar Quórum de Instalação (Contadores e Percentuais)</span>
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed mb-2.5">
                Acima da tabela de presença, quatro cards dinâmicos discriminam as modalidades e
                alimentam o quórum total em tempo real:
              </p>

              {/* MOCKUP 5: OS 4 CARDS DE MÉTRICAS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                {/* Total */}
                <div className="p-2.5 rounded-lg border border-slate-300 bg-white relative shadow-xs">
                  <span className="text-[9px] text-slate-500 font-bold uppercase block">
                    Total Presentes
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-xl font-extrabold text-[#002B5E]">38</span>
                    <span className="text-[10px] text-slate-500">/ 52 un.</span>
                  </div>
                  <span className="text-[9px] text-emerald-700 font-semibold block">
                    73.1% das unidades
                  </span>
                  <DestaqueNumero
                    numero="12"
                    cor="marinho"
                    className="absolute top-1.5 right-1.5 scale-75"
                  />
                </div>

                {/* Presencial */}
                <div className="p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/40 relative shadow-xs">
                  <span className="text-[9px] text-emerald-800 font-bold uppercase block">
                    Presencial
                  </span>
                  <span className="text-xl font-extrabold text-emerald-700 block mt-0.5">22</span>
                  <span className="text-[9px] text-slate-500 block">no salão social</span>
                  <DestaqueNumero
                    numero="13"
                    cor="verde"
                    className="absolute top-1.5 right-1.5 scale-75"
                  />
                </div>

                {/* Remoto */}
                <div className="p-2.5 rounded-lg border border-blue-200 bg-blue-50/40 relative shadow-xs">
                  <span className="text-[9px] text-[#0066FF] font-bold uppercase block">
                    Remoto / Online
                  </span>
                  <span className="text-xl font-extrabold text-[#0066FF] block mt-0.5">16</span>
                  <span className="text-[9px] text-slate-500 block">plataforma virtual</span>
                  <DestaqueNumero
                    numero="14"
                    cor="azul"
                    className="absolute top-1.5 right-1.5 scale-75"
                  />
                </div>

                {/* Procuração */}
                <div className="p-2.5 rounded-lg border border-amber-200 bg-amber-50/40 relative shadow-xs">
                  <span className="text-[9px] text-amber-800 font-bold uppercase block">
                    Por Procuração
                  </span>
                  <span className="text-xl font-extrabold text-amber-700 block mt-0.5">5</span>
                  <span className="text-[9px] text-slate-500 block">com mandato anexo</span>
                  <DestaqueNumero
                    numero="15"
                    cor="ambar"
                    className="absolute top-1.5 right-1.5 scale-75"
                  />
                </div>
              </div>

              {/* Explicações Numeradas */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                <div className="flex items-start gap-1">
                  <DestaqueNumero numero="12" cor="marinho" className="w-3.5 h-3.5 text-[8px]" />
                  <span>
                    <strong>Total Geral:</strong> soma física + virtual para comparar com a
                    convenção.
                  </span>
                </div>
                <div className="flex items-start gap-1">
                  <DestaqueNumero numero="13" cor="verde" className="w-3.5 h-3.5 text-[8px]" />
                  <span>
                    <strong>Físicas:</strong> participantes conferidos pessoalmente no local.
                  </span>
                </div>
                <div className="flex items-start gap-1">
                  <DestaqueNumero numero="14" cor="azul" className="w-3.5 h-3.5 text-[8px]" />
                  <span>
                    <strong>Virtuais:</strong> participantes conectados pela internet.
                  </span>
                </div>
                <div className="flex items-start gap-1">
                  <DestaqueNumero numero="15" cor="ambar" className="w-3.5 h-3.5 text-[8px]" />
                  <span>
                    <strong>Mandatos:</strong> subconjunto que vota por procuração legal.
                  </span>
                </div>
              </div>
            </div>

            {/* SEÇÃO 7: COMO ESSES DADOS APARECEM NA ATA */}
            <div className="mb-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#002B5E] flex items-center gap-1.5 mb-2">
                <DestaqueNumero numero={7} cor="azul" />
                <span>7. Como Esses Dados Aparecem na Ata da Assembleia</span>
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed mb-2.5">
                Ao redigir e publicar a Ata da Assembleia (módulo <code>/mesa/ata</code>), o sistema
                transfere as contagens exatas da lista de presença para o texto solene sob as duas
                rubricas oficiais:
              </p>

              {/* MOCKUP 6: TRECHO OFICIAL DA ATA DA ASSEMBLEIA */}
              <div className="border border-slate-300 rounded-lg p-3.5 bg-slate-50/70 font-serif text-xs leading-relaxed text-justify space-y-2">
                <div className="border-b border-slate-200 pb-1 font-sans text-[10px] font-bold uppercase text-[#002B5E] flex items-center justify-between">
                  <span>Transcrição Fiel na Ata da Assembleia</span>
                  <span className="text-emerald-700 font-semibold font-mono">
                    Art. 1.352 Código Civil
                  </span>
                </div>

                <p className="text-[11px] text-slate-800">
                  "...Instalada a assembleia às 19h30 em segunda convocação, a Mesa Diretora
                  conferiu a lista de presenças através da Plataforma Virtual Koinon, registrando o
                  comparecimento de <strong>38 (trinta e oito) unidades autônomas</strong> das 52
                  (cinquenta e duas) elegíveis deste condomínio, assim discriminadas:
                </p>

                <div className="pl-4 font-sans text-[10.5px] space-y-1 my-1 text-slate-700 border-l-2 border-[#002B5E]">
                  <div>
                    • <strong>Presenças Físicas (Presencial no Salão):</strong> 22 (vinte e duas)
                    unidades com credenciamento presencial e rubrica eletrônica colhida pela mesa
                    diretora;
                  </div>
                  <div>
                    • <strong>Presenças Virtuais (Plataforma Virtual Koinon):</strong> 16
                    (dezesseis) unidades autenticadas remotamente por canal seguro com assinatura e
                    carimbo SHA-256;
                  </div>
                  <div>
                    • <strong>Representação por Procuração:</strong> 5 (cinco) unidades com
                    instrumentos de mandato conferidos e arquivados no dossiê da assembleia..."
                  </div>
                </div>

                <p className="text-[11px] text-slate-800">
                  ...Constatou-se, portanto, quórum regulamentar superior à exigência da Convenção
                  Condominial para a deliberação válida de todas as matérias pautadas."
                </p>
              </div>
            </div>

            {/* QUADRO-RESUMO DE BOAS PRÁTICAS E PREVENÇÃO DE ERROS */}
            <div className="p-3 bg-[#F3F7FC] border border-[#0066FF]/30 rounded-lg space-y-1.5 text-xs">
              <span className="font-bold text-[#002B5E] uppercase text-[11px] flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-[#0066FF]" /> Checklist Rápido para o Dia da
                Assembleia
              </span>
              <ul className="list-disc list-inside text-slate-700 text-[10.5px] space-y-1 pl-1">
                <li>
                  <strong>Antes de abrir:</strong> confira se a assembleia correta está selecionada
                  no topo.
                </li>
                <li>
                  <strong>Condômino no salão:</strong> marque sempre como <em>Presencial</em> para
                  evitar duplo voto e garantir o selo verde.
                </li>
                <li>
                  <strong>Procurações:</strong> confira a validade do mandato e anexe o arquivo PDF
                  ou foto nítida da procuração.
                </li>
                <li>
                  <strong>Ao encerrar:</strong> o Presidente e o Secretário devem apor suas
                  assinaturas eletrônicas no rodapé da lista.
                </li>
                <li>
                  <strong>Impressão:</strong> use o botão "Imprimir Documento A4" para anexar a via
                  física ao livro de atas se o cartório local exigir.
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

export default ManualPresencaPage
