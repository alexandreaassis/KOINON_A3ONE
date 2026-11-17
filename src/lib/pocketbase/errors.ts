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
 * ARQUIVO CONGELADO (regra do projeto) — NÃO alterar a assinatura:
 * getErrorMessage(error: unknown, fallback?: string): string
 * Já regrediu 17x à forma de 1 argumento (última: v0.0.165), quebrando o
 * typecheck de src/lib/api.ts e de DocumentosEdital.tsx, que passam fallback.
 */
export function getErrorMessage(error: unknown, fallback?: string): string {
  if (!(error instanceof ClientResponseError)) {
    return error instanceof Error ? error.message : fallback || 'An unexpected error occurred.'
  }
  const msgs = Object.values(extractFieldErrors(error))
  return msgs.length > 0
    ? msgs.join(' ')
    : error.message || fallback || 'An unexpected error occurred.'
}
