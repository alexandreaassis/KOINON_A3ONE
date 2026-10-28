/**
 * Hook historico_alteracoes.js
 * Captura automática de operações de criação, atualização e exclusão
 * dos registros de dados operacionais do sistema Koinon.
 *
 * Collections monitoradas:
 * - unidades
 * - cadastros_unidade
 * - users
 * - deliberacoes
 * - itens_pauta
 * - editais_deliberacao
 * - documentos_pauta
 *
 * No Skip Cloud (PocketBase JSVM), todas as funções e variáveis devem ser
 * estritamente INLINE dentro de cada callback para evitar erros de scoping.
 */

// 1. Hook de CRIAÇÃO
onRecordCreateRequest((e) => {
  e.next()

  try {
    const record = e.record
    if (!record) return

    const colName = record.collection().name
    const permitidas = [
      'unidades',
      'cadastros_unidade',
      'users',
      'deliberacoes',
      'itens_pauta',
      'editais_deliberacao',
      'documentos_pauta',
    ]
    if (!permitidas.includes(colName)) return

    // 1. Obter Operador
    let userRecord = null
    let ip = ''
    let userAgent = ''

    try {
      if (e.auth) {
        userRecord = e.auth
      } else if (typeof e.requestInfo === 'function') {
        const info = e.requestInfo()
        if (info && info.auth) {
          userRecord = info.auth
        }
      }
    } catch (_) {}

    if (!userRecord && typeof e.requestInfo === 'function') {
      try {
        const authHeader =
          (e.requestInfo().headers && e.requestInfo().headers['authorization']) || ''
        const token = authHeader.replace(/^Bearer\s+/i, '').trim()
        if (token && e.app) {
          userRecord = e.app.findAuthRecordByToken(token, 'auth')
        }
      } catch (_) {}
    }

    try {
      if (typeof e.requestInfo === 'function') {
        const req = e.requestInfo()
        if (req && req.headers) {
          const xf = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || ''
          ip = typeof xf === 'string' ? xf.split(',')[0].trim() : ''
          userAgent = req.headers['user-agent'] || ''
        }
      }
    } catch (_) {}

    const userId = userRecord ? userRecord.id : null
    const nomeOp = userRecord
      ? userRecord.getString('name') || ''
      : 'Sistema / Procedimento Interno'
    const emailOp = userRecord ? userRecord.getString('email') || '' : ''
    const roleOp = userRecord ? userRecord.getString('role') || '' : 'sistema'

    // 2. Extrair rótulo amigável
    let rotulo = record.id || ''
    try {
      if (colName === 'unidades') {
        const iden = record.getString('identificador') || ''
        const bloco = record.getString('bloco') || ''
        const tipo = record.getString('tipo_unidade') || 'Unidade'
        rotulo = bloco ? `${tipo} ${iden} (${bloco})` : `${tipo} ${iden}`
      } else if (colName === 'cadastros_unidade') {
        const nome = record.getString('nome') || ''
        const vinc = record.getString('vinculo') || ''
        rotulo = vinc ? `${nome} (${vinc})` : nome
      } else if (colName === 'users') {
        const nome = record.getString('name') || ''
        const email = record.getString('email') || ''
        const role = record.getString('role') || ''
        rotulo = `${nome || email} [${role}]`
      } else if (colName === 'deliberacoes') {
        rotulo = record.getString('titulo') || 'Deliberação'
      } else if (colName === 'itens_pauta') {
        const ordem = record.getInt('ordem') || 0
        const tit = record.getString('titulo') || ''
        rotulo = ordem > 0 ? `Item ${ordem}: ${tit}` : tit
      } else if (colName === 'editais_deliberacao') {
        rotulo = record.getString('titulo') || 'Edital Convocatório'
      } else if (colName === 'documentos_pauta') {
        rotulo = record.getString('titulo') || 'Documento da Pauta'
      }
    } catch (_) {}

    // 3. Capturar valores dos campos sanitizados
    const diff = []
    const schemaFields = record.collection().fields || []
    for (let i = 0; i < schemaFields.length; i++) {
      const f = schemaFields[i]
      const fName = f.name
      if (!fName || fName === 'created' || fName === 'updated' || fName === 'id') continue
      if (fName === 'tokenKey' || fName === 'passwordHash') continue

      let val = null
      try {
        val = record.get(fName)
      } catch (_) {}

      if (val !== undefined && val !== null && val !== '') {
        let valLimpo = val
        const lower = fName.toLowerCase()
        if (
          lower.includes('password') ||
          lower.includes('token') ||
          lower.includes('senha') ||
          lower.includes('secret')
        ) {
          valLimpo = '[DADO PROTEGIDO / ALTERADO]'
        } else if (typeof val === 'object') {
          try {
            valLimpo = JSON.stringify(val)
          } catch (_) {
            valLimpo = String(val)
          }
        }

        diff.push({
          campo: fName,
          anterior: null,
          novo: valLimpo,
        })
      }
    }

    // 4. Salvar entrada de histórico
    const histCol = e.app.findCollectionByNameOrId('historico_alteracoes')
    const histRec = new Record(histCol)
    if (userId) {
      histRec.set('user', userId)
    }
    histRec.set('user_nome', nomeOp)
    histRec.set('user_email', emailOp)
    histRec.set('user_role', roleOp)
    histRec.set('acao', 'criacao')
    histRec.set('entidade', colName)
    histRec.set('registro_id', record.id)
    histRec.set('registro_rotulo', rotulo)
    histRec.set('campos_alterados', diff)
    histRec.set('ip', ip)
    histRec.set('user_agent', userAgent)
    histRec.set('data_hora', new Date().toISOString().replace('T', ' ').substring(0, 19))

    e.app.save(histRec)
  } catch (err) {
    console.log('Erro no hook onRecordCreateRequest (historico_alteracoes):', err)
  }
})

