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

/**
 * POST /backend/v1/atas/transcrever-audio
 * Recebe multipart form-data:
 * - arquivo: arquivo de áudio (webm, ogg, wav, mp3, mp4, etc.)
 * - deliberacaoId: ID da assembleia
 * - duracaoSegundos: duração estimada em segundos (opcional)
 */
routerAdd('POST', '/backend/v1/atas/transcrever-audio', (e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(403, { success: false, message: 'Usuário não autenticado' })
  }

  const role = authRecord.getString('role')
  if (role !== 'mesa' && role !== 'admin') {
    return e.json(403, {
      success: false,
      message: 'Apenas membros da Mesa ou Administradores podem transcrever áudio para a ata.',
    })
  }

  const body = e.requestInfo().body || {}
  const deliberacaoId = (body.deliberacaoId || '').trim()
  const duracaoSegundos = parseInt(body.duracaoSegundos || '0', 10) || 0

  if (!deliberacaoId) {
    return e.json(400, { success: false, message: 'deliberacaoId é obrigatório' })
  }

  // Verificar existência da deliberação
  let delib
  try {
    delib = e.app.findRecordById('deliberacoes', deliberacaoId)
  } catch (_) {
    return e.json(404, { success: false, message: 'Deliberação não encontrada' })
  }

  // 1. Obter chave de API Groq: fallback em cascata (primeiro $os.getenv, depois configuracoes_backend)
  let groqApiKey = ($os.getenv('GROQ_API_KEY') || '').trim()
  if (!groqApiKey) {
    try {
      const configRec = e.app.findFirstRecordByData(
        'configuracoes_backend',
        'chave',
        'GROQ_API_KEY',
      )
      if (configRec) {
        groqApiKey = (configRec.getString('valor') || '').trim()
      }
    } catch (_) {}
  }

  if (!groqApiKey) {
    return e.json(503, {
      success: false,
      capabilityAvailable: false,
      message:
        'Transcrição não configurada — contate o administrador (chave Groq não encontrada nas variáveis do servidor).',
    })
  }

  let files = []
  try {
    files = e.findUploadedFiles('arquivo')
  } catch (filesErr) {
    // Caso a requisição não seja multipart/form-data
    return e.json(400, {
      success: false,
      message:
        'Nenhum arquivo de áudio foi enviado (requisição deve ser multipart/form-data com o campo "arquivo").',
    })
  }

  if (!files || files.length === 0) {
    return e.json(400, { success: false, message: 'Nenhum arquivo de áudio foi enviado.' })
  }

  const audioFile = files[0]
  const maxBytes = 15 * 1024 * 1024 // 15 MB
  if (audioFile.size > maxBytes) {
    return e.json(400, {
      success: false,
      message:
        'O arquivo de áudio ultrapassa o limite máximo de 15 MB. Envie uma gravação mais curta.',
    })
  }

  // Limite da API Groq de 25 MB (o frontend já limita em 10 MB e aqui checamos 25 MB preventivamente)
  const groqMaxBytes = 25 * 1024 * 1024
  if (audioFile.size > groqMaxBytes) {
    return e.json(413, {
      success: false,
      message:
        'O arquivo de áudio ultrapassa o limite de 25 MB do serviço de transcrição Groq. Grave a sessão em trechos menores para transcrever.',
    })
  }

  let transcricaoTexto = ''
  let metodoTranscricao = 'groq:whisper-large-v3'

  try {
    // Determinar nome do arquivo com extensão válida
    let nomeArquivo = audioFile.name || 'audio.webm'
    if (!nomeArquivo.includes('.')) {
      nomeArquivo = nomeArquivo + '.webm'
    }

    // Preparar instância de FormData compatível com PocketBase JSVM
    const formData = new FormData()
    formData.append('model', 'whisper-large-v3')
    formData.append('language', 'pt')
    formData.append('response_format', 'json')

    // No PocketBase JSVM, FormData aceita $filesystem.File (obtido via fileFromBytes ou diretamente do upload)
    let anexoInserido = false
    try {
      if (typeof audioFile.bytes === 'function') {
        const fileBytes = audioFile.bytes()
        if (typeof $filesystem !== 'undefined' && typeof $filesystem.fileFromBytes === 'function') {
          const fsFile = $filesystem.fileFromBytes(fileBytes, nomeArquivo)
          formData.append('file', fsFile)
          anexoInserido = true
        }
      }
    } catch (fsErr) {
      console.log('Aviso ao converter arquivo com $filesystem.fileFromBytes:', fsErr)
    }

    if (!anexoInserido) {
      // Fallback: tentar anexar audioFile diretamente
      formData.append('file', audioFile)
    }

    console.log(
      `Enviando áudio (${audioFile.size} bytes, nome: ${nomeArquivo}) para Groq Whisper API...`,
    )

    const respGroq = $http.send({
      url: 'https://api.groq.com/openai/v1/audio/transcriptions',
      method: 'POST',
      body: formData,
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
      },
      timeout: 120,
    })

    const statusCode = respGroq.statusCode || 0
    let corpoJson = respGroq.json
    if (!corpoJson && respGroq.body) {
      try {
        const rawStr = String.fromCharCode.apply(null, new Uint8Array(respGroq.body))
        corpoJson = JSON.parse(rawStr)
      } catch (_) {}
    }

    if (statusCode === 200 && corpoJson) {
      transcricaoTexto = (corpoJson.text || '').trim()
    } else {
      console.log('Resposta de erro do Groq Whisper:', statusCode, JSON.stringify(corpoJson || {}))

      const groqMsg =
        (corpoJson && corpoJson.error && corpoJson.error.message) ||
        (corpoJson && corpoJson.message) ||
        ''

      if (statusCode === 429) {
        return e.json(429, {
          success: false,
          message:
            'Limite de requisições excedido no serviço Groq (Rate Limit / 429). Aguarde alguns instantes e tente transcrever novamente.',
        })
      } else if (statusCode === 413) {
        return e.json(413, {
          success: false,
          message:
            'O áudio ultrapassa o limite de 25 MB do serviço de transcrição Groq. Grave a sessão em trechos menores.',
        })
      } else if (statusCode === 401 || statusCode === 403) {
        return e.json(502, {
          success: false,
          message:
            'Chave de acesso à API Groq recusada pelo provedor (401/403). Verifique a credencial configurada no ambiente.',
        })
      }

      return e.json(502, {
        success: false,
        message:
          groqMsg ||
          `Falha na transcrição pelo Groq (código HTTP ${statusCode}). Verifique a gravação e tente novamente.`,
      })
    }
  } catch (err) {
    console.log('Erro de conexão ou execução ao chamar Groq Whisper:', err)
    const errMsg = (err && err.message) || String(err)
    return e.json(500, {
      success: false,
      message:
        'Não foi possível conectar ao serviço de transcrição Groq (erro de rede ou timeout). Detalhe: ' +
        errMsg,
    })
  }

  transcricaoTexto = (transcricaoTexto || '').trim()
  if (!transcricaoTexto) {
    return e.json(200, {
      success: true,
      textoTranscrito: '',
      caracteres: 0,
      duracaoSegundos: duracaoSegundos,
      message:
        'Áudio processado, mas nenhum conteúdo verbal inteligível foi detectado na gravação.',
    })
  }

  // Registrar auditoria da transcrição
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
      evento: 'audio_transcricao',
      data_hora: new Date().toISOString(),
      deliberacao: deliberacaoId,
      operador: authRecord.getString('name'),
      duracao_segundos: duracaoSegundos,
      caracteres_gerados: transcricaoTexto.length,
      metodo: metodoTranscricao,
      sequencial: proximoSeq,
      hash_anterior: ultimoHash,
    })

    const hashAud = $security.sha256(ultimoHash + ':' + payloadAud)
    const audRec = new Record(audCol)
    audRec.set('evento', 'audio_transcricao')
    audRec.set('data_hora', new Date().toISOString().replace('T', ' ').substring(0, 19))
    audRec.set(
      'fator',
      `Mesa: ${authRecord.getString('name')} transcreveu áudio da assembleia (${duracaoSegundos}s, ${transcricaoTexto.length} caracteres gerados)`,
    )
    audRec.set('dispositivo', e.requestInfo().headers['user-agent'] || 'painel-mesa')
    audRec.set('sequencial', proximoSeq)
    audRec.set('hash_evento', hashAud)
    audRec.set('hash_anterior', ultimoHash)
    e.app.save(audRec)
  } catch (audErr) {
    console.log('Aviso ao registrar auditoria de audio_transcricao:', audErr)
  }

  return e.json(200, {
    success: true,
    textoTranscrito: transcricaoTexto,
    caracteres: transcricaoTexto.length,
    duracaoSegundos: duracaoSegundos,
    message: `Áudio transcrito com sucesso (${transcricaoTexto.length} caracteres).`,
  })
})

