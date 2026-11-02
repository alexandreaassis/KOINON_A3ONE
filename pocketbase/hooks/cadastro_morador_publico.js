/**
 * Hook cadastro_morador_publico.js
 *
 * Endpoints:
 * 1) GET /backend/v1/publico/unidade/:token
 *    Acessado sem autenticação pelo link público da unidade.
 *    Resolve o token e retorna APENAS dados seguros de identificação da unidade
 *    (identificador, bloco, tipo_unidade, rotulo, nome_condominio).
 *    NÃO expõe IDs internos, listas de moradores, contatos ou outras unidades.
 *
 * 2) POST /backend/v1/publico/cadastro-morador
 *    Submete o cadastro de morador/proprietário a partir do link público.
 *    Grava o registro com:
 *      - status_aprovacao = 'pendente'
 *      - ativo = false
 *      - origem = 'link_publico'
 *    Valida CPF, data de nascimento (obrigatória, válida, não futura) e vínculo ('condomino' | 'locatario' | 'proprietario').
 *    Não expõe dados de terceiros em caso de duplicidade (mensagem neutra e institucional).
 *
 * 3) POST /backend/v1/admin/unidades/enviar-link-email
 *    Ação administrativa/mesa para disparar o e-mail oficial com o link de cadastro da unidade.
 *
 * 4) POST /backend/v1/admin/cadastros/aprovar
 *    Mesa aprova o cadastro pendente: status_aprovacao = 'aprovado' e ativo = true.
 *
 * 5) POST /backend/v1/admin/cadastros/rejeitar
 *    Mesa rejeita o cadastro pendente: status_aprovacao = 'rejeitado' e ativo = false.
 *
 * 6) POST /backend/v1/admin/unidades/garantir-token
 *    Garante que a unidade possui um token único e seguro gerado.
 */

// Garantir token único nas unidades ao salvar se estiver vazio
onRecordCreate((e) => {
  e.next()
  try {
    const u = e.record
    if (!u.getString('token_cadastro')) {
      u.set('token_cadastro', $security.randomString(32))
      e.app.save(u)
    }
  } catch (err) {
    console.log('Erro ao atribuir token_cadastro na criacao da unidade:', err)
  }
}, 'unidades')

// 1. GET /backend/v1/publico/unidade/:token
routerAdd('GET', '/backend/v1/publico/unidade/{token}', (e) => {
  const token = (e.request.pathValue('token') || '').trim()
  if (!token || token.length < 16) {
    return e.json(404, { success: false, message: 'Link de cadastro não encontrado ou inválido.' })
  }

  let unidade
  try {
    const list = e.app.findRecordsByFilter('unidades', 'token_cadastro = {:tok}', '', 1, 0, {
      tok: token,
    })
    if (list && list.length > 0) {
      unidade = list[0]
    }
  } catch (_) {}

  if (!unidade || !unidade.getBool('ativo')) {
    return e.json(404, {
      success: false,
      message: 'Unidade não localizada ou desativada. Verifique com a administração.',
    })
  }

  let nomeCondo = 'Condomínio Residencial Lago Azul'
  let rotuloPadrao = 'Unidade'
  try {
    const configs = e.app.findRecordsByFilter('configuracoes', '', '-created', 1, 0)
    if (configs && configs.length > 0) {
      nomeCondo = configs[0].getString('nome_condominio') || nomeCondo
      rotuloPadrao = configs[0].getString('rotulo_unidade') || rotuloPadrao
    }
  } catch (_) {}

  const identificador = unidade.getString('identificador') || ''
  const bloco = (unidade.getString('bloco') || '').trim()
  const tipoUnidade = unidade.getString('tipo_unidade') || rotuloPadrao

  return e.json(200, {
    success: true,
    unidade: {
      identificador: identificador,
      bloco: bloco, // pode ser vazio se torre única
      tipo_unidade: tipoUnidade,
      tem_bloco: !!bloco,
    },
    condominio: {
      nome: nomeCondo,
    },
  })
})

