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
 * v0.0.155 (recorrência do corte): os BLOCOS passam a ser os descendentes
 * FOLHA-texto do documento (o elemento mais profundo que contém texto
 * diretamente, ou caixa fechada com borda/fundo) — wrapper intermediário
 * agrupava parágrafos como um bloco gigante e a quebra caía no meio dele.
 *
 * v0.0.156 (recorrência do corte, 2ª rodada): mesmo com blocos folha, o
 * fatiamento do canvas ainda passava POR DENTRO de linhas. Causa raiz: a
 * quebra caía na BORDA medida do bloco (getBoundingClientRect), mas a PINTURA
 * do html2canvas excede essa borda — descenders de serifadas (g, y, ç), o
 * meio-glyph de itálico e o line-height fracionário (1.5 de 11pt = 22px
 * fracionários por linha) ultrapassam 1px do retângulo; e a linha fracionária
 * ACUMULA erro ao longo de um parágrafo de 10+ linhas (rect arredondado,
 * pintura não). Além disso, a caixa da nota ZapSign (border DASHED de 1px)
 * podia escapar ao detector de caixa fechada e ser aberta, fatiando o hash.
 *
 * Correção definitiva, linha a linha (regra do usuário: NENHUMA linha cortada):
 * 1. A unidade indivisível deixa de ser o parágrafo e passa a ser a LINHA
 *    PINTADA. Para cada bloco folha-texto, coletamos os RETângULOS DE LINHA
 *    (line boxes) com Range.getClientRects() — os mesmos retângulos que a
 *    pintura usa. A quebra da página só pode cair NO INTERVALO ENTRE dois
 *    line boxes consecutivos do documento inteiro (lacuna real de ≥1px entre
 *    o fundo pintado de uma linha e o topo pintado da próxima).
 * 2. O fundo da página é arredondado para BAIXO até o fim do último line box
 *    que couber INTEIRO (fundo redondo para cima da pintura), e o topo da
 *    página seguinte é arredondado para CIMA até o início desse line box —
 *    assim a pintura da linha nunca é cortada nem embaixo nem em cima.
 * 3. Caixa com borda (inclusive DASHED)/fundo/padding continua indivisível:
 *    emitida como bloco atômico com as suas linhas internas como sub-limite —
 *    ela só se divide se for maior que uma página inteira.
 * 4. Sem faixa branca artificial: a página termina no fundo pintado do último
 *    line box que couber (não em altura fixa).
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

/** Tolerância de arredondamento em px de LAYOUT (a pintura usa scale 2). */
const TOL = 0.75
/** Lacuna vertical mínima entre line boxes para ser uma posição de quebra válida. */
const LACUNA_MINIMA_PX = 0.5

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

/** Linha pintada (line box) de um bloco: a unidade que NUNCA pode ser cortada. */
interface LinhaPintada {
  topo: number
  fundo: number
}

/** Bloco de quebra: um parágrafo/caixa/linha do documento com as suas linhas pintadas. */
interface BlocoQuebra {
  topo: number
  fundo: number
  altura: number
  /** Line boxes internos (só usados quando o bloco é maior que uma página). */
  linhas: LinhaPintada[]
  /** Caixa fechada (borda/fundo) NUNCA se divide, salvo maior que a página. */
  atomica: boolean
}

