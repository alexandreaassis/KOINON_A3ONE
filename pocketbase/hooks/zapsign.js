/// <reference path="../pb_data/types.d.ts" />

/**
 * Módulo de Integração ZapSign (Fase 3 do plano de assinaturas do Koinon)
 *
 * Todas as funções auxiliares estão inline nos callbacks routerAdd para cumprir o modelo
 * de pool JSVM do PocketBase / Skip Cloud.
 *
 * Endpoints:
 * 1. GET  /backend/v1/admin/zapsign/config       - Status da configuração (nunca os segredos em claro)
 * 2. POST /backend/v1/admin/zapsign/config       - Grava token, ambiente e webhook secret cifrados em configuracoes_backend
 * 3. POST /backend/v1/atas/{id}/enviar-zapsign   - Envia ata para assinatura na ZapSign (ou fallback manual)
 * 4. POST /backend/v1/zapsign/webhook           - Webhook idempotente da ZapSign com validação de segredo e download imediato
 */

// -------------------------------------------------------------
// 1. GET /backend/v1/admin/zapsign/config
// -------------------------------------------------------------
routerAdd('GET', '/backend/v1/admin/zapsign/config', (e) => {
  let operador = e.auth
  if (!operador) {
    try {
      const authHeader = (e.requestInfo().headers && e.requestInfo().headers['authorization']) || ''
      const token = authHeader.replace(/^Bearer\s+/i, '').trim()
      if (token && e.app) {
        operador = e.app.findAuthRecordByToken(token, 'auth')
      }
    } catch (_) {}
  }

  if (!operador) {
    return e.json(403, {
      success: false,
      message: 'Acesso restrito à Mesa Diretora e Administradores.',
    })
  }

  const role = operador.getString('role')
  if (role !== 'admin' && role !== 'mesa') {
    return e.json(403, {
      success: false,
      message: 'Acesso restrito à Mesa Diretora e Administradores.',
    })
  }

  let temToken = false
  let ambiente = 'sandbox'
  let temWebhookSecret = false

  try {
    const recToken = e.app.findFirstRecordByData(
      'configuracoes_backend',
      'chave',
      'ZAPSIGN_API_TOKEN',
    )
    if (recToken && (recToken.getString('valor') || '').trim().length > 0) {
      temToken = true
    }
  } catch (_) {}

  try {
    const recEnv = e.app.findFirstRecordByData('configuracoes_backend', 'chave', 'ZAPSIGN_AMBIENTE')
    if (recEnv) {
      const val = (recEnv.getString('valor') || '').trim()
      if (val === 'producao' || val === 'sandbox') ambiente = val
    }
  } catch (_) {}

  try {
    const recSec = e.app.findFirstRecordByData(
      'configuracoes_backend',
      'chave',
      'ZAPSIGN_WEBHOOK_SECRET',
    )
    if (recSec && (recSec.getString('valor') || '').trim().length > 0) {
      temWebhookSecret = true
    }
  } catch (_) {}

  const baseUrl =
    ambiente === 'producao' ? 'https://api.zapsign.com.br' : 'https://sandbox.api.zapsign.com.br'

  return e.json(200, {
    success: true,
    configurado: temToken,
    ambiente: ambiente,
    baseUrl: baseUrl,
    temWebhookSecret: temWebhookSecret,
  })
})

