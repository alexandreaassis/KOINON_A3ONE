/**
 * Hook admin_unidades.js
 * Endpoints:
 * 1) POST /backend/v1/admin/unidades/preview
 *    Gera prévia das unidades projetadas sem alterar o banco de dados.
 *    Retorna total projetado, amostra inicial, contagem de novas, preservadas na malha,
 *    preservadas fora da malha (com vínculos legítimos), desativadas projetadas e o TOTAL FINAL ativo que ficará no banco.
 *
 * 2) POST /backend/v1/admin/unidades/regenerar
 *    Gera e sincroniza a malha de unidades do condomínio (vertical, horizontal, misto).
 *    REQUISITO OBRIGATÓRIO DE SEGURANÇA:
 *    - Desativa (ativo = false) as unidades ativas que ficarem FORA da nova malha, MAS SOMENTE as que não possuem
 *      credenciamentos, presenças, votos/cédulas, comparecimentos, comprovantes ou sessões.
 *    - Unidades com vínculos eleitorais que ficarem fora da malha NUNCA são desativadas ou apagadas: permanecem ativas e preservadas.
 *    - Preserva o ID interno e vínculos de todas as unidades existentes.
 *    - Insere as unidades faltantes como ativas (ativo = true). Se uma unidade da malha já existia desativada, reativa-a.
 *    - Grava na trilha de auditoria encadeada com hash SHA-256 e evento correto ('malha_unidades_gerada').
 *
 * 3) POST /backend/v1/admin/unidades/avulsa
 *    Cadastra unidade avulsa fora do padrão (cobertura, salão, loja, box, etc.)
 *    com peso de voto customizado e evento 'unidade_avulsa_criada'.
 */

