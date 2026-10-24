/**
 * Hook POST /backend/v1/votos/registrar
 * Valida e consome ATOMICAMENTE o token de voto de uso único.
 * Verifica unicidade deliberação + unidade.
 * Grava cédulas + comparecimentos.
 * Encadeia o hash de cada cédula ao hash anterior (SHA-256).
 * Cria comprovante com código de conferência de 8 caracteres.
 * Registra evento cedula_registrada na auditoria.
 * Bloqueia se houver presença física registrada (reconciliação).
 */

routerAdd('POST', '/backend/v1/votos/registrar', (e) => {
  const authRecord = e.auth
  if (!authRecord) {
    throw new ForbiddenError('Usuário não autenticado')
  }

  const body = e.requestInfo().body || {}
  const tokenVoto = (body.tokenVoto || '').trim()
  const deliberacaoId = body.deliberacaoId
  const votos = body.votos || [] // array de { itemId, opcao }
  const dispositivoId = body.dispositivoId || e.requestInfo().headers['user-agent'] || 'web-browser'

  if (!tokenVoto || !deliberacaoId || !Array.isArray(votos) || votos.length === 0) {
    throw new BadRequestError('tokenVoto, deliberacaoId e lista de votos são obrigatórios')
  }

  // 1. Validar deliberação
  let delib
  try {
    delib = e.app.findRecordById('deliberacoes', deliberacaoId)
  } catch (_) {
    throw new NotFoundError('Deliberação não encontrada')
  }

  if (delib.getString('status') !== 'EM_VOTACAO') {
    throw new BadRequestError('Esta deliberação não está aberta para votação.')
  }

  // 2. Validar token de voto na sessão
  let sessao
  try {
    const sessoes = e.app.findRecordsByFilter(
      'sessoes',
      "token_voto = {:token} && deliberacao = {:delib} && status = 'ativa'",
      '-created',
      1,
      0,
      { token: tokenVoto, delib: deliberacaoId },
    )
    if (!sessoes || sessoes.length === 0) {
      throw new BadRequestError('Token de voto inválido, expirado ou já consumido.')
    }
    sessao = sessoes[0]
  } catch (err) {
    throw new BadRequestError('Erro ao verificar token de voto: ' + err.message)
  }

  const unidadeId = sessao.getString('unidade')

  // 3. Reconciliação: verificar se a unidade possui presença física registrada
  try {
    const presencasFisicas = e.app.findRecordsByFilter(
      'presencas',
      "deliberacao = {:delib} && unidade = {:unidade} && tipo = 'presencial'",
      '',
      1,
      0,
      { delib: deliberacaoId, unidade: unidadeId },
    )
    if (presencasFisicas && presencasFisicas.length > 0) {
      throw new BadRequestError(
        'A unidade possui presença presencial registrada. O voto eletrônico está bloqueado.',
      )
    }
  } catch (err) {
    if (err.message && err.message.includes('presencial registrada')) throw err
  }

  // 4. Verificar se a unidade já compareceu nesta deliberação
  try {
    const compJaExiste = e.app.findRecordsByFilter(
      'comparecimentos',
      'deliberacao = {:delib} && unidade = {:unidade}',
      '',
      1,
      0,
      { delib: deliberacaoId, unidade: unidadeId },
    )
    if (compJaExiste && compJaExiste.length > 0) {
      throw new BadRequestError('Voto já computado para esta unidade nesta deliberação.')
    }
  } catch (err) {
    if (err.message && err.message.includes('já computado')) throw err
  }

  // Obter hash anônimo da unidade (salteado com a deliberação para sigilo de voto em cédula secreta)
  const isNominal = delib.getString('tipo_cedula') === 'nominal'
  const unidadeHash = isNominal
    ? 'UNIDADE_' + unidadeId
    : $security.sha256('SIGILO:' + deliberacaoId + ':' + unidadeId)

  // Executar transação atômica
  let reciboCodigo = ''
  let comprovanteId = ''
  let dataHoraAgora = new Date().toISOString().replace('T', ' ').substring(0, 19)
  let hashAbreviado = ''

  e.app.runInTransaction((txApp) => {
    // A) Consumir atomicamente o token
    sessao.set('status', 'consumida')
    sessao.set('token_voto', '')
    txApp.save(sessao)

    // B) Gerar código de conferência do recibo
    reciboCodigo = gerarCodigoConferencia()

    // C) Registrar comparecimento (quem votou)
    const compCol = txApp.findCollectionByNameOrId('comparecimentos')
    const compRec = new Record(compCol)
    compRec.set('deliberacao', deliberacaoId)
    compRec.set('unidade', unidadeId)
    compRec.set('data_hora', dataHoraAgora)
    compRec.set('fator_usado', '2FA (Conhecimento + OTP)')
    compRec.set('dispositivo_id', dispositivoId)
    txApp.save(compRec)

    // Registrar presença remota se ainda não tiver
    try {
      const presCol = txApp.findCollectionByNameOrId('presencas')
      const presRec = new Record(presCol)
      presRec.set('deliberacao', deliberacaoId)
      presRec.set('unidade', unidadeId)
      presRec.set('tipo', 'remoto')
      presRec.set('data_hora', dataHoraAgora)
      txApp.save(presRec)
    } catch (_) {
      // já existe presença
    }

    // D) Gravar cada cédula encadeada
    const cedulasCol = txApp.findCollectionByNameOrId('cedulas')

    // Buscar o último hash de cédula nesta deliberação
    let ultimoHashCedula = '0000000000000000000000000000000000000000000000000000000000000000'
    try {
      const ultimasCedulas = txApp.findRecordsByFilter(
        'cedulas',
        'deliberacao = {:delib}',
        '-created',
        1,
        0,
        { delib: deliberacaoId },
      )
      if (ultimasCedulas && ultimasCedulas.length > 0) {
        ultimoHashCedula = ultimasCedulas[0].getString('hash_cedula') || ultimoHashCedula
      }
    } catch (_) {}

    let hashesCedulas = []

    for (let v of votos) {
      const opcao = (v.opcao || '').toLowerCase()
      if (!['favoravel', 'contrario', 'abstencao', 'nulo', 'branco'].includes(opcao)) {
        throw new BadRequestError('Opção inválida: ' + opcao)
      }

      const cedulaPayload = JSON.stringify({
        deliberacao: deliberacaoId,
        item: v.itemId,
        unidade_hash: unidadeHash,
        opcao: opcao,
        timestamp: dataHoraAgora,
        recibo_codigo: reciboCodigo,
      })

      const hashCedula = calcularSha256(ultimoHashCedula + ':' + cedulaPayload)
      ultimoHashCedula = hashCedula
      hashesCedulas.push(hashCedula)

      const cedRec = new Record(cedulasCol)
      cedRec.set('deliberacao', deliberacaoId)
      cedRec.set('item', v.itemId)
      cedRec.set('unidade_hash', unidadeHash)
      cedRec.set('opcao', opcao)
      cedRec.set('timestamp', dataHoraAgora)
      cedRec.set('hash_anterior', ultimoHashCedula)
      cedRec.set('hash_cedula', hashCedula)
      cedRec.set('recibo_codigo', reciboCodigo)
      txApp.save(cedRec)
    }

    hashAbreviado = (hashesCedulas[hashesCedulas.length - 1] || '').substring(0, 12)

    // E) Gravar comprovante
    const comprovantesCol = txApp.findCollectionByNameOrId('comprovantes')
    const comprovanteRec = new Record(comprovantesCol)
    comprovanteRec.set('deliberacao', deliberacaoId)
    comprovanteRec.set('unidade', unidadeId)
    comprovanteRec.set('codigo_conferencia', reciboCodigo)
    comprovanteRec.set('hash_abreviado', hashAbreviado)
    comprovanteRec.set('data_hora', dataHoraAgora)
    txApp.save(comprovanteRec)
    comprovanteId = comprovanteRec.id

    // F) Auditoria: cedula_registrada
    registrarAuditoria(txApp, {
      evento: 'cedula_registrada',
      unidade: unidadeId,
      fator: 'Urna Criptográfica SHA-256',
      dispositivo: dispositivoId,
    })
  })

  return e.json(200, {
    success: true,
    reciboCodigo: reciboCodigo,
    comprovanteId: comprovanteId,
    hashAbreviado: hashAbreviado,
    dataHora: dataHoraAgora,
    deliberacaoId: deliberacaoId,
    message: 'Voto registrado com sucesso com prova de integridade e recibo gerado.',
  })
})
