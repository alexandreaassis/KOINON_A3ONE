import React from 'react'
import { KoinonSymbol } from '@/components/brand/KoinonSymbol'
import { KoinonLogo } from '@/components/brand/KoinonLogo'
import { EndossoA3One } from '@/components/brand/EndossoA3One'
import { cn } from '@/lib/utils'

export interface SecaoManual {
  id: string
  titulo: string
  rota: string
  icone: React.ComponentType<{ className?: string }>
  resumo?: string
}

export interface Marcador {
  n: number
  x: number // percentual da largura do mockup
  y: number // percentual da altura do mockup
}

/* ---------------- Capa ---------------- */
export const CapaManual: React.FC<{ onImprimir: () => void }> = ({ onImprimir }) => (
  <header className="print-block rounded-3xl overflow-hidden border border-[#002B5E]/10 bg-gradient-to-br from-[#002B5E] via-[#013A7A] to-[#0066FF] text-white shadow-lg">
    <div className="relative p-6 sm:p-10">
      <div aria-hidden className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/5" />
      <div
        aria-hidden
        className="absolute right-10 top-24 h-24 w-24 rounded-full border-2 border-white/10"
      />
      <div className="relative">
        <KoinonSymbol size={72} variant="on-navy" />
        <div className="mt-4">
          <KoinonLogo size={50} variant="on-navy" subtitle="Condomínio Lago Azul" />
        </div>
        <h1 className="mt-6 font-poppins text-2xl sm:text-3xl font-bold leading-tight">
          Manual de Instrução do Módulo do Morador
        </h1>
        <p className="mt-3 max-w-2xl text-sm sm:text-base text-white/85 leading-relaxed">
          Um guia ilustrado, em linguagem simples, para você entender cada página do seu módulo — do
          cadastro até a ata da assembleia — e participar das assembleias eletrônicas do Lago Azul
          com toda a segurança.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onImprimir}
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#002B5E] shadow hover:bg-[#F3F7FC] transition-colors"
          >
            Versão para impressão (PDF)
          </button>
          <a
            href="#guia-conteudo"
            className="rounded-xl border border-white/40 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
          >
            Começar a ler
          </a>
        </div>
      </div>
    </div>
    <div className="border-t border-white/15 bg-black/15 px-6 py-4 sm:px-10 flex flex-wrap items-center justify-between gap-3">
      <EndossoA3One variant="on-navy" />
      <span className="text-[11px] sm:text-xs text-white/70">
        Assembleia Eletrônica Lago Azul — apuração conferida pela mesa
      </span>
    </div>
  </header>
)