// 2. Hook de ATUALIZAÇÃO
onRecordUpdateRequest((e) => {
  const record = e.record
  let originalRecord = null
  let colName = ''
  const permitidas = [
    'unidades',
    'cadastros_unidade',
    'users',
    'deliberacoes',
    'itens_pauta',
    'editais_deliberacao',
    'documentos_pauta',
  ]

  if (record) {
    colName = record.collection().name
    if (permitidas.includes(colName)) {
      try {
        originalRecord = record.original()
      } catch (_) {}
    }
  }

  e.next()

  try {
    if (!record || !permitidas.includes(colName)) return

    // 1. Obter Operador
    let userRecord = null
    let ip = ''
    let userAgent = ''

    try {
      if (e.auth) {
        userRecord = e.auth
      } else if (typeof e.requestInfo === 'function') {
        const info = e.requestInfo()
        if (info && info.auth) {
          userRecord = info.auth
        }
      }
    } catch (_) {}

    if (!userRecord && typeof e.requestInfo === 'function') {
      try {
        const authHeader =
          (e.requestInfo().headers && e.requestInfo().headers['authorization']) || ''
        const token = authHeader.replace(/^Bearer\s+/i, '').trim()
        if (token && e.app) {
          userRecord = e.app.findAuthRecordByToken(token, 'auth')
        }
      } catch (_) {}
    }

    try {
      if (typeof e.requestInfo === 'function') {
        const req = e.requestInfo()
        if (req && req.headers) {
          const xf = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || ''
          ip = typeof xf === 'string' ? xf.split(',')[0].trim() : ''
          userAgent = req.headers['user-agent'] || ''
        }
      }
    } catch (_) {}

    const userId = userRecord ? userRecord.id : null
    const nomeOp = userRecord
      ? userRecord.getString('name') || ''
      : 'Sistema / Procedimento Interno'
    const emailOp = userRecord ? userRecord.getString('email') || '' : ''
    const roleOp = userRecord ? userRecord.getString('role') || '' : 'sistema'

    // 2. Extrair rótulo amigável
    let rotulo = record.id || ''
    try {
      if (colName === 'unidades') {
        const iden = record.getString('identificador') || ''
        const bloco = record.getString('bloco') || ''
        const tipo = record.getString('tipo_unidade') || 'Unidade'
        rotulo = bloco ? `${tipo} ${iden} (${bloco})` : `${tipo} ${iden}`
      } else if (colName === 'cadastros_unidade') {
        const nome = record.getString('nome') || ''
        const vinc = record.getString('vinculo') || ''
        rotulo = vinc ? `${nome} (${vinc})` : nome
      } else if (colName === 'users') {
        const nome = record.getString('name') || ''
        const email = record.getString('email') || ''
        const role = record.getString('role') || ''
        rotulo = `${nome || email} [${role}]`
      } else if (colName === 'deliberacoes') {
        rotulo = record.getString('titulo') || 'Deliberação'
      } else if (colName === 'itens_pauta') {
        const ordem = record.getInt('ordem') || 0
        const tit = record.getString('titulo') || ''
        rotulo = ordem > 0 ? `Item ${ordem}: ${tit}` : tit
      } else if (colName === 'editais_deliberacao') {
        rotulo = record.getString('titulo') || 'Edital Convocatório'
      } else if (colName === 'documentos_pauta') {
        rotulo = record.getString('titulo') || 'Documento da Pauta'
      }
    } catch (_) {}

    // 3. Comparar campos alterados
    const diff = []
    const schemaFields = record.collection().fields || []
    for (let i = 0; i < schemaFields.length; i++) {
      const f = schemaFields[i]
      const fName = f.name
      if (!fName || fName === 'created' || fName === 'updated' || fName === 'id') continue
      if (fName === 'tokenKey' || fName === 'passwordHash') continue

      let valNovo = null
      let valAntigo = null
      try {
        valNovo = record.get(fName)
      } catch (_) {}
      try {
        valAntigo = originalRecord ? originalRecord.get(fName) : null
      } catch (_) {}

      const strNovo = valNovo !== undefined && valNovo !== null ? JSON.stringify(valNovo) : ''
      const strAntigo =
        valAntigo !== undefined && valAntigo !== null ? JSON.stringify(valAntigo) : ''

      if (strNovo !== strAntigo) {
        let limpoAntigo = valAntigo
        let limpoNovo = valNovo
        const lower = fName.toLowerCase()

        if (
          lower.includes('password') ||
          lower.includes('token') ||
          lower.includes('senha') ||
          lower.includes('secret')
        ) {
          limpoAntigo = '[DADO PROTEGIDO]'
          limpoNovo = '[SENHA / CREDENCIAL ALTERADA]'
        } else {
          if (typeof valAntigo === 'object' && valAntigo !== null) {
            try {
              limpoAntigo = JSON.stringify(valAntigo)
            } catch (_) {
              limpoAntigo = String(valAntigo)
            }
          }
          if (typeof valNovo === 'object' && valNovo !== null) {
            try {
              limpoNovo = JSON.stringify(valNovo)
            } catch (_) {
              limpoNovo = String(valNovo)
            }
          }
        }

        diff.push({
          campo: fName,
          anterior: limpoAntigo,
          novo: limpoNovo,
        })
      }
    }

    if (diff.length > 0) {
      const histCol = e.app.findCollectionByNameOrId('historico_alteracoes')
      const histRec = new Record(histCol)
      if (userId) {
        histRec.set('user', userId)
      }
      histRec.set('user_nome', nomeOp)
      histRec.set('user_email', emailOp)
      histRec.set('user_role', roleOp)
      histRec.set('acao', 'atualizacao')
      histRec.set('entidade', colName)
      histRec.set('registro_id', record.id)
      histRec.set('registro_rotulo', rotulo)
      histRec.set('campos_alterados', diff)
      histRec.set('ip', ip)
      histRec.set('user_agent', userAgent)
      histRec.set('data_hora', new Date().toISOString().replace('T', ' ').substring(0, 19))

      e.app.save(histRec)
    }
  } catch (err) {
    console.log('Erro no hook onRecordUpdateRequest (historico_alteracoes):', err)
  }
})

