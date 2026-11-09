import logoA3OneOficial from '@/assets/a3one-solucoes-integradas-2-5349d.png'
import type {
  ApuracaoResponse,
  DeliberacaoRecord,
  UnidadeRecord,
  AssinaturaDocumentoRecord,
} from '@/lib/api'
import { formatarCpf } from '@/lib/cpf'

export interface DadosRelatorioConsolidadoPdf {
  nomeCondominio: string
  logoUrl?: string
  rotuloUnidade?: string
  deliberacao: DeliberacaoRecord
  apuracao: ApuracaoResponse['apuracao']
  unidades: UnidadeRecord[]
  assinaturas?: AssinaturaDocumentoRecord[]
  solicitanteNome?: string
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

function formatarDataHora(isoDate?: string): string {
  if (!isoDate) return 'Não informada'
  try {
    const d = new Date(isoDate)
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return escapeHtml(isoDate)
  }
}

export function gerarHtmlRelatorioConsolidado(dados: DadosRelatorioConsolidadoPdf): string {
  const agora = new Date()
  const dataHoje = agora.toLocaleDateString('pt-BR')
  const horaHoje = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  const rotulo = dados.rotuloUnidade || 'Unidade'
  const totalElegiveis =
    dados.unidades.length > 0 ? dados.unidades.length : dados.apuracao.totalUnidadesElegiveis || 0
  const comparecimentoTotal =
    dados.apuracao.totalComparecimentos || dados.apuracao.presencas.total || 0
  const taxaParticipacao =
    totalElegiveis > 0 ? Math.round((comparecimentoTotal / totalElegiveis) * 100) : 0
  const quorumInstalacao = dados.deliberacao.quorum_instalacao || 0
  const quorumAtendido = comparecimentoTotal >= quorumInstalacao

  const presencial = dados.apuracao.presencas.presencial || 0
  const remoto = dados.apuracao.presencas.remoto || 0

  const presMesa = dados.deliberacao.mesa_presidente_nome || 'Presidente da Mesa Diretora'
  const presCpf = dados.deliberacao.mesa_presidente_cpf
    ? ` (CPF: ${formatarCpf(dados.deliberacao.mesa_presidente_cpf)})`
    : ''
  const secMesa = dados.deliberacao.mesa_secretario_nome || 'Secretário(a) dos Trabalhos'
  const secCpf = dados.deliberacao.mesa_secretario_cpf
    ? ` (CPF: ${formatarCpf(dados.deliberacao.mesa_secretario_cpf)})`
    : ''

  const hashUrna =
    dados.apuracao.hashRaizUrna || dados.deliberacao.hash_raiz || 'Em apuração pela Mesa Diretora'
  const integridadeOk = dados.apuracao.integridadeMatematica

  // Linhas dos itens de pauta
  const itensHtml = dados.apuracao.itens
    .map((item, idx) => {
      const totalItem = item.votos.total || 0
      const fav = item.votos.favoravel || 0
      const cont = item.votos.contrario || 0
      const abst = item.votos.abstencao || 0
      const nulo = item.votos.nulo || 0
      const branco = item.votos.branco || 0

      const pctFav = totalItem > 0 ? Math.round((fav / totalItem) * 100) : 0
      const pctCont = totalItem > 0 ? Math.round((cont / totalItem) * 100) : 0
      const pctAbst = totalItem > 0 ? Math.round((abst / totalItem) * 100) : 0

      // Regra simples regimental: mais favoráveis que contrários aprova, salvo quórum qualificado
      const aprovado = fav > cont
      const badgeResultado = aprovado
        ? `<span style="background: #ECFDF5; color: #047857; border: 1px solid #A7F3D0; padding: 3px 8px; border-radius: 4px; font-weight: 700; font-size: 8pt; text-transform: uppercase;">Aprovado</span>`
        : `<span style="background: #FEF2F2; color: #B91C1C; border: 1px solid #FECACA; padding: 3px 8px; border-radius: 4px; font-weight: 700; font-size: 8pt; text-transform: uppercase;">Rejeitado</span>`

      return `
      <div style="border: 1px solid #CBD5E1; border-radius: 4px; margin-bottom: 12px; padding: 10px; background: #FFFFFF; page-break-inside: avoid;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px; margin-bottom: 8px;">
          <div>
            <span style="background: #002B5E; color: #FFFFFF; font-size: 7.5pt; font-weight: 700; padding: 2px 6px; border-radius: 3px; text-transform: uppercase;">
              Item ${item.ordem || idx + 1}
            </span>
            <div style="font-size: 10pt; font-weight: 700; color: #0F172A; margin-top: 3px;">
              ${escapeHtml(item.titulo)}
            </div>
            ${item.texto ? `<div style="font-size: 8.5pt; color: #475569; margin-top: 2px;">${escapeHtml(item.texto)}</div>` : ''}
          </div>
          <div style="text-align: right; min-width: 120px;">
            ${badgeResultado}
            <div style="font-size: 8pt; color: #64748B; margin-top: 4px;">
              Quórum: <strong>${escapeHtml(item.quorum_aplicavel || dados.deliberacao.quorum_materia || 'Maioria Simples')}</strong>
            </div>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 8.5pt;">
          <thead>
            <tr style="background: #F8FAFC; color: #334155; text-align: left;">
              <th style="padding: 4px 6px; border: 1px solid #E2E8F0;">Opção</th>
              <th style="padding: 4px 6px; border: 1px solid #E2E8F0; text-align: center; width: 60px;">Votos</th>
              <th style="padding: 4px 6px; border: 1px solid #E2E8F0; text-align: center; width: 60px;">%</th>
              <th style="padding: 4px 6px; border: 1px solid #E2E8F0;">Distribuição</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 4px 6px; border: 1px solid #E2E8F0; font-weight: 600; color: #047857;">Favorável (Sim)</td>
              <td style="padding: 4px 6px; border: 1px solid #E2E8F0; text-align: center; font-weight: 700;">${fav}</td>
              <td style="padding: 4px 6px; border: 1px solid #E2E8F0; text-align: center;">${pctFav}%</td>
              <td style="padding: 4px 6px; border: 1px solid #E2E8F0;">
                <div style="background: #E2E8F0; height: 8px; border-radius: 2px; overflow: hidden;">
                  <div style="background: #047857; height: 100%; width: ${pctFav}%;"></div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding: 4px 6px; border: 1px solid #E2E8F0; font-weight: 600; color: #B91C1C;">Contrário (Não)</td>
              <td style="padding: 4px 6px; border: 1px solid #E2E8F0; text-align: center; font-weight: 700;">${cont}</td>
              <td style="padding: 4px 6px; border: 1px solid #E2E8F0; text-align: center;">${pctCont}%</td>
              <td style="padding: 4px 6px; border: 1px solid #E2E8F0;">
                <div style="background: #E2E8F0; height: 8px; border-radius: 2px; overflow: hidden;">
                  <div style="background: #B91C1C; height: 100%; width: ${pctCont}%;"></div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding: 4px 6px; border: 1px solid #E2E8F0; font-weight: 600; color: #64748B;">Abstenção</td>
              <td style="padding: 4px 6px; border: 1px solid #E2E8F0; text-align: center; font-weight: 700;">${abst}</td>
              <td style="padding: 4px 6px; border: 1px solid #E2E8F0; text-align: center;">${pctAbst}%</td>
              <td style="padding: 4px 6px; border: 1px solid #E2E8F0;">
                <div style="background: #E2E8F0; height: 8px; border-radius: 2px; overflow: hidden;">
                  <div style="background: #64748B; height: 100%; width: ${pctAbst}%;"></div>
                </div>
              </td>
            </tr>
            ${
              nulo > 0 || branco > 0
                ? `
            <tr>
              <td style="padding: 4px 6px; border: 1px solid #E2E8F0; font-weight: 500; color: #94A3B8;">Outros (Nulos: ${nulo} / Brancos: ${branco})</td>
              <td style="padding: 4px 6px; border: 1px solid #E2E8F0; text-align: center;">${nulo + branco}</td>
              <td style="padding: 4px 6px; border: 1px solid #E2E8F0; text-align: center;">${totalItem > 0 ? Math.round(((nulo + branco) / totalItem) * 100) : 0}%</td>
              <td style="padding: 4px 6px; border: 1px solid #E2E8F0;">—</td>
            </tr>`
                : ''
            }
            <tr style="background: #F1F5F9; font-weight: 700;">
              <td style="padding: 4px 6px; border: 1px solid #E2E8F0;">Total de Votos Apurados</td>
              <td style="padding: 4px 6px; border: 1px solid #E2E8F0; text-align: center;">${totalItem}</td>
              <td style="padding: 4px 6px; border: 1px solid #E2E8F0; text-align: center;">100%</td>
              <td style="padding: 4px 6px; border: 1px solid #E2E8F0;">Apurado pela Urna Eletrônica</td>
            </tr>
          </tbody>
        </table>
      </div>
    `
    })
    .join('')

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Relatório Consolidado de Assembleia — ${escapeHtml(dados.nomeCondominio)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 14mm 14mm 14mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0F172A;
      background: #FFFFFF;
      margin: 0;
      padding: 0;
      font-size: 9pt;
      line-height: 1.45;
    }
    .header-bar {
      border-bottom: 3px solid #002B5E;
      padding-bottom: 10px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .condo-title {
      font-size: 14pt;
      font-weight: 800;
      color: #002B5E;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .report-badge {
      display: inline-block;
      background: #0066FF;
      color: #FFFFFF;
      font-size: 7.5pt;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 3px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .section-title {
      font-size: 9.5pt;
      font-weight: 800;
      color: #002B5E;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #CBD5E1;
      padding-bottom: 3px;
      margin-top: 14px;
      margin-bottom: 8px;
    }
    .card-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }
    .stat-card {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 4px;
      padding: 8px;
      text-align: center;
    }
    .stat-label {
      font-size: 7.5pt;
      font-weight: 700;
      color: #64748B;
      text-transform: uppercase;
    }
    .stat-value {
      font-size: 13pt;
      font-weight: 800;
      color: #002B5E;
      margin-top: 2px;
    }
    .stat-sub {
      font-size: 7.5pt;
      color: #475569;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8.5pt;
    }
    th, td {
      border: 1px solid #CBD5E1;
      padding: 5px 8px;
    }
    th {
      background: #F1F5F9;
      font-weight: 700;
      color: #1E293B;
    }
    .hash-box {
      background: #F8FAFC;
      border: 1px solid #002B5E;
      border-left: 4px solid #0066FF;
      padding: 8px 10px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 8pt;
      word-break: break-all;
      margin-top: 4px;
      color: #0F172A;
    }
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-top: 24px;
      page-break-inside: avoid;
    }
    .sig-line {
      border-top: 1px solid #0F172A;
      padding-top: 6px;
      text-align: center;
      font-size: 8.5pt;
    }
    .footer-doc {
      margin-top: 20px;
      border-top: 1px solid #E2E8F0;
      padding-top: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 7.5pt;
      color: #64748B;
      page-break-inside: avoid;
    }
    @media print {
      body { margin: 0; }
    }
  </style>
</head>
<body>

  <!-- Topo -->
  <div class="header-bar">
    <div style="display: flex; align-items: center; gap: 10px;">
      ${dados.logoUrl ? `<img src="${dados.logoUrl}" style="height: 40px; max-width: 80px; object-contain;" alt="Logo" />` : ''}
      <div>
        <div class="condo-title">${escapeHtml(dados.nomeCondominio)}</div>
        <div style="font-size: 8pt; color: #64748B;">Sistema Koinon de Assembleias e Votação Eletrônica</div>
      </div>
    </div>
    <div style="text-align: right;">
      <span class="report-badge">Relatório Consolidado Oficial</span>
      <div style="font-size: 7.5pt; color: #64748B; margin-top: 3px;">
        Emissão: ${dataHoje} às ${horaHoje}
      </div>
    </div>
  </div>

  <!-- Identificação da Assembleia -->
  <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 4px; padding: 10px; margin-bottom: 12px;">
    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
      <div>
        <div style="font-size: 12pt; font-weight: 800; color: #002B5E;">
          ${escapeHtml(dados.deliberacao.titulo)}
        </div>
        <div style="font-size: 8.5pt; color: #475569; margin-top: 2px;">
          ${dados.deliberacao.descricao ? escapeHtml(dados.deliberacao.descricao) : 'Deliberação e escrutínio oficial da assembleia geral condominial.'}
        </div>
      </div>
      <div style="text-align: right;">
        <span style="background: #002B5E; color: #FFFFFF; font-size: 8pt; font-weight: 700; padding: 2px 8px; border-radius: 3px; text-transform: uppercase;">
          Status: ${escapeHtml(dados.deliberacao.status)}
        </span>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 10px; padding-top: 8px; border-top: 1px solid #E2E8F0; font-size: 8pt;">
      <div>
        <strong style="color: #64748B; text-transform: uppercase;">Período / Data:</strong><br />
        ${formatarDataHora(dados.deliberacao.data_inicio)} até ${formatarDataHora(dados.deliberacao.data_fim)}
      </div>
      <div>
        <strong style="color: #64748B; text-transform: uppercase;">Presidente da Mesa:</strong><br />
        ${escapeHtml(presMesa)}${presCpf}
      </div>
      <div>
        <strong style="color: #64748B; text-transform: uppercase;">Secretário(a) da Mesa:</strong><br />
        ${escapeHtml(secMesa)}${secCpf}
      </div>
    </div>
  </div>

  <!-- Indicadores Principais -->
  <div class="card-grid">
    <div class="stat-card">
      <div class="stat-label">Total de ${escapeHtml(rotulo)}s</div>
      <div class="stat-value">${totalElegiveis}</div>
      <div class="stat-sub">unidades aptas</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Comparecimento</div>
      <div class="stat-value">${comparecimentoTotal}</div>
      <div class="stat-sub">${taxaParticipacao}% de participação</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Quórum de Instalação</div>
      <div class="stat-value">${quorumInstalacao > 0 ? `${quorumInstalacao} un.` : '—'}</div>
      <div class="stat-sub" style="color: ${quorumAtendido ? '#047857' : '#B91C1C'}; font-weight: 700;">
        ${quorumAtendido ? '✓ Quórum Atendido' : 'Registrado pela Mesa'}
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Integridade da Urna</div>
      <div class="stat-value" style="font-size: 11pt; color: ${integridadeOk ? '#047857' : '#B91C1C'};">
        ${integridadeOk ? '100% Válida' : 'Divergência'}
      </div>
      <div class="stat-sub">SHA-256 encadeado</div>
    </div>
  </div>

  <!-- Quadro de Presenças por Canal -->
  <div class="section-title">1. Presenças e Participação por Canal</div>
  <table style="margin-bottom: 12px;">
    <thead>
      <tr>
        <th>Canal de Participação</th>
        <th style="text-align: center; width: 110px;">Unidades Presentes</th>
        <th style="text-align: center; width: 110px;">% sobre Votantes</th>
        <th style="text-align: center; width: 110px;">% do Condomínio</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Presencial Físico</strong> (Plenário / Assembleia presencial)</td>
        <td style="text-align: center; font-weight: 700;">${presencial}</td>
        <td style="text-align: center;">${comparecimentoTotal > 0 ? Math.round((presencial / comparecimentoTotal) * 100) : 0}%</td>
        <td style="text-align: center;">${totalElegiveis > 0 ? Math.round((presencial / totalElegiveis) * 100) : 0}%</td>
      </tr>
      <tr>
        <td><strong>Remoto Eletrônico</strong> (Plataforma Koinon com OTP / 2FA)</td>
        <td style="text-align: center; font-weight: 700;">${remoto}</td>
        <td style="text-align: center;">${comparecimentoTotal > 0 ? Math.round((remoto / comparecimentoTotal) * 100) : 0}%</td>
        <td style="text-align: center;">${totalElegiveis > 0 ? Math.round((remoto / totalElegiveis) * 100) : 0}%</td>
      </tr>
      <tr style="background: #F8FAFC; font-weight: 700;">
        <td>Total Geral de Comparecimentos</td>
        <td style="text-align: center; color: #002B5E; font-size: 9.5pt;">${comparecimentoTotal}</td>
        <td style="text-align: center;">100%</td>
        <td style="text-align: center;">${taxaParticipacao}%</td>
      </tr>
    </tbody>
  </table>

  <!-- Apuração dos Itens da Pauta -->
  <div class="section-title">2. Apuração e Escrutínio dos Itens de Pauta (${dados.apuracao.itens.length} matérias)</div>
  ${itensHtml}

  <!-- Integridade Criptográfica e Cadeia de Custódia -->
  <div class="section-title">3. Verificação de Integridade Criptográfica (Urna Eletrônica)</div>
  <div style="background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 4px; padding: 10px; font-size: 8.5pt;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
      <span style="font-weight: 700; color: #002B5E; text-transform: uppercase;">Hash Raiz Imutável (Merkle Root / SHA-256):</span>
      <span style="font-size: 7.5pt; background: ${integridadeOk ? '#ECFDF5' : '#FEF2F2'}; color: ${integridadeOk ? '#047857' : '#B91C1C'}; border: 1px solid ${integridadeOk ? '#A7F3D0' : '#FECACA'}; padding: 2px 6px; border-radius: 3px; font-weight: 700;">
        ${integridadeOk ? '✓ Cadeia Verificada sem Alterações' : '⚠ Análise Requerida'}
      </span>
    </div>
    <div class="hash-box">${escapeHtml(hashUrna)}</div>
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 8px; font-size: 8pt; color: #475569;">
      <div>• Cédulas depositadas: <strong>${dados.apuracao.totalCedulas}</strong></div>
      <div>• Cédulas esperadas: <strong>${dados.apuracao.esperadoCedulas}</strong></div>
      <div>• Conferência: <strong>${dados.apuracao.totalCedulas === dados.apuracao.esperadoCedulas ? 'Matematicamente Exata' : 'Auditada'}</strong></div>
    </div>
  </div>

  <!-- Assinaturas da Mesa Diretora -->
  <div class="signatures">
    <div class="sig-line">
      <strong>${escapeHtml(presMesa)}</strong><br />
      Presidente da Mesa Diretora${presCpf}
    </div>
    <div class="sig-line">
      <strong>${escapeHtml(secMesa)}</strong><br />
      Secretário(a) dos Trabalhos${secCpf}
    </div>
  </div>

  <!-- Rodapé Institucional -->
  <div class="footer-doc">
    <div>
      Koinon — Sistema de Deliberação Eletrônica Condominial • Padrão A3ONE Soluções Integradas
    </div>
    <div style="display: flex; align-items: center; gap: 8px;">
      <img src="${logoA3OneOficial}" style="height: 18px; width: auto;" alt="A3ONE Soluções Integradas" />
      <span>Página 1 de 1</span>
    </div>
  </div>

</body>
</html>`
}

export function imprimirOuBaixarPdfConsolidado(dados: DadosRelatorioConsolidadoPdf): void {
  const html = gerarHtmlRelatorioConsolidado(dados)
  const printWindow = window.open('', '_blank', 'width=1000,height=800')

  if (!printWindow) {
    alert('A janela de impressão foi bloqueada pelo navegador. Permita pop-ups para gerar o PDF.')
    return
  }

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()

  printWindow.onload = () => {
    setTimeout(() => {
      try {
        printWindow.focus()
        printWindow.print()
      } catch (err) {
        console.error('Falha ao disparar print:', err)
      }
    }, 350)
  }
}
