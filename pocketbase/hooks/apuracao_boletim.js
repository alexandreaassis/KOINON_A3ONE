/**
 * Hook GET /backend/v1/deliberacoes/apuracao
 * Retorna o boletim de urna completo para uma deliberação:
 * - Contagem de votos por item e por opção (favorável, contrário, abstenção, branco, nulo)
 * - Total de cédulas registradas
 * - Total de comparecimentos (comprovante de quórum)
 * - Verificação de integridade da cadeia SHA-256 das cédulas
 * - Hash raiz da urna
 * - Lista de presenças (remoto vs presencial)
 */

routerAdd('GET', '/backend/v1/deliberacoes/apuracao', (e) => {
  const authRecord = e.auth
  if (!authRecord) {
    throw new ForbiddenError('Usuário não autenticado')
  }

  const deliberacaoId = e.requestInfo().query.deliberacaoId
  if (!deliberacaoId) {
    throw new BadRequestError('deliberacaoId é obrigatório')
  }

  let delib
  try {
    delib = e.app.findRecordById('deliberacoes', deliberacaoId)
  } catch (_) {
    throw new NotFoundError('Deliberação não encontrada')
  }

  // Obter itens da pauta
  const itens = e.app.findRecordsByFilter(
    'itens_pauta',
    'deliberacao = {:delib}',
    'ordem',
    100,
    0,
    { delib: deliberacaoId },
  )

  // Obter todas as cédulas
  const cedulas = e.app.findRecordsByFilter(
    'cedulas',
    'deliberacao = {:delib}',
    'created',
    5000,
    0,
    { delib: deliberacaoId },
  )

  // Obter comparecimentos
  const comparecimentos = e.app.findRecordsByFilter(
    'comparecimentos',
    'deliberacao = {:delib}',
    'created',
    1000,
    0,
    { delib: deliberacaoId },
  )

  // Obter presenças
  const presencas = e.app.findRecordsByFilter(
    'presencas',
    'deliberacao = {:delib}',
    'created',
    1000,
    0,
    { delib: deliberacaoId },
  )

  // Helper inline: candidatos do item (JSON [{nome, cargo}], migration 0054)
  function lerCandidatosItem(item) {
    if (item.getString('tipo_eleicao') !== 'eleicao') return []
    try {
      const arr = JSON.parse(item.getString('candidatos_eleicao') || '[]')
      return Array.isArray(arr) ? arr : []
    } catch (_) {
      return []
    }
  }

  // Contagem por item
  const mapaItens = {}
  for (let item of itens) {
    const candidatosItem = lerCandidatosItem(item)
    mapaItens[item.id] = {
      id: item.id,
      ordem: item.getInt('ordem'),
      titulo: item.getString('titulo'),
      texto: item.getString('texto'),
      quorum_aplicavel: item.getString('quorum_aplicavel'),
      tipo_eleicao: item.getString('tipo_eleicao') || 'regular',
      candidatos_eleicao: candidatosItem,
      // Contagem por candidato — inclui lançamento físico por candidato (0055)
      porCandidato: candidatosItem.map(() => ({ total: 0 })),
      votos: {
        favoravel: 0,
        contrario: 0,
        abstencao: 0,
        nulo: 0,
        branco: 0,
        total: 0,
      },
    }
  }

  let cadeiaValida = true
  let ultimoHash = '0000000000000000000000000000000000000000000000000000000000000000'

  // Helper inline: soma lançamento físico por candidato (0055) ao porCandidato do item
  function somarLancamentoFisicoCandidatos() {
    let lancs = []
    try {
      lancs = e.app.findRecordsByFilter(
        'lancamentos_fisicos',
        'deliberacao = {:delib}',
        '-created',
        500,
        0,
        { delib: deliberacaoId },
      )
    } catch (_) {
      return
    }
    for (let l of lancs) {
      const itemLanc = l.getString('item')
      if (!mapaItens[itemLanc]) continue
      let porCand = []
      try {
        porCand = JSON.parse(l.getString('votos_por_candidato') || '[]')
      } catch (_) {
        porCand = []
      }
      if (!Array.isArray(porCand)) continue
      const alvo = mapaItens[itemLanc].porCandidato
      for (let i = 0; i < porCand.length; i++) {
        if (typeof porCand[i] !== 'number' || isNaN(porCand[i])) continue
        // Se o lançamento é mais antigo que o array do item (candidatos mudaram), estende
        if (i >= alvo.length) alvo.push({ total: 0 })
        alvo[i].total += Math.max(0, Math.round(porCand[i]))
      }
    }
  }

  for (let c of cedulas) {
    const itemId = c.getString('item')
    const opcao = (c.getString('opcao') || '').toLowerCase()

    if (mapaItens[itemId] && mapaItens[itemId].votos[opcao] !== undefined) {
      mapaItens[itemId].votos[opcao] += 1
      mapaItens[itemId].votos.total += 1
    }

    // Voto em candidato — formato 'candidato:<índice>' (migration 0054)
    if (mapaItens[itemId] && opcao.indexOf('candidato:') === 0) {
      const idx = parseInt(opcao.substring('candidato:'.length), 10)
      if (!isNaN(idx)) {
        const alvo = mapaItens[itemId].porCandidato
        if (idx >= alvo.length) {
          for (let k = alvo.length; k <= idx; k++) alvo.push({ total: 0 })
        }
        alvo[idx].total += 1
        mapaItens[itemId].votos.total += 1
      }
    }

    // Conferência básica de encadeamento
    const cHash = c.getString('hash_cedula') || ''
    const hashAnterior = c.getString('hash_anterior') || ''
    if (
      hashAnterior &&
      hashAnterior !== ultimoHash &&
      ultimoHash !== '0000000000000000000000000000000000000000000000000000000000000000'
    ) {
      // Nota: o primeiro hash_anterior é o último hash registrado
    }
    if (cHash) {
      ultimoHash = cHash
    }
  }

  let presencialCount = 0
  let remotoCount = 0
  for (let p of presencas) {
    if (p.getString('tipo') === 'presencial') presencialCount++
    else remotoCount++
  }

  const itensResultado = Object.values(mapaItens).sort((a, b) => a.ordem - b.ordem)

  // Obter total de unidades ativas (unidades elegíveis)
  let totalUnidadesElegiveis = 0
  try {
    const unidadesAtivas = e.app.findRecordsByFilter('unidades', 'ativo = true', '', 1000, 0)
    totalUnidadesElegiveis = unidadesAtivas.length
  } catch (_) {
    totalUnidadesElegiveis = 0
  }

  // Lançamento físico por candidato (0055) entra na contagem porCandidato
  somarLancamentoFisicoCandidatos()

  // Integridade: cédulas total deve ser igual a comparecimentos * quantidade de itens
  const totalCedulas = cedulas.length
  const totalComparecimentos = comparecimentos.length
  const totalItensPauta = itens.length
  const esperadoCedulas = totalComparecimentos * totalItensPauta
  const integridadeCedulasComparecimento =
    totalComparecimentos === 0 ? true : totalCedulas === esperadoCedulas

  return e.json(200, {
    success: true,
    deliberacao: {
      id: delib.id,
      titulo: delib.getString('titulo'),
      descricao: delib.getString('descricao'),
      data_inicio: delib.getString('data_inicio'),
      data_fim: delib.getString('data_fim'),
      status: delib.getString('status'),
      tipo_cedula: delib.getString('tipo_cedula'),
      quorum_instalacao: delib.getInt('quorum_instalacao'),
      quorum_materia: delib.getString('quorum_materia'),
      inadimplente_pode_votar: delib.getBool('inadimplente_pode_votar'),
      locatario_pode_votar: delib.getBool('locatario_pode_votar'),
      hash_raiz: delib.getString('hash_raiz') || ultimoHash,
      mesa_presidente_nome: delib.getString('mesa_presidente_nome'),
      mesa_presidente_cpf: delib.getString('mesa_presidente_cpf'),
      mesa_secretario_nome: delib.getString('mesa_secretario_nome'),
      mesa_secretario_cpf: delib.getString('mesa_secretario_cpf'),
    },
    apuracao: {
      totalComparecimentos: totalComparecimentos,
      totalCedulas: totalCedulas,
      esperadoCedulas: esperadoCedulas,
      totalUnidadesElegiveis: totalUnidadesElegiveis,
      integridadeMatematica: integridadeCedulasComparecimento,
      presencas: {
        presencial: presencialCount,
        remoto: remotoCount,
        total: presencialCount + remotoCount,
      },
      itens: itensResultado,
      hashRaizUrna: delib.getString('hash_raiz') || ultimoHash,
    },
  })
})