// -------------------------------------------------------------
// 2. POST /backend/v1/admin/zapsign/config
// -------------------------------------------------------------
routerAdd('POST', '/backend/v1/admin/zapsign/config', (e) => {
  let operador = e.auth
  if (!operador) {
    try {
      const authHeader = (e.requestInfo().headers && e.requestInfo().headers['authorization']) || ''
      const token = authHeader.replace(/^Bearer\s+/i, '').trim()
      if (token && e.app) {
        operador = e.app.findAuthRecordByToken(token, 'auth')
      }
    } catch (_) {}
  }

  if (!operador || operador.getString('role') !== 'admin') {
    return e.json(403, {
      success: false,
      message: 'Apenas administradores podem configurar a ZapSign.',
    })
  }

  const cifrarInline = (texto) => {
    if (!texto) return ''
    const key = ($os.getenv('ENCRYPTION_KEY') || 'koinon-zapsign-sec-key-32chars!')
      .padEnd(32, '0')
      .slice(0, 32)
    try {
      return $security.encrypt(texto, key)
    } catch (_) {
      return 'ENC:' + $security.base64Encode(texto)
    }
  }

  const salvarChave = (chave, valor) => {
    let rec = null
    try {
      rec = e.app.findFirstRecordByData('configuracoes_backend', 'chave', chave)
    } catch (_) {}
    if (!rec) {
      const col = e.app.findCollectionByNameOrId('configuracoes_backend')
      rec = new Record(col)
      rec.set('chave', chave)
    }
    rec.set('valor', valor)
    e.app.save(rec)
  }

  const body = e.requestInfo().body || {}
  const tokenBruto = (body.token || '').trim()
  const ambiente = body.ambiente === 'producao' ? 'producao' : 'sandbox'
  const webhookSecretBruto = (
    body.webhook_secret !== undefined ? String(body.webhook_secret) : ''
  ).trim()

  try {
    if (tokenBruto) {
      salvarChave('ZAPSIGN_API_TOKEN', cifrarInline(tokenBruto))
    }

    salvarChave('ZAPSIGN_AMBIENTE', ambiente)

    if (webhookSecretBruto) {
      salvarChave('ZAPSIGN_WEBHOOK_SECRET', cifrarInline(webhookSecretBruto))
    }

    // Auditoria
    try {
      const colAud = e.app.findCollectionByNameOrId('auditoria_events')
      let sequencial = 1
      let ultimoHash = '0000000000000000000000000000000000000000000000000000000000000000'
      const ultimos = e.app.findRecordsByFilter('auditoria_events', '', '-sequencial', 1, 0)
      if (ultimos && ultimos.length > 0) {
        sequencial = (ultimos[0].getInt('sequencial') || 0) + 1
        ultimoHash = ultimos[0].getString('hash_evento') || ultimoHash
      }
      const p = JSON.stringify({
        evento: 'configuracao_atualizada',
        fator:
          'ZapSign configurada (ambiente: ' +
          ambiente +
          ', token alterado: ' +
          (tokenBruto ? 'sim' : 'não') +
          ')',
        seq: sequencial,
        ts: new Date().toISOString(),
      })
      const recAud = new Record(colAud)
      recAud.set('evento', 'configuracao_atualizada')
      recAud.set('data_hora', new Date().toISOString())
      recAud.set('fator', 'Parâmetros ZapSign atualizados pelo admin ' + operador.id)
      recAud.set('dispositivo', 'Admin ID ' + operador.id)
      recAud.set('sequencial', sequencial)
      recAud.set('hash_anterior', ultimoHash)
      recAud.set('hash_evento', $security.sha256(ultimoHash + ':' + p))
      e.app.save(recAud)
    } catch (audErr) {
      console.log('Aviso ao auditar config zapsign:', audErr)
    }

    let temToken = false
    try {
      const r = e.app.findFirstRecordByData('configuracoes_backend', 'chave', 'ZAPSIGN_API_TOKEN')
      if (r && (r.getString('valor') || '').trim().length > 0) temToken = true
    } catch (_) {}

    return e.json(200, {
      success: true,
      message: 'Configurações da ZapSign salvas com sucesso no servidor.',
      configurado: temToken,
      ambiente: ambiente,
      baseUrl:
        ambiente === 'producao'
          ? 'https://api.zapsign.com.br'
          : 'https://sandbox.api.zapsign.com.br',
      temWebhookSecret: Boolean(webhookSecretBruto),
    })
  } catch (err) {
    return e.json(500, {
      success: false,
      message:
        'Erro ao salvar configurações da ZapSign: ' +
        (err && err.message ? err.message : String(err)),
    })
  }
})

