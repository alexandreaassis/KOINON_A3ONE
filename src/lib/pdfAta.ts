/**
 * Utilitário de Geração e Impressão de PDF para a Ata de Assembleia Geral (Fase 2)
 * Formato institucional A4 com cabeçalho do condomínio, texto solene justificado,
 * selo de integridade criptográfica SHA-256 da ata e da urna, e assinaturas da mesa diretora.
 */

import { type FormatoAssinatura } from '@/lib/api'

export interface DadosAtaPdf {
  nomeCondominio: string
  logoUrl?: string
  titulo: string
  subtitulo?: string
  conteudoHtml: string
  dataEmissao?: string
  status?: string
  hashAta?: string | null
  hashRaizUrna?: string | null
  dataPublicacao?: string | null

  // Fallback ou modo de assinatura
  viaAssinaturaManual?: boolean
  motivoFallbackManual?: string

  // Via destinada à assinatura eletrônica (ZapSign): omite o bloco
  // criptográfico e as caixas de publicação/homologação, usando nota enxuta
  // com o hash da urna (padrão espelhado da via manual).
  viaZapsign?: boolean

  // Presidente da Mesa
  presidenteNome: string
  presidenteCpf?: string
  presidenteFormato?: FormatoAssinatura
  presidenteAssinaturaVisual?: string
  presidenteAssinaturaTexto?: string
  presidenteAssinadoEm?: string | null
  presidenteHash?: string | null

  // Secretário(a) da Mesa
  secretarioNome: string
  secretarioCpf?: string
  secretarioFormato?: FormatoAssinatura
  secretarioAssinaturaVisual?: string
  secretarioAssinaturaTexto?: string
  secretarioAssinadoEm?: string | null
  secretarioHash?: string | null
}

// Formatar hash em blocos de 8 caracteres para quebra limpa
function formatarHashBlocosAta(h?: string | null): string {
  if (!h) return ''
  const limpo = h.trim()
  if (limpo.length !== 64) return limpo
  const blocos: string[] = []
  for (let i = 0; i < limpo.length; i += 8) {
    blocos.push(limpo.substring(i, i + 8))
  }
  return blocos.join(' ')
}

function renderAssinaturaVisual(
  formato?: FormatoAssinatura,
  visual?: string,
  texto?: string,
): string {
  if (formato === 'desenho' && visual) {
    return `<div style="min-height: 75px; display: flex; align-items: flex-end; justify-content: center; margin-bottom: -1px;">
      <img src="${visual}" alt="Assinatura" style="max-height: 75px; max-width: 92%; object-fit: contain; object-position: bottom center;" />
    </div>`
  }
  if (formato === 'texto' && texto) {
    return `<div style="height: 69px; display: flex; align-items: flex-end; justify-content: center; margin-bottom: -1px;">
      <span style="font-family: 'Dancing Script', 'Great Vibes', cursive; font-size: 35pt; color: #002B5E; font-weight: bold; line-height: 1;">${texto}</span>
    </div>`
  }
  return `<div style="height: 24px;"></div>`
}

