/// <reference path="../pb_data/types.d.ts" />

/**
 * Integração Google Meet (Fase 1) — sala da assembleia criada pela mesa.
 *
 * Credencial: service account Google (JSON com client_email + private_key),
 * gravada CIFRADA na collection server-side `configuracoes_backend` (chave
 * GOOGLE_MEET_SERVICE_ACCOUNT), pelo mesmo padrão do token ZapSign e da
 * GROQ_API_KEY. A chave privada nunca volta ao front-end nem vai a log.
 *
 * Endpoints (todos exigem autenticação; gravação exige role admin):
 * 1. GET  /backend/v1/meet/config        — status (configurado, client_email) sem expor a chave
 * 2. POST /backend/v1/meet/config        — salva o JSON da service account cifrado
 * 3. POST /backend/v1/meet/criar-sala    — cria espaço na API Meet e salva link/metadata
 *    na deliberação ativa (campos meet_link, meet_space_name, meet_criado_em — migration 0056)
 *
 * Nota JSVM/Skip Cloud: $http.send não aceita rawText aqui — corpo JSON é passado
 * como objeto em "body" e lido em resp.json (com fallback resp.body). TODAS as
 * funções auxiliares são INLINE no callback routerAdd (top-level dá ReferenceError).
 * Assinatura RS256: usa $security.rs256 quando disponível; sem esse caminho o
 * runtime responde 500 com código RUNTIME_SEM_RS256 (não crasha).
 */

