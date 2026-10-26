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

export function getErrorMessage(
  error: unknown,
  fallback = 'Ocorreu um erro inesperado ao processar a solicitação.',
): string {
  if (!error) return fallback

  if (error instanceof ClientResponseError) {
    // 1. Mensagem enviada pelo backend no corpo da resposta (ex.: e.json(400, { message: '...' }))
    const responseMsg =
      error.response?.message ||
      (typeof error.response === 'object' && error.response !== null && 'message' in error.response
        ? (error.response as { message?: unknown }).message
        : undefined)

    // 2. Erros de validação em campos de collections (response.data)
    const fieldErrors = extractFieldErrors(error)
    const fieldMsgs = Object.entries(fieldErrors).map(([field, msg]) => {
      const fieldNome =
        field === 'email'
          ? 'E-mail'
          : field === 'cpf'
            ? 'CPF'
            : field === 'name'
              ? 'Nome'
              : field === 'password'
                ? 'Senha'
                : field === 'unidade'
                  ? 'Unidade'
                  : field
      return `${fieldNome}: ${msg}`
    })

    if (fieldMsgs.length > 0) {
      return fieldMsgs.join(' | ')
    }

    if (
      typeof responseMsg === 'string' &&
      responseMsg.trim().length > 0 &&
      responseMsg !== 'Something went wrong while processing your request.'
    ) {
      return traduzirMensagemPadrao(responseMsg)
    }

    if (error.message && error.message !== 'Something went wrong while processing your request.') {
      return traduzirMensagemPadrao(error.message)
    }

    // Se o PocketBase retornou o texto genérico "Something went wrong while processing your request."
    if (error.status === 400) {
      return 'Dados inválidos ou duplicados. Verifique se o CPF ou e-mail já estão cadastrados.'
    }
    if (error.status === 403) {
      return 'Acesso negado. Você não tem permissão para realizar esta operação.'
    }
    if (error.status === 404) {
      return 'Registro não encontrado no sistema.'
    }
  }

  if (error instanceof Error) {
    if (error.message && error.message !== 'Something went wrong while processing your request.') {
      return traduzirMensagemPadrao(error.message)
    }
  }

  if (typeof error === 'object' && error !== null) {
    const obj = error as Record<string, unknown>
    if (
      typeof obj.message === 'string' &&
      obj.message &&
      obj.message !== 'Something went wrong while processing your request.'
    ) {
      return traduzirMensagemPadrao(obj.message)
    }
    if (typeof obj.data === 'object' && obj.data !== null && 'message' in obj.data) {
      const msg = (obj.data as { message?: unknown }).message
      if (typeof msg === 'string' && msg) return traduzirMensagemPadrao(msg)
    }
  }

  return fallback
}

function traduzirMensagemPadrao(msg: string): string {
  const m = msg.trim()
  if (/something went wrong/i.test(m)) {
    return 'Não foi possível completar a operação. Verifique os dados informados.'
  }
  if (/failed to fetch|networkerror/i.test(m)) {
    return 'Falha na conexão de rede. Verifique seu sinal e tente novamente.'
  }
  if (/the request was autocancelled/i.test(m)) {
    return 'Requisição cancelada automaticamente.'
  }
  if (/only admins can/i.test(m) || /insufficient permissions/i.test(m)) {
    return 'Ação restrita a administradores do condomínio.'
  }
  return m
}