export function gerarHtmlDocumentoAta(dados: DadosAtaPdf): string {
  // Formatar data/hora no padrão institucional com segundos
  const formatarDataAssinaturaAta = (dataIso?: string | null): string => {
    if (!dataIso) return ''
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

  const statusLabel =
    dados.status === 'publicada'
      ? 'PUBLICADA E HOMOLOGADA'
      : dados.status === 'assinada'
        ? 'ASSINADA PELA MESA'
        : 'MINUTA / RASCUNHO'

  const statusCor =
    dados.status === 'publicada' ? '#0284c7' : dados.status === 'assinada' ? '#059669' : '#d97706'

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Ata de Assembleia - ${dados.nomeCondominio}</title>
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
      line-height: 1.6;
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
      margin-bottom: 18px;
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
      margin: 14px 0 18px 0;
      padding: 10px 14px;
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
      margin: 4px 0 0 0;
      font-size: 9.5pt;
      color: #5A6B82;
      font-family: 'Poppins', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-weight: 500;
    }
    .text-body {
      text-align: justify;
      margin-bottom: 16px;
      line-height: 1.65;
    }
    .rendered-document-html p {
      margin-top: 0;
      margin-bottom: 10px;
      text-indent: 28px;
    }
    .rendered-document-html h3 {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 11pt;
      font-weight: 800;
      text-transform: uppercase;
      color: #0f172a;
      margin: 16px 0 6px 0;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 3px;
      text-indent: 0;
    }
    .rendered-document-html h4 {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 10pt;
      font-weight: 700;
      color: #1e293b;
      margin: 12px 0 4px 0;
      text-indent: 0;
    }
    .rendered-document-html ul, .rendered-document-html ol {
      margin: 6px 0 10px 24px !important;
      padding-left: 4px !important;
    }
    .rendered-document-html li {
      margin-bottom: 4px;
    }
    .rendered-document-html blockquote {
      border-left: 3px solid #cbd5e1;
      padding-left: 12px;
      margin: 8px 0;
      color: #475569;
      font-style: italic;
    }
    .crypto-box {
      margin-top: 28px;
      padding: 14px 18px;
      background: linear-gradient(135deg, #F3F7FC 0%, #FFFFFF 100%);
      border: 1.5px solid #0066FF;
      border-radius: 8px;
      font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 8.5pt;
      color: #002B5E;
      line-height: 1.4;
      page-break-inside: avoid;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    .crypto-box-title {
      font-weight: 700;
      color: #002B5E;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(0, 102, 255, 0.2);
      padding-bottom: 6px;
      font-size: 9.5pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .signatures-section {
      margin-top: 36px;
      padding-top: 20px;
      border-top: 2px solid #002B5E;
      page-break-inside: avoid;
      font-family: 'Poppins', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .signatures-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      text-align: center;
      margin-top: 10px;
    }
    .signature-card {
      display: inline-block;
      width: 100%;
    }
    .signature-line {
      width: 92%;
      max-width: 346px;
      border-top: 1.5px solid #002B5E;
      margin: 8px auto 6px auto;
    }    .signature-name {
      font-size: 10.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #002B5E;
      margin: 0;
      line-height: 1.2;
    }
    .signature-cpf {
      font-size: 9pt;
      color: #5A6B82;
      font-family: monospace;
      font-weight: 600;
      margin: 2px 0 0 0;
      line-height: 1.2;
    }
    .signature-role {
      font-size: 8.5pt;
      color: #5A6B82;
      font-weight: 500;
      margin: 2px 0 0 0;
      line-height: 1.2;
    }
    .signature-hash-stamp {
      margin-top: 6px;
      padding: 4px 6px;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 4px;
      font-size: 7.5pt;
      color: #0066FF;
      font-family: monospace;
      word-break: break-all;
    }    .footer-note {
      margin-top: 28px;
      padding-top: 12px;
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
          <div class="header-tag">Ata Notarial e Deliberativa</div>
          <h1 class="condo-title">${dados.nomeCondominio}</h1>
          <p class="header-sub">Assembleia Geral de Condôminos</p>
        </div>
        <div class="emission-badge">
          <div><strong>Emissão:</strong> ${dataHoje}</div>
          <div>${horaHoje}</div>
          <div style="margin-top: 3px; color: ${statusCor}; font-weight: bold;">${statusLabel}</div>
        </div>
      </div>
    </header>

    ${
      dados.viaAssinaturaManual
        ? `
        <div style="margin: 12px 0 16px 0; padding: 10px 14px; background: #FFFBEB; border: 1.5px solid #F59E0B; border-radius: 6px; text-align: center; color: #92400E; font-family: 'Poppins', sans-serif;">
          <div style="font-weight: 700; font-size: 9.5pt; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">
            ⚠️ VIA PARA ASSINATURA MANUAL (IMPRESSÃO)
          </div>
          <div style="font-size: 8pt; line-height: 1.35;">
            Este documento destina-se à coleta física de assinaturas a caneta pela Mesa Diretora. Não possui selo de certificação eletrônica externa neste exemplar impresso.
            ${dados.motivoFallbackManual ? `<br><span style="font-size: 7.5pt; color: #B45309;">(Motivo de contingência: ${dados.motivoFallbackManual})</span>` : ''}
          </div>
        </div>
        `
        : ''
    }

    <div class="doc-headline">
      <h2>${dados.titulo || 'ATA DA ASSEMBLEIA GERAL ORDINÁRIA/EXTRAORDINÁRIA'}</h2>
      ${dados.subtitulo ? `<p>${dados.subtitulo}</p>` : ''}
    </div>

    <!-- Corpo Solene da Ata -->
    <div class="text-body rendered-document-html">
      ${dados.conteudoHtml || '<p>Ata em elaboração pela mesa diretora.</p>'}
    </div>

    <!-- Bloco Criptográfico de Auditoria da Urna e da Ata (Omitido ou adaptado quando for via para assinatura manual) -->
    ${
      dados.viaAssinaturaManual
        ? `
        <div style="margin-top: 24px; padding: 10px 14px; background: #F8FAFC; border: 1px dashed #94A3B8; border-radius: 6px; font-family: 'Poppins', sans-serif; font-size: 8pt; color: #475569;">
          <strong>Nota de Registro Cartorário/Manual:</strong>
          Via gerada para subscrição física de punho próprio pelos membros da mesa diretora designados abaixo. A integridade das cédulas digitais apuradas na urna eletrônica permanece resguardada no sistema com o hash:
          <span style="font-family: monospace; font-size: 7.5pt; color: #002B5E;">${dados.hashRaizUrna || 'Cédulas consolidadas no encerramento'}</span>.
        </div>
        `
        : dados.viaZapsign
          ? `
        <div style="margin-top: 24px; padding: 10px 14px; background: #F8FAFC; border: 1px dashed #94A3B8; border-radius: 6px; font-family: 'Poppins', sans-serif; font-size: 8pt; color: #475569;">
          <strong>Nota de Assinatura Eletrônica (ZapSign):</strong>
          Via destinada à assinatura eletrônica via ZapSign; integridade da urna garantida pelo hash:
          <span style="font-family: monospace; font-size: 7.5pt; color: #002B5E;">${dados.hashRaizUrna || 'Cédulas consolidadas no encerramento'}</span>.
        </div>
        `
          : `
        <div class="crypto-box">
          <div class="crypto-box-title">
            <span style="display: flex; align-items: center; gap: 6px;">
              <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #0066FF;"></span>
              Certificação e Integridade Criptográfica (SHA-256)
            </span>
            <span style="font-size: 8pt; color: #0066FF; font-weight: 700; font-family: monospace;">KOINON</span>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; font-size: 8.5pt;">
            <div style="background: rgba(255,255,255,0.85); padding: 6px 10px; border-radius: 4px; border: 1px solid #E2E8F0;">
              <span style="display: block; font-size: 7.5pt; font-weight: 700; text-transform: uppercase; color: #5A6B82;">Urna Auditada</span>
              <span style="font-family: monospace; font-size: 8pt; color: #002B5E; word-break: break-all;">${dados.hashRaizUrna || 'Cédulas consolidadas no encerramento'}</span>
            </div>
            <div style="background: rgba(255,255,255,0.85); padding: 6px 10px; border-radius: 4px; border: 1px solid #E2E8F0;">
              <span style="display: block; font-size: 7.5pt; font-weight: 700; text-transform: uppercase; color: #5A6B82;">Publicação Oficial</span>
              <span style="font-size: 8pt; color: #002B5E; font-family: monospace;">${dados.dataPublicacao ? new Date(dados.dataPublicacao).toLocaleString('pt-BR') : 'Aguardando publicação'}</span>
            </div>
          </div>

          ${
            dados.hashAta
              ? `
                <div style="background: #ffffff; padding: 6px 10px; border-radius: 4px; border: 1px solid #CBD5E1; margin-bottom: 6px;">
                  <span style="display: block; font-size: 7.5pt; font-weight: 700; text-transform: uppercase; color: #002B5E; margin-bottom: 2px;">Carimbo SHA-256 da Ata Homologada:</span>
                  <div style="font-family: monospace; font-size: 8pt; color: #002B5E; word-break: break-all; letter-spacing: 0.5px;">${formatarHashBlocosAta(dados.hashAta)}</div>
                </div>
              `
              : '<div style="font-size: 8pt; color: #5A6B82; padding: 4px 0;"><strong>Status:</strong> Minuta aguardando homologação e assinatura da mesa diretora.</div>'
          }

          <div style="color: #5A6B82; font-size: 7.5pt; margin-top: 4px; line-height: 1.25;">
            Esta ata foi lavrada sob a fé pública da Mesa Diretora eleita, com integridade garantida por assinatura eletrônica e trilha de auditoria digital encadeada.
          </div>
        </div>
        `
    }

    <!-- Bloco de Assinaturas da Mesa Diretora (Presidente e Secretário) -->
    <div class="signatures-section">
      <div class="signatures-grid">
        <!-- Presidente da Mesa -->
        <div class="signature-card">
          ${renderAssinaturaVisual(
            dados.presidenteFormato,
            dados.presidenteAssinaturaVisual,
            dados.presidenteAssinaturaTexto,
          )}
          <div class="signature-line"></div>
          <div class="signature-name">${dados.presidenteNome || 'Presidente da Mesa'}</div>
          ${dados.presidenteCpf ? `<div class="signature-cpf">CPF: ${dados.presidenteCpf}</div>` : ''}
          <div class="signature-role">Presidente da Assembleia</div>
          ${
            dados.presidenteHash
              ? `<div class="signature-hash-stamp">Assinado em ${formatarDataAssinaturaAta(dados.presidenteAssinadoEm)}<br>SHA: ${dados.presidenteHash.substring(0, 24)}...</div>`
              : '<div style="font-size: 7.5pt; color: #94a3b8; margin-top: 2px;">Aguardando assinatura</div>'
          }
        </div>

        <!-- Secretário(a) da Mesa -->
        <div class="signature-card">
          ${renderAssinaturaVisual(
            dados.secretarioFormato,
            dados.secretarioAssinaturaVisual,
            dados.secretarioAssinaturaTexto,
          )}
          <div class="signature-line"></div>
          <div class="signature-name">${dados.secretarioNome || 'Secretário(a) da Mesa'}</div>
          ${dados.secretarioCpf ? `<div class="signature-cpf">CPF: ${dados.secretarioCpf}</div>` : ''}
          <div class="signature-role">Secretário(a) da Assembleia</div>
          ${
            dados.secretarioHash
              ? `<div class="signature-hash-stamp">Assinado em ${formatarDataAssinaturaAta(dados.secretarioAssinadoEm)}<br>SHA: ${dados.secretarioHash.substring(0, 24)}...</div>`
              : '<div style="font-size: 7.5pt; color: #94a3b8; margin-top: 2px;">Aguardando assinatura</div>'
          }
        </div>
      </div>
    </div>

    <div class="footer-note">
      Documento lavrado e homologado através da Plataforma Virtual Koinon.<br>
      ${
        dados.viaAssinaturaManual
          ? 'Via emitida para assinatura manual e física (impressão). Dispensado de selo de certificação eletrônica externa neste suporte físico.'
          : dados.viaZapsign
            ? 'Via destinada à assinatura eletrônica via ZapSign; integridade da urna garantida pelo hash.'
            : 'A integridade deste instrumento é atestada pelas assinaturas eletrônicas da Mesa Diretora e pelo Hash Raiz SHA-256 auditado — autoria e integridade comprovadas por outro meio com a anuência das partes (art. 10, §2º da MP 2.200-2/2001); referência: Lei 14.063/2020.'
      }
      <div>
        <span class="seal-a3one">
          <strong>KOINON</strong> • uma solução <span class="brand-a3one">A3ONE</span>
        </span>
      </div>
    </div>  </div>
</body>
</html>`
}

export function imprimirOuBaixarPdfAta(dados: DadosAtaPdf): void {
  const html = gerarHtmlDocumentoAta(dados)
  const janela = window.open('', '_blank', 'width=920,height=1000')

  if (!janela) {
    alert(
      'O navegador bloqueou a abertura da janela de impressão da Ata. Por favor, permita pop-ups para este site.',
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
