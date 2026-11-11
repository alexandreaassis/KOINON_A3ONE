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
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

export interface ProvaAtaPdf {
  pdfBase64: string
  nomeArquivo: string
  hashSha256: string
  totalPaginas: number
}

const MARGEM_TOPO_MM = 8.5
const MARGEM_LATERAL_MM = 15
const MARGEM_RODAPE_MM = 15
const LARGURA_A4_PX = 794 // 210mm @96dpi
const PX_POR_MM = LARGURA_A4_PX / 210
// Largura do container de captura = área útil (210 - 2x15 = 180mm)
const LARGURA_UTIL_A4_PX = Math.round(LARGURA_A4_PX - 2 * MARGEM_LATERAL_MM * PX_POR_MM) // ≈ 680px

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

  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.left = '-10000px'
  container.style.top = '0'
  // Captura APENAS a área útil (180mm): as margens são aplicadas na paginação
  container.style.width = `${LARGURA_UTIL_A4_PX}px`
  container.style.background = '#ffffff'
  // Extrai o conteúdo do body do documento A4 gerado (evita aninhar <html>/<body>)
  // O HTML da ata carrega TODO o visual (cabeçalho flex, grid de assinaturas,
  // crypto-box, tarja de fallback) em um <style> no <head> — sem ele o
  // html2canvas renderiza o documento sem classes e o PDF sai desconfigurado.
  const documento = new DOMParser().parseFromString(html, 'text/html')
  const estilo = documento.querySelector('style')
  if (estilo) {
    container.appendChild(estilo.cloneNode(true))
  }
  // O <style> da ata define `body { font/cores }`; como o container não é um
  // <body>, replica as propriedades base inline para herança funcionar.
  container.style.fontFamily = '"Georgia", "Cambria", "Times New Roman", serif'
  container.style.color = '#002B5E'
  container.style.lineHeight = '1.6'
  container.style.fontSize = '11pt'
  container.innerHTML += documento.body.innerHTML
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

    // Margens em pt (1mm = 72/25.4 pt), iguais ao @page do HTML de impressão
    const mmParaPt = (mm: number) => (mm * 72) / 25.4
    const margemTopoPt = mmParaPt(MARGEM_TOPO_MM)
    const margemLateralPt = mmParaPt(MARGEM_LATERAL_MM)
    const margemRodapePt = mmParaPt(MARGEM_RODAPE_MM)

    const larguraUtilPt = larguraPt - 2 * margemLateralPt // 180mm
    const alturaUtilPt = alturaPt - margemTopoPt - margemRodapePt // 273,5mm
    // Altura em px de conteúdo que cabe na área útil de UMA página
    const alturaUtilPaginaPx = canvas.width * (alturaUtilPt / larguraUtilPt)

    let pagina = 0
    for (let y = 0; y < canvas.height; y += alturaUtilPaginaPx) {
      const alturaFatia = Math.min(alturaUtilPaginaPx, canvas.height - y)
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
        margemLateralPt,
        margemTopoPt,
        larguraUtilPt,
        // Última fatia: altura proporcional, deixando o rodapé em branco (margem)
        Math.min(alturaUtilPt, (alturaFatia * larguraUtilPt) / canvas.width),
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
