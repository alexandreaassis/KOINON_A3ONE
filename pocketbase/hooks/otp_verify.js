/**
 * Hook POST /backend/v1/otp/verify
 * Valida o código OTP informado pelo morador.
 * Máximo de 3 tentativas por sessão. Bloqueio progressivo de 10 minutos após 3 falhas.
 * Emite token_voto e registra eventos otp_validado / otp_falhou / autenticacao_concluida.
 */

routerAdd('POST', '/backend/v1/otp/verify', (e) => {
  const { registrarAuditoria } = require(`${__hooks}/hash_encadeado.js`)

  const authRecord = e.auth
  if (!authRecord) {
    throw new ForbiddenError('Usuário não autenticado')
  }

  const body = e.requestInfo().body || {}
  const sessaoId = body.sessaoId
  const codigo = (body.codigo || '').trim()

  if (!sessaoId || !codigo) {
    throw new BadRequestError('sessaoId e codigo de 6 dígitos são obrigatórios')
  }

  let sessao
  try {
    sessao = e.app.findRecordById('sessoes', sessaoId)
  } catch (_) {
    throw new NotFoundError('Sessão não encontrada')
  }

  if (sessao.getString('status') !== 'ativa') {
    throw new BadRequestError('Esta sessão não está ativa ou já foi finalizada.')
  }

  const unidadeId = sessao.getString('unidade')
  const agora = new Date()

  // Verificar expiração do OTP
  const otpExpiraStr = sessao.getString('otp_expira_em')
  if (otpExpiraStr && new Date(otpExpiraStr.replace(' ', 'T') + 'Z') < agora) {
    sessao.set('status', 'expirada')
    e.app.save(sessao)
    throw new BadRequestError(
      'O código OTP expirou (validade de 5 minutos). Solicite um novo envio.',
    )
  }

  const tentativas = sessao.getInt('tentativas_falhas') || 0
  if (tentativas >= 3) {
    sessao.set('status', 'revogada')
    e.app.save(sessao)

    try {
      registrarAuditoria(e.app, {
        evento: 'otp_falhou',
        unidade: unidadeId,
        fator: 'Bloqueio progressivo 3 tentativas esgotadas',
        dispositivo: e.requestInfo().headers['user-agent'] || 'navegador',
      })
    } catch (_) {}

    throw new BadRequestError(
      'Número máximo de 3 tentativas excedido. Acesso bloqueado por 10 minutos para proteção da unidade.',
    )
  }

  const hashDigitado = $security.sha256(codigo)
  const hashEsperado = sessao.getString('otp_codigo_hash')

  if (hashDigitado !== hashEsperado) {
    const novasTentativas = tentativas + 1
    sessao.set('tentativas_falhas', novasTentativas)
    if (novasTentativas >= 3) {
      sessao.set('status', 'revogada')
    }
    e.app.save(sessao)

    try {
      registrarAuditoria(e.app, {
        evento: 'otp_falhou',
        unidade: unidadeId,
        fator: 'Código incorreto (tentativa ' + novasTentativas + ' de 3)',
        dispositivo: e.requestInfo().headers['user-agent'] || 'navegador',
      })
    } catch (_) {}

    const restantes = 3 - novasTentativas
    throw new BadRequestError(
      restantes > 0
        ? 'Código de verificação incorreto. Você tem mais ' + restantes + ' tentativa(s).'
        : 'Código incorreto. Limite de 3 tentativas atingido. Unidade bloqueada temporariamente.',
    )
  }

  // Código CORRETO!
  // Gerar token de voto único
  const tokenVoto = 'TKN-' + $security.randomString(32)
  sessao.set('token_voto', tokenVoto)
  sessao.set('tentativas_falhas', 0)
  e.app.save(sessao)

  // Registrar auditoria
  try {
    registrarAuditoria(e.app, {
      evento: 'otp_validado',
      unidade: unidadeId,
      fator: '2FA Posse Validada com Sucesso',
      dispositivo: e.requestInfo().headers['user-agent'] || 'navegador',
    })
    registrarAuditoria(e.app, {
      evento: 'autenticacao_concluida',
      unidade: unidadeId,
      fator: '2FA Conhecimento (CPF) + Posse (OTP)',
      dispositivo: e.requestInfo().headers['user-agent'] || 'navegador',
    })
    registrarAuditoria(e.app, {
      evento: 'token_emitido',
      unidade: unidadeId,
      fator: 'Token de Voto Criptográfico',
      dispositivo: e.requestInfo().headers['user-agent'] || 'navegador',
    })
  } catch (err) {
    console.log('Erro ao registrar auditoria de login 2FA:', err)
  }

  return e.json(200, {
    success: true,
    tokenVoto: tokenVoto,
    deliberacaoId: sessao.getString('deliberacao'),
    unidadeId: unidadeId,
    message: 'Autenticação em dois fatores concluída. Token de voto emitido.',
  })
})
