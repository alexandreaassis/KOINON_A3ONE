/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook para Sessões de Assinatura Eletrônica via Celular / QR Code (desktop ↔ mobile).
 *
 * Rotas:
 * 1. POST /backend/v1/assinatura/sessao/criar
 *    Cria uma nova sessão de assinatura temporária (15 minutos) vinculada a um documento.
 *    Retorna o token único e a URL pública para o QR Code.
 *
 * 2. GET /backend/v1/assinatura/sessao/{token}
 *    Consulta os dados públicos da sessão de assinatura para exibição no celular.
 *
 * 3. POST /backend/v1/assinatura/sessao/{token}/confirmar
 *    Submete a assinatura feita no celular (com nome, CPF, cargo, formato, traço/texto,
 *    data/hora declarada ou técnica). Atualiza a sessão para 'assinada', persiste os dados no
 *    documento de destino (editais_deliberacao, atas_assembleia, etc.) e grava na trilha
 *    de auditoria encadeada com o canal "assinado via mobile".
 *
 * 4. POST /backend/v1/assinatura/sessao/{token}/cancelar
 *    Cancela a sessão (ex: usuário fechou o modal no desktop).
 */

const { registrarAuditoria } = require(`${__hooks}/hash_encadeado.js`)

routerAdd('POST', '/backend/v1/assinatura/sessao/criar', (e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(401, { success: false, message: 'Usuário não autenticado.' })
  }

  const role = authRecord.getString('role')
  if (role !== 'admin' && role !== 'mesa') {
    return e.json(403, {
      success: false,
      message:
        'Apenas membros da Mesa Diretora ou Administradores podem gerar sessões de assinatura.',
    })
  }

  const body = e.requestInfo().body || {}
  const documentoId = (body.documentoId || '').trim()
  const documentoTipo = (body.documentoTipo || 'edital').trim() // 'edital', 'ata', 'lista_presenca', 'dossie'
  const deliberacaoId = (body.deliberacaoId || '').trim()
  const tituloDocumento = (body.tituloDocumento || 'Documento Oficial').trim()
  const hashDocumento = (body.hashDocumento || '').trim()
  const signatarioNome = (body.signatarioNome || authRecord.getString('name') || '').trim()
  const signatarioCpf = (body.signatarioCpf || authRecord.getString('cpf') || '').trim()
  const signatarioCargo = (body.signatarioCargo || 'Membro da Mesa').trim()
  const permitirDataHistorica = !!body.permitirDataHistorica
  const dataHoraDeclarada = (body.dataHoraDeclarada || '').trim()

  if (!documentoTipo) {
    return e.json(400, { success: false, message: 'documentoTipo é obrigatório.' })
  }

  // Gerar token aleatório seguro de 32 caracteres hexadecimais
  const token = $security.randomString(32)

  // Expira em 15 minutos
  const agora = new Date()
  const expiraEm = new Date(agora.getTime() + 15 * 60 * 1000)
  const expiraEmStr = expiraEm.toISOString().replace('T', ' ').substring(0, 19)

  const sessoesCol = e.app.findCollectionByNameOrId('sessoes_assinatura')
  const rec = new Record(sessoesCol)

  rec.set('token', token)
  rec.set('documento_id', documentoId || 'novo')
  rec.set('documento_tipo', documentoTipo)
  if (deliberacaoId) {
    try {
      rec.set('deliberacao', deliberacaoId)
    } catch (_) {}
  }
  rec.set('titulo_documento', tituloDocumento)
  rec.set('hash_documento', hashDocumento)
  rec.set('signatario_nome', signatarioNome)
  rec.set('signatario_cpf', signatarioCpf)
  rec.set('signatario_cargo', signatarioCargo)
  rec.set('permitir_data_historica', permitirDataHistorica)
  rec.set('data_hora_declarada', dataHoraDeclarada)
  rec.set('status', 'pendente')
  rec.set('expira_em', expiraEmStr)

  e.app.save(rec)

  return e.json(200, {
    success: true,
    token: token,
    expiraEm: expiraEm.toISOString(),
    tituloDocumento,
    documentoTipo,
  })
})

