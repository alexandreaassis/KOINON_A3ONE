import logoA3OneOficial from '@/assets/a3one-solucoes-integradas-2-5349d.png'
import { HistoricoAlteracaoRecord, HistoricoAcao, CampoAlteradoDiff } from '@/lib/api'

export interface FiltrosRelatorioHistorico {
  entidade?: string
  entidadeLabel?: string
  acao?: HistoricoAcao | string
  acaoLabel?: string
  operador?: string
  operadorNome?: string
  dataInicio?: string
  dataFim?: string
  busca?: string
}

export interface DadosRelatorioHistoricoPdf {
  nomeCondominio: string
  registros: HistoricoAlteracaoRecord[]
  filtros: FiltrosRelatorioHistorico
  totalRegistros: number
  solicitanteNome: string
  solicitanteEmail?: string
  solicitanteRole?: string
}

function escapeHtml(text?: string | null): string {
  if (text === null || text === undefined) return ''
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatarDataHoraRelatorio(iso?: string): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z')
    if (isNaN(d.getTime())) return escapeHtml(iso)
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return escapeHtml(iso)
  }
}

function renderBadgeOperacaoHtml(acao: string): string {
  switch (acao) {
    case 'criacao':
      return `<span style="display:inline-block; padding: 2px 6px; border-radius: 4px; font-size: 8pt; font-weight: 700; text-transform: uppercase; background: #ECFDF5; color: #047857; border: 1px solid #A7F3D0;">Criação</span>`
    case 'atualizacao':
      return `<span style="display:inline-block; padding: 2px 6px; border-radius: 4px; font-size: 8pt; font-weight: 700; text-transform: uppercase; background: #EFF6FF; color: #1D4ED8; border: 1px solid #BFDBFE;">Atualização</span>`
    case 'exclusao':
      return `<span style="display:inline-block; padding: 2px 6px; border-radius: 4px; font-size: 8pt; font-weight: 700; text-transform: uppercase; background: #FEF2F2; color: #B91C1C; border: 1px solid #FECACA;">Exclusão</span>`
    default:
      return `<span style="display:inline-block; padding: 2px 6px; border-radius: 4px; font-size: 8pt; font-weight: 700; text-transform: uppercase; background: #F3F4F6; color: #374151; border: 1px solid #E5E7EB;">${escapeHtml(acao)}</span>`
  }
}

const ROTULOS_ENTIDADES: Record<string, string> = {
  unidades: 'Unidades do Condomínio',
  cadastros_unidade: 'Cadastros da Unidade',
  users: 'Usuários do Sistema',
  deliberacoes: 'Deliberações e Assembleias',
  itens_pauta: 'Itens de Pauta',
  editais_deliberacao: 'Editais Convocatórios',
  documentos_pauta: 'Documentos da Pauta',
}

const ROTULOS_CAMPOS_AUDITORIA: Record<string, string> = {
  identificador: 'Identificador / Número',
  bloco: 'Bloco / Torre',
  grupo: 'Grupo / Setor',
  andar: 'Andar',
  posicao_numero: 'Posição / Porta',
  fracao_ideal: 'Fração Ideal',
  tipo_unidade: 'Tipo de Unidade',
  inadimplente: 'Situação de Inadimplência',
  nome: 'Nome Completo',
  email: 'E-mail Institucional',
  cpf: 'CPF',
  telefone: 'Telefone de Contato',
  vinculo: 'Vínculo com a Unidade',
  morador_residente: 'Residente no Imóvel',
  documento_comprobatorio: 'Documento Comprobatório',
  observacoes: 'Observações Internas',
  status_aprovacao: 'Status de Aprovação',
  titulo: 'Título',
  descricao: 'Descrição',
  data_inicio: 'Data/Hora Início',
  data_fim: 'Data/Hora Término',
  status: 'Status',
  tipo_cedula: 'Formato da Cédula',
  quorum_instalacao: 'Quórum de Instalação',
  quorum_materia: 'Quórum da Matéria',
  inadimplente_pode_votar: 'Inadimplente Vota',
  locatario_pode_votar: 'Locatário Vota',
  role: 'Perfil de Acesso',
  ativo: 'Ativo',
  primeira_convocacao: '1ª Convocação',
  segunda_convocacao: '2ª Convocação',
  local_texto: 'Local da Assembleia',
}

