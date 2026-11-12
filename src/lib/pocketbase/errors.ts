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

/** Mensagem amigável de erro. Aceita fallback opcional — a assinatura
 *  (error: unknown, fallback?: string) já regrediu 15x no histórico e é
 *  exigida pelo typecheck (src/lib/api.ts e páginas chamam com 2 args). */
export function getErrorMessage(error: unknown, fallback?: string): string {
  if (!(error instanceof ClientResponseError)) {
    if (error instanceof Error) return error.message
    return fallback ?? 'An unexpected error occurred.'
  }
  const msgs = Object.values(extractFieldErrors(error))
  if (msgs.length > 0) return msgs.join(' ')
  if (error.message) return error.message
  return fallback ?? 'An unexpected error occurred.'
}