// 2. POST /backend/v1/publico/cadastro-morador
routerAdd('POST', '/backend/v1/publico/cadastro-morador', (e) => {
  // Função inline de validação de CPF
  function validarCpf(cpfStr) {
    if (!cpfStr) return false
    const limpo = String(cpfStr).replace(/\D/g, '')
    if (limpo.length !== 11) return false
    if (/^(\d)\1{10}$/.test(limpo)) return false

    let soma = 0
    for (let i = 0; i < 9; i++) {
      soma += parseInt(limpo.charAt(i), 10) * (10 - i)
    }
    let resto = (soma * 10) % 11
    if (resto === 10 || resto === 11) resto = 0
    if (resto !== parseInt(limpo.charAt(9), 10)) return false

    soma = 0
    for (let i = 0; i < 10; i++) {
      soma += parseInt(limpo.charAt(i), 10) * (11 - i)
    }
    resto = (soma * 10) % 11
    if (resto === 10 || resto === 11) resto = 0
    return resto === parseInt(limpo.charAt(10), 10)
  }

  const body = e.requestInfo().body || {}
  const token = (body.token || '').trim()
  const nome = (body.nome || '').trim()
  const cpfRaw = (body.cpf || '').trim()
  const dataNascimento = (body.data_nascimento || '').trim()
  const email = (body.email || '').trim().toLowerCase()
  const telefone = (body.telefone || '').trim()
  const vinculoRaw = (body.vinculo || '').trim().toLowerCase()

  if (!token) {
    return e.json(400, { success: false, message: 'Token de unidade não informado.' })
  }

  let unidade
  try {
    const list = e.app.findRecordsByFilter('unidades', 'token_cadastro = {:tok}', '', 1, 0, {
      tok: token,
    })
    if (list && list.length > 0) {
      unidade = list[0]
    }
  } catch (_) {}

  if (!unidade || !unidade.getBool('ativo')) {
    return e.json(404, { success: false, message: 'Link de cadastro inválido ou expirado.' })
  }

  if (!nome || nome.length < 3) {
    return e.json(400, { success: false, message: 'Informe o nome completo.' })
  }

  const cpfLimpo = cpfRaw.replace(/\D/g, '')
  if (!validarCpf(cpfLimpo)) {
    return e.json(400, { success: false, message: 'CPF inválido.' })
  }

  // Validação de Data de Nascimento: obrigatória, formato YYYY-MM-DD, data válida e não futura
  if (!dataNascimento || !/^\d{4}-\d{2}-\d{2}$/.test(dataNascimento)) {
    return e.json(400, {
      success: false,
      message: 'Informe uma data de nascimento válida no formato AAAA-MM-DD.',
    })
  }

  const partesData = dataNascimento.split('-')
  const ano = parseInt(partesData[0], 10)
  const mes = parseInt(partesData[1], 10)
  const dia = parseInt(partesData[2], 10)
  const dataNascObj = new Date(ano, mes - 1, dia)

  if (
    isNaN(dataNascObj.getTime()) ||
    dataNascObj.getFullYear() !== ano ||
    dataNascObj.getMonth() !== mes - 1 ||
    dataNascObj.getDate() !== dia
  ) {
    return e.json(400, { success: false, message: 'Data de nascimento inválida.' })
  }

  const hoje = new Date()
  hoje.setHours(23, 59, 59, 999)
  if (dataNascObj > hoje) {
    return e.json(400, {
      success: false,
      message: 'A data de nascimento não pode estar no futuro.',
    })
  }

  if (ano < 1900) {
    return e.json(400, {
      success: false,
      message: 'Data de nascimento incompatível (ano anterior a 1900).',
    })
  }

  // Validar Vínculo
  let vinculoValido = 'condomino'
  if (vinculoRaw === 'proprietario' || vinculoRaw === 'proprietário') {
    vinculoValido = 'proprietario'
  } else if (
    vinculoRaw === 'locatario' ||
    vinculoRaw === 'locatário' ||
    vinculoRaw === 'inquilino'
  ) {
    vinculoValido = 'locatario'
  } else if (vinculoRaw === 'condomino' || vinculoRaw === 'condômino') {
    vinculoValido = 'condomino'
  } else {
    return e.json(400, {
      success: false,
      message: 'Escolha um vínculo válido: Condômino, Inquilino ou Proprietário.',
    })
  }

  // Validar contatos
  if (!email || !email.includes('@')) {
    return e.json(400, { success: false, message: 'E-mail obrigatório e deve ser válido.' })
  }
  if (!telefone || telefone.replace(/\D/g, '').length < 8) {
    return e.json(400, { success: false, message: 'Telefone de contato obrigatório.' })
  }

  // Verificar se já existe cadastro pendente ou aprovado com este CPF na mesma unidade
  // Segurança: tratamento neutro para não expor dados de terceiros
  try {
    const existentes = e.app.findRecordsByFilter(
      'cadastros_unidade',
      'unidade = {:u} && cpf = {:c}',
      '',
      1,
      0,
      {
        u: unidade.id,
        c: cpfLimpo,
      },
    )
    if (existentes && existentes.length > 0) {
      const ex = existentes[0]
      const statusAtual = ex.getString('status_aprovacao') || 'aprovado'
      if (statusAtual === 'pendente') {
        return e.json(200, {
          success: true,
          message:
            'Seu cadastro para esta unidade já foi enviado anteriormente e está aguardando homologação da mesa diretora.',
          status: 'pendente',
        })
      }
      if (statusAtual === 'aprovado') {
        return e.json(200, {
          success: true,
          message:
            'Os dados para esta unidade já se encontram registrados na plataforma. Em caso de dúvidas, contate a administração.',
          status: 'aprovado',
        })
      }
    }
  } catch (_) {}

  // Gravar novo cadastro pendente
  try {
    const cadCol = e.app.findCollectionByNameOrId('cadastros_unidade')
    const novoCad = new Record(cadCol)
    novoCad.set('unidade', unidade.id)
    novoCad.set('nome', nome)
    novoCad.set('cpf', cpfLimpo)
    novoCad.set('data_nascimento', dataNascimento + ' 00:00:00.000Z')
    novoCad.set('email', email)
    novoCad.set('telefone', telefone)
    novoCad.set('vinculo', vinculoValido)
    novoCad.set('status_aprovacao', 'pendente')
    novoCad.set('ativo', false) // Somente fica ativo após aprovação da mesa
    novoCad.set('origem', 'link_publico')
    novoCad.set('observacoes', 'Cadastro enviado pelo morador via link público da unidade.')
    e.app.save(novoCad)

    // Notificar mesa por e-mail sobre novo cadastro pendente
    try {
      const identU = unidade.getString('identificador')
      const blocoU = unidade.getString('bloco')
      const unidRotulo = blocoU ? `${identU} (${blocoU})` : `${identU} (Torre única)`
      const notifCol = e.app.findCollectionByNameOrId('notificacoes')

      const mesaUsers = e.app.findRecordsByFilter(
        'users',
        "role = 'mesa' || role = 'admin' || email = 'alexandre@a3one.com.br'",
        '',
        10,
        0,
      )
      const enviados = new Set()
      for (let mu of mesaUsers) {
        const dest = mu.getString('email')
        if (dest && !enviados.has(dest)) {
          enviados.add(dest)
          const notif = new Record(notifCol)
          notif.set('destinatario', dest)
          notif.set('canal', 'email')
          notif.set('tipo', 'credenciamento_pendente_mesa')
          notif.set('titulo', `Novo Cadastro Pendente de Aprovação: Unidade ${unidRotulo}`)
          notif.set(
            'corpo',
            `Um novo cadastro de morador/proprietário foi submetido pelo link público e aguarda aprovação da mesa diretora:\n\n` +
              `• Nome: ${nome}\n` +
              `• Unidade: ${unidRotulo}\n` +
              `• Vínculo solicitado: ${vinculoValido.toUpperCase()}\n` +
              `• E-mail: ${email}\n` +
              `• Telefone: ${telefone}\n\n` +
              `Acesse a área de Cadastros na Plataforma Virtual Koinon para revisar e homologar.`,
          )
          notif.set('status', 'pendente')
          e.app.save(notif)
        }
      }
    } catch (notifErr) {
      console.log('Aviso ao notificar mesa sobre cadastro público:', notifErr)
    }

    return e.json(200, {
      success: true,
      message:
        'Cadastro enviado com sucesso. Seu registro está pendente e será ativado após homologação da mesa diretora.',
      status: 'pendente',
    })
  } catch (err) {
    console.log('Erro ao gravar cadastro de morador público:', err)
    return e.json(500, {
      success: false,
      message: 'Não foi possível registrar o cadastro no momento. Tente novamente mais tarde.',
    })
  }
})

