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

export function getErrorMessage(error: unknown, fallback?: string): string {
  // Assinatura CONGELADA (error: unknown, fallback?: string) — exigida por
  // src/lib/api.ts e pelos chamadores (DocumentosEdital, ModalZapsignLinks etc.).
  // Regredir para 1 argumento quebra o typecheck e faz o toast exibir a
  // mensagem crua do SDK ("Something went wrong.") em vez do motivo real.
  if (!(error instanceof ClientResponseError)) {
    if (error instanceof Error && error.message) return error.message
    return fallback || 'An unexpected error occurred.'
  }
  const msgs = Object.values(extractFieldErrors(error))
  if (msgs.length > 0) return msgs.join(' ')
  const resposta = error.response as { message?: string } | undefined
  if (resposta && typeof resposta.message === 'string' && resposta.message.trim()) {
    return resposta.message
  }
  if (error.message && error.status !== 0) return error.message
  return fallback || 'An unexpected error occurred.'
}