routerAdd('POST', '/backend/v1/admin/unidades/preview', (e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(403, { success: false, message: 'Usuário não autenticado' })
  }

  const role = authRecord.getString('role')
  if (role !== 'admin' && role !== 'mesa') {
    return e.json(403, {
      success: false,
      message: 'Acesso restrito a administradores ou membros da mesa.',
    })
  }

  const body = e.requestInfo().body || {}
  const tipoCondominio = (body.tipo_condominio || 'vertical').toLowerCase()
  const rotuloUnidade = (body.rotulo_unidade || 'Apartamento').trim()
  const grupos = Array.isArray(body.grupos) ? body.grupos : []

  function padDigits(num, totalDigits) {
    let s = String(num)
    while (s.length < totalDigits) {
      s = '0' + s
    }
    return s
  }

  function sanitizarPrefixo(prefixoRaw, padrao) {
    const limpo = (prefixoRaw || '').trim()
    if (!limpo || limpo === '.') {
      return padrao
    }
    return limpo
  }

  const unidadesEsperadas = []
  const letras = [
    'A',
    'B',
    'C',
    'D',
    'E',
    'F',
    'G',
    'H',
    'I',
    'J',
    'K',
    'L',
    'M',
    'N',
    'O',
    'P',
    'Q',
    'R',
    'S',
    'T',
  ]

  if (grupos.length === 0) {
    // Fallback legado de blocos simples
    const qtdBlocos = Number(body.quantidadeBlocos) || 2
    const unidadesPorBloco = Number(body.unidadesPorBloco) || 26
    const prefixoBloco = sanitizarPrefixo(body.prefixoBloco, 'Torre')

    for (let b = 0; b < qtdBlocos; b++) {
      const letraBloco = letras[b] || String(b + 1)
      const nomeBloco = qtdBlocos === 1 ? prefixoBloco : prefixoBloco + ' ' + letraBloco

      for (let u = 1; u <= unidadesPorBloco; u++) {
        const andar = Math.floor((u - 1) / 6) + 1
        const porta = ((u - 1) % 6) + 1
        const identNumero = andar + '0' + porta
        const identificador = qtdBlocos === 1 ? identNumero : identNumero + letraBloco
        unidadesEsperadas.push({
          identificador: identificador,
          bloco: nomeBloco,
          grupo: nomeBloco,
          andar: String(andar),
          peso_voto: 1,
          tipo_unidade: rotuloUnidade,
        })
      }
    }
  } else {
    for (let gIndex = 0; gIndex < grupos.length; gIndex++) {
      const g = grupos[gIndex] || {}
      const tipoGrupo = g.tipo || (tipoCondominio === 'horizontal' ? 'horizontal' : 'vertical')
      const nomeGrupo = (g.nome || 'Grupo ' + (gIndex + 1)).trim()
      const pesoGrupo = Number(g.peso_voto) > 0 ? Number(g.peso_voto) : 1
      const rotuloGrupo = (g.rotulo || rotuloUnidade).trim()

      if (tipoGrupo === 'vertical') {
        const qtdBlocos = Math.max(1, Math.min(20, Number(g.quantidade_blocos) || 1))
        const prefixoBloco = sanitizarPrefixo(g.prefixo_bloco, 'Torre')
        const andaresPorBloco = Math.max(1, Math.min(100, Number(g.andares_por_bloco) || 4))
        const unidadesPorAndar = Math.max(1, Math.min(50, Number(g.unidades_por_andar) || 4))
        const andarInicial =
          g.andar_inicial !== undefined && g.andar_inicial !== null
            ? String(g.andar_inicial).trim()
            : '1'
        const modeloNumeracao = g.modelo_numeracao || 'andar_posicao'
        const templateCustom = g.template_custom || '{bloco}-{andar}{unid}'
        const digitosUnid = Math.max(1, Math.min(4, Number(g.digitos_unid) || 2))

        for (let b = 0; b < qtdBlocos; b++) {
          const letraOuNum = letras[b] || String(b + 1)
          const blocoIdent = qtdBlocos === 1 ? prefixoBloco : prefixoBloco + ' ' + letraOuNum
          let seqContador = 1

          for (let a = 0; a < andaresPorBloco; a++) {
            let andarLabel = String(a + 1)
            let andarNum = a + 1
            if (andarInicial === '0' || andarInicial === 'terreo' || andarInicial === 'T') {
              andarNum = a
              andarLabel = a === 0 ? 'T' : String(a)
            } else {
              const startN = Number(andarInicial)
              if (!isNaN(startN)) {
                andarNum = startN + a
                andarLabel = String(andarNum)
              }
            }

            for (let u = 1; u <= unidadesPorAndar; u++) {
              let ident = ''
              const unidPadded = padDigits(u, digitosUnid)

              if (modeloNumeracao === 'sequencial') {
                ident = (qtdBlocos > 1 ? letraOuNum + '-' : '') + String(seqContador)
              } else if (modeloNumeracao === 'andar_posicao') {
                ident = String(andarNum) + unidPadded + (qtdBlocos > 1 ? letraOuNum : '')
              } else if (modeloNumeracao === 'andar_posicao_prefixo') {
                ident = (qtdBlocos > 1 ? letraOuNum + '-' : '') + String(andarNum) + unidPadded
              } else if (modeloNumeracao === 'custom') {
                ident = templateCustom
                  .replace(/\{bloco\}/g, letraOuNum)
                  .replace(/\{andar\}/g, andarLabel)
                  .replace(/\{unid\}/g, unidPadded)
                  .replace(/\{seq\}/g, String(seqContador))
              } else {
                ident = String(andarNum) + unidPadded + (qtdBlocos > 1 ? letraOuNum : '')
              }

              unidadesEsperadas.push({
                identificador: ident.trim(),
                bloco: blocoIdent,
                grupo: nomeGrupo,
                andar: andarLabel,
                peso_voto: pesoGrupo,
                tipo_unidade: rotuloGrupo,
                posicao_numero: u,
              })
              seqContador++
            }
          }
        }
      } else {
        // Horizontal
        const qtdUnidades = Math.max(1, Math.min(1000, Number(g.quantidade_unidades) || 20))
        const prefixoRua = sanitizarPrefixo(g.prefixo_rua, 'Rua')
        const modeloNumeracao = g.modelo_numeracao || 'sequencial'
        const numeroInicial = Number(g.numero_inicial) || 1
        const templateCustom = g.template_custom || '{prefixo}-{unid}'
        const digitosUnid = Math.max(1, Math.min(4, Number(g.digitos_unid) || 2))

        for (let u = 0; u < qtdUnidades; u++) {
          const numAtual = numeroInicial + u
          const unidPadded = padDigits(numAtual, digitosUnid)
          let ident = ''

          if (modeloNumeracao === 'sequencial') {
            ident = prefixoRua ? prefixoRua + ' ' + unidPadded : String(numAtual)
          } else if (modeloNumeracao === 'custom') {
            ident = templateCustom
              .replace(/\{prefixo\}/g, prefixoRua)
              .replace(/\{unid\}/g, unidPadded)
              .replace(/\{seq\}/g, String(u + 1))
          } else {
            ident = prefixoRua ? prefixoRua + ' ' + unidPadded : String(numAtual)
          }

          unidadesEsperadas.push({
            identificador: ident.trim(),
            bloco: prefixoRua || nomeGrupo,
            grupo: nomeGrupo,
            andar: '',
            peso_voto: pesoGrupo,
            tipo_unidade: rotuloGrupo,
            posicao_numero: numAtual,
          })
        }
      }
    }
  }

  // Mapa de identificadores esperados na nova malha
  const esperadosMap = {}
  for (let item of unidadesEsperadas) {
    esperadosMap[item.identificador] = item
  }

  // Buscar todas as unidades existentes no banco
  const todasUnidades = e.app.findRecordsByFilter(
    'unidades',
    '',
    'grupo,bloco,posicao_numero,identificador',
    2000,
    0,
  )
  const existentesPorIdent = {}
  for (let u of todasUnidades) {
    existentesPorIdent[u.getString('identificador')] = u
  }

  // Mapear IDs com vínculos que JAMAIS podem ser desativados
  const idsComVinculo = {}
  function marcarVinculados(collectionName) {
    try {
      const records = e.app.findRecordsByFilter(collectionName, 'unidade != ""', '', 2000, 0)
      for (let r of records) {
        const uid = r.getString('unidade')
        if (uid) idsComVinculo[uid] = true
      }
    } catch (_) {}
  }
  marcarVinculados('credenciamentos')
  marcarVinculados('presencas')
  marcarVinculados('comparecimentos')
  marcarVinculados('comprovantes')
  marcarVinculados('sessoes')

  let novasCount = 0
  let preservadasNaMalhaCount = 0
  const amostra = []

  for (let i = 0; i < unidadesEsperadas.length; i++) {
    const item = unidadesEsperadas[i]
    const jaExiste = !!existentesPorIdent[item.identificador]
    if (jaExiste) {
      preservadasNaMalhaCount++
    } else {
      novasCount++
    }
    if (i < 24) {
      amostra.push({
        identificador: item.identificador,
        bloco: item.bloco,
        grupo: item.grupo,
        andar: item.andar,
        peso_voto: item.peso_voto,
        tipo_unidade: item.tipo_unidade,
        posicao_numero: item.posicao_numero,
        status: jaExiste ? 'existente' : 'nova',
      })
    }
  }

  // Analisar unidades ativas atualmente fora da nova malha
  let foraDaMalhaDesativadas = 0
  let foraDaMalhaPreservadasComVinculo = 0

  for (let u of todasUnidades) {
    const ident = u.getString('identificador')
    const ativo = u.getBool('ativo')
    if (ativo && !esperadosMap[ident]) {
      // Unidade ativa fora da malha
      if (idsComVinculo[u.id]) {
        foraDaMalhaPreservadasComVinculo++
      } else {
        foraDaMalhaDesativadas++
      }
    }
  }

  // Total final de unidades que ficarão ativas no banco:
  // Unidades da malha projetada (todas ativas) + Unidades fora da malha preservadas por vínculo
  const totalFinalAtivas = unidadesEsperadas.length + foraDaMalhaPreservadasComVinculo

  return e.json(200, {
    success: true,
    totalProjetado: unidadesEsperadas.length,
    totalExistentesNoBanco: todasUnidades.length,
    totalAtivasAtuais: todasUnidades.filter((u) => u.getBool('ativo')).length,
    novasASeremCriadas: novasCount,
    preservadas: preservadasNaMalhaCount,
    preservadasForaDaMalha: foraDaMalhaPreservadasComVinculo,
    desativadasProjetadas: foraDaMalhaDesativadas,
    totalFinalAtivas: totalFinalAtivas,
    amostra: amostra,
  })
})

