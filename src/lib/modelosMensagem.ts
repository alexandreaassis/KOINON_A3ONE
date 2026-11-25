/**
 * Modelos de mensagem editáveis pela mesa (WhatsApp e e-mail), persistidos na
 * collection `configuracoes` (campos modelo_* — migration 0051). Variáveis
 * suportadas: [NOME], [UNIDADE], [LINK] — substituídas pelos dados reais de
 * cada morador no momento do envio.
 *
 * Regras:
 * - Campo ausente/vazio no banco (registro antigo) = default histórico (texto
 *   pronto); texto gravado = o que a mesa escolheu.
 * - A senha temporária NUNCA entra em modelo nem em mensagem (segurança).
 */
import { URL_ACESSO_KOINON } from '@/lib/whatsapp'

export type CanalModelo = 'whatsapp' | 'email'
export type TipoModelo = 'cadastro_aprovado' | 'ata_publicada'

export const VARIAVEIS_MODELO = ['[NOME]', '[UNIDADE]', '[LINK]'] as const

export const ROTULOS_VARIAVEIS: Record<(typeof VARIAVEIS_MODELO)[number], string> = {
  '[NOME]': 'nome do morador',
  '[UNIDADE]': 'unidade (ex.: Bloco A – Ap 101)',
  '[LINK]': 'link de acesso à plataforma',
}

export const DESCRICAO_VARIAVEIS =
  'Variáveis substituídas no envio: [NOME] = nome do morador, [UNIDADE] = unidade, [LINK] = link do Koinon. A senha temporária nunca é incluída na mensagem.'

/** Campos da collection `configuracoes` (migration 0051). */
export const CAMPOS_MODELO: Record<CanalModelo, Record<TipoModelo, string>> = {
  whatsapp: {
    cadastro_aprovado: 'modelo_wa_cadastro_aprovado',
    ata_publicada: 'modelo_wa_ata_publicada',
  },
  email: {
    cadastro_aprovado: 'modelo_email_cadastro_aprovado',
    ata_publicada: 'modelo_email_ata_publicada',
  },
}

export type ChavesModelosMensagem = {
  [K in keyof typeof CAMPOS_MODELO.whatsapp | keyof typeof CAMPOS_MODELO.email]: string
}

/** Textos prontos atuais — default quando não há modelo salvo ainda. */
export const MODELO_PADRAO_WA_CADASTRO = (nome = '[NOME]', unidade = '[UNIDADE]') =>
  [
    `Olá, ${nome}! Seu cadastro no condomínio (${unidade}) foi aprovado pela mesa diretora.`,
    `O acesso é em ${URL_ACESSO_KOINON} com o seu e-mail cadastrado.`,
    'Se você não tem senha, use a opção "Esqueci minha senha" na tela de login para definir a sua própria senha.',
  ].join('\n')

export const MODELO_PADRAO_WA_ATA = (dataAssembleia = '') => {
  const quando = dataAssembleia ? ` de ${dataAssembleia}` : ''
  return `A ata da assembleia${quando} foi publicada e está disponível na plataforma Koinon em ${URL_ACESSO_KOINON}`
}

export const MODELO_PADRAO_EMAIL_CADASTRO = (nome = '[NOME]', unidade = '[UNIDADE]') =>
  `Olá, ${nome}! Seu cadastro no condomínio (${unidade}) foi aprovado pela mesa diretora. Acesse ${URL_ACESSO_KOINON} com o seu e-mail cadastrado.`

export const MODELO_PADRAO_EMAIL_ATA = (dataAssembleia = '') =>
  `A ata da assembleia${dataAssembleia ? ` de ${dataAssembleia}` : ''} foi publicada e está disponível na plataforma Koinon em ${URL_ACESSO_KOINON}`

interface ContextoModelo {
  nome?: string
  unidade?: string
  dataAssembleia?: string
}

/** Texto default de um tipo/canal (usado na tela de configuração e no envio). */
export function modeloPadrao(
  canal: CanalModelo,
  tipo: TipoModelo,
  contexto: ContextoModelo = {},
): string {
  const nome = contexto.nome ?? '[NOME]'
  const unidade = contexto.unidade ?? '[UNIDADE]'
  const data = contexto.dataAssembleia ?? ''
  if (canal === 'whatsapp' && tipo === 'cadastro_aprovado')
    return MODELO_PADRAO_WA_CADASTRO(nome, unidade)
  if (canal === 'email' && tipo === 'cadastro_aprovado')
    return MODELO_PADRAO_EMAIL_CADASTRO(nome, unidade)
  if (canal === 'whatsapp' && tipo === 'ata_publicada') return MODELO_PADRAO_WA_ATA(data)
  return MODELO_PADRAO_EMAIL_ATA(data)
}

/** O que está salvo no registro de configurações para um modelo (ou undefined). */
export function lerModeloSalvo(
  config: Partial<ChavesModelosMensagem> | null | undefined,
  canal: CanalModelo,
  tipo: TipoModelo,
): string | undefined {
  const campo = CAMPOS_MODELO[canal][tipo]
  const valor = (config as Record<string, unknown> | null | undefined)?.[campo]
  return typeof valor === 'string' && valor.trim() !== '' ? valor : undefined
}

/** Extrai o texto do modelo salvo, caindo no default quando ausente. */
export function resolverModelo(
  config: Partial<ChavesModelosMensagem> | null | undefined,
  canal: CanalModelo,
  tipo: TipoModelo,
  contexto: ContextoModelo = {},
): string {
  const salvo = lerModeloSalvo(config, canal, tipo)
  return salvo !== undefined ? salvo : modeloPadrao(canal, tipo, contexto)
}

/** Substitui [NOME], [UNIDADE] e [LINK] pelos dados reais do envio. */
export function aplicarVariaveis(
  texto: string,
  dados: { nome?: string; unidade?: string; link?: string },
): string {
  const link = dados.link?.trim() || URL_ACESSO_KOINON
  return texto
    .replaceAll('[NOME]', dados.nome?.trim() || 'morador(a)')
    .replaceAll('[UNIDADE]', dados.unidade?.trim() || '—')
    .replaceAll('[LINK]', link)
}

/** Monta o texto inicial do envio: modelo salvo (ou pronto) com variáveis aplicadas. */
export function montarTextoInicial(
  config: Partial<ChavesModelosMensagem> | null | undefined,
  canal: CanalModelo,
  tipo: TipoModelo,
  dados: { nome?: string; unidade?: string; link?: string; dataAssembleia?: string },
): string {
  const { dataAssembleia, ...variaveis } = dados
  const modelo = resolverModelo(config, canal, tipo, { ...variaveis, dataAssembleia })
  return aplicarVariaveis(modelo, variaveis)
}
