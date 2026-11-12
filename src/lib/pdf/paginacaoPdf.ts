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
 * v0.0.155 (recorrência do corte): a "área do corpo" do documento não é um
 * único nível de filhos. O edital/ata aninham o texto em wrappers
 * (.document-page > section/div > p), e medir só os filhos diretos do wrapper
 * trata um wrapper com 20 parágrafos como UM bloco gigante — por isso a
 * página 1 terminava no título "Disposições Gerais" com metade da página em
 * branco e a linha fatiada no topo da página 2 (wrapper quebrado pelo limite
 * de altura). Agora os BLOCOS são os descendentes FOLHA-texto do documento
 * (o elemento mais profundo que contém texto diretamente, ou caixa fechada
 * com borda/fundo, que não se abre) — cada um indivisível; a página termina
 * exatamente no fim do último bloco que couber, sem faixa branca e sem fatiar
 * glifo. Um bloco maior que uma página INTEIRA continua sendo dividido (única
 * forma de não perder conteúdo).
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
 * Coleta os blocos de quebra do documento: os descendentes FOLHA-texto
 * (o elemento mais profundo que contém texto diretamente, ou uma caixa
 * fechada por borda/fundo, que não se deve abrir). Cada bloco é indivisível
 * entre páginas — a unidade que NÃO pode ser cortada.
 *
 * Medir também os wrappers intermediários (o comportamento anterior, que só
 * olhava filhos diretos do wrapper do documento) faz um parágrafo ocupar o
 * lugar do bloco que o contém: quebra no meio da linha e vazio gigante.
 */
function coletarBlocosQuebra(
  container: HTMLElement,
  topoContainer: number,
): { blocos: BlocoQuebra[]; totalPx: number } {
  const wrapper = Array.from(container.children).find((el) => el.tagName !== 'STYLE') as
    | HTMLElement
    | undefined
  const raiz = wrapper || container
  const blocos: BlocoQuebra[] = []
  const visitados = new Set<Element>()

  /** O elemento tem texto DIRETAMENTE nele (não em filhos)? */
  const temTextoProprio = (el: Element): boolean => {
    for (const no of Array.from(el.childNodes)) {
      if (no.nodeType === Node.TEXT_NODE && (no.textContent || '').trim().length > 0) return true
    }
    return false
  }

  /** Inline puro (strong/em/span/mark/u/sub/sup): o texto pertence ao bloco
   *  ancestral — nunca vira bloco próprio (evita retângulos sobrepostos de
   *  trechos de linha que enganam a quebra). */
  const ehInline = (el: Element): boolean => {
    const d = getComputedStyle(el).display
    return d === 'inline' || d === 'contents'
  }

  /** Fora do fluxo: não participa da paginação vertical. */
  const foraDoFluxo = (estilo: CSSStyleDeclaration): boolean =>
    estilo.position === 'absolute' || estilo.position === 'fixed' || estilo.float !== 'none'

  /** Caixa fechada (borda/fundo): indivisível, não se abre. */
  const ehCaixaFechada = (estilo: CSSStyleDeclaration): boolean =>
    parseFloat(estilo.borderTopWidth) > 0 ||
    parseFloat(estilo.borderBottomWidth) > 0 ||
    parseFloat(estilo.borderLeftWidth) > 0 ||
    parseFloat(estilo.borderRightWidth) > 0 ||
    estilo.backgroundColor !== 'rgba(0, 0, 0, 0)'

  const emitir = (el: Element): void => {
    const r = (el as HTMLElement).getBoundingClientRect()
    if (r.height > 0) {
      blocos.push({
        topo: r.top - topoContainer,
        fundo: r.bottom - topoContainer,
        altura: r.height,
      })
    }
  }

  const abrirElemento = (el: Element): void => {
    if (visitados.has(el)) return
    visitados.add(el)
    // Mídia própria é sempre um bloco (mesmo com display inline padrão).
    if (el.tagName === 'IMG' || el.tagName === 'CANVAS' || el.tagName === 'SVG') {
      emitir(el)
      return
    }
    const estilo = getComputedStyle(el)
    if (ehInline(el) || foraDoFluxo(estilo)) return
    // Caixa fechada (borda/fundo): indivisível, não se abre.
    if (ehCaixaFechada(estilo)) {
      emitir(el)
      return
    }
    // Sem filho de nível de bloco (texto direto ou só filhos inline): o
    // elemento INTEIRO é um parágrafo/linha indivisível.
    const temFilhoBloco = Array.from(el.children).some((filho) => !ehInline(filho))
    if (!temFilhoBloco || temTextoProprio(el)) {
      emitir(el)
      return
    }
    // Wrapper puro: abre e pagina pelos blocos de texto que contém.
    for (const filho of Array.from(el.children)) {
      abrirElemento(filho)
    }
  }

  abrirElemento(raiz)
  blocos.sort((a, b) => a.topo - b.topo)
  return { blocos, totalPx: container.scrollHeight }
}

