/**
 * PDF da Ata em BYTES no navegador (jsPDF + html2canvas)
 * --------------------------------------------------------------------------
 * Mesmo padrão de gerarPdfEditalComHash (src/lib/pdf/gerarPdfEditalBytes.ts):
 * renderiza o mesmo HTML A4 de gerarHtmlDocumentoAta (src/lib/pdfAta.ts) em um
 * container offscreen, captura com html2canvas, pagina por BLOCO (título,
 * parágrafo, caixa, seção, linha e bloco de assinatura nunca são cortados
 * entre páginas) e devolve os bytes em base64 + hash SHA-256 dos bytes FINAIS
 * do PDF. A paginação por bloco vive em src/lib/pdf/paginacaoPdf.ts
 * (compartilhada com o edital).
 *
 * Usado no envio da ata à ZapSign: sem este anexo (base64_pdf), a ZapSign cai
 * no fallback de markdown_text e renderiza apenas o título do documento.
 *
 * Este gerador é EXCLUSIVO da via ZapSign: força viaZapsign, que omite o bloco
 * "Certificação e Integridade Criptográfica" e as caixas de publicação/
 * homologação, substituindo-os por nota enxuta com o hash da urna no rodapé
 * (padrão espelhado da via manual em gerarHtmlDocumentoAta).
 *
 * Margens oficiais do documento (idênticas ao @page de gerarHtmlDocumentoAta):
 * 8,5mm no topo, 15mm nas laterais e 15mm no rodapé — aplicadas na paginação
 * (área útil de desenho do jsPDF), valendo para TODAS as páginas.
 */

import { gerarHtmlDocumentoAta, type DadosAtaPdf } from '@/lib/pdfAta'
import { montarContainerCaptura, capturarContainer, paginarCanvasPorBloco } from './paginacaoPdf'

export interface ProvaAtaPdf {
  pdfBase64: string
  nomeArquivo: string
  hashSha256: string
  totalPaginas: number
}

async function sha256DeBytes(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function bytesParaBase64(bytes: Uint8Array): string {
  let binario = ''
  const TAMANHO_BLOCO = 8192
  for (let i = 0; i < bytes.length; i += TAMANHO_BLOCO) {
    binario += String.fromCharCode(...bytes.subarray(i, i + TAMANHO_BLOCO))
  }
  return btoa(binario)
}

export async function gerarPdfAtaComHash(
  dados: DadosAtaPdf,
  nomeArquivo?: string,
): Promise<ProvaAtaPdf> {
  const html = gerarHtmlDocumentoAta({ ...dados, viaZapsign: true })

  const { container } = montarContainerCaptura(html, { lineHeight: 1.6 })

  try {
    const canvas = await capturarContainer(container, 'Captura da ata veio vazia (canvas 0px).')
    const { pdf, totalPaginas } = paginarCanvasPorBloco(canvas, container, {
      mensagemFalhaPagina: 'Falha ao preparar a fatia de página do PDF da ata.',
    })

    const bytes = pdf.output('arraybuffer')
    const hash = await sha256DeBytes(bytes)
    const base64 = bytesParaBase64(new Uint8Array(bytes))
    const nome = nomeArquivo || `ata-assembleia-${new Date().toISOString().slice(0, 10)}.pdf`

    return { pdfBase64: base64, nomeArquivo: nome, hashSha256: hash, totalPaginas }
  } finally {
    document.body.removeChild(container)
  }
}