/**
 * POST /backend/v1/atas/extrair-documento
 * Recebe multipart form-data:
 * - arquivo: PDF, PNG, JPG, JPEG, TXT, MD
 * - deliberacaoId: ID da assembleia
 */
routerAdd('POST', '/backend/v1/atas/extrair-documento', (e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(403, { success: false, message: 'Usuário não autenticado' })
  }

  const role = authRecord.getString('role')
  if (role !== 'mesa' && role !== 'admin') {
    return e.json(403, {
      success: false,
      message: 'Apenas membros da Mesa ou Administradores podem extrair documentos para a ata.',
    })
  }

  const body = e.requestInfo().body || {}
  const deliberacaoId = (body.deliberacaoId || '').trim()

  if (!deliberacaoId) {
    return e.json(400, { success: false, message: 'deliberacaoId é obrigatório' })
  }

  // Verificar existência da deliberação
  let delib
  try {
    delib = e.app.findRecordById('deliberacoes', deliberacaoId)
  } catch (_) {
    return e.json(404, { success: false, message: 'Deliberação não encontrada' })
  }

  const files = e.findUploadedFiles('arquivo')
  if (!files || files.length === 0) {
    return e.json(400, { success: false, message: 'Nenhum arquivo de documento foi enviado.' })
  }

  const docFile = files[0]
  const maxBytes = 10 * 1024 * 1024 // 10 MB
  if (docFile.size > maxBytes) {
    return e.json(400, {
      success: false,
      message: 'O arquivo ultrapassa o limite de 10 MB. Envie um arquivo com tamanho menor.',
    })
  }

  const nomeArquivo = (docFile.name || '').toLowerCase()
  let textoExtraido = ''
  let tipoProcessamento = ''

  // 1. Arquivo de texto puro (.txt ou .md)
  if (nomeArquivo.endsWith('.txt') || nomeArquivo.endsWith('.md')) {
    try {
      const buffer = docFile.bytes()
      // Converter bytes para string UTF-8
      textoExtraido = String.fromCharCode.apply(null, new Uint8Array(buffer))
      // Decodificar UTF-8 corretamente caso contenha caracteres acentuados
      try {
        textoExtraido = decodeURIComponent(escape(textoExtraido))
      } catch (_) {}
      tipoProcessamento = 'texto_puro'
    } catch (err) {
      console.log('Erro ao ler arquivo de texto no backend:', err)
      return e.json(400, {
        success: false,
        message:
          'Não foi possível ler o arquivo de texto fornecido. Verifique a codificação UTF-8.',
      })
    }
  } else if (
    nomeArquivo.endsWith('.pdf') ||
    nomeArquivo.endsWith('.docx') ||
    nomeArquivo.endsWith('.xlsx')
  ) {
    // 2. Documentos com suporte a $documents.toMarkdown
    try {
      const { markdown, truncated } = $documents.toMarkdown({ file: docFile })
      textoExtraido = markdown || ''
      tipoProcessamento = 'document_converter'
      if (truncated) {
        textoExtraido +=
          '\n\n[Nota: O documento era muito extenso e teve parte de seu conteúdo final resumido pelo limite da plataforma.]'
      }
    } catch (docErr) {
      console.log('Erro em $documents.toMarkdown:', docErr)
      const errStatus = (docErr && docErr.status) || 0
      const errMsg = (docErr && docErr.message) || ''

      // Se for PDF escaneado (sem camada de texto), a documentação indica erro 422 ("OCR is required")
      if (errStatus === 422 || errMsg.toLowerCase().includes('ocr')) {
        return e.json(422, {
          success: false,
          capabilityAvailable: false,
          ocrRequired: true,
          message:
            'Este documento PDF é digitalizado/escaneado (imagem sem camada de texto selecionável). A plataforma Skip Cloud não possui serviço de OCR nativo integrado no momento. Por gentileza, utilize um PDF com camada de texto selecionável ou envie as anotações coladas no campo de texto.',
        })
      }
      return e.json(400, {
        success: false,
        message: errMsg || 'Falha ao processar o arquivo PDF/documento.',
      })
    }
  } else if (
    nomeArquivo.endsWith('.png') ||
    nomeArquivo.endsWith('.jpg') ||
    nomeArquivo.endsWith('.jpeg') ||
    nomeArquivo.endsWith('.webp')
  ) {
    // 3. Imagem digitalizada (PNG/JPG) — precisa de OCR ou visão multimodal
    // Como a plataforma Skip Cloud não possui endpoint de OCR direto e $documents não processa imagem isolada:
    return e.json(422, {
      success: false,
      capabilityAvailable: false,
      ocrRequired: true,
      message:
        'Extração de texto via OCR de imagens (PNG/JPG) não está disponível nativamente no backend da plataforma Skip Cloud. Para anexar matéria bruta, por favor utilize arquivo PDF com texto selecionável, arquivo de texto TXT/MD, ou copie e cole as notas digitadas.',
    })
  } else {
    return e.json(400, {
      success: false,
      message: 'Formato de arquivo não suportado. Envie arquivos PDF, TXT, MD, PNG ou JPG.',
    })
  }

  textoExtraido = (textoExtraido || '').trim()
  if (!textoExtraido) {
    return e.json(200, {
      success: true,
      textoExtraido: '',
      caracteres: 0,
      nomeArquivo: docFile.name,
      message: 'O documento foi processado, mas nenhum conteúdo textual foi encontrado.',
    })
  }

  // Registrar auditoria da extração de documento
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
      evento: 'documento_extracao',
      data_hora: new Date().toISOString(),
      deliberacao: deliberacaoId,
      operador: authRecord.getString('name'),
      arquivo_nome: docFile.name,
      arquivo_tamanho: docFile.size,
      caracteres_extraidos: textoExtraido.length,
      tipo_processamento: tipoProcessamento,
      sequencial: proximoSeq,
      hash_anterior: ultimoHash,
    })

    const hashAud = $security.sha256(ultimoHash + ':' + payloadAud)
    const audRec = new Record(audCol)
    audRec.set('evento', 'documento_extracao')
    audRec.set('data_hora', new Date().toISOString().replace('T', ' ').substring(0, 19))
    audRec.set(
      'fator',
      `Mesa: ${authRecord.getString('name')} extraiu texto do documento ${docFile.name} (${textoExtraido.length} caracteres)`,
    )
    audRec.set('dispositivo', e.requestInfo().headers['user-agent'] || 'painel-mesa')
    audRec.set('sequencial', proximoSeq)
    audRec.set('hash_evento', hashAud)
    audRec.set('hash_anterior', ultimoHash)
    e.app.save(audRec)
  } catch (audErr) {
    console.log('Aviso ao registrar auditoria de documento_extracao:', audErr)
  }

  return e.json(200, {
    success: true,
    textoExtraido: textoExtraido,
    caracteres: textoExtraido.length,
    nomeArquivo: docFile.name,
    message: `Texto do documento "${docFile.name}" extraído com sucesso (${textoExtraido.length} caracteres).`,
  })
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
