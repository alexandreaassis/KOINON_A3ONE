/**
 * Utilitários para tratamento e formatação de CPF no padrão brasileiro (000.000.000-00).
 */

/**
 * Remove qualquer caractere não numérico e trunca em 11 dígitos.
 */
export function limparCpf(valor: string | undefined | null): string {
  if (!valor) return ''
  return String(valor).replace(/\D/g, '').slice(0, 11)
}

/**
 * Aplica máscara de CPF progressiva (000.000.000-00) enquanto o usuário digita.
 * Seguro contra valores indefinidos e não apaga o estado se o usuário digitar ou apagar caracteres.
 */
export function formatarCpf(valor: string | undefined | null): string {
  const raw = limparCpf(valor)
  if (!raw) return ''

  if (raw.length <= 3) {
    return raw
  }
  if (raw.length <= 6) {
    return `${raw.slice(0, 3)}.${raw.slice(3)}`
  }
  if (raw.length <= 9) {
    return `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6)}`
  }
  return `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6, 9)}-${raw.slice(9, 11)}`
}

/**
 * Validação dos dígitos verificadores do CPF.
 */
export function validarCpf(valor: string | undefined | null): boolean {
  const cpf = limparCpf(valor)
  if (cpf.length !== 11) return false

  // Elimina sequências conhecidas inválidas (ex: 111.111.111-11)
  if (/^(\d)\1{10}$/.test(cpf)) return false

  let soma = 0
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf.charAt(i), 10) * (10 - i)
  }
  let resto = 11 - (soma % 11)
  let digito1 = resto >= 10 ? 0 : resto
  if (digito1 !== parseInt(cpf.charAt(9), 10)) return false

  soma = 0
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpf.charAt(i), 10) * (11 - i)
  }
  resto = 11 - (soma % 11)
  let digito2 = resto >= 10 ? 0 : resto

  return digito2 === parseInt(cpf.charAt(10), 10)
}
