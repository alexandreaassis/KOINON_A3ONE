/**
 * Paginação por bloco compartilhada dos PDFs em BYTES (edital e ata)
 * --------------------------------------------------------------------------
 * Correção do corte de texto entre páginas (relato do usuário, edital):
 * o mecanismo anterior fatiava o canvas em passos FIXOS de uma página e um
 * parágrafo/título/linha que caía no limite era cortado ao meio. A paginação
 * agora respeita blocos: mede cada elemento filho do corpo do documento
 * (título, parágrafo, caixa, seção, linha, bloco de assinatura) ANTES de
 * fechar a página; um bloco que não couber inteiro vai para a página
 * seguinte. Só se divide um bloco MAIOR que uma página inteira (única forma
 * de não perder conteúdo).
 *
 * Margens oficiais Koinon (v0.0.142) — NÃO alterar:
 * 8,5mm topo / 15mm laterais / 15mm rodapé; área útil de 180mm.
 */

import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

export const MARGEM_TOPO_MM = 8.5
export const MARGEM_LATERAL_MM = 15
export const MARGEM_RODAPE_MM = 15
const LARGURA_A4_PX = 794 // 210mm @96dpi
const PX_POR_MM = LARGURA_A4_PX / 210
// Largura do container de captura = área útil (210 - 2x15 = 180mm)
export const LARGURA_UTIL_A4_PX = Math.round(LARGURA_A4_PX - 2 * MARGEM_LATERAL_MM * PX_POR_MM) // ≈ 680px

/** Converte um HTML de documento completo (com <style> e <body>) em container offscreen capturável. */
export function montarContainerCaptura(
  html: string,
  opts: { lineHeight: number },
): { container: HTMLDivElement; documento: Document } {
  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.left = '-10000px'
  container.style.top = '0'
  // Captura APENAS a área útil (180mm): as margens são aplicadas na paginação
  container.style.width = `${LARGURA_UTIL_A4_PX}px`
  container.style.background = '#ffffff'
  // Extrai o conteúdo do body do documento A4 gerado (evita aninhar <html>/<body>).
  // O HTML carrega TODO o visual (header flex, doc-headline, tabelas, caixas de
  // destaque) em um <style> no <head> — sem ele o html2canvas renderiza o
  // documento sem classes e o PDF chega desconfigurado (defeito corrigido em
  // v0.0.141 e v0.0.144).
  const documento = new DOMParser().parseFromString(html, 'text/html')
  const estilo = documento.querySelector('style')
  if (estilo) {
    container.appendChild(estilo.cloneNode(true))
  }
  // O <style> define `body { font/cores }`; como o container não é um <body>,
  // replica as propriedades base inline para herança funcionar.
  container.style.fontFamily = '"Georgia", "Cambria", "Times New Roman", serif'
  container.style.color = '#002B5E'
  container.style.lineHeight = String(opts.lineHeight)
  container.style.fontSize = '11pt'
  container.innerHTML += documento.body.innerHTML
  document.body.appendChild(container)
  return { container, documento }
}

/** Renderiza o container em canvas em alta resolução (scale 2). */
export async function capturarContainer(
  container: HTMLElement,
  mensagemCapturaVazia: string,
): Promise<HTMLCanvasElement> {
  const canvas = await html2canvas(container, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
  })
  if (!canvas.width || !canvas.height) {
    throw new Error(mensagemCapturaVazia)
  }
  return canvas
}

/** Bloco de quebra com posição medida no layout (px do layout, relativos ao container). */
interface BlocoQuebra {
  topo: number
  fundo: number
  altura: number
}

/**
 * Blocos de quebra: os elementos filhos diretos do wrapper do documento
 * (.document-page). Cada um é um título, parágrafo, caixa, seção, linha de
 * reunião, bloco de assinatura etc. — a unidade que NÃO deve ser cortada.
 */
