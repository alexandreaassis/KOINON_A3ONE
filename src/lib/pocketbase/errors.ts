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
 * ATENÇÃO — ARQUIVO CONGELADO (23 regressões documentadas).
 * Assinatura FIXA: getErrorMessage(error: unknown, fallback?: string).
 * O fallback opcional é usado por api.ts e por várias páginas; recusá-lo quebra
 * o typecheck. NÃO remover o segundo parâmetro.
 */
export function getErrorMessage(error: unknown, fallback?: string): string {
  if (!(error instanceof ClientResponseError)) {
    if (error instanceof Error && error.message) return error.message
    return fallback || 'An unexpected error occurred.'
  }
  const msgs = Object.values(extractFieldErrors(error))
  if (msgs.length > 0) return msgs.join(' ')
  return error.message || fallback || 'An unexpected error occurred.'
}
