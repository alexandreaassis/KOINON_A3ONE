/**
 * Hooks de backend para o ciclo de vida da Ata de Assembleia:
 * 1. POST /backend/v1/atas/gerar-ia: invoca o agente nativo do Skip Cloud "redator-ata-assembleia"
 * 2. POST /backend/v1/atas/publicar: publica a ata para os condôminos, grava na auditoria encadeada e opcionalmente notifica por e-mail
 */

routerAdd('POST', '/backend/v1/atas/gerar-ia', (e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(403, { success: false, message: 'Usuário não autenticado' })
  }

  const role = authRecord.getString('role')
  if (role !== 'mesa' && role !== 'admin') {
    return e.json(403, {
      success: false,
      message: 'Apenas membros da Mesa ou Administradores podem gerar a ata por IA.',
    })
  }

  const body = e.requestInfo().body || {}
  const deliberacaoId = (body.deliberacaoId || '').trim()
  const textoBruto = (body.textoBruto || '').trim()

  if (!deliberacaoId) {
    return e.json(400, { success: false, message: 'deliberacaoId é obrigatório' })
  }

  // 1. Carregar Deliberação
  let delib
  try {
    delib = e.app.findRecordById('deliberacoes', deliberacaoId)
  } catch (_) {
    return e.json(404, { success: false, message: 'Deliberação não encontrada' })
  }

  // 2. Carregar Configuração do Condomínio
  let nomeCondominio = 'Condomínio Residencial Lago Azul'
  try {
    const configs = e.app.findRecordsByFilter('configuracoes', '', '-created', 1, 0)
    if (configs && configs.length > 0) {
      nomeCondominio = configs[0].getString('nome_condominio') || nomeCondominio
    }
  } catch (_) {}

  // 3. Carregar Edital Convocado (se houver)
  let editalInfo = ''
  try {
    const editais = e.app.findRecordsByFilter(
      'editais_deliberacao',
      'deliberacao = {:delib}',
      '-created',
      1,
      0,
      { delib: deliberacaoId },
    )
    if (editais && editais.length > 0) {
      const ed = editais[0]
      editalInfo =
        `Data da Assembleia indicada no Edital: ${ed.getString('data_assembleia') || 'Não especificada'}\n` +
        `Primeira Convocação: ${ed.getString('primeira_convocacao') || '19:00'}\n` +
        `Segunda Convocação: ${ed.getString('segunda_convocacao') || '19:30'}\n` +
        `Local indicado: ${ed.getString('local_texto') || 'Salão de Festas / Plataforma Votum'}\n` +
        `Convocante: ${ed.getString('sindico_nome') || 'Síndico(a)'} (CPF: ${ed.getString('sindico_cpf') || '—'})\n`
    }
  } catch (_) {}

  // 4. Carregar Mesa Diretora
  const presidenteNome = delib.getString('mesa_presidente_nome') || 'Não designado'
  const presidenteCpf = delib.getString('mesa_presidente_cpf') || 'Não informado'
  const secretarioNome = delib.getString('mesa_secretario_nome') || 'Não designado'
  const secretarioCpf = delib.getString('mesa_secretario_cpf') || 'Não informado'

  // 5. Carregar Quórum e Presenças
  let totalPresencial = 0
  let totalRemoto = 0
  let totalProcuracao = 0
  let totalPresencas = 0

  try {
    const presencas = e.app.findRecordsByFilter(
      'presencas',
      'deliberacao = {:delib}',
      '',
      1000,
      0,
      { delib: deliberacaoId },
    )
    for (let p of presencas) {
      const tipo = p.getString('tipo')
      if (tipo === 'presencial') totalPresencial++
      else totalRemoto++
    }
    totalPresencas = presencas.length
  } catch (_) {}

  try {
    const assinaturasPres = e.app.findRecordsByFilter(
      'presencas_assinatura',
      'deliberacao = {:delib}',
      '',
      1000,
      0,
      { delib: deliberacaoId },
    )
    for (let ap of assinaturasPres) {
      if (ap.getString('forma') === 'procuracao') totalProcuracao++
    }
  } catch (_) {}

  // 6. Carregar Itens da Pauta e Apuração dos Votos
  let itensPautaTexto = ''
  try {
    const itens = e.app.findRecordsByFilter(
      'itens_pauta',
      'deliberacao = {:delib}',
      'ordem',
      100,
      0,
      { delib: deliberacaoId },
    )

    for (let it of itens) {
      const itemId = it.id
      const ordem = it.getInt('ordem')
      const tituloItem = it.getString('titulo')
      const textoItem = it.getString('texto')
      const quorumItem =
        it.getString('quorum_aplicavel') || delib.getString('quorum_materia') || 'Maioria simples'

      // Contar cédulas para este item
      let fav = 0
      let cont = 0
      let abs = 0
      let nulo = 0
      let branco = 0

      try {
        const cedulas = e.app.findRecordsByFilter('cedulas', 'item = {:itId}', '', 1000, 0, {
          itId: itemId,
        })
        for (let c of cedulas) {
          const op = c.getString('opcao')
          if (op === 'favoravel') fav++
          else if (op === 'contrario') cont++
          else if (op === 'abstencao') abs++
          else if (op === 'nulo') nulo++
          else if (op === 'branco') branco++
        }
      } catch (_) {}

      const totalItemVotos = fav + cont + abs + nulo + branco
      const situacao = fav > cont ? 'APROVADO' : cont > fav ? 'REPROVADO' : 'EMPATE'

      itensPautaTexto +=
        `\n--- Item ${ordem}: "${tituloItem}" ---\n` +
        (textoItem ? `Descrição: ${textoItem}\n` : '') +
        `Quórum Exigido: ${quorumItem}\n` +
        `Resultado da Votação: ${situacao} (Favoráveis: ${fav}, Contrários: ${cont}, Abstenções: ${abs}, Nulos: ${nulo}, Brancos: ${branco} | Total de votos: ${totalItemVotos})\n`
    }
  } catch (_) {}

  const hashRaizUrna = delib.getString('hash_raiz') || 'Aguardando encerramento/apuração da urna'

  // 7. Montar o Prompt estruturado completo para o Agente Skip Cloud
  // Colocando as anotações brutas em destaque imediato como fonte primária
  const temNotasBrutas = Boolean(textoBruto && textoBruto.length > 0)
  const avisoNotasBrutas = temNotasBrutas
    ? `ATENÇÃO PRIORITÁRIA: O usuário forneceu anotações da mesa/transcrição contendo ${textoBruto.length} caracteres. Você DEVE usar essas anotações como FONTE PRIMÁRIA de fatos, debates, intervenções, perguntas e respostas, preservando nomes citados e ocorrências no corpo da ata.`
    : `Nota: Não foram fornecidas anotações brutas específicas da mesa. Redija os debates de forma sucinta e formal a partir da ordem do dia e das votações.`

  const promptMensagem =
    `Você é o redator oficial da ata da assembleia do ${nomeCondominio}.\n` +
    `REDIGIR A ATA COMPLETA EM CÓDIGO HTML DIRETO.\n\n` +
    `=== REGRA FUNDAMENTAL SOBRE AS ANOTAÇÕES DA MESA ===\n` +
    `${avisoNotasBrutas}\n\n` +
    `=== [FONTE PRIMÁRIA] ANOTAÇÕES BRUTAS DA MESA DIRETORA / TRANSCRIÇÃO DOS TRABALHOS ===\n` +
    (temNotasBrutas
      ? `Abaixo está a matéria bruta real digitada/anotada durante a assembleia:\n` +
        `"""\n${textoBruto}\n"""\n` +
        `INSTRUÇÃO OBRIGATÓRIA: Incorpore integralmente os pontos narrados acima, organizando-os sob os itens de pauta correspondentes ou em uma seção "Resumo dos Debates e Manifestações dos Condôminos". Nunca resuma a ata apenas com os números das votações se houver debates descritos acima.`
      : `(Nenhuma anotação adicional fornecida pela mesa. Utilize os dados estruturados abaixo.)`) +
    `\n\n` +
    `=== [DADOS ESTRUTURADOS COMPLEMENTARES] ===\n` +
    `• Título da Assembleia: ${delib.getString('titulo')}\n` +
    `• Descrição Geral: ${delib.getString('descricao') || 'Assembleia Geral do Condomínio'}\n` +
    `• Período de Realização: Início em ${delib.getString('data_inicio') || 'data da sessão'} até ${delib.getString('data_fim') || 'conclusão dos trabalhos'}\n` +
    `• Status da Deliberação: ${delib.getString('status')}\n` +
    `• Tipo de Cédula: ${delib.getString('tipo_cedula') === 'secreta' ? 'Secreta (Urna Criptografada SHA-256)' : 'Nominal / Aberta'}\n` +
    `• Quórum de Instalação: ${delib.getInt('quorum_instalacao') || 0} unidades ou presentes em segunda convocação com qualquer número\n\n` +
    `DADOS DO EDITAL:\n${editalInfo || 'Convocação realizada conforme Edital publicado e enviado a todos os condôminos.'}\n\n` +
    `MESA DIRETORA ELEITA/DESIGNADA:\n` +
    `• Presidente da Mesa: ${presidenteNome} (CPF: ${presidenteCpf})\n` +
    `• Secretário(a) da Mesa: ${secretarioNome} (CPF: ${secretarioCpf})\n\n` +
    `QUÓRUM E PRESENÇAS APURADAS:\n` +
    `• Total Geral de Unidades Presentes: ${totalPresencas}\n` +
    `• Presenças Físicas (Presencial no Salão): ${totalPresencial}\n` +
    `• Presenças Virtuais (Plataforma Remota Votum): ${totalRemoto}\n` +
    `• Representações por Procuração Cadastradas: ${totalProcuracao}\n\n` +
    `ITENS DA ORDEM DO DIA E APURAÇÃO DOS VOTOS:\n${itensPautaTexto || 'Nenhum item com votação registrada até o momento.'}\n\n` +
    `INTEGRIDADE CRIPTOGRÁFICA DA URNA ELETRÔNICA VOTUM:\n` +
    `• Hash Raiz Consolidado SHA-256: ${hashRaizUrna}\n\n` +
    `=== DIRETRIZES DE SAÍDA ===\n` +
    `1. Retorne EXCLUSIVAMENTE código HTML sem blocos de código (\`\`\`html ou \`\`\`).\n` +
    `2. Use tags semânticas: <h3> para seções principais, <h4> para subtítulos/itens, <p> para parágrafos, <ul> e <li> para listas, <strong> para destaques solenes.\n` +
    `3. A narrativa DEVE refletir as anotações brutas com fidelidade fática e solenidade jurídica.`

  try {
    console.log(
      `Invocando agente redator-ata-assembleia para deliberacao ${deliberacaoId}. Tamanho do texto bruto: ${textoBruto.length} caracteres.`,
    )
    const agente = $ai.agent('redator-ata-assembleia')
    const chatResult = agente.chat({
      user_id: authRecord.id,
      message: promptMensagem,
    })

    let conteudoGerado = (chatResult && chatResult.content) || ''

    // Limpar delimitadores de markdown caso o modelo tenha inserido
    conteudoGerado = conteudoGerado
      .replace(/^```html\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()

    // Registrar evento na auditoria
    try {
      const audCol = e.app.findCollectionByNameOrId('auditoria_events')
      let ultimoHash = '0000000000000000000000000000000000000000000000000000000000000000'
      let proximoSeq = 1
      const ultimos = e.app.findRecordsByFilter('auditoria_events', '', '-sequencial', 1, 0)
      if (ultimos && ultimos.length > 0) {
        ultimoHash = ultimos[0].getString('hash_evento') || ultimoHash
        proximoSeq = (ultimos[0].getInt('sequencial') || 0) + 1
      }

      const payloadAud = JSON.stringify({
        evento: 'ata_gerada_ia',
        data_hora: new Date().toISOString(),
        deliberacao: deliberacaoId,
        operador: authRecord.getString('name'),
        sequencial: proximoSeq,
        hash_anterior: ultimoHash,
      })

      const hashAud = $security.sha256(ultimoHash + ':' + payloadAud)
      const audRec = new Record(audCol)
      audRec.set('evento', 'ata_gerada_ia')
      audRec.set('data_hora', new Date().toISOString().replace('T', ' ').substring(0, 19))
      audRec.set('fator', `Mesa: ${authRecord.getString('name')} gerou minuta de ata via IA`)
      audRec.set('dispositivo', e.requestInfo().headers['user-agent'] || 'painel-mesa')
      audRec.set('sequencial', proximoSeq)
      audRec.set('hash_evento', hashAud)
      audRec.set('hash_anterior', ultimoHash)
      e.app.save(audRec)
    } catch (audErr) {
      console.log('Aviso ao registrar auditoria de ata_gerada_ia:', audErr)
    }

    return e.json(200, {
      success: true,
      conteudoHtml: conteudoGerado,
      hashRaizUrna: hashRaizUrna,
      conversationId: chatResult.conversation_id,
      message: 'Minuta da Ata gerada com sucesso pelo Agente IA.',
    })
  } catch (err) {
    console.log('Erro ao chamar agente Skip Cloud redator-ata-assembleia:', err)
    const status = (err && err.status) || 500
    const msg =
      err && err.message
        ? err.message
        : 'Falha temporária no serviço de IA da plataforma. O texto digitado foi preservado. Tente novamente.'
    return e.json(status >= 500 ? 500 : status, {
      success: false,
      message: msg,
    })
  }
})

routerAdd('POST', '/backend/v1/atas/publicar', (e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(403, { success: false, message: 'Usuário não autenticado' })
  }

  const role = authRecord.getString('role')
  if (role !== 'mesa' && role !== 'admin') {
    return e.json(403, {
      success: false,
      message: 'Apenas membros da Mesa ou Administradores podem publicar a ata.',
    })
  }

  const body = e.requestInfo().body || {}
  const ataId = (body.ataId || '').trim()
  const enviarEmail = !!body.enviarEmail

  if (!ataId) {
    return e.json(400, { success: false, message: 'ataId é obrigatório' })
  }

  let ataRec
  try {
    ataRec = e.app.findRecordById('atas_assembleia', ataId)
  } catch (_) {
    return e.json(404, { success: false, message: 'Ata não encontrada' })
  }

  const deliberacaoId = ataRec.getString('deliberacao')
  let delib
  try {
    delib = e.app.findRecordById('deliberacoes', deliberacaoId)
  } catch (_) {
    return e.json(404, { success: false, message: 'Deliberação vinculada não encontrada' })
  }

  // Atualizar status da ata para publicada
  const agoraIso = new Date().toISOString().replace('T', ' ').substring(0, 19)
  ataRec.set('status', 'publicada')
  ataRec.set('data_publicacao', agoraIso)
  e.app.save(ataRec)

  // Gravar evento de auditoria encadeada
  try {
    const audCol = e.app.findCollectionByNameOrId('auditoria_events')
    let ultimoHash = '0000000000000000000000000000000000000000000000000000000000000000'
    let proximoSeq = 1
    const ultimos = e.app.findRecordsByFilter('auditoria_events', '', '-sequencial', 1, 0)
    if (ultimos && ultimos.length > 0) {
      ultimoHash = ultimos[0].getString('hash_evento') || ultimoHash
      proximoSeq = (ultimos[0].getInt('sequencial') || 0) + 1
    }

    const payloadAud = JSON.stringify({
      evento: 'ata_publicada',
      data_hora: new Date().toISOString(),
      deliberacao: deliberacaoId,
      ata_id: ataId,
      hash_ata: ataRec.getString('hash_ata') || '',
      operador: authRecord.getString('name'),
      sequencial: proximoSeq,
      hash_anterior: ultimoHash,
    })

    const hashAud = $security.sha256(ultimoHash + ':' + payloadAud)
    const audRec = new Record(audCol)
    audRec.set('evento', 'ata_publicada')
    audRec.set('data_hora', agoraIso)
    audRec.set(
      'fator',
      `Mesa: ${authRecord.getString('name')} publicou oficialmente a Ata aos condôminos`,
    )
    audRec.set('dispositivo', e.requestInfo().headers['user-agent'] || 'painel-mesa')
    audRec.set('sequencial', proximoSeq)
    audRec.set('hash_evento', hashAud)
    audRec.set('hash_anterior', ultimoHash)
    e.app.save(audRec)
  } catch (audErr) {
    console.log('Aviso ao registrar auditoria de ata_publicada:', audErr)
  }

  // Se solicitado, disparar notificação por e-mail aos condôminos
  let totalNotificados = 0
  if (enviarEmail) {
    try {
      const notifCol = e.app.findCollectionByNameOrId('notificacoes')
      const emailsDest = new Set()

      // 1. Unidades ativas com e-mail cadastrado
      try {
        const unidades = e.app.findRecordsByFilter('unidades', 'ativo = true', '', 1000, 0)
        for (let u of unidades) {
          const email = (u.getString('contato_email') || '').trim()
          if (email && email.includes('@')) emailsDest.add(email)
        }
      } catch (_) {}

      // 2. Usuários moradores ativos
      try {
        const moradores = e.app.findRecordsByFilter('users', 'ativo = true', '', 1000, 0)
        for (let m of moradores) {
          const email = (m.getString('email') || '').trim()
          if (email && email.includes('@')) emailsDest.add(email)
        }
      } catch (_) {}

      const tituloNotif = `Ata Oficial Publicada: ${delib.getString('titulo')}`
      const corpoNotif =
        `Prezado(a) Condômino(a),\n\n` +
        `Informamos que a ATA OFICIAL da assembleia "${delib.getString('titulo')}" foi lavrada, assinada pela mesa diretora e PUBLICADA no sistema Votum.\n\n` +
        `Você já pode consultar o teor integral da ata, as deliberações e as assinaturas eletrônicas na área do morador.\n\n` +
        `Agradecemos a sua participação cívica na governança do condomínio.`

      for (let dest of emailsDest) {
        try {
          const notif = new Record(notifCol)
          notif.set('destinatario', dest)
          notif.set('canal', 'email')
          notif.set('tipo', 'ata_disponivel_assinatura')
          notif.set('titulo', tituloNotif)
          notif.set('corpo', corpoNotif)
          notif.set('deliberacao', deliberacaoId)
          notif.set('status', 'pendente')
          e.app.save(notif)
          totalNotificados++
        } catch (_) {}
      }
    } catch (notifErr) {
      console.log('Aviso ao gerar notificações de publicação da ata:', notifErr)
    }
  }

  return e.json(200, {
    success: true,
    totalNotificados: totalNotificados,
    message: `Ata publicada aos condôminos com sucesso!${enviarEmail ? ` ${totalNotificados} notificações enviadas para a fila.` : ''}`,
  })
})
