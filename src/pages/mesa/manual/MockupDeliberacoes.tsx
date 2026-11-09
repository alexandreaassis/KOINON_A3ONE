import React from 'react'
import { FileText, Paperclip, Vote } from 'lucide-react'
import { ChipFake } from '@/pages/morador/manual/BlocosManual'
import { CartaoMiniMockup } from './MockupBaseMesa'

const ItensPautaMockup: React.FC<{ itens: string[] }> = ({ itens }) => (
  <ul className="space-y-2">
    {itens.map((it, i) => (
      <li
        key={i}
        className="flex items-center gap-2 rounded-lg border border-slate-100 bg-white px-3 py-2"
      >
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#002B5E]/10 text-[10px] font-bold text-[#002B5E]">
          {i + 1}
        </span>
        <span className="flex-1 text-[11px] font-medium text-slate-700">{it}</span>
        <Paperclip className="h-3 w-3 text-slate-300" aria-hidden />
      </li>
    ))}
  </ul>
)

const MockupDeliberacoes: React.FC = () => (
  <div className="space-y-3">
    {/* Cabeçalho da assembleia */}
    <div className="rounded-xl border border-slate-100 bg-gradient-to-br from-[#002B5E] to-[#0066FF] px-4 py-3 text-white">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-white/60">Assembleia</p>
          <p className="text-sm font-bold">Assembleia Geral Ordinária · 12/03/2026</p>
        </div>
        <ChipFake cor="emerald">em preparação</ChipFake>
      </div>
    </div>

    <CartaoMiniMockup rotulo="Pauta da assembleia" icone={<FileText className="h-3.5 w-3.5" />}>
      <ItensPautaMockup
        itens={[
          'Aprovação das contas do exercício',
          'Rateio de obra da área de lazer',
          'Atualização do valor da cota condominial',
        ]}
      />
    </CartaoMiniMockup>

    <CartaoMiniMockup rotulo="Condução da deliberação" icone={<Vote className="h-3.5 w-3.5" />}>
      <div className="space-y-2">
        <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-white px-3 py-2">
          <span className="text-[11px] font-medium text-slate-700">Item 1 — votação</span>
          <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-700">
            aberta
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-white px-3 py-2">
          <span className="text-[11px] font-medium text-slate-700">Item 2 — votação</span>
          <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-500">
            aguardando
          </span>
        </div>
        <div className="rounded-lg border border-dashed border-[#0066FF]/30 bg-[#0066FF]/5 px-3 py-2 text-center text-[10px] font-semibold text-[#0066FF]">
          ABRIR VOTAÇÃO · ACOMPANHAR · ENCERRAR · APURAR
        </div>
      </div>
    </CartaoMiniMockup>
  </div>
)

export default MockupDeliberacoes
