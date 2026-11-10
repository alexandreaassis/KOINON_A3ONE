import React from 'react'
import {
  UserCheck,
  Building,
  BarChart3,
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
  Download,
  Share2,
  FileSpreadsheet,
  ShieldCheck,
  Search,
  Filter,
} from 'lucide-react'
import { ChipMesa, QuadroMockup, CabecalhoFake, CardFundo } from './MockupBaseMesa'
import { BlocoInfo } from '@/pages/morador/manual/BlocosManual'

/* Mockup da tela Aprovação de Cadastros (/mesa/credenciamentos) */
export const MockupAprovacaoCadastrosMesa: React.FC = () => (
  <QuadroMockup label="Aprovação de Cadastros Públicos — análise criteriosa da mesa">
    <div className="flex items-center gap-2 border-b border-slate-100 bg-[#F3F7FC] px-3 py-2">
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#0066FF]/10 text-[#0066FF]">
        <UserCheck className="h-3.5 w-3.5" />
      </span>
      <span className="text-xs font-bold text-[#002B5E]">Aprovação de Cadastros</span>
    </div>
    <div className="space-y-3 bg-[#F3F7FC] p-3">
      <CabecalhoFake
        titulo="Fila de Cadastros da Unidade"
        sub="Análise das submissões públicas recebidas via link de autoatendimento"
      />
      <div className="grid gap-2 sm:grid-cols-3">
        <CardFundo>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500">Pendentes</span>
            <Clock className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <p className="mt-1 text-base font-bold text-amber-600">3 aguardando</p>
          <p className="text-[10px] text-slate-400">prioridade na fila</p>
        </CardFundo>
        <CardFundo>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500">Aprovados</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <p className="mt-1 text-base font-bold text-emerald-600">48 aptos</p>
          <p className="text-[10px] text-slate-400">vinculados às unidades</p>
        </CardFundo>
        <CardFundo>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500">Rejeitados</span>
            <XCircle className="h-3.5 w-3.5 text-rose-500" />
          </div>
          <p className="mt-1 text-base font-bold text-rose-600">2 com motivo</p>
          <p className="text-[10px] text-slate-400">notificação enviada</p>
        </CardFundo>
      </div>

      <CardFundo>
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs text-slate-400">Filtrar por nome, CPF ou unidade...</span>
          </div>
          <ChipMesa tone="amber">Ação da Mesa Requerida</ChipMesa>
        </div>
        <div className="mt-2 space-y-1.5 text-xs">
          <div className="flex items-center justify-between rounded bg-amber-50/60 p-1.5 border border-amber-200/50">
            <div>
              <span className="font-semibold text-[#002B5E]">Maria Oliveira</span>
              <span className="text-slate-500 text-[11px]"> · Bloco B - Apt 204 (Inquilina)</span>
            </div>
            <div className="flex gap-1">
              <span className="rounded bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                Aprovar
              </span>
              <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-medium text-rose-700">
                Rejeitar
              </span>
            </div>
          </div>
        </div>
      </CardFundo>

      <BlocoInfo
        titulo="Papel da Mesa"
        itens={[
          'Conferir vínculo informado (proprietário, condômino, inquilino ou procurador)',
          'Verificar se há documento ou procuração anexa quando exigido',
          'Aprovar para liberar o acesso ou rejeitar informando o motivo formal',
        ]}
      />
    </div>
  </QuadroMockup>
)

