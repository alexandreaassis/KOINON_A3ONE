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
  let bloco = (unidade.getString('bloco') || '').trim()
  const tipoUnidade = unidade.getString('tipo_unidade') || rotuloPadrao

  // Normalizar bloco para evitar redundância com o tipo da unidade (ex: bloco "Apto") ou torre única
  if (
    bloco === '—' ||
    bloco === '-' ||
    bloco.toLowerCase() === 'torre única' ||
    bloco.toLowerCase() === 'torre unica' ||
    bloco.toLowerCase() === 'lago azul' ||
    bloco.toLowerCase() === tipoUnidade.toLowerCase() ||
    bloco.toLowerCase() === 'apto' ||
    bloco.toLowerCase() === 'apartamento'
  ) {
    bloco = ''
  }

  // Avaliar estado dos cadastros ativos ou pendentes da unidade segundo a MATRIZ DE BLOQUEIO:
  // - cadastros 'rejeitado' NÃO contam (liberam a vaga imediatamente)
  // - cadastros 'aprovado' ou 'pendente' contam
  let temCondomino = false // condomino residente (aprovado ou pendente)
  let temInquilino = false // locatario (aprovado ou pendente)
  let temProprietario = false // proprietario nao morador (aprovado ou pendente)
  let temCondominoAprovado = false
  let temInquilinoAprovado = false
  let temProprietarioAprovado = false

  try {
    const cads = e.app.findRecordsByFilter(
      'cadastros_unidade',
      'unidade = {:u}',
      '-created',
      50,
      0,
      { u: unidade.id },
    )
    for (let c of cads) {
      const st = c.getString('status_aprovacao') || 'aprovado'
      if (st === 'rejeitado') continue // Rejeitado libera a vaga

      const v = c.getString('vinculo')
      if (v === 'condomino') {
        temCondomino = true
        if (st === 'aprovado') temCondominoAprovado = true
      } else if (v === 'locatario') {
        temInquilino = true
        if (st === 'aprovado') temInquilinoAprovado = true
      } else if (v === 'proprietario') {
        temProprietario = true
        if (st === 'aprovado') temProprietarioAprovado = true
      }
    }
  } catch (_) {}

  // Determinar bloqueios por vínculo e mensagem explicativa
  let unidadeBloqueadaTotal = false
  let mensagemBloqueioGeral = ''
  const vinculosPermitidos = []
  const vinculosBloqueados = {}

  if (temCondomino) {
    // Condômino residente aprovado ou pendente bloqueia qualquer novo envio
    unidadeBloqueadaTotal = true
    mensagemBloqueioGeral =
      'Esta unidade já possui condômino residente cadastrado; cadastro único é suficiente.'
    vinculosBloqueados['condomino'] = mensagemBloqueioGeral
    vinculosBloqueados['locatario'] = mensagemBloqueioGeral
    vinculosBloqueados['proprietario'] = mensagemBloqueioGeral
  } else if (temInquilino && temProprietario) {
    // Inquilino + Proprietário (unidade completa) bloqueia qualquer novo envio
    unidadeBloqueadaTotal = true
    mensagemBloqueioGeral = 'Esta unidade já possui 2 pessoas cadastradas (morador e proprietário).'
    vinculosBloqueados['condomino'] = mensagemBloqueioGeral
    vinculosBloqueados['locatario'] = mensagemBloqueioGeral
    vinculosBloqueados['proprietario'] = mensagemBloqueioGeral
  } else if (temInquilino && !temProprietario) {
    // Inquilino cadastrado: aceita apenas Proprietário (não morador)
    vinculosPermitidos.push('proprietario')
    vinculosBloqueados['condomino'] =
      'Esta unidade já possui inquilino cadastrado. O vínculo permitido para esta unidade é Proprietário (não morador).'
    vinculosBloqueados['locatario'] = 'Esta unidade já possui inquilino cadastrado.'
  } else if (temProprietario && !temInquilino) {
    // Proprietário cadastrado: aceita apenas Inquilino
    vinculosPermitidos.push('locatario')
    vinculosBloqueados['proprietario'] =
      'Esta unidade já possui proprietário cadastrado (não morador).'
    vinculosBloqueados['condomino'] =
      'Esta unidade já possui proprietário cadastrado (não morador). Se você é o proprietário e passou a morar na unidade, procure a mesa.'
  } else {
    // Sem cadastros: aceita qualquer vínculo
    vinculosPermitidos.push('condomino', 'locatario', 'proprietario')
  }

  return e.json(200, {
    success: true,
    unidade: {
      identificador: identificador,
      bloco: bloco, // pode ser vazio se torre única
      tipo_unidade: tipoUnidade,
      tem_bloco: !!bloco,
      // Estado detalhado conforme a matriz de bloqueio
      tem_condomino: temCondomino,
      tem_inquilino: temInquilino,
      tem_proprietario: temProprietario,
      tem_condomino_aprovado: temCondominoAprovado,
      tem_inquilino_aprovado: temInquilinoAprovado,
      tem_proprietario_aprovado: temProprietarioAprovado,
      unidade_bloqueada_total: unidadeBloqueadaTotal,
      mensagem_bloqueio_geral: mensagemBloqueioGeral,
      vinculos_permitidos: vinculosPermitidos,
      vinculos_bloqueados: vinculosBloqueados,
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

  const reqInfo = e.requestInfo()
  const body = reqInfo.body || {}
  const token = (body.token || '').trim()
  const nome = (body.nome || '').trim()
  const cpfRaw = (body.cpf || '').trim()
  const dataNascimento = (body.data_nascimento || '').trim()
  const email = (body.email || '').trim().toLowerCase()
  const telefone = (body.telefone || '').trim()
  const vinculoRaw = (body.vinculo || '').trim().toLowerCase()

  // Campos adicionais: Declaração / Assinatura Eletrônica e Indicação da outra parte
  const declaracaoVinculo = (body.declaracao_vinculo || '').trim()
  const declaracaoAssinatura = (body.declaracao_assinatura || '').trim()
  const declaracaoData = (body.declaracao_data || '').trim()
  const indicacaoNome = (body.indicacao_nome || '').trim()
  const indicacaoTelefone = (body.indicacao_telefone || '').trim()

  // Capturar IP de origem
  let declaracaoIp = (body.declaracao_ip || '').trim()
  if (!declaracaoIp && reqInfo.headers) {
    const xf =
      reqInfo.headers['x-forwarded-for'] ||
      reqInfo.headers['x-real-ip'] ||
      reqInfo.headers['cf-connecting-ip'] ||
      ''
    declaracaoIp = typeof xf === 'string' ? xf.split(',')[0].trim() : ''
  }

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

  // AVALIAÇÃO DA MATRIZ DE BLOQUEIO POR UNIDADE
  // Consulta cadastros APROVADOS e PENDENTES da unidade (pendente também bloqueia; cadastros rejeitados liberam a vaga).
  try {
    const cadastrosUnidade = e.app.findRecordsByFilter(
      'cadastros_unidade',
      'unidade = {:u}',
      '-created',
      50,
      0,
      { u: unidade.id },
    )

    // 1. Verificar se o mesmo CPF já está cadastrado nesta unidade (aprovado ou pendente)
    for (let cad of cadastrosUnidade) {
      const st = cad.getString('status_aprovacao') || 'aprovado'
      if (st === 'rejeitado') continue // Rejeitado libera a vaga
      const cpfCad = (cad.getString('cpf') || '').replace(/\D/g, '')
      if (cpfCad === cpfLimpo) {
        return e.json(400, {
          success: false,
          blocked: true,
          message: 'Este CPF já possui cadastro nesta unidade.',
        })
      }
    }

    // 2. Mapear ocupação atual (cadastros aprovados ou pendentes)
    let temCondomino = false
    let temInquilino = false
    let temProprietario = false

    for (let cad of cadastrosUnidade) {
      const st = cad.getString('status_aprovacao') || 'aprovado'
      if (st === 'rejeitado') continue

      const v = cad.getString('vinculo')
      if (v === 'condomino') temCondomino = true
      else if (v === 'locatario') temInquilino = true
      else if (v === 'proprietario') temProprietario = true
    }

    // 3. Aplicar regras da MATRIZ DE BLOQUEIO
    // Regra: Condômino residente aprovado ou pendente -> Bloqueia qualquer novo envio
    if (temCondomino) {
      return e.json(400, {
        success: false,
        blocked: true,
        message:
          'Esta unidade já possui condômino residente cadastrado; cadastro único é suficiente.',
      })
    }

    // Regra: Inquilino + Proprietário (unidade completa) -> Bloqueia qualquer novo envio
    if (temInquilino && temProprietario) {
      return e.json(400, {
        success: false,
        blocked: true,
        message: 'Esta unidade já possui 2 pessoas cadastradas (morador e proprietário).',
      })
    }

    // Regra: Unidade tem Inquilino cadastrado
    if (temInquilino && !temProprietario) {
      if (vinculoValido === 'locatario') {
        return e.json(400, {
          success: false,
          blocked: true,
          message: 'Esta unidade já possui inquilino cadastrado.',
        })
      }
      if (vinculoValido === 'condomino') {
        return e.json(400, {
          success: false,
          blocked: true,
          message:
            'Esta unidade já possui inquilino cadastrado. O vínculo permitido para esta unidade é Proprietário (não morador).',
        })
      }
      // Se for 'proprietario', aceita!
    }

    // Regra: Unidade tem Proprietário cadastrado
    if (temProprietario && !temInquilino) {
      if (vinculoValido === 'condomino') {
        return e.json(400, {
          success: false,
          blocked: true,
          message:
            'Esta unidade já possui proprietário cadastrado (não morador). Se você é o proprietário e passou a morar na unidade, procure a mesa.',
        })
      }
      if (vinculoValido === 'proprietario') {
        return e.json(400, {
          success: false,
          blocked: true,
          message: 'Esta unidade já possui proprietário cadastrado (não morador).',
        })
      }
      // Se for 'locatario', aceita!
    }
  } catch (errBloqueio) {
    console.log('Erro ao checar matriz de bloqueio de cadastro:', errBloqueio)
  }

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

    // Gravar declaração / assinatura eletrônica se fornecidos
    if (declaracaoVinculo) {
      novoCad.set('declaracao_vinculo', declaracaoVinculo)
    }
    if (declaracaoAssinatura) {
      novoCad.set('declaracao_assinatura', declaracaoAssinatura)
    }
    if (declaracaoData) {
      novoCad.set('declaracao_data', declaracaoData)
    } else if (declaracaoAssinatura) {
      novoCad.set('declaracao_data', new Date().toISOString())
    }
    if (declaracaoIp) {
      novoCad.set('declaracao_ip', declaracaoIp)
    }

    // Gravar indicação de morador/proprietário de fato se preenchida
    if (indicacaoNome) {
      novoCad.set('indicacao_nome', indicacaoNome)
    }
    if (indicacaoTelefone) {
      novoCad.set('indicacao_telefone', indicacaoTelefone)
    }

    e.app.save(novoCad)

    // Notificar mesa por e-mail sobre novo cadastro pendente
    try {
      const identU = unidade.getString('identificador')
      const tipoU = unidade.getString('tipo_unidade') || 'Apto'
      let blocoU = (unidade.getString('bloco') || '').trim()
      if (
        blocoU === '—' ||
        blocoU === '-' ||
        blocoU.toLowerCase() === 'torre única' ||
        blocoU.toLowerCase() === 'torre unica' ||
        blocoU.toLowerCase() === 'lago azul' ||
        blocoU.toLowerCase() === tipoU.toLowerCase() ||
        blocoU.toLowerCase() === 'apto'
      ) {
        blocoU = ''
      }
      const rotuloPrefixo = identU.toLowerCase().startsWith(tipoU.toLowerCase())
        ? identU
        : `${tipoU} ${identU}`
      const unidRotulo = blocoU ? `${rotuloPrefixo} (${blocoU})` : `${rotuloPrefixo} (Torre única)`
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
      vinculo_enviado: vinculoValido,
      permite_segundo_cadastro: vinculoValido === 'locatario', // inquilino cadastrado abre oportunidade imediata para proprietário
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

  // Regra de unidade: aplicação rigorosa da matriz de limites da unidade entre os APROVADOS e ATIVOS
  try {
    const outrosCadastrosAtivos = e.app.findRecordsByFilter(
      'cadastros_unidade',
      'unidade = {:u} && ativo = true && status_aprovacao = "aprovado" && id != {:id}',
      '',
      20,
      0,
      { u: unidadeId, id: cadastroId },
    )

    let outroCondomino = null
    let outroInquilino = null
    let outroProprietario = null

    for (let c of outrosCadastrosAtivos) {
      const v = c.getString('vinculo')
      if (v === 'condomino') outroCondomino = c
      else if (v === 'locatario') outroInquilino = c
      else if (v === 'proprietario') outroProprietario = c
    }

    if (outroCondomino) {
      return e.json(400, {
        success: false,
        message: `Esta unidade já possui o condômino residente "${outroCondomino.getString('nome')}" ativo. Cadastro único é suficiente.`,
      })
    }

    if (vinculo === 'condomino' && (outroInquilino || outroProprietario)) {
      return e.json(400, {
        success: false,
        message: `Não é possível aprovar condômino residente pois a unidade já possui outro morador ou proprietário ativo.`,
      })
    }

    if (vinculo === 'locatario' && outroInquilino) {
      return e.json(400, {
        success: false,
        message: `A unidade já possui o inquilino "${outroInquilino.getString('nome')}" ativo. Rejeite ou desative o anterior antes de aprovar outro.`,
      })
    }

    if (vinculo === 'proprietario' && outroProprietario) {
      return e.json(400, {
        success: false,
        message: `A unidade já possui o proprietário "${outroProprietario.getString('nome')}" ativo. Rejeite ou desative o anterior antes de aprovar outro.`,
      })
    }

    if (outroInquilino && outroProprietario) {
      return e.json(400, {
        success: false,
        message: `Esta unidade já possui 2 pessoas cadastradas e ativas (morador e proprietário).`,
      })
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

// 6. POST /backend/v1/admin/cadastros/excluir
// Exclusão de cadastro por unidade com reautenticação e registro explícito no Histórico de Alterações
routerAdd('POST', '/backend/v1/admin/cadastros/excluir', (e) => {
  const reqInfo = e.requestInfo()
  const body = reqInfo.body || {}
  const cadastroId = (body.cadastroId || '').trim()
  const email = (body.email || '').trim().toLowerCase()
  const senha = (body.password || body.senha || '').trim()

  if (!cadastroId) {
    return e.json(400, { success: false, message: 'ID do cadastro não informado.' })
  }
  if (!email || !senha) {
    return e.json(400, {
      success: false,
      message: 'Informe seu e-mail e senha de administrador para confirmar a exclusão.',
    })
  }

  // 1. Reautenticação do solicitante contra o banco
  let solicitanteRecord = null
  try {
    solicitanteRecord = e.app.findAuthRecordByEmail('_pb_users_auth_', email)
  } catch (_) {
    return e.json(401, {
      success: false,
      message: 'Credenciais inválidas: e-mail ou senha incorretos.',
    })
  }

  if (!solicitanteRecord) {
    return e.json(401, {
      success: false,
      message: 'Credenciais inválidas: e-mail ou senha incorretos.',
    })
  }

  // Validar senha
  let senhaValida = false
  try {
    if (typeof solicitanteRecord.validatePassword === 'function') {
      senhaValida = solicitanteRecord.validatePassword(senha)
    }
  } catch (_) {
    senhaValida = false
  }

  if (!senhaValida) {
    return e.json(401, {
      success: false,
      message: 'Senha incorreta. A exclusão não foi realizada.',
    })
  }

  // Verificar se o usuário está ativo
  if (solicitanteRecord.getBool('ativo') === false) {
    return e.json(403, {
      success: false,
      message: 'Conta inativa. Ação não permitida.',
    })
  }

  // 2. Verificar perfil administrativo (mesa ou admin)
  const role = solicitanteRecord.getString('role')
  if (role !== 'admin' && role !== 'mesa') {
    return e.json(403, {
      success: false,
      message:
        'Acesso negado: apenas administradores ou membros da mesa diretora podem excluir cadastros.',
    })
  }

  // 3. Localizar o cadastro da unidade
  let cad = null
  try {
    cad = e.app.findRecordById('cadastros_unidade', cadastroId)
  } catch (_) {
    return e.json(404, {
      success: false,
      message: 'Cadastro não localizado ou já excluído.',
    })
  }

  // 4. Capturar metadados e snapshot dos dados da pessoa para auditoria
  const nomePessoa = cad.getString('nome') || ''
  const cpfPessoa = cad.getString('cpf') || ''
  const vinculoPessoa = cad.getString('vinculo') || ''
  const unidadeId = cad.getString('unidade') || ''

  let rotuloUnidade = unidadeId
  try {
    const uRec = e.app.findRecordById('unidades', unidadeId)
    const iden = uRec.getString('identificador') || ''
    const bloco = (uRec.getString('bloco') || '').trim()
    const tipo = uRec.getString('tipo_unidade') || 'Unidade'
    rotuloUnidade = bloco ? `${tipo} ${iden} (${bloco})` : `${tipo} ${iden}`
  } catch (_) {}

  // Rótulo amigável com vínculo e unidade
  const rotuloHistorico = `${nomePessoa} (${vinculoPessoa}) — ${rotuloUnidade}`

  // Capturar IP e User-Agent do solicitante
  let ip = ''
  let userAgent = ''
  try {
    if (reqInfo && reqInfo.headers) {
      const xf = reqInfo.headers['x-forwarded-for'] || reqInfo.headers['x-real-ip'] || ''
      ip = typeof xf === 'string' ? xf.split(',')[0].trim() : ''
      userAgent = reqInfo.headers['user-agent'] || ''
    }
  } catch (_) {}

  // Snapshot sanitizado de todos os campos do cadastro excluído
  const snapshotCampos = []
  try {
    const schemaFields = cad.collection().fields || []
    for (let i = 0; i < schemaFields.length; i++) {
      const f = schemaFields[i]
      const fName = f.name
      if (!fName || fName === 'created' || fName === 'updated' || fName === 'id') continue
      if (fName === 'tokenKey' || fName === 'passwordHash') continue

      let val = null
      try {
        val = cad.get(fName)
      } catch (_) {}

      if (val !== undefined && val !== null && val !== '') {
        let valLimpo = val
        if (typeof val === 'object') {
          try {
            valLimpo = JSON.stringify(val)
          } catch (_) {
            valLimpo = String(val)
          }
        }
        snapshotCampos.push({
          campo: fName,
          anterior: valLimpo,
          novo: null,
        })
      }
    }
  } catch (_) {}

  // 5. Excluir o registro do banco
  try {
    e.app.delete(cad)
  } catch (errDelete) {
    console.log('Erro ao excluir cadastro_unidade:', errDelete)
    return e.json(500, {
      success: false,
      message: 'Falha interna ao excluir cadastro de morador.',
    })
  }

  // 6. Gravar log da exclusão no Histórico de Alterações com dados preservados
  try {
    const histCol = e.app.findCollectionByNameOrId('historico_alteracoes')
    const histRec = new Record(histCol)
    histRec.set('user', solicitanteRecord.id)
    histRec.set(
      'user_nome',
      solicitanteRecord.getString('name') || solicitanteRecord.getString('email'),
    )
    histRec.set('user_email', solicitanteRecord.getString('email') || '')
    histRec.set('user_role', role)
    histRec.set('acao', 'exclusao')
    histRec.set('entidade', 'cadastros_unidade')
    histRec.set('registro_id', cadastroId)
    histRec.set('registro_rotulo', rotuloHistorico)
    histRec.set('campos_alterados', snapshotCampos)
    histRec.set('ip', ip)
    histRec.set('user_agent', userAgent)
    histRec.set('data_hora', new Date().toISOString().replace('T', ' ').substring(0, 19))
    e.app.save(histRec)
  } catch (histErr) {
    console.log('Aviso ao registrar log de exclusao em historico_alteracoes:', histErr)
  }

  return e.json(200, {
    success: true,
    message: `Cadastro de "${nomePessoa}" da ${rotuloUnidade} foi excluído com sucesso e registrado na auditoria.`,
    dadosExcluidos: {
      id: cadastroId,
      nome: nomePessoa,
      cpf: cpfPessoa,
      vinculo: vinculoPessoa,
      unidade: rotuloUnidade,
    },
  })
})

// 7. POST /backend/v1/admin/unidades/garantir-token
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
