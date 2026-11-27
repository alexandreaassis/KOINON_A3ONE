import pb from '@/lib/pocketbase/client'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import type { RecordModel } from 'pocketbase'

export type UserRole = 'morador' | 'mesa' | 'admin'

export interface UserRecord extends RecordModel {
  email: string
  name: string
  role: UserRole
  avatar?: string
  cpf?: string
  unidade?: string
  /** Multi-relação para múltiplas unidades por proprietário (migration 1768400000000) */
  unidades?: string[]
  ativo?: boolean
  /** Troca obrigatória de senha no primeiro acesso (migration 0049) */
  deve_trocar_senha?: boolean
  expand?: {
    unidade?: UnidadeRecord
    unidades?: UnidadeRecord[]
  }
}

export type TipoCondominio = 'vertical' | 'horizontal' | 'misto'

export interface GrupoCondoConfig {
  id?: string
  nome: string
  tipo: 'vertical' | 'horizontal'
  rotulo?: string
  peso_voto?: number
  // Vertical
  quantidade_blocos?: number
  prefixo_bloco?: string
  andares_por_bloco?: number
  unidades_por_andar?: number
  andar_inicial?: string
  modelo_numeracao?: 'sequencial' | 'andar_posicao' | 'andar_posicao_prefixo' | 'custom'
  template_custom?: string
  digitos_unid?: number
  // Horizontal
  quantidade_unidades?: number
  prefixo_rua?: string
  numero_inicial?: number
}

export type SmtpEncryption = 'starttls' | 'ssl' | 'none'

export interface CanaisEnvioData {
  email_oficial?: string
  nome_remetente?: string
  whatsapp_oficial?: string
  smtp_host?: string
  smtp_port?: number
  smtp_user?: string
  smtp_encryption?: SmtpEncryption
  smtp_ativo?: boolean
  tem_senha_smtp?: boolean
}

export interface SalvarCanaisEnvioPayload {
  email_oficial?: string
  nome_remetente?: string
  whatsapp_oficial?: string
  smtp_host?: string
  smtp_port?: number
  smtp_user?: string
  smtp_encryption?: SmtpEncryption
  smtp_ativo?: boolean
  smtp_pass?: string
  limpar_senha_smtp?: boolean
}

export interface ModelosMensagemPayload {
  modelo_wa_cadastro_aprovado?: string
  modelo_wa_ata_publicada?: string
  modelo_email_cadastro_aprovado?: string
  modelo_email_ata_publicada?: string
}

export interface CondoConfigRecord extends RecordModel {
  nome_condominio: string
  logo?: string
  som_voto?: string
  tipo_condominio?: TipoCondominio
  rotulo_unidade?: string
  grupos_config?: GrupoCondoConfig[] | string
  quantidade_blocos?: number
  unidades_por_bloco?: number
  total_unidades?: number
  prefixo_bloco?: string
  default_inadimplente_vota?: boolean
  default_locatario_vota?: boolean
  default_quorum_materia?: string
  default_tipo_cedula?: string
  sindico_pode_presidir_mesa?: boolean
  email_oficial?: string
  nome_remetente?: string
  whatsapp_oficial?: string
  smtp_host?: string
  smtp_port?: number
  smtp_user?: string
  smtp_encryption?: SmtpEncryption
  smtp_ativo?: boolean
  // Fase 2 - Selo honesto (migration 0040)
  instrucoes_acesso?: Record<string, unknown> | string
  // Modelos de mensagem editáveis pela mesa (migration 0051)
  modelo_wa_cadastro_aprovado?: string
  modelo_wa_ata_publicada?: string
  modelo_email_cadastro_aprovado?: string
  modelo_email_ata_publicada?: string
  clausula_aceite_versao?: string
  clausula_aceite_status?: string
  clausula_aceite_texto?: string
}

export interface UnidadeRecord extends RecordModel {
  identificador: string
  bloco?: string
  responsavel_nome?: string
  contato_celular?: string
  contato_email?: string
  ativo?: boolean
  grupo?: string
  peso_voto?: number
  andar?: string
  tipo_unidade?: string
  posicao_numero?: number
  token_cadastro?: string
}

export type DeliberacaoStatus =
  | 'AGUARDANDO_ABERTURA'
  | 'ABERTA'
  | 'EM_VOTACAO'
  | 'ENCERRADA'
  | 'APURADA'
  | 'PUBLICADA'

export interface DeliberacaoRecord extends RecordModel {
  titulo: string
  descricao?: string
  data_inicio?: string
  data_fim?: string
  status: DeliberacaoStatus
  quorum_instalacao?: number
  quorum_materia?: string
  tipo_cedula: 'secreta' | 'nominal'
  inadimplente_pode_votar?: boolean
  locatario_pode_votar?: boolean
  hash_raiz?: string
  mesa_presidente_nome?: string
  mesa_presidente_cpf?: string
  mesa_secretario_nome?: string
  mesa_secretario_cpf?: string
  mesa_eleita_em?: string
  proprietario_nao_participa_unidades?: string[] | string
  /**
   * Modalidade do voto presencial desta deliberação (migration 0053):
   * 'estacao' = urna criptográfica no salão (Estação de Voto Presencial);
   * 'manual' = lançamento dos totais físicos pela mesa (comportamento padrão).
   * Select single: o runtime pode entregar string ou array — normalizado na leitura.
   */
  modalidade_presencial?: ModalidadePresencial | ModalidadePresencial[]
  /** Google Meet (Fase 1) — sala da assembleia criada pela mesa (migration 0056) */
  meet_link?: string
  meet_space_name?: string
  meet_criado_em?: string
}

export interface MeetConfigResponse {
  success: boolean
  configurado: boolean
  client_email: string
  message?: string
}

export interface MeetCriarSalaResponse {
  success: boolean
  message: string
  meet_link?: string
  space_name?: string
  criado_em?: string
  ja_existe?: boolean
  codigo?: string
}

export type ModalidadePresencial = 'estacao' | 'manual'

/** Normaliza o select (pode chegar como array de 1) para string */
export function normalizarModalidadePresencial(valor: unknown): ModalidadePresencial {
  if (Array.isArray(valor)) return (valor[0] as ModalidadePresencial) || 'manual'
  return (valor as ModalidadePresencial) || 'manual'
}

export interface LancamentoFisicoRecord extends RecordModel {
  deliberacao: string
  item: string
  favoraveis: number
  contrarios: number
  abstencoes: number
  /** Migration 0055 — array de números (índice = candidato em candidatos_eleicao) */
  votos_por_candidato?: number[] | string | null
  lancado_por?: string
  /** JSON: { favoraveis, contrarios, abstencoes, lancado_por, atualizado_em } */
  valores_anteriores?: string
  observacao?: string
}

/** Normaliza votos_por_candidato (JSON pode chegar como string/array/null) */
export function normalizarVotosPorCandidato(valor: unknown): number[] {
  let dados: unknown = valor
  if (typeof dados === 'string') {
    try {
      dados = JSON.parse(dados)
    } catch (_) {
      return []
    }
  }
  if (!Array.isArray(dados)) return []
  return dados.map((n) => (typeof n === 'number' && !isNaN(n) ? Math.max(0, Math.round(n)) : 0))
}

export interface CodigoUsoUnicoRecord extends RecordModel {
  deliberacao: string
  unidade: string
  /** Apenas hash — o código em claro nunca é armazenado nem logado */
  codigo_hash: string
  status: 'ativo' | 'usado' | 'expirado' | 'revogado'
  expira_em?: string
  gerado_por?: string
  usado_em?: string
  usado_por_cpf_mascara?: string
}

export type RegraLocatario =
  | 'somente_proprietario'
  | 'morador_substitui_ausente'
  | 'morador_vota_sempre'

export type TipoPauta = 'despesas_manutencao' | 'proprietarios' | 'geral'

/**
 * Migration 0054 — modo "eleição" em itens de pauta.
 * tipo_eleicao = 'eleicao' transforma o item em votação de candidatos (escolha única);
 * candidatos_eleicao é JSON array [{nome, cargo}].
 */
export type TipoEleicao = 'regular' | 'eleicao'

export interface CandidatoEleicao {
  nome: string
  cargo?: string
}

/**
 * Normaliza candidatos_eleicao (JSON pode chegar como string, array ou null)
 * para um array tipado de candidatos.
 */
export function normalizarCandidatosEleicao(valor: unknown): CandidatoEleicao[] {
  let dados: unknown = valor
  if (typeof dados === 'string') {
    try {
      dados = JSON.parse(dados)
    } catch (_) {
      return []
    }
  }
  if (!Array.isArray(dados)) return []
  return dados
    .filter(
      (c): c is { nome?: unknown; cargo?: unknown } =>
        !!c && typeof c === 'object' && 'nome' in (c as Record<string, unknown>),
    )
    .map((c) => ({
      nome: typeof c.nome === 'string' ? c.nome : String(c.nome ?? ''),
      cargo: typeof c.cargo === 'string' ? c.cargo : undefined,
    }))
    .filter((c) => c.nome.trim() !== '')
}

export interface ItemPautaRecord extends RecordModel {
  deliberacao: string
  ordem: number
  titulo: string
  texto?: string
  quorum_aplicavel?: string
  regra_locatario?: RegraLocatario
  tipo_pauta?: TipoPauta
  tipo_eleicao?: TipoEleicao
  /** JSON array [{nome, cargo}] — normalizar com normalizarCandidatosEleicao */
  candidatos_eleicao?: CandidatoEleicao[] | string | null
}

/** true quando o item é do modo eleição */
export function itemEhEleicao(item?: ItemPautaRecord | null): boolean {
  return item?.tipo_eleicao === 'eleicao'
}

export interface CedulaRecord extends RecordModel {
  deliberacao: string
  item: string
  unidade_hash: string
  /** Voto comum ('favoravel'|'contrario'|'abstencao'...) ou em candidato: 'candidato:<índice>' */
  opcao: 'favoravel' | 'contrario' | 'abstencao' | `candidato:${number}` | (string & {})
  timestamp: string
  hash_anterior: string
  hash_cedula: string
  recibo_codigo: string
  vinculo_votante?: 'proprietario' | 'condomino' | 'locatario'
  regra_aplicada?: string
  declaracao_representante_legal?: boolean
}

/** Status de solicitação de credenciamento como procurador (migration 0052) */
export type StatusSolicitacaoProcuracao = 'em_analise' | 'aprovado' | 'cancelado' | 'rejeitado'

