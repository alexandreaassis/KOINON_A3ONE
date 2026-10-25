/**
 * Utilitário de Geração e Impressão de PDF para Documentos Oficiais (Edital, Atas, Boletins)
 * Utiliza o pipeline nativo de alta fidelidade e styling A4 via janela limpa de impressão
 * e trigger do driver de PDF/impressora do browser.
 */

export interface DadosEditalPdf {
  nomeCondominio: string
  logoUrl?: string
  titulo: string
  subtitulo?: string
  textoAbertura: string
  dataAssembleia: string
  primeiraConvocacao: string
  segundaConvocacao: string
  localTexto: string
  itensPauta: Array<{ ordem: number; titulo: string; texto?: string }>
  ordemDiaCustom?: string
  disposicoesGerais: string
  regrasParticipacao?: string
  sindicoNome: string
  sindicoCpf?: string
  cargoConvocante?: string
  status?: string
  hashAssinatura?: string | null
  dataAssinatura?: string | null
  dataEmissao?: string
}

function converterTextoParaHtmlSeguro(conteudo?: string | null): string {
  if (!conteudo || !conteudo.trim()) return ''
  const trimmed = conteudo.trim()
  const temHtml = /<\/?[a-z][\s\S]*>/i.test(trimmed)
  if (temHtml) {
    return trimmed
  }
  // Converter quebras em parágrafos para compatibilidade com texto puro
  const paragrafos = trimmed
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
  if (paragrafos.length === 0) {
    return `<p>${trimmed.replace(/\n/g, '<br />')}</p>`
  }
  return paragrafos
    .map((p) => `<p style="margin-bottom: 8px;">${p.replace(/\n/g, '<br />')}</p>`)
    .join('')
}