/* Mockup da tela Cadastro da Unidade (/admin/cadastros) */
export const MockupCadastroUnidadeMesa: React.FC = () => (
  <QuadroMockup label="Cadastro da Unidade — base cadastral e vínculos">
    <div className="flex items-center gap-2 border-b border-slate-100 bg-[#F3F7FC] px-3 py-2">
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#0066FF]/10 text-[#0066FF]">
        <Building className="h-3.5 w-3.5" />
      </span>
      <span className="text-xs font-bold text-[#002B5E]">Cadastro da Unidade</span>
    </div>
    <div className="space-y-3 bg-[#F3F7FC] p-3">
      <CabecalhoFake
        titulo="Gestão de Unidades e Moradores"
        sub="Mapeamento completo das frações ideais, moradores ativos e links de cadastro"
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <CardFundo>
          <div className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-[#0066FF]" />
            <p className="text-xs font-bold text-[#002B5E]">Link Público com Token</p>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
            Cada unidade possui um link exclusivo para envio via WhatsApp ou e-mail. O morador
            preenche de forma autônoma.
          </p>
          <div className="mt-2 flex gap-1.5">
            <ChipMesa tone="green">WhatsApp wa.me</ChipMesa>
            <ChipMesa tone="blue">Copiar link</ChipMesa>
          </div>
        </CardFundo>
        <CardFundo>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-[#0066FF]" />
            <p className="text-xs font-bold text-[#002B5E]">Importação em Massa</p>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
            Carga de planilha Excel/CSV para criação e atualização rápida de proprietários e frações
            ideais.
          </p>
          <div className="mt-2 flex gap-1.5">
            <ChipMesa tone="slate">Planilha padrão</ChipMesa>
            <ChipMesa tone="blue">Auditoria de campos</ChipMesa>
          </div>
        </CardFundo>
      </div>

      <CardFundo>
        <p className="text-xs font-bold text-[#002B5E]">Exemplo de Unidade Cadastrada</p>
        <div className="mt-2 flex items-center justify-between text-xs text-slate-600 border-t border-slate-100 pt-2">
          <div>
            <span className="font-semibold text-[#002B5E]">Unidade 101</span> · Bloco A
            <p className="text-[11px] text-slate-500">
              Proprietário: Carlos Silva (CPF: 123.***.***-00)
            </p>
          </div>
          <ChipMesa tone="green">Adimplente / Apto</ChipMesa>
        </div>
      </CardFundo>
    </div>
  </QuadroMockup>
)

/* Mockup da tela Relatórios de Assembleia (/mesa/relatorios) */
export const MockupRelatoriosAssembleiaMesa: React.FC = () => (
  <QuadroMockup label="Relatórios de Assembleia — consolidação e conferência oficial">
    <div className="flex items-center gap-2 border-b border-slate-100 bg-[#F3F7FC] px-3 py-2">
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#0066FF]/10 text-[#0066FF]">
        <BarChart3 className="h-3.5 w-3.5" />
      </span>
      <span className="text-xs font-bold text-[#002B5E]">Relatórios Consolidados</span>
    </div>
    <div className="space-y-3 bg-[#F3F7FC] p-3">
      <CabecalhoFake
        titulo="Relatório Consolidado da Assembleia"
        sub="Estatísticas de quórum, apuração de votos por item e hash raiz da urna"
      />
      <div className="grid gap-2 sm:grid-cols-3">
        <CardFundo>
          <p className="text-[11px] font-medium text-slate-500">Comparecimento</p>
          <p className="mt-1 text-base font-bold text-[#002B5E]">72.5% de quórum</p>
          <p className="text-[10px] text-emerald-600">quórum estatutário atingido</p>
        </CardFundo>
        <CardFundo>
          <p className="text-[11px] font-medium text-slate-500">Votação</p>
          <p className="mt-1 text-base font-bold text-[#002B5E]">100% auditada</p>
          <p className="text-[10px] text-slate-400">cadeia de hashes íntegra</p>
        </CardFundo>
        <CardFundo>
          <p className="text-[11px] font-medium text-slate-500">Exportação</p>
          <div className="mt-1 flex gap-1">
            <span className="flex items-center gap-1 rounded bg-[#0066FF] px-2 py-1 text-[10px] font-bold text-white">
              <Printer className="h-3 w-3" /> Imprimir
            </span>
            <span className="flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-700">
              <Download className="h-3 w-3" /> PDF
            </span>
          </div>
        </CardFundo>
      </div>

      <CardFundo>
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <span className="text-xs font-bold text-[#002B5E]">
            Item 1 — Prestação de Contas Anual
          </span>
          <ChipMesa tone="green">Aprovado (88%)</ChipMesa>
        </div>
        <p className="mt-2 text-[11px] font-mono text-slate-500 truncate">
          Hash Raiz: 7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069
        </p>
      </CardFundo>

      <BlocoInfo
        titulo="Usos do Relatório Consolidado"
        itens={[
          'Apresentação imediata dos resultados no encerramento da assembleia',
          'Anexo técnico obrigatório para o Dossiê de Cartório e registro imobiliário',
          'Documento comprobatório de transparência para conselho fiscal e condôminos',
        ]}
      />
    </div>
  </QuadroMockup>
)
