/**
 * Configuração de Assinatura e Parametrização da Organização (Fase 2)
 * --------------------------------------------------------------------
 * Fonte única de verdade para os parâmetros usados por edital, ata e selos:
 * nome da organização, tipo, cargo do signatário, documento normativo e citação
 * de seus artigos, regra de procuração, prazo de convocação, cláusula de aceite
 * e instruções de acesso/votação eletrônica do edital.
 *
 * Os textos jurídicos aqui produzidos são SEMPRE marcados como
 * "A validar por advogado" — a plataforma não presta consultoria jurídica.
 */

export interface InstrucoesAcessoVotacaoCfg {
  modalidade: string
  linkAcesso: string
  formaAutenticacao: string
  janelaVotacao: string
  formaPedirPalavra: string
  formaColetaVoto: string
  contatoSuporte: string
  avisoResponsabilidade: string
}

export interface ConfiguracaoOrganizacao {
  /** Identificador interno da organização (multi-organização futuro) */
  organization_id: string
  nome_organizacao: string
  /** condominio | associacao | outro */
  tipo_organizacao: 'condominio' | 'associacao' | 'outro'
  /** Cargo do signatário dos documentos (ex.: "Síndico", "Presidente") */
  cargo_signatario: string
  /** Nome do documento normativo (ex.: "Convenção", "Estatuto") */
  nome_documento_normativo: string
  /** Artigos do documento normativo citáveis nos documentos (ex.: "art. 12") */
  artigo_documento_normativo: string
  /** Citação legal de regra de assembleia — configurável por tipo de organização */
  citacao_legal_assembleia: string
  /** Prazo mínimo (dias) de antecedência da convocação */
  prazo_minimo_convocacao_dias: number
  /** regra escolhida para procuração */
  regra_procuracao: 'firma_ou_eletronica_avancada' | 'procuracao_simples'
  /** link público de verificação do documento assinado (preparado, página em fase futura) */
  link_verificacao_assinatura: string
  /** cláusula de aceite do método — versão e status */
  clausula_aceite_versao: number
  clausula_aceite_status: 'rascunho_aprovado_mesa' | 'incorporada_normativo'
  clausula_aceite_texto: string
  instrucoes_acesso: InstrucoesAcessoVotacaoCfg
}

export const MARCA_VALIDACAO_ADVOGADO = 'TEXTO-MODELO — A VALIDAR POR ADVOGADO'

export const TIPOS_ORGANIZACAO: Array<{
  valor: ConfiguracaoOrganizacao['tipo_organizacao']
  rotulo: string
}> = [
  { valor: 'condominio', rotulo: 'Condomínio' },
  { valor: 'associacao', rotulo: 'Associação' },
  { valor: 'outro', rotulo: 'Outro' },
]

/** Prazo de convocação default — condomínios: 8 dias (art. 1.351 CC); editável. */
export const PRAZO_DEFAULT_DIAS = 8

export const CITACAO_LEGAL_POR_TIPO: Record<ConfiguracaoOrganizacao['tipo_organizacao'], string> = {
  condominio: 'Código Civil, arts. 1.347 a 1.354-A',
  associacao: 'Código Civil, arts. 51 a 61 (e Estatuto social)',
  outro: 'Documento normativo da organização',
}

export function citacaoLegalSugerida(tipo: ConfiguracaoOrganizacao['tipo_organizacao']): string {
  return CITACAO_LEGAL_POR_TIPO[tipo] || CITACAO_LEGAL_POR_TIPO.outro
}

/**
 * Cláusula de aceite do método de assinatura eletrônica (texto-modelo, versão 1).
 * Admite a assinatura eletrônica adotada (nativa e/ou ZapSign futura) como válida
 * para convocações, atas, procurações e demais atos, citando o art. 10, §2º da
 * MP 2.200-2/2001 e a Lei 14.063/2020.
 */