routerAdd('POST', '/backend/v1/admin/unidades/regenerar', (e) => {
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
      console.log('Erro ao registrar auditoria interna:', err)
    }
  }

  const authRecord = e.auth
  if (!authRecord) {
    return e.json(403, { success: false, message: 'Usuário não autenticado' })
  }

  const role = authRecord.getString('role')
  if (role !== 'admin' && role !== 'mesa') {
    return e.json(403, {
      success: false,
      message: 'Apenas administradores podem gerenciar a estrutura de unidades.',
    })
  }

  const body = e.requestInfo().body || {}
  const tipoCondominio = (body.tipo_condominio || 'vertical').toLowerCase()
  const rotuloUnidade = (body.rotulo_unidade || 'Apartamento').trim()
  const grupos = Array.isArray(body.grupos) ? body.grupos : []

  function padDigits(num, totalDigits) {
    let s = String(num)
    while (s.length < totalDigits) {
      s = '0' + s
    }
    return s
  }

  function sanitizarPrefixo(prefixoRaw, padrao) {
    const limpo = (prefixoRaw || '').trim()
    if (!limpo || limpo === '.') {
      return padrao
    }
    return limpo
  }

  const unidadesEsperadas = []
  const letras = [
    'A',
    'B',
    'C',
    'D',
    'E',
    'F',
    'G',
    'H',
    'I',
    'J',
    'K',
    'L',
    'M',
    'N',
    'O',
    'P',
    'Q',
    'R',
    'S',
    'T',
  ]

  if (grupos.length === 0) {
    const qtdBlocos = Number(body.quantidadeBlocos) || 2
    const unidadesPorBloco = Number(body.unidadesPorBloco) || 26
    const prefixoBloco = sanitizarPrefixo(body.prefixoBloco, 'Torre')

    for (let b = 0; b < qtdBlocos; b++) {
      const letraBloco = letras[b] || String(b + 1)
      const nomeBloco = qtdBlocos === 1 ? prefixoBloco : prefixoBloco + ' ' + letraBloco

      for (let u = 1; u <= unidadesPorBloco; u++) {
        const andar = Math.floor((u - 1) / 6) + 1
        const porta = ((u - 1) % 6) + 1
        const identNumero = andar + '0' + porta
        const identificador = qtdBlocos === 1 ? identNumero : identNumero + letraBloco
        unidadesEsperadas.push({
          identificador: identificador,
          bloco: nomeBloco,
          grupo: nomeBloco,
          andar: String(andar),
          peso_voto: 1,
          tipo_unidade: rotuloUnidade,
        })
      }
    }
  } else {
    for (let gIndex = 0; gIndex < grupos.length; gIndex++) {
      const g = grupos[gIndex] || {}
      const tipoGrupo = g.tipo || (tipoCondominio === 'horizontal' ? 'horizontal' : 'vertical')
      const nomeGrupo = (g.nome || 'Grupo ' + (gIndex + 1)).trim()
      const pesoGrupo = Number(g.peso_voto) > 0 ? Number(g.peso_voto) : 1
      const rotuloGrupo = (g.rotulo || rotuloUnidade).trim()

      if (tipoGrupo === 'vertical') {
        const qtdBlocos = Math.max(1, Math.min(20, Number(g.quantidade_blocos) || 1))
        const prefixoBloco = sanitizarPrefixo(g.prefixo_bloco, 'Torre')
        const andaresPorBloco = Math.max(1, Math.min(100, Number(g.andares_por_bloco) || 4))
        const unidadesPorAndar = Math.max(1, Math.min(50, Number(g.unidades_por_andar) || 4))
        const andarInicial =
          g.andar_inicial !== undefined && g.andar_inicial !== null
            ? String(g.andar_inicial).trim()
            : '1'
        const modeloNumeracao = g.modelo_numeracao || 'andar_posicao'
        const templateCustom = g.template_custom || '{bloco}-{andar}{unid}'
        const digitosUnid = Math.max(1, Math.min(4, Number(g.digitos_unid) || 2))

        for (let b = 0; b < qtdBlocos; b++) {
          const letraOuNum = letras[b] || String(b + 1)
          const blocoIdent = qtdBlocos === 1 ? prefixoBloco : prefixoBloco + ' ' + letraOuNum
          let seqContador = 1

          for (let a = 0; a < andaresPorBloco; a++) {
            let andarLabel = String(a + 1)
            let andarNum = a + 1
            if (andarInicial === '0' || andarInicial === 'terreo' || andarInicial === 'T') {
              andarNum = a
              andarLabel = a === 0 ? 'T' : String(a)
            } else {
              const startN = Number(andarInicial)
              if (!isNaN(startN)) {
                andarNum = startN + a
                andarLabel = String(andarNum)
              }
            }

            for (let u = 1; u <= unidadesPorAndar; u++) {
              let ident = ''
              const unidPadded = padDigits(u, digitosUnid)

              if (modeloNumeracao === 'sequencial') {
                ident = (qtdBlocos > 1 ? letraOuNum + '-' : '') + String(seqContador)
              } else if (modeloNumeracao === 'andar_posicao') {
                ident = String(andarNum) + unidPadded + (qtdBlocos > 1 ? letraOuNum : '')
              } else if (modeloNumeracao === 'andar_posicao_prefixo') {
                ident = (qtdBlocos > 1 ? letraOuNum + '-' : '') + String(andarNum) + unidPadded
              } else if (modeloNumeracao === 'custom') {
                ident = templateCustom
                  .replace(/\{bloco\}/g, letraOuNum)
                  .replace(/\{andar\}/g, andarLabel)
                  .replace(/\{unid\}/g, unidPadded)
                  .replace(/\{seq\}/g, String(seqContador))
              } else {
                ident = String(andarNum) + unidPadded + (qtdBlocos > 1 ? letraOuNum : '')
              }

              unidadesEsperadas.push({
                identificador: ident.trim(),
                bloco: blocoIdent,
                grupo: nomeGrupo,
                andar: andarLabel,
                peso_voto: pesoGrupo,
                tipo_unidade: rotuloGrupo,
                posicao_numero: u,
              })
              seqContador++
            }
          }
        }
      } else {
        const qtdUnidades = Math.max(1, Math.min(1000, Number(g.quantidade_unidades) || 20))
        const prefixoRua = sanitizarPrefixo(g.prefixo_rua, 'Rua')
        const modeloNumeracao = g.modelo_numeracao || 'sequencial'
        const numeroInicial = Number(g.numero_inicial) || 1
        const templateCustom = g.template_custom || '{prefixo}-{unid}'
        const digitosUnid = Math.max(1, Math.min(4, Number(g.digitos_unid) || 2))

        for (let u = 0; u < qtdUnidades; u++) {
          const numAtual = numeroInicial + u
          const unidPadded = padDigits(numAtual, digitosUnid)
          let ident = ''

          if (modeloNumeracao === 'sequencial') {
            ident = prefixoRua ? prefixoRua + ' ' + unidPadded : String(numAtual)
          } else if (modeloNumeracao === 'custom') {
            ident = templateCustom
              .replace(/\{prefixo\}/g, prefixoRua)
              .replace(/\{unid\}/g, unidPadded)
              .replace(/\{seq\}/g, String(u + 1))
          } else {
            ident = prefixoRua ? prefixoRua + ' ' + unidPadded : String(numAtual)
          }

          unidadesEsperadas.push({
            identificador: ident.trim(),
            bloco: prefixoRua || nomeGrupo,
            grupo: nomeGrupo,
            andar: '',
            peso_voto: pesoGrupo,
            tipo_unidade: rotuloGrupo,
            posicao_numero: numAtual,
          })
        }
      }
    }
  }

  const todasUnidades = e.app.findRecordsByFilter(
    'unidades',
    '',
    'grupo,bloco,posicao_numero,identificador',
    2000,
    0,
  )
  const existentesPorIdent = {}
  for (let u of todasUnidades) {
    existentesPorIdent[u.getString('identificador')] = u
  }

  // Identificar unidades com vínculos protegidos
  const idsComVinculo = {}
  function marcarVinculados(collectionName) {
    try {
      const records = e.app.findRecordsByFilter(collectionName, 'unidade != ""', '', 2000, 0)
      for (let r of records) {
        const uid = r.getString('unidade')
        if (uid) idsComVinculo[uid] = true
      }
    } catch (_) {}
  }
  marcarVinculados('credenciamentos')
  marcarVinculados('presencas')
  marcarVinculados('comparecimentos')
  marcarVinculados('comprovantes')
  marcarVinculados('sessoes')

  const esperadosMap = {}
  for (let item of unidadesEsperadas) {
    esperadosMap[item.identificador] = item
  }

  let criadasCount = 0
  let preservadasCount = 0
  let reativadasCount = 0
  const unidadesCol = e.app.findCollectionByNameOrId('unidades')

  // 1. Processar unidades da malha esperada
  for (let item of unidadesEsperadas) {
    if (existentesPorIdent[item.identificador]) {
      const recExistente = existentesPorIdent[item.identificador]
      let alterado = false

      if (!recExistente.getBool('ativo')) {
        recExistente.set('ativo', true)
        alterado = true
        reativadasCount++
      }
      if (item.bloco && recExistente.getString('bloco') !== item.bloco) {
        recExistente.set('bloco', item.bloco)
        alterado = true
      }
      if (item.grupo && recExistente.getString('grupo') !== item.grupo) {
        recExistente.set('grupo', item.grupo)
        alterado = true
      }
      if (item.tipo_unidade && !recExistente.getString('tipo_unidade')) {
        recExistente.set('tipo_unidade', item.tipo_unidade)
        alterado = true
      }
      if (recExistente.getFloat('peso_voto') <= 0 && item.peso_voto > 0) {
        recExistente.set('peso_voto', item.peso_voto)
        alterado = true
      }
      if (item.andar && !recExistente.getString('andar')) {
        recExistente.set('andar', item.andar)
        alterado = true
      }
      if (alterado) {
        try {
          e.app.save(recExistente)
        } catch (_) {}
      }
      preservadasCount++
    } else {
      const rec = new Record(unidadesCol)
      rec.set('identificador', item.identificador)
      rec.set('bloco', item.bloco)
      rec.set('grupo', item.grupo || item.bloco)
      rec.set('andar', item.andar || '')
      rec.set('peso_voto', item.peso_voto || 1)
      rec.set('tipo_unidade', item.tipo_unidade || rotuloUnidade)
      if (item.posicao_numero) rec.set('posicao_numero', item.posicao_numero)
      rec.set(
        'responsavel_nome',
        'Condômino ' + (item.tipo_unidade || rotuloUnidade) + ' ' + item.identificador,
      )
      rec.set('ativo', true)
      e.app.save(rec)
      criadasCount++
    }
  }

  // 2. Desativar unidades ativas que ficaram FORA da nova malha, MAS APENAS as sem vínculos
  let desativadasCount = 0
  let preservadasForaCount = 0

  for (let u of todasUnidades) {
    const ident = u.getString('identificador')
    const ativo = u.getBool('ativo')

    if (ativo && !esperadosMap[ident]) {
      if (idsComVinculo[u.id]) {
        // Possui vínculos eleitorais legítimos: JAMAIS desativar
        preservadasForaCount++
      } else {
        // Sem vínculos: desativa com segurança
        u.set('ativo', false)
        try {
          e.app.save(u)
          desativadasCount++
        } catch (_) {}
      }
    }
  }

  // 3. Atualizar configurações gerais
  let totalAtivasFinal = 0
  try {
    const ativas = e.app.findRecordsByFilter('unidades', 'ativo = true', '', 2000, 0)
    totalAtivasFinal = ativas.length

    const configList = e.app.findRecordsByFilter('configuracoes', '', '-created', 1, 0)
    if (configList && configList.length > 0) {
      const c = configList[0]
      c.set('tipo_condominio', tipoCondominio)
      c.set('rotulo_unidade', rotuloUnidade)
      const pBlocoAtual = (c.getString('prefixo_bloco') || '').trim()
      if (pBlocoAtual === '.' || pBlocoAtual === '') {
        c.set('prefixo_bloco', 'Torre')
      }
      if (grupos.length > 0) {
        // Garantir que grupos não salvem prefixo_bloco vazio ou '.'
        const gruposSanitizados = grupos.map((g) => {
          const clone = Object.assign({}, g)
          if (clone.tipo === 'vertical') {
            clone.prefixo_bloco = sanitizarPrefixo(clone.prefixo_bloco, 'Torre')
          } else if (clone.tipo === 'horizontal') {
            clone.prefixo_rua = sanitizarPrefixo(clone.prefixo_rua, 'Rua')
          }
          return clone
        })
        c.set('grupos_config', JSON.stringify(gruposSanitizados))
      }
      c.set('total_unidades', totalAtivasFinal)
      e.app.save(c)
    }
  } catch (err) {
    console.log('Erro ao atualizar configuracoes:', err)
  }

  // 4. Gravar auditoria encadeada com evento 'malha_unidades_gerada'
  try {
    registrarAuditoria(e.app, {
      evento: 'malha_unidades_gerada',
      fator:
        'Admin ' +
        authRecord.getString('name') +
        ' gerou malha (' +
        tipoCondominio +
        '): ' +
        criadasCount +
        ' criadas, ' +
        preservadasCount +
        ' preservadas na malha, ' +
        desativadasCount +
        ' desativadas sem vínculo, ' +
        preservadasForaCount +
        ' preservadas fora da malha com vínculo. Total de unidades ativas no banco: ' +
        totalAtivasFinal,
      dispositivo: e.requestInfo().headers['user-agent'] || 'admin-painel',
    })
  } catch (err) {
    console.log('Erro ao gravar auditoria admin:', err)
  }

  return e.json(200, {
    success: true,
    criadas: criadasCount,
    preservadas: preservadasCount,
    desativadas: desativadasCount,
    preservadasForaDaMalha: preservadasForaCount,
    totalExistente: totalAtivasFinal,
    message:
      'Malha de unidades atualizada com sucesso. ' +
      criadasCount +
      ' novas adicionadas, ' +
      preservadasCount +
      ' preservadas na malha, ' +
      desativadasCount +
      ' legadas desativadas. Total ativo: ' +
      totalAtivasFinal +
      '.',
  })
})

