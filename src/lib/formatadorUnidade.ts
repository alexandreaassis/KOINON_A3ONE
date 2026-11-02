/**
 * Utilitários de formatação e normalização de identificadores e blocos de unidades.
 * Evita duplicações como "Apto 1203 (Apto)" em todas as áreas do sistema Koinon.
 */

export interface UnidadeLike {
  identificador?: string | null
  bloco?: string | null
  tipo_unidade?: string | null
}

/**
 * Normaliza o bloco da unidade.
 * Se o bloco for nulo, vazio, traço, placeholder de torre única ou redundante com o tipo da unidade
 * (ex: bloco "Apto" para unidade tipo "Apto"), retorna string vazia ''.
 */
export function normalizarBloco(bloco?: string | null, tipoUnidade?: string | null): string {
  if (!bloco) return ''
  const b = bloco.trim()
  if (
    !b ||
    b === '—' ||
    b === '-' ||
    b.toLowerCase() === 'torre única' ||
    b.toLowerCase() === 'torre unica' ||
    b.toLowerCase() === 'lago azul'
  ) {
    return ''
  }

  const tipo = (tipoUnidade || '').trim().toLowerCase()
  const bLower = b.toLowerCase()

  // Se o bloco foi preenchido erroneamente com o próprio tipo da unidade
  if (
    bLower === tipo ||
    bLower === 'apto' ||
    bLower === 'apartamento' ||
    bLower === 'sala' ||
    bLower === 'casa' ||
    bLower === 'unidade' ||
    bLower === 'lote'
  ) {
    return ''
  }

  return b
}

/**
 * Verifica se a unidade possui um bloco real (diferente de torre única ou tipo redundante).
 */
export function temBlocoReal(bloco?: string | null, tipoUnidade?: string | null): boolean {
  return normalizarBloco(bloco, tipoUnidade).length > 0
}

/**
 * Formata o identificador da unidade com seu tipo (ex: "Apto 1203").
 * Garante que o tipo não seja prefixado duas vezes se o identificador já contiver o tipo.
 */
export function formatarIdentificadorUnidade(
  identificador?: string | null,
  tipoUnidade?: string | null,
  rotuloPadrao: string = 'Apto',
): string {
  let idLimpo = (identificador || '').trim()
  if (!idLimpo || idLimpo === '—' || idLimpo === '-') return '—'

  // Remover sufixos redundantes como " (Apto)", " (Apartamento)", " (Unidade)" do identificador se vierem gravados
  idLimpo = idLimpo
    .replace(/\s*\(\s*(?:apto|apartamento|sala|casa|lote|unidade|bloco\s*apto)\s*\)$/i, '')
    .trim()

  const tipoEfetivo = (tipoUnidade || rotuloPadrao || 'Apto').trim()
  const idLower = idLimpo.toLowerCase()
  const tipoLower = tipoEfetivo.toLowerCase()

  const prefixosConhecidos = [
    'apto',
    'apartamento',
    'sala',
    'casa',
    'lote',
    'unidade',
    'unid.',
    'unid',
    tipoLower,
  ]

  const jaTemTipo = prefixosConhecidos.some((pref) => {
    if (!pref) return false
    return idLower.startsWith(pref + ' ') || idLower.startsWith(pref + '.') || idLower === pref
  })

  if (jaTemTipo) {
    return idLimpo
  }

  return `${tipoEfetivo} ${idLimpo}`
}

/**
 * Formata a unidade completa com bloco (se houver).
 * Se houver bloco real: "Apto 1203 (Bloco B)"
 * Se não houver bloco (torre única): "Apto 1203"
 */
export function formatarUnidadeComBloco(
  unidade?: UnidadeLike | null,
  rotuloPadrao: string = 'Apto',
  sufixoSemBloco: string = '',
): string {
  if (!unidade) return '—'
  const ident = formatarIdentificadorUnidade(
    unidade.identificador,
    unidade.tipo_unidade,
    rotuloPadrao,
  )
  if (ident === '—') return '—'

  const blocoReal = normalizarBloco(unidade.bloco, unidade.tipo_unidade || rotuloPadrao)
  if (blocoReal) {
    return `${ident} (${blocoReal})`
  }
  return sufixoSemBloco ? `${ident}${sufixoSemBloco}` : ident
}