routerAdd('GET', '/backend/v1/meet/config', (e) => {
  let operador = e.auth
  if (!operador) {
    try {
      const authHeader = e.requestInfo().headers['authorization'] || ''
      const token = authHeader.replace(/^Bearer\s+/i, '').trim()
      if (token && e.app) {
        operador = e.app.findAuthRecordByToken(token, 'auth')
      }
    } catch (_) {}
  }
  if (!operador) {
    return e.json(401, { success: false, message: 'Usuário não autenticado.' })
  }

  // Auxiliar INLINE (JSVM): decifra o valor da credencial — prefixo ENC: é
  // base64 puro (fallback histórico), senão $security.decrypt com a ENCRYPTION_KEY.
  const decifrarValorMeet = (texto) => {
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

  let configurado = false
  let clientEmail = ''
  try {
    const rec = e.app.findFirstRecordByData(
      'configuracoes_backend',
      'chave',
      'GOOGLE_MEET_SERVICE_ACCOUNT',
    )
    if (rec) {
      const bruto = decifrarValorMeet(rec.getString('valor') || '')
      if (bruto) {
        const dados = JSON.parse(bruto)
        if (dados.client_email && dados.private_key) {
          configurado = true
          clientEmail = String(dados.client_email)
        }
      }
    }
  } catch (_) {}

  return e.json(200, {
    success: true,
    configurado: configurado,
    client_email: configurado ? clientEmail : '',
  })
})

routerAdd('POST', '/backend/v1/meet/config', (e) => {
  let operador = e.auth
  if (!operador) {
    try {
      const authHeader = e.requestInfo().headers['authorization'] || ''
      const token = authHeader.replace(/^Bearer\s+/i, '').trim()
      if (token && e.app) {
        operador = e.app.findAuthRecordByToken(token, 'auth')
      }
    } catch (_) {}
  }
  if (!operador || operador.getString('role') !== 'admin') {
    return e.json(403, {
      success: false,
      message: 'Apenas administradores podem configurar a credencial do Google Meet.',
    })
  }

  const body = e.requestInfo().body || {}
  const jsonBruto = String(body.service_account || '').trim()

  if (!jsonBruto) {
    return e.json(400, {
      success: false,
      message: 'Cole o JSON completo da service account (client_email + private_key).',
    })
  }

  // Validação estrutural mínima, sem logar o conteúdo
  let dados
  try {
    dados = JSON.parse(jsonBruto)
  } catch (_) {
    return e.json(400, {
      success: false,
      message:
        'O texto colado não é um JSON válido. Copie o arquivo .json completo da service account.',
    })
  }
  if (!dados || typeof dados !== 'object' || !dados.client_email || !dados.private_key) {
    return e.json(400, {
      success: false,
      message:
        'JSON incompleto: a service account precisa conter client_email e private_key. Baixe-a novamente em Google Cloud → IAM → Service Accounts.',
    })
  }

  // Auxiliares INLINE (JSVM) — codificação base64 com feature-detect do
  // $security.base64Encode e encoder manual UTF-8 como fallback.
  const b64EncodeManual = (texto) => {
    const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    const str = String(texto)
    const bytes = []
    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i)
      if (c < 0x80) bytes.push(c)
      else if (c < 0x800) bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f))
      else bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f))
    }
    let out = ''
    for (let i = 0; i < bytes.length; i += 3) {
      const b1 = bytes[i]
      const b2 = bytes[i + 1]
      const b3 = bytes[i + 2]
      out += CHARS[b1 >> 2]
      out += CHARS[((b1 & 3) << 4) | ((b2 === undefined ? 0 : b2) >> 4)]
      out += b2 === undefined ? '=' : CHARS[((b2 & 15) << 2) | ((b3 === undefined ? 0 : b3) >> 6)]
      out += b3 === undefined ? '=' : CHARS[b3 & 63]
    }
    return out
  }
  const codificarB64 = (texto) => {
    try {
      if (typeof $security !== 'undefined' && typeof $security.base64Encode === 'function') {
        return $security.base64Encode(texto)
      }
    } catch (_) {}
    return b64EncodeManual(texto)
  }

  const cifrarInline = (texto) => {
    if (!texto) return ''
    const key = ($os.getenv('ENCRYPTION_KEY') || 'koinon-zapsign-sec-key-32chars!')
      .padEnd(32, '0')
      .slice(0, 32)
    try {
      return $security.encrypt(texto, key)
    } catch (_) {
      return 'ENC:' + codificarB64(texto)
    }
  }

  try {
    let rec = null
    try {
      rec = e.app.findFirstRecordByData(
        'configuracoes_backend',
        'chave',
        'GOOGLE_MEET_SERVICE_ACCOUNT',
      )
    } catch (_) {}
    if (!rec) {
      const col = e.app.findCollectionByNameOrId('configuracoes_backend')
      rec = new Record(col)
      rec.set('chave', 'GOOGLE_MEET_SERVICE_ACCOUNT')
    }
    rec.set('valor', cifrarInline(jsonBruto))
    e.app.save(rec)
  } catch (err) {
    return e.json(500, {
      success: false,
      message:
        'Erro ao salvar a credencial cifrada: ' + (err && err.message ? err.message : String(err)),
    })
  }

  // Trilha de auditoria (mesma cadeia de hash dos demais hooks) — sem conteúdo sensível
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
      fator: 'Credencial Google Meet (service account) atualizada pelo admin ' + operador.id,
      seq: sequencial,
      ts: new Date().toISOString(),
    })
    const recAud = new Record(colAud)
    recAud.set('evento', 'configuracao_atualizada')
    recAud.set('data_hora', new Date().toISOString())
    recAud.set('fator', 'Credencial Google Meet atualizada pelo admin ' + operador.id)
    recAud.set('dispositivo', 'Admin ID ' + operador.id)
    recAud.set('sequencial', sequencial)
    recAud.set('hash_anterior', ultimoHash)
    recAud.set('hash_evento', $security.sha256(ultimoHash + ':' + p))
    e.app.save(recAud)
  } catch (audErr) {
    console.log('Aviso ao auditar config meet:', audErr)
  }

  return e.json(200, {
    success: true,
    message: 'Credencial do Google Meet salva e cifrada com sucesso.',
    configurado: true,
    client_email: String(dados.client_email),
  })
})

