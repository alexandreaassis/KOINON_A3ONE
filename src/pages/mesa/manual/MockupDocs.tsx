import React from 'react'
import {
  FileText,
  FileSignature,
  Gavel,
  ClipboardList,
  ScrollText,
  Hash,
  Link2,
  CheckCircle2,
  Printer,
  Download,
  PenTool,
} from 'lucide-react'
import { ChipMesa, QuadroMockup, CabecalhoFake, CardFundo } from './MockupBaseMesa'
import { BlocoInfo, ChipFake } from '@/pages/morador/manual/BlocosManual'

/* ---------------- Documentos & Edital ---------------- */

export const MockupDocumentosEdital: React.FC = () => (
  <QuadroMockup label="Documentos & Edital — geração e distribuição">
    <div className="flex items-center gap-2 border-b border-slate-100 bg-[#F3F7FC] px-3 py-2">
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#0066FF]/10 text-[#0066FF]">
        <ScrollText className="h-3.5 w-3.5" />
      </span>
      <span className="text-xs font-bold text-[#002B5E]">Documentos & Edital</span>
    </div>
    <div className="space-y-3 bg-[#F3F7FC] p-3">
      <CabecalhoFake
        titulo="Documentos & Edital"
        sub="Geração, publicação e distribuição dos documentos oficiais"
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <CardFundo>
          <div className="flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-[#0066FF]" />
            <p className="text-xs font-bold text-[#002B5E]">Edital de Convocação</p>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
            Gerado com data, hora, local/link e itens da pauta. Publicado, aparece para os moradores
            e pode ser distribuído por e-mail e WhatsApp.
          </p>
          <div className="mt-2 flex gap-1.5">
            <ChipMesa tone="green">Publicado</ChipMesa>
            <ChipMesa tone="blue">PDF</ChipMesa>
          </div>
        </CardFundo>
        <CardFundo>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-[#0066FF]" />
            <p className="text-xs font-bold text-[#002B5E]">Pauta e anexos</p>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
            Cada deliberação vira um item organizado, com prestação de contas, convenção, currículos
            e propostas anexados.
          </p>
          <div className="mt-2 flex gap-1.5">
            <ChipMesa tone="navy">6 itens na pauta</ChipMesa>
            <ChipMesa tone="slate">4 anexos</ChipMesa>
          </div>
        </CardFundo>
        <CardFundo>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#0066FF]" />
            <p className="text-xs font-bold text-[#002B5E]">Informativo de Deliberações</p>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
            Após a assembleia, resume o que foi aprovado e rejeitado — distribuído aos moradores
            como prestação de contas da votação.
          </p>
          <div className="mt-2 flex gap-1.5">
            <ChipMesa tone="slate">gerado após apuração</ChipMesa>
          </div>
        </CardFundo>
        <CardFundo>
          <div className="flex items-center gap-2">
            <Gavel className="h-4 w-4 text-[#0066FF]" />
            <p className="text-xs font-bold text-[#002B5E]">Canais de envio</p>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
            E-mail e WhatsApp do condomínio configurados em Configurações alimentam a distribuição
            automática dos documentos.
          </p>
          <div className="mt-2 flex gap-1.5">
            <ChipMesa tone="blue">E-mail configurado</ChipMesa>
            <ChipMesa tone="green">WhatsApp via wa.me</ChipMesa>
          </div>
        </CardFundo>
      </div>
      <BlocoInfo
        titulo="Fluxo recomendado"
        itens={[
          'Cadastre a assembleia e as deliberações em Deliberações e Pautas',
          'Gere e revise o Edital; publique e distribua aos moradores',
          'Após a apuração, emita o Informativo de Deliberações',
        ]}
      />
    </div>
  </QuadroMockup>
)

/* ---------------- Ata (editor + assinatura da mesa) ---------------- */

export const MockupAtaMesa: React.FC = () => (
  <QuadroMockup label="Ata — editor rico, apoio de IA e assinaturas">
    <div className="flex items-center gap-2 border-b border-slate-100 bg-[#F3F7FC] px-3 py-2">
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#0066FF]/10 text-[#0066FF]">
        <FileText className="h-3.5 w-3.5" />
      </span>
      <span className="text-xs font-bold text-[#002B5E]">Ata da Assembleia</span>
    </div>
    <div className="space-y-3 bg-[#F3F7FC] p-3">
      <CabecalhoFake
        titulo="Ata da Assembleia — AGE 25/05/2026"
        sub="Editor rico · apoio de IA · assinatura eletrônica da mesa"
      />
      <CardFundo className="p-3">
        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-100 bg-[#F3F7FC] px-2 py-1.5">
          {['B', 'I', 'U', 'H1', 'H2', '• Lista', '1. Lista', 'Citação'].map((b) => (
            <span
              key={b}
              className="rounded bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-500 shadow-sm"
            >
              {b}
            </span>
          ))}
        </div>
        <div className="mt-2 rounded-lg border border-slate-100 bg-[#FDFDFB] px-3 py-2.5">
          <p className="text-[11px] leading-relaxed text-slate-600">
            Aos vinte e cinco dias do mês de maio de dois mil e vinte e seis, reuniu-se a assembleia
            geral extraordinária dos condôminos do Condomínio Lago Azul…
            <span className="text-slate-300"> ▏</span>
          </p>
        </div>
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-[#0066FF]/25 bg-[#0066FF]/5 px-2.5 py-2">
          <FileSignature className="h-3.5 w-3.5 shrink-0 text-[#0066FF]" />
          <span className="text-[10px] font-semibold text-[#0066FF]">
            IA do Koinon: sugere o texto dos resultados — a mesa revisa antes de usar
          </span>
        </div>
      </CardFundo>
      <CardFundo>
        <p className="text-xs font-bold text-[#002B5E]">Assinatura eletrônica da mesa</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-100 bg-white px-3 py-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-400">PRESIDENTE DA MESA</span>
              <ChipMesa tone="green">Assinado</ChipMesa>
            </div>
            <p className="mt-1 text-xs font-bold text-[#002B5E]">João Pereira</p>
            <div className="mt-1 flex items-center gap-1">
              <PenTool className="h-3 w-3 text-slate-300" />
              <span className="font-mono text-[10px] text-slate-400">SHA-256: 8b41f2…9c0d</span>
            </div>
          </div>
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-400">SECRETÁRIO(A)</span>
              <ChipMesa tone="amber">Aguardando</ChipMesa>
            </div>
            <p className="mt-1 text-xs font-semibold text-slate-400">Ana Souza</p>
            <p className="mt-1 text-[10px] text-slate-400">Desenhar, digitar ou carimbar</p>
          </div>
        </div>
      </CardFundo>
      <div className="flex flex-wrap gap-2">
        <span className="rounded-lg bg-[#0066FF] px-3 py-1.5 text-[10px] font-bold text-white">
          Publicar ata para os moradores
        </span>
        <span className="rounded-lg border border-[#0066FF]/30 bg-white px-3 py-1.5 text-[10px] font-bold text-[#0066FF]">
          <Download className="mr-1 inline h-3 w-3" /> Baixar PDF
        </span>
      </div>
    </div>
  </QuadroMockup>
)

/* ---------------- Auditoria (cadeia de hash + boletim de urna) ---------------- */

export const MockupAuditoria: React.FC = () => (
  <QuadroMockup label="Auditoria — cadeia de hash e boletim de urna">
    <div className="flex items-center gap-2 border-b border-slate-100 bg-[#F3F7FC] px-3 py-2">
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#0066FF]/10 text-[#0066FF]">
        <Hash className="h-3.5 w-3.5" />
      </span>
      <span className="text-xs font-bold text-[#002B5E]">Auditoria e Urna</span>
    </div>
    <div className="space-y-3 bg-[#F3F7FC] p-3">
      <CabecalhoFake
        titulo="Auditoria e Urna"
        sub="Integridade da votação · hash encadeado · boletim de urna"
      />
      <CardFundo>
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-[#002B5E]">Cadeia de hash da votação</p>
          <ChipMesa tone="green">
            <CheckCircle2 className="h-3 w-3" /> Íntegra
          </ChipMesa>
        </div>
        <div className="mt-2 space-y-1.5">
          {[
            { voto: 'Voto #001', hash: 'a1c4e9…f27b' },
            { voto: 'Voto #002', hash: 'f27b31…c904' },
            { voto: 'Voto #003', hash: 'c904d8…5a1e' },
          ].map((v, i) => (
            <div key={v.voto} className="flex items-center gap-2">
              <span className="w-16 shrink-0 text-[10px] font-semibold text-slate-500">
                {v.voto}
              </span>
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0066FF]/10 text-[#0066FF]">
                <Hash className="h-3 w-3" />
              </span>
              <span className="rounded bg-white px-2 py-0.5 font-mono text-[10px] text-slate-600 shadow-sm">
                {v.hash}
              </span>
              {i < 2 && <Link2 className="h-3 w-3 shrink-0 text-slate-300" />}
              <CheckCircle2 className="ml-auto h-3 w-3 shrink-0 text-emerald-500" />
            </div>
          ))}
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
          Cada hash nasce do voto anterior. Se alguém alterar um voto, o elo quebra e a auditoria
          mostra exatamente onde.
        </p>
      </CardFundo>
      <CardFundo>
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-[#002B5E]">Boletim de Urna — Item 2 da pauta</p>
          <ChipMesa tone="navy">Apurado</ChipMesa>
        </div>
        <div className="mt-2 space-y-1.5">
          {[
            { op: 'Favorável', qtd: 41, pct: 68, cor: 'bg-emerald-500' },
            { op: 'Contrário', qtd: 14, pct: 23, cor: 'bg-red-400' },
            { op: 'Abstenção', qtd: 5, pct: 9, cor: 'bg-slate-300' },
          ].map((r) => (
            <div key={r.op}>
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-semibold text-slate-600">{r.op}</span>
                <span className="font-bold text-slate-700">
                  {r.qtd} · {r.pct}%
                </span>
              </div>
              <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${r.cor}`} style={{ width: `${r.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <span className="rounded-lg bg-[#002B5E] px-2.5 py-1 text-[10px] font-bold text-white">
            <Printer className="mr-1 inline h-3 w-3" /> Emitir Boletim
          </span>
          <span className="rounded-lg border border-[#0066FF]/30 bg-white px-2.5 py-1 text-[10px] font-bold text-[#0066FF]">
            Dossiê Completo (cartório)
          </span>
        </div>
      </CardFundo>
      <BlocoInfo
        titulo="Verificações da auditoria"
        itens={[
          'Conferência do encadeamento de hashes, voto a voto',
          'Composição do quórum e comparação com o exigido',
          'Registro de cada ação da mesa com data e hora',
        ]}
      />
    </div>
  </QuadroMockup>
)

export { ChipFake }
