/**
 * Honestidade do Selo de Assinatura Eletrônica (Fase 1)
 * ------------------------------------------------------
 * Função ÚNICA de decisão do texto do selo, usada por TODOS os pontos que exibem selo:
 * SeloAssinaturaCriptografica, BlocoAssinaturaCompacto, pdfEdital, pdfAta e demais PDFs.
 *
 * Regras (decisão do usuário):
 * - "simples" por padrão;
 * - "avançada" SOMENTE quando os controles estiverem realmente ativos e verificados:
 *   cadastro verificado do signatário + reautenticação/step-up no ato + 2FA ativo;
 * - o 2FA por e-mail existente SUSTENTA "simples", NÃO "avançada";
 * - nunca declarar ICP-Brasil sem certificado ICP-Brasil;
 * - nunca declarar "data certificada" sem carimbo do tempo de ACT;
 * - o selo cita APENAS o art. 10, §2º da MP 2.200-2/2001 (outro meio de comprovar
 *   autoria e integridade, desde que aceito pelas partes) e, como referência,
 *   a Lei 14.063/2020 — sem jamais alegar presunção do §1º ou "conformidade".
 */

export type NivelSelo = 'simples' | 'avancada'

export interface RequisitosAssinatura {
  /** Cadastro do signatário verificado/aprovado pela mesa */
  cadastroVerificado?: boolean
  /** Reautenticação (step-up) realizada no ato da assinatura */
  reautenticacaoNoAto?: boolean
  /** Segundo fator realmente ativo (além do e-mail — e-mail sozinho NÃO é 2FA aqui) */
  doisFatoresAtivo?: boolean
  /** Carimbo do tempo de ACT (Autoridade de Carimbo do Tempo) */
  carimboTempoAct?: boolean
  /** Certificado digital ICP-Brasil */
  certificadoIcpBrasil?: boolean
}

export interface SeloDecidido {
  nivel: NivelSelo
  rotulo: string
  textoLegal: string
  /** Descrição curta exibida no cabeçalho do selo */
  descricao: string
  /** Rodapé legal do selo (TEXTO_LEGAL_SELO) */
  rodapeLegal: string
  exigeAtencao: boolean
}

/** Rodapé legal padrão citado pelo selo — NUNCA alegar "conformidade" ou presunção do §1º. */
export const TEXTO_LEGAL_SELO =
  'Assinatura eletrônica: autoria e integridade comprovadas por outro meio com a anuência das partes (art. 10, §2º da MP 2.200-2/2001); classificação de referência conforme a Lei 14.063/2020.'

/**
 * Decide o nível e o texto do selo a partir dos requisitos EFETIVAMENTE cumpridos.
 * "Avançada" exige os três controles simultâneos; qualquer faltante rebaixa para "simples".
 */
export function decidirSelo(requisitos?: RequisitosAssinatura | null): SeloDecidido {
  const r = requisitos || {}
  const avancada = !!r.cadastroVerificado && !!r.reautenticacaoNoAto && !!r.doisFatoresAtivo

  if (avancada) {
    return {
      nivel: 'avancada',
      rotulo: 'Assinatura eletrônica avançada',
      textoLegal:
        'Assinatura eletrônica avançada (referência: Lei 14.063/2020), com autoria e integridade comprovadas por outro meio com a anuência das partes (art. 10, §2º da MP 2.200-2/2001).',
      descricao:
        'Cadastro verificado, reautenticação no ato e 2FA ativos e verificados para este signatário.',
      rodapeLegal: TEXTO_LEGAL_SELO,
      exigeAtencao: false,
    }
  }

  const faltantes: string[] = []
  if (!r.cadastroVerificado) faltantes.push('cadastro verificado do signatário')
  if (!r.reautenticacaoNoAto) faltantes.push('reautenticação no ato')
  if (!r.doisFatoresAtivo) faltantes.push('2FA ativo (além do e-mail)')

  return {
    nivel: 'simples',
    rotulo: 'Assinatura eletrônica simples',
    textoLegal:
      'Assinatura eletrônica simples (referência: Lei 14.063/2020), com autoria e integridade comprovadas por outro meio com a anuência das partes (art. 10, §2º da MP 2.200-2/2001).' +
      (faltantes.length > 0 ? ` Não configurados nesta assinatura: ${faltantes.join('; ')}.` : ''),
    descricao:
      'Integridade garantida pelo hash SHA-256 registrado na plataforma; autoria declarada pelo signatário identificado.',
    rodapeLegal: TEXTO_LEGAL_SELO,
    exigeAtencao: faltantes.length > 0,
  }
}

