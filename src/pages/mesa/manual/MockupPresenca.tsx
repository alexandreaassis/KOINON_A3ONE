import React from 'react'
import { Users, UserCheck } from 'lucide-react'
import { QuadroMockup } from './MockupBaseMesa'
import { BlocoInfo, ChipFake } from '@/pages/morador/manual/BlocosManual'

/** Lista de Presença — tabela com selos PRESENCIAL / REMOTO / PROCURAÇÃO. */
export const MockupListaPresenca: React.FC = () => (
  <QuadroMockup label="Lista de Presença — quórum ao vivo com selos">
    <div className="flex items-center gap-2 border-b border-slate-100 bg-[#F3F7FC] px-3 py-2">
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#0066FF]/10 text-[#0066FF]">
        <Users className="h-3.5 w-3.5" />
      </span>
      <span className="flex items-center gap-1 text-xs font-bold text-[#002B5E]">
        Lista de Presença <UserCheck className="h-3 w-3 text-slate-300" />
      </span>
    </div>
    <div className="space-y-3 bg-[#F3F7FC] p-3">
      <div className="rounded-xl bg-white px-3 py-2.5 shadow-sm">
        <p className="text-sm font-bold text-[#002B5E]">Lista de Presença — AGE 25/05/2026</p>
        <p className="text-[10px] text-slate-400">
          Quórum de instalação ao vivo · 62 / 100 unidades (62%)
        </p>
      </div>
      <div className="rounded-xl border border-slate-100 bg-white shadow-sm">
        <div className="grid grid-cols-[1.4fr_1fr_auto] gap-2 border-b border-slate-100 bg-[#F3F7FC] px-3 py-2">
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Pessoa
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Unidade / Vínculo
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Selo</span>
        </div>
        {[
          { nome: 'Maria da Silva', unid: '101 — Bloco A · Proprietária', selo: 'presencial' },
          { nome: 'Carlos Andrade', unid: '302 — Bloco B · Inquilino', selo: 'remoto' },
          { nome: 'Rita Oliveira', unid: '204 · Procuração de José Lima', selo: 'procuracao' },
          { nome: 'João Pereira', unid: '105 — Bloco A · Proprietário', selo: 'presencial' },
          { nome: 'Ana Souza', unid: '401 · Inquilina', selo: 'remoto' },
        ].map((p) => (
          <div
            key={p.nome}
            className="grid grid-cols-[1.4fr_1fr_auto] items-center gap-2 border-b border-slate-50 px-3 py-2 last:border-b-0"
          >
            <span className="truncate text-xs font-semibold text-slate-700">{p.nome}</span>
            <span className="truncate text-[11px] text-slate-500">{p.unid}</span>
            {p.selo === 'presencial' && <ChipFake cor="verde">● PRESENCIAL</ChipFake>}
            {p.selo === 'remoto' && <ChipFake cor="azul">● REMOTO</ChipFake>}
            {p.selo === 'procuracao' && <ChipFake cor="ambar">● PROCURAÇÃO</ChipFake>}
          </div>
        ))}
      </div>
      <BlocoInfo
        titulo="Como a mesa usa esta tela"
        itens={[
          'Aprovar credenciamento insere a pessoa na lista com o selo correspondente',
          'Cada linha recebe assinatura eletrônica com carimbo SHA-256',
          'Quórum atingido libera o botão de instalar a assembleia',
        ]}
      />
    </div>
  </QuadroMockup>
)
