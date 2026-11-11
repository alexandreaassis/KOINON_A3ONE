/**
 * PDF da Ata em BYTES no navegador (jsPDF + html2canvas)
 * --------------------------------------------------------------------------
 * Mesmo padrão de gerarPdfEditalComHash (src/lib/pdf/gerarPdfEditalBytes.ts):
 * renderiza o mesmo HTML A4 de gerarHtmlDocumentoAta (src/lib/pdfAta.ts) em um
 * container offscreen, captura com html2canvas, pagina em A4 com jsPDF e
 * devolve os bytes em base64 + hash SHA-256 dos bytes FINAIS do PDF.
 *
 * Usado no envio da ata à ZapSign: sem este anexo (base64_pdf), a ZapSign cai
 * no fallback de markdown_text e renderiza apenas o título do documento.
 */

import { gerarHtmlDocumentoAta, type DadosAtaPdf } from '@/lib/pdfAta'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

export interface ProvaAtaPdf {
  pdfBase64: string
  nomeArquivo: string
  hashSha256: string
  totalPaginas: number
}

const LARGURA_A4_PX = 794 // 210mm @96dpi

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
  const html = gerarHtmlDocumentoAta(dados)

  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.left = '-10000px'
  container.style.top = '0'
  container.style.width = `${LARGURA_A4_PX}px`
  container.style.background = '#ffffff'
  // Extrai o conteúdo do body do documento A4 gerado (evita aninhar <html>/<body>)
  const documento = new DOMParser().parseFromString(html, 'text/html')
  container.innerHTML = documento.body.innerHTML
  document.body.appendChild(container)

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
    })

    if (!canvas.width || !canvas.height) {
      throw new Error('Captura da ata veio vazia (canvas 0px).')
    }

    const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' })
    const larguraPt = pdf.internal.pageSize.getWidth()
    const alturaPt = pdf.internal.pageSize.getHeight()
    const alturaPaginaPx = canvas.width * (alturaPt / larguraPt)

    let pagina = 0
    for (let y = 0; y < canvas.height; y += alturaPaginaPx) {
      const alturaFatia = Math.min(alturaPaginaPx, canvas.height - y)
      const fatia = document.createElement('canvas')
      fatia.width = canvas.width
      fatia.height = Math.ceil(alturaFatia)
      const ctx = fatia.getContext('2d')
      if (!ctx) throw new Error('Falha ao preparar a fatia de página do PDF da ata.')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, fatia.width, fatia.height)
      ctx.drawImage(canvas, 0, y, canvas.width, alturaFatia, 0, 0, canvas.width, alturaFatia)
      if (pagina > 0) pdf.addPage()
      pdf.addImage(
        fatia.toDataURL('image/jpeg', 0.92),
        'JPEG',
        0,
        0,
        larguraPt,
        (alturaFatia * larguraPt) / canvas.width,
      )
      pagina++
    }

    const bytes = pdf.output('arraybuffer')
    const hash = await sha256DeBytes(bytes)
    const base64 = bytesParaBase64(new Uint8Array(bytes))
    const nome = nomeArquivo || `ata-assembleia-${new Date().toISOString().slice(0, 10)}.pdf`

    return { pdfBase64: base64, nomeArquivo: nome, hashSha256: hash, totalPaginas: pagina }
  } finally {
    document.body.removeChild(container)
  }
}