/* ---------------- Título de seção + botão Ouvir ---------------- */
export const TituloSecao: React.FC<{
  secao: SecaoManual
  onOuvir: () => void
  narrando: boolean
  emPausa: boolean
  suportaVoz: boolean
  onPausar: () => void
  onParar: () => void
}> = ({ secao, onOuvir, narrando, emPausa, suportaVoz, onPausar, onParar }) => {
  const Icone = secao.icone
  return (
    <div className="print-block flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0066FF]/10 text-[#0066FF]">
          <Icone className="h-5 w-5" />
        </span>
        <div>
          <h2
            id={secao.id}
            className="scroll-mt-24 font-poppins text-xl sm:text-2xl font-bold text-[#002B5E]"
          >
            {secao.titulo}
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Página do sistema:{' '}
            <code className="rounded bg-[#F3F7FC] px-1.5 py-0.5 text-xs font-semibold text-[#0066FF]">
              {secao.rota}
            </code>
          </p>
        </div>
      </div>

      {suportaVoz && (
        <div className="flex items-center gap-1.5 print:hidden">
          <button
            type="button"
            onClick={onOuvir}
            className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors',
              narrando && !emPausa
                ? 'bg-[#0066FF] text-white'
                : 'bg-[#0066FF]/10 text-[#0066FF] hover:bg-[#0066FF]/20',
            )}
            aria-label={`Ouvir explicação da seção ${secao.titulo}`}
          >
            {narrando && !emPausa ? (
              <>
                <span className="h-2 w-2 animate-pulse rounded-full bg-white" aria-hidden />
                Narração em andamento
              </>
            ) : (
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <path d="M11 5 6 9H2v6h4l5 4V5Z" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M15.5 8.5a5 5 0 0 1 0 7" strokeLinecap="round" />
                <path d="M18.5 5.5a9 9 0 0 1 0 13" strokeLinecap="round" />
              </svg>
            )}
            {narrando && !emPausa ? null : 'Ouvir explicação'}
          </button>
          {narrando && (
            <>
              <button
                type="button"
                onClick={onPausar}
                className="rounded-lg border border-[#0066FF]/30 px-2.5 py-2 text-xs font-semibold text-[#0066FF] hover:bg-[#0066FF]/10"
                aria-label={emPausa ? 'Retomar narração' : 'Pausar narração'}
              >
                {emPausa ? 'Retomar' : 'Pausar'}
              </button>
              <button
                type="button"
                onClick={onParar}
                className="rounded-lg border border-slate-300 px-2.5 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100"
                aria-label="Parar narração"
              >
                Parar
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

/* ---------------- Mockup ilustrado com marcadores numerados ---------------- */
export const MockupTela: React.FC<{
  titulo: string
  children: React.ReactNode
  marcadores: Marcador[]
}> = ({ titulo, children, marcadores }) => (
  <div className="print-block">
    <div className="relative overflow-hidden rounded-2xl border-2 border-[#002B5E]/15 bg-white shadow-[0_10px_40px_rgba(0,43,94,0.08)]">
      {/* barra de janela */}
      <div className="flex items-center gap-2 border-b border-slate-100 bg-[#F3F7FC] px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#F87171]" aria-hidden />
        <span className="h-2.5 w-2.5 rounded-full bg-[#FBBF24]" aria-hidden />
        <span className="h-2.5 w-2.5 rounded-full bg-[#34D399]" aria-hidden />
        <span className="ml-3 truncate text-[11px] font-medium text-slate-400">{titulo}</span>
      </div>
      {/* conteúdo da tela */}
      <div className="relative">
        {children}
        {marcadores.map((m) => (
          <span
            key={m.n}
            aria-label={`Destaque número ${m.n}`}
            className="absolute z-10 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-[#0066FF] text-[13px] font-bold text-white shadow-md ring-2 ring-[#0066FF]/20"
            style={{ left: `${m.x}%`, top: `${m.y}%` }}
          >
            {m.n}
          </span>
        ))}
      </div>
    </div>
  </div>
)

/* ---------------- Legenda numerada ---------------- */
export const LegendaNumerada: React.FC<{
  itens: Array<{ n: number; titulo: string; texto: string }>
}> = ({ itens }) => (
  <ol className="print-block grid gap-3 sm:grid-cols-2">
    {itens.map((item) => (
      <li
        key={item.n}
        className="flex gap-3 rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm"
      >
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#002B5E] text-[13px] font-bold text-white">
          {item.n}
        </span>
        <div>
          <p className="text-sm font-semibold text-[#002B5E]">{item.titulo}</p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-slate-600">{item.texto}</p>
        </div>
      </li>
    ))}
  </ol>
)

/* ---------------- Caixas IMPORTANTE / DICA ---------------- */
export const CaixaImportante: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="print-block rounded-xl border-l-4 border-[#F59E0B] bg-[#FEF3C7]/70 p-4">
    <p className="text-sm font-bold text-amber-700">IMPORTANTE</p>
    <p className="mt-1 text-[13px] leading-relaxed text-amber-900">{children}</p>
  </div>
)

export const CaixaDica: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="print-block rounded-xl border-l-4 border-[#0066FF] bg-[#0066FF]/5 p-4">
    <p className="text-sm font-bold text-[#0066FF]">DICA</p>
    <p className="mt-1 text-[13px] leading-relaxed text-slate-700">{children}</p>
  </div>
)

/* ---------------- Pequenos elementos de mockup ---------------- */
export const LinhaDado: React.FC<{ rotulo: string; valor: string }> = ({ rotulo, valor }) => (
  <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-3 py-2">
    <span className="text-[11px] font-medium text-slate-400">{rotulo}</span>
    <span className="text-xs font-semibold text-slate-700">{valor}</span>
  </div>
)

export const ChipFake: React.FC<{
  children: React.ReactNode
  cor?: 'azul' | 'verde' | 'ambar' | 'vermelho' | 'cinza'
}> = ({ children, cor = 'azul' }) => {
  const cores: Record<string, string> = {
    azul: 'bg-[#0066FF]/10 text-[#0066FF]',
    verde: 'bg-emerald-100 text-emerald-700',
    ambar: 'bg-amber-100 text-amber-700',
    vermelho: 'bg-red-100 text-red-600',
    cinza: 'bg-slate-100 text-slate-500',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold',
        cores[cor],
      )}
    >
      {children}
    </span>
  )
}

export const BlocoInfo: React.FC<{ titulo: string; itens: string[] }> = ({ titulo, itens }) => (
  <div className="rounded-xl border border-slate-100 bg-[#F3F7FC] p-4">
    <p className="text-xs font-bold uppercase tracking-wide text-[#002B5E]/60">{titulo}</p>
    <ul className="mt-2 space-y-1.5">
      {itens.map((t) => (
        <li key={t} className="flex items-center gap-2 text-xs text-slate-600">
          <span className="h-1.5 w-1.5 rounded-full bg-[#0066FF]/50" aria-hidden />
          {t}
        </li>
      ))}
    </ul>
  </div>
)