routerAdd('GET', '/backend/v1/assinatura/sessao/{token}', (e) => {
  const token = e.request.pathValue('token')
  if (!token) {
    return e.json(400, { success: false, message: 'Token não fornecido.' })
  }

  let rec
  try {
    rec = e.app.findFirstRecordByFilter('sessoes_assinatura', 'token = {:t}', { t: token })
  } catch (_) {
    return e.json(404, { success: false, message: 'Sessão de assinatura não encontrada.' })
  }

  const expiraEmStr = rec.getString('expira_em')
  let expirada = false
  if (expiraEmStr) {
    const expDate = new Date(expiraEmStr.replace(' ', 'T') + 'Z')
    if (new Date().getTime() > expDate.getTime() && rec.getString('status') === 'pendente') {
      rec.set('status', 'expirada')
      try {
        e.app.save(rec)
      } catch (_) {}
      expirada = true
    }
  }

  const status = expirada ? 'expirada' : rec.getString('status')

  return e.json(200, {
    success: true,
    token: rec.getString('token'),
    status: status,
    documentoId: rec.getString('documento_id'),
    documentoTipo: rec.getString('documento_tipo'),
    deliberacaoId: rec.getString('deliberacao'),
    tituloDocumento: rec.getString('titulo_documento'),
    hashDocumento: rec.getString('hash_documento'),
    signatarioNome: rec.getString('signatario_nome'),
    signatarioCpf: rec.getString('signatario_cpf'),
    signatarioCargo: rec.getString('signatario_cargo'),
    permitirDataHistorica: rec.getBool('permitir_data_historica'),
    dataHoraDeclarada: rec.getString('data_hora_declarada'),
    expiraEm: expiraEmStr,
    assinadoEm: rec.getString('assinado_em'),
    formatoAssinatura: rec.getString('formato_assinatura'),
    assinaturaTexto: rec.getString('assinatura_texto'),
    assinaturaVisual: rec.getString('assinatura_visual'),
    canalAssinatura: rec.getString('canal_assinatura'),
  })
})

