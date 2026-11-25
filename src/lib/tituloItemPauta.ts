import type { ApuracaoItemResult } from '@/lib/api'

/**
 * Prefixo "Item N" já digitado pela mesa no título do item de pauta.
 * Aceita variações comuns: "Item 1 -", "ITEM 1:", "item 1.", "Item 01 -" etc.
 */
const PREFIXO_ITEM_RE = /^item\s*\d+\s*(?:[-–—:.])\s*/i

/**
 * Rotula um item de pauta sem duplicar o prefixo.
 * Quando o título já começa com "Item N" (com "-", ":" ou "."), devolve o
 * título como está; caso contrário, antepõe "Item N: ".
 */
export function rotularItemPauta(
  item: Pick<ApuracaoItemResult, 'ordem' | 'titulo'>,
  idx: number,
): string {
  const titulo = (item.titulo || '').trim()
  if (!titulo) return `Item ${item.ordem || idx + 1}`
  if (PREFIXO_ITEM_RE.test(titulo)) return titulo
  return `Item ${item.ordem || idx + 1}: ${titulo}`
}

export type ResultadoItemPauta = 'aprovado' | 'rejeitado' | 'sem_votos'

/**
 * Resultado de um item de pauta na apuração.
 * Regra regimental simples: mais favoráveis que contrários aprova, salvo
 * quórum qualificado. Com total de votos igual a zero, não há resultado:
 * devolve 'sem_votos' (badge neutro "Sem votos registrados").
 */
export function decidirResultadoItemPauta(
  item: Pick<ApuracaoItemResult, 'votos'>,
): ResultadoItemPauta {
  const total = item.votos.total || 0
  if (total === 0) return 'sem_votos'
  const fav = item.votos.favoravel || 0
  const cont = item.votos.contrario || 0
  return fav > cont ? 'aprovado' : 'rejeitado'
}