export function gerarHtmlDocumentoEdital(dados: DadosEditalPdf): string {
  const dataHoje =
    dados.dataEmissao ||
    new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })

  const horaHoje = new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const pautaRender =
    dados.ordemDiaCustom && dados.ordemDiaCustom.trim().length > 0
      ? `<div class="rendered-document-html" style="margin-left: 8px;">${converterTextoParaHtmlSeguro(dados.ordemDiaCustom)}</div>`
      : `<ol style="margin: 4px 0 0 20px; padding: 0;">
          ${
            dados.itensPauta.length > 0
              ? dados.itensPauta
                  .map(
                    (it) => `
                <li style="margin-bottom: 8px;">
                  <strong>${it.titulo}</strong>
                  ${
                    it.texto
                      ? `<div style="color: #475569; font-size: 11pt; margin-top: 2px;">${it.texto}</div>`
                      : ''
                  }
                </li>`,
                  )
                  .join('')
              : '<li style="color: #64748b; font-style: italic;">Nenhum item cadastrado na ordem do dia.</li>'
          }
        </ol>`

  const seloAssinatura = dados.hashAssinatura
    ? `
      <div style="margin-top: 20px; padding: 12px 16px; border: 1.5px solid #059669; background: #ecfdf5; border-radius: 6px; font-family: monospace; font-size: 8.5pt; text-align: left; line-height: 1.4; color: #065f46;">
        <div style="font-weight: bold; font-size: 9pt; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
          <span>✓ DOCUMENTO ASSINADO DIGITALMENTE (SHA-256)</span>
        </div>
        <div><strong>Assinante:</strong> ${dados.sindicoNome} ${dados.sindicoCpf ? `(CPF: ${dados.sindicoCpf})` : ''}</div>
        <div style="word-break: break-all;"><strong>Hash SHA-256:</strong> ${dados.hashAssinatura}</div>
        <div><strong>Carimbo de Data/Hora:</strong> ${dados.dataAssinatura ? new Date(dados.dataAssinatura).toLocaleString('pt-BR') : 'Registrado no ato'}</div>
        <div style="color: #047857; margin-top: 4px; font-size: 7.5pt;">Integridade e autenticidade registradas na trilha de auditoria criptográfica.</div>
      </div>
    `
    : `
      <div style="margin-top: 20px; padding: 10px 14px; border: 1px dashed #cbd5e1; background: #f8fafc; border-radius: 6px; font-family: sans-serif; font-size: 9pt; color: #64748b; text-align: center;">
        Documento em fase de rascunho / aguardando assinatura eletrônica do convocante.
      </div>
    `

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Edital de Convocação - ${dados.nomeCondominio}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 18mm 16mm 18mm 16mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: "Georgia", "Cambria", "Times New Roman", serif;
      color: #0f172a;
      background: #ffffff;
      line-height: 1.5;
      font-size: 11pt;
    }
    .document-page {
      width: 100%;
      max-width: 800px;
      margin: 0 auto;
      padding: 0;
    }
    header {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 16px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .header-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .logo-condo {
      height: 52px;
      max-width: 120px;
      object-fit: contain;
    }
    .header-text {
      text-align: center;
      flex: 1;
    }
    .header-tag {
      font-size: 8pt;
      font-weight: 800;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #0284c7;
      margin-bottom: 2px;
    }
    .condo-title {
      font-size: 15pt;
      font-weight: 800;
      text-transform: uppercase;
      margin: 0;
      color: #020617;
      letter-spacing: 0.5px;
    }
    .header-sub {
      font-size: 9pt;
      color: #475569;
      margin: 2px 0 0 0;
      text-transform: uppercase;
      font-weight: 600;
    }
    .emission-badge {
      text-align: right;
      font-family: monospace;
      font-size: 8pt;
      color: #64748b;
      white-space: nowrap;
    }
    .doc-headline {
      text-align: center;
      margin: 16px 0 16px 0;
      padding: 8px 12px;
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
    }
    .doc-headline h2 {
      margin: 0;
      font-size: 13.5pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #020617;
    }
    .doc-headline p {
      margin: 3px 0 0 0;
      font-size: 9.5pt;
      color: #475569;
      font-style: italic;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .text-body {
      text-align: justify;
      margin-bottom: 14px;
      line-height: 1.5;
    }
    .rendered-document-html p {
      margin-top: 0;
      margin-bottom: 8px;
    }
    .rendered-document-html p:last-child {
      margin-bottom: 0;
    }
    .rendered-document-html ul {
      list-style-type: disc !important;
      margin: 4px 0 8px 22px !important;
      padding-left: 2px !important;
    }
    .rendered-document-html ol {
      list-style-type: decimal !important;
      margin: 4px 0 8px 22px !important;
      padding-left: 2px !important;
    }
    .rendered-document-html li {
      margin-bottom: 4px;
    }
    .rendered-document-html mark {
      background-color: #fef08a;
      padding: 1px 3px;
      border-radius: 2px;
    }
    .rendered-document-html sub {
      vertical-align: sub;
      font-size: 75%;
    }
    .rendered-document-html sup {
      vertical-align: super;
      font-size: 75%;
    }
    .rendered-document-html u {
      text-decoration: underline;
    }
    .rendered-document-html blockquote {
      border-left: 3px solid #cbd5e1;
      padding-left: 10px;
      margin: 4px 0;
      color: #475569;
      font-style: italic;
    }
    .box-condicoes {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 10px 14px;
      margin: 14px 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 9.5pt;
    }
    .box-condicoes div {
      margin-bottom: 4px;
    }
    .box-condicoes div:last-child {
      margin-bottom: 0;
    }
    .section-title {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 9.5pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #0f172a;
      margin: 14px 0 6px 0;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 3px;
    }
    .signature-area {
      margin-top: 28px;
      text-align: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      page-break-inside: avoid;
    }
    .signature-box {
      display: inline-block;
      text-align: center;
      line-height: 1.15;
    }
    .signature-line {
      width: 260px;
      border-top: 1.5px solid #0f172a;
      margin: 0 auto 4px auto;
    }
    .signature-name {
      font-size: 10.5pt;
      font-weight: bold;
      text-transform: uppercase;
      color: #0f172a;
      margin: 0;
      padding: 0;
      line-height: 1.15;
    }
    .signature-cpf {
      font-size: 9pt;
      color: #475569;
      font-family: monospace;
      margin: 0;
      padding: 0;
      line-height: 1.15;
    }
    .signature-role {
      font-size: 8.5pt;
      color: #64748b;
      margin: 0;
      padding: 0;
      line-height: 1.15;
    }
    .footer-note {
      margin-top: 24px;
      padding-top: 8px;
      border-top: 1px solid #e2e8f0;
      font-size: 7.5pt;
      color: #94a3b8;
      text-align: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      page-break-inside: avoid;
    }
    @media print {
      body {
        margin: 0;
        background: #ffffff;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="document-page">
    <header>
      <div class="header-content">
        ${
          dados.logoUrl
            ? `<img src="${dados.logoUrl}" alt="${dados.nomeCondominio}" class="logo-condo" />`
            : ''
        }
        <div class="header-text">
          <div class="header-tag">Edital Oficial de Convocação</div>
          <h1 class="condo-title">${dados.nomeCondominio}</h1>
          <p class="header-sub">Assembleia Geral de Condôminos</p>
        </div>
        <div class="emission-badge">
          <div><strong>Emissão:</strong> ${dataHoje}</div>
          <div>${horaHoje}</div>
          <div style="margin-top: 3px; color: #0284c7; font-weight: bold;">VIA OFICIAL</div>
        </div>
      </div>
    </header>

    <div class="doc-headline">
      <h2>${dados.titulo}</h2>
      ${dados.subtitulo ? `<p>${dados.subtitulo}</p>` : ''}
    </div>

    <div class="text-body rendered-document-html">
      ${converterTextoParaHtmlSeguro(dados.textoAbertura)}
    </div>

    <div class="box-condicoes">
      <div><strong>• Data da Assembleia:</strong> ${dados.dataAssembleia || 'Conforme cronograma da assembleia'}</div>
      <div><strong>• 1ª Convocação:</strong> às ${dados.primeiraConvocacao || '19:00'} horas (com quórum regimental da Convenção).</div>
      <div><strong>• 2ª Convocação:</strong> às ${dados.segundaConvocacao || '19:30'} horas (com qualquer número de condôminos presentes).</div>
      <div><strong>• Local e Plataforma:</strong> ${dados.localTexto || 'Salão de Festas / Plataforma Virtual'}</div>
    </div>

    <div class="section-title">Ordem do Dia / Pauta de Deliberações</div>
    <div style="font-size: 10.5pt; margin-bottom: 12px;">
      ${pautaRender}
    </div>

    <div class="section-title">Disposições Gerais e Instruções aos Condôminos</div>
    <div class="text-body rendered-document-html" style="font-size: 10pt; color: #334155; margin-bottom: 8px;">
      ${converterTextoParaHtmlSeguro(dados.disposicoesGerais)}
    </div>

    ${
      dados.regrasParticipacao && dados.regrasParticipacao.trim().length > 0
        ? `
      <div class="section-title">Regras Regimentais e Legais de Participação</div>
      <div class="text-body rendered-document-html" style="font-size: 9.5pt; color: #475569; margin-bottom: 10px;">
        ${converterTextoParaHtmlSeguro(dados.regrasParticipacao)}
      </div>
    `
        : ''
    }

    <div class="signature-area">
      <div class="signature-box">
        <div class="signature-line"></div>
        <div class="signature-name">${dados.sindicoNome || 'Síndico(a) / Mesa Diretora'}</div>
        ${dados.sindicoCpf ? `<div class="signature-cpf">CPF: ${dados.sindicoCpf}</div>` : ''}
        <div class="signature-role">${dados.cargoConvocante || `Representante Legal do ${dados.nomeCondominio}`}</div>
      </div>

      ${seloAssinatura}
    </div>

    <div class="footer-note">
      Documento gerado eletronicamente pela Plataforma Votum de Governança Condominial.<br>
      A autenticidade deste edital pode ser confirmada por meio do hash SHA-256 e da chave de assinatura criptográfica.
    </div>
  </div>
</body>
</html>`
}

/**
 * Abre a janela de visualização dedicada e dispara o print/salvar em PDF
 */
export function imprimirOuBaixarPdfEdital(dados: DadosEditalPdf): void {
  const html = gerarHtmlDocumentoEdital(dados)
  const janela = window.open('', '_blank', 'width=900,height=1000')

  if (!janela) {
    alert(
      'O navegador bloqueou a abertura da janela do documento. Por favor, permita pop-ups para este site.',
    )
    return
  }

  janela.document.open()
  janela.document.write(html)
  janela.document.close()

  // Aguardar carregamento de imagens/fontes antes de chamar print
  janela.focus()
  setTimeout(() => {
    janela.print()
  }, 400)
}