function coletarBlocosQuebra(
  container: HTMLElement,
  topoContainer: number,
): { blocos: BlocoQuebra[]; totalPx: number } {
  const wrapper = Array.from(container.children).find((el) => el.tagName !== 'STYLE') as
    | HTMLElement
    | undefined
  const raiz = wrapper || container
  const blocos: BlocoQuebra[] = Array.from(raiz.children).map((el) => {
    const r = (el as HTMLElement).getBoundingClientRect()
    return { topo: r.top - topoContainer, fundo: r.bottom - topoContainer, altura: r.height }
  })
  return { blocos, totalPx: container.scrollHeight }
}

/**
 * Pagina o canvas por bloco e desenha as páginas no jsPDF.
 * Retorna o pdf pronto e o total de páginas geradas.
 */
export function paginarCanvasPorBloco(
  canvas: HTMLCanvasElement,
  container: HTMLElement,
  opcoes: { mensagemFalhaPagina: string },
): { pdf: jsPDF; totalPaginas: number } {
  const { blocos, totalPx } = coletarBlocosQuebra(container, container.getBoundingClientRect().top)

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
  // Escala html2canvas (px do canvas por px do layout)
  const escala = canvas.width / container.offsetWidth
  // Altura em px do LAYOUT que cabe na área útil de UMA página
  const alturaUtilPaginaLayoutPx = (canvas.width * (alturaUtilPt / larguraUtilPt)) / escala

  let pagina = 0
  let yDoc = 0 // posição corrente no documento (px do layout)
  let idx = 0 // próximo bloco ainda não posicionado

  while (yDoc < totalPx - 0.5) {
    let yFim = Math.min(yDoc + alturaUtilPaginaLayoutPx, totalPx)
    const noMeioDeBlocoDividido =
      idx < blocos.length && blocos[idx].topo < yDoc - 0.5 && blocos[idx].fundo > yDoc + 0.5

    if (!noMeioDeBlocoDividido) {
      let ultimoFundo = yDoc
      let empurrouBloco = false
      while (idx < blocos.length) {
        const b = blocos[idx]
        if (b.fundo <= yDoc + 0.5) {
          idx++
          continue
        }
        if (b.topo >= yFim - 0.5) break // bloco começa depois da página
        if (b.fundo <= yFim + 0.5) {
          idx++
          ultimoFundo = Math.max(ultimoFundo, b.fundo)
          continue
        }
        // O bloco cruza o fim da página:
        if (b.altura <= alturaUtilPaginaLayoutPx) {
          // Cabe inteiro numa página: vai INTEIRO para a página seguinte.
          // Se NADA coube na página (página vazia), o bloco é maior que o
          // restante do documento: divide em vez de emitir página em branco.
          yFim = ultimoFundo > yDoc + 0.5 ? ultimoFundo : yDoc
          empurrouBloco = ultimoFundo > yDoc + 0.5
          break
        }
        // Maior que uma página inteira: dividir (não há como não perder)
        break
      }
      // (empurrouBloco já definiu yFim = fundo do último bloco que coube:
      // a página termina onde termina o conteúdo, sem faixa branca)
    }

    // Recorta a fatia [yDoc, yFim) do canvas e desenha a página
    const alturaFatiaCanvas = Math.max(1, Math.ceil((yFim - yDoc) * escala))
    const fatia = document.createElement('canvas')
    fatia.width = canvas.width
    fatia.height = alturaFatiaCanvas
    const ctx = fatia.getContext('2d')
    if (!ctx) throw new Error(opcoes.mensagemFalhaPagina)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, fatia.width, fatia.height)
    ctx.drawImage(
      canvas,
      0,
      yDoc * escala,
      canvas.width,
      alturaFatiaCanvas,
      0,
      0,
      canvas.width,
      alturaFatiaCanvas,
    )
    if (pagina > 0) pdf.addPage()
    const ptPorPxLayout = larguraUtilPt / container.offsetWidth
    pdf.addImage(
      fatia.toDataURL('image/jpeg', 0.92),
      'JPEG',
      margemLateralPt,
      margemTopoPt,
      larguraUtilPt,
      Math.min(alturaUtilPt, (yFim - yDoc) * ptPorPxLayout),
    )
    pagina++

    const yAnterior = yDoc
    yDoc = yFim
    // Salvaguarda: página sem avanço real não pode travar em loop infinito
    if (yDoc - yAnterior < 1) break
  }

  return { pdf, totalPaginas: pagina }
}
