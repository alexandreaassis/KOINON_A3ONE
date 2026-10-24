/**
 * Contrato de asserção de identidade futura para o Sistema de Votação Lago Azul.
 * Estabelece a estrutura padronizada de identidade digital e prova de autorização
 * para futura federação e integração com outros sistemas de condomínio ou certificados ICP-Brasil.
 */

export type IdentityMethod =
  | 'otp_sms'
  | 'otp_whatsapp'
  | 'gov_br'
  | 'icp_brasil'
  | 'biometria_facial'
  | 'mesa_presencial'

export type IdentityConfidence = 'baixo' | 'medio' | 'alto' | 'muito_alto'

export interface IdentityAssertion {
  /** Identificador da pessoa física (ex: hash de CPF ou UUID) */
  personId: string
  /** Identificador único da unidade autônoma (ex: ID do registro da unidade) */
  unitId: string
  /** Método de autenticação e verificação de posse/conhecimento utilizado */
  method: IdentityMethod
  /** Grau de confiança da asserção de identidade */
  confidence: IdentityConfidence
  /** Timestamp ISO-8601 de emissão */
  issuedAt: string
  /** Assinatura criptográfica / hash de prova da asserção */
  signature: string
  /** Metadados adicionais opcionais (agente, dispositivo, geolocalização) */
  metadata?: Record<string, unknown>
}