export function gerarClausulaAceite(cfg: {
  nome_organizacao: string
  nome_documento_normativo: string
  cargo_signatario: string
}): string {
  return [
    `CLÁUSULA DE ACEITE DO MÉTODO DE ASSINATURA ELETRÔNICA — ${cfg.nome_organizacao}`,
    ``,
    `1. A ${cfg.nome_organizacao} adota, como método válido de assinatura de documentos, a assinatura eletrônica executada na plataforma Koinon, caracterizada pela captura de traço manuscrito ou digitação do nome do signatário, registro de data e hora com segundos, identificação do signatário (nome, CPF e cargo) e geração de hash criptográfico SHA-256 do conteúdo assinado, com trilha de auditoria registrada.`,
    ``,
    `2. As partes declaram aceitar que a autoria e a integridade dos documentos assim assinados — incluindo editais de convocação, atas de assembleia, procurações e demais atos da ${cfg.nome_organizacao} — são comprovadas por outro meio, nos termos do art. 10, §2º da Medida Provisória nº 2.200-2/2001, desde que aceito pelas partes, e classificam o método como assinatura eletrônica simples ou avançada, conforme a Lei nº 14.063/2020, observados os controles efetivamente aplicados em cada assinatura.`,
    ``,
    `3. Este método independe de certificado digital emitido pela ICP-Brasil e não invoca a presunção de veracidade do art. 10, §1º da MP 2.200-2/2001.`,
    ``,
    `4. Quando exigida assinatura eletrônica avançada ou qualificada — inclusive para procurações —, poderá ser utilizada solução de assinatura com certificação digital ou controles reforçados de identificação, nos termos acordados.`,
    ``,
    `5. A menção a este método constará do ${cfg.nome_documento_normativo} da ${cfg.nome_organizacao} e/ou de cláusula aprovada em assembleia, competindo ao ${cfg.cargo_signatario} certificar-se de sua vigência antes da lavratura de atos formais.`,
  ].join('\n')
}

/**
 * Texto-modelo da cláusula de procuração, conforme a regra escolhida pela organização.
 */
export function gerarTextoProcuracao(regra: ConfiguracaoOrganizacao['regra_procuracao']): string {
  if (regra === 'procuracao_simples') {
    return (
      'O condômino poderá representar-se em assembleia por procuração simples, outorgada a outro condômino, ' +
      'constando nome, unidade e assinatura do outorgante, aceita pela mesa diretora sem exigência de firma reconhecida.'
    )
  }
  return (
    'O condômino poderá representar-se em assembleia por procuração, que deverá conter firma reconhecida ' +
    'ou assinatura eletrônica avançada/qualificada do outorgante (Lei nº 14.063/2020), sendo vedada a procuração ' +
    'sem um desses elementos.'
  )
}

/** Aviso exibido ao credenciamento conforme a regra de procuração escolhida. */
export function avisoProcuracaoCredenciamento(
  regra: ConfiguracaoOrganizacao['regra_procuracao'],
): string {
  if (regra === 'procuracao_simples') {
    return 'Procuração simples aceita: basta assinar o instrumento de procuração — não é exigida firma reconhecida.'
  }
  return 'Procuração exige firma reconhecida ou assinatura eletrônica avançada/qualificada do outorgante.'
}

/** Extrapola o prazo mínimo de convocação para a data-limite sugerida (dd/mm/aaaa). */
export function dataLimiteConvocacao(dataAssembleia: string, prazoDias: number): string | null {
  const d = new Date(dataAssembleia)
  if (isNaN(d.getTime()) || !prazoDias || prazoDias <= 0) return null
  d.setDate(d.getDate() - prazoDias)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Verifica se a data da assembleia está abaixo do prazo mínimo de convocação. */
export function assembleiaAbaixoDoPrazo(dataAssembleia: string, prazoDias: number): boolean {
  const alvo = new Date(dataAssembleia)
  if (isNaN(alvo.getTime()) || !prazoDias || prazoDias <= 0) return false
  const limite = new Date(alvo)
  limite.setDate(limite.getDate() - prazoDias)
  limite.setHours(23, 59, 59, 999)
  return Date.now() > limite.getTime()
}