export function gerarHtmlRelatorioHistorico(dados: DadosRelatorioHistoricoPdf): string {
  const agora = new Date()
  const dataHoje = agora.toLocaleDateString('pt-BR')
  const horaHoje = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  // Círculo Comum Koinon em SVG vetorial (Manual da Marca Koinon)
  // Anel Marinho #002B5E, ponto central Azul #0066FF (em fundo claro)
  // 6 pontos sólidos (esquerda) + 6 pontos vazados (direita) + ponto central
  const R = 70
  const leftAngles = [-105, -135, -165, -195, -225, -255]
  const rightAngles = [-75, -45, -15, 15, 45, 75]

  const svgCirculoComum = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="40" height="40" style="display:inline-block; vertical-align:middle;">
      <circle cx="100" cy="100" r="15" fill="#0066FF" />
      ${leftAngles
        .map((deg) => {
          const rad = (deg * Math.PI) / 180
          const cx = +(100 + R * Math.cos(rad)).toFixed(2)
          const cy = +(100 + R * Math.sin(rad)).toFixed(2)
          return `<circle cx="${cx}" cy="${cy}" r="12" fill="#002B5E" />`
        })
        .join('')}
      ${rightAngles
        .map((deg) => {
          const rad = (deg * Math.PI) / 180
          const cx = +(100 + R * Math.cos(rad)).toFixed(2)
          const cy = +(100 + R * Math.sin(rad)).toFixed(2)
          return `<circle cx="${cx}" cy="${cy}" r="9.5" fill="none" stroke="#002B5E" stroke-width="5" />`
        })
        .join('')}
    </svg>
  `

  // Wordmark Koinon (K maiúscula, "i" em Azul #0066FF, demais letras em Marinho #002B5E)
  const wordmarkHtml = `
    <span style="font-family:'Poppins', sans-serif; font-size:24px; font-weight:600; letter-spacing:-0.02em; color:#002B5E; line-height:1; vertical-align:middle; margin-left:10px;">
      <span>K</span><span>o</span><span style="color:#0066FF;">i</span><span>n</span><span>o</span><span>n</span>
    </span>
  `

  // Selo de endosso oficial A3ONE
  const endossoA3OneHtml = `
    <div style="display:inline-flex; align-items:center; gap:8px; padding: 4px 12px; background:#F3F7FC; border:1px solid #D5DCE5; border-radius:999px;">
      <span style="font-family:'Poppins', sans-serif; font-size:7pt; color:#5A6B82; text-transform:uppercase; letter-spacing:0.5px;">uma solução</span>
      <img src="${logoA3OneOficial}" alt="A3ONE Soluções Integradas" style="height:14px; object-fit:contain; display:inline-block; vertical-align:middle;" />
    </div>
  `

  // Linhas da tabela de histórico
  const linhasTabelaHtml = dados.registros
    .map((reg, idx) => {
      const dataHoraFormatada = formatarDataHoraRelatorio(reg.data_hora || reg.created)
      const opBadge = renderBadgeOperacaoHtml(reg.acao)
      const entidadeNome = ROTULOS_ENTIDADES[reg.entidade] || reg.entidade
      const diffs: CampoAlteradoDiff[] = Array.isArray(reg.campos_alterados)
        ? reg.campos_alterados
        : []

      // Se for exclusão e tiver dados de pessoa, formatar os detalhes preservados
      let detalhePreservado = ''
      if (diffs.length > 0) {
        const resumoCampos = diffs
          .slice(0, 4)
          .map((d) => {
            const rotuloCampo = ROTULOS_CAMPOS_AUDITORIA[d.campo] || d.campo
            if (reg.acao === 'exclusao') {
              return `<strong>${escapeHtml(rotuloCampo)}:</strong> ${escapeHtml(String(d.anterior ?? '—'))}`
            }
            return `<strong>${escapeHtml(rotuloCampo)}:</strong> ${escapeHtml(String(d.novo ?? d.anterior ?? '—'))}`
          })
          .join(' | ')

        const extras = diffs.length > 4 ? ` <em>(+${diffs.length - 4} campos)</em>` : ''
        detalhePreservado = `<div style="font-size:7.5pt; color:#5A6B82; margin-top:2px; font-family:'Poppins', sans-serif;">${resumoCampos}${extras}</div>`
      }

      const bgLinha = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'

      return `
        <tr style="background:${bgLinha}; page-break-inside:avoid;">
          <td style="padding:6px 8px; border-bottom:1px solid #E2E8F0; font-family:monospace; font-size:8pt; color:#002B5E; white-space:nowrap; vertical-align:top;">
            ${dataHoraFormatada}
          </td>
          <td style="padding:6px 8px; border-bottom:1px solid #E2E8F0; vertical-align:top; white-space:nowrap;">
            ${opBadge}
          </td>
          <td style="padding:6px 8px; border-bottom:1px solid #E2E8F0; vertical-align:top; white-space:nowrap;">
            <strong style="color:#002B5E; font-size:8.5pt;">${escapeHtml(entidadeNome)}</strong>
            <span style="display:block; font-size:7pt; color:#5A6B82; font-family:monospace;">${escapeHtml(reg.entidade)}</span>
          </td>
          <td style="padding:6px 8px; border-bottom:1px solid #E2E8F0; vertical-align:top;">
            <div style="font-weight:600; color:#002B5E; font-size:8.5pt;">${escapeHtml(reg.registro_rotulo || reg.registro_id)}</div>
            ${detalhePreservado}
            <div style="font-size:7pt; color:#5A6B82; font-family:monospace; margin-top:1px;">ID: ${escapeHtml(reg.registro_id)}</div>
          </td>
          <td style="padding:6px 8px; border-bottom:1px solid #E2E8F0; vertical-align:top;">
            <div style="font-weight:600; color:#002B5E; font-size:8.5pt;">${escapeHtml(reg.user_nome || 'Sistema')}</div>
            <div style="font-size:7pt; color:#5A6B82; font-family:monospace;">
              ${reg.user_role ? `<span style="text-transform:uppercase; font-weight:bold; color:#0066FF;">[${escapeHtml(reg.user_role)}]</span> ` : ''}
              ${escapeHtml(reg.user_email || '')}
            </div>
            ${reg.ip ? `<div style="font-size:6.5pt; color:#5A6B82; font-family:monospace;">IP: ${escapeHtml(reg.ip)}</div>` : ''}
          </td>
        </tr>
      `
    })
    .join('')

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Histórico de Alterações - Relatório Oficial</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    @page {
      size: A4 portrait;
      margin: 14mm 12mm 16mm 12mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: 'Poppins', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #002B5E;
      background: #FFFFFF;
      font-size: 8.5pt;
      line-height: 1.45;
    }
    .report-container {
      width: 100%;
      max-width: 820px;
      margin: 0 auto;
    }
    header {
      border-bottom: 2px solid #002B5E;
      padding-bottom: 10px;
      margin-bottom: 12px;
    }
    .header-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .brand-block {
      display: flex;
      align-items: center;
    }
    .doc-title-block {
      text-align: right;
    }
    .doc-tag {
      font-size: 7.5pt;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #0066FF;
    }
    .condo-name {
      font-size: 13pt;
      font-weight: 800;
      color: #002B5E;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .doc-name {
      font-size: 9pt;
      color: #5A6B82;
      font-weight: 600;
      margin: 1px 0 0 0;
    }
    .filter-summary-card {
      background: #F3F7FC;
      border: 1px solid #D5DCE5;
      border-left: 4px solid #0066FF;
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 12px;
      page-break-inside: avoid;
    }
    .filter-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px 12px;
      font-size: 8pt;
    }
    .filter-item strong {
      color: #002B5E;
      font-weight: 700;
      display: block;
      font-size: 7pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .filter-item span {
      color: #334155;
    }
    .meta-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 8pt;
      color: #5A6B82;
      border-bottom: 1px dashed #CBD5E1;
      padding-bottom: 4px;
    }
    .total-badge {
      font-weight: 700;
      color: #002B5E;
      background: #E0EDFB;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 7.5pt;
    }
    table.history-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8pt;
      margin-top: 4px;
    }
    table.history-table thead {
      display: table-header-group;
    }
    table.history-table tr {
      page-break-inside: avoid;
    }
    table.history-table th {
      background: #002B5E;
      color: #FFFFFF;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 7.5pt;
      letter-spacing: 0.6px;
      padding: 6px 8px;
      text-align: left;
      border: 1px solid #002B5E;
    }
    table.history-table td {
      border: 1px solid #E2E8F0;
    }
    .footer-section {
      margin-top: 20px;
      padding-top: 8px;
      border-top: 1px solid #D5DCE5;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 7.5pt;
      color: #5A6B82;
      page-break-inside: avoid;
    }
    .footer-left {
      line-height: 1.35;
    }
    @media print {
      body {
        margin: 0;
        background: #FFFFFF;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="report-container">
    <!-- Cabeçalho Institucional -->
    <header>
      <div class="header-top">
        <div class="brand-block">
          ${svgCirculoComum}
          ${wordmarkHtml}
        </div>
        <div class="doc-title-block">
          <div class="doc-tag">Auditoria & Governança Eletrônica</div>
          <h1 class="condo-name">${escapeHtml(dados.nomeCondominio)}</h1>
          <div class="doc-name">Histórico de Alterações — Relatório Oficial</div>
        </div>
      </div>
    </header>

    <!-- Resumo dos Filtros Aplicados na Tela -->
    <div class="filter-summary-card">
      <div style="font-size:7.5pt; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; color:#002B5E; margin-bottom:4px;">
        Parâmetros e Filtros Aplicados na Emissão
      </div>
      <div class="filter-grid">
        <div class="filter-item">
          <strong>Entidade:</strong>
          <span>${escapeHtml(dados.filtros.entidadeLabel || 'Todas as entidades')}</span>
        </div>
        <div class="filter-item">
          <strong>Operação:</strong>
          <span>${escapeHtml(dados.filtros.acaoLabel || 'Todas as operações')}</span>
        </div>
        <div class="filter-item">
          <strong>Operador:</strong>
          <span>${escapeHtml(dados.filtros.operadorNome || 'Todos os operadores')}</span>
        </div>
        <div class="filter-item">
          <strong>Período:</strong>
          <span>
            ${
              dados.filtros.dataInicio || dados.filtros.dataFim
                ? `${dados.filtros.dataInicio || 'Início'} até ${dados.filtros.dataFim || 'Hoje'}`
                : 'Todo o histórico'
            }
          </span>
        </div>
        ${
          dados.filtros.busca
            ? `
          <div class="filter-item" style="grid-column: span 4;">
            <strong>Termo de Busca Livre:</strong>
            <span style="font-family:monospace; background:#FFFFFF; padding:1px 4px; border:1px solid #CBD5E1; border-radius:3px;">"${escapeHtml(dados.filtros.busca)}"</span>
          </div>
        `
            : ''
        }
      </div>
    </div>

    <!-- Barra de Metadados -->
    <div class="meta-bar">
      <div>
        <span>Emissão: <strong>${dataHoje} às ${horaHoje}</strong></span>
        ${
          dados.solicitanteNome
            ? `<span style="margin-left: 10px;">Solicitante: <strong>${escapeHtml(dados.solicitanteNome)}</strong>${dados.solicitanteRole ? ` (${escapeHtml(dados.solicitanteRole)})` : ''}</span>`
            : ''
        }
      </div>
      <div>
        <span class="total-badge">Total: ${dados.totalRegistros} ${dados.totalRegistros === 1 ? 'registro' : 'registros'} filtrado(s)</span>
      </div>
    </div>

    <!-- Tabela de Auditoria -->
    <table class="history-table">
      <thead>
        <tr>
          <th style="width: 14%;">Data/Hora</th>
          <th style="width: 11%;">Operação</th>
          <th style="width: 22%;">Entidade</th>
          <th style="width: 31%;">Registro Afetado & Dados Preservados</th>
          <th style="width: 22%;">Operador Responsável</th>
        </tr>
      </thead>
      <tbody>
        ${
          dados.registros.length > 0
            ? linhasTabelaHtml
            : `
          <tr>
            <td colspan="5" style="padding: 24px; text-align: center; color: #5A6B82; font-style: italic;">
              Nenhum evento registrado com os filtros aplicados.
            </td>
          </tr>
        `
        }
      </tbody>
    </table>

    <!-- Rodapé com Selo Oficial A3ONE e Conformidade -->
    <div class="footer-section">
      <div class="footer-left">
       <strong>Plataforma Virtual Koinon</strong> — Registro de Auditoria e Rastreabilidade Documental.<br>
        Documento com valor probatório administrativo. Trilha de operações imutável auditada server-side.
      </div>
      <div>
        ${endossoA3OneHtml}
      </div>
    </div>
  </div>
</body>
</html>`
}

/**
 * Abre a janela de visualização dedicada e dispara o print/salvar em PDF
 */
export function imprimirOuBaixarPdfHistorico(dados: DadosRelatorioHistoricoPdf): void {
  const html = gerarHtmlRelatorioHistorico(dados)
  const janela = window.open('', '_blank', 'width=940,height=1000')

  if (!janela) {
    alert(
      'O navegador bloqueou a abertura da janela do relatório. Por favor, permita pop-ups para este site.',
    )
    return
  }

  janela.document.open()
  janela.document.write(html)
  janela.document.close()

  janela.focus()
  setTimeout(() => {
    janela.print()
  }, 400)
}
