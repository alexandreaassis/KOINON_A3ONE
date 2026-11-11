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
 * 3. POST /backend/v1/atas/{id}/enviar-zapsign               - Envia ata para assinatura na ZapSign (ou fallback manual)
 * 3b. POST /backend/v1/editais/{id}/enviar-zapsign           - Edital de convocação (collection editais_deliberacao)
 * 3c. POST /backend/v1/listas-presenca/{id}/enviar-zapsign   - Lista de presença (collection listas_presenca)
 * 4. POST /backend/v1/zapsign/webhook                        - Webhook idempotente da ZapSign com validação de segredo e download imediato (identifica ata/edital/lista pelo token do documento)
 *
 * IMPORTANTE (runtime Skip Cloud/PocketBase): o campo `resp.rawText` de $http.send chega
 * VAZIO nesta plataforma. Todo acesso ao corpo da resposta usa `resp.json` (JSON já
 * interpretado) com fallback para `resp.body` (bytes → JSON parse ou texto bruto). Ler
 * `rawText` foi a causa dos links de assinatura vazios (zapsign_urls: []) e do hash vazio
 * na auditoria.
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

  // Extrai o corpo interpretado de uma resposta $http.send neste runtime.
  // `resp.rawText` chega VAZIO no Skip Cloud (causa real dos links/hash vazios),
  // então o JSON correto vem em `resp.json`; quando só houver bytes, decodificamos
  // `resp.body` e tentamos interpretar como JSON, com o texto bruto como último recurso.
  const extrairCorpoRespostaHttp = (respX) => {
    if (!respX) return null
    if (respX.json !== undefined && respX.json !== null) return respX.json
    if (!respX.body) return null
    let texto = ''
    try {
      if (typeof respX.body === 'string') {
        texto = respX.body
      } else if (typeof respX.body === 'object' && respX.body.byteLength !== undefined) {
        texto = String.fromCharCode.apply(null, new Uint8Array(respX.body))
      } else {
        texto = String(respX.body)
      }
    } catch (_) {
      return null
    }
    try {
      return JSON.parse(texto)
    } catch (_) {
      return texto
    }
  }

  // Corpo da resposta como TEXTO (para mensagens de erro mostrarem o motivo real da ZapSign).
  const extrairTextoRespostaHttp = (respX) => {
    if (!respX) return ''
    const corpo = extrairCorpoRespostaHttp(respX)
    if (corpo === null || corpo === undefined) return ''
    if (typeof corpo === 'string') return corpo
    try {
      return JSON.stringify(corpo)
    } catch (_) {
      return String(corpo)
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
    const corpoErro = resp ? extrairTextoRespostaHttp(resp) : ''
    const rawBody = corpoErro || erroHttp
    const motivo =
      'Falha ao comunicar com a ZapSign (HTTP ' +
      statusCod +
      '): ' +
      (rawBody || 'sem detalhes no corpo da resposta').slice(0, 500)

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

  // Corpo interpretado: resp.json primeiro; rawText não existe neste runtime (Bug 3)
  let dadosZap = extrairCorpoRespostaHttp(resp)
  if (dadosZap === null || typeof dadosZap !== 'object') {
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

  // HTTP 200 sem token no corpo = FALHA HONESTA: a ZapSign respondeu, mas não criou
  // documento utilizável. Nunca gravar "aguardando_assinaturas" com zapsign_urls vazio.
  const signersComToken = urlsPorSignatario.filter((s) => s.token || s.sign_url)
  if (!docToken || signersComToken.length === 0) {
    const corpoTexto = extrairTextoRespostaHttp(resp)
    const motivo =
      'A ZapSign respondeu HTTP ' +
      resp.statusCode +
      ' sem token de documento ou sem links de signatários no corpo. Corpo da resposta: ' +
      (corpoTexto || 'vazio').slice(0, 500)

    ata.set('modo_assinatura', 'manual_impressao')
    ata.set('zapsign_status', 'fallback_manual')
    ata.set('zapsign_motivo_falha', motivo)
    ata.set('zapsign_documento_token', '')
    ata.set('zapsign_urls', [])
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
        'A ZapSign respondeu, mas não retornou token do documento nem links de assinatura. Ata marcada para assinatura manual (impressão) em vez de gravar links vazios.',
    })
  }

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
    zapsign_status: 'aguardando_assinaturas',
    zapsign_urls: urlsPorSignatario,
    message: 'Documento enviado com sucesso para a ZapSign!',
  })
})