// 3. POST /backend/v1/admin/unidades/enviar-link-email
routerAdd('POST', '/backend/v1/admin/unidades/enviar-link-email', (e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(403, { success: false, message: 'Usuário não autenticado' })
  }

  const role = authRecord.getString('role')
  if (role !== 'admin' && role !== 'mesa') {
    return e.json(403, {
      success: false,
      message: 'Acesso restrito à Mesa Diretora e Administradores.',
    })
  }

  const body = e.requestInfo().body || {}
  const unidadeId = body.unidadeId
  const emailDestinatario = (body.email || '').trim().toLowerCase()
  const linkCadastro = (body.link || '').trim()

  if (!unidadeId) {
    return e.json(400, { success: false, message: 'unidadeId é obrigatório' })
  }
  if (!emailDestinatario || !emailDestinatario.includes('@')) {
    return e.json(400, { success: false, message: 'E-mail do destinatário inválido.' })
  }

  let unidade
  try {
    unidade = e.app.findRecordById('unidades', unidadeId)
  } catch (_) {
    return e.json(404, { success: false, message: 'Unidade não encontrada' })
  }

  let nomeCondo = 'Condomínio Residencial Lago Azul'
  try {
    const configs = e.app.findRecordsByFilter('configuracoes', '', '-created', 1, 0)
    if (configs && configs.length > 0) {
      nomeCondo = configs[0].getString('nome_condominio') || nomeCondo
    }
  } catch (_) {}

  const identU = unidade.getString('identificador')
  const blocoU = (unidade.getString('bloco') || '').trim()
  const unidTexto = blocoU ? `Unidade ${identU} (${blocoU})` : `Unidade ${identU} (Torre única)`

  const titulo = `Link de Cadastro de Moradores — ${unidTexto}`
  const corpo =
    `Prezado(a) Morador(a) ou Proprietário(a),\n\n` +
    `Você recebeu o link oficial para realizar o cadastro de moradores da ${unidTexto} do ${nomeCondo} na Plataforma Virtual Koinon.\n\n` +
    `Acesse o endereço abaixo para preencher os dados cadastrais (nome completo, CPF, data de nascimento e contatos):\n` +
    `${linkCadastro}\n\n` +
    `Após o envio, seus dados serão conferidos e homologados pela mesa diretora da assembleia condominial.\n\n` +
    `Atenciosamente,\n` +
    `Administração — ${nomeCondo}`

  try {
    const notifCol = e.app.findCollectionByNameOrId('notificacoes')
    const notif = new Record(notifCol)
    notif.set('destinatario', emailDestinatario)
    notif.set('canal', 'email')
    notif.set('tipo', 'convite_assembleia')
    notif.set('titulo', titulo)
    notif.set('corpo', corpo)
    notif.set('status', 'pendente')
    e.app.save(notif)

    return e.json(200, {
      success: true,
      message: `E-mail institucional com o link de cadastro da unidade enfileirado para envio a ${emailDestinatario}.`,
    })
  } catch (err) {
    console.log('Erro ao enfileirar email de link de cadastro:', err)
    return e.json(500, {
      success: false,
      message: 'Falha ao registrar notificação de e-mail.',
    })
  }
})