/**
 * Campos obrigatórios do bloco "INSTRUÇÕES DE ACESSO E VOTAÇÃO ELETRÔNICA" do edital.
 * Retorna a lista do que FALTA (vazio = edital pode ser emitido).
 */
export interface InstrucoesAcessoVotacao {
  modalidade?: string
  linkAcesso?: string
  formaAutenticacao?: string
  janelaVotacao?: string
  formaPedirPalavra?: string
  formaColetaVoto?: string
  contatoSuporte?: string
  avisoResponsabilidade?: string
}

export function validarInstrucoesEdital(instr?: InstrucoesAcessoVotacao | null): string[] {
  if (!instr) {
    return [
      'Modalidade da assembleia',
      'Link de acesso à assembleia',
      'Forma de autenticação do participante',
      'Janela de votação eletrônica',
      'Como pedir a palavra (voz e debate)',
      'Como o voto é coletado e registrado',
      'Contato de suporte',
      'Aviso sobre falhas de equipamento/conexão',
    ]
  }
  const faltantes: string[] = []
  if (!instr.modalidade?.trim()) faltantes.push('Modalidade da assembleia')
  if (!instr.linkAcesso?.trim()) faltantes.push('Link de acesso à assembleia')
  if (!instr.formaAutenticacao?.trim()) faltantes.push('Forma de autenticação do participante')
  if (!instr.janelaVotacao?.trim()) faltantes.push('Janela de votação eletrônica')
  if (!instr.formaPedirPalavra?.trim()) faltantes.push('Como pedir a palavra (voz e debate)')
  if (!instr.formaColetaVoto?.trim()) faltantes.push('Como o voto é coletado e registrado')
  if (!instr.contatoSuporte?.trim()) faltantes.push('Contato de suporte')
  if (!instr.avisoResponsabilidade?.trim())
    faltantes.push('Aviso sobre falhas de equipamento/conexão')
  return faltantes
}

/** Gera o HTML do bloco obrigatório de instruções (usado no edital e na 2ª via). */
export function gerarHtmlInstrucoesAcesso(instr: InstrucoesAcessoVotacao): string {
  const linha = (titulo: string, valor?: string) =>
    valor && valor.trim()
      ? `<li style="margin-bottom: 4px;"><strong>${titulo}:</strong> ${valor}</li>`
      : ''
  return `
    <div style="border: 1px solid #E2E8F0; border-left: 4px solid #0066FF; border-radius: 6px; padding: 10px 14px; margin: 12px 0; background: #F8FAFC;">
      <div style="font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; font-size: 9.5pt; color: #002B5E; margin-bottom: 6px;">
        INSTRUÇÕES DE ACESSO E VOTAÇÃO ELETRÔNICA
      </div>
      <ul style="margin: 0 0 0 18px; padding: 0; font-size: 9.5pt; color: #334155; line-height: 1.5;">
        ${linha('Modalidade', instr.modalidade)}
        ${linha('Link de acesso', instr.linkAcesso)}
        ${linha('Autenticação do participante', instr.formaAutenticacao)}
        ${linha('Janela de votação', instr.janelaVotacao)}
        ${linha('Pedir a palavra (voz e debate)', instr.formaPedirPalavra)}
        ${linha('Coleta e registro do voto', instr.formaColetaVoto)}
        ${linha('Suporte', instr.contatoSuporte)}
        ${linha('Responsabilidade', instr.avisoResponsabilidade)}
      </ul>
      <div style="font-size: 8pt; color: #64748b; margin-top: 6px; font-style: italic;">
        Bloco exigido pelo art. 1.354-A, §1º, do Código Civil para condomínios — citação configurável por tipo de organização.
      </div>
    </div>`
}
