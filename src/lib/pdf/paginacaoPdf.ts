/**
 * Paginação por bloco compartilhada dos PDFs em BYTES (edital e ata)
 * --------------------------------------------------------------------------
 * Correção do corte de texto entre páginas (relato do usuário, edital):
 * o mecanismo anterior fatiava o canvas em passos FIXOS de uma página e um
 * parágrafo/título/linha que caía no limite era cortado ao meio. A paginação
 * agora respeita blocos: mede cada elemento do corpo do documento (título,
 * parágrafo, caixa, seção, linha, bloco de assinatura) ANTES de fechar a
 * página; um bloco que não couber inteiro vai para a página seguinte. Só se
 * divide um bloco MAIOR que uma página inteira (única forma de não perder
 * conteúdo).
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
 * v0.0.157 (recorrência do corte, 3ª rodada — execução integral da regra do
 * usuário "NENHUMA linha cortada"): a v0.0.156 ficou incompleta (1 de 4
 * passos). O que faltava, agora implementado:
 * 1. Quebra NUNCA intercepta a altura pintada de uma linha: cada line box é
 *    convertido para px INTEIROS DO CANVAS (escala 2) com arredondamento para
 *    FORA (topo ⌈, fundo ⌊ em coordenadas de pintura) e a página só fecha num
 *    INTERVALO CANVAS-INTEIRO entre dois line boxes consecutivos do documento
 *    inteiro — a fatia de canvas nunca passa pelo meio de um glifo, nem
 *    acumula erro fracionário ao longo de um parágrafo longo.
 * 2. A caixa da nota ZapSign é um bloco ATÔMICO: ou cabe inteira na página ou
 *    vai inteira para a seguinte, NUNCA dividida — borda DASHED não escapa ao
 *    detector (largura de borda reportada por getComputedStyle) e o detector
 *    ganhou o fallback por classe/estilo inline de caixa de nota.
 * 3. Os blocos de ASSINATURA (área do edital, cartões nome/CPF/imagem da ata)
 *    são ATÔMICOS: nunca divididos entre páginas — detectados por classe CSS
 *    (.signature-area, .signature-card) e reforçados pela caixa com borda
 *    (border-top de 2px da área, borda dos cartões).
 * 4. Sem faixa branca artificial: a página termina no fundo pintado do último
 *    line box que couber (não em altura fixa).
 *
 * v0.0.159 (recorrência do corte, 4ª rodada — CAUSA RAIZ encontrada nos PDFs
 * reais do usuário): a regra "entre linhas" existia, mas NÃO valia no render
 * final por dois desvios do algoritmo:
 * 1. Empurrão de parágrafo inteiro + salvaguarda que corta no MEIO do glifo:
 *    quando a regra de bloco recuava o corte e o recuo deixava a página vazia
 *    (só havia o parágrafo que estourava), a salvaguarda usava
 *    `yFim = limiteFisico` — a fatia caía no LIMITE FÍSICO BRUTO, dentro de um
 *    glifo (a última linha serrilhada do pé da página 1). E o empurrão do
 *    parágrafo inteiro deixava o GRANDE VAZIO no fim de página (depois de
 *    "PROCURAÇÕES"), empurrando o texto seguinte.
 *    Correção: PARÁGRAFO (bloco não atômico) agora CONTINUA na página
 *    seguinte, quebrando sempre no INTERVALO ENTRE duas linhas pintadas — a
 *    página fica preenchida até a última linha inteira e a salvaguarda nunca
 *    precisa cortar dentro de glifo (só um bloco MAIOR que a página se divide,
 *    e mesmo assim entre as linhas dele).
 *
 * v0.0.163 (recorrência dos 2 sintomas do edital — letra serrilhada no pé da
 * página 1 e grande vazio após "PROCURAÇÕES"): os sintomas persistem porque o
 * CAMINHO DE CAPTURA (html2canvas + paginarCanvasPorBloco, usado pela ZapSign
 * e pelo anexo de e-mail) desviava do algoritmo descrito — a regra de v0.0.159
 * (parágrafo continua) NÃO estava aplicada; o recuo empurrava o PARÁGRAFO
 * INTEIRO para a página seguinte (o grande vazio após o título) e a fatia da
 * página seguinte podia começar DENTRO da última linha pintada da página
 * anterior, sobrepondo um glifo com glifo deslocado (a letra serrilhada).
 * Correções, nesta versão:
 * 1. O recuo até o início do bloco só vale para bloco ATÔMICO (caixa da nota
 *    ZapSign, blocos de assinatura, caixas com borda/fundo): nunca divide entre
 *    páginas. Um PARÁGRAFO comum FLUI linha a linha entre páginas.
 * 2. A fatia de cada página começa no FUNDO PINTADO da última linha da página
 *    anterior — nunca dentro de um line box — garantindo que o texto da nova
 *    página continue sem sobreposição nem corte no pé.
 * 3. Confirmação da suspeita do caminho: o "Baixar PDF" do edital NÃO passa
 *    por aqui (usa o motor de impressão nativo do navegador, sem paginação em
 *    canvas); os PDFs da ZapSign e do anexo de e-mail passam. A correção é
 *    sempre nesta geração, nunca na ZapSign (memória do projeto).
 * 2. Sem reserva de segurança entre MEDIÇÃO e PINTURA: a quebra caía exatamente
 *    no fundo medido da linha, mas a pintura do html2canvas pode descer 1–2px
 *    além do retângulo medido (descenders/line-height fracionário/diferença de
 *    rasterização). Agora o fechamento exige `fundo <= limite - RESERVA` (em px
 *    de pintura), absorvendo a deriva sem fatiar o glifo.
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

/** Reserva de PINTURA (px de layout) além do retângulo medido: descenders/itálico do html2canvas. */
const RESERVA_PINTURA_LAYOUT_PX = 2

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