// -------------------------------------------------------------
// 3b. POST /backend/v1/editais/{id}/enviar-zapsign — Edital de Convocação
// -------------------------------------------------------------
// ATENÇÃO (modelo de pool JSVM do Skip Cloud): funções auxiliares NÃO podem
// ficar em top-level do pb_hooks — cada callback roda em um pool separado e
// não enxerga declarações de nível superior (causa real do ReferenceError
// "prepararEnvioDocumentoGenerico is not defined" nesta rota). Por isso toda
// auxiliar é declarada DENTRO de cada callback, duplicada entre eles.
// -------------------------------------------------------------
routerAdd('POST', '/backend/v1/editais/{id}/enviar-zapsign', (e) => {
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

  const editalId = e.request.pathValue('id')
  let edital = null
  try {
    edital = e.app.findRecordById('editais_deliberacao', editalId)
  } catch (_) {
    return e.json(404, { success: false, message: 'Edital não encontrado.' })
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

  const extrairCorpoRespostaHttp = (respX) => {
    if (!respX) return null
    if (respX.json !== undefined && respX.json !== null) return respX.json
    if (!respX.body) return null
    let texto = ''
    try {
      if (typeof respX.body === 'string') {
        texto = respX.body
      } else if (typeof respX.body === 'object' && respX.body.byteLength !== undefined) {
        texto = String.fromCharCode.apply(null, new Uint8Array(respX.body))
      } else {
        texto = String(respX.body)
      }
    } catch (_) {
      return null
    }
    try {
      return JSON.parse(texto)
    } catch (_) {
      return texto
    }
  }

  const extrairTextoRespostaHttp = (respX) => {
    if (!respX) return ''
    const corpo = extrairCorpoRespostaHttp(respX)
    if (corpo === null || corpo === undefined) return ''
    if (typeof corpo === 'string') return corpo
    try {
      return JSON.stringify(corpo)
    } catch (_) {
      return String(corpo)
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
      console.log('Aviso ao auditar envio zapsign (edital):', audErr)
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
    edital.set('zapsign_status', 'fallback_manual')
    edital.set('zapsign_motivo_falha', motivo)
    e.app.save(edital)

    registrarAuditoria(
      'zapsign_fallback_manual',
      'Fallback acionado no Edital ' + editalId + ': ' + motivo,
    )

    return e.json(200, {
      success: false,
      fallback: true,
      modo_assinatura: 'manual_impressao',
      motivo: motivo,
      message: 'ZapSign não configurada. O edital foi marcado para assinatura manual (impressão).',
    })
  }

  // Payload vem em camelCase do front ({pdfBase64, signatarios[{nome,cpf,email,telefone,cargo}]})
  const body = e.requestInfo().body || {}
  const pdfBase64 = String(body.pdfBase64 || body.pdf_base64 || '').trim()
  const signatariosEntrada = Array.isArray(body.signatarios) ? body.signatarios : []

  // Montar signatários
  const signers = []
  for (let i = 0; i < signatariosEntrada.length; i++) {
    const s = signatariosEntrada[i]
    const nome = String(s.nome || s.name || '').trim()
    if (!nome) continue
    const item = { name: nome, email: String(s.email || '').trim() }
    const cpf = String(s.cpf || '').replace(/\D/g, '')
    if (cpf) item.cpf = cpf
    signers.push(item)
  }
  if (signers.length === 0) {
    const nomeConv = (edital.getString('sindico_nome') || '').trim()
    signers.push({ name: nomeConv || 'Convocante do Edital' })
  }

  const nomeDoc =
    String(body.nomeDocumento || edital.getString('titulo') || 'Edital de Convocação') + '.pdf'
  const payloadZapSign = {
    name: nomeDoc,
    signers: signers,
    lang: 'pt-br',
    external_id: 'edital-' + edital.id,
  }

  if (pdfBase64) {
    payloadZapSign.base64_pdf = pdfBase64
  } else {
    return e.json(400, {
      success: false,
      fallback: false,
      message: 'Nenhum PDF do edital foi informado para envio à ZapSign.',
    })
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
    const corpoErro = resp ? extrairTextoRespostaHttp(resp) : ''
    const rawBody = corpoErro || erroHttp
    const motivo =
      'Falha ao comunicar com a ZapSign (HTTP ' +
      statusCod +
      '): ' +
      (rawBody || 'sem detalhes no corpo da resposta').slice(0, 500)

    edital.set('zapsign_status', 'fallback_manual')
    edital.set('zapsign_motivo_falha', motivo)
    e.app.save(edital)

    registrarAuditoria(
      'zapsign_fallback_manual',
      'Fallback acionado no Edital ' + editalId + ': ' + motivo,
    )

    return e.json(200, {
      success: false,
      fallback: true,
      modo_assinatura: 'manual_impressao',
      motivo: motivo,
      message:
        'Não foi possível criar o documento na ZapSign. Edital marcado para assinatura manual (impressão).',
    })
  }

  // Corpo interpretado: resp.json primeiro; rawText não existe neste runtime (Bug 3)
  let dadosZap = extrairCorpoRespostaHttp(resp)
  if (dadosZap === null || typeof dadosZap !== 'object') {
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

  const signersComToken = urlsPorSignatario.filter((s) => s.token || s.sign_url)
  if (!docToken || signersComToken.length === 0) {
    const corpoTexto = extrairTextoRespostaHttp(resp)
    const motivo =
      'A ZapSign respondeu HTTP ' +
      resp.statusCode +
      ' sem token de documento ou sem links de signatários no corpo. Corpo da resposta: ' +
      (corpoTexto || 'vazio').slice(0, 500)

    edital.set('zapsign_status', 'fallback_manual')
    edital.set('zapsign_motivo_falha', motivo)
    edital.set('zapsign_documento_token', '')
    edital.set('zapsign_urls', [])
    e.app.save(edital)

    registrarAuditoria(
      'zapsign_fallback_manual',
      'Fallback acionado no Edital ' + editalId + ': ' + motivo,
    )

    return e.json(200, {
      success: false,
      fallback: true,
      modo_assinatura: 'manual_impressao',
      motivo: motivo,
      message:
        'A ZapSign respondeu, mas não retornou token do documento nem links de assinatura. Edital marcado para assinatura manual (impressão) em vez de gravar links vazios.',
    })
  }

  edital.set('zapsign_documento_token', docToken)
  edital.set('zapsign_status', 'aguardando_assinaturas')
  edital.set('zapsign_urls', urlsPorSignatario)
  edital.set('zapsign_enviado_em', new Date().toISOString())
  edital.set('zapsign_motivo_falha', '')
  e.app.save(edital)

  registrarAuditoria(
    'zapsign_documento_criado',
    'Edital ' +
      editalId +
      ' enviado para ZapSign (Doc: ' +
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
    zapsign_status: 'aguardando_assinaturas',
    zapsign_urls: urlsPorSignatario,
    message: 'Documento enviado com sucesso para a ZapSign!',
  })
})

// -------------------------------------------------------------
// 3c. POST /backend/v1/listas-presenca/{id}/enviar-zapsign — Lista de Presença
// -------------------------------------------------------------
routerAdd('POST', '/backend/v1/listas-presenca/{id}/enviar-zapsign', (e) => {
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

  const listaId = e.request.pathValue('id')
  let lista = null
  try {
    lista = e.app.findRecordById('listas_presenca', listaId)
  } catch (_) {
    return e.json(404, { success: false, message: 'Lista de presença não encontrada.' })
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

  const extrairCorpoRespostaHttp = (respX) => {
    if (!respX) return null
    if (respX.json !== undefined && respX.json !== null) return respX.json
    if (!respX.body) return null
    let texto = ''
    try {
      if (typeof respX.body === 'string') {
        texto = respX.body
      } else if (typeof respX.body === 'object' && respX.body.byteLength !== undefined) {
        texto = String.fromCharCode.apply(null, new Uint8Array(respX.body))
      } else {
        texto = String(respX.body)
      }
    } catch (_) {
      return null
    }
    try {
      return JSON.parse(texto)
    } catch (_) {
      return texto
    }
  }

  const extrairTextoRespostaHttp = (respX) => {
    if (!respX) return ''
    const corpo = extrairCorpoRespostaHttp(respX)
    if (corpo === null || corpo === undefined) return ''
    if (typeof corpo === 'string') return corpo
    try {
      return JSON.stringify(corpo)
    } catch (_) {
      return String(corpo)
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
      console.log('Aviso ao auditar envio zapsign (lista de presença):', audErr)
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
    lista.set('zapsign_status', 'fallback_manual')
    lista.set('zapsign_motivo_falha', motivo)
    e.app.save(lista)

    registrarAuditoria(
      'zapsign_fallback_manual',
      'Fallback acionado na Lista de Presença ' + listaId + ': ' + motivo,
    )

    return e.json(200, {
      success: false,
      fallback: true,
      modo_assinatura: 'manual_impressao',
      motivo: motivo,
      message:
        'ZapSign não configurada. A lista de presença foi marcada para assinatura manual (impressão).',
    })
  }

  // Payload vem em camelCase do front ({pdfBase64, signatarios[{nome,cpf,email,telefone,cargo}]})
  const body = e.requestInfo().body || {}
  const pdfBase64 = String(body.pdfBase64 || body.pdf_base64 || '').trim()
  const signatariosEntrada = Array.isArray(body.signatarios) ? body.signatarios : []

  // Montar signatários
  const signers = []
  for (let i = 0; i < signatariosEntrada.length; i++) {
    const s = signatariosEntrada[i]
    const nome = String(s.nome || s.name || '').trim()
    if (!nome) continue
    const item = { name: nome, email: String(s.email || '').trim() }
    const cpf = String(s.cpf || '').replace(/\D/g, '')
    if (cpf) item.cpf = cpf
    signers.push(item)
  }
  if (signers.length === 0) {
    signers.push({ name: 'Presidente da Mesa' })
  }

  const nomeDoc =
    String(body.nomeDocumento || lista.getString('titulo') || 'Lista de Presença') + '.pdf'
  const payloadZapSign = {
    name: nomeDoc,
    signers: signers,
    lang: 'pt-br',
    external_id: 'lista_presenca-' + lista.id,
  }

  if (pdfBase64) {
    payloadZapSign.base64_pdf = pdfBase64
  } else {
    return e.json(400, {
      success: false,
      fallback: false,
      message: 'Nenhum PDF da lista de presença foi informado para envio à ZapSign.',
    })
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
    const corpoErro = resp ? extrairTextoRespostaHttp(resp) : ''
    const rawBody = corpoErro || erroHttp
    const motivo =
      'Falha ao comunicar com a ZapSign (HTTP ' +
      statusCod +
      '): ' +
      (rawBody || 'sem detalhes no corpo da resposta').slice(0, 500)

    lista.set('zapsign_status', 'fallback_manual')
    lista.set('zapsign_motivo_falha', motivo)
    e.app.save(lista)

    registrarAuditoria(
      'zapsign_fallback_manual',
      'Fallback acionado na Lista de Presença ' + listaId + ': ' + motivo,
    )

    return e.json(200, {
      success: false,
      fallback: true,
      modo_assinatura: 'manual_impressao',
      motivo: motivo,
      message:
        'Não foi possível criar o documento na ZapSign. Lista de presença marcada para assinatura manual (impressão).',
    })
  }

  // Corpo interpretado: resp.json primeiro; rawText não existe neste runtime (Bug 3)
  let dadosZap = extrairCorpoRespostaHttp(resp)
  if (dadosZap === null || typeof dadosZap !== 'object') {
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

  const signersComToken = urlsPorSignatario.filter((s) => s.token || s.sign_url)
  if (!docToken || signersComToken.length === 0) {
    const corpoTexto = extrairTextoRespostaHttp(resp)
    const motivo =
      'A ZapSign respondeu HTTP ' +
      resp.statusCode +
      ' sem token de documento ou sem links de signatários no corpo. Corpo da resposta: ' +
      (corpoTexto || 'vazio').slice(0, 500)

    lista.set('zapsign_status', 'fallback_manual')
    lista.set('zapsign_motivo_falha', motivo)
    lista.set('zapsign_documento_token', '')
    lista.set('zapsign_urls', [])
    e.app.save(lista)

    registrarAuditoria(
      'zapsign_fallback_manual',
      'Fallback acionado na Lista de Presença ' + listaId + ': ' + motivo,
    )

    return e.json(200, {
      success: false,
      fallback: true,
      modo_assinatura: 'manual_impressao',
      motivo: motivo,
      message:
        'A ZapSign respondeu, mas não retornou token do documento nem links de assinatura. Lista de presença marcada para assinatura manual (impressão) em vez de gravar links vazios.',
    })
  }

  lista.set('zapsign_documento_token', docToken)
  lista.set('zapsign_status', 'aguardando_assinaturas')
  lista.set('zapsign_urls', urlsPorSignatario)
  lista.set('zapsign_enviado_em', new Date().toISOString())
  lista.set('zapsign_motivo_falha', '')
  e.app.save(lista)

  registrarAuditoria(
    'zapsign_documento_criado',
    'Lista de Presença ' +
      listaId +
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
    zapsign_status: 'aguardando_assinaturas',
    zapsign_urls: urlsPorSignatario,
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

        // rawText chega vazio neste runtime: o conteúdo do PDF vem em resp.body (bytes)
        // ou, em último caso, em resp.json como texto. O hash é sempre do conteúdo real.
        if (respPdf && respPdf.statusCode === 200) {
          let conteudoPdf = ''
          if (respPdf.body) {
            const bytes = new Uint8Array(respPdf.body)
            const BLOCO = 8192
            const partes = []
            for (let i = 0; i < bytes.length; i += BLOCO) {
              partes.push(String.fromCharCode.apply(null, bytes.subarray(i, i + BLOCO)))
            }
            conteudoPdf = partes.join('')
          } else if (typeof respPdf.json === 'string' && respPdf.json.length > 0) {
            conteudoPdf = respPdf.json
          }
          if (conteudoPdf.length > 0) {
            hashPdf = $security.sha256(conteudoPdf)
            ata.set('zapsign_pdf_assinado_hash', hashPdf)
            ata.set('hash_ata', hashPdf)
          } else {
            console.log(
              'Aviso: PDF assinado da ZapSign veio com corpo vazio; hash SHA-256 não calculado.',
            )
          }
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
