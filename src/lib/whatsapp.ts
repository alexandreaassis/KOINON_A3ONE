/**
 * Utilitários de envio MANUAL de mensagens por WhatsApp (sem integração de API).
 *
 * Fluxo: a mesa compõe a mensagem na tela, copia o texto ou abre o deep link
 * wa.me com o texto já preenchido — o disparo é sempre humano, pelo WhatsApp
 * da própria pessoa da mesa. Nenhum dado sai do Koinon por aqui.
 *
 * Números são normalizados para o formato internacional do WhatsApp:
 * somente dígitos, com prefixo 55 (Brasil). Números que já vêm com 55 são
 * detectados e não recebem o prefixo duplicado.
 */
import { converterParaWhatsappInternacional } from '@/lib/telefone'

const URL_WA_ME = 'https://wa.me/'

/** URL do acesso do morador, usada nas mensagens prontas. */
export const URL_ACESSO_KOINON = 'https://koinon.a3one.com.br'

export interface NumeroWhatsapp {
  valido: boolean
  /** Somente dígitos, com 55 na frente (ex.: 5511987654321). */
  internacional: string
  /** Máscara brasileira legível para exibição (ex.: (11) 98765-4321). */
  formatado: string
}

/**
 * Normaliza qualquer formato (com parênteses, traços, +55, espaços, 9º dígito)
 * para somente dígitos com prefixo 55. Celulares de 10 ou 11 dígitos nacionais
 * são válidos; outros formatos são marcados como inválidos.
 */
export function normalizarNumeroWhatsapp(valor: string | undefined | null): NumeroWhatsapp {
  const conv = converterParaWhatsappInternacional(valor)
  return {
    valido: conv.valido,
    internacional: conv.numeroInternacional,
    formatado: conv.formatado || '—',
  }
}

/** Deep link wa.me com a mensagem já preenchida (encodeURIComponent). */
export function montarLinkWhatsapp(internacional: string, mensagem: string): string {
  return `${URL_WA_ME}${internacional}?text=${encodeURIComponent(mensagem)}`
}

/** Cria a mensagem pronta de cadastro aprovado (sem senha temporária — segurança). */
export function montarMensagemCadastroAprovado(nome: string): string {
  return [
    `Olá, ${nome}! Seu cadastro no condomínio foi aprovado pela mesa diretora.`,
    `O acesso é em ${URL_ACESSO_KOINON} com o seu e-mail cadastrado.`,
    'Se você não tem senha, use a opção "Esqueci minha senha" na tela de login para definir a sua própria senha.',
  ].join('\n')
}

/** Cria a mensagem pronta de ata publicada. */
export function montarMensagemAtaPublicada(dataAssembleia: string): string {
  const quando = dataAssembleia ? ` de ${dataAssembleia}` : ''
  return `A ata da assembleia${quando} foi publicada e está disponível na plataforma Koinon em ${URL_ACESSO_KOINON}`
}

/** Copia texto para a área de transferência, com fallback para navegadores antigos. */
export async function copiarTexto(texto: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(texto)
      return true
    }
  } catch {
    /* cai no fallback abaixo */
  }
  try {
    const area = document.createElement('textarea')
    area.value = texto
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.left = '-9999px'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(area)
    return ok
  } catch {
    return false
  }
}
