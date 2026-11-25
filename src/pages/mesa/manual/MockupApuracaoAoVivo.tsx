import React from 'react'
import { CheckCircle2, XCircle, MinusCircle, Activity, Users, Gavel, Video } from 'lucide-react'
import { ChipMesa, QuadroMockup, CabecalhoFake, CardFundo } from './MockupBaseMesa'
import { BlocoInfo } from '@/pages/morador/manual/BlocosManual'

/**
 * Mockup da tela Apuração ao Vivo (/mesa/apuracao):
 * cabeçalho com deliberação monitorada + selo "Tempo real",
 * faixa de participantes e cartões por item de pauta.
 */
export const MockupApuracaoAoVivo: React.FC = () => (
  <QuadroMockup label="Apuração ao Vivo — contagem em tempo real por pauta">
    <div className="flex items-center gap-2 border-b border-slate-100 bg-[#F3F7FC] px-3 py-2">
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#0066FF]/10 text-[#0066FF]">
        <Activity className="h-3.5 w-3.5" />
      </span>
      <span className="text-xs font-bold text-[#002B5E]">Apuração ao Vivo</span>
    </div>
    <div className="space-y-3 bg-[#F3F7FC] p-3">
      <div className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 shadow-sm">
        <div>
          <p className="text-[10px] font-semibold text-slate-500">Deliberação monitorada</p>
          <p className="text-xs font-bold text-[#002B5E]">
            Assembleia Geral — Prestação de Contas 2026
          </p>
        </div>
        <ChipMesa tone="emerald">
          <span
            className="mr-0.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"
            aria-hidden
          />
          Tempo real
        </ChipMesa>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <CardFundo className="p-2 text-center">
          <p className="flex items-center justify-center gap-1 text-[9px] font-semibold text-slate-500">
            <Users className="h-3 w-3" /> Elegíveis
          </p>
          <p className="text-sm font-bold text-[#002B5E]">48</p>
        </CardFundo>
        <CardFundo className="p-2 text-center">
          <p className="flex items-center justify-center gap-1 text-[9px] font-semibold text-slate-500">
            <Activity className="h-3 w-3" /> Presentes
          </p>
          <p className="text-sm font-bold text-[#002B5E]">31</p>
        </CardFundo>
        <CardFundo className="p-2 text-center">
          <p className="flex items-center justify-center gap-1 text-[9px] font-semibold text-slate-500">
            <Gavel className="h-3 w-3" /> Presencial
          </p>
          <p className="text-sm font-bold text-[#002B5E]">12</p>
        </CardFundo>
        <CardFundo className="p-2 text-center">
          <p className="flex items-center justify-center gap-1 text-[9px] font-semibold text-slate-500">
            <Video className="h-3 w-3" /> Remoto
          </p>
          <p className="text-sm font-bold text-[#002B5E]">19</p>
        </CardFundo>
      </div>

      {/* Item de pauta — aprovado */}
      <CardFundo>
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
          <span className="text-xs font-bold text-[#002B5E]">1. Aprovação das contas 2026</span>
          <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-700">
            <CheckCircle2 className="h-3 w-3" /> Aprovado
          </span>
        </div>
        <div className="mt-1.5 grid grid-cols-3 gap-1.5 text-center">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 py-1">
            <p className="text-[9px] font-semibold text-emerald-700">Favorável</p>
            <p className="text-sm font-bold text-emerald-600">24</p>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50 py-1">
            <p className="text-[9px] font-semibold text-red-700">Desfavorável</p>
            <p className="text-sm font-bold text-red-600">3</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 py-1">
            <p className="text-[9px] font-semibold text-slate-500">Nulo</p>
            <p className="text-sm font-bold text-slate-500">1</p>
          </div>
        </div>
        <p className="mt-1 text-[9px] text-slate-400">Quórum: maioria simples dos presentes</p>
      </CardFundo>

      {/* Item de pauta — aguardando */}
      <CardFundo>
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
          <span className="text-xs font-bold text-[#002B5E]">2. Rateio da obra da garagem</span>
          <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-700">
            <MinusCircle className="h-3 w-3" /> Aguardando quórum
          </span>
        </div>
        <div className="mt-1.5 grid grid-cols-3 gap-1.5 text-center">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 py-1">
            <p className="text-[9px] font-semibold text-emerald-700">Favorável</p>
            <p className="text-sm font-bold text-emerald-600">14</p>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50 py-1">
            <p className="text-[9px] font-semibold text-red-700">Desfavorável</p>
            <p className="text-sm font-bold text-red-600">11</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 py-1">
            <p className="text-[9px] font-semibold text-slate-500">Nulo</p>
            <p className="text-sm font-bold text-slate-500">2</p>
          </div>
        </div>
        <p className="mt-1 text-[9px] text-slate-400">Quórum: regimental — dois terços (2/3)</p>
      </CardFundo>

      {/* Item de pauta — reprovado */}
      <CardFundo>
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
          <span className="text-xs font-bold text-[#002B5E]">
            3. Alteração da convenção — art. 12
          </span>
          <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[9px] font-bold text-red-700">
            <XCircle className="h-3 w-3" /> Reprovado
          </span>
        </div>
        <div className="mt-1.5 grid grid-cols-3 gap-1.5 text-center">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 py-1">
            <p className="text-[9px] font-semibold text-emerald-700">Favorável</p>
            <p className="text-sm font-bold text-emerald-600">9</p>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50 py-1">
            <p className="text-[9px] font-semibold text-red-700">Desfavorável</p>
            <p className="text-sm font-bold text-red-600">18</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 py-1">
            <p className="text-[9px] font-semibold text-slate-500">Nulo</p>
            <p className="text-sm font-bold text-slate-500">0</p>
          </div>
        </div>
        <p className="mt-1 text-[9px] text-slate-400">Quórum: maioria simples dos presentes</p>
      </CardFundo>

      <BlocoInfo
        titulo="Papel da Mesa"
        itens={[
          'Acompanhar a contagem em tempo real — os números mudam sozinhos a cada voto, sem recarregar a página',
          'Conferir o quórum aplicável de cada pauta antes de declarar o resultado em plenária',
          'Validar o resultado oficial no Boletim da Urna, em Auditoria, antes da leitura em assembleia',
        ]}
      />
    </div>
  </QuadroMockup>
)
