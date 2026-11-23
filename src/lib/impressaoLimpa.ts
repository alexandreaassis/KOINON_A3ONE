/**
 * Protocolo "Impressão limpa (sem assinatura eletrônica)" — v0.0.167
 *
 * Gera a via para assinatura manual com caneta: abre a janela de impressão
 * nativa do navegador (window.print) com o HTML do documento já SEM qualquer
 * menção a assinatura eletrônica (sem ICP-Brasil/MP 2.200-2, sem nota de hash,
 * sem blocos ZapSign) e com linhas em branco para assinatura a caneta.
 *
 * IMPORTANTE: este módulo NUNCA usa html2canvas/paginacaoPdf — essas camadas
 * só alimentam as vias gerarPdf*Bytes (anexo ZapSign), que ficam de fora do
 * modo limpo. A paginação aqui é a nativa do navegador via CSS @page, com as
 * margens oficiais Koinon: 8,5mm topo / 15mm laterais / 15mm rodapé
 * (área útil de captura 180mm).
 */

export type TipoGeracaoPdf = 'padrao' | 'impressao_limpa'

export const ROTULO_IMPRESSAO_LIMPA = 'Impressão limpa (sem assinatura eletrônica)'

/**
 * Abre a janela de impressão nativa com o HTML do documento (já gerado no
 * modo limpo) e dispara window.print() após aguardar imagens/fontes.
 */
export function imprimirHtmlDocumentoLimpo(html: string, nomeDocumento = 'Documento'): void {
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

  janela.focus()
  setTimeout(() => {
    janela.print()
  }, 400)

  // nomeDocumento mantido para futura personalização do título da janela
  void nomeDocumento
}
