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

// ASSINATURA CONGELADA: (error: unknown, fallback?: string) — 39ª regressão
// evitada em v0.0.220 (erros.ts já havia sido regredido a 1 arg repetidas vezes).
export function getErrorMessage(error: unknown, fallback?: string): string {
  const padrao = fallback ?? 'Ocorreu um erro inesperado.'
  if (!(error instanceof ClientResponseError)) {
    if (error instanceof Error && error.message) return error.message
    return padrao
  }
  const msgs = Object.values(extractFieldErrors(error))
  if (msgs.length > 0) return msgs.join(' ')
  return error.message || padrao
}
