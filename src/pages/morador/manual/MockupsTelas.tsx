import React from 'react'
import { ChipFake, LinhaDado, BlocoInfo } from './BlocosManual'
import { Home, UserCheck, Vote, Receipt, FolderArchive, FileText } from 'lucide-react'

/* Peças compartilhadas dos mockups */
const CardFundo: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div className={`rounded-xl border border-slate-100 bg-white p-4 shadow-sm ${className}`}>
    {children}
  </div>
)

const CabecalhoFake: React.FC<{ titulo: string; sub: string }> = ({ titulo, sub }) => (
  <div className="rounded-xl bg-gradient-to-r from-[#002B5E] to-[#0066FF] px-4 py-3 text-white">
    <p className="text-sm font-bold">{titulo}</p>
    <p className="text-[11px] text-white/75">{sub}</p>
  </div>
)

/* ============ 1. Minha Situação ============ */
export const MockupMinhaSituacao: React.FC = () => (
  <div className="space-y-3 bg-[#F3F7FC] p-4">
    <CabecalhoFake titulo="Minha Situação" sub="Condomínio Lago Azul · Unidade 101 — Bloco A" />
    <div className="grid gap-3 sm:grid-cols-2">
      <CardFundo>
        <p className="text-xs font-bold text-[#002B5E]">Seu cadastro</p>
        <div className="mt-2 space-y-2">
          <LinhaDado rotulo="Nome" valor="Maria da Silva" />
          <LinhaDado rotulo="Vínculo" valor="Proprietária" />
          <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-3 py-2">
            <span className="text-[11px] font-medium text-slate-400">Situação</span>
            <ChipFake cor="verde">Cadastro aprovado ✓</ChipFake>
          </div>
        </div>
      </CardFundo>
      <CardFundo>
        <p className="text-xs font-bold text-[#002B5E]">Situação financeira (informativa)</p>
        <div className="mt-2 space-y-2">
          <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-3 py-2">
            <span className="text-[11px] font-medium text-slate-400">Pendências</span>
            <ChipFake cor="verde">Nenhuma</ChipFake>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-3 py-2">
            <span className="text-[11px] font-medium text-slate-400">Último pagamento</span>
            <span className="text-xs font-semibold text-slate-700">10/05/2026</span>
          </div>
        </div>
      </CardFundo>
    </div>
    <div className="rounded-xl border border-[#0066FF]/25 bg-[#0066FF]/5 p-4">
      <p className="text-xs font-bold text-[#0066FF]">🔔 Assembleia em andamento</p>
      <p className="mt-1 text-xs text-slate-600">
        Assembleia Geral Extraordinária — 25/05/2026, 19h00 · votação aberta agora
      </p>
      <div className="mt-2 flex gap-2">
        <span className="rounded-lg bg-[#0066FF] px-2.5 py-1 text-[10px] font-bold text-white">
          Ir para o Credenciamento
        </span>
        <span className="rounded-lg bg-white px-2.5 py-1 text-[10px] font-bold text-[#0066FF] border border-[#0066FF]/30">
          Cabine de Votação
        </span>
      </div>
    </div>
  </div>
)

/* ============ 2. Credenciamento ============ */
export const MockupCredenciamento: React.FC = () => (
  <div className="space-y-3 bg-[#F3F7FC] p-4">
    <CabecalhoFake titulo="Credenciamento" sub="Valide sua participação na assembleia" />
    <CardFundo>
      <p className="text-xs font-bold text-[#002B5E]">Etapa 1 — Seus dados</p>
      <div className="mt-2 space-y-2">
        <LinhaDado rotulo="CPF" valor="•••.•••.789-00" />
        <LinhaDado rotulo="Vínculo com a unidade" valor="Proprietário(a) ▾" />
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-center">
          <p className="text-[11px] font-medium text-slate-500">
            📎 Anexar documento (foto ou PDF)
          </p>
        </div>
      </div>
    </CardFundo>
    <CardFundo>
      <p className="text-xs font-bold text-[#002B5E]">
        Etapa 2 — Confirmação de segurança (código OTP)
      </p>
      <div className="mt-2 flex items-center gap-2">
        {[7, 4, 1, 9, 2, 6].map((d, i) => (
          <span
            key={i}
            className="flex h-9 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-700"
          >
            {d}
          </span>
        ))}
        <span className="text-[10px] font-medium text-slate-400">
          código enviado
          <br />
          ao seu e-mail
        </span>
      </div>
    </CardFundo>
    <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-2.5">
      <span className="text-[11px] font-semibold text-emerald-700">
        ✓ Credenciamento aprovado pela mesa
      </span>
      <span className="text-[10px] text-emerald-600">Analise: 22/05/2026 10h12</span>
    </div>
  </div>
)

