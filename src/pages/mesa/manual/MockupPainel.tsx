import React from 'react'
import { ShieldCheck, Users, Vote, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { ChipMesa, QuadroMockup, JanelaCabecalho, BarraFake } from './MockupBaseMesa'

/** Painel da Mesa — visão geral, pendências e etapa da deliberação ativa. */
export const MockupPainelMesa: React.FC = () => (
  <QuadroMockup label="Painel da Mesa — visão geral">
    <JanelaCabecalho titulo="Painel da Mesa" icone={<ShieldCheck className="h-3.5 w-3.5" />} />
    <div className="grid gap-2 p-3 sm:grid-cols-2">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold text-amber-800">Pendências de Aprovação</span>
          <ChipMesa tone="amber">
            <AlertTriangle className="h-3 w-3" /> 3
          </ChipMesa>
        </div>
        <div className="mt-2 space-y-1.5">
          <div className="flex items-center justify-between rounded-md bg-white px-2 py-1.5">
            <div className="flex items-center gap-1.5">
              <Users className="h-3 w-3 text-amber-600" />
              <BarraFake className="w-20" />
            </div>
            <ChipMesa tone="amber">Cadastro</ChipMesa>
          </div>
          <div className="flex items-center justify-between rounded-md bg-white px-2 py-1.5">
            <div className="flex items-center gap-1.5">
              <Vote className="h-3 w-3 text-amber-600" />
              <BarraFake className="w-16" />
            </div>
            <ChipMesa tone="amber">Credenciamento</ChipMesa>
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
            <ChipMesa tone="green">
              <CheckCircle2 className="h-3 w-3" /> Quórum Atingido
            </ChipMesa>
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
        <ChipMesa tone="blue">Etapa 3 de 6 — Votação</ChipMesa>
      </div>
      <div className="mt-2 flex items-center gap-1">
        {['Aguardando', 'Aberta', 'Votação', 'Encerrada', 'Apurada', 'Publicada'].map(
          (etapa, i) => (
            <React.Fragment key={etapa}>
              <div
                className={`flex-1 rounded-md px-1 py-1 text-center text-[8px] font-semibold ${
                  i === 2 ? 'bg-[#0066FF] text-white' : 'bg-slate-100 text-slate-400'
                }`}
              >
                {etapa}
              </div>
              {i < 5 && <span className="text-[8px] text-slate-300">›</span>}
            </React.Fragment>
          ),
        )}
      </div>
      <p className="mt-2 text-center text-[10px] text-slate-400">
        Botoeira: cada clique pede confirmação — nada acontece de uma vez.
      </p>
    </div>
  </QuadroMockup>
)
