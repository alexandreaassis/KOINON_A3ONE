import React from 'react'
import { CheckCircle2, UserCheck, FileSignature, FileText, ShieldCheck } from 'lucide-react'
import { QuadroMockup, ChipMesa } from './MockupBaseMesa'
import { ChipFake, BlocoInfo } from '@/pages/morador/manual/BlocosManual'

/** Mockup do ciclo "como o sistema se conecta": credenciamento → urna → ata → auditoria. */
export const MockupCicloMesa: React.FC = () => (
  <QuadroMockup label="Como o sistema se conecta — ciclo completo">
    <div className="flex items-center gap-2 border-b border-slate-100 bg-[#F3F7FC] px-3 py-2">
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#0066FF]/10 text-[#0066FF]">
        <ShieldCheck className="h-3.5 w-3.5" />
      </span>
      <span className="text-xs font-bold text-[#002B5E]">Ciclo da assembleia</span>
    </div>
    <div className="space-y-3 bg-[#F3F7FC] p-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <CardEtapa
          n={1}
          titulo="Credenciamento"
          texto="A mesa aprova quem vai participar"
          icone={<UserCheck className="h-4 w-4" />}
        >
          <ChipFake cor="verde">● PRESENCIAL</ChipFake>
          <ChipFake cor="azul">● REMOTO</ChipFake>
          <ChipFake cor="ambar">● PROCURAÇÃO</ChipFake>
        </CardEtapa>
        <CardEtapa
          n={2}
          titulo="Urna eletrônica"
          texto="O morador vota e o sistema grava o hash"
          icone={<CheckCircle2 className="h-4 w-4" />}
        >
          <span className="rounded bg-white px-2 py-0.5 font-mono text-[10px] text-slate-600 shadow-sm">
            sha256: a1c4e9…
          </span>
        </CardEtapa>
        <CardEtapa
          n={3}
          titulo="Ata e dossiê"
          texto="A mesa registra, assina e arquiva"
          icone={<FileSignature className="h-4 w-4" />}
        >
          <div className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-[#0066FF]" />
            <ChipMesa tone="blue">PDF assinado</ChipMesa>
          </div>
        </CardEtapa>
      </div>
      <BlocoInfo
        titulo="O que garante a confiança no resultado"
        itens={[
          'Sem credenciamento aprovado, a urna não abre',
          'Cada voto gera um hash ligado ao anterior (auditoria)',
          'Ata, boletim e dossiê saem dos mesmos dados apurados',
        ]}
      />
    </div>
  </QuadroMockup>
)

const CardEtapa: React.FC<{
  n: number
  titulo: string
  texto: string
  icone: React.ReactNode
  children: React.ReactNode
}> = ({ n, titulo, texto, icone, children }) => (
  <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
    <div className="flex items-center gap-2">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#002B5E] text-[11px] font-bold text-white">
        {n}
      </span>
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#0066FF]/10 text-[#0066FF]">
        {icone}
      </span>
      <p className="text-xs font-bold text-[#002B5E]">{titulo}</p>
    </div>
    <p className="mt-1 text-[10px] leading-relaxed text-slate-500">{texto}</p>
    <div className="mt-2 flex flex-wrap items-center gap-1.5">{children}</div>
  </div>
)