routerAdd('POST', '/backend/v1/assinatura/sessao/{token}/confirmar', (e) => {
  const token = e.request.pathValue('token')
  if (!token) {
    return e.json(400, { success: false, message: 'Token não fornecido.' })
  }

  let rec
  try {
    rec = e.app.findFirstRecordByFilter('sessoes_assinatura', 'token = {:t}', { t: token })
  } catch (_) {
    return e.json(404, { success: false, message: 'Sessão de assinatura não encontrada.' })
  }

  const statusAtual = rec.getString('status')
  if (statusAtual === 'assinada') {
    return e.json(400, { success: false, message: 'Esta sessão de assinatura já foi utilizada.' })
  }
  if (statusAtual === 'cancelada') {
    return e.json(400, { success: false, message: 'Esta sessão de assinatura foi cancelada.' })
  }

  // Verificar se expirou
  const expiraEmStr = rec.getString('expira_em')
  if (expiraEmStr) {
    const expDate = new Date(expiraEmStr.replace(' ', 'T') + 'Z')
    if (new Date().getTime() > expDate.getTime()) {
      rec.set('status', 'expirada')
      try {
        e.app.save(rec)
      } catch (_) {}
      return e.json(400, { success: false, message: 'Esta sessão de assinatura expirou.' })
    }
  }

  const body = e.requestInfo().body || {}
  const nomeSignatario = (body.nome || rec.getString('signatario_nome') || '').trim()
  const cpfSignatario = (body.cpf || rec.getString('signatario_cpf') || '').trim()
  const formato = (body.formato || 'desenho').trim() // 'desenho' | 'texto' | 'em_branco'
  const assinaturaVisual = body.assinaturaVisual || ''
  const assinaturaTexto = (body.assinaturaTexto || '').trim()
  const dataHoraDeclarada = (
    body.dataHoraDeclarada ||
    rec.getString('data_hora_declarada') ||
    ''
  ).trim()

  if (!nomeSignatario) {
    return e.json(400, { success: false, message: 'O nome do signatário é obrigatório.' })
  }

  const agoraIso = new Date().toISOString()
  const agoraDb = agoraIso.replace('T', ' ').substring(0, 19)

  // Metadados técnicos do celular
  const reqInfo = e.requestInfo()
  const headers = reqInfo.headers || {}
  const userAgent = headers['user-agent'] || 'Dispositivo Móvel'
  const clientIp =
    headers['x-forwarded-for'] ||
    headers['x-real-ip'] ||
    headers['cf-connecting-ip'] ||
    'desconhecido'

  // Atualizar sessão
  rec.set('status', 'assinada')
  rec.set('signatario_nome', nomeSignatario)
  rec.set('signatario_cpf', cpfSignatario)
  rec.set('formato_assinatura', formato)
  rec.set('assinatura_visual', assinaturaVisual)
  rec.set('assinatura_texto', assinaturaTexto)
  rec.set('assinado_em', agoraDb)
  rec.set('canal_assinatura', 'assinado via mobile')
  rec.set('ip_dispositivo', clientIp)
  rec.set('user_agent', userAgent)

  if (dataHoraDeclarada) {
    rec.set('data_hora_declarada', dataHoraDeclarada)
  }

  if (e.auth) {
    rec.set('assinado_por_usuario', e.auth.id)
  }

  e.app.save(rec)

  // Atualizar documento de destino correspondente
  const docTipo = rec.getString('documento_tipo')
  const docId = rec.getString('documento_id')
  const delibId = rec.getString('deliberacao')
  const hashDoc = rec.getString('hash_documento')

  const dataEfetivaIso = dataHoraDeclarada ? new Date(dataHoraDeclarada).toISOString() : agoraIso
  const dataEfetivaDb = dataEfetivaIso.replace('T', ' ').substring(0, 19)

  try {
    if (docTipo === 'edital' && delibId) {
      let editalRec = null
      if (docId && docId !== 'novo') {
        try {
          editalRec = e.app.findRecordById('editais_deliberacao', docId)
        } catch (_) {}
      }
      if (!editalRec) {
        try {
          editalRec = e.app.findFirstRecordByFilter('editais_deliberacao', 'deliberacao = {:d}', {
            d: delibId,
          })
        } catch (_) {}
      }

      if (editalRec) {
        editalRec.set('status', 'assinado')
        editalRec.set('data_assinatura', dataEfetivaDb)
        if (hashDoc) editalRec.set('hash_assinado', hashDoc)
        editalRec.set('sindico_nome', nomeSignatario)
        if (cpfSignatario) editalRec.set('sindico_cpf', cpfSignatario)
        editalRec.set('formato_assinatura', formato)
        editalRec.set('assinatura_visual', assinaturaVisual)
        editalRec.set('assinatura_texto', assinaturaTexto)
        e.app.save(editalRec)
      }
    } else if (docTipo === 'ata' && (docId || delibId)) {
      let ataRec = null
      if (docId && docId !== 'novo') {
        try {
          ataRec = e.app.findRecordById('atas_assembleia', docId)
        } catch (_) {}
      }
      if (!ataRec && delibId) {
        try {
          ataRec = e.app.findFirstRecordByFilter('atas_assembleia', 'deliberacao = {:d}', {
            d: delibId,
          })
        } catch (_) {}
      }

      if (ataRec) {
        ataRec.set('status', 'assinada')
        ataRec.set('data_assinatura', dataEfetivaDb)
        if (hashDoc) ataRec.set('hash_assinado', hashDoc)
        ataRec.set('formato_assinatura', formato)
        ataRec.set('assinatura_visual', assinaturaVisual)
        ataRec.set('assinatura_texto', assinaturaTexto)
        e.app.save(ataRec)
      }
    }
  } catch (errDoc) {
    console.log('Aviso ao persistir assinatura no documento destino:', errDoc)
  }

  // Gravar na trilha de auditoria encadeada
  try {
    const dataDeclaradaFmt = dataHoraDeclarada
      ? new Date(dataHoraDeclarada).toLocaleString('pt-BR')
      : null
    const momentoTecnicoFmt = new Date(agoraIso).toLocaleString('pt-BR')

    let fatorAuditoria = `Assinatura eletrônica (Canal: assinado via mobile, Formato: ${formato}) por ${nomeSignatario}`
    if (cpfSignatario) {
      fatorAuditoria += ` (CPF: ${cpfSignatario})`
    }
    fatorAuditoria += ` no documento ${docTipo.toUpperCase()}`
    if (delibId) {
      fatorAuditoria += ` da deliberação ${delibId}`
    }
    if (dataDeclaradaFmt) {
      fatorAuditoria += ` com Data Declarada de Assinatura: ${dataDeclaradaFmt} (Registro técnico na plataforma: ${momentoTecnicoFmt})`
    } else {
      fatorAuditoria += ` em ${momentoTecnicoFmt}`
    }
    if (hashDoc) {
      fatorAuditoria += ` [Hash: ${hashDoc.substring(0, 16)}...]`
    }

    registrarAuditoria(e.app, {
      evento: 'assinatura_registrada_mobile',
      fator: fatorAuditoria,
      dispositivo: `${userAgent} (IP: ${clientIp})`,
    })
  } catch (errAud) {
    console.log('Aviso ao gravar auditoria de assinatura mobile:', errAud)
  }

  return e.json(200, {
    success: true,
    message: 'Assinatura eletrônica registrada com sucesso pelo celular.',
    assinadoEm: agoraIso,
    canal: 'assinado via mobile',
  })
})

routerAdd('POST', '/backend/v1/assinatura/sessao/{token}/cancelar', (e) => {
  const token = e.request.pathValue('token')
  if (!token) {
    return e.json(400, { success: false, message: 'Token não fornecido.' })
  }

  try {
    const rec = e.app.findFirstRecordByFilter('sessoes_assinatura', 'token = {:t}', { t: token })
    if (rec.getString('status') === 'pendente') {
      rec.set('status', 'cancelada')
      e.app.save(rec)
    }
    return e.json(200, { success: true, message: 'Sessão cancelada.' })
  } catch (_) {
    return e.json(404, { success: false, message: 'Sessão não encontrada.' })
  }
})
