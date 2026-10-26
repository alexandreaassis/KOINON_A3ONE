/**
 * Hook usuarios_gestao.js
 * Gerenciamento seguro de usuários pelo backend Skip Cloud (PocketBase)
 *
 * Funcionalidades:
 * 1) onRecordAuthRequest: Bloqueia autenticação se o usuário estiver inativo (ativo === false)
 * 2) POST /backend/v1/admin/usuarios/criar
 * 3) POST /backend/v1/admin/usuarios/atualizar
 * 4) POST /backend/v1/admin/usuarios/redefinir-senha
 */

// Interceptador de envio de e-mail de redefinição de senha para garantir URL pública amigável
onMailerRecordPasswordResetSend((e) => {
  try {
    const siteUrl = $os.getenv('SITE_URL') || ''
    const token = (e.meta && e.meta.token) || ''

    if (e.message && typeof e.message.html === 'string') {
      let html = e.message.html

      // 1. Se contiver o padrão padrão do PocketBase Admin UI: /_/#/auth/confirm-password-reset/
      if (token && html.includes('/_/#/auth/confirm-password-reset/')) {
        const regexAdminUi =
          /https?:\/\/[^\s"']+\/_+\/#\/auth\/confirm-password-reset\/[a-zA-Z0-9._-]+/g
        const novaUrl =
          (siteUrl ? siteUrl.replace(/\/$/, '') : '') + '/redefinir-senha?token=' + token
        html = html.replace(regexAdminUi, novaUrl)
      }

      // 2. Se houver {APP_URL} ou URL backend sendo usada onde deveria ser frontend
      if (siteUrl) {
        const backendUrl = $os.getenv('PB_INSTANCE_URL') || ''
        if (backendUrl && html.includes(backendUrl)) {
          html = html.split(backendUrl).join(siteUrl.replace(/\/$/, ''))
        }
      }

      // 3. Garantir que qualquer link apontando para reset-password ou confirm-password-reset
      // aponte para /redefinir-senha com token
      if (token && (html.includes('confirm-password-reset') || html.includes('reset-password'))) {
        const fallbackRegex =
          /https?:\/\/[^\s"']+\/(?:confirm-password-reset|reset-password|redefinir-senha)[^\s"']*/g
        const targetUrl =
          (siteUrl ? siteUrl.replace(/\/$/, '') : '') + '/redefinir-senha?token=' + token
        html = html.replace(fallbackRegex, targetUrl)
      }

      e.message.html = html
    }
  } catch (err) {
    console.log('Aviso no hook onMailerRecordPasswordResetSend:', err)
  }
  e.next()
})

// 1. Bloqueio no login se o usuário estiver com ativo === false e registro de logs de acesso
onRecordAuthRequest((e) => {
  const record = e.record
  if (record && record.collection().name === 'users') {
    const isAtivo = record.getBool('ativo')
    if (isAtivo === false) {
      // Registrar tentativa falha por usuário inativo
      try {
        const logsCol = e.app.findCollectionByNameOrId('logs_acesso')
        const logRec = new Record(logsCol)
        logRec.set('user', record.id)
        logRec.set('email', record.getString('email'))
        logRec.set('nome', record.getString('name'))
        logRec.set('data_hora', new Date().toISOString())
        logRec.set('metodo', 'senha')
        logRec.set('status', 'falha')
        logRec.set('motivo_falha', 'Usuário inativo no sistema')
        try {
          const req = e.requestInfo()
          if (req && req.headers) {
            const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || ''
            logRec.set('ip', typeof ip === 'string' ? ip.split(',')[0].trim() : '')
            logRec.set('user_agent', req.headers['user-agent'] || '')
          }
        } catch (_) {}
        e.app.save(logRec)
      } catch (logErr) {
        console.log('Aviso ao registrar log de acesso inativo:', logErr)
      }

      throw new BadRequestError('Usuário inativo — contate a administração.')
    }

    // Registrar autenticação bem-sucedida
    try {
      const logsCol = e.app.findCollectionByNameOrId('logs_acesso')
      const logRec = new Record(logsCol)
      logRec.set('user', record.id)
      logRec.set('email', record.getString('email'))
      logRec.set('nome', record.getString('name'))
      logRec.set('data_hora', new Date().toISOString())
      logRec.set('metodo', 'senha')
      logRec.set('status', 'sucesso')
      try {
        const req = e.requestInfo()
        if (req && req.headers) {
          const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || ''
          logRec.set('ip', typeof ip === 'string' ? ip.split(',')[0].trim() : '')
          logRec.set('user_agent', req.headers['user-agent'] || '')
        }
      } catch (_) {}
      e.app.save(logRec)
    } catch (logErr) {
      console.log('Aviso ao registrar log de acesso com sucesso:', logErr)
    }
  }

  e.next()
}, 'users')

// 2. Endpoint: Criar Usuário (Restrito exclusivamente a Administradores)
routerAdd('POST', '/backend/v1/admin/usuarios/criar', (e) => {
  function registrarAuditoria(app, dados) {
    try {
      const audCol = app.findCollectionByNameOrId('auditoria_events')
      let ultimoHash = '0000000000000000000000000000000000000000000000000000000000000000'
      let proximoSeq = 1

      try {
        const ultimos = app.findRecordsByFilter('auditoria_events', '', '-sequencial', 1, 0)
        if (ultimos && ultimos.length > 0) {
          const u = ultimos[0]
          ultimoHash = u.getString('hash_evento') || ultimoHash
          proximoSeq = (u.getInt('sequencial') || 0) + 1
        }
      } catch (_) {}

      const payload = JSON.stringify({
        evento: dados.evento,
        data_hora: dados.data_hora || new Date().toISOString(),
        unidade: dados.unidade || '',
        fator: dados.fator || '',
        dispositivo: dados.dispositivo || '',
        sequencial: proximoSeq,
        hash_anterior: ultimoHash,
      })

      const hashEvento = $security.sha256(ultimoHash + ':' + payload)

      const rec = new Record(audCol)
      rec.set('evento', dados.evento)
      rec.set(
        'data_hora',
        dados.data_hora || new Date().toISOString().replace('T', ' ').substring(0, 19),
      )
      if (dados.unidade) rec.set('unidade', dados.unidade)
      rec.set('fator', dados.fator || 'sistema')
      rec.set('dispositivo', dados.dispositivo || 'servidor')
      rec.set('sequencial', proximoSeq)
      rec.set('hash_evento', hashEvento)
      rec.set('hash_anterior', ultimoHash)

      app.save(rec)
      return rec
    } catch (err) {
      console.log('Erro ao registrar auditoria em usuarios_gestao:', err)
      return null
    }
  }

  let operador = e.auth
  if (!operador) {
    try {
      const authHeader = e.requestInfo().headers['authorization'] || ''
      const token = authHeader.replace(/^Bearer\s+/i, '').trim()
      if (token) {
        operador = e.app.findAuthRecordByToken(token, 'auth')
      }
    } catch (_) {}
  }
  if (!operador) {
    return e.json(403, { success: false, message: 'Acesso não autenticado.' })
  }
  const operadorRole = operador.getString('role')
  if (operadorRole !== 'admin') {
    return e.json(403, {
      success: false,
      message: 'Acesso restrito exclusivamente ao perfil de administrador.',
    })
  }

  const body = e.requestInfo().body || {}
  const nome = (body.name || '').trim()
  const email = (body.email || '').trim().toLowerCase()
  const rawCpf = String(body.cpf || '').trim()
  const cpf = rawCpf.replace(/\D/g, '').slice(0, 11)
  const role = body.role === 'admin' || body.role === 'mesa' ? body.role : 'morador'
  const unidadeId = (body.unidade || '').trim()
  const ativo = body.ativo !== false
  const enviarConvite = body.enviarConvite !== false

  if (!nome) {
    return e.json(400, { success: false, message: 'O nome do usuário é obrigatório.' })
  }
  if (!email || !email.includes('@')) {
    return e.json(400, { success: false, message: 'E-mail inválido ou não informado.' })
  }

  // Se CPF foi preenchido, verificar formato básico (11 dígitos)
  if (rawCpf && cpf.length > 0 && cpf.length !== 11) {
    return e.json(400, {
      success: false,
      message: 'CPF inválido. Certifique-se de preencher os 11 dígitos.',
    })
  }

  // Verificar se o e-mail já existe
  try {
    const jaExiste = e.app.findAuthRecordByEmail('_pb_users_auth_', email)
    if (jaExiste) {
      return e.json(400, {
        success: false,
        message: 'E-mail já está em uso por outro usuário.',
      })
    }
  } catch (_) {
    // E-mail livre
  }

  // Verificar unicidade de CPF (se informado)
  if (cpf) {
    try {
      const usersComCpf = e.app.findRecordsByFilter('users', 'cpf = {:c}', '', 1, 0, { c: cpf })
      if (usersComCpf && usersComCpf.length > 0) {
        return e.json(400, {
          success: false,
          message: 'CPF já cadastrado para outro condômino no sistema.',
        })
      }
    } catch (_) {}
  }

  // Validar se a unidade informada existe (se informada)
  if (unidadeId && unidadeId !== 'none') {
    try {
      e.app.findRecordById('unidades', unidadeId)
    } catch (_) {
      return e.json(400, {
        success: false,
        message: 'A unidade selecionada não foi localizada no cadastro do condomínio.',
      })
    }
  }

  // Gerar senha forte ou usar informada
  let senhaFinal = (body.password || '').trim()
  if (!senhaFinal || senhaFinal.length < 8) {
    senhaFinal = $security.randomString(16) + 'Aa1!'
  }

  const usersCol = e.app.findCollectionByNameOrId('_pb_users_auth_')
  const novoUser = new Record(usersCol)
  novoUser.setEmail(email)
  novoUser.setPassword(senhaFinal)
  novoUser.setVerified(true)
  novoUser.set('name', nome)
  novoUser.set('role', role)
  novoUser.set('ativo', ativo)
  if (cpf) {
    novoUser.set('cpf', cpf)
  }
  if (unidadeId && unidadeId !== 'none') {
    novoUser.set('unidade', unidadeId)
  }

  try {
    e.app.save(novoUser)
  } catch (saveErr) {
    console.log('Erro ao salvar novo usuário em usuarios_gestao:', saveErr)
    return e.json(400, {
      success: false,
      message: 'Não foi possível salvar o usuário. Verifique se o e-mail ou CPF já estão em uso.',
    })
  }

  // Enviar convite de definição/recuperação de senha se solicitado
  let conviteEnviado = false
  if (enviarConvite) {
    try {
      if (typeof $mails !== 'undefined' && typeof $mails.sendRecordPasswordReset === 'function') {
        $mails.sendRecordPasswordReset(e.app, novoUser)
      } else if (typeof e.app.sendRecordPasswordReset === 'function') {
        e.app.sendRecordPasswordReset(novoUser)
      } else if (typeof e.app.sendPasswordResetEmail === 'function') {
        e.app.sendPasswordResetEmail(novoUser)
      } else {
        throw new Error('Método de envio de redefinição de senha não disponível no runtime.')
      }
      conviteEnviado = true
    } catch (mailErr) {
      console.log('Aviso ao enviar e-mail de redefinição para novo usuário:', mailErr)
    }
  }

  // Registrar auditoria com hash encadeado
  const opNome = operador.getString('name') || operador.getString('email')
  registrarAuditoria(e.app, {
    evento: 'usuario_gerenciado',
    fator: `Operador ${opNome} cadastrou o usuário ${nome} (${email}, perfil: ${role})`,
    dispositivo: 'painel-admin',
    unidade: unidadeId && unidadeId !== 'none' ? unidadeId : '',
  })

  return e.json(200, {
    success: true,
    message:
      'Usuário cadastrado com sucesso.' +
      (conviteEnviado ? ' Convite de acesso enviado por e-mail.' : ''),
    conviteEnviado: conviteEnviado,
    user: {
      id: novoUser.id,
      name: novoUser.getString('name'),
      email: novoUser.getString('email'),
      role: novoUser.getString('role'),
      cpf: novoUser.getString('cpf'),
      unidade: novoUser.getString('unidade'),
      ativo: novoUser.getBool('ativo'),
      created: novoUser.getString('created'),
      updated: novoUser.getString('updated'),
    },
  })
})

// 3. Endpoint: Atualizar Usuário (Restrito exclusivamente a Administradores)
routerAdd('POST', '/backend/v1/admin/usuarios/atualizar', (e) => {
  function registrarAuditoria(app, dados) {
    try {
      const audCol = app.findCollectionByNameOrId('auditoria_events')
      let ultimoHash = '0000000000000000000000000000000000000000000000000000000000000000'
      let proximoSeq = 1

      try {
        const ultimos = app.findRecordsByFilter('auditoria_events', '', '-sequencial', 1, 0)
        if (ultimos && ultimos.length > 0) {
          const u = ultimos[0]
          ultimoHash = u.getString('hash_evento') || ultimoHash
          proximoSeq = (u.getInt('sequencial') || 0) + 1
        }
      } catch (_) {}

      const payload = JSON.stringify({
        evento: dados.evento,
        data_hora: dados.data_hora || new Date().toISOString(),
        unidade: dados.unidade || '',
        fator: dados.fator || '',
        dispositivo: dados.dispositivo || '',
        sequencial: proximoSeq,
        hash_anterior: ultimoHash,
      })

      const hashEvento = $security.sha256(ultimoHash + ':' + payload)

      const rec = new Record(audCol)
      rec.set('evento', dados.evento)
      rec.set(
        'data_hora',
        dados.data_hora || new Date().toISOString().replace('T', ' ').substring(0, 19),
      )
      if (dados.unidade) rec.set('unidade', dados.unidade)
      rec.set('fator', dados.fator || 'sistema')
      rec.set('dispositivo', dados.dispositivo || 'servidor')
      rec.set('sequencial', proximoSeq)
      rec.set('hash_evento', hashEvento)
      rec.set('hash_anterior', ultimoHash)

      app.save(rec)
      return rec
    } catch (err) {
      console.log('Erro ao registrar auditoria em usuarios_gestao:', err)
      return null
    }
  }

  let operador = e.auth
  if (!operador) {
    try {
      const authHeader = e.requestInfo().headers['authorization'] || ''
      const token = authHeader.replace(/^Bearer\s+/i, '').trim()
      if (token) {
        operador = e.app.findAuthRecordByToken(token, 'auth')
      }
    } catch (_) {}
  }
  if (!operador) {
    return e.json(403, { success: false, message: 'Acesso não autenticado.' })
  }
  const operadorRole = operador.getString('role')
  if (operadorRole !== 'admin') {
    return e.json(403, {
      success: false,
      message: 'Acesso restrito exclusivamente ao perfil de administrador.',
    })
  }

  const body = e.requestInfo().body || {}
  const id = (body.id || '').trim()
  if (!id) {
    return e.json(400, { success: false, message: 'ID do usuário não informado.' })
  }

  let userAlvo
  try {
    userAlvo = e.app.findRecordById('users', id)
  } catch (_) {
    return e.json(404, { success: false, message: 'Usuário não localizado no sistema.' })
  }

  const roleAnterior = userAlvo.getString('role')
  const ativoAnterior = userAlvo.getBool('ativo')
  const emailAlvo = userAlvo.getString('email')
  const nomeAnterior = userAlvo.getString('name')

  const novoNome = body.name !== undefined ? String(body.name).trim() : nomeAnterior
  const novoRole = body.role !== undefined ? String(body.role).trim() : roleAnterior
  const novoAtivo = body.ativo !== undefined ? Boolean(body.ativo) : ativoAnterior
  const rawUnidade = body.unidade !== undefined ? String(body.unidade).trim() : undefined
  const unidadeId =
    rawUnidade !== undefined
      ? rawUnidade === 'none' || rawUnidade === ''
        ? ''
        : rawUnidade
      : userAlvo.getString('unidade')

  const rawCpf = body.cpf !== undefined ? String(body.cpf).trim() : undefined
  const cpf =
    rawCpf !== undefined ? rawCpf.replace(/\D/g, '').slice(0, 11) : userAlvo.getString('cpf')

  if (body.name !== undefined && !novoNome) {
    return e.json(400, { success: false, message: 'O nome do usuário não pode ficar vazio.' })
  }

  if (rawCpf !== undefined && rawCpf.length > 0 && cpf.length !== 11) {
    return e.json(400, {
      success: false,
      message: 'CPF inválido. Certifique-se de preencher os 11 dígitos.',
    })
  }

  // Verificar se o CPF já pertence a outro usuário
  if (cpf && cpf !== userAlvo.getString('cpf')) {
    try {
      const usersComCpf = e.app.findRecordsByFilter(
        'users',
        'cpf = {:c} && id != {:id}',
        '',
        1,
        0,
        {
          c: cpf,
          id: userAlvo.id,
        },
      )
      if (usersComCpf && usersComCpf.length > 0) {
        return e.json(400, {
          success: false,
          message: 'CPF já cadastrado para outro condômino no sistema.',
        })
      }
    } catch (_) {}
  }

  // Regra de segurança: Não permitir desativar ou demover o próprio usuário logado
  if (operador.id === userAlvo.id) {
    if (novoAtivo === false) {
      return e.json(400, {
        success: false,
        message: 'Não é permitido desativar sua própria conta de gestor.',
      })
    }
    if ((roleAnterior === 'admin' || roleAnterior === 'mesa') && novoRole === 'morador') {
      return e.json(400, {
        success: false,
        message: 'Não é permitido revogar seus próprios privilégios administrativos.',
      })
    }
  }

  // Regra de segurança: Não permitir desativar ou demover o último gestor ativo
  const eraGestorAtivo =
    (roleAnterior === 'admin' || roleAnterior === 'mesa') && ativoAnterior !== false
  const deixaraDeSerGestorAtivo =
    novoAtivo === false || (novoRole !== 'admin' && novoRole !== 'mesa')

  if (eraGestorAtivo && deixaraDeSerGestorAtivo) {
    // Contar gestores ativos excluindo o alvo
    let gestoresRestantes = 0
    try {
      const todos = e.app.findRecordsByFilter('users', 'ativo = true', '', 100, 0)
      for (let i = 0; i < todos.length; i++) {
        const u = todos[i]
        if (u.id === userAlvo.id) continue
        const r = u.getString('role')
        if (r === 'admin' || r === 'mesa') {
          gestoresRestantes++
        }
      }
    } catch (err) {
      console.log('Erro ao contar gestores ativos:', err)
      gestoresRestantes = 1
    }

    if (gestoresRestantes < 1) {
      return e.json(400, {
        success: false,
        message:
          'Ação bloqueada: Não é possível desativar ou demover o último gestor ativo do condomínio.',
      })
    }
  }

  // Validar se a unidade existe antes de associar (se informada)
  if (body.unidade !== undefined && unidadeId && unidadeId !== 'none') {
    try {
      e.app.findRecordById('unidades', unidadeId)
    } catch (_) {
      return e.json(400, {
        success: false,
        message: 'A unidade informada para vinculação não existe ou foi removida.',
      })
    }
  }

  // Aplicar alterações
  if (novoNome) userAlvo.set('name', novoNome)
  if (novoRole) userAlvo.set('role', novoRole)
  userAlvo.set('ativo', novoAtivo)
  if (body.cpf !== undefined) {
    userAlvo.set('cpf', cpf || '')
  }
  if (body.unidade !== undefined) {
    userAlvo.set('unidade', unidadeId === 'none' ? '' : unidadeId)
  }

  try {
    e.app.save(userAlvo)
  } catch (saveErr) {
    console.log('Erro ao salvar registro de usuário em usuarios_gestao:', saveErr)
    return e.json(400, {
      success: false,
      message: 'Não foi possível gravar os dados do usuário. Verifique as informações preenchidas.',
    })
  }

  // Auditoria
  const opNome = operador.getString('name') || operador.getString('email')
  let descricaoMudanca = `Operador ${opNome} atualizou os dados do usuário ${novoNome} (${emailAlvo})`
  if (ativoAnterior !== novoAtivo) {
    descricaoMudanca += ` | Status: ${novoAtivo ? 'ATIVADO' : 'DESATIVADO'}`
  }
  if (roleAnterior !== novoRole) {
    descricaoMudanca += ` | Perfil: ${roleAnterior} -> ${novoRole}`
  }

  registrarAuditoria(e.app, {
    evento: 'usuario_gerenciado',
    fator: descricaoMudanca,
    dispositivo: 'painel-admin',
    unidade: unidadeId && unidadeId !== 'none' ? unidadeId : '',
  })

  return e.json(200, {
    success: true,
    message: 'Usuário atualizado com sucesso.',
    user: {
      id: userAlvo.id,
      name: userAlvo.getString('name'),
      email: userAlvo.getString('email'),
      role: userAlvo.getString('role'),
      cpf: userAlvo.getString('cpf'),
      unidade: userAlvo.getString('unidade'),
      ativo: userAlvo.getBool('ativo'),
      created: userAlvo.getString('created'),
      updated: userAlvo.getString('updated'),
    },
  })
})

// 4. Endpoint: Redefinir Senha (dispara e-mail) (Restrito a Administradores)
routerAdd('POST', '/backend/v1/admin/usuarios/redefinir-senha', (e) => {
  function registrarAuditoria(app, dados) {
    try {
      const audCol = app.findCollectionByNameOrId('auditoria_events')
      let ultimoHash = '0000000000000000000000000000000000000000000000000000000000000000'
      let proximoSeq = 1

      try {
        const ultimos = app.findRecordsByFilter('auditoria_events', '', '-sequencial', 1, 0)
        if (ultimos && ultimos.length > 0) {
          const u = ultimos[0]
          ultimoHash = u.getString('hash_evento') || ultimoHash
          proximoSeq = (u.getInt('sequencial') || 0) + 1
        }
      } catch (_) {}

      const payload = JSON.stringify({
        evento: dados.evento,
        data_hora: dados.data_hora || new Date().toISOString(),
        unidade: dados.unidade || '',
        fator: dados.fator || '',
        dispositivo: dados.dispositivo || '',
        sequencial: proximoSeq,
        hash_anterior: ultimoHash,
      })

      const hashEvento = $security.sha256(ultimoHash + ':' + payload)

      const rec = new Record(audCol)
      rec.set('evento', dados.evento)
      rec.set(
        'data_hora',
        dados.data_hora || new Date().toISOString().replace('T', ' ').substring(0, 19),
      )
      if (dados.unidade) rec.set('unidade', dados.unidade)
      rec.set('fator', dados.fator || 'sistema')
      rec.set('dispositivo', dados.dispositivo || 'servidor')
      rec.set('sequencial', proximoSeq)
      rec.set('hash_evento', hashEvento)
      rec.set('hash_anterior', ultimoHash)

      app.save(rec)
      return rec
    } catch (err) {
      console.log('Erro ao registrar auditoria em usuarios_gestao:', err)
      return null
    }
  }

  let operador = e.auth
  if (!operador) {
    try {
      const authHeader = e.requestInfo().headers['authorization'] || ''
      const token = authHeader.replace(/^Bearer\s+/i, '').trim()
      if (token) {
        operador = e.app.findAuthRecordByToken(token, 'auth')
      }
    } catch (_) {}
  }
  if (!operador) {
    return e.json(403, { success: false, message: 'Acesso não autenticado.' })
  }
  const operadorRole = operador.getString('role')
  if (operadorRole !== 'admin') {
    return e.json(403, {
      success: false,
      message: 'Acesso restrito exclusivamente ao perfil de administrador.',
    })
  }

  const body = e.requestInfo().body || {}
  const id = (body.id || '').trim()
  if (!id) {
    return e.json(400, { success: false, message: 'ID do usuário não informado.' })
  }

  let userAlvo
  try {
    userAlvo = e.app.findRecordById('users', id)
  } catch (_) {
    return e.json(404, { success: false, message: 'Usuário não localizado.' })
  }

  const email = userAlvo.getString('email')
  const nome = userAlvo.getString('name') || email

  try {
    if (typeof $mails !== 'undefined' && typeof $mails.sendRecordPasswordReset === 'function') {
      $mails.sendRecordPasswordReset(e.app, userAlvo)
    } else if (typeof e.app.sendRecordPasswordReset === 'function') {
      e.app.sendRecordPasswordReset(userAlvo)
    } else if (typeof e.app.sendPasswordResetEmail === 'function') {
      e.app.sendPasswordResetEmail(userAlvo)
    } else {
      throw new Error('Método de envio de redefinição de senha não disponível no runtime.')
    }
  } catch (err) {
    console.log('Erro ao disparar e-mail de redefinição de senha:', err)
    return e.json(500, { success: false, message: 'Falha ao disparar e-mail de recuperação.' })
  }

  const opNome = operador.getString('name') || operador.getString('email')
  registrarAuditoria(e.app, {
    evento: 'usuario_gerenciado',
    fator: `Operador ${opNome} enviou e-mail de redefinição de senha para ${nome} (${email})`,
    dispositivo: 'painel-admin',
  })

  return e.json(200, {
    success: true,
    message: `Instruções de redefinição de senha enviadas com sucesso para ${email}.`,
  })
})

// 5. Endpoint: Registrar tentativa de login falha (chamado pelo cliente quando pb.authWithPassword falha)
routerAdd('POST', '/backend/v1/auth/log-falha', (e) => {
  const body = e.requestInfo().body || {}
  const email = (body.email || '').trim().toLowerCase()
  const motivo = (body.motivo || 'Credenciais inválidas').trim()

  if (!email || !email.includes('@')) {
    return e.json(400, { success: false, message: 'E-mail não informado.' })
  }

  try {
    let userId = ''
    let userName = ''
    try {
      const userRec = e.app.findAuthRecordByEmail('_pb_users_auth_', email)
      if (userRec) {
        userId = userRec.id
        userName = userRec.getString('name')
      }
    } catch (_) {}

    const logsCol = e.app.findCollectionByNameOrId('logs_acesso')
    const logRec = new Record(logsCol)
    if (userId) logRec.set('user', userId)
    logRec.set('email', email)
    if (userName) logRec.set('nome', userName)
    logRec.set('data_hora', new Date().toISOString())
    logRec.set('metodo', 'senha')
    logRec.set('status', 'falha')
    logRec.set('motivo_falha', motivo)

    try {
      const req = e.requestInfo()
      if (req && req.headers) {
        const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || ''
        logRec.set('ip', typeof ip === 'string' ? ip.split(',')[0].trim() : '')
        logRec.set('user_agent', req.headers['user-agent'] || '')
      }
    } catch (_) {}

    e.app.save(logRec)
    return e.json(200, { success: true })
  } catch (err) {
    console.log('Erro ao salvar log de tentativa falha:', err)
    return e.json(200, { success: false })
  }
})