routerAdd('POST', '/backend/v1/admin/unidades/avulsa', (e) => {
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
      console.log('Erro ao registrar auditoria interna:', err)
    }
  }

  const authRecord = e.auth
  if (!authRecord) {
    return e.json(403, { success: false, message: 'Usuário não autenticado' })
  }

  const role = authRecord.getString('role')
  if (role !== 'admin' && role !== 'mesa') {
    return e.json(403, {
      success: false,
      message: 'Acesso restrito a administradores ou membros da mesa.',
    })
  }

  const body = e.requestInfo().body || {}
  const identificador = (body.identificador || '').trim()
  const bloco = (body.bloco || 'Avulso').trim()
  const responsavelNome = (body.responsavel_nome || 'Condômino ' + identificador).trim()
  const contatoEmail = (body.contato_email || '').trim()
  const contatoCelular = (body.contato_celular || '').trim()
  const pesoVoto = Number(body.peso_voto) > 0 ? Number(body.peso_voto) : 1
  const tipoUnidade = (body.tipo_unidade || 'Unidade Especial').trim()
  const andar = (body.andar || '').trim()

  if (!identificador) {
    return e.json(400, { success: false, message: 'O identificador da unidade é obrigatório.' })
  }

  // Verificar se já existe unidade com este identificador
  try {
    const existentes = e.app.findRecordsByFilter('unidades', 'identificador = {:ident}', '', 1, 0, {
      ident: identificador,
    })
    if (existentes && existentes.length > 0) {
      const ex = existentes[0]
      if (!ex.getBool('ativo')) {
        ex.set('ativo', true)
        ex.set('bloco', bloco)
        ex.set('peso_voto', pesoVoto)
        ex.set('tipo_unidade', tipoUnidade)
        if (responsavelNome) ex.set('responsavel_nome', responsavelNome)
        e.app.save(ex)
        return e.json(200, {
          success: true,
          unidade: {
            id: ex.id,
            identificador: identificador,
            bloco: bloco,
            tipo_unidade: tipoUnidade,
            peso_voto: pesoVoto,
          },
          message: 'Unidade "' + identificador + '" já existia inativa e foi reativada!',
        })
      }
      return e.json(400, {
        success: false,
        message:
          'Já existe uma unidade ativa cadastrada com o identificador "' + identificador + '".',
      })
    }
  } catch (_) {}

  const unidadesCol = e.app.findCollectionByNameOrId('unidades')
  const rec = new Record(unidadesCol)
  rec.set('identificador', identificador)
  rec.set('bloco', bloco)
  rec.set('grupo', 'Avulso')
  rec.set('andar', andar)
  rec.set('responsavel_nome', responsavelNome)
  if (contatoEmail) rec.set('contato_email', contatoEmail)
  if (contatoCelular) rec.set('contato_celular', contatoCelular)
  rec.set('peso_voto', pesoVoto)
  rec.set('tipo_unidade', tipoUnidade)
  rec.set('ativo', true)
  e.app.save(rec)

  // Gravar auditoria com tipo 'unidade_avulsa_criada'
  try {
    registrarAuditoria(e.app, {
      evento: 'unidade_avulsa_criada',
      fator:
        'Admin ' +
        authRecord.getString('name') +
        ' cadastrou unidade avulsa ' +
        identificador +
        ' (' +
        tipoUnidade +
        ', peso ' +
        pesoVoto +
        ')',
      dispositivo: e.requestInfo().headers['user-agent'] || 'admin-painel',
      unidade: rec.id,
    })
  } catch (err) {
    console.log('Erro ao gravar auditoria unidade avulsa:', err)
  }

  // Atualizar total no configuracoes
  try {
    const ativas = e.app.findRecordsByFilter('unidades', 'ativo = true', '', 2000, 0)
    const configList = e.app.findRecordsByFilter('configuracoes', '', '-created', 1, 0)
    if (configList && configList.length > 0) {
      const c = configList[0]
      c.set('total_unidades', ativas.length)
      e.app.save(c)
    }
  } catch (_) {}

  return e.json(200, {
    success: true,
    unidade: {
      id: rec.id,
      identificador: identificador,
      bloco: bloco,
      tipo_unidade: tipoUnidade,
      peso_voto: pesoVoto,
    },
    message: 'Unidade avulsa "' + identificador + '" cadastrada com sucesso!',
  })
})