/* ============ 3. Cabine de Votação ============ */
export const MockupVotacao: React.FC = () => (
  <div className="space-y-3 bg-[#F3F7FC] p-4">
    <CabecalhoFake
      titulo="Cabine de Votação — Assembleia Geral Extraordinária"
      sub="Cédula secreta · 1 voto por unidade · Item 2 de 3"
    />
    <CardFundo>
      <p className="text-[11px] font-semibold text-slate-400">ITEM 2 DA PAUTA</p>
      <p className="mt-0.5 text-sm font-bold text-[#002B5E]">
        Aprovação de pintura da fachada — orçamento R$ 48.000,00
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[
          { t: 'Favorável', c: 'border-emerald-300 bg-emerald-50 text-emerald-700' },
          { t: 'Contrário', c: 'border-red-200 bg-red-50 text-red-600' },
          { t: 'Abstenção', c: 'border-slate-200 bg-white text-slate-500' },
        ].map((o) => (
          <div
            key={o.t}
            className={`rounded-xl border-2 px-2 py-3 text-center text-xs font-bold ${o.c}`}
          >
            {o.t}
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-xl bg-[#002B5E] px-4 py-3 text-center">
        <span className="text-xs font-bold text-white">Confirmar meu voto 🔒</span>
        <p className="mt-0.5 text-[10px] text-white/60">
          após confirmado, o voto não pode ser alterado
        </p>
      </div>
    </CardFundo>
    <div className="rounded-xl bg-white/70 px-4 py-2.5 text-center">
      <span className="text-[10px] font-medium text-slate-400">
        🔒 Voto secreto — ninguém, nem a mesa, consegue ver em quem/quê você votou
      </span>
    </div>
  </div>
)

/* ============ 4. Recibo ============ */
export const MockupRecibo: React.FC = () => (
  <div className="space-y-3 bg-[#F3F7FC] p-4">
    <CabecalhoFake titulo="Meus Recibos" sub="Comprovantes de votação da unidade 101 — Bloco A" />
    <CardFundo>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-[#002B5E]">Assembleia Geral Extraordinária</p>
          <p className="text-[11px] text-slate-400">25/05/2026 · 19h47 · voto registrado</p>
        </div>
        <ChipFake cor="verde">Confirmado</ChipFake>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-[#0066FF]/25 bg-[#0066FF]/5 px-3 py-2.5">
          <p className="text-[10px] font-semibold text-[#0066FF]">CÓDIGO DE CONFERÊNCIA</p>
          <p className="mt-0.5 font-mono text-sm font-bold tracking-wider text-[#002B5E]">
            K7F2-9QX4-AB12
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5">
          <p className="text-[10px] font-semibold text-slate-400">IMPRESSÃO DIGITAL (HASH)</p>
          <p className="mt-0.5 font-mono text-[11px] text-slate-600">a3f9c2…e71b</p>
        </div>
      </div>
    </CardFundo>
    <CardFundo>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500">Assembleia Ordinária — 12/02/2026</p>
        <ChipFake cor="cinza">Anterior</ChipFake>
      </div>
    </CardFundo>
  </div>
)

/* ============ 5. Documentos da Assembleia ============ */
export const MockupDocumentos: React.FC = () => (
  <div className="space-y-3 bg-[#F3F7FC] p-4">
    <CabecalhoFake
      titulo="Documentos da Assembleia"
      sub="AGE 25/05/2026 — edital, pauta e anexos"
    />
    <div className="grid gap-2 sm:grid-cols-2">
      {[
        { i: '📢', t: 'Edital de Convocação', s: 'PDF · 2 páginas · publicado 05/05' },
        { i: '📋', t: 'Pauta da Assembleia', s: 'PDF · 1 página' },
        { i: '💰', t: 'Prestação de Contas', s: 'PDF · 6 páginas' },
        { i: '🏛️', t: 'Convenção do Condomínio', s: 'PDF · consulta' },
        { i: '👤', t: 'Currículo — Candidato Síndico', s: 'PDF · 1 página' },
        { i: '📄', t: 'Proposta de Orçamento', s: 'PDF · 3 páginas' },
      ].map((d) => (
        <div
          key={d.t}
          className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-3.5 py-3 shadow-sm"
        >
          <span className="text-lg" aria-hidden>
            {d.i}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-[#002B5E]">{d.t}</p>
            <p className="truncate text-[10px] text-slate-400">{d.s}</p>
          </div>
          <span className="shrink-0 rounded-lg bg-[#0066FF]/10 px-2 py-1 text-[10px] font-bold text-[#0066FF]">
            Abrir ▾
          </span>
        </div>
      ))}
    </div>
    <BlocoInfo
      titulo="Lidos e disponíveis para download"
      itens={[
        'Visualizar no navegador',
        'Baixar para o celular ou computador',
        'Consultar a qualquer momento, mesmo depois da assembleia',
      ]}
    />
  </div>
)

/* ============ 6. Ata da Assembleia ============ */
export const MockupAta: React.FC = () => (
  <div className="space-y-3 bg-[#F3F7FC] p-4">
    <CabecalhoFake
      titulo="Ata da Assembleia"
      sub="AGE 25/05/2026 — documento oficial da assembleia"
    />
    <CardFundo>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-[#002B5E]">Ata da Assembleia Geral Extraordinária</p>
          <p className="text-[11px] text-slate-400">
            Redigida pela mesa · assinada eletronicamente
          </p>
        </div>
        <ChipFake cor="verde">Publicada ✓</ChipFake>
      </div>
      <div className="mt-3 rounded-lg border border-slate-100 bg-[#FDFDFB] px-4 py-3">
        <p className="text-[11px] leading-relaxed text-slate-500">
          “Aos vinte e cinco dias do mês de maio de dois mil e vinte e seis, reuniu-se a assembleia
          geral extraordinária dos condôminos do Condomínio Lago Azul…{' '}
          <span className="text-slate-300">…</span>
        </p>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <LinhaDado rotulo="Assinatura — Presidente da Mesa" valor="João Pereira ✓" />
        <LinhaDado rotulo="Assinatura — Secretário(a)" valor="Ana Souza ✓" />
        <LinhaDado rotulo="Hash do documento" valor="8b41f2…9c0d" />
        <LinhaDado rotulo="Publicada em" valor="26/05/2026" />
      </div>
    </CardFundo>
    <div className="flex gap-2">
      <span className="rounded-lg bg-[#0066FF] px-3 py-1.5 text-[10px] font-bold text-white">
        Ver ata completa
      </span>
      <span className="rounded-lg bg-white px-3 py-1.5 text-[10px] font-bold text-[#0066FF] border border-[#0066FF]/30">
        Baixar PDF
      </span>
    </div>
  </div>
)

/* ============ Fluxo completo (seção de abertura) ============ */
export const MockupFluxoCompleto: React.FC = () => {
  const etapas = [
    { i: Home, t: '1. Cadastro', s: 'A unidade envia o link; você se cadastra; a mesa aprova.' },
    {
      i: UserCheck,
      t: '2. Credenciamento',
      s: 'Você valida vínculo + documento; recebe OTP por e-mail.',
    },
    { i: Vote, t: '3. Votação', s: 'Na cabine, você vota com segurança; 1 voto por unidade.' },
    { i: Receipt, t: '4. Recibo', s: 'Você recebe o código de conferência do seu voto.' },
    { i: FolderArchive, t: '5. Apuração', s: 'A mesa confere presenças, votos e integridade.' },
    { i: FileText, t: '6. Ata e Dossiê', s: 'Documentos assinados e arquivados para auditoria.' },
  ]
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {etapas.map((e) => (
        <div
          key={e.t}
          className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0066FF] to-[#002B5E] text-white">
            <e.i className="h-4.5 w-4.5" />
          </span>
          <div>
            <p className="text-sm font-bold text-[#002B5E]">{e.t}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{e.s}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
