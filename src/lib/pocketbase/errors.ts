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
 * ASSINATURA CONGELADA — NÃO REGREDIR PARA 1 ARGUMENTO (regressões 10x, 20x, 22x,
 * 24ª, 25ª, 31ª, 32ª e 38ª). Chamadores em todo o projeto usam
 * getErrorMessage(error, 'fallback opcional'); o fallback é devolvido quando o
 * erro não traz mensagem nem field-error utilizável.
 */
export function getErrorMessage(error: unknown, fallback?: string): string {
  if (!(error instanceof ClientResponseError)) {
    if (error instanceof Error && error.message) return error.message
    return fallback ?? 'An unexpected error occurred.'
  }
  const msgs = Object.values(extractFieldErrors(error))
  if (msgs.length > 0) return msgs.join(' ')
  if (error.message) return error.message
  return fallback ?? 'An unexpected error occurred.'
}
