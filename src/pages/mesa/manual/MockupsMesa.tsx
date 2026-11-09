import React from 'react'
import { cn } from '@/lib/utils'
import {
  ShieldCheck,
  Users,
  Vote,
  Lock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Hash,
  FileText,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/* Utilitários locais de mockup                                        */
/* ------------------------------------------------------------------ */

const ChipFake: React.FC<{
  children: React.ReactNode
  tone?: 'navy' | 'blue' | 'amber' | 'green' | 'slate' | 'red'
  className?: string
}> = ({ children, tone = 'slate', className = '' }) => {
  const tones: Record<string, string> = {
    navy: 'bg-[#002B5E] text-white',
    blue: 'bg-[#0066FF]/10 text-[#0066FF]',
    amber: 'bg-amber-100 text-amber-800',
    green: 'bg-emerald-100 text-emerald-700',
    slate: 'bg-slate-100 text-slate-600',
    red: 'bg-red-100 text-red-700',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

const BarraFake: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={cn('h-2 rounded-full bg-slate-200/80', className)} />
)

const QuadroMockup: React.FC<{ children: React.ReactNode; label: string }> = ({
  children,
  label,
}) => (
  <div className="print:hidden">
    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
      {label}
    </p>
    <div className="overflow-hidden rounded-xl border-2 border-[#002B5E]/15 bg-white shadow-sm">
      {children}
      <div className="flex items-center justify-between border-t border-slate-100 bg-[#F3F7FC] px-3 py-2">
        <div className="flex gap-1.5">
          <span className="h-2 w-2 rounded-full bg-slate-300" />
          <span className="h-2 w-2 rounded-full bg-slate-300" />
          <span className="h-2 w-2 rounded-full bg-slate-300" />
        </div>
        <span className="text-[9px] font-medium text-slate-400">
          Sistema Koinon — Condomínio Lago Azul
        </span>
      </div>
    </div>
  </div>
)

const JanelaCabecalho: React.FC<{ titulo: string; icone: React.ReactNode }> = ({
  titulo,
  icone,
}) => (
  <div className="flex items-center gap-2 border-b border-slate-100 bg-[#F3F7FC]/70 px-3 py-2">
    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#0066FF]/10 text-[#0066FF]">
      {icone}
    </span>
    <span className="text-xs font-bold text-[#002B5E]">{titulo}</span>
  </div>
)

/* ------------------------------------------------------------------ */
/* 1. Painel da Mesa                                                   */
/* ------------------------------------------------------------------ */

export const MockupPainelMesa: React.FC = () => (
  <QuadroMockup label="Painel da Mesa — visão geral">
    <JanelaCabecalho titulo="Painel da Mesa" icone={<ShieldCheck className="h-3.5 w-3.5" />} />
    <div className="grid gap-2 p-3 sm:grid-cols-2">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold text-amber-800">Pendências de Aprovação</span>
          <ChipFake tone="amber">
            <AlertTriangle className="h-3 w-3" /> 3
          </ChipFake>
        </div>
        <div className="mt-2 space-y-1.5">
          <div className="flex items-center justify-between rounded-md bg-white px-2 py-1.5">
            <div className="flex items-center gap-1.5">
              <Users className="h-3 w-3 text-amber-600" />
              <BarraFake className="w-20" />
            </div>
            <ChipFake tone="amber">Cadastro</ChipFake>
          </div>
          <div className="flex items-center justify-between rounded-md bg-white px-2 py-1.5">
            <div className="flex items-center gap-1.5">
              <Vote className="h-3 w-3 text-amber-600" />
              <BarraFake className="w-16" />
            </div>
            <ChipFake tone="amber">Credenciamento</ChipFake>
          </div>
        </div>
        <p className="mt-2 text-center text-[10px] font-semibold text-amber-700">
          Ver pendências →
        </p>
      </div>
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2.5">
        <span className="text-[11px] font-bold text-emerald-800">Quórum de Instalação</span>
        <div className="mt-2 rounded-md bg-white px-2 py-2">
          <div className="flex items-center justify-between">
            <ChipFake tone="green">
              <CheckCircle2 className="h-3 w-3" /> Quórum Atingido
            </ChipFake>
            <span className="text-[10px] font-bold text-emerald-700">62 / 100</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-[62%] rounded-full bg-emerald-500" />
          </div>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1 text-center">
          <div className="rounded bg-white px-1 py-1">
            <p className="text-[9px] text-slate-400">Presencial</p>
            <p className="text-[10px] font-bold text-slate-600">38</p>
          </div>
          <div className="rounded bg-white px-1 py-1">
            <p className="text-[9px] text-slate-400">Remoto</p>
            <p className="text-[10px] font-bold text-slate-600">21</p>
          </div>
          <div className="rounded bg-white px-1 py-1">
            <p className="text-[9px] text-slate-400">Procuração</p>
            <p className="text-[10px] font-bold text-slate-600">3</p>
          </div>
        </div>
      </div>
    </div>
    <div className="border-t border-slate-100 px-3 py-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-[#002B5E]">Deliberação ativa</span>
        <ChipFake tone="navy">Etapa 3 de 6 — Votação</ChipFake>
      </div>
      <div className="mt-2 flex items-center gap-1">
        {['Aguardando', 'Aberta', 'Votação', 'Encerrada', 'Apurada', 'Publicada'].map(
          (etapa, i) => (
            <React.Fragment key={etapa}>
              <div
                className={cn(
                  'flex-1 rounded-md px-1 py-1 text-center text-[8px] font-semibold',
                  i === 2 ? 'bg-[#0066FF] text-white' : 'bg-slate-100 text-slate-400',
                )}
              >
                {etapa}
              </div>
              {i < 5 && <span className="text-[8px] text-slate-300">›</span>}
            </React.Fragment>
          ),
        )}
      </div>
      ak{' '}
    </div>
  </QuadroMockup>
)