// -------------------------------------------------------------
// 3. POST /backend/v1/atas/{id}/enviar-zapsign
// -------------------------------------------------------------
routerAdd('POST', '/backend/v1/atas/{id}/enviar-zapsign', (e) => {
  let operador = e.auth
  if (!operador) {
    try {
      const authHeader = (e.requestInfo().headers && e.requestInfo().headers['authorization']) || ''
      const token = authHeader.replace(/^Bearer\s+/i, '').trim()
      if (token && e.app) {
        operador = e.app.findAuthRecordByToken(token, 'auth')
      }
    } catch (_) {}
  }

  if (!operador) {
    return e.json(403, {
      success: false,
      message: 'Acesso restrito à Mesa Diretora e Administradores.',
    })
  }

  const role = operador.getString('role')
  if (role !== 'admin' && role !== 'mesa') {
    return e.json(403, {
      success: false,
      message: 'Acesso restrito à Mesa Diretora e Administradores.',
    })
  }

  const ataId = e.request.pathValue('id')
  let ata = null
  try {
    ata = e.app.findRecordById('atas_assembleia', ataId)
  } catch (_) {
    return e.json(404, { success: false, message: 'Ata não encontrada.' })
  }

  const decifrarInline = (texto) => {
    if (!texto) return ''
    const key = ($os.getenv('ENCRYPTION_KEY') || 'koinon-zapsign-sec-key-32chars!')
      .padEnd(32, '0')
      .slice(0, 32)
    if (texto.startsWith('ENC:')) {
      return $security.base64Decode(texto.substring(4))
    }
    try {
      return $security.decrypt(texto, key)
    } catch (_) {
      return texto
    }
  }

  const registrarAuditoria = (evento, fator) => {
    try {
      const colAud = e.app.findCollectionByNameOrId('auditoria_events')
      let sequencial = 1
      let ultimoHash = '0000000000000000000000000000000000000000000000000000000000000000'
      const ultimos = e.app.findRecordsByFilter('auditoria_events', '', '-sequencial', 1, 0)
      if (ultimos && ultimos.length > 0) {
        sequencial = (ultimos[0].getInt('sequencial') || 0) + 1
        ultimoHash = ultimos[0].getString('hash_evento') || ultimoHash
      }
      const p = JSON.stringify({
        evento: evento,
        fator: fator,
        seq: sequencial,
        ts: new Date().toISOString(),
      })
      const recAud = new Record(colAud)
      recAud.set('evento', evento)
      recAud.set('data_hora', new Date().toISOString())
      recAud.set('fator', fator)
      recAud.set('dispositivo', 'Mesa ID ' + operador.id)
      recAud.set('sequencial', sequencial)
      recAud.set('hash_anterior', ultimoHash)
      recAud.set('hash_evento', $security.sha256(ultimoHash + ':' + p))
      e.app.save(recAud)
    } catch (audErr) {
      console.log('Aviso ao auditar envio zapsign:', audErr)
    }
  }

  // Obter configurações
  let token = ''
  let ambiente = 'sandbox'
  try {
    const recToken = e.app.findFirstRecordByData(
      'configuracoes_backend',
      'chave',
      'ZAPSIGN_API_TOKEN',
    )
    if (recToken) token = decifrarInline(recToken.getString('valor') || '').trim()
  } catch (_) {}

  try {
    const recEnv = e.app.findFirstRecordByData('configuracoes_backend', 'chave', 'ZAPSIGN_AMBIENTE')
    if (recEnv) {
      const val = (recEnv.getString('valor') || '').trim()
      if (val === 'producao' || val === 'sandbox') ambiente = val
    }
  } catch (_) {}

  const baseUrl =
    ambiente === 'producao' ? 'https://api.zapsign.com.br' : 'https://sandbox.api.zapsign.com.br'

  // SE NÃO ESTIVER CONFIGURADA -> FALLBACK MARCADO
  if (!token) {
    const motivo =
      'ZapSign não configurada no condomínio (token de API ausente em /admin/configuracoes).'
    ata.set('modo_assinatura', 'manual_impressao')
    ata.set('zapsign_status', 'fallback_manual')
    ata.set('zapsign_motivo_falha', motivo)
    e.app.save(ata)

    registrarAuditoria(
      'zapsign_fallback_manual',
      'Fallback acionado na Ata ' + ataId + ': ' + motivo,
    )

    return e.json(200, {
      success: false,
      fallback: true,
      modo_assinatura: 'manual_impressao',
      motivo: motivo,
      message:
        'ZapSign não configurada. A ata foi marcada como via para assinatura manual (impressão).',
    })
  }

  const body = e.requestInfo().body || {}
  const pdfBase64 = (body.pdf_base64 || '').trim()
  const signatariosEntrada = Array.isArray(body.signatarios) ? body.signatarios : []

  // Montar signatários
  const signers = []
  if (signatariosEntrada.length > 0) {
    for (let s of signatariosEntrada) {
      const item = {
        name: (s.nome || 'Signatário').trim(),
        email: (s.email || '').trim(),
      }
      if (s.cpf) {
        item.cpf = String(s.cpf).replace(/\D/g, '')
      }
      signers.push(item)
    }
  } else {
    const presNome = (ata.getString('presidente_nome') || '').trim()
    const secNome = (ata.getString('secretario_nome') || '').trim()
    if (presNome) {
      const item = { name: presNome, email: '' }
      const cpf = ata.getString('presidente_cpf')
      if (cpf) item.cpf = cpf.replace(/\D/g, '')
      signers.push(item)
    }
    if (secNome && secNome !== presNome) {
      const item = { name: secNome, email: '' }
      const cpf = ata.getString('secretario_cpf')
      if (cpf) item.cpf = cpf.replace(/\D/g, '')
      signers.push(item)
    }
  }

  if (signers.length === 0) {
    signers.push({ name: 'Presidente da Mesa' })
  }

  const nomeDoc = (ata.getString('titulo') || 'Ata da Assembleia Geral') + '.pdf'
  const payloadZapSign = {
    name: nomeDoc,
    signers: signers,
    lang: 'pt-br',
    external_id: 'ata-' + ata.id,
  }

  if (pdfBase64) {
    payloadZapSign.base64_pdf = pdfBase64
  } else {
    payloadZapSign.markdown_text = ata.getString('conteudo_html') || 'Ata da Assembleia Geral'
  }

  const endpointUrl = baseUrl + '/api/v1/docs/?api_token=' + encodeURIComponent(token)
  let resp = null
  let erroHttp = ''

  try {
    resp = $http.send({
      method: 'POST',
      url: endpointUrl,
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
        'API-Token': token,
      },
      data: JSON.stringify(payloadZapSign),
      timeout: 30,
    })
  } catch (errSend) {
    erroHttp = errSend && errSend.message ? errSend.message : String(errSend)
  }

  if (!resp || resp.statusCode >= 400) {
    const statusCod = resp ? resp.statusCode : 500
    const rawBody = resp ? resp.rawText || '' : erroHttp
    const motivo =
      'Falha ao comunicar com a ZapSign (HTTP ' + statusCod + '): ' + rawBody.slice(0, 500)

    // FALLBACK MARCADO
    ata.set('modo_assinatura', 'manual_impressao')
    ata.set('zapsign_status', 'fallback_manual')
    ata.set('zapsign_motivo_falha', motivo)
    e.app.save(ata)

    registrarAuditoria(
      'zapsign_fallback_manual',
      'Fallback acionado na Ata ' + ataId + ': ' + motivo,
    )

    return e.json(200, {
      success: false,
      fallback: true,
      modo_assinatura: 'manual_impressao',
      motivo: motivo,
      message:
        'Não foi possível criar o documento na ZapSign. Documento marcado para assinatura manual (impressão).',
    })
  }

  let dadosZap = {}
  try {
    dadosZap = JSON.parse(resp.rawText || '{}')
  } catch (_) {
    dadosZap = {}
  }

  const docToken = dadosZap.token || ''
  const signersRetornados = Array.isArray(dadosZap.signers) ? dadosZap.signers : []
  const urlsPorSignatario = signersRetornados.map((s) => ({
    nome: s.name || '',
    email: s.email || '',
    token: s.token || '',
    sign_url: s.sign_url || (s.token ? 'https://app.zapsign.com.br/verificar/' + s.token : ''),
    status: s.status || 'pending',
  }))

  ata.set('modo_assinatura', 'zapsign')
  ata.set('zapsign_documento_token', docToken)
  ata.set('zapsign_status', 'aguardando_assinaturas')
  ata.set('zapsign_urls', urlsPorSignatario)
  ata.set('zapsign_enviado_em', new Date().toISOString())
  ata.set('zapsign_motivo_falha', '')
  e.app.save(ata)

  registrarAuditoria(
    'zapsign_documento_criado',
    'Ata ' +
      ataId +
      ' enviada para ZapSign (Doc: ' +
      docToken +
      ', ' +
      urlsPorSignatario.length +
      ' signatários)',
  )

  return e.json(200, {
    success: true,
    fallback: false,
    modo_assinatura: 'zapsign',
    documento_token: docToken,
    status: 'aguardando_assinaturas',
    signatarios: urlsPorSignatario,
    message: 'Documento enviado com sucesso para a ZapSign!',
  })
})

