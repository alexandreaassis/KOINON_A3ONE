/**
 * Prova de envio: PDF do edital em BYTES no navegador (jsPDF + html2canvas)
 * --------------------------------------------------------------------------
 * Renderiza o mesmo HTML A4 de gerarHtmlDocumentoEdital em um container
 * offscreen, captura com html2canvas, pagina por BLOCO (título, parágrafo,
 * caixa, linha e bloco de assinatura nunca são cortados entre páginas) e
 * calcula o SHA-256 dos bytes FINAIS do PDF (crypto.subtle) — o hash enviado
 * como hashDocumento na prova de envio corresponde exatamente ao arquivo
 * anexado. A paginação por bloco vive em src/lib/pdf/paginacaoPdf.ts
 * (compartilhada com a ata).
 *
 * Não substitui a impressão A4 do navegador (imprimirOuBaixarPdfEdital):
 * esta função existe para o disparo com anexo e registro de prova.
 *
 * Neutro quanto à via (o chamador decide): o envio à ZapSign (DocumentosEdital.tsx,
 * handleEnviarZapsignEdital) passa viaZapsign: true e gerarHtmlDocumentoEdital
 * omite o bloco de certificação criptográfica nativa ("Documento Assinado
 * Eletronicamente", caixas de Signatário Oficial / datas / hash SHA-256),
 * substituindo-o pela nota enxuta de via ZapSign com o hash da urna — sem
 * menção ao art. 10, §2º da MP 2.200-2/2001. O disparo por e-mail usa a via
 * natural (com o bloco nativo quando o edital já está assinado).
 *
 * Margens oficiais do documento (idênticas ao @page de gerarHtmlDocumentoEdital):
 * 8,5mm no topo, 15mm nas laterais e 15mm no rodapé — aplicadas na paginação
 * (área útil de desenho do jsPDF), valendo para TODAS as páginas.
 */

import { gerarHtmlDocumentoEdital, type DadosEditalPdf } from '@/lib/pdfEdital'
import { montarContainerCaptura, capturarContainer, paginarCanvasPorBloco } from './paginacaoPdf'

export interface ProvaEditalPdf {
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

export async function gerarPdfEditalComHash(
  dados: DadosEditalPdf,
  nomeArquivo?: string,
): Promise<ProvaEditalPdf> {
  const html = gerarHtmlDocumentoEdital(dados)

  const { container } = montarContainerCaptura(html, { lineHeight: 1.5 })

  try {
    const canvas = await capturarContainer(container, 'Captura do edital veio vazia (canvas 0px).')
    const { pdf, totalPaginas } = paginarCanvasPorBloco(canvas, container, {
      mensagemFalhaPagina: 'Falha ao preparar a fatia de página do PDF.',
    })

    const bytes = pdf.output('arraybuffer')
    const hash = await sha256DeBytes(bytes)
    const base64 = bytesParaBase64(new Uint8Array(bytes))
    const nome = nomeArquivo || `edital-convocacao-${new Date().toISOString().slice(0, 10)}.pdf`

    return { pdfBase64: base64, nomeArquivo: nome, hashSha256: hash, totalPaginas }
  } finally {
    document.body.removeChild(container)
  }
}