// 3. Hook de EXCLUSÃO
onRecordDeleteRequest((e) => {
  let recordSnapshot = null
  let colName = ''
  let rotulo = ''
  let registroId = ''
  const permitidas = [
    'unidades',
    'cadastros_unidade',
    'users',
    'deliberacoes',
    'itens_pauta',
    'editais_deliberacao',
    'documentos_pauta',
  ]

  if (e.record) {
    colName = e.record.collection().name
    registroId = e.record.id
    if (permitidas.includes(colName)) {
      try {
        // Rótulo
        if (colName === 'unidades') {
          const iden = e.record.getString('identificador') || ''
          const bloco = e.record.getString('bloco') || ''
          const tipo = e.record.getString('tipo_unidade') || 'Unidade'
          rotulo = bloco ? `${tipo} ${iden} (${bloco})` : `${tipo} ${iden}`
        } else if (colName === 'cadastros_unidade') {
          const nome = e.record.getString('nome') || ''
          const vinc = e.record.getString('vinculo') || ''
          rotulo = vinc ? `${nome} (${vinc})` : nome
        } else if (colName === 'users') {
          const nome = e.record.getString('name') || ''
          const email = e.record.getString('email') || ''
          const role = e.record.getString('role') || ''
          rotulo = `${nome || email} [${role}]`
        } else if (colName === 'deliberacoes') {
          rotulo = e.record.getString('titulo') || 'Deliberação'
        } else if (colName === 'itens_pauta') {
          const ordem = e.record.getInt('ordem') || 0
          const tit = e.record.getString('titulo') || ''
          rotulo = ordem > 0 ? `Item ${ordem}: ${tit}` : tit
        } else if (colName === 'editais_deliberacao') {
          rotulo = e.record.getString('titulo') || 'Edital Convocatório'
        } else if (colName === 'documentos_pauta') {
          rotulo = e.record.getString('titulo') || 'Documento da Pauta'
        } else {
          rotulo = e.record.id || ''
        }

        const schemaFields = e.record.collection().fields || []
        const snapshot = []
        for (let i = 0; i < schemaFields.length; i++) {
          const f = schemaFields[i]
          const fName = f.name
          if (!fName || fName === 'created' || fName === 'updated' || fName === 'id') continue
          if (fName === 'tokenKey' || fName === 'passwordHash') continue

          let val = null
          try {
            val = e.record.get(fName)
          } catch (_) {}

          if (val !== undefined && val !== null && val !== '') {
            let valLimpo = val
            const lower = fName.toLowerCase()
            if (
              lower.includes('password') ||
              lower.includes('token') ||
              lower.includes('senha') ||
              lower.includes('secret')
            ) {
              valLimpo = '[DADO PROTEGIDO]'
            } else if (typeof val === 'object') {
              try {
                valLimpo = JSON.stringify(val)
              } catch (_) {
                valLimpo = String(val)
              }
            }

            snapshot.push({
              campo: fName,
              anterior: valLimpo,
              novo: null,
            })
          }
        }
        recordSnapshot = snapshot
      } catch (_) {}
    }
  }

  e.next()

  try {
    if (!permitidas.includes(colName)) return

    // Obter Operador
    let userRecord = null
    let ip = ''
    let userAgent = ''

    try {
      if (e.auth) {
        userRecord = e.auth
      } else if (typeof e.requestInfo === 'function') {
        const info = e.requestInfo()
        if (info && info.auth) {
          userRecord = info.auth
        }
      }
    } catch (_) {}

    if (!userRecord && typeof e.requestInfo === 'function') {
      try {
        const authHeader =
          (e.requestInfo().headers && e.requestInfo().headers['authorization']) || ''
        const token = authHeader.replace(/^Bearer\s+/i, '').trim()
        if (token && e.app) {
          userRecord = e.app.findAuthRecordByToken(token, 'auth')
        }
      } catch (_) {}
    }

    try {
      if (typeof e.requestInfo === 'function') {
        const req = e.requestInfo()
        if (req && req.headers) {
          const xf = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || ''
          ip = typeof xf === 'string' ? xf.split(',')[0].trim() : ''
          userAgent = req.headers['user-agent'] || ''
        }
      }
    } catch (_) {}

    const userId = userRecord ? userRecord.id : null
    const nomeOp = userRecord
      ? userRecord.getString('name') || ''
      : 'Sistema / Procedimento Interno'
    const emailOp = userRecord ? userRecord.getString('email') || '' : ''
    const roleOp = userRecord ? userRecord.getString('role') || '' : 'sistema'

    const histCol = e.app.findCollectionByNameOrId('historico_alteracoes')
    const histRec = new Record(histCol)
    if (userId) {
      histRec.set('user', userId)
    }
    histRec.set('user_nome', nomeOp)
    histRec.set('user_email', emailOp)
    histRec.set('user_role', roleOp)
    histRec.set('acao', 'exclusao')
    histRec.set('entidade', colName)
    histRec.set('registro_id', registroId)
    histRec.set('registro_rotulo', rotulo)
    histRec.set('campos_alterados', recordSnapshot || [])
    histRec.set('ip', ip)
    histRec.set('user_agent', userAgent)
    histRec.set('data_hora', new Date().toISOString().replace('T', ' ').substring(0, 19))

    e.app.save(histRec)
  } catch (err) {
    console.log('Erro no hook onRecordDeleteRequest (historico_alteracoes):', err)
  }
})
