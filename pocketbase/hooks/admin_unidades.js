/**
 * Hook admin_unidades.js
 * Endpoints:
 * 1) POST /backend/v1/admin/unidades/preview
 *    Gera prévia das unidades projetadas sem alterar o banco de dados.
 *    Retorna total projetado, amostra inicial e contagem de novas vs preservadas.
 *
 * 2) POST /backend/v1/admin/unidades/regenerar
 *    Gera e sincroniza a malha de unidades do condomínio (vertical, horizontal, misto).
 *    REQUISITO OBRIGATÓRIO DE SEGURANÇA:
 *    - Jamais apaga ou renumera unidades existentes que tenham vínculos (comparecimentos, cédulas, credenciamentos, presenças).
 *    - Preserva o id interno de todas as unidades existentes.
 *    - Apenas insere as unidades faltantes.
 *    - Grava na trilha de auditoria encadeada com hash SHA-256.
 *
 * 3) POST /backend/v1/admin/unidades/avulsa
 *    Cadastra unidade avulsa fora do padrão (cobertura, salão, loja, box, etc.)
 *    com peso de voto customizado.
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

  // Função interna para padronizar preenchimento de dígitos (ex: 1 -> 01 ou 001)
  function padDigits(num, totalDigits) {
    let s = String(num)
    while (s.length < totalDigits) {
      s = '0' + s
    }
    return s
  }

  // Gera a lista de identificadores conforme configuração
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
    const prefixoBloco = (body.prefixoBloco || 'Bloco').trim()

    for (let b = 0; b < qtdBlocos; b++) {
      const letraBloco = letras[b] || String(b + 1)
      const nomeBloco = prefixoBloco + ' ' + letraBloco

      for (let u = 1; u <= unidadesPorBloco; u++) {
        const andar = Math.floor((u - 1) / 6) + 1
        const porta = ((u - 1) % 6) + 1
        const identNumero = andar + '0' + porta
        const identificador = identNumero + letraBloco
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
        const prefixoBloco = (g.prefixo_bloco || 'Torre').trim()
        const andaresPorBloco = Math.max(1, Math.min(100, Number(g.andares_por_bloco) || 4))
        const unidadesPorAndar = Math.max(1, Math.min(50, Number(g.unidades_por_andar) || 4))
        const andarInicial =
          g.andar_inicial !== undefined && g.andar_inicial !== null
            ? String(g.andar_inicial).trim()
            : '1'
        const modeloNumeracao = g.modelo_numeracao || 'andar_posicao' // sequencial | andar_posicao | andar_posicao_prefixo | custom
        const templateCustom = g.template_custom || '{bloco}-{andar}{unid}'
        const digitosUnid = Math.max(1, Math.min(4, Number(g.digitos_unid) || 2))

        for (let b = 0; b < qtdBlocos; b++) {
          const letraOuNum = letras[b] || String(b + 1)
          const blocoIdent =
            qtdBlocos === 1 && !g.quantidade_blocos ? prefixoBloco : prefixoBloco + ' ' + letraOuNum
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
                ident = letraOuNum + '-' + String(andarNum) + unidPadded
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
        // Horizontal (rua / quadra / lote / setor)
        const qtdUnidades = Math.max(1, Math.min(1000, Number(g.quantidade_unidades) || 20))
        const prefixoRua = (g.prefixo_rua || 'Rua').trim()
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

  // Comparar com unidades existentes no banco
  const unidadesExistentes = e.app.findRecordsByFilter('unidades', '', 'identificador', 2000, 0)
  const existentesPorIdent = {}
  for (let u of unidadesExistentes) {
    existentesPorIdent[u.getString('identificador')] = u
  }

  let novasCount = 0
  let preservadasCount = 0
  const amostra = []

  for (let i = 0; i < unidadesEsperadas.length; i++) {
    const item = unidadesEsperadas[i]
    const jaExiste = !!existentesPorIdent[item.identificador]
    if (jaExiste) {
      preservadasCount++
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
        status: jaExiste ? 'existente' : 'nova',
      })
    }
  }

  return e.json(200, {
    success: true,
    totalProjetado: unidadesEsperadas.length,
    totalExistentesNoBanco: unidadesExistentes.length,
    novasASeremCriadas: novasCount,
    preservadas: preservadasCount,
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
    const prefixoBloco = (body.prefixoBloco || 'Bloco').trim()

    for (let b = 0; b < qtdBlocos; b++) {
      const letraBloco = letras[b] || String(b + 1)
      const nomeBloco = prefixoBloco + ' ' + letraBloco

      for (let u = 1; u <= unidadesPorBloco; u++) {
        const andar = Math.floor((u - 1) / 6) + 1
        const porta = ((u - 1) % 6) + 1
        const identNumero = andar + '0' + porta
        const identificador = identNumero + letraBloco
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
        const prefixoBloco = (g.prefixo_bloco || 'Torre').trim()
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
          const blocoIdent =
            qtdBlocos === 1 && !g.quantidade_blocos ? prefixoBloco : prefixoBloco + ' ' + letraOuNum
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
                ident = letraOuNum + '-' + String(andarNum) + unidPadded
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
        const prefixoRua = (g.prefixo_rua || 'Rua').trim()
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

  const unidadesExistentes = e.app.findRecordsByFilter('unidades', '', 'identificador', 2000, 0)
  const existentesPorIdent = {}
  for (let u of unidadesExistentes) {
    existentesPorIdent[u.getString('identificador')] = u
  }

  let criadasCount = 0
  let preservadasCount = 0
  const unidadesCol = e.app.findCollectionByNameOrId('unidades')

  for (let item of unidadesEsperadas) {
    if (existentesPorIdent[item.identificador]) {
      // Unidade existente: PRESERVADA com id e vínculos intocados.
      // Opcionalmente atualizamos campos complementares que não afetam a unicidade
      const recExistente = existentesPorIdent[item.identificador]
      let alterado = false
      if (item.grupo && !recExistente.getString('grupo')) {
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

  // Atualizar configuracoes
  try {
    const configList = e.app.findRecordsByFilter('configuracoes', '', '-created', 1, 0)
    if (configList && configList.length > 0) {
      const c = configList[0]
      c.set('tipo_condominio', tipoCondominio)
      c.set('rotulo_unidade', rotuloUnidade)
      if (grupos.length > 0) {
        c.set('grupos_config', JSON.stringify(grupos))
      }
      const totalFinal = e.app.countRecords('unidades')
      c.set('total_unidades', totalFinal)
      e.app.save(c)
    }
  } catch (err) {
    console.log('Erro ao atualizar configuracoes:', err)
  }

  // Gravar auditoria encadeada
  try {
    registrarAuditoria(e.app, {
      evento: 'autenticacao_concluida',
      fator:
        'Admin ' +
        authRecord.getString('name') +
        ' regenerou malha (' +
        tipoCondominio +
        '): ' +
        criadasCount +
        ' criadas, ' +
        preservadasCount +
        ' preservadas (Total no banco: ' +
        (preservadasCount + criadasCount) +
        ')',
      dispositivo: e.requestInfo().headers['user-agent'] || 'admin-painel',
    })
  } catch (err) {
    console.log('Erro ao gravar auditoria admin:', err)
  }

  const totalFinal = e.app.countRecords('unidades')

  return e.json(200, {
    success: true,
    criadas: criadasCount,
    preservadas: preservadasCount,
    totalExistente: totalFinal,
    message:
      'Malha de unidades atualizada com sucesso. ' +
      criadasCount +
      ' novas unidades adicionadas, ' +
      preservadasCount +
      ' unidades preservadas.',
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
      return e.json(400, {
        success: false,
        message: 'Já existe uma unidade cadastrada com o identificador "' + identificador + '".',
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

  // Gravar auditoria
  try {
    registrarAuditoria(e.app, {
      evento: 'autenticacao_concluida',
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
    const configList = e.app.findRecordsByFilter('configuracoes', '', '-created', 1, 0)
    if (configList && configList.length > 0) {
      const c = configList[0]
      const totalFinal = e.app.countRecords('unidades')
      c.set('total_unidades', totalFinal)
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
