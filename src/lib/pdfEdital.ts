/**
 * Utilitário de Geração e Impressão de PDF para Documentos Oficiais (Edital, Atas, Boletins)
 * Utiliza o pipeline nativo de alta fidelidade e styling A4 via janela limpa de impressão
 * e trigger do driver de PDF/impressora do browser.
 */
import { gerarHtmlInstrucoesAcesso, type InstrucoesAcessoVotacao } from '@/lib/selo/honestidade'
import { TEXTO_LEGAL_SELO } from '@/lib/selo/honestidade'

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
  /** Data/hora declarada pelo signatário no ato (recurso existente); exibida como tal */
  dataDeclaradaSignatario?: string | null
  dataEmissao?: string
  /** true quando esta via é uma reemissão (2ª via / cópia) */
  segundaVia?: boolean
  /** Referência ao original assinado para a 2ª via (hash + data original) */
  referenciaOriginal?: { hash: string; dataAssinatura: string } | null
  /** Frase curta: a organização adota a assinatura eletrônica descrita e onde conferi-la */
  fraseAdocaoAssinatura?: string
  /** Menção de que a convocação eletrônica não é vedada pelo documento normativo (artigo informado pela organização) */
  mencaoNormativaConvocacaoEletronica?: string
  /** Texto da regra de procuração escolhida pela organização (gerarTextoProcuracao) */
  textoProcuracao?: string
  instrucoesAcesso?: InstrucoesAcessoVotacao | null
  formatoAssinatura?: 'desenho' | 'texto' | 'em_branco'
  assinaturaVisual?: string
  assinaturaTexto?: string
  /** true na via gerada em bytes como anexo ZapSign — nota enxuta, sem bloco criptográfico (padrão da ata) */
  viaZapsign?: boolean
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

  // Bloco OBRIGATÓRIO de instruções de acesso e votação eletrônica
  const blocoInstrucoesAcesso = dados.instrucoesAcesso
    ? gerarHtmlInstrucoesAcesso(dados.instrucoesAcesso)
    : ''

  // Frase curta de adoção do método de assinatura + referência de conferência
  const fraseAdocao = dados.fraseAdocaoAssinatura?.trim()
    ? `<div style="border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 12px; margin: 12px 0; font-size: 9pt; color: #334155; background: #F8FAFC;">
         ${converterTextoParaHtmlSeguro(dados.fraseAdocaoAssinatura)}
       </div>`
    : ''

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

  // Formatar hash em blocos de 8 caracteres para quebra limpa e não estourar a página A4
  const formatarHashBlocos = (h?: string | null): string => {
    if (!h) return ''
    const limpo = h.trim()
    if (limpo.length !== 64) return limpo
    const blocos: string[] = []
    for (let i = 0; i < limpo.length; i += 8) {
      blocos.push(limpo.substring(i, i + 8))
    }
    return blocos.join(' ')
  }

  const formatarDataAssinatura = (dataIso?: string | null): string => {
    if (!dataIso) return 'Registrada no ato de assinatura'
    try {
      const d = new Date(dataIso)
      if (isNaN(d.getTime())) return dataIso
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    } catch {
      return dataIso
    }
  }

  const seloAssinatura = dados.hashAssinatura
    ? `
      <div style="margin-top: 24px; padding: 14px 18px; border: 1.5px solid #0066FF; background: linear-gradient(135deg, #F3F7FC 0%, #FFFFFF 100%); border-radius: 8px; font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: left; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(0, 102, 255, 0.2); padding-bottom: 8px; margin-bottom: 10px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 22px; height: 22px; border-radius: 50%; background: #0066FF; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 11pt; font-weight: bold; line-height: 1;">✓</div>
            <div>
              <span style="font-size: 9.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #002B5E;">Documento Assinado Eletronicamente</span>
              <span style="display: inline-block; margin-left: 6px; padding: 1px 6px; border-radius: 4px; background: rgba(0, 102, 255, 0.12); color: #0066FF; font-size: 8pt; font-weight: 700; font-family: monospace;">SHA-256</span>
            </div>
          </div>
          <div style="text-align: right; font-size: 8pt; font-weight: 700; color: #0066FF; letter-spacing: 0.5px;">
            ${dados.segundaVia ? '2ª VIA / CÓPIA' : 'VIA AUTENTICADA'}
          </div>
        </div>

        ${
          dados.segundaVia
            ? `<div style="background: #FFF7ED; border: 1px solid #FDBA74; border-radius: 6px; padding: 8px 10px; margin-bottom: 10px; font-size: 8.5pt; color: #7C2D12;">
                 <strong>2ª via / cópia</strong> — não é o original assinado. Referência do original: hash <span style="font-family: monospace;">${formatarHashBlocos(dados.referenciaOriginal?.hash || dados.hashAssinatura)}</span>, assinado em ${formatarDataAssinatura(dados.referenciaOriginal?.dataAssinatura || dados.dataAssinatura)}.
               </div>`
            : ''
        }

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; font-size: 8.5pt;">
          <div style="background: rgba(255,255,255,0.8); border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 10px;">
            <span style="display: block; font-size: 7.5pt; font-weight: 700; text-transform: uppercase; color: #5A6B82; letter-spacing: 0.5px; margin-bottom: 2px;">Signatário Oficial</span>
            <strong style="color: #002B5E; font-size: 9.5pt;">${dados.sindicoNome || 'Síndico(a) / Mesa'}</strong>
            <div style="color: #5A6B82; font-size: 8pt; margin-top: 1px;">
              ${dados.cargoConvocante || 'Convocante'}${dados.sindicoCpf ? ` • <span style="font-family: monospace;">CPF: ${dados.sindicoCpf}</span>` : ''}
            </div>
          </div>

          <div style="background: rgba(255,255,255,0.8); border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 10px;">
            <span style="display: block; font-size: 7.5pt; font-weight: 700; text-transform: uppercase; color: #5A6B82; letter-spacing: 0.5px; margin-bottom: 2px;">Data de assinatura (registrada pela plataforma)</span>
            <strong style="color: #002B5E; font-size: 9.5pt; font-family: monospace;">${formatarDataAssinatura(dados.dataAssinatura)}</strong>
            ${dados.dataDeclaradaSignatario ? `<div style="color: #7C2D12; font-size: 8pt; margin-top: 2px;"><strong>Data declarada pelo signatário:</strong> ${formatarDataAssinatura(dados.dataDeclaradaSignatario)}</div>` : ''}
            <div style="color: #5A6B82; font-size: 8pt; margin-top: 1px;">Registro da assinatura eletrônica, com segundos</div>
          </div>
        </div>

        <div style="background: rgba(255,255,255,0.8); border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 10px; margin-bottom: 10px; font-size: 8.5pt;">
          <span style="display: block; font-size: 7.5pt; font-weight: 700; text-transform: uppercase; color: #5A6B82; letter-spacing: 0.5px; margin-bottom: 2px;">Data de emissão desta via</span>
          <strong style="color: #002B5E; font-size: 9.5pt; font-family: monospace;">${dataHoje} às ${horaHoje}</strong>
          <div style="color: #5A6B82; font-size: 8pt; margin-top: 1px;">Momento da geração deste documento (independe da assinatura)</div>
        </div>

        <div style="background: #ffffff; border: 1px solid #CBD5E1; border-radius: 6px; padding: 8px 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
            <span style="font-size: 7.5pt; font-weight: 700; text-transform: uppercase; color: #002B5E; letter-spacing: 0.5px;">Hash Criptográfico de Integridade (SHA-256)</span>
            <span style="font-size: 7pt; color: #5A6B82; font-family: monospace;">256-bit Digest</span>
          </div>
          <div style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 8.5pt; color: #002B5E; font-weight: 600; line-height: 1.4; word-break: break-all; letter-spacing: 0.5px; background: #F8FAFC; padding: 6px 8px; border-radius: 4px; border: 1px solid #E2E8F0;">
            ${formatarHashBlocos(dados.hashAssinatura)}
          </div>
          <div style="color: #5A6B82; font-size: 7.5pt; margin-top: 4px; line-height: 1.2;">
            Assinatura eletrônica: autoria e integridade comprovadas por outro meio com a anuência das partes (art. 10, §2º da MP 2.200-2/2001) — referência: Lei 14.063/2020. A alteração de qualquer caractere invalida a verificação deste hash.
          </div>
        </div>
      </div>
    `
    : `
      <div style="margin-top: 24px; padding: 12px 16px; border: 1px dashed #cbd5e1; background: #f8fafc; border-radius: 6px; font-family: 'Poppins', sans-serif; font-size: 9pt; color: #64748b; text-align: center;">
        Documento em fase de elaboração / aguardando assinatura eletrônica oficial do convocante.
      </div>
    `

  const temDesenho = dados.formatoAssinatura === 'desenho' && !!dados.assinaturaVisual
  const temTexto = dados.formatoAssinatura === 'texto' && !!dados.assinaturaTexto

  const areaGraficaAssinatura = temDesenho
    ? `<div style="min-height: 75px; display: flex; align-items: flex-end; justify-content: center; margin-bottom: -1px;">
         <img src="${dados.assinaturaVisual}" alt="Assinatura" style="max-height: 75px; max-width: 346px; object-fit: contain; object-position: bottom center;" />
       </div>`
    : temTexto
      ? `<div style="height: 69px; display: flex; align-items: flex-end; justify-content: center; margin-bottom: -1px;">
           <span style="font-family: 'Dancing Script', 'Great Vibes', cursive; font-size: 37pt; color: #002B5E; font-weight: bold; line-height: 1;">${dados.assinaturaTexto}</span>
         </div>`
      : `<div style="height: 24px;"></div>`

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Edital de Convocação - ${dados.nomeCondominio}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600;700&family=Great+Vibes&display=swap" rel="stylesheet" />
  <style>
    @page {
      size: A4 portrait;
      /* Margens oficiais do documento: 8,5mm topo / 15mm laterais / 15mm rodapé */
      margin: 8.5mm 15mm 15mm 15mm;
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
      color: #002B5E;
      background: #ffffff;
      line-height: 1.5;
      font-size: 11pt;
    }
    .document-page {
      width: 100%;
      /* 210mm - 2 x 15mm laterais = 180mm de área útil ≈ 680px @96dpi */
      max-width: 680px;
      margin: 0 auto;
      padding: 0;
    }
    header {
      border-bottom: 2px solid #002B5E;
      padding-bottom: 12px;
      margin-bottom: 16px;
      font-family: 'Poppins', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
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
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #0066FF;
      margin-bottom: 2px;
    }
    .condo-title {
      font-size: 15pt;
      font-weight: 800;
      text-transform: uppercase;
      margin: 0;
      color: #002B5E;
      letter-spacing: 0.5px;
    }
    .header-sub {
      font-size: 9pt;
      color: #5A6B82;
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
      background-color: #F3F7FC;
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      font-family: 'Poppins', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .doc-headline h2 {
      margin: 0;
      font-size: 13pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #002B5E;
    }
    .doc-headline p {
      margin: 3px 0 0 0;
      font-size: 9.5pt;
      color: #5A6B82;
      font-style: italic;
      font-family: 'Poppins', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
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
      background: #F3F7FC;
      border: 1px solid #E2E8F0;
      border-left: 4px solid #0066FF;
      border-radius: 6px;
      padding: 10px 14px;
      margin: 14px 0;
      font-family: 'Poppins', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 9.5pt;
      color: #002B5E;
    }
    .box-condicoes div {
      margin-bottom: 4px;
    }
    .box-condicoes div:last-child {
      margin-bottom: 0;
    }
    .section-title {
      font-family: 'Poppins', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 9.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #002B5E;
      margin: 14px 0 6px 0;
      border-bottom: 1.5px solid #0066FF;
      padding-bottom: 3px;
    }
    .signature-area {
      margin-top: 36px;
      padding-top: 20px;
      border-top: 2px solid #002B5E;
      text-align: center;
      font-family: 'Poppins', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      page-break-inside: avoid;
    }
    .signature-box {
      display: inline-block;
      text-align: center;
      line-height: 1.2;
    }
    .signature-line {
      width: 346px;
      border-top: 1.5px solid #002B5E;
      margin: 6px auto;
    }    .signature-name {
      font-size: 11pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #002B5E;
      margin: 0;
      padding: 0;
      line-height: 1.2;
    }
    .signature-cpf {
      font-size: 9.5pt;
      color: #5A6B82;
      font-family: monospace;
      font-weight: 600;
      margin: 2px 0 0 0;
      padding: 0;
      line-height: 1.2;
    }
    .signature-role {
      font-size: 9pt;
      color: #5A6B82;
      font-weight: 500;
      margin: 2px 0 0 0;
      padding: 0;
      line-height: 1.2;
    }
    .footer-note {
      margin-top: 24px;
      padding-top: 10px;
      border-top: 1px solid #E2E8F0;
      font-size: 8pt;
      color: #5A6B82;
      text-align: center;
      font-family: 'Poppins', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      page-break-inside: avoid;
    }
    .seal-a3one {
      display: inline-block;
      margin-top: 8px;
      padding: 4px 12px;
      border: 1px solid #E2E8F0;
      border-radius: 999px;
      background-color: #F3F7FC;
      font-size: 7.5pt;
      color: #5A6B82;
      letter-spacing: 0.3px;
    }
    .seal-a3one strong {
      color: #002B5E;
    }
    .seal-a3one .brand-a3one {
      color: #0066FF;
      font-weight: 700;
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
          <div><strong>Emissão desta via:</strong> ${dataHoje}</div>
          <div>${horaHoje}</div>
          <div style="margin-top: 3px; color: #0066FF; font-weight: bold;">${dados.segundaVia ? '2ª VIA / CÓPIA' : 'VIA OFICIAL'}</div>
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
      <div><strong>• Local e Plataforma:</strong> ${dados.localTexto || 'Salão de Festas / Plataforma Virtual Koinon'}</div>
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

    <div class="section-title">Procurações</div>
    <div class="text-body rendered-document-html" style="font-size: 10pt; color: #334155; margin-bottom: 10px;">
      ${converterTextoParaHtmlSeguro(dados.textoProcuracao || '')}
    </div>

    ${
      dados.mencaoNormativaConvocacaoEletronica?.trim()
        ? `<div class="text-body rendered-document-html" style="font-size: 9.5pt; color: #475569; margin-bottom: 10px;">
             ${converterTextoParaHtmlSeguro(dados.mencaoNormativaConvocacaoEletronica)}
           </div>`
        : ''
    }

    ${blocoInstrucoesAcesso}

    ${fraseAdocao}

    <div class="signature-area">
      <div class="signature-box">
        ${areaGraficaAssinatura}
        <div class="signature-line"></div>
        <div class="signature-name">${dados.sindicoNome || 'Síndico(a) / Mesa Diretora'}</div>
        ${dados.sindicoCpf ? `<div class="signature-cpf">CPF: ${dados.sindicoCpf}</div>` : ''}
        <div class="signature-role">${dados.cargoConvocante || `Representante Legal do ${dados.nomeCondominio}`}</div>
      </div>

      ${seloAssinatura}
    </div>

    ${
      dados.viaZapsign
        ? `<div style="margin-top: 10px; font-size: 8pt; color: #5A6B82; font-style: italic;">
             Nota: esta via destina-se à assinatura eletrônica via plataforma ZapSign (assinatura eletrônica simples). Após a conclusão, o PDF assinado pela ZapSign passa a ser a via oficial, com hash SHA-256 registrado no documento.
           </div>`
        : ''
    }

    <div class="footer-note">
      Documento gerado eletronicamente pela Plataforma Virtual Koinon.<br>
      ${
        dados.viaZapsign
          ? `Hash da urna (SHA-256): <span style="font-family: monospace;">${dados.hashAssinatura || '—'}</span>`
          : 'A autenticidade deste edital pode ser confirmada por meio do hash SHA-256 e da chave de assinatura criptográfica.'
      }
      <div>
        <span class="seal-a3one">
          <strong>KOINON</strong> • uma solução <span class="brand-a3one">A3ONE</span>
        </span>
      </div>
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
