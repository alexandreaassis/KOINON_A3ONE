/**
 * Resolução do cabeçalho da Ata de Assembleia (migrations 0044/0045).
 *
 * Semântica congelada (mesma de gerarHtmlDocumentoAta em pdfAta.ts):
 * - string vazia ('') gravada = usuário apagou a linha de propósito => omitir;
 * - campo ausente (undefined/null) em ata antiga = default histórico;
 * - texto gravado = usar exatamente o que a Mesa configurou em /mesa/ata.
 *
 * Usado por: via do morador (AtaMorador) e pré-visualização da Mesa
 * (AtaAssembleia), para que todas as vias reflitam a MESMA configuração.
 */

export interface CabecalhoAtaFonte {
  // Etiqueta (tag) do cabeçalho, acima do nome do condomínio
  cabecalho_tag?: string
  // Nome do condomínio no cabeçalho ('' = omitir a linha)
  cabecalho_condominio?: string
  // Subtítulo do cabeçalho, abaixo do nome ('' = omitir a linha)
  cabecalho_subtitulo?: string
}

/** Linha a exibir: string = texto; '' = omitir a linha. */
export type LinhaCabecalhoAta = string

export function resolverTagCabecalhoAta(fonte: CabecalhoAtaFonte): LinhaCabecalhoAta {
  const v = fonte.cabecalho_tag
  if (v === '') return ''
  return v?.trim() || 'Ata de Assembleia e Deliberativa'
}

export function resolverNomeCabecalhoAta(
  fonte: CabecalhoAtaFonte,
  nomeCondominioDefault: string,
): LinhaCabecalhoAta {
  const v = fonte.cabecalho_condominio
  if (v === '') return ''
  return v?.trim() || nomeCondominioDefault
}

export function resolverSubtituloCabecalhoAta(fonte: CabecalhoAtaFonte): LinhaCabecalhoAta {
  const v = fonte.cabecalho_subtitulo
  if (v === '') return ''
  return v?.trim() || 'Assembleia Geral de Condôminos'
}

/** Subtítulo do doc-headline (linha abaixo do título da ata, migration 0045). */
export function resolverSubtituloDocumentoAta(fonte: { subtitulo?: string }): LinhaCabecalhoAta {
  const v = fonte.subtitulo
  if (v === '') return ''
  return v?.trim() || 'Assembleia Geral de Condôminos • Convocação Editalícia'
}