/** Linha pintada (line box) de um bloco: a unidade que NUNCA pode ser cortada.
 *  topo/fundo em px INTEIROS da PINTURA (canvas scale 2). */
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
  /** Caixa fechada (nota ZapSign, bloco de assinatura) NUNCA se divide, salvo maior que a página. */
  atomica: boolean
}

/**
 * Coleta os blocos de quebra do documento e as LINHAS PINTADAS de cada um.
 *
 * Bloco = descendente FOLHA-texto (elemento mais profundo com texto direto,
 * ou caixa fechada por borda/fundo — inclusive a nota ZapSign com borda
 * DASHED e os blocos de assinatura, ambos ATÔMICOS). Para cada bloco, os
 * line boxes reais vêm de Range.getClientRects() sobre o conteúdo do
 * elemento — os MESMOS retângulos que o html2canvas pinta: uma quebra fora
 * deles não fere glifo.
 */
function coletarBlocosQuebra(
  container: HTMLElement,
  topoContainer: number,
  escala: number,
): { blocos: BlocoQuebra[] } {
  // TODAS as raízes de topo (irmãos não-STYLE): antes só o primeiro era visitado,
  // e o conteúdo dos irmãos seguintes ficava fora da lista de quebras.
  const raizes = Array.from(container.children).filter((el) => el.tagName !== 'STYLE')
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

  /**
   * Caixa fechada (borda sólida OU DASHED, fundo, ou padding de caixa de nota):
   * indivisível, não se abre. A nota ZapSign usa border: 1px DASHED —
   * getComputedStyle reporta a largura da borda mesmo assim. O seletor de
   * CLASSE cobre o caso improvável de borda resolvida como 0 nos
   * pseudo-elementos de caixa de nota.
   */
  const ehCaixaFechada = (el: Element, estilo: CSSStyleDeclaration): boolean =>
    parseFloat(estilo.borderTopWidth) > 0 ||
    parseFloat(estilo.borderBottomWidth) > 0 ||
    parseFloat(estilo.borderLeftWidth) > 0 ||
    parseFloat(estilo.borderRightWidth) > 0 ||
    estilo.backgroundColor !== 'rgba(0, 0, 0, 0)' ||
    /(^|\s)(box-condicoes|doc-headline|signature-area|signature-card|footer-note|seal-a3one)(\s|$)/.test(
      el.className || '',
    )

  /**
   * Converte um rect de LAYOUT (px fracionários do navegador) para o domínio
   * da PINTURA (px inteiros do canvas, escala 2), ARREDONDANDO PARA FORA:
   * topo ⌈, fundo ⌊ — o intervalo [topo, fundo] cobre toda a pintura da
   * linha, inclusive descenders/itálico/line-height fracionário. Uma quebra
   * fora desse intervalo (em px inteiros do canvas) NUNCA corta o glifo.
   */
  const paraPintura = (topoLayout: number, fundoLayout: number): LinhaPintada => ({
    topo: Math.ceil(topoLayout * escala),
    fundo: Math.floor(fundoLayout * escala),
  })

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
      return r.height > 0 ? [paraPintura(r.top - topoContainer, r.bottom - topoContainer)] : []
    }
    // Mescla retângulos que se sobrepõem verticalmente (mesma linha pintada),
    // em coordenadas de PINTURA (px inteiros do canvas).
    rects.sort((a, b) => a.top - b.top || a.bottom - b.bottom)
    const linhas: LinhaPintada[] = []
    for (const r of rects) {
      const { topo, fundo } = paraPintura(r.top - topoContainer, r.bottom - topoContainer)
      if (fundo <= topo) continue // nada pintado neste px inteiro
      const ultima = linhas[linhas.length - 1]
      if (ultima && topo < ultima.fundo) {
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
    const { topo, fundo } = paraPintura(r.top - topoContainer, r.bottom - topoContainer)
    blocos.push({
      topo,
      fundo,
      altura: (fundo - topo) / escala,
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
    // Caixa fechada (borda/fundo) — inclusive nota ZapSign (dashed) e blocos
    // de assinatura: ATÔMICA, não se abre.
    if (ehCaixaFechada(el, estilo)) {
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

  for (const raiz of raizes) abrirElemento(raiz)
  blocos.sort((a, b) => a.topo - b.topo)
  return { blocos }
}

/**
 * Pagina o canvas por LINHA PINTADA e desenha as páginas no jsPDF.
 * Retorna o pdf pronto e o total de páginas geradas.
 *
 * Regras (v0.0.157 — "nenhuma linha cortada", execução integral):
 * - A unidade indivisível é a LINHA PINTADA em px inteiros do canvas; a quebra
 *   só cai no INTERVALO ENTRE duas linhas consecutivas do documento inteiro —
 *   nunca dentro do glifo, mesmo com descenders/itálico/line-height
 *   fracionário, e sem acumular erro fracionário num parágrafo longo.
 * - Um PARÁGRAFO (bloco não atômico) que não couber inteiro vai inteiro para
 *   a página seguinte — a quebra cai no intervalo entre parágrafos, sem
 *   espaço gigante: a página termina no fundo pintado do último parágrafo
 *   que couber.
 * - Caixa fechada (nota ZapSign, doc-headline, box-condições) e BLOCOS DE
 *   ASSINATURA são ATÔMICOS: vão inteiros para a página seguinte quando não
 *   couberem; só se dividem se forem maiores que uma página inteira (e aí a
 *   divisão interna cai entre linhas pintadas).
 * - Margens oficiais intocadas: 8,5mm topo / 15mm laterais / 15mm rodapé.
 */
export function paginarCanvasPorBloco(
  canvas: HTMLCanvasElement,
  container: HTMLElement,
  opcoes: { mensagemFalhaPagina: string },
): { pdf: jsPDF; totalPaginas: number } {
  const escala = canvas.width / container.offsetWidth
  const { blocos } = coletarBlocosQuebra(container, container.getBoundingClientRect().top, escala)
  const totalPx = Math.min(canvas.height, Math.ceil(container.scrollHeight * escala))

  const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' })
  const larguraPt = pdf.internal.pageSize.getWidth()
  const alturaPt = pdf.internal.pageSize.getHeight()

  // Margens em pt (1mm = 72/25.4 pt), iguais ao @page do HTML de impressão
  const mmParaPt = (mm: number) => (mm * 72) / 25.4
  const margemTopoPt = mmParaPt(MARGEM_TOPO_MM)
  const margemLateralPt = mmParaPt(MARGEM_LATERAL_MM)
  const margemRodapePt = mmParaPt(MARGEM_RODAPE_MM)

  const larguraUtilPt = larguraPt - 2 * margemLateralPt // 180mm
  const alturaUtilPt = alturaPt - margemTopoPt - margemRodapePt
  // Altura em px da PINTURA que cabe na área útil de UMA página (inteira)
  const alturaUtilPaginaPinturaPx = Math.floor(canvas.width * (alturaUtilPt / larguraUtilPt))
  // Reserva real de pintura em px do canvas (escala): a página só fecha se
  // `fundo <= limite - reservaPx`, absorvendo a descida da pintura do html2canvas.
  const reservaPx = Math.ceil(RESERVA_PINTURA_LAYOUT_PX * escala)

  /** Todas as linhas pintadas do documento, em ordem (líder da quebra). */
  const linhasDocumento: Array<LinhaPintada & { bloco: number }> = []
  blocos.forEach((b, i) => {
    const fonte = b.linhas.length > 0 ? b.linhas : [{ topo: b.topo, fundo: b.fundo }]
    for (const l of fonte) linhasDocumento.push({ ...l, bloco: i })
  })

  let pagina = 0
  let yDoc = 0 // posição corrente no documento (px da PINTURA, inteiros)
  let linhaAtual = 0 // índice em linhasDocumento da 1ª linha ainda não totalmente impressa

  while (yDoc < totalPx) {
    const limiteFisico = Math.min(yDoc + alturaUtilPaginaPinturaPx, totalPx)
    const limiteSeguro = limiteFisico - reservaPx

    // Alinhamento: descarta linhas já totalmente pintadas antes de yDoc.
    while (linhaAtual < linhasDocumento.length && linhasDocumento[linhaAtual].fundo <= yDoc) {
      linhaAtual++
    }
    // Sem linhas restantes: o que sobra é só espaço vazio — não gera página em branco.
    if (linhaAtual >= linhasDocumento.length) break

    // Última linha pintada INTEIRA dentro do limite físico (fundo <= limite).
    let yFim = yDoc
    let corte = linhaAtual
    let i = linhaAtual
    while (i < linhasDocumento.length) {
      const l = linhasDocumento[i]
      if (l.topo >= limiteFisico) break // linha começa na página seguinte
      if (l.fundo <= limiteSeguro) {
        corte = i + 1
        yFim = Math.max(yFim, l.fundo)
        i++
        continue
      }
      break // a linha cruza o limite físico
    }

    // REGRA DE BLOCO ATÔMICO (v0.0.163): só o bloco ATÔMICO recua o corte até o
    // seu INÍCIO (nunca se divide entre páginas). O PARÁGRAFO comum NÃO recua:
    // flui linha a linha — a página fica preenchida até a última linha inteira
    // e o texto continua no topo da página seguinte, sem grande vazio no pé
    // (sintoma "espaço em branco após PROCURAÇÕES") nem corte de glifo
    // (sintoma "letra serrilhada no pé da página 1").
    const primeiraNaoImpressa = corte < linhasDocumento.length ? corte : -1
    if (primeiraNaoImpressa >= 0) {
      const b = blocos[linhasDocumento[primeiraNaoImpressa].bloco]
      const blocoJaComecou = b.topo < yFim && b.topo >= yDoc
      const blocoMaiorQuePagina = b.altura * escala > alturaUtilPaginaPinturaPx
      if (b.atomica && blocoJaComecou && !blocoMaiorQuePagina) {
        // Recua até o fundo do ÚLTIMO bloco COMPLETAMENTE impresso antes
        // deste (ou para yDoc se nenhum coube — então divide entre as linhas
        // do próprio bloco, que é maior que o restante da página).
        let novoFim = yDoc
        let novoCorte = linhaAtual
        for (let j = linhaAtual; j < corte; j++) {
          const bj = blocos[linhasDocumento[j].bloco]
          if (bj.fundo <= yFim && bj.fundo <= limiteSeguro) {
            novoCorte = j + 1
            novoFim = Math.max(novoFim, bj.fundo)
          }
        }
        if (novoFim > yDoc || novoCorte > linhaAtual) {
          yFim = novoFim
          corte = novoCorte
        }
        // Se nada restou (bloco sozinho já não cabia no restante), divide
        // entre as linhas do próprio bloco — yFim/corte já estão no último
        // intervalo entre linhas dentro do limite físico.
      }
    }

    // Fatiamento (v0.0.163 — fatia SEM sobreposição de linha): a fatia começa
    // no FUNDO PINTADO da ÚLTIMA linha impressa na página ANTERIOR (nunca dentro
    // de um line box, garantindo continuidade sem sobrepor glifo com glifo) e
    // termina no FUNDO PINTADO da última linha que coube — em px inteiros do
    // canvas. Sem faixa branca artificial, sem glifo sobre glifo.
    let yTopoFatia = yDoc
    if (linhaAtual > 0 && yDoc <= 0) {
      // Primeira página: começa no TOPO PINTADO da primeira linha (sem faixa
      // branca artificial acima do cabeçalho).
      yTopoFatia = linhasDocumento[linhaAtual].topo
    }

    if (yFim - yTopoFatia < 1) {
      // Nada coube (só com bloco único maior que a página): avança pelo
      // limite físico para não travar.
      yFim = limiteFisico
      yTopoFatia = yDoc
      corte = linhaAtual
      while (corte < linhasDocumento.length && linhasDocumento[corte].fundo <= yFim) corte++
    }

    // RESERVA DE PINTURA na fatia (v0.0.163, com teto rígido): estende `reservaPx`
    // além do fundo medido da última linha (descenders), mas a fatia NUNCA inva-
    // de a linha seguinte: teto = topo da próxima linha NÃO impressa. A reserva
    // só se aplica quando a próxima linha começa depois da reserva (gap real);
    // quando ela começa antes, o teto é o próprio yFim + 1px (fim da fatia no
    // intervalo entre line boxes — nada da linha seguinte entra nesta página).
    const proximaNaoImpressa =
      corte < linhasDocumento.length ? linhasDocumento[corte].topo : totalPx
    const yBaseFatia = Math.min(
      Math.max(yFim + 1, Math.min(yFim + reservaPx, proximaNaoImpressa)),
      totalPx,
    )
    yTopoFatia = Math.max(yDoc, yTopoFatia - reservaPx)
    const alturaFatiaCanvas = Math.max(1, yBaseFatia - yTopoFatia)
    // A fatia vai de yTopoFatia a yFim, ambos em px inteiros da PINTURA; yFim
    // cai num intervalo entre line boxes (nunca dentro de uma linha pintada).
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
      yTopoFatia,
      canvas.width,
      alturaFatiaCanvas,
      0,
      0,
      canvas.width,
      alturaFatiaCanvas,
    )
    if (pagina > 0) pdf.addPage()
    const ptPorPxLayout = larguraUtilPt / container.offsetWidth / escala
    // v0.0.164 — a fatia vai ao jsPDF como PNG (sem perda): a compressão JPEG
    // (0.92) granulava as serifadas do documento (letras serrilhadas no pé das
    // páginas). O formato do fatiamento/paginação fica intocado (v0.0.163).
    // v0.0.166 — COMPRESSÃO FLATE ('SLOW') dos dados da imagem dentro do PDF:
    // sem ela o PNG entra como RGBA bruto no XObject e o PDF gerado multiplica
    // de tamanho em bytes — o POST base64 para /enviar-zapsign não chega ao
    // servidor (HTTP 0). O Flate é SEM PERDA: pixels idênticos, zero serrilhado.
    pdf.addImage(
      fatia.toDataURL('image/png'),
      'PNG',
      margemLateralPt,
      margemTopoPt,
      larguraUtilPt,
      Math.min(alturaUtilPt, alturaFatiaCanvas * ptPorPxLayout),
      '',
      'SLOW',
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
