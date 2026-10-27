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
  if (!(error instanceof ClientResponseError)) {
    if (error instanceof Error) {
      if (
        error.message.includes(
          'Failed to delete record. Make sure that the record is not part of a required relation reference.',
        )
      ) {
        return 'Este registro está vinculado a outros dados do sistema e não pode ser excluído.'
      }
      return error.message
    }
    return fallback || 'An unexpected error occurred.'
  }

  // Tratamento específico para erro de relação obrigatória do PocketBase
  if (
    error.message?.includes(
      'Failed to delete record. Make sure that the record is not part of a required relation reference.',
    )
  ) {
    return 'Este registro está vinculado a outros dados do sistema e não pode ser excluído.'
  }

  const msgs = Object.values(extractFieldErrors(error))
  if (msgs.length > 0) {
    return msgs.join(' ')
  }

  return error.message || fallback || 'An unexpected error occurred.'
}