/**
 * Pagina o canvas por bloco e desenha as páginas no jsPDF.
 * Retorna o pdf pronto e o total de páginas geradas.
 *
 * Regras (correção da v0.0.155):
 * - Uma quebra só cai num INTERVALO ENTRE blocos (fundo de um, topo do
 *   outro) — nunca no meio da linha de um bloco.
 * - A página termina EXATAMENTE onde termina o último bloco que couber:
 *   nada de faixa branca artificial de "altura fixa de página".
 * - Só se divide um bloco MAIOR que a área útil de UMA página inteira
 *   (única forma de não perder conteúdo) — e nesse caso a divisão também
 *   acontece em limite de bloco interno, se houver.
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
  const alturaUtilPt = alturaPt - margemTopoPt - margemRodapePt // ≈273,5mm de área útil
  // Escala html2canvas (px do canvas por px do layout)
  const escala = canvas.width / container.offsetWidth
  // Altura em px do LAYOUT que cabe na área útil de UMA página
  const alturaUtilPaginaLayoutPx = (canvas.width * (alturaUtilPt / larguraUtilPt)) / escala

  let pagina = 0
  let yDoc = 0 // posição corrente no documento (px do layout)
  let idx = 0 // próximo bloco ainda não posicionado

  while (yDoc < totalPx - 0.5) {
    const limiteFisico = Math.min(yDoc + alturaUtilPaginaLayoutPx, totalPx)
    let yFim = limiteFisico
    let corte = idx // até onde a página "consumiu" blocos

    // Se o yDoc atual está no MEIO de um bloco maior que uma página (só
    // acontece nesse caso), a página vai até o limite físico e a próxima
    // começa no meio do mesmo bloco — inevitável, conteúdo não cabe inteiro.
    const noMeioDeBlocoGigante =
      idx < blocos.length && blocos[idx].topo < yDoc - 0.5 && blocos[idx].fundo > yDoc + 0.5

    if (!noMeioDeBlocoGigante) {
      // ultimoFundo = fim do último bloco que coube inteiro nesta página
      let ultimoFundo = yDoc
      while (idx < blocos.length) {
        const b = blocos[idx]
        if (b.fundo <= yDoc + 0.5) {
          idx++
          continue
        }
        if (b.topo >= limiteFisico - 0.5) break // bloco começa na página seguinte
        if (b.fundo <= limiteFisico + 0.5) {
          idx++
          corte = idx
          ultimoFundo = Math.max(ultimoFundo, b.fundo)
          continue
        }
        // O bloco cruza o limite físico:
        if (b.altura <= alturaUtilPaginaLayoutPx) {
          // Cabe inteiro numa página: vai INTEIRO para a página seguinte.
          // Se NADA coube nesta página (ultimoFundo == yDoc), o bloco é
          // maior que o RESTANTE do documento (ou da página): divide,
          // em vez de emitir página em branco / loop infinito.
          if (ultimoFundo > yDoc + 0.5) {
            yFim = ultimoFundo
          }
          break
        }
        // Maior que uma página inteira: divide no limite físico.
        corte = idx
        break
      }
      idx = corte
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
