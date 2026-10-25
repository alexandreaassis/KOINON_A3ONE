migrate(
  (app) => {
    // 1. Atualizar SelectField 'evento' em auditoria_events para suportar novos tipos administrativos
    const audCol = app.findCollectionByNameOrId('auditoria_events')
    const eventoField = audCol.fields.getByName('evento')
    if (eventoField) {
      const novosValores = [
        'credenciamento_submetido',
        'vinculo_aprovado',
        'vinculo_rejeitado',
        'otp_enviado',
        'otp_validado',
        'otp_falhou',
        'autenticacao_concluida',
        'token_emitido',
        'cedula_registrada',
        'assembleia_aberta',
        'assembleia_encerrada',
        'apuracao_concluida',
        'resultado_publicado',
        'malha_unidades_gerada',
        'unidade_avulsa_criada',
        'configuracao_atualizada',
        'usuario_gerenciado',
      ]
      eventoField.values = novosValores
      eventoField.maxSelect = 1
      app.save(audCol)
    }

    // 2. Corrigir eventos de auditoria passados que registraram 'autenticacao_concluida' em ações administrativas
    try {
      app
        .db()
        .newQuery(
          "UPDATE auditoria_events SET evento = 'malha_unidades_gerada' WHERE evento = 'autenticacao_concluida' AND fator LIKE '%regenerou malha%'",
        )
        .execute()
      app
        .db()
        .newQuery(
          "UPDATE auditoria_events SET evento = 'configuracao_atualizada' WHERE evento = 'autenticacao_concluida' AND fator LIKE '%atualizou configurações%'",
        )
        .execute()
      app
        .db()
        .newQuery(
          "UPDATE auditoria_events SET evento = 'unidade_avulsa_criada' WHERE evento = 'autenticacao_concluida' AND fator LIKE '%cadastrou unidade avulsa%'",
        )
        .execute()
    } catch (e) {
      console.log('Aviso ao normalizar eventos antigos de auditoria:', e)
    }

    // 3. Limpeza dos dados de teste:
    // Remover a deliberação de exemplo do seed se ela não possuir votos/cédulas reais vinculados
    try {
      const delibSeed = app.findRecordsByFilter(
        'deliberacoes',
        "titulo = 'Assembleia Geral Extraordinária 2025/1 — Lago Azul'",
        '',
        1,
        0,
      )
      if (delibSeed && delibSeed.length > 0) {
        const dId = delibSeed[0].id
        const cedulas = app.findRecordsByFilter('cedulas', 'deliberacao = {:delib}', '', 1, 0, {
          delib: dId,
        })
        const presencas = app.findRecordsByFilter('presencas', 'deliberacao = {:delib}', '', 1, 0, {
          delib: dId,
        })
        if (cedulas.length === 0 && presencas.length === 0) {
          // Remover itens de pauta da deliberação seed
          const itens = app.findRecordsByFilter(
            'itens_pauta',
            'deliberacao = {:delib}',
            '',
            100,
            0,
            { delib: dId },
          )
          for (let it of itens) {
            app.delete(it)
          }
          app.delete(delibSeed[0])
        }
      }
    } catch (e) {
      console.log('Aviso ao limpar deliberação de teste:', e)
    }

    // 4. Desativar unidades antigas que NÃO possuem credenciamento, presença ou voto
    // Unidades legítimas que possuem vínculos eleitorais (ex: ykz5of1x2d2eqkh / 101A) permanecem intocadas.
    try {
      app
        .db()
        .newQuery(
          `UPDATE unidades 
           SET ativo = 0 
           WHERE ativo = 1 
             AND id NOT IN (
               SELECT DISTINCT unidade FROM credenciamentos WHERE unidade IS NOT NULL
             )
             AND id NOT IN (
               SELECT DISTINCT unidade FROM presencas WHERE unidade IS NOT NULL
             )
             AND id NOT IN (
               SELECT DISTINCT unidade FROM comparecimentos WHERE unidade IS NOT NULL
             )
             AND id NOT IN (
               SELECT DISTINCT unidade FROM comprovantes WHERE unidade IS NOT NULL
             )
             AND id NOT IN (
               SELECT DISTINCT unidade FROM sessoes WHERE unidade IS NOT NULL
             )
             AND identificador GLOB '*[A-Za-z]'`,
        )
        .execute()
    } catch (e) {
      console.log('Aviso ao desativar unidades legadas:', e)
    }

    // Corrigir rótulo de bloco nas 52 unidades ativas criadas com prefixo "."
    try {
      app
        .db()
        .newQuery(
          "UPDATE unidades SET bloco = 'Torre' WHERE bloco = '. A' OR bloco = '.' OR bloco = 'Torre A'",
        )
        .execute()
    } catch (e) {
      console.log('Aviso ao normalizar rótulos de bloco:', e)
    }

    // 5. Corrigir prefixo_bloco e total_unidades em configuracoes
    try {
      const configs = app.findRecordsByFilter('configuracoes', '', '-created', 1, 0)
      if (configs && configs.length > 0) {
        const c = configs[0]
        const pBloco = (c.getString('prefixo_bloco') || '').trim()
        if (pBloco === '.' || pBloco === '') {
          c.set('prefixo_bloco', 'Torre')
        }

        // Normalizar grupos_config se houver prefixo_bloco '.'
        const gruposStr = c.getString('grupos_config')
        if (gruposStr) {
          try {
            const parsed = JSON.parse(gruposStr)
            if (Array.isArray(parsed)) {
              let alterou = false
              for (let g of parsed) {
                if (g.prefixo_bloco === '.' || !g.prefixo_bloco) {
                  g.prefixo_bloco = 'Torre'
                  alterou = true
                }
              }
              if (alterou) {
                c.set('grupos_config', JSON.stringify(parsed))
              }
            }
          } catch (_) {}
        }

        // Contar total de unidades ativas
        const ativas = app.findRecordsByFilter('unidades', 'ativo = true', '', 2000, 0)
        c.set('total_unidades', ativas.length)
        app.save(c)
      }
    } catch (e) {
      console.log('Aviso ao atualizar configuracoes:', e)
    }
  },
  (app) => {
    // Reverter modificações se necessário
  },
)