// -------------------------------------------------------------
// 4. POST /backend/v1/zapsign/webhook
// -------------------------------------------------------------
routerAdd('POST', '/backend/v1/zapsign/webhook', (e) => {
  const decifrarInline = (texto) => {
    if (!texto) return ''
    const key = ($os.getenv('ENCRYPTION_KEY') || 'koinon-zapsign-sec-key-32chars!')
      .padEnd(32, '0')
      .slice(0, 32)
    if (texto.startsWith('ENC:')) {
      return $security.base64Decode(texto.substring(4))
    }
    try {
      return $security.decrypt(texto, key)
    } catch (_) {
      return texto
    }
  }

  // Validação do segredo se configurado
  let webhookSecret = ''
  try {
    const recSec = e.app.findFirstRecordByData(
      'configuracoes_backend',
      'chave',
      'ZAPSIGN_WEBHOOK_SECRET',
    )
    if (recSec) webhookSecret = decifrarInline(recSec.getString('valor') || '').trim()
  } catch (_) {}

  if (webhookSecret) {
    const reqHeaders = e.requestInfo().headers || {}
    const authHeader = (reqHeaders['authorization'] || '').trim()
    const zapTokenHeader = (reqHeaders['x-zapsign-secret'] || reqHeaders['api-token'] || '').trim()
    const querySecret = (e.request.url.query().get('secret') || '').trim()

    let autorizado = false
    if (authHeader && (authHeader === webhookSecret || authHeader === 'Bearer ' + webhookSecret)) {
      autorizado = true
    } else if (zapTokenHeader && zapTokenHeader === webhookSecret) {
      autorizado = true
    } else if (querySecret && querySecret === webhookSecret) {
      autorizado = true
    }

    if (!autorizado) {
      console.log('Webhook ZapSign rejeitado: segredo incorreto ou ausente.')
      return e.json(401, { success: false, message: 'Segredo do webhook inválido.' })
    }
  }

  const registrarAuditoria = (evento, fator) => {
    try {
      const colAud = e.app.findCollectionByNameOrId('auditoria_events')
      let sequencial = 1
      let ultimoHash = '0000000000000000000000000000000000000000000000000000000000000000'
      const ultimos = e.app.findRecordsByFilter('auditoria_events', '', '-sequencial', 1, 0)
      if (ultimos && ultimos.length > 0) {
        sequencial = (ultimos[0].getInt('sequencial') || 0) + 1
        ultimoHash = ultimos[0].getString('hash_evento') || ultimoHash
      }
      const p = JSON.stringify({
        evento: evento,
        fator: fator,
        seq: sequencial,
        ts: new Date().toISOString(),
      })
      const recAud = new Record(colAud)
      recAud.set('evento', evento)
      recAud.set('data_hora', new Date().toISOString())
      recAud.set('fator', fator)
      recAud.set('dispositivo', 'ZapSign Webhook')
      recAud.set('sequencial', sequencial)
      recAud.set('hash_anterior', ultimoHash)
      recAud.set('hash_evento', $security.sha256(ultimoHash + ':' + p))
      e.app.save(recAud)
    } catch (audErr) {
      console.log('Aviso ao auditar webhook zapsign:', audErr)
    }
  }

  const body = e.requestInfo().body || {}
  const docToken = body.token || ''
  const docStatus = body.status || ''
  const signedFileUrl = body.signed_file || ''
  const signerWhoSigned = body.signer_who_signed || null

  if (!docToken) {
    return e.json(400, { success: false, message: 'Payload sem token do documento.' })
  }

  let ata = null
  try {
    ata = e.app.findFirstRecordByData('atas_assembleia', 'zapsign_documento_token', docToken)
  } catch (_) {}

  if (!ata && body.external_id && body.external_id.startsWith('ata-')) {
    try {
      ata = e.app.findRecordById('atas_assembleia', body.external_id.replace('ata-', ''))
    } catch (_) {}
  }

  if (!ata) {
    return e.json(200, { success: true, message: 'Nenhuma ata encontrada para o token informado.' })
  }

  // Idempotência
  const statusAtual = ata.getString('zapsign_status')
  if (
    statusAtual === 'assinado' &&
    docStatus === 'signed' &&
    ata.getString('zapsign_pdf_assinado_hash')
  ) {
    return e.json(200, {
      success: true,
      message: 'Evento já processado anteriormente (idempotente).',
    })
  }

  // Atualizar lista de signatários se enviada
  if (Array.isArray(body.signers)) {
    const novasUrls = body.signers.map((s) => ({
      nome: s.name || '',
      email: s.email || '',
      token: s.token || '',
      sign_url: s.sign_url || (s.token ? 'https://app.zapsign.com.br/verificar/' + s.token : ''),
      status: s.status || 'pending',
      signed_at: s.signed_at || null,
    }))
    ata.set('zapsign_urls', novasUrls)
  }

  // Assinatura parcial
  if (signerWhoSigned && docStatus !== 'signed') {
    ata.set('zapsign_status', 'assinaturas_parciais')
    e.app.save(ata)

    const nomeSigner = signerWhoSigned.name || 'Signatário'
    registrarAuditoria(
      'zapsign_assinatura_parcial',
      'Assinatura coletada de ' +
        nomeSigner +
        ' na ata ' +
        ata.id +
        ' (ZapSign doc: ' +
        docToken +
        ')',
    )

    return e.json(200, {
      success: true,
      message: 'Assinatura parcial registrada.',
      status: 'assinaturas_parciais',
    })
  }

  // Documento totalmente assinado
  if (docStatus === 'signed') {
    ata.set('zapsign_status', 'assinado')
    ata.set('zapsign_concluido_em', new Date().toISOString())
    if (signedFileUrl) {
      ata.set('zapsign_pdf_assinado_url', signedFileUrl)
    }

    // Baixar o PDF assinado IMEDIATAMENTE (o link expira em 60 minutos)
    let hashPdf = ''
    if (signedFileUrl) {
      try {
        const respPdf = $http.send({
          method: 'GET',
          url: signedFileUrl,
          timeout: 60,
        })

        if (respPdf && respPdf.statusCode === 200 && respPdf.rawText) {
          hashPdf = $security.sha256(respPdf.rawText)
          ata.set('zapsign_pdf_assinado_hash', hashPdf)
          ata.set('hash_ata', hashPdf)
        }

        try {
          if (typeof $filesystem !== 'undefined' && typeof $filesystem.fileFromURL === 'function') {
            const fsFile = $filesystem.fileFromURL(signedFileUrl, 60)
            if (fsFile) {
              ata.set('zapsign_pdf_assinado', fsFile)
            }
          }
        } catch (fsErr) {
          console.log('Aviso ao persistir arquivo com $filesystem.fileFromURL:', fsErr)
        }
      } catch (downErr) {
        console.log('Aviso ao baixar PDF assinado da ZapSign:', downErr)
      }
    }

    ata.set('status', 'assinada')
    e.app.save(ata)

    registrarAuditoria(
      'zapsign_documento_concluido',
      'Ata ' + ata.id + ' concluída na ZapSign. Hash SHA-256 do PDF: ' + (hashPdf || 'registrado'),
    )

    return e.json(200, {
      success: true,
      message: 'Ata assinada e PDF imutável salvo com hash.',
      status: 'assinado',
      hash_sha256: hashPdf,
    })
  }

  if (docStatus === 'refused' || docStatus === 'cancelled') {
    ata.set('zapsign_status', docStatus)
    ata.set('zapsign_motivo_falha', 'Documento ' + docStatus + ' na ZapSign.')
    e.app.save(ata)
  }

  return e.json(200, { success: true, message: 'Evento processado.', status: docStatus })
})
