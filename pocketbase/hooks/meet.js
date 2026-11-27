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

  // Auxiliares INLINE (JSVM): $security.base64Decode NÃO existe neste runtime —
  // decoder base64 manual + decifra: prefixo ENC: é base64 (fallback histórico),
  // senão $security.decrypt com a ENCRYPTION_KEY (padrão zapsign.js).
  const decodificarBase64Utf8 = (b64) => {
    const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    const limpo = String(b64).replace(/[^A-Za-z0-9+/=]/g, '')
    let bytesBrutos = ''
    let buffer = 0
    let bits = 0
    for (let i = 0; i < limpo.length; i++) {
      const c = limpo.charAt(i)
      if (c === '=') break
      const v = CHARS.indexOf(c)
      if (v < 0) continue
      buffer = (buffer << 6) | v
      bits += 6
      if (bits >= 8) {
        bits -= 8
        bytesBrutos += String.fromCharCode((buffer >> bits) & 0xff)
      }
    }
    let texto = ''
    for (let i = 0; i < bytesBrutos.length; i++) {
      const c = bytesBrutos.charCodeAt(i)
      if (c < 0x80) texto += String.fromCharCode(c)
      else if (c < 0xe0) {
        i++
        texto += String.fromCharCode(((c & 0x1f) << 6) | (bytesBrutos.charCodeAt(i) & 0x3f))
      } else if (c < 0xf0) {
        i += 2
        texto += String.fromCharCode(
          ((c & 0x0f) << 12) |
            ((bytesBrutos.charCodeAt(i - 1) & 0x3f) << 6) |
            (bytesBrutos.charCodeAt(i) & 0x3f),
        )
      } else {
        i += 3
        const cp =
          ((c & 0x07) << 18) |
          ((bytesBrutos.charCodeAt(i - 2) & 0x3f) << 12) |
          ((bytesBrutos.charCodeAt(i - 1) & 0x3f) << 6) |
          (bytesBrutos.charCodeAt(i) & 0x3f)
        const off = cp - 0x10000
        texto += String.fromCharCode(0xd800 + (off >> 10), 0xdc00 + (off & 0x3ff))
      }
    }
    return texto
  }
  const decifrarValorMeet = (texto) => {
    if (!texto) return ''
    const key = ($os.getenv('ENCRYPTION_KEY') || 'koinon-zapsign-sec-key-32chars!')
      .padEnd(32, '0')
      .slice(0, 32)
    if (texto.startsWith('ENC:')) {
      return decodificarBase64Utf8(texto.substring(4))
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

  // Auxiliares INLINE (JSVM) — mesmos do GET config (nada em top-level)
  const decodificarBase64Utf8 = (b64) => {
    const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    const limpo = String(b64).replace(/[^A-Za-z0-9+/=]/g, '')
    let bytesBrutos = ''
    let buffer = 0
    let bits = 0
    for (let i = 0; i < limpo.length; i++) {
      const c = limpo.charAt(i)
      if (c === '=') break
      const v = CHARS.indexOf(c)
      if (v < 0) continue
      buffer = (buffer << 6) | v
      bits += 6
      if (bits >= 8) {
        bits -= 8
        bytesBrutos += String.fromCharCode((buffer >> bits) & 0xff)
      }
    }
    let texto = ''
    for (let i = 0; i < bytesBrutos.length; i++) {
      const c = bytesBrutos.charCodeAt(i)
      if (c < 0x80) texto += String.fromCharCode(c)
      else if (c < 0xe0) {
        i++
        texto += String.fromCharCode(((c & 0x1f) << 6) | (bytesBrutos.charCodeAt(i) & 0x3f))
      } else if (c < 0xf0) {
        i += 2
        texto += String.fromCharCode(
          ((c & 0x0f) << 12) |
            ((bytesBrutos.charCodeAt(i - 1) & 0x3f) << 6) |
            (bytesBrutos.charCodeAt(i) & 0x3f),
        )
      } else {
        i += 3
        const cp =
          ((c & 0x07) << 18) |
          ((bytesBrutos.charCodeAt(i - 2) & 0x3f) << 12) |
          ((bytesBrutos.charCodeAt(i - 1) & 0x3f) << 6) |
          (bytesBrutos.charCodeAt(i) & 0x3f)
        const off = cp - 0x10000
        texto += String.fromCharCode(0xd800 + (off >> 10), 0xdc00 + (off & 0x3ff))
      }
    }
    return texto
  }
  const decifrarValorMeet = (texto) => {
    if (!texto) return ''
    const key = ($os.getenv('ENCRYPTION_KEY') || 'koinon-zapsign-sec-key-32chars!')
      .padEnd(32, '0')
      .slice(0, 32)
    if (texto.startsWith('ENC:')) {
      return decodificarBase64Utf8(texto.substring(4))
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

  // Parser da private_key: o JSON da service account pode trazer "\n" literais
  const privatePem = String(cred.private_key || '').replace(/\\n/g, '\n')

  // Auxiliares INLINE — assinatura RS256 (RSA PKCS#1 v1.5 + SHA-256) em JS puro
  // com BigInt: o JSVM do PocketBase não expõe $security.rs256 nem crypto.subtle
  // síncrono. Requer apenas $security.sha256 (hex) para o digest.
  const CHARS_B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  const hexParaBytes = (hex) => {
    let out = ''
    for (let i = 0; i < hex.length; i += 2) {
      out += String.fromCharCode(parseInt(hex.substring(i, i + 2), 16))
    }
    return out
  }
  const b64EncodeBytes = (bytesStr) => {
    let out = ''
    for (let i = 0; i < bytesStr.length; i += 3) {
      const b1 = bytesStr.charCodeAt(i)
      const b2 = bytesStr.charCodeAt(i + 1)
      const b3 = bytesStr.charCodeAt(i + 2)
      const tem2 = i + 1 < bytesStr.length
      const tem3 = i + 2 < bytesStr.length
      out += CHARS_B64[b1 >> 2]
      out += CHARS_B64[((b1 & 3) << 4) | ((tem2 ? b2 : 0) >> 4)]
      out += tem2 ? CHARS_B64[((b2 & 15) << 2) | ((tem3 ? b3 : 0) >> 6)] : '='
      out += tem3 ? CHARS_B64[b3 & 63] : '='
    }
    return out
  }
  const b64urlBytes = (bytesStr) =>
    b64EncodeBytes(bytesStr).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const bytesParaBigInt = (bytes) => {
    let r = 0n
    for (let i = 0; i < bytes.length; i++) r = (r << 8n) | BigInt(bytes.charCodeAt(i))
    return r
  }
  const bigIntParaBytes = (valor, tamanho) => {
    let v = valor
    const pile = []
    for (let i = 0; i < tamanho; i++) {
      pile.push(Number(v & 0xffn))
      v >>= 8n
    }
    let out = ''
    for (let i = tamanho - 1; i >= 0; i--) out += String.fromCharCode(pile[i])
    return out
  }
  const modPow = (base, exp, mod) => {
    let resultado = 1n
    let b = base % mod
    let e = exp
    while (e > 0n) {
      if (e & 1n) resultado = (resultado * b) % mod
      b = (b * b) % mod
      e >>= 1n
    }
    return resultado
  }
  const lerTlvDer = (bytes, pos) => {
    const tag = bytes.charCodeAt(pos)
    let len = bytes.charCodeAt(pos + 1)
    let next = pos + 2
    if (len & 0x80) {
      const qtde = len & 0x7f
      len = 0
      for (let i = 0; i < qtde; i++) {
        len = len * 256 + bytes.charCodeAt(next)
        next++
      }
    }
    return { tag: tag, valor: bytes.substring(next, next + len), fim: next + len }
  }
  // PKCS#8 PEM → { n, d } BigInt (service accounts usam "BEGIN PRIVATE KEY")
  const extrairChaveRsa = (pem) => {
    const limpo = String(pem)
      .replace(/-----BEGIN[^-]*-----/g, '')
      .replace(/-----END[^-]*-----/g, '')
      .replace(/[^A-Za-z0-9+/=]/g, '')
    let der = ''
    let buffer = 0
    let bits = 0
    for (let i = 0; i < limpo.length; i++) {
      const c = limpo.charAt(i)
      if (c === '=') break
      const v = CHARS_B64.indexOf(c)
      if (v < 0) continue
      buffer = (buffer << 6) | v
      bits += 6
      if (bits >= 8) {
        bits -= 8
        der += String.fromCharCode((buffer >> bits) & 0xff)
      }
    }
    const raiz = lerTlvDer(der, 0)
    let pos = 0
    const versao = lerTlvDer(raiz.valor, pos)
    pos = versao.fim
    const alg = lerTlvDer(raiz.valor, pos)
    pos = alg.fim
    const octet = lerTlvDer(raiz.valor, pos)
    const pkcs1 = octet.valor
    let p2 = 0
    const cab = lerTlvDer(pkcs1, p2)
    p2 = cab.fim
    const nT = lerTlvDer(pkcs1, p2)
    p2 = nT.fim
    const eT = lerTlvDer(pkcs1, p2)
    p2 = eT.fim
    const dT = lerTlvDer(pkcs1, p2)
    p2 = dT.fim
    return { n: bytesParaBigInt(nT.valor), d: bytesParaBigInt(dT.valor) }
  }
  const assinarRs256 = (mensagem, pem) => {
    const chave = extrairChaveRsa(pem)
    let bitsModulo = 0
    let x = chave.n
    while (x > 0n) {
      bitsModulo++
      x >>= 1n
    }
    const tamModulo = Math.ceil(bitsModulo / 8)
    const hashHex = $security.sha256(mensagem)
    const digestInfo =
      '\x30\x31\x30\x0d\x06\x09\x60\x86\x48\x01\x65\x03\x04\x02\x01\x05\x00\x04\x20'
    const t = digestInfo + hexParaBytes(hashHex)
    const tamPadding = tamModulo - t.length - 3
    if (tamPadding < 8) {
      throw new Error('chave RSA muito curta para PKCS#1 v1.5')
    }
    const em = '\x00\x01' + new Array(tamPadding + 1).join('\xff') + '\x00' + t
    return bigIntParaBytes(modPow(bytesParaBigInt(em), chave.d, chave.n), tamModulo)
  }

  let assinaturaBytes = null
  try {
    assinaturaBytes = assinarRs256(header + '.' + claims, privatePem)
  } catch (errAssina) {
    return e.json(500, {
      success: false,
      codigo: 'CREDENCIAL_INVALIDA',
      message:
        'A private_key da service account é inválida (' +
        (errAssina && errAssina.message ? errAssina.message : 'erro ao assinar') +
        '). Verifique se o JSON contém a chave completa em "-----BEGIN PRIVATE KEY-----".',
    })
  }
  if (!assinaturaBytes) {
    return e.json(500, {
      success: false,
      codigo: 'FALHA_ASSINAR',
      message: 'Não foi possível assinar o JWT com a private_key informada.',
    })
  }

  const assersaoJwt = header + '.' + claims + '.' + b64urlBytes(assinaturaBytes)

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