export interface SolicitacaoProcuracaoRecord extends RecordModel {
  solicitante: string
  deliberacao: string
  unidade: string
  titular_outorgante?: string
  nome_procurador?: string
  cpf_procurador?: string
  qualificacao?: string
  anexos?: string[]
  status: StatusSolicitacaoProcuracao
  motivo_rejeicao?: string
  cancelado_pelo_solicitante?: boolean
  aprovado_em?: string
  rejeitado_em?: string
  cancelado_em?: string
  expand?: {
    deliberacao?: DeliberacaoRecord
    unidade?: UnidadeRecord
    solicitante?: UserRecord
  }
}

export type TipoVinculo =
  | 'proprietario'
  | 'condomino'
  | 'locatario'
  | 'promitente'
  | 'usufrutuario'
  | 'procurador'

export interface CredenciamentoRecord extends RecordModel {
  unidade: string
  cpf: string
  titular_nome: string
  /**
   * Select multivalorado no PocketBase: o runtime entrega array (["procurador"]).
   * A camada api normaliza para string na leitura (normalizarTipoVinculo) —
   * o tipo aceita os dois formatos porque gravações diretas (formulário) enviam string.
   */
  tipo_vinculo: TipoVinculo | TipoVinculo[] | ''
  status: 'pendente' | 'aprovado' | 'rejeitado'
  motivo_rejeicao?: string
  documentos?: string[]
  aprovado_por?: string
  data_analise?: string
  expand?: {
    unidade?: UnidadeRecord
  }
}

export interface PresencaRecord extends RecordModel {
  deliberacao: string
  unidade: string
  tipo: 'remoto' | 'presencial'
  data_hora?: string
  expand?: {
    unidade?: UnidadeRecord
    deliberacao?: DeliberacaoRecord
  }
}

export interface SessaoRecord extends RecordModel {
  user: string
  unidade: string
  deliberacao: string
  token_voto?: string
  otp_codigo_hash?: string
  otp_expira_em?: string
  tentativas_falhas?: number
  status: 'ativa' | 'expirada' | 'revogada' | 'consumida'
  revogada_sessao_id?: string
  expira_em?: string
}

export interface ComparecimentoRecord extends RecordModel {
  deliberacao: string
  unidade: string
  data_hora: string
  fator_usado?: string
  dispositivo_id?: string
  expand?: {
    unidade?: UnidadeRecord
  }
}

export interface ComprovanteRecord extends RecordModel {
  deliberacao: string
  unidade: string
  codigo_conferencia: string
  hash_abreviado?: string
  data_hora: string
  expand?: {
    deliberacao?: DeliberacaoRecord
    unidade?: UnidadeRecord
  }
}

export type VinculoCadastro = 'proprietario' | 'condomino' | 'locatario'
export type StatusAprovacaoCadastro = 'aprovado' | 'pendente' | 'rejeitado'
export type OrigemCadastro = 'admin' | 'link_publico'

export interface CadastroUnidadeRecord extends RecordModel {
  unidade: string
  nome: string
  cpf: string
  data_nascimento?: string
  email?: string
  telefone?: string
  vinculo: VinculoCadastro
  ativo?: boolean
  status_aprovacao?: StatusAprovacaoCadastro
  origem?: OrigemCadastro
  observacoes?: string
  declaracao_vinculo?: string
  declaracao_assinatura?: string
  declaracao_data?: string
  declaracao_ip?: string
  indicacao_nome?: string
  indicacao_telefone?: string
  expand?: {
    unidade?: UnidadeRecord
  }
}

export interface AuditoriaEventRecord extends RecordModel {
  evento:
    | 'credenciamento_submetido'
    | 'vinculo_aprovado'
    | 'vinculo_rejeitado'
    | 'otp_enviado'
    | 'otp_validado'
    | 'otp_falhou'
    | 'autenticacao_concluida'
    | 'token_emitido'
    | 'cedula_registrada'
    | 'assembleia_aberta'
    | 'assembleia_encerrada'
    | 'apuracao_concluida'
    | 'resultado_publicado'
    | 'malha_unidades_gerada'
    | 'unidade_avulsa_criada'
    | 'configuracao_atualizada'
    | 'usuario_gerenciado'
    | 'edital_publicado'
    | 'documento_upload'
    | 'assinatura_registrada'
    | 'presenca_assinada'
    | 'dossie_gerado'
    | 'notificacao_criada'
    | 'notificacao_enviada'
    | 'ata_gerada_ia'
    | 'ata_assinada_mesa'
    | 'ata_publicada'
    | 'audio_transcricao'
    | 'documento_extracao'
  data_hora?: string
  unidade?: string
  fator?: string
  dispositivo?: string
  sequencial?: number
  hash_evento?: string
  hash_anterior?: string
  expand?: {
    unidade?: UnidadeRecord
  }
}

// Novos tipos da Fase 1 - Módulo de Documentos e Notificações
export type TipoDocumentoPauta =
  | 'convencao_proposta'
  | 'regimento_interno'
  | 'prestacao_contas'
  | 'curriculo_candidato'
  | 'edital'
  | 'procuracao'
  | 'outro'

export type CargoCandidato =
  | 'sindico'
  | 'vice_sindico'
  | 'conselheiro_fiscal'
  | 'conselheiro_consultivo'

export interface DocumentoPautaRecord extends RecordModel {
  deliberacao: string
  tipo: TipoDocumentoPauta
  titulo: string
  descricao?: string
  arquivo?: string
  cargo_candidato?: CargoCandidato
  nome_candidato?: string
  ordem?: number
  criado_por?: string
  hash_conteudo?: string
  expand?: {
    deliberacao?: DeliberacaoRecord
    criado_por?: UserRecord
  }
}

export type FormatoAssinatura = 'desenho' | 'texto' | 'em_branco'

export interface EditalDeliberacaoRecord extends RecordModel {
  deliberacao: string
  titulo?: string
  subtitulo?: string
  texto_abertura?: string
  data_assembleia?: string
  primeira_convocacao?: string
  segunda_convocacao?: string
  local_texto?: string
  ordem_dia_custom?: string
  disposicoes_gerais?: string
  regras_participacao?: string
  sindico_nome?: string
  sindico_cpf?: string
  cargo_convocante?: string
  status?: 'rascunho' | 'assinado' | 'publicado'
  hash_assinado?: string
  data_assinatura?: string
  conteudo_assinado_snapshot?: string
  formato_assinatura?: FormatoAssinatura
  assinatura_visual?: string
  assinatura_texto?: string

  // Integração ZapSign (mesmo padrão da ata)
  zapsign_documento_token?: string
  zapsign_status?: string
  zapsign_urls?: ZapSignSignatarioUrl[]
  zapsign_enviado_em?: string
  zapsign_concluido_em?: string
  zapsign_pdf_assinado_url?: string
  zapsign_pdf_assinado_hash?: string
  zapsign_motivo_falha?: string
  zapsign_pdf_assinado?: string

  expand?: {
    deliberacao?: DeliberacaoRecord
  }
}

export type StatusAtaAssembleia = 'rascunho' | 'assinada' | 'publicada'

export type ModoAssinaturaAta = 'eletronica_nativa' | 'zapsign' | 'manual_impressao'

// Status/links de ZapSign compartilhados entre ata, edital e lista de presença
export interface ListaPresencaDocumentoRecord extends RecordModel {
  deliberacao: string
  titulo?: string
  participantes?: unknown[]
  totais?: Record<string, unknown>
  status?: 'rascunho' | 'assinado' | 'publicado'
  hash_assinado?: string
  data_assinatura?: string

  // Integração ZapSign (mesmo padrão da ata)
  zapsign_documento_token?: string
  zapsign_status?: string
  zapsign_urls?: ZapSignSignatarioUrl[]
  zapsign_enviado_em?: string
  zapsign_concluido_em?: string
  zapsign_pdf_assinado_url?: string
  zapsign_pdf_assinado_hash?: string
  zapsign_motivo_falha?: string
  zapsign_pdf_assinado?: string
}

export interface ZapSignSignatarioUrl {
  nome: string
  email?: string
  telefone?: string
  token?: string
  sign_url?: string
  status?: string
  signed?: boolean
  signed_at?: string | null
}

export interface AtaAssembleiaRecord extends RecordModel {
  deliberacao: string
  titulo?: string
  subtitulo?: string
  texto_entrada_bruto?: string
  conteudo_html?: string
  status: StatusAtaAssembleia

  // Cabeçalho editável do PDF da ata (migration 0044)
  cabecalho_tag?: string
  cabecalho_condominio?: string
  cabecalho_subtitulo?: string

  // Configuração de impressão do corpo, POR ATA (migration 0046).
  // Campo ausente/vazio = comportamento histórico (justificado + recuo).
  alinhamento_corpo?: 'justificado' | 'esquerda'
  recuo_paragrafo?: 'com' | 'sem'

  // Assinatura Presidente da Mesa
  presidente_nome?: string
  presidente_cpf?: string
  presidente_formato?: FormatoAssinatura
  presidente_assinatura_visual?: string
  presidente_assinatura_texto?: string
  presidente_assinado_em?: string
  presidente_hash?: string

  // Assinatura Secretário(a) da Mesa
  secretario_nome?: string
  secretario_cpf?: string
  secretario_formato?: FormatoAssinatura
  secretario_assinatura_visual?: string
  secretario_assinatura_texto?: string
  secretario_assinado_em?: string
  secretario_hash?: string

  // Snapshot e Criptografia
  conteudo_assinado_snapshot?: string
  hash_ata?: string
  hash_raiz_urna?: string
  data_publicacao?: string

  // Integração ZapSign & Fallback Manual (Fase 3)
  modo_assinatura?: ModoAssinaturaAta
  zapsign_documento_token?: string
  zapsign_status?: string
  zapsign_urls?: ZapSignSignatarioUrl[]
  zapsign_enviado_em?: string
  zapsign_concluido_em?: string
  zapsign_pdf_assinado_url?: string
  zapsign_pdf_assinado_hash?: string
  zapsign_motivo_falha?: string
  zapsign_pdf_assinado?: string

  expand?: {
    deliberacao?: DeliberacaoRecord
  }
}

export interface AssinaturaDocumentoRecord extends RecordModel {
  documento_id: string
  documento_tipo: string
  deliberacao?: string
  assinante_nome: string
  assinante_cpf: string
  tipo: 'sindico' | 'mesa_presidente' | 'mesa_secretario' | 'participante'
  hash_documento: string
  data_hora?: string
  ip_dispositivo?: string
  status: 'valida' | 'revogada'
  usuario?: string
  formato_assinatura?: FormatoAssinatura
  assinatura_visual?: string
  assinatura_texto?: string
}