// 4. POST /backend/v1/admin/cadastros/aprovar
routerAdd('POST', '/backend/v1/admin/cadastros/aprovar', (e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(403, { success: false, message: 'Usuário não autenticado' })
  }

  const role = authRecord.getString('role')
  if (role !== 'admin' && role !== 'mesa') {
    return e.json(403, {
      success: false,
      message: 'Apenas a Mesa Diretora ou Administradores podem homologar cadastros.',
    })
  }

  const body = e.requestInfo().body || {}
  const cadastroId = body.cadastroId
  if (!cadastroId) {
    return e.json(400, { success: false, message: 'cadastroId é obrigatório' })
  }

  let cad
  try {
    cad = e.app.findRecordById('cadastros_unidade', cadastroId)
  } catch (_) {
    return e.json(404, { success: false, message: 'Cadastro não encontrado' })
  }

  const unidadeId = cad.getString('unidade')
  const vinculo = cad.getString('vinculo')

  // Regra de unidade: até 1 proprietário e 1 morador ATIVOS simultâneos
  try {
    const cadastrosAtivos = e.app.findRecordsByFilter(
      'cadastros_unidade',
      'unidade = {:u} && ativo = true && id != {:id}',
      '',
      10,
      0,
      { u: unidadeId, id: cadastroId },
    )

    const eProprietario = vinculo === 'proprietario'
    const eMorador = vinculo === 'condomino' || vinculo === 'locatario'

    for (let c of cadastrosAtivos) {
      const v = c.getString('vinculo')
      if (eProprietario && v === 'proprietario') {
        return e.json(400, {
          success: false,
          message: `A unidade já possui o proprietário "${c.getString('nome')}" ativo. Desative-o antes de aprovar outro.`,
        })
      }
      if (eMorador && (v === 'condomino' || v === 'locatario')) {
        return e.json(400, {
          success: false,
          message: `A unidade já possui o morador (${v.toUpperCase()}) "${c.getString('nome')}" ativo. Desative-o antes de aprovar outro.`,
        })
      }
    }
  } catch (_) {}

  cad.set('status_aprovacao', 'aprovado')
  cad.set('ativo', true)
  e.app.save(cad)

  // Notificar morador sobre aprovação por e-mail se houver contato
  const emailMorador = (cad.getString('email') || '').trim()
  if (emailMorador && emailMorador.includes('@')) {
    try {
      let nomeCondo = 'Condomínio Residencial Lago Azul'
      const configs = e.app.findRecordsByFilter('configuracoes', '', '-created', 1, 0)
      if (configs && configs.length > 0) {
        nomeCondo = configs[0].getString('nome_condominio') || nomeCondo
      }

      let identU = ''
      try {
        const uRec = e.app.findRecordById('unidades', unidadeId)
        identU = uRec.getString('identificador')
      } catch (_) {}

      const notifCol = e.app.findCollectionByNameOrId('notificacoes')
      const notif = new Record(notifCol)
      notif.set('destinatario', emailMorador)
      notif.set('canal', 'email')
      notif.set('tipo', 'credenciamento_aprovado')
      notif.set('titulo', `Cadastro Aprovado — Unidade ${identU}`)
      notif.set(
        'corpo',
        `Prezado(a) ${cad.getString('nome')},\n\n` +
          `Seu cadastro para a Unidade ${identU} no ${nomeCondo} foi HOMOLOGADO pela mesa diretora da assembleia condominial.\n\n` +
          `Vínculo registrado: ${vinculo.toUpperCase()}\n\n` +
          `Você receberá as comunicações oficiais da assembleia neste e-mail.\n` +
          `Agradecemos pela colaboração na atualização cadastral.`,
      )
      notif.set('status', 'pendente')
      e.app.save(notif)
    } catch (_) {}
  }

  return e.json(200, {
    success: true,
    message: `Cadastro de "${cad.getString('nome')}" aprovado e ativado com sucesso.`,
  })
})

