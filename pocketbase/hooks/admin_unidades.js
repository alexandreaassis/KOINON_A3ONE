/**
 * Hook POST /backend/v1/admin/unidades/regenerar
 * Regenera e sincroniza a malha de unidades do condomínio com base na quantidade de blocos
 * e unidades por bloco.
 * REQUISITO DE SEGURANÇA:
 * - Jamais apaga unidades que já possuem registros vinculados (comparecimentos, cédulas, credenciamentos, presenças).
 * - Adiciona novas unidades faltantes.
 * - Registra evento na trilha de auditoria encadeada.
 */

routerAdd('POST', '/backend/v1/admin/unidades/regenerar', (e) => {
  const authRecord = e.auth
  if (!authRecord) {
    throw new ForbiddenError('Usuário não autenticado')
  }

  const role = authRecord.getString('role')
  if (role !== 'admin' && role !== 'mesa') {
    throw new ForbiddenError('Apenas administradores podem gerenciar a estrutura de unidades.')
  }

  const body = e.requestInfo().body || {}
  const qtdBlocos = Number(body.quantidadeBlocos) || 2
  const unidadesPorBloco = Number(body.unidadesPorBloco) || 26
  const prefixoBloco = (body.prefixoBloco || 'Bloco').trim()

  if (qtdBlocos < 1 || qtdBlocos > 10) {
    throw new BadRequestError('Quantidade de blocos deve ser entre 1 e 10.')
  }
  if (unidadesPorBloco < 1 || unidadesPorBloco > 100) {
    throw new BadRequestError('Unidades por bloco deve ser entre 1 e 100.')
  }

  const letras = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
  const unidadesExistentes = e.app.findRecordsByFilter('unidades', '', 'identificador', 500, 0)
  const existentesPorIdent = {}
  for (let u of unidadesExistentes) {
    existentesPorIdent[u.getString('identificador')] = u
  }

  let criadasCount = 0
  let preservadasCount = 0

  // Gera lista esperada de unidades
  const unidadesEsperadas = []
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
      })
    }
  }

  const unidadesCol = e.app.findCollectionByNameOrId('unidades')

  for (let item of unidadesEsperadas) {
    if (existentesPorIdent[item.identificador]) {
      preservadasCount++
    } else {
      const rec = new Record(unidadesCol)
      rec.set('identificador', item.identificador)
      rec.set('bloco', item.bloco)
      rec.set('responsavel_nome', 'Condômino Apto ' + item.identificador)
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
      c.set('quantidade_blocos', qtdBlocos)
      c.set('unidades_por_bloco', unidadesPorBloco)
      c.set('total_unidades', qtdBlocos * unidadesPorBloco)
      c.set('prefixo_bloco', prefixoBloco)
      e.app.save(c)
    }
  } catch (err) {
    console.log('Erro ao atualizar configuracoes:', err)
  }

  // Gravar auditoria
  try {
    registrarAuditoria(e.app, {
      evento: 'autenticacao_concluida', // ou evento administrativo
      fator:
        'Admin ' +
        authRecord.getString('name') +
        ' regenerou unidades: ' +
        criadasCount +
        ' criadas, ' +
        preservadasCount +
        ' preservadas (Total: ' +
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