export interface PresencaAssinaturaRecord extends RecordModel {
  deliberacao: string
  unidade: string
  nome: string
  cpf: string
  forma: 'presencial' | 'remoto' | 'procuracao'
  procuracao_arquivo?: string
  nome_procurador?: string
  cpf_procurador?: string
  assinatura_hash?: string
  data_hora_assinatura?: string
  ip_dispositivo?: string
  formato_assinatura?: FormatoAssinatura
  assinatura_visual?: string
  assinatura_texto?: string
  expand?: {
    unidade?: UnidadeRecord
    deliberacao?: DeliberacaoRecord
  }
}

export type TipoNotificacao =
  | 'edital_convocado'
  | 'credenciamento_aprovado'
  | 'credenciamento_rejeitado'
  | 'credenciamento_pendente_mesa'
  | 'otp_enviado'
  | 'ata_disponivel_assinatura'
  | 'deliberacao_publicada'
  | 'convite_assembleia'

export interface NotificacaoRecord extends RecordModel {
  destinatario: string
  canal: 'email'
  tipo: TipoNotificacao
  titulo?: string
  corpo?: string
  deliberacao?: string
  status: 'pendente' | 'enviada' | 'falha'
  mensagem_erro?: string
  tentativas?: number
  enviada_em?: string
  // Prova de envio (migration 0040)
  prova_canal?: string
  prova_status?: string
  prova_data_hora?: string
  prova_hash_documento?: string
  prova_payload?: string
  prova_deliberacao?: string
  expand?: {
    deliberacao?: DeliberacaoRecord
  }
}

export interface LogAcessoRecord extends RecordModel {
  user?: string
  email: string
  nome?: string
  data_hora: string
  metodo: 'senha' | 'token' | 'otp' | 'outro'
  status: 'sucesso' | 'falha'
  ip?: string
  user_agent?: string
  motivo_falha?: string
  expand?: {
    user?: UserRecord
  }
}

export type HistoricoAcao = 'criacao' | 'atualizacao' | 'exclusao'

export interface CampoAlteradoDiff {
  campo: string
  anterior: any
  novo: any
}

export interface HistoricoAlteracaoRecord extends RecordModel {
  user?: string
  user_nome?: string
  user_email?: string
  user_role?: string
  acao: HistoricoAcao
  entidade: string
  registro_id: string
  registro_rotulo?: string
  campos_alterados?: CampoAlteradoDiff[]
  ip?: string
  user_agent?: string
  data_hora: string
  expand?: {
    user?: UserRecord
  }
}

export interface ApuracaoItemResult {
  id: string
  ordem: number
  titulo: string
  texto?: string
  quorum_aplicavel?: string
  /** Migration 0054 — presente quando o item é do modo eleição */
  tipo_eleicao?: TipoEleicao
  candidatos_eleicao?: CandidatoEleicao[]
  /** Contagem por candidato (índice do array candidatos_eleicao) */
  porCandidato?: { total: number }[]
  votos: {
    favoravel: number
    contrario: number
    abstencao: number
    nulo: number
    branco: number
    total: number
  }
}

/**
 * Função utilitária para ordenação natural das unidades:
 * Agrupa por grupo/bloco e depois ordena de forma lógica e crescente
 * considerando andar numérico, posição/porta numérica ou número natural extraído do identificador.
 */
export function ordenarUnidadesLogicamente<
  T extends {
    identificador: string
    bloco?: string
    grupo?: string
    andar?: string
    posicao_numero?: number
  },
>(unidades: T[]): T[] {
  return [...unidades].sort((a, b) => {
    // 1. Comparar Grupo
    const grupoA = (a.grupo || '').trim()
    const grupoB = (b.grupo || '').trim()
    if (grupoA !== grupoB) {
      // Se um tem grupo e outro não, priorizar o que tem grupo
      if (!grupoA) return 1
      if (!grupoB) return -1
      const cmpGrupo = grupoA.localeCompare(grupoB, undefined, {
        numeric: true,
        sensitivity: 'base',
      })
      if (cmpGrupo !== 0) return cmpGrupo
    }

    // 2. Comparar Bloco
    const blocoA = (a.bloco || '').trim()
    const blocoB = (b.bloco || '').trim()
    if (blocoA !== blocoB) {
      const cmpBloco = blocoA.localeCompare(blocoB, undefined, {
        numeric: true,
        sensitivity: 'base',
      })
      if (cmpBloco !== 0) return cmpBloco
    }

    // 3. Comparar Andar numericamente (se existir)
    const andarA = Number(a.andar)
    const andarB = Number(b.andar)
    const temAndarA = !isNaN(andarA) && a.andar !== '' && a.andar !== undefined
    const temAndarB = !isNaN(andarB) && b.andar !== '' && b.andar !== undefined
    if (temAndarA && temAndarB && andarA !== andarB) {
      return andarA - andarB
    }

    // 4. Comparar Posição / Porta numericamente (se existir)
    const posA = a.posicao_numero
    const posB = b.posicao_numero
    const temPosA = typeof posA === 'number' && posA > 0
    const temPosB = typeof posB === 'number' && posB > 0
    if (temPosA && temPosB && posA !== posB) {
      return posA - posB
    }

    // 5. Comparação Natural pelo Identificador (ordenação natural: 101 < 102 < 1001 < 1304)
    return a.identificador.localeCompare(b.identificador, undefined, {
      numeric: true,
      sensitivity: 'base',
    })
  })
}

export interface ApuracaoResponse {
  success: boolean
  deliberacao: {
    id: string
    titulo: string
    descricao?: string
    data_inicio?: string
    data_fim?: string
    status: DeliberacaoStatus
    tipo_cedula: 'secreta' | 'nominal'
    modalidade_presencial?: string
    quorum_instalacao?: number
    quorum_materia?: string
    inadimplente_pode_votar?: boolean
    locatario_pode_votar?: boolean
    hash_raiz?: string
    mesa_presidente_nome?: string
    mesa_presidente_cpf?: string
    mesa_secretario_nome?: string
    mesa_secretario_cpf?: string
  }
  apuracao: {
    totalComparecimentos: number
    totalCedulas: number
    esperadoCedulas: number
    totalUnidadesElegiveis?: number
    integridadeMatematica: boolean
    presencas: {
      presencial: number
      remoto: number
      total: number
    }
    itens: ApuracaoItemResult[]
    hashRaizUrna: string
  }
}

/**
 * Camada única de comunicação com a API PocketBase e custom endpoints
 */