// 5. POST /backend/v1/admin/cadastros/rejeitar
routerAdd('POST', '/backend/v1/admin/cadastros/rejeitar', (e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(403, { success: false, message: 'Usuário não autenticado' })
  }

  const role = authRecord.getString('role')
  if (role !== 'admin' && role !== 'mesa') {
    return e.json(403, {
      success: false,
      message: 'Apenas a Mesa Diretora ou Administradores podem rejeitar cadastros.',
    })
  }

  const body = e.requestInfo().body || {}
  const cadastroId = body.cadastroId
  const motivo = (body.motivo || 'Documentação ou dados não conferem com a unidade').trim()

  if (!cadastroId) {
    return e.json(400, { success: false, message: 'cadastroId é obrigatório' })
  }

  let cad
  try {
    cad = e.app.findRecordById('cadastros_unidade', cadastroId)
  } catch (_) {
    return e.json(404, { success: false, message: 'Cadastro não encontrado' })
  }

  cad.set('status_aprovacao', 'rejeitado')
  cad.set('ativo', false)
  if (motivo) {
    const obsAtual = cad.getString('observacoes') || ''
    cad.set('observacoes', `${obsAtual ? obsAtual + ' | ' : ''}Rejeição: ${motivo}`)
  }
  e.app.save(cad)

  return e.json(200, {
    success: true,
    message: `Cadastro de "${cad.getString('nome')}" rejeitado.`,
  })
})

// 6. POST /backend/v1/admin/unidades/garantir-token
routerAdd('POST', '/backend/v1/admin/unidades/garantir-token', (e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(403, { success: false, message: 'Usuário não autenticado' })
  }

  const body = e.requestInfo().body || {}
  const unidadeId = body.unidadeId

  if (!unidadeId) {
    return e.json(400, { success: false, message: 'unidadeId é obrigatório' })
  }

  let unidade
  try {
    unidade = e.app.findRecordById('unidades', unidadeId)
  } catch (_) {
    return e.json(404, { success: false, message: 'Unidade não encontrada' })
  }

  let token = unidade.getString('token_cadastro')
  if (!token) {
    token = $security.randomString(32)
    unidade.set('token_cadastro', token)
    e.app.save(unidade)
  }

  return e.json(200, {
    success: true,
    token: token,
    unidadeId: unidade.id,
    identificador: unidade.getString('identificador'),
    bloco: unidade.getString('bloco'),
  })
})
