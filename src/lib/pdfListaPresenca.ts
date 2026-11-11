import {
  gerarPdfListaPresencaBytes,
  type DadosListaPresencaPdf,
  type LinhaPresencaPdf,
  type SignatarioListaPresenca,
} from '@/lib/pdf/gerarPdfListaPresencaBytes'

export type { DadosListaPresencaPdf, LinhaPresencaPdf, SignatarioListaPresenca }

/**
 * Envelope do gerador de bytes da Lista de Presença (via ZapSign).
 * A via de impressão/manual (window.print) NÃO é afetada.
 */
export const gerarPdfListaPresencaComHash = async (
  dados: DadosListaPresencaPdf,
): Promise<Uint8Array> => {
  return gerarPdfListaPresencaBytes({ ...dados, viaZapsign: true })
}
