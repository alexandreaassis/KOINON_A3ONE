import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export type UserRole = 'morador' | 'mesa' | 'admin'

export interface UserRecord extends RecordModel {
  email: string
  name: string
  role: UserRole
  avatar?: string
  unidade?: string
  ativo?: boolean
  expand?: {
    unidade?: UnidadeRecord
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
}

export interface ItemPautaRecord extends RecordModel {
  deliberacao: string
  ordem: number
  titulo: string
  texto?: string
  quorum_aplicavel?: string
}

export interface CredenciamentoRecord extends RecordModel {
  unidade: string
  cpf: string
  titular_nome: string
  tipo_vinculo: 'proprietario' | 'promitente' | 'usufrutuario' | 'locatario' | 'procurador'
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
  expand?: {
    deliberacao?: DeliberacaoRecord
  }
}

export interface ApuracaoItemResult {
  id: string
  ordem: number
  titulo: string
  texto?: string
  quorum_aplicavel?: string
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
    return pb.collection('unidades').getOne<UnidadeRecord>(id)
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

  async getDeliberacaoAtiva() {
    const list = await pb.collection('deliberacoes').getList<DeliberacaoRecord>(1, 1, {
      filter: "status != 'PUBLICADA' && status != 'ENCERRADA'",
      sort: '-created',
    })
    if (list.items.length > 0) return list.items[0]
    // Se não tiver nenhuma em andamento, retorna a mais recente
    const anyList = await pb.collection('deliberacoes').getList<DeliberacaoRecord>(1, 1, {
      sort: '-created',
    })
    return anyList.items[0] || null
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

  async deleteItemPauta(id: string) {
    return pb.collection('itens_pauta').delete(id)
  },

  // Credenciamentos
  async getCredenciamentos(filter?: string) {
    return pb.collection('credenciamentos').getFullList<CredenciamentoRecord>({
      filter,
      expand: 'unidade,aprovado_por',
      sort: '-created',
    })
  },

  async getCredenciamentoPorUnidade(unidadeId: string) {
    const list = await pb.collection('credenciamentos').getList<CredenciamentoRecord>(1, 1, {
      filter: pb.filter('unidade = {:unidade}', { unidade: unidadeId }),
      sort: '-created',
      expand: 'unidade',
    })
    return list.items[0] || null
  },

  async submeterCredenciamento(formData: FormData) {
    return pb.collection('credenciamentos').create<CredenciamentoRecord>(formData)
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
    votos: Array<{ itemId: string; opcao: string }>
    dispositivoId?: string
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

  // 7. Gestão de Usuários (Módulo Admin)
  async getUsuarios() {
    return pb.collection('users').getFullList<UserRecord>({
      sort: '-created',
      expand: 'unidade',
    })
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
    return pb.collection('assinaturas_documento').create<AssinaturaDocumentoRecord>({
      ...dados,
      data_hora: dados.data_hora || new Date().toISOString(),
      status: 'valida',
    })
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
    if (id) {
      return pb.collection('presencas_assinatura').update<PresencaAssinaturaRecord>(id, formData)
    }
    return pb.collection('presencas_assinatura').create<PresencaAssinaturaRecord>(formData)
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
}