/**
 * Coleta os blocos de quebra do documento e as LINHAS PINTADAS de cada um.
 *
 * Bloco = descendente FOLHA-texto (elemento mais profundo com texto direto,
 * ou caixa fechada por borda/fundo). Para cada bloco, os line boxes reais
 * vêm de Range.getClientRects() sobre o conteúdo do elemento — os MESMOS
 * retângulos que o html2canvas pinta: uma quebra fora deles não fere glifo.
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

  /** Caixa fechada (borda sólida OU DASHED, fundo, ou padding de caixa de nota):
   *  indivisível, não se abre. A nota ZapSign usa border: 1px DASHED —
   *  getComputedStyle reporta a largura da borda mesmo assim. */
  const ehCaixaFechada = (estilo: CSSStyleDeclaration): boolean =>
    parseFloat(estilo.borderTopWidth) > 0 ||
    parseFloat(estilo.borderBottomWidth) > 0 ||
    parseFloat(estilo.borderLeftWidth) > 0 ||
    parseFloat(estilo.borderRightWidth) > 0 ||
    estilo.backgroundColor !== 'rgba(0, 0, 0, 0)'

  /**
   * Line boxes de um elemento via Range.getClientRects() sobre TODO o
   * conteúdo (inclusive descendentes inline): um <p> cuja última linha termina
   * dentro de um <strong>/<span> tem essa linha coberta — medir só os text
   * nodes diretos deixaria a linha do <strong> fora da lista e a quebra
   * cairia dentro dela (exatamente o defeito da v0.0.155 na linha
   * "forma prevista em convenção; (Incluído pela Lei nº 14.309...)").
   * Range.getClientRects() sobre um parágrafo de N linhas devolve os N line
   * boxes pintados, na ordem do documento.
   */
  const coletarLinhas = (el: Element): LinhaPintada[] => {
    const range = document.createRange()
    range.selectNodeContents(el)
    const rects = Array.from(range.getClientRects()).filter((r) => r.height > 0 && r.width > 0)
    if (rects.length === 0) {
      // Fallback: sem texto direto mensurável (ex.: só <img>), usa o rect do elemento.
      const r = (el as HTMLElement).getBoundingClientRect()
      return r.height > 0 ? [{ topo: r.top - topoContainer, fundo: r.bottom - topoContainer }] : []
    }
    // Mescla retângulos que se sobrepõem verticalmente (mesma linha pintada);
    // fundo/topo com folga de pintura (descenders, itálico, line-height
    // fracionário) para a quebra nunca raspar o glifo.
    rects.sort((a, b) => a.top - b.top || a.bottom - b.bottom)
    const linhas: LinhaPintada[] = []
    for (const r of rects) {
      const topo = r.top - topoContainer
      const fundo = r.bottom - topoContainer
      const ultima = linhas[linhas.length - 1]
      if (ultima && topo < ultima.fundo - TOL) {
        ultima.fundo = Math.max(ultima.fundo, fundo)
      } else {
        linhas.push({ topo, fundo })
      }
    }
    return linhas
  }

  const emitir = (el: Element, atomica: boolean): void => {
    const r = (el as HTMLElement).getBoundingClientRect()
    if (r.height <= 0) return
    blocos.push({
      topo: r.top - topoContainer,
      fundo: r.bottom - topoContainer,
      altura: r.height,
      linhas: coletarLinhas(el),
      atomica,
    })
  }

  const abrirElemento = (el: Element): void => {
    if (visitados.has(el)) return
    visitados.add(el)
    // Mídia própria é sempre um bloco (mesmo com display inline padrão).
    if (el.tagName === 'IMG' || el.tagName === 'CANVAS' || el.tagName === 'SVG') {
      emitir(el, true)
      return
    }
    const estilo = getComputedStyle(el)
    if (ehInline(el) || foraDoFluxo(estilo)) return
    // Caixa fechada (borda/fundo): indivisível, não se abre.
    if (ehCaixaFechada(estilo)) {
      emitir(el, true)
      return
    }
    // Sem filho de nível de bloco (texto direto ou só filhos inline): o
    // elemento INTEIRO é um parágrafo/linha indivisível.
    const temFilhoBloco = Array.from(el.children).some((filho) => !ehInline(filho))
    if (!temFilhoBloco || temTextoProprio(el)) {
      emitir(el, false)
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
 * Pagina o canvas por LINHA PINTADA e desenha as páginas no jsPDF.
 * Retorna o pdf pronto e o total de páginas geradas.
 *
 * Regras (correção da v0.0.156 — "nenhuma linha cortada"):
 * - A unidade indivisível é a LINHA PINTADA (line box real de
 *   Range.getClientRects()); a quebra só cai no INTERVALO ENTRE duas linhas
 *   consecutivas — nunca dentro do glifo, mesmo com descenders/itálico/
 *   line-height fracionário.
 * - Um PARÁGRAFO (bloco não atômico) que não couber inteiro vai inteiro para
 *   a página seguinte — a quebra cai no intervalo entre parágrafos (que é
 *   também um intervalo entre linhas), sem espaço gigante: a página termina
 *   no fundo pintado do último parágrafo que couber.
 * - Caixa fechada (borda/fundo — inclusive a nota ZapSign dashed) é ATÔMICA:
 *   vai inteira para a página seguinte quando não couber; só se divide se
 *   for maior que uma página inteira (e aí a divisão interna cai entre
 *   linhas pintadas).
 * - Margens oficiais intocadas: 8,5mm topo / 15mm laterais / 15mm rodapé.
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

  /** Todas as linhas pintadas do documento, em ordem (líder da quebra). */
  const linhasDocumento: Array<LinhaPintada & { bloco: number; atomica: boolean }> = []
  blocos.forEach((b, i) => {
    const fonte = b.linhas.length > 0 ? b.linhas : [{ topo: b.topo, fundo: b.fundo }]
    for (const l of fonte) linhasDocumento.push({ ...l, bloco: i, atomica: b.atomica })
  })

  /** Primeira linha cujo fundo pintado passa de y (ainda não totalmente pintada). */
  const primeiraLinhaApos = (y: number): number => {
    for (let i = 0; i < linhasDocumento.length; i++) {
      if (linhasDocumento[i].fundo > y + TOL) return i
    }
    return linhasDocumento.length
  }

  let pagina = 0
  let yDoc = 0 // posição corrente no documento (px do layout)
  let linhaAtual = 0 // índice em linhasDocumento da 1ª linha ainda não totalmente impressa

  while (yDoc < totalPx - 0.5) {
    const limiteFisico = Math.min(yDoc + alturaUtilPaginaLayoutPx, totalPx)

    // Alinhamento: descarta linhas já totalmente pintadas antes de yDoc.
    while (linhaAtual < linhasDocumento.length && linhasDocumento[linhaAtual].fundo <= yDoc + TOL) {
      linhaAtual++
    }

    // Última linha pintada INTEIRA dentro do limite físico:
    // fundo <= limite - folga (a PINTURA não pode ser cortada).
    let yFim = yDoc
    let corte = linhaAtual
    let i = linhaAtual
    while (i < linhasDocumento.length) {
      const l = linhasDocumento[i]
      if (l.topo >= limiteFisico - TOL) break // linha começa na página seguinte
      if (l.fundo <= limiteFisico + TOL) {
        // A linha coube "no papel", mas exigir fundo <= limite - TOL seria
        // errado quando ela termina exatamente no limite; guardamos o índice
        // e decidimos abaixo com folga de PINTURA.
        if (l.fundo <= limiteFisico - TOL || l.fundo <= limiteFisico + TOL) {
          corte = i + 1
          yFim = Math.max(yFim, l.fundo)
        }
        i++
        continue
      }
      // A linha cruza o limite físico: para aqui.
      break
    }

    // REGRA DE PARÁGRAFO: se a próxima linha após o corte pertence a um
    // parágrafo que já começou nesta página (não atômico), recua o corte até
    // o INÍCIO desse parágrafo — o parágrafo vai inteiro para a página
    // seguinte (a não ser que ele seja maior que uma página inteira, caso em
    // que quebramos entre linhas dele mesmo).
    const primeiraNaoImpressa = corte < linhasDocumento.length ? corte : -1
    if (primeiraNaoImpressa >= 0) {
      const b = blocos[linhasDocumento[primeiraNaoImpressa].bloco]
      const blocoJaComecou = b.topo < yFim - TOL && b.topo >= yDoc - TOL
      const blocoMaiorQuePagina = b.altura > alturaUtilPaginaLayoutPx
      if (blocoJaComecou && !blocoMaiorQuePagina) {
        // Recua até o fundo do ÚLTIMO bloco COMPLETAMENTE impresso antes
        // deste (ou para yDoc se nenhum coube — então o bloco inteiro é
        // maior que o restante da página: divide entre linhas dele).
        let novoFim = yDoc
        let novoCorte = linhaAtual
        for (let j = linhaAtual; j < corte; j++) {
          const bj = blocos[linhasDocumento[j].bloco]
          if (bj.fundo <= yFim + TOL && bj.fundo <= limiteFisico + TOL) {
            novoCorte = j + 1
            novoFim = Math.max(novoFim, bj.fundo)
          }
        }
        if (novoFim > yDoc + TOL || novoCorte > linhaAtual) {
          yFim = novoFim
          corte = novoCorte
        }
        // Se nada restou (parágrafo sozinho já não cabia), divide entre as
        // linhas do próprio parágrafo — yFim/corte já estão no último
        // intervalo entre linhas dentro do limite físico.
      }
    }

    // Fatiamento com folga de PINTURA: o topo da fatia é arredondado para
    // CIMA até o topo pintado da primeira linha da página e o fundo para
    // BAIXO até o fim pintado da última (a fatia contém as linhas INTEIRAS).
    const yTopoFatia =
      linhaAtual < linhasDocumento.length
        ? Math.max(yDoc, Math.min(linhasDocumento[linhaAtual].topo, yFim))
        : yFim

    if (yFim - yTopoFatia < 1 && yFim <= yDoc + TOL) {
      // Nada coube (página em branco): avança pelo limite físico para não
      // travar (só acontece com bloco único maior que a página).
      yFim = limiteFisico
      corte = primeiraLinhaApos(yFim)
    }

    const alturaFatiaCanvas = Math.max(1, Math.ceil((yFim - yTopoFatia) * escala))
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
      yTopoFatia * escala,
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
      Math.min(alturaUtilPt, (yFim - yTopoFatia) * ptPorPxLayout),
    )
    pagina++

    const yAnterior = yDoc
    yDoc = yFim
    if (corte > linhaAtual) linhaAtual = corte
    // Salvaguarda: página sem avanço real não pode travar em loop infinito
    if (yDoc - yAnterior < 1) break
  }

  return { pdf, totalPaginas: pagina }
}
