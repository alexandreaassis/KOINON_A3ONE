/**
 * Utilitários para tratamento e formatação de Telefone no padrão brasileiro:
 * - Fixo: (XX) XXXX-XXXX (10 dígitos)
 * - Celular: (XX) XXXXX-XXXX (11 dígitos)
 *
 * Suporta digitação progressiva e colagem (paste), ignorando caracteres não numéricos.
 */

/**
 * Remove qualquer caractere não numérico e trunca no limite máximo de 11 dígitos.
 */
export function limparTelefone(valor: string | undefined | null): string {
  if (!valor) return ''
  return String(valor).replace(/\D/g, '').slice(0, 11)
}

/**
 * Aplica máscara progressiva brasileira em tempo real:
 * - Até 2 dígitos: (XX
 * - 3 a 6 dígitos: (XX) XXXX
 * - 7 a 10 dígitos (fixo completo ou celular sendo digitado): (XX) XXXX-XXXX
 * - 11 dígitos (celular com 9 dígitos): (XX) XXXXX-XXXX
 *
 * Garante que a formatação ocorra suavemente durante a digitação e também na colagem.
 */
export function formatarTelefone(valor: string | undefined | null): string {
  const digits = limparTelefone(valor)
  if (!digits) return ''

  const len = digits.length

  if (len <= 2) {
    return `(${digits}`
  }

  const ddd = digits.slice(0, 2)

  // 11 dígitos: padrão celular (XX) XXXXX-XXXX
  if (len === 11) {
    const parte1 = digits.slice(2, 7)
    const parte2 = digits.slice(7, 11)
    return `(${ddd}) ${parte1}-${parte2}`
  }

  // De 3 a 6 dígitos: (XX) XXXX
  if (len <= 6) {
    const parte1 = digits.slice(2)
    return `(${ddd}) ${parte1}`
  }

  // De 7 a 10 dígitos: (XX) XXXX-XXXX (padrão fixo / progressivo até o 10º dígito)
  const parte1 = digits.slice(2, 6)
  const parte2 = digits.slice(6, 10)
  return `(${ddd}) ${parte1}-${parte2}`
}

/**
 * Validação básica de telefone com DDD (mínimo 10 dígitos, máximo 11 dígitos).
 */
export function validarTelefone(valor: string | undefined | null): boolean {
  const digits = limparTelefone(valor)
  return digits.length === 10 || digits.length === 11
}