export const api = {
  // Unidades
  async getUnidades() {
    const list = await pb.collection('unidades').getFullList<UnidadeRecord>({
      sort: 'grupo,bloco,posicao_numero,identificador',
    })
    return ordenarUnidadesLogicamente(list)
  },

  async getUnidade(id: string) {
    try {
      if (!id || id === 'none') return null
      return await pb.collection('unidades').getOne<UnidadeRecord>(id)
    } catch (err: any) {
      if (err?.status === 404 || err?.status === 400) {
        return null
      }
      throw new Error(
        getErrorMessage(err, `Não foi possível carregar a unidade vinculada (${id}).`),
      )
    }
  },

  async atualizarUnidade(id: string, dados: Partial<UnidadeRecord>) {
    return pb.collection('unidades').update<UnidadeRecord>(id, dados)
  },

  // Deliberações
  async getDeliberacoes() {
    return pb.collection('deliberacoes').getFullList<DeliberacaoRecord>({
      sort: '-created',
    })
  },

  async getDeliberacao(id: string) {
    return pb.collection('deliberacoes').getOne<DeliberacaoRecord>(id)
  },

  async getDeliberacaoAtiva(): Promise<DeliberacaoRecord | null> {
    const consultarComRetry = async (
      tentativas = 2,
      esperaMs = 800,
    ): Promise<DeliberacaoRecord | null> => {
      for (let i = 0; i <= tentativas; i++) {
        try {
          // 1. Tenta buscar deliberação ativa/em andamento
          const list = await pb.collection('deliberacoes').getList<DeliberacaoRecord>(1, 1, {
            filter: "status != 'PUBLICADA' && status != 'ENCERRADA'",
            sort: '-created',
            requestKey: 'delib_ativa_andamento',
          })
          if (list?.items && list.items.length > 0) return list.items[0]

          // 2. Se não houver em andamento, retorna a mais recente (ex: já encerrada ou publicada)
          const anyList = await pb.collection('deliberacoes').getList<DeliberacaoRecord>(1, 1, {
            sort: '-created',
            requestKey: 'delib_ativa_recente',
          })
          return anyList?.items?.[0] || null
        } catch (err: any) {
          const isNetwork =
            err?.name === 'TypeError' ||
            err?.message?.includes('Failed to fetch') ||
            err?.message?.includes('NetworkError') ||
            err?.status === 0 ||
            !err?.status

          if (isNetwork && i < tentativas) {
            // Backend temporariamente indisponível ou em reinício: aguarda e tenta novamente em silêncio
            await new Promise((resolve) => setTimeout(resolve, esperaMs * (i + 1)))
            continue
          }

          // Notifica estado de rede se for falha de conectividade sem propagar unhandled exception
          if (isNetwork && typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('koinon:network-status', { detail: { online: false, error: err } }),
            )
          }

          // Degradação graciosa: se não autenticado (401/403), erro de filtro, tabela vazia ou rede indisponível
          console.warn(
            'api.getDeliberacaoAtiva: falha graciosa ao consultar deliberações:',
            err?.message || err,
          )
          return null
        }
      }
      return null
    }

    try {
      const res = await consultarComRetry()
      if (res !== null && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('koinon:network-status', { detail: { online: true } }))
      }
      return res
    } catch {
      return null
    }
  },

  async createDeliberacao(data: Partial<DeliberacaoRecord>) {
    return pb.collection('deliberacoes').create<DeliberacaoRecord>(data)
  },

  async updateDeliberacao(id: string, data: Partial<DeliberacaoRecord>) {
    return pb.collection('deliberacoes').update<DeliberacaoRecord>(id, data)
  },

  // Transição de estado via Hook da Mesa
  async transitarDeliberacao(deliberacaoId: string, novoStatus: DeliberacaoStatus) {
    return pb.send<{
      success: boolean
      deliberacaoId: string
      statusAnterior: string
      novoStatus: string
      hashRaiz?: string
      message: string
    }>('/backend/v1/deliberacoes/transicao', {
      method: 'POST',
      body: { deliberacaoId, novoStatus },
    })
  },

  // Itens de Pauta
  async getItensPauta(deliberacaoId: string) {
    return pb.collection('itens_pauta').getFullList<ItemPautaRecord>({
      filter: pb.filter('deliberacao = {:id}', { id: deliberacaoId }),
      sort: 'ordem',
    })
  },

  async createItemPauta(data: Partial<ItemPautaRecord>) {
    return pb.collection('itens_pauta').create<ItemPautaRecord>(data)
  },

  async updateItemPauta(id: string, data: Partial<ItemPautaRecord>) {
    return pb.collection('itens_pauta').update<ItemPautaRecord>(id, data)
  },

  // 4. Cadastros de Moradores e Proprietários por Unidade
  async getCadastrosUnidades(filtros?: {
    unidadeId?: string
    vinculo?: VinculoCadastro
    ativo?: boolean
    statusAprovacao?: StatusAprovacaoCadastro
    busca?: string
  }) {
    const filterParts: string[] = []
    if (filtros?.unidadeId) {
      filterParts.push(pb.filter('unidade = {:unid}', { unid: filtros.unidadeId }))
    }
    if (filtros?.vinculo) {
      filterParts.push(pb.filter('vinculo = {:vinc}', { vinc: filtros.vinculo }))
    }
    if (filtros?.ativo !== undefined) {
      filterParts.push(pb.filter('ativo = {:atv}', { atv: filtros.ativo }))
    }
    if (filtros?.statusAprovacao) {
      filterParts.push(pb.filter('status_aprovacao = {:st}', { st: filtros.statusAprovacao }))
    }
    if (filtros?.busca) {
      const b = filtros.busca.trim()
      filterParts.push(
        pb.filter('nome ~ {:b} || cpf ~ {:b} || email ~ {:b} || telefone ~ {:b}', { b }),
      )
    }

    return pb.collection('cadastros_unidade').getFullList<CadastroUnidadeRecord>({
      filter: filterParts.length > 0 ? filterParts.join(' && ') : undefined,
      sort: '-created,unidade.identificador,nome',
      expand: 'unidade',
    })
  },

  async getCadastroUnidade(id: string) {
    return pb.collection('cadastros_unidade').getOne<CadastroUnidadeRecord>(id, {
      expand: 'unidade',
    })
  },

  async criarCadastroUnidade(dados: Partial<CadastroUnidadeRecord>) {
    return pb.collection('cadastros_unidade').create<CadastroUnidadeRecord>(dados, {
      expand: 'unidade',
    })
  },

  async atualizarCadastroUnidade(id: string, dados: Partial<CadastroUnidadeRecord>) {
    return pb.collection('cadastros_unidade').update<CadastroUnidadeRecord>(id, dados, {
      expand: 'unidade',
    })
  },

  async excluirCadastroUnidade(id: string) {
    return pb.collection('cadastros_unidade').delete(id)
  },

  async excluirCadastroUnidadeComReautenticacao(dados: {
    cadastroId: string
    email: string
    password: string
  }) {
    return pb.send<{
      success: boolean
      message: string
      dadosExcluidos: {
        id: string
        nome: string
        cpf: string
        vinculo: string
        unidade: string
      }
    }>('/backend/v1/admin/cadastros/excluir', {
      method: 'POST',
      body: dados,
    })
  },

  // Operações de Link e Aprovação de Cadastro de Moradores
  async getUnidadePorTokenPublico(token: string) {
    return pb.send<{
      success: boolean
      unidade: {
        identificador: string
        bloco?: string
        tipo_unidade?: string
        tem_bloco: boolean
        tem_condomino?: boolean
        tem_inquilino?: boolean
        tem_proprietario?: boolean
        tem_condomino_aprovado?: boolean
        tem_inquilino_aprovado?: boolean
        tem_proprietario_aprovado?: boolean
        unidade_bloqueada_total?: boolean
        mensagem_bloqueio_geral?: string
        vinculos_permitidos?: string[]
        vinculos_bloqueados?: Record<string, string>
      }
      condominio: {
        nome: string
      }
    }>(`/backend/v1/publico/unidade/${encodeURIComponent(token)}`, {
      method: 'GET',
    })
  },

  async submeterCadastroMoradorPublico(dados: {
    token: string
    nome: string
    cpf: string
    data_nascimento: string
    email: string
    telefone: string
    vinculo: VinculoCadastro
    declaracao_vinculo?: string
    declaracao_assinatura?: string
    declaracao_data?: string
    declaracao_ip?: string
    indicacao_nome?: string
    indicacao_telefone?: string
  }) {
    return pb.send<{
      success: boolean
      message: string
      status: 'pendente' | 'aprovado'
    }>('/backend/v1/publico/cadastro-morador', {
      method: 'POST',
      body: dados,
    })
  },

  async garantirTokenUnidade(unidadeId: string) {
    return pb.send<{
      success: boolean
      token: string
      unidadeId: string
      identificador: string
      bloco?: string
    }>('/backend/v1/admin/unidades/garantir-token', {
      method: 'POST',
      body: { unidadeId },
    })
  },

  async enviarLinkCadastroEmail(dados: { unidadeId: string; email: string; link: string }) {
    return pb.send<{
      success: boolean
      message: string
    }>('/backend/v1/admin/unidades/enviar-link-email', {
      method: 'POST',
      body: dados,
    })
  },

  async aprovarCadastroUnidade(cadastroId: string) {
    return pb.send<{
      success: boolean
      message: string
    }>('/backend/v1/admin/cadastros/aprovar', {
      method: 'POST',
      body: { cadastroId },
    })
  },

  async rejeitarCadastroUnidade(cadastroId: string, motivo?: string) {
    return pb.send<{
      success: boolean
      message: string
    }>('/backend/v1/admin/cadastros/rejeitar', {
      method: 'POST',
      body: { cadastroId, motivo },
    })
  },

  // Troca obrigatória de senha no primeiro acesso (users.deve_trocar_senha=true).
  // O hook trocar_senha_obrigatoria.js valida a senha atual, grava a nova e limpa
  // o flag server-side; a senha nunca trafega em log ou resposta.
  async trocarSenhaObrigatoria(dados: {
    senha_atual: string
    nova_senha: string
    confirmacao_senha: string
  }) {
    return pb.send<{ success: boolean; message: string; deve_trocar_senha: boolean }>(
      '/backend/v1/usuario/trocar-senha',
      { method: 'POST', body: dados },
    )
  },

  async deleteItemPauta(id: string) {
    return pb.collection('itens_pauta').delete(id)
  },

  // Credenciamentos
  // O campo tipo_vinculo é select MULTIVALORADO no PocketBase: o runtime entrega
  // ["procurador"], ["condomino"] etc. Normalizamos para string na leitura —
  // as telas comparam valores ('procurador', 'locatario') e chamam .toUpperCase(),
  // que lançam TypeError sobre array e derrubam a árvore (tela branca, v0.0.220).
  normalizarTipoVinculo(valor: unknown): TipoVinculo | '' {
    if (Array.isArray(valor)) return (valor[0] as TipoVinculo) ?? ''
    if (typeof valor === 'string') return valor as TipoVinculo
    return ''
  },

  normalizarCredenciamento<T extends CredenciamentoRecord>(cred: T): T {
    return { ...cred, tipo_vinculo: this.normalizarTipoVinculo(cred.tipo_vinculo) }
  },

  async getCredenciamentos(filter?: string) {
    const lista = await pb.collection('credenciamentos').getFullList<CredenciamentoRecord>({
      filter,
      expand: 'unidade,aprovado_por',
      sort: '-created',
    })
    return lista.map((c) => this.normalizarCredenciamento(c))
  },

  async getCredenciamentoPorUnidade(unidadeId: string) {
    const list = await pb.collection('credenciamentos').getList<CredenciamentoRecord>(1, 1, {
      filter: pb.filter('unidade = {:unidade}', { unidade: unidadeId }),
      sort: '-created',
      expand: 'unidade',
    })
    return list.items[0] ? this.normalizarCredenciamento(list.items[0]) : null
  },

  async submeterCredenciamento(formData: FormData) {
    // create/update devolvem o registro cru (tipo_vinculo como array) — normaliza.
    const novo = await pb.collection('credenciamentos').create<CredenciamentoRecord>(formData)
    return this.normalizarCredenciamento(novo)
  },

  async aprovarCredenciamento(id: string, mesaUserId: string) {
    return pb.collection('credenciamentos').update<CredenciamentoRecord>(id, {
      status: 'aprovado',
      aprovado_por: mesaUserId,
      data_analise: new Date().toISOString(),
      motivo_rejeicao: '',
    })
  },

  async rejeitarCredenciamento(id: string, mesaUserId: string, motivo: string) {
    return pb.collection('credenciamentos').update<CredenciamentoRecord>(id, {
      status: 'rejeitado',
      aprovado_por: mesaUserId,
      data_analise: new Date().toISOString(),
      motivo_rejeicao: motivo,
    })
  },

  // Solicitações de credenciamento como procurador (migration 0052)
  async getSolicitacoesProcuracao(filter?: string) {
    return pb.collection('solicitacoes_procuracao').getFullList<SolicitacaoProcuracaoRecord>({
      filter,
      expand: 'deliberacao,unidade,solicitante',
      sort: '-created',
    })
  },

  async getMinhasSolicitacoesProcuracao(usuarioId: string) {
    return pb.collection('solicitacoes_procuracao').getFullList<SolicitacaoProcuracaoRecord>({
      filter: pb.filter('solicitante = {:uid}', { uid: usuarioId }),
      expand: 'deliberacao,unidade',
      sort: '-created',
    })
  },

  async criarSolicitacaoProcuracao(formData: FormData) {
    return pb.collection('solicitacoes_procuracao').create<SolicitacaoProcuracaoRecord>(formData)
  },

  async aprovarSolicitacaoProcuracao(id: string) {
    return pb.collection('solicitacoes_procuracao').update<SolicitacaoProcuracaoRecord>(id, {
      status: 'aprovado',
      motivo_rejeicao: '',
      aprovado_em: new Date().toISOString(),
    })
  },

  async rejeitarSolicitacaoProcuracao(id: string, motivo: string) {
    return pb.collection('solicitacoes_procuracao').update<SolicitacaoProcuracaoRecord>(id, {
      status: 'rejeitado',
      motivo_rejeicao: motivo,
      rejeitado_em: new Date().toISOString(),
    })
  },

  async cancelarSolicitacaoProcuracao(id: string) {
    return pb.collection('solicitacoes_procuracao').update<SolicitacaoProcuracaoRecord>(id, {
      status: 'cancelado',
      cancelado_pelo_solicitante: true,
      cancelado_em: new Date().toISOString(),
    })
  },

  // Presenças & Reconciliação
  async getPresencas(deliberacaoId: string) {
    return pb.collection('presencas').getFullList<PresencaRecord>({
      filter: pb.filter('deliberacao = {:delib}', { delib: deliberacaoId }),
      expand: 'unidade',
      sort: '-created',
    })
  },

  async registrarPresencaPresencial(deliberacaoId: string, unidadeId: string) {
    return pb.collection('presencas').create<PresencaRecord>({
      deliberacao: deliberacaoId,
      unidade: unidadeId,
      tipo: 'presencial',
      data_hora: new Date().toISOString(),
    })
  },

  // Comparecimentos (verificar se unidade já votou)
  async getComparecimento(deliberacaoId: string, unidadeId: string) {
    const list = await pb.collection('comparecimentos').getList<ComparecimentoRecord>(1, 1, {
      filter: pb.filter('deliberacao = {:delib} && unidade = {:unidade}', {
        delib: deliberacaoId,
        unidade: unidadeId,
      }),
    })
    return list.items[0] || null
  },

  async getComparecimentos(deliberacaoId: string) {
    return pb.collection('comparecimentos').getFullList<ComparecimentoRecord>({
      filter: pb.filter('deliberacao = {:delib}', { delib: deliberacaoId }),
      expand: 'unidade',
      sort: '-created',
    })
  },

  // Comprovantes
  async getComprovantesPorUnidade(unidadeId: string) {
    return pb.collection('comprovantes').getFullList<ComprovanteRecord>({
      filter: pb.filter('unidade = {:unidade}', { unidade: unidadeId }),
      expand: 'deliberacao,unidade',
      sort: '-created',
    })
  },

  async getComprovantePorCodigo(codigo: string) {
    const list = await pb.collection('comprovantes').getList<ComprovanteRecord>(1, 1, {
      filter: pb.filter('codigo_conferencia = {:cod}', { cod: codigo.trim().toUpperCase() }),
      expand: 'deliberacao,unidade',
    })
    return list.items[0] || null
  },

  // Auditoria
  async getAuditoriaEvents(limit = 100) {
    return pb.collection('auditoria_events').getList<AuditoriaEventRecord>(1, limit, {
      sort: '-sequencial',
      expand: 'unidade',
    })
  },

  // Hooks do Backend
  // 1. Enviar OTP
  async enviarOtp(dados: { unidadeId: string; cpf: string; deliberacaoId: string }) {
    return pb.send<{
      success: boolean
      sessaoId: string
      celularMascara: string
      expiraEmSegundos: number
      devOtpCode?: string
      message: string
    }>('/backend/v1/otp/send', {
      method: 'POST',
      body: dados,
    })
  },

  // 2. Validar OTP e obter token_voto
  async validarOtp(dados: { sessaoId: string; codigo: string }) {
    return pb.send<{
      success: boolean
      tokenVoto: string
      deliberacaoId: string
      unidadeId: string
      message: string
    }>('/backend/v1/otp/verify', {
      method: 'POST',
      body: dados,
    })
  },

  // 3. Registrar Voto Urna Criptográfica
  async registrarVoto(dados: {
    tokenVoto: string
    deliberacaoId: string
    votos: Array<{ itemId: string; opcao: string; declaracaoRepresentanteLegal?: boolean }>
    dispositivoId?: string
    declaracaoRepresentanteLegal?: boolean
  }) {
    return pb.send<{
      success: boolean
      reciboCodigo: string
      comprovanteId: string
      hashAbreviado: string
      dataHora: string
      deliberacaoId: string
      message: string
    }>('/backend/v1/votos/registrar', {
      method: 'POST',
      body: dados,
    })
  },

  // 4. Apuração e Boletim de Urna
  async getApuracao(deliberacaoId: string) {
    return pb.send<ApuracaoResponse>('/backend/v1/deliberacoes/apuracao', {
      method: 'GET',
      query: { deliberacaoId },
    })
  },

  // 5. Configurações do Condomínio
  async getConfiguracao(): Promise<CondoConfigRecord | null> {
    try {
      const list = await pb.collection('configuracoes').getList<CondoConfigRecord>(1, 1, {
        sort: '-created',
      })
      return list.items[0] || null
    } catch (err) {
      console.warn('Erro ao carregar configurações:', err)
      return null
    }
  },

  async updateConfiguracao(id: string, data: Partial<CondoConfigRecord> | FormData) {
    return pb.collection('configuracoes').update<CondoConfigRecord>(id, data)
  },

  // 5.1 Canais de envio do condomínio (E-mail, WhatsApp e SMTP próprio protegido)
  async getCanaisEnvio(): Promise<CanaisEnvioData> {
    try {
      const resp = await pb.send<{
        success: boolean
        data: CanaisEnvioData
      }>('/backend/v1/admin/canais-envio', {
        method: 'GET',
      })
      return resp.data || {}
    } catch (err: any) {
      console.warn(
        'Falha ao obter canais de envio via endpoint seguro, usando fallback da collection:',
        err,
      )
      const cfg = await this.getConfiguracao()
      return {
        email_oficial: cfg?.email_oficial || '',
        nome_remetente: cfg?.nome_remetente || '',
        whatsapp_oficial: cfg?.whatsapp_oficial || '',
        smtp_host: cfg?.smtp_host || '',
        smtp_port: cfg?.smtp_port || 587,
        smtp_user: cfg?.smtp_user || '',
        smtp_encryption: cfg?.smtp_encryption || 'starttls',
        smtp_ativo: cfg?.smtp_ativo || false,
        tem_senha_smtp: false,
      }
    }
  },

  // 5.2 Modelos de mensagem (WhatsApp/e-mail) editáveis pela mesa — campos
  // modelo_* da collection `configuracoes` (migration 0051). Texto vazio
  // limpa o campo (volta ao default histórico). `undefined` não é tocado.
  async salvarModelosMensagem(modelos: ModelosMensagemPayload): Promise<CondoConfigRecord> {
    const cfg = await this.getConfiguracao()
    if (!cfg?.id) {
      throw new Error('Configuração do condomínio não encontrada.')
    }
    const payload: Record<string, string> = {}
    for (const [chave, valor] of Object.entries(modelos)) {
      if (valor === undefined) continue
      const texto = valor.trim()
      if (texto === '') {
        payload[chave] = ''
      } else {
        payload[chave] = texto
      }
    }
    return this.updateConfiguracao(cfg.id, payload)
  },

  async salvarCanaisEnvio(payload: SalvarCanaisEnvioPayload): Promise<{
    success: boolean
    message: string
    data?: CanaisEnvioData
  }> {
    try {
      return await pb.send<{
        success: boolean
        message: string
        data: CanaisEnvioData
      }>('/backend/v1/admin/canais-envio', {
        method: 'POST',
        body: payload,
      })
    } catch (err: any) {
      const msg = getErrorMessage(err, 'Falha ao salvar canais de envio do condomínio.')
      const erroTratado = new Error(msg)
      ;(erroTratado as any).originalError = err
      ;(erroTratado as any).status = err?.status || 400
      throw erroTratado
    }
  },

  async testarCanalEnvioEmail(destinatario?: string): Promise<{
    success: boolean
    message: string
    canal?: string
    remetente?: string
    detalhe?: string
  }> {
    try {
      return await pb.send<{
        success: boolean
        message: string
        canal?: string
        remetente?: string
        detalhe?: string
      }>('/backend/v1/admin/canais-envio/testar', {
        method: 'POST',
        body: { destinatario },
      })
    } catch (err: any) {
      const msg = getErrorMessage(err, 'Falha ao enviar e-mail de teste.')
      const erroTratado = new Error(msg)
      ;(erroTratado as any).originalError = err
      ;(erroTratado as any).status = err?.status || 400
      throw erroTratado
    }
  },

  async testarCanalEnvioWhatsapp(numero: string): Promise<{
    success: boolean
    message: string
    data: {
      numero_formatado: string
      numero_internacional: string
      url_wame: string
      texto_mensagem: string
      data_hora: string
    }
  }> {
    try {
      return await pb.send<{
        success: boolean
        message: string
        data: {
          numero_formatado: string
          numero_internacional: string
          url_wame: string
          texto_mensagem: string
          data_hora: string
        }
      }>('/backend/v1/admin/canais-envio/testar-whatsapp', {
        method: 'POST',
        body: { numero },
      })
    } catch (err: any) {
      const msg = getErrorMessage(err, 'Falha ao processar teste de WhatsApp.')
      const erroTratado = new Error(msg)
      ;(erroTratado as any).originalError = err
      ;(erroTratado as any).status = err?.status || 400
      throw erroTratado
    }
  },

  /** Payload da mensagem direta individual (WhatsApp manual ou e-mail SMTP). */
  async enviarMensagemDireta(payload: {
    canal: 'email' | 'whatsapp'
    destinatario: string
    destinatario_nome?: string
    unidade?: string
    mensagem: string
    modelo?: string
    tela?: string
    assunto?: string
  }): Promise<{
    success: boolean
    message: string
    data?: { canal: string; data_hora: string }
  }> {
    try {
      return await pb.send<{
        success: boolean
        message: string
        data?: { canal: string; data_hora: string }
      }>('/backend/v1/admin/mensagem-direta', {
        method: 'POST',
        body: payload,
      })
    } catch (err: any) {
      const msg = getErrorMessage(err, 'Falha ao enviar a mensagem.')
      const erroTratado = new Error(msg)
      ;(erroTratado as any).originalError = err
      ;(erroTratado as any).status = err?.status || 400
      throw erroTratado
    }
  },

  // 6. Gerenciamento e Regeneração de unidades com Trava de Segurança
  async previewUnidades(dados: {
    tipo_condominio: TipoCondominio
    rotulo_unidade?: string
    grupos?: GrupoCondoConfig[]
    quantidadeBlocos?: number
    unidadesPorBloco?: number
    prefixoBloco?: string
  }) {
    return pb.send<{
      success: boolean
      totalProjetado: number
      totalExistentesNoBanco: number
      totalAtivasAtuais: number
      novasASeremCriadas: number
      preservadas: number
      preservadasForaDaMalha: number
      desativadasProjetadas: number
      totalFinalAtivas: number
      amostra: Array<{
        identificador: string
        bloco?: string
        grupo?: string
        andar?: string
        peso_voto?: number
        tipo_unidade?: string
        posicao_numero?: number
        status: 'existente' | 'nova'
      }>
    }>('/backend/v1/admin/unidades/preview', {
      method: 'POST',
      body: dados,
    })
  },

  async regenerarUnidades(dados: {
    tipo_condominio?: TipoCondominio
    rotulo_unidade?: string
    grupos?: GrupoCondoConfig[]
    quantidadeBlocos?: number
    unidadesPorBloco?: number
    prefixoBloco?: string
  }) {
    return pb.send<{
      success: boolean
      criadas: number
      preservadas: number
      desativadas: number
      preservadasForaDaMalha: number
      totalExistente: number
      message: string
    }>('/backend/v1/admin/unidades/regenerar', {
      method: 'POST',
      body: dados,
    })
  },

  async cadastrarUnidadeAvulsa(dados: {
    identificador: string
    bloco?: string
    tipo_unidade?: string
    peso_voto?: number
    responsavel_nome?: string
    contato_email?: string
    contato_celular?: string
    andar?: string
  }) {
    return pb.send<{
      success: boolean
      unidade: Partial<UnidadeRecord>
      message: string
    }>('/backend/v1/admin/unidades/avulsa', {
      method: 'POST',
      body: dados,
    })
  },

  // 7. Gestão de Usuários e Permissões (Módulo de Gestão)
  async getUsuarios(page = 1, perPage = 50, filter = '') {
    return pb.collection('users').getList<UserRecord>(page, perPage, {
      sort: '-created',
      filter: filter || undefined,
      expand: 'unidade',
    })
  },

  async getTodosUsuarios() {
    return pb.collection('users').getFullList<UserRecord>({
      sort: '-created',
      expand: 'unidade,unidades',
    })
  },

  async criarUsuarioGestao(dados: {
    name: string
    email: string
    password?: string
    cpf?: string
    role: UserRole
    unidade?: string
    unidades?: string[]
    ativo?: boolean
    enviarConvite?: boolean
  }) {
    try {
      return await pb.send<{
        success: boolean
        message: string
        conviteEnviado?: boolean
        user: UserRecord
      }>('/backend/v1/admin/usuarios/criar', {
        method: 'POST',
        body: dados,
      })
    } catch (err: any) {
      const msg = getErrorMessage(err, 'Falha ao cadastrar usuário na base do condomínio.')
      const erroTratado = new Error(msg)
      ;(erroTratado as any).originalError = err
      ;(erroTratado as any).status = err?.status || 400
      ;(erroTratado as any).data = err?.data || err?.response?.data
      throw erroTratado
    }
  },

  async atualizarUsuarioGestao(dados: {
    id: string
    name?: string
    role?: UserRole
    cpf?: string
    unidade?: string
    unidades?: string[]
    ativo?: boolean
  }) {
    try {
      return await pb.send<{
        success: boolean
        message: string
        user: UserRecord
      }>('/backend/v1/admin/usuarios/atualizar', {
        method: 'POST',
        body: dados,
      })
    } catch (err: any) {
      const msg = getErrorMessage(err, 'Falha ao atualizar dados e permissões do usuário.')
      const erroTratado = new Error(msg)
      ;(erroTratado as any).originalError = err
      ;(erroTratado as any).status = err?.status || 400
      ;(erroTratado as any).data = err?.data || err?.response?.data
      throw erroTratado
    }
  },

  async redefinirSenhaUsuarioGestao(id: string) {
    try {
      return await pb.send<{
        success: boolean
        message: string
      }>('/backend/v1/admin/usuarios/redefinir-senha', {
        method: 'POST',
        body: { id },
      })
    } catch (err: any) {
      const msg = getErrorMessage(err, 'Falha ao disparar e-mail de redefinição de senha.')
      const erroTratado = new Error(msg)
      ;(erroTratado as any).originalError = err
      ;(erroTratado as any).status = err?.status || 400
      ;(erroTratado as any).data = err?.data || err?.response?.data
      throw erroTratado
    }
  },

  async getLogsAcesso(filtros?: { userId?: string; email?: string; limit?: number }) {
    const limit = filtros?.limit || 50
    let filter = ''
    if (filtros?.userId) {
      filter = pb.filter('user = {:uid}', { uid: filtros.userId })
    } else if (filtros?.email) {
      filter = pb.filter('email = {:em}', { em: filtros.email.trim().toLowerCase() })
    }
    return pb.collection('logs_acesso').getList<LogAcessoRecord>(1, limit, {
      filter: filter || undefined,
      sort: '-data_hora',
      expand: 'user',
    })
  },

  async registrarLogFalhaAutenticacao(email: string, motivo?: string) {
    try {
      await pb.send('/backend/v1/auth/log-falha', {
        method: 'POST',
        body: { email, motivo },
      })
    } catch (_) {
      // Ignorar falhas secundárias ao logar tentativa
    }
  },

  async updateUsuario(id: string, data: Partial<UserRecord>) {
    return pb.collection('users').update<UserRecord>(id, data)
  },

  async createUsuario(data: Record<string, any>) {
    return pb.collection('users').create<UserRecord>(data)
  },

  async deleteUsuario(id: string) {
    return pb.collection('users').delete(id)
  },

  // Auditoria genérica de ações administrativas
  async registrarEventoAuditoria(dados: {
    evento: AuditoriaEventRecord['evento']
    fator: string
    dispositivo?: string
    unidade?: string
  }) {
    try {
      return await pb.collection('auditoria_events').create({
        evento: dados.evento,
        data_hora: new Date().toISOString(),
        fator: dados.fator,
        dispositivo: dados.dispositivo || 'painel-admin',
        unidade: dados.unidade || null,
      })
    } catch (err) {
      console.warn('Erro ao registrar evento de auditoria:', err)
      return null
    }
  },

  // 8. Módulo de Documentos da Pauta
  async getDocumentosPauta(deliberacaoId: string) {
    return pb.collection('documentos_pauta').getFullList<DocumentoPautaRecord>({
      filter: pb.filter('deliberacao = {:delib}', { delib: deliberacaoId }),
      sort: 'ordem,created',
      expand: 'criado_por',
    })
  },

  async uploadDocumentoPauta(formData: FormData) {
    return pb.collection('documentos_pauta').create<DocumentoPautaRecord>(formData)
  },

  async deleteDocumentoPauta(id: string) {
    return pb.collection('documentos_pauta').delete(id)
  },

  // 9. Assinaturas de Documentos
  async getAssinaturasDocumento(documentoId: string) {
    return pb.collection('assinaturas_documento').getFullList<AssinaturaDocumentoRecord>({
      filter: pb.filter('documento_id = {:docId}', { docId: documentoId }),
      sort: '-created',
    })
  },

  async getAssinaturasPorDeliberacao(deliberacaoId: string) {
    return pb.collection('assinaturas_documento').getFullList<AssinaturaDocumentoRecord>({
      filter: pb.filter('deliberacao = {:delib}', { delib: deliberacaoId }),
      sort: '-created',
    })
  },

  async registrarAssinaturaDocumento(dados: Partial<AssinaturaDocumentoRecord>) {
    const payload = {
      ...dados,
      data_hora: dados.data_hora || new Date().toISOString(),
      status: 'valida' as const,
    }

    // Tentativa com retry automático único em caso de instabilidade de transporte de rede móvel
    const tentar = async () => {
      return await pb
        .collection('assinaturas_documento')
        .create<AssinaturaDocumentoRecord>(payload, {
          requestKey: null, // Desativar autocancelamento de requisições simultâneas
        })
    }

    try {
      return await tentar()
    } catch (err: any) {
      const isRede =
        !err?.status ||
        err?.status === 0 ||
        err?.message?.includes('Failed to fetch') ||
        err?.message?.includes('NetworkError') ||
        err?.name === 'ClientResponseError 0'
      if (isRede) {
        await new Promise((res) => setTimeout(res, 600))
        return await tentar()
      }
      throw err
    }
  },

  // 10. Presenças com Assinatura Eletrônica e Procurações
  async getPresencasAssinatura(deliberacaoId: string) {
    return pb.collection('presencas_assinatura').getFullList<PresencaAssinaturaRecord>({
      filter: pb.filter('deliberacao = {:delib}', { delib: deliberacaoId }),
      sort: 'unidade.identificador',
      expand: 'unidade',
    })
  },

  async salvarPresencaAssinatura(
    formData: FormData | Partial<PresencaAssinaturaRecord>,
    id?: string,
  ) {
    const tentar = async () => {
      if (id) {
        return await pb
          .collection('presencas_assinatura')
          .update<PresencaAssinaturaRecord>(id, formData, {
            requestKey: null,
          })
      }
      return await pb
        .collection('presencas_assinatura')
        .create<PresencaAssinaturaRecord>(formData, {
          requestKey: null,
        })
    }

    try {
      return await tentar()
    } catch (err: any) {
      const isRede =
        !err?.status ||
        err?.status === 0 ||
        err?.message?.includes('Failed to fetch') ||
        err?.message?.includes('NetworkError') ||
        err?.name === 'ClientResponseError 0'
      if (isRede) {
        await new Promise((res) => setTimeout(res, 600))
        return await tentar()
      }
      throw err
    }
  },

  // 11. Notificações por E-mail
  async getNotificacoes(deliberacaoId?: string) {
    const filter = deliberacaoId
      ? pb.filter('deliberacao = {:delib}', { delib: deliberacaoId })
      : undefined
    return pb.collection('notificacoes').getFullList<NotificacaoRecord>({
      filter,
      sort: '-created',
      expand: 'deliberacao',
    })
  },

  async dispararEditalConvocacao(dados: {
    deliberacaoId: string
    tituloEdital?: string
    resumoPauta?: string
    dataAssembleia?: string
    linkApp?: string
    pdfBase64?: string
    pdfNome?: string
    hashDocumento?: string
    whatsappLinks?: string[]
  }) {
    return pb.send<{
      success: boolean
      totalDestinatarios: number
      totalCriados: number
      message: string
    }>('/backend/v1/notificacoes/disparar-edital', {
      method: 'POST',
      body: dados,
    })
  },

  async reenviarNotificacao(notificacaoId: string) {
    return pb.send<{
      success: boolean
      message: string
      status?: string
      mensagemErro?: string
    }>('/backend/v1/notificacoes/reenviar', {
      method: 'POST',
      body: { notificacaoId },
    })
  },

  // Disparo de Acesso ao Locatário pela Mesa
  async dispararAcessoLocatario(payload: {
    deliberacaoId: string
    unidadeId: string
    locatarioEmail?: string
    locatarioTelefone?: string
    locatarioNome?: string
    motivo?: string
  }) {
    return pb.send<{
      success: boolean
      message: string
      emailEnviado: boolean
      destinatarioEmail?: string
      destinatarioNome?: string
      destinatarioTelefone?: string
      whatsappUrl?: string | null
    }>('/backend/v1/mesa/locatario/disparar-acesso', {
      method: 'POST',
      body: payload,
    })
  },

  // 12. Edital Editável e Persistente
  async getEditalPorDeliberacao(deliberacaoId: string) {
    const list = await pb.collection('editais_deliberacao').getList<EditalDeliberacaoRecord>(1, 1, {
      filter: pb.filter('deliberacao = {:delib}', { delib: deliberacaoId }),
      sort: '-created',
    })
    return list.items[0] || null
  },

  async salvarEditalDeliberacao(
    deliberacaoId: string,
    dados: Partial<EditalDeliberacaoRecord>,
    idExistente?: string,
  ) {
    const payload = {
      ...dados,
      deliberacao: deliberacaoId,
    }

    const tentar = async () => {
      if (idExistente) {
        return await pb
          .collection('editais_deliberacao')
          .update<EditalDeliberacaoRecord>(idExistente, payload, {
            requestKey: null,
          })
      }

      // Tentar localizar se já existe para atualizar ao invés de duplicar
      try {
        const existente = await this.getEditalPorDeliberacao(deliberacaoId)
        if (existente) {
          return await pb
            .collection('editais_deliberacao')
            .update<EditalDeliberacaoRecord>(existente.id, payload, {
              requestKey: null,
            })
        }
      } catch {
        /* intentionally ignored */
      }

      return await pb.collection('editais_deliberacao').create<EditalDeliberacaoRecord>(payload, {
        requestKey: null,
      })
    }

    try {
      return await tentar()
    } catch (err: any) {
      const isRede =
        !err?.status ||
        err?.status === 0 ||
        err?.message?.includes('Failed to fetch') ||
        err?.message?.includes('NetworkError') ||
        err?.name === 'ClientResponseError 0'
      if (isRede) {
        await new Promise((res) => setTimeout(res, 600))
        return await tentar()
      }
      throw err
    }
  },

  // 13. Módulo de Ata da Assembleia (Fase 2)
  async getAtaPorDeliberacao(deliberacaoId: string) {
    const list = await pb.collection('atas_assembleia').getList<AtaAssembleiaRecord>(1, 1, {
      filter: pb.filter('deliberacao = {:delib}', { delib: deliberacaoId }),
      sort: '-created',
      expand: 'deliberacao',
    })
    return list.items[0] || null
  },

  async getAta(id: string) {
    return pb.collection('atas_assembleia').getOne<AtaAssembleiaRecord>(id, {
      expand: 'deliberacao',
    })
  },

  async salvarAta(
    deliberacaoId: string,
    dados: Partial<AtaAssembleiaRecord>,
    idExistente?: string,
  ) {
    const payload = {
      ...dados,
      deliberacao: deliberacaoId,
    }

    const tentar = async () => {
      if (idExistente) {
        return await pb
          .collection('atas_assembleia')
          .update<AtaAssembleiaRecord>(idExistente, payload, {
            requestKey: null,
          })
      }

      try {
        const existente = await this.getAtaPorDeliberacao(deliberacaoId)
        if (existente) {
          return await pb
            .collection('atas_assembleia')
            .update<AtaAssembleiaRecord>(existente.id, payload, {
              requestKey: null,
            })
        }
      } catch {
        /* intentionally ignored */
      }

      return await pb.collection('atas_assembleia').create<AtaAssembleiaRecord>(payload, {
        requestKey: null,
      })
    }

    try {
      return await tentar()
    } catch (err: any) {
      const isRede =
        !err?.status ||
        err?.status === 0 ||
        err?.message?.includes('Failed to fetch') ||
        err?.message?.includes('NetworkError') ||
        err?.name === 'ClientResponseError 0'
      if (isRede) {
        await new Promise((res) => setTimeout(res, 600))
        return await tentar()
      }
      throw err
    }
  },

  async gerarAtaComIa(deliberacaoId: string, textoBruto: string) {
    return pb.send<{
      success: boolean
      conteudoHtml: string
      hashRaizUrna?: string
      conversationId?: string
      message: string
    }>('/backend/v1/atas/gerar-ia', {
      method: 'POST',
      body: { deliberacaoId, textoBruto },
    })
  },

  async publicarAta(ataId: string, enviarEmail = false) {
    return pb.send<{
      success: boolean
      totalNotificados: number
      message: string
    }>('/backend/v1/atas/publicar', {
      method: 'POST',
      body: { ataId, enviarEmail },
    })
  },

  async transcreverAudioAta(deliberacaoId: string, audioBlob: Blob, duracaoSegundos = 0) {
    const formData = new FormData()
    formData.append('deliberacaoId', deliberacaoId)
    formData.append('duracaoSegundos', String(duracaoSegundos))
    // Definir nome de arquivo adequado conforme o mimeType do blob
    const extensao = audioBlob.type.includes('mp4')
      ? 'mp4'
      : audioBlob.type.includes('ogg')
        ? 'ogg'
        : audioBlob.type.includes('wav')
          ? 'wav'
          : 'webm'
    formData.append('arquivo', audioBlob, `audio_assembleia_${Date.now()}.${extensao}`)

    return pb.send<{
      success: boolean
      textoTranscrito?: string
      caracteres?: number
      duracaoSegundos?: number
      capabilityAvailable?: boolean
      message: string
    }>('/backend/v1/atas/transcrever-audio', {
      method: 'POST',
      body: formData,
    })
  },

  async extrairDocumentoAta(deliberacaoId: string, arquivo: File) {
    const formData = new FormData()
    formData.append('deliberacaoId', deliberacaoId)
    formData.append('arquivo', arquivo, arquivo.name)

    return pb.send<{
      success: boolean
      textoExtraido?: string
      caracteres?: number
      nomeArquivo?: string
      capabilityAvailable?: boolean
      ocrRequired?: boolean
      message: string
    }>('/backend/v1/atas/extrair-documento', {
      method: 'POST',
      body: formData,
    })
  },

  // 14. Histórico de Alterações de Dados (Auditoria Operacional)
  async getHistoricoAlteracoes(filtros?: {
    entidade?: string
    acao?: string
    userId?: string
    termo?: string
    dataInicio?: string
    dataFim?: string
    page?: number
    perPage?: number
  }) {
    const page = filtros?.page || 1
    const perPage = filtros?.perPage || 30
    const parts: string[] = []
    const params: Record<string, any> = {}

    if (filtros?.entidade && filtros.entidade !== 'todas') {
      parts.push('entidade = {:entidade}')
      params.entidade = filtros.entidade
    }

    if (filtros?.acao && filtros.acao !== 'todas') {
      parts.push('acao = {:acao}')
      params.acao = filtros.acao
    }

    if (filtros?.userId && filtros.userId !== 'todos') {
      parts.push('user = {:userId}')
      params.userId = filtros.userId
    }

    if (filtros?.dataInicio) {
      parts.push('data_hora >= {:dataInicio}')
      params.dataInicio = `${filtros.dataInicio} 00:00:00`
    }

    if (filtros?.dataFim) {
      parts.push('data_hora <= {:dataFim}')
      params.dataFim = `${filtros.dataFim} 23:59:59`
    }

    if (filtros?.termo && filtros.termo.trim()) {
      parts.push(
        '(registro_rotulo ~ {:termo} || user_nome ~ {:termo} || user_email ~ {:termo} || registro_id ~ {:termo})',
      )
      params.termo = filtros.termo.trim()
    }

    const filter = parts.length > 0 ? pb.filter(parts.join(' && '), params) : undefined

    return pb.collection('historico_alteracoes').getList<HistoricoAlteracaoRecord>(page, perPage, {
      filter,
      sort: '-data_hora',
      expand: 'user',
    })
  },

  // 15. Limpeza de Dados de Teste (Exclusivo Administradores)
  async limparDadosAmbiente() {
    return pb.send<{
      success: boolean
      message: string
      totalRemovidos: number
      detalhes: Array<{
        collection: string
        label: string
        removidos: number
      }>
    }>('/backend/v1/admin/limpar-dados', {
      method: 'POST',
    })
  },

  // 16. Sessões de Assinatura Eletrônica Mobile (QR Code)
  async criarSessaoAssinaturaMobile(dados: {
    documentoId?: string
    documentoTipo: 'edital' | 'ata' | 'lista_presenca' | 'dossie'
    deliberacaoId?: string
    tituloDocumento: string
    hashDocumento: string
    signatarioNome?: string
    signatarioCpf?: string
    signatarioCargo?: string
    permitirDataHistorica?: boolean
    dataHoraDeclarada?: string
  }) {
    return pb.send<{
      success: boolean
      token: string
      expiraEm: string
      tituloDocumento: string
      documentoTipo: string
      message?: string
    }>('/backend/v1/assinatura/sessao/criar', {
      method: 'POST',
      body: dados,
    })
  },

  async consultarSessaoAssinatura(token: string) {
    return pb.send<{
      success: boolean
      token: string
      status: 'pendente' | 'assinada' | 'expirada' | 'cancelada'
      documentoId?: string
      documentoTipo: string
      deliberacaoId?: string
      tituloDocumento: string
      hashDocumento: string
      signatarioNome: string
      signatarioCpf: string
      signatarioCargo: string
      permitirDataHistorica: boolean
      dataHoraDeclarada?: string
      expiraEm: string
      assinadoEm?: string
      formatoAssinatura?: 'desenho' | 'texto' | 'em_branco'
      assinaturaTexto?: string
      assinaturaVisual?: string
      canalAssinatura?: string
      message?: string
    }>(`/backend/v1/assinatura/sessao/${encodeURIComponent(token)}`, {
      method: 'GET',
    })
  },

  async confirmarAssinaturaMobile(
    token: string,
    dados: {
      nome: string
      cpf?: string
      formato: 'desenho' | 'texto' | 'em_branco'
      assinaturaVisual?: string
      assinaturaTexto?: string
      dataHoraDeclarada?: string
    },
  ) {
    return pb.send<{
      success: boolean
      message: string
      assinadoEm: string
      canal: string
    }>(`/backend/v1/assinatura/sessao/${encodeURIComponent(token)}/confirmar`, {
      method: 'POST',
      body: dados,
    })
  },

  async cancelarSessaoAssinatura(token: string) {
    return pb.send<{
      success: boolean
      message: string
    }>(`/backend/v1/assinatura/sessao/${encodeURIComponent(token)}/cancelar`, {
      method: 'POST',
    })
  },

  // 17. Integração ZapSign (Fase 3)
  async obterConfigZapsign(): Promise<{
    success: boolean
    configurado: boolean
    ambiente: 'sandbox' | 'producao'
    baseUrl: string
    temWebhookSecret: boolean
  }> {
    return pb.send<{
      success: boolean
      configurado: boolean
      ambiente: 'sandbox' | 'producao'
      baseUrl: string
      temWebhookSecret: boolean
    }>('/backend/v1/admin/zapsign/config', {
      method: 'GET',
    })
  },

  async salvarConfigZapsign(
    token: string,
    ambiente: 'sandbox' | 'producao',
    webhookSecret?: string,
  ): Promise<{
    success: boolean
    message: string
    configurado: boolean
    ambiente: 'sandbox' | 'producao'
    baseUrl: string
    temWebhookSecret: boolean
  }> {
    return pb.send<{
      success: boolean
      message: string
      configurado: boolean
      ambiente: 'sandbox' | 'producao'
      baseUrl: string
      temWebhookSecret: boolean
    }>('/backend/v1/admin/zapsign/config', {
      method: 'POST',
      body: {
        token,
        ambiente,
        webhook_secret: webhookSecret,
      },
    })
  },

  async enviarAtaZapsign(
    ataId: string,
    payload?:
      | {
          pdf_base64?: string
          signatarios?: Array<{ nome: string; email?: string; cpf?: string; telefone?: string }>
        }
      | Array<{ nome: string; email?: string; cpf?: string; telefone?: string }>,
  ): Promise<{
    success: boolean
    fallback: boolean
    modo_assinatura: ModoAssinaturaAta
    motivo?: string
    message: string
    documento_token?: string
    doc_token?: string
    status?: string
    signatarios?: ZapSignSignatarioUrl[]
  }> {
    const body = Array.isArray(payload) ? { signatarios: payload } : payload || {}
    return pb.send<{
      success: boolean
      fallback: boolean
      modo_assinatura: ModoAssinaturaAta
      motivo?: string
      message: string
      documento_token?: string
      doc_token?: string
      status?: string
      signatarios?: ZapSignSignatarioUrl[]
    }>(`/backend/v1/atas/${encodeURIComponent(ataId)}/enviar-zapsign`, {
      method: 'POST',
      body,
    })
  },

  async enviarEditalZapsign(
    editalId: string,
    payload: {
      deliberacaoId: string
      nomeDocumento?: string
      pdfBase64: string
      signatarios: Array<{
        nome: string
        cpf?: string
        email?: string
        telefone?: string
        cargo?: string
      }>
    },
  ): Promise<{
    success: boolean
    fallback: boolean
    motivo?: string
    message: string
    documento_token?: string
    status?: string
    zapsign_status?: string
    zapsign_urls?: ZapSignSignatarioUrl[]
  }> {
    return pb.send<{
      success: boolean
      fallback: boolean
      motivo?: string
      message: string
      documento_token?: string
      status?: string
      zapsign_status?: string
      zapsign_urls?: ZapSignSignatarioUrl[]
    }>(`/backend/v1/editais/${encodeURIComponent(editalId)}/enviar-zapsign`, {
      method: 'POST',
      body: payload,
    })
  },

  async enviarListaPresencaZapsign(
    listaPresencaId: string,
    payload: {
      deliberacaoId: string
      nomeDocumento?: string
      pdfBase64: string
      signatarios: Array<{
        nome: string
        cpf?: string
        email?: string
        telefone?: string
        cargo?: string
      }>
    },
  ): Promise<{
    success: boolean
    fallback: boolean
    motivo?: string
    message: string
    documento_token?: string
    status?: string
    zapsign_status?: string
    zapsign_urls?: ZapSignSignatarioUrl[]
  }> {
    return pb.send<{
      success: boolean
      fallback: boolean
      motivo?: string
      message: string
      documento_token?: string
      status?: string
      zapsign_status?: string
      zapsign_urls?: ZapSignSignatarioUrl[]
    }>(`/backend/v1/listas-presenca/${encodeURIComponent(listaPresencaId)}/enviar-zapsign`, {
      method: 'POST',
      body: payload,
    })
  },

  // Configuração Groq (transcrição de áudio da mesa)
  async obterConfigGroq(): Promise<{ success: boolean; configurado: boolean; message?: string }> {
    return pb.send<{ success: boolean; configurado: boolean; message?: string }>(
      '/backend/v1/admin/groq/config',
      { method: 'GET' },
    )
  },

  async salvarConfigGroq(apiKey: string): Promise<{
    success: boolean
    message: string
    configurado: boolean
  }> {
    return pb.send<{ success: boolean; message: string; configurado: boolean }>(
      '/backend/v1/admin/groq/config',
      { method: 'POST', body: { api_key: apiKey } },
    )
  },

  async criarListaPresenca(dados: {
    deliberacao: string
    titulo?: string
    status?: 'rascunho' | 'assinado' | 'publicado'
  }): Promise<ListaPresencaDocumentoRecord> {
    return pb
      .collection('listas_presenca')
      .create<ListaPresencaDocumentoRecord>(dados, { requestKey: null })
  },

  async obterListaPresencaDocumento(
    deliberacaoId: string,
  ): Promise<ListaPresencaDocumentoRecord | null> {
    try {
      const list = await pb
        .collection('listas_presenca')
        .getList<ListaPresencaDocumentoRecord>(1, 1, {
          filter: pb.filter('deliberacao = {:delib}', { delib: deliberacaoId }),
          sort: '-created',
        })
      return list.items[0] || null
    } catch {
      return null
    }
  },

  async salvarListaPresencaDocumento(
    deliberacaoId: string,
    dados: Partial<ListaPresencaDocumentoRecord>,
    idExistente?: string,
  ): Promise<ListaPresencaDocumentoRecord> {
    const payload = { ...dados, deliberacao: deliberacaoId }
    if (idExistente) {
      return pb
        .collection('listas_presenca')
        .update<ListaPresencaDocumentoRecord>(idExistente, payload, { requestKey: null })
    }
    return pb
      .collection('listas_presenca')
      .create<ListaPresencaDocumentoRecord>(payload, { requestKey: null })
  },

  // ===== Voto presencial (migration 0053) =====

  async salvarModalidadePresencial(deliberacaoId: string, modalidade: ModalidadePresencial) {
    return pb.collection('deliberacoes').update<DeliberacaoRecord>(deliberacaoId, {
      modalidade_presencial: modalidade,
    })
  },

  async getLancamentosFisicos(deliberacaoId: string): Promise<LancamentoFisicoRecord[]> {
    try {
      const list = await pb.collection('lancamentos_fisicos').getFullList<LancamentoFisicoRecord>({
        filter: pb.filter('deliberacao = {:d}', { d: deliberacaoId }),
        sort: 'item,created',
      })
      return list
    } catch (err) {
      if ((err as { status?: number })?.status === 404) return []
      throw new Error(getErrorMessage(err, 'Falha ao carregar lançamentos físicos.'))
    }
  },

  async salvarLancamentoFisico(payload: {
    deliberacaoId: string
    itemId: string
    favoraveis: number
    contrarios: number
    abstencoes: number
    /** Migration 0055 — contagem por candidato (item do modo eleição) */
    votosPorCandidato?: number[]
    observacao?: string
  }): Promise<{ success: boolean; message: string }> {
    return pb.send('/backend/v1/votos/lancamento-fisico', {
      method: 'POST',
      body: payload,
    })
  },

  async gerarCodigoUsoUnico(payload: {
    deliberacaoId: string
    unidadeId: string
    expiraEmHoras?: number
  }): Promise<{
    success: boolean
    message: string
    codigo?: string
    codigoId?: string
    expiraEm?: string
  }> {
    return pb.send('/backend/v1/estacao/codigo-gerar', {
      method: 'POST',
      body: payload,
    })
  },

  async revogarCodigoUsoUnico(codigoId: string): Promise<{ success: boolean; message: string }> {
    return pb.send('/backend/v1/estacao/codigo-revogar', {
      method: 'POST',
      body: { codigoId },
    })
  },

  async listarCodigosUsoUnico(deliberacaoId: string): Promise<CodigoUsoUnicoRecord[]> {
    try {
      const list = await pb.collection('codigos_uso_unico').getFullList<CodigoUsoUnicoRecord>({
        filter: pb.filter('deliberacao = {:d}', { d: deliberacaoId }),
        sort: '-created',
      })
      return list
    } catch {
      return []
    }
  },

  // ===== Estação de voto presencial =====

  async estacaoLogin(payload: {
    deliberacaoId: string
    cpf: string
    senha?: string
    codigo?: string
  }): Promise<{
    success: boolean
    message?: string
    tokenVoto?: string
    unidadeId?: string
    unidadeIdentificador?: string
    nomeTitular?: string
    vinculoVotante?: string
    modo?: 'senha' | 'codigo'
  }> {
    return pb.send('/backend/v1/estacao/login', {
      method: 'POST',
      body: payload,
    })
  },

  // ===== Google Meet (Fase 1) — sala da assembleia =====

  async obterMeetConfig(): Promise<MeetConfigResponse> {
    try {
      return await pb.send<MeetConfigResponse>('/backend/v1/meet/config', { method: 'GET' })
    } catch (err) {
      if ((err as { status?: number })?.status === 404) {
        return { success: false, configurado: false, client_email: '' }
      }
      throw new Error(getErrorMessage(err, 'Falha ao consultar a configuração do Google Meet.'))
    }
  },

  async salvarMeetConfig(serviceAccountJson: string): Promise<MeetConfigResponse> {
    return pb.send<MeetConfigResponse>('/backend/v1/meet/config', {
      method: 'POST',
      body: { service_account: serviceAccountJson },
    })
  },

  async criarSalaMeet(deliberacaoId: string): Promise<MeetCriarSalaResponse> {
    return pb.send<MeetCriarSalaResponse>('/backend/v1/meet/criar-sala', {
      method: 'POST',
      body: { deliberacaoId },
    })
  },

  async estacaoRegistrarVoto(payload: {
    tokenVoto: string
    deliberacaoId: string
    votos: {
      itemId: string
      opcao: 'favoravel' | 'contrario' | 'abstencao' | `candidato:${number}`
    }[]
    dispositivoId?: string
  }): Promise<{
    success: boolean
    message?: string
    reciboCodigo?: string
    comprovanteId?: string
    hashAbreviado?: string
    dataHora?: string
  }> {
    return pb.send('/backend/v1/estacao/registrar-voto', {
      method: 'POST',
      body: payload,
    })
  },
}
