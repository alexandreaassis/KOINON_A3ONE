import React from 'react'
import { CheckCircle2, Clock, Search } from 'lucide-react'
import { ChipMesa, QuadroMockup, JanelaCabecalho, CabecalhoFake, CardFundo } from './MockupBaseMesa'
import { BlocoInfo } from '@/pages/morador/manual/BlocosManual'

/** Credenciamentos — abas, resumo de pendências (5 cartões) e fila de análise. */
export const MockupCredenciamentosMesa: React.FC = () => (
  <QuadroMockup label="Credenciamentos — abas e resumo de pendências">
    <JanelaCabecalho titulo="Credenciamentos" icone={<CheckCircle2 className="h-3.5 w-3.5" />} />
    <div className="space-y-3 bg-[#F3F7FC] p-3">
      <CabecalhoFake
        titulo="Credenciamentos"
        sub="Análise de cadastros e credenciamento para votação"
      />

      {/* Abas */}
      <div className="flex gap-2">
        <span className="rounded-t-lg bg-white px-3 py-1.5 text-[11px] font-bold text-[#0066FF] shadow-sm">
          Cadastros Públicos
        </span>
        <span className="rounded-t-lg bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-400">
          Credenciamento de Votação
        </span>
      </div>

      {/* Resumo de pendências — 5 cartões */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {[
          {
            rotulo: 'Pendentes',
            valor: '3',
            cor: 'border-amber-200 bg-amber-50',
            texto: 'text-amber-700',
          },
          {
            rotulo: 'Aprovados hoje',
            valor: '5',
            cor: 'border-emerald-200 bg-emerald-50',
            texto: 'text-emerald-700',
          },
          {
            rotulo: 'Rejeitados',
            valor: '1',
            cor: 'border-red-200 bg-red-50',
            texto: 'text-red-600',
          },
          {
            rotulo: 'Unidades ativas',
            valor: '98',
            cor: 'border-[#0066FF]/25 bg-[#0066FF]/5',
            texto: 'text-[#0066FF]',
          },
          {
            rotulo: 'Total',
            valor: '107',
            cor: 'border-slate-200 bg-white',
            texto: 'text-slate-700',
          },
        ].map((c) => (
          <div key={c.rotulo} className={`rounded-xl border p-2.5 text-center ${c.cor}`}>
            <p className={`text-base font-bold ${c.texto}`}>{c.valor}</p>
            <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
              {c.rotulo}
            </p>
          </div>
        ))}
      </div>

      {/* Busca + fila */}
      <CardFundo className="p-3">
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
          <Search className="h-3.5 w-3.5 text-slate-300" />
          <span className="text-[11px] text-slate-400">
            Buscar por nome, unidade ou CPF (com ou sem pontos)
          </span>
        </div>
        <div className="mt-2 space-y-1.5">
          <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2">
            <div>
              <p className="text-xs font-bold text-[#002B5E]">Maria da Silva</p>
              <p className="text-[10px] text-slate-500">Unidade 101 — Bloco A · Proprietária</p>
            </div>
            <ChipMesa tone="amber">
              <Clock className="h-3 w-3" /> Pendente
            </ChipMesa>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2">
            <div>
              <p className="text-xs font-bold text-[#002B5E]">Carlos Andrade</p>
              <p className="text-[10px] text-slate-500">Unidade 302 — Bloco B · Inquilino</p>
            </div>
            <ChipMesa tone="amber">
              <Clock className="h-3 w-3" /> Pendente
            </ChipMesa>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-2.5 py-2">
            <div>
              <p className="text-xs font-semibold text-slate-600">Ana Souza</p>
              <p className="text-[10px] text-slate-400">Unidade 204 · Proprietária</p>
            </div>
            <ChipMesa tone="green">
              <CheckCircle2 className="h-3 w-3" /> Aprovado
            </ChipMesa>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[10px] font-bold text-white">
            Aprovar
          </span>
          <span className="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-[10px] font-bold text-red-600">
            Rejeitar com motivo
          </span>
          <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-500">
            Abrir modal de análise
          </span>
        </div>
      </CardFundo>
    </div>
    <BlocoInfo
      titulo="O que a mesa avalia aqui"
      itens={[
        'Cadastro público enviado por link da unidade (dados, documentos, vínculo)',
        'Credenciamento do morador para votar na assembleia (presencial, remoto ou procuração)',
        'Pendentes ficam destacados em âmbar; aprovar/rejeitar sempre pede confirmação',
      ]}
    />
  </QuadroMockup>
)