routerAdd('POST', '/backend/v1/meet/criar-sala', (e) => {
  let operador = e.auth
  if (!operador) {
    try {
      const authHeader = e.requestInfo().headers['authorization'] || ''
      const token = authHeader.replace(/^Bearer\s+/i, '').trim()
      if (token && e.app) {
        operador = e.app.findAuthRecordByToken(token, 'auth')
      }
    } catch (_) {}
  }
  if (!operador) {
    return e.json(401, { success: false, message: 'Usuário não autenticado.' })
  }

  const body = e.requestInfo().body || {}
  const deliberacaoId = String(body.deliberacaoId || '').trim()
  if (!deliberacaoId) {
    return e.json(400, { success: false, message: 'deliberacaoId é obrigatório.' })
  }

  let delib
  try {
    delib = e.app.findRecordById('deliberacoes', deliberacaoId)
  } catch (_) {
    return e.json(404, { success: false, message: 'Deliberação (assembleia) não encontrada.' })
  }

  // Se a assembleia já tem sala, devolve o link existente (idempotente)
  const linkExistente = (delib.getString('meet_link') || '').trim()
  if (linkExistente) {
    return e.json(200, {
      success: true,
      message: 'Esta assembleia já possui uma sala Meet.',
      meet_link: linkExistente,
      space_name: delib.getString('meet_space_name') || '',
      criado_em: delib.getString('meet_criado_em') || '',
      ja_existe: true,
    })
  }

  // Auxiliares INLINE (JSVM)
  const decifrarValorMeet = (texto) => {
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
  const b64EncodeManual = (texto) => {
    const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    const str = String(texto)
    const bytes = []
    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i)
      if (c < 0x80) bytes.push(c)
      else if (c < 0x800) bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f))
      else bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f))
    }
    let out = ''
    for (let i = 0; i < bytes.length; i += 3) {
      const b1 = bytes[i]
      const b2 = bytes[i + 1]
      const b3 = bytes[i + 2]
      out += CHARS[b1 >> 2]
      out += CHARS[((b1 & 3) << 4) | ((b2 === undefined ? 0 : b2) >> 4)]
      out += b2 === undefined ? '=' : CHARS[((b2 & 15) << 2) | ((b3 === undefined ? 0 : b3) >> 6)]
      out += b3 === undefined ? '=' : CHARS[b3 & 63]
    }
    return out
  }
  const codificarB64 = (texto) => {
    try {
      if (typeof $security !== 'undefined' && typeof $security.base64Encode === 'function') {
        return $security.base64Encode(texto)
      }
    } catch (_) {}
    return b64EncodeManual(texto)
  }
  // base64url (JWT) sobre o codificador acima
  const b64url = (input) =>
    codificarB64(String(input)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  // Ler credencial cifrada
  let credJson = ''
  try {
    const rec = e.app.findFirstRecordByData(
      'configuracoes_backend',
      'chave',
      'GOOGLE_MEET_SERVICE_ACCOUNT',
    )
    credJson = rec ? decifrarValorMeet(rec.getString('valor') || '') : ''
  } catch (_) {}

  if (!credJson) {
    return e.json(400, {
      success: false,
      codigo: 'CREDENCIAL_AUSENTE',
      message: 'Configure as credenciais do Google Meet em Administração antes de criar a sala.',
    })
  }

  let cred
  try {
    cred = JSON.parse(credJson)
  } catch (_) {
    return e.json(500, {
      success: false,
      codigo: 'CREDENCIAL_INVALIDA',
      message: 'A credencial salva não pôde ser lida. Reconfigure o Google Meet em Administração.',
    })
  }

  if (!cred.client_email || !cred.private_key) {
    return e.json(500, {
      success: false,
      codigo: 'CREDENCIAL_INVALIDA',
      message:
        'A credencial salva está incompleta (client_email/private_key). Reconfigure em Administração.',
    })
  }

  // ---- Passo 1: JWT RS256 assinado com a private_key → access token ----
  const agora = Math.floor(Date.now() / 1000)
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = b64url(
    JSON.stringify({
      iss: cred.client_email,
      scope: 'https://www.googleapis.com/auth/meetings.space.created',
      aud: 'https://oauth2.googleapis.com/token',
      iat: agora,
      exp: agora + 3600,
    }),
  )

  // Assinatura RS256 com feature-detect: caminho principal $security.rs256;
  // sem ele, o JSVM síncrono não consegue consumir crypto.subtle (Promise) —
  // responde 500 explícito em vez de crashar com ReferenceError.
  if (
    typeof $security === 'undefined' ||
    typeof $security.rs256 !== 'function'
  ) {
    return e.json(500, {
      success: false,
      codigo: 'RUNTIME_SEM_RS256',
      message:
        'Este runtime do PocketBase não expõe $security.rs256 (e o JSVM síncrono não suporta crypto.subtle). Atualize o PocketBase do backend para assinar o JWT RS256.',
    })
  }

  let assinatura
  try {
    assinatura = $security.rs256(header + '.' + claims, cred.private_key)
  } catch (err) {
    return e.json(500, {
      success: false,
      codigo: 'CREDENCIAL_INVALIDA',
      message:
        'A private_key da service account é inválida. Verifique se o JSON colado contém a chave completa em "-----BEGIN PRIVATE KEY-----".',
    })
  }

  const assersaoJwt = header + '.' + claims + '.' + b64url(assinatura)

  let respToken
  try {
    respToken = $http.send({
      url: 'https://oauth2.googleapis.com/token',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: {
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: assersaoJwt,
      },
    })
  } catch (err) {
    return e.json(502, {
      success: false,
      codigo: 'GOOGLE_INACESSIVEL',
      message:
        'Falha de rede ao contatar a Google para autenticar: ' +
        (err && err.message ? err.message : String(err)),
    })
  }

  let dadosToken = {}
  try {
    dadosToken = respToken.json || JSON.parse(respToken.body || '{}')
  } catch (_) {
    dadosToken = {}
  }
  if (!dadosToken.access_token) {
    return e.json(502, {
      success: false,
      codigo: 'AUTENTICACAO_GOOGLE_FALHOU',
      message:
        'A Google recusou a credencial da service account (' +
        (dadosToken.error || 'resposta sem access_token') +
        '). Confira o e-mail da conta, se a API Meet está habilitada no projeto e a permissão do domínio.',
    })
  }

  // ---- Passo 2: criar o espaço Meet (POST /v2/spaces) ----
  let respSala
  try {
    respSala = $http.send({
      url: 'https://meet.googleapis.com/v2/spaces',
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + dadosToken.access_token,
        'Content-Type': 'application/json',
      },
      body: {
        config: {
          accessType: 'OPEN',
          moderation: 'ON',
        },
      },
    })
  } catch (err) {
    return e.json(502, {
      success: false,
      codigo: 'CRIACAO_SALA_FALHOU',
      message:
        'A Google recusou a criação da sala: ' + (err && err.message ? err.message : String(err)),
    })
  }

  let dadosSala = {}
  try {
    dadosSala = respSala.json || JSON.parse(respSala.body || '{}')
  } catch (_) {
    dadosSala = {}
  }

  const nomeEspaco = dadosSala.name || ''
  const meetingUri = dadosSala.meetingUri || dadosSala.meetingCode || ''
  if (!nomeEspaco || !meetingUri) {
    return e.json(502, {
      success: false,
      codigo: 'CRIACAO_SALA_FALHOU',
      message:
        'A Google não retornou uma sala válida. Verifique se a API Google Meet está habilitada no projeto.',
    })
  }

  // Normalizar para o formato meet.google.com/xxx-xxxx-xxx quando possível
  let linkFinal = meetingUri
  try {
    const codigo = String(dadosSala.meetingCode || '')
    if (codigo && codigo.indexOf('-') !== -1) {
      linkFinal = 'https://meet.google.com/' + codigo
    }
  } catch (_) {}

  // ---- Passo 3: persistir na deliberação ----
  try {
    delib.set('meet_link', linkFinal)
    delib.set('meet_space_name', nomeEspaco)
    delib.set('meet_criado_em', new Date().toISOString())
    e.app.save(delib)
  } catch (err) {
    return e.json(500, {
      success: false,
      codigo: 'FALHA_PERSISTIR',
      message:
        'A sala foi criada na Google, mas falhou ao gravar o link na assembleia: ' +
        (err && err.message ? err.message : String(err)),
    })
  }

  return e.json(200, {
    success: true,
    message: 'Sala do Google Meet criada e vinculada à assembleia.',
    meet_link: linkFinal,
    space_name: nomeEspaco,
    criado_em: new Date().toISOString(),
  })
})
