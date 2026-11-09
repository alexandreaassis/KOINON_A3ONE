import React from 'react'
import { cn } from '@/lib/utils'

/** Selo/chip colorido usado dentro dos mockups da mesa. */
export const ChipMesa: React.FC<{
  tone?: 'green' | 'blue' | 'amber' | 'slate' | 'red' | 'emerald'
  children: React.ReactNode
  className?: string
}> = ({ tone = 'slate', children, className }) => {
  const tones: Record<string, string> = {
    green: 'bg-emerald-100 text-emerald-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    blue: 'bg-[#0066FF]/10 text-[#0066FF]',
    amber: 'bg-amber-100 text-amber-700',
    slate: 'bg-slate-100 text-slate-500',
    red: 'bg-red-100 text-red-600',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

/** Quadro externo do mockup — moldura com etiqueta explicativa. */
export const QuadroMockup: React.FC<{
  label: string
  children: React.ReactNode
  className?: string
}> = ({ label, children, className }) => (
  <div
    className={cn(
      'overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm',
      className,
    )}
  >
    <span className="sr-only">{label}</span>
    {children}
  </div>
)

/** Cartão com rótulo em cima e conteúdo dentro. */
export const CartaoMiniMockup: React.FC<{
  rotulo: string
  icone?: React.ReactNode
  children: React.ReactNode
}> = ({ rotulo, icone, children }) => (
  <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
    <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[#002B5E]/70">
      {icone}
      {rotulo}
    </p>
    {children}
  </div>
)

/** Cabeçalho de janela dos mockups (título + ícone). */
export const JanelaCabecalho: React.FC<{
  titulo: string
  icone?: React.ReactNode
}> = ({ titulo, icone }) => (
  <div className="flex items-center gap-2 border-b border-slate-100 bg-[#F3F7FC] px-3 py-2">
    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#0066FF]/10 text-[#0066FF]">
      {icone}
    </span>
    <span className="text-xs font-bold text-[#002B5E]">{titulo}</span>
  </div>
)

/** Cabeçalho "de página" dentro do mockup (título + subtítulo). */
export const CabecalhoFake: React.FC<{ titulo: string; sub?: string }> = ({ titulo, sub }) => (
  <div className="rounded-xl bg-white px-3 py-2.5 shadow-sm">
    <p className="text-sm font-bold text-[#002B5E]">{titulo}</p>
    {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
  </div>
)

/** Cartão branco padrão do mockup. */
export const CardFundo: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div className={cn('rounded-xl border border-slate-100 bg-white p-3 shadow-sm', className)}>
    {children}
  </div>
)

/** Barra esqueleto simulando texto/linha de dados nos mockups. */
export const BarraFake: React.FC<{ className?: string }> = ({ className = 'w-16' }) => (
  <span className={cn('inline-block h-2 rounded bg-slate-200/80', className)} aria-hidden />
)
