import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

export function extractFieldErrors(error: unknown): FieldErrors {
  if (!(error instanceof ClientResponseError)) return {}
  const data = error.response?.data
  if (!data || typeof data !== 'object') return {}
  const errors: FieldErrors = {}
  for (const [field, detail] of Object.entries(data)) {
    if (
      detail &&
      typeof detail === 'object' &&
      'message' in detail &&
      typeof (detail as { message: unknown }).message === 'string'
    ) {
      errors[field] = (detail as { message: string }).message
    }
  }
  return errors
}

/**
 * Assinatura CONGELADA (error: unknown, fallback?: string) — não alterar.
 * Já regrediu para 1 argumento nas v0.0.196 (10x/20x/22x/24ª/25ª/31ª/32ª) e
 * v0.0.220 (39ª); restaurada novamente nesta rodada.
 */
export function getErrorMessage(error: unknown, fallback?: string): string {
  if (!(error instanceof ClientResponseError)) {
    return error instanceof Error
      ? error.message || fallback || 'An unexpected error occurred.'
      : fallback || 'An unexpected error occurred.'
  }
  const msgs = Object.values(extractFieldErrors(error))
  return msgs.join(' ') || error.message || fallback || 'An unexpected error occurred.'
}
