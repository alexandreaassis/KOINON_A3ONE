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
/**
 * Validação oficial dos dígitos verificadores do CPF (módulo 11 da Receita Federal).
 * Rejeita valores nulos/vazios, tamanhos diferentes de 11 dígitos numéricos
 * e sequências repetidas (000.000.000-00, 111.111.111-11, etc.).
 */
export function validarCpf(valor: string | undefined | null): boolean {
  const cpf = limparCpf(valor)
  if (!cpf || cpf.length !== 11) return false

  // Elimina sequências de dígitos iguais conhecidas inválidas (ex: 00000000000, 11111111111... 99999999999)
  if (/^(\d)\1{10}$/.test(cpf)) return false

  // 1º Dígito Verificador (pesos de 10 a 2)
  let soma = 0
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf.charAt(i), 10) * (10 - i)
  }
  let resto = (soma * 10) % 11
  let digito1 = resto === 10 || resto === 11 ? 0 : resto
  if (digito1 !== parseInt(cpf.charAt(9), 10)) return false

  // 2º Dígito Verificador (pesos de 11 a 2)
  soma = 0
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpf.charAt(i), 10) * (11 - i)
  }
  resto = (soma * 10) % 11
  let digito2 = resto === 10 || resto === 11 ? 0 : resto

  return digito2 === parseInt(cpf.charAt(10), 10)
}

/**
 * Mensagem padrão amigável para erro de validação de CPF.
 */
export const MSG_CPF_INVALIDO = 'CPF inválido — verifique os números digitados'
