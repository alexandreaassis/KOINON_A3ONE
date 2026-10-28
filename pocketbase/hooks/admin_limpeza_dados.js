/**
 * Hook admin_limpeza_dados.js
 * Limpeza segura e idempotente de todos os dados de teste do sistema Koinon,
 * preservando estritamente os usuários e as configurações de infraestrutura.
 *
 * Endpoint:
 * POST /backend/v1/admin/limpar-dados
 *
 * Regras:
 * - Apenas administradores autenticados (role === 'admin')
 * - NÃO apagar: users, _superusers, configuracoes_backend
 * - Apagar dados de negócio respeitando ordem de dependência (filhas antes de mães):
 *   1. cedulas
 *   2. comprovantes
 *   3. comparecimentos
 *   4. presencas
 *   5. presencas_assinatura
 *   6. sessoes
 *   7. assinaturas_documento
 *   8. documentos_pauta
 *   9. editais_deliberacao
 *   10. atas_assembleia
 *   11. notificacoes
 *   12. itens_pauta
 *   13. deliberacoes
 *   14. credenciamentos
 *   15. cadastros_unidade
 *   16. auditoria_events
 *   17. logs_acesso
 *   18. unidades (desvinculando previamente os usuários)
 * - Atualizar configuracoes (total_unidades = 0) mantendo a linha intacta
 * - Idempotente: funciona mesmo se qualquer collection já estiver vazia
 * - Retorna lista detalhada de collections limpas com quantidades
 */

routerAdd('POST', '/backend/v1/admin/limpar-dados', (e) => {
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
    return e.json(403, {
      success: false,
      message: 'Acesso não autenticado.',
    })
  }

  const operadorRole = operador.getString('role')
  if (operadorRole !== 'admin') {
    return e.json(403, {
      success: false,
      message: 'Acesso restrito exclusivamente ao perfil de administrador.',
    })
  }

  // Lista de collections de dados a limpar em ordem estrita de dependência
  const collectionsParaLimpar = [
    { name: 'cedulas', label: 'Cédulas de Votação' },
    { name: 'comprovantes', label: 'Comprovantes de Votação' },
    { name: 'comparecimentos', label: 'Registros de Comparecimento' },
    { name: 'presencas', label: 'Lista de Presença Eletrônica' },
    { name: 'presencas_assinatura', label: 'Presenças com Assinatura e Procurações' },
    { name: 'sessoes', label: 'Sessões e Tokens de Voto' },
    { name: 'assinaturas_documento', label: 'Assinaturas de Documentos' },
    { name: 'documentos_pauta', label: 'Documentos da Pauta' },
    { name: 'editais_deliberacao', label: 'Editais Convocatórios' },
    { name: 'atas_assembleia', label: 'Minutas e Atas de Assembleia' },
    { name: 'notificacoes', label: 'Notificações e E-mails' },
    { name: 'itens_pauta', label: 'Itens de Pauta das Deliberações' },
    { name: 'deliberacoes', label: 'Assembleias e Deliberações' },
    { name: 'credenciamentos', label: 'Solicitações de Credenciamento' },
    { name: 'cadastros_unidade', label: 'Cadastros de Condôminos por Unidade' },
    { name: 'auditoria_events', label: 'Trilha de Auditoria e Eventos' },
    { name: 'logs_acesso', label: 'Histórico de Logs de Acesso' },
    { name: 'unidades', label: 'Unidades do Condomínio' },
  ]

  const resumo = []
  let totalGeral = 0

  try {
    // 1. Desvincular com segurança referências de unidade dos usuários antes de limpar unidades
    try {
      const usersComUnidade = e.app.findRecordsByFilter('users', 'unidade != ""', '', 2000, 0)
      for (let i = 0; i < usersComUnidade.length; i++) {
        const u = usersComUnidade[i]
        u.set('unidade', '')
        e.app.save(u)
      }
    } catch (uErr) {
      console.log('Aviso ao desvincular unidades dos usuários:', uErr)
    }

    // 2. Apagar registros de cada collection mantendo idempotência
    for (let c = 0; c < collectionsParaLimpar.length; c++) {
      const item = collectionsParaLimpar[c]
      let removidosNaCol = 0

      try {
        if (e.app.hasTable(item.name)) {
          // Processar em lotes para apagar também arquivos vinculados do sistema de arquivos
          let continuar = true
          while (continuar) {
            const records = e.app.findRecordsByFilter(item.name, '', '', 300, 0)
            if (!records || records.length === 0) {
              continuar = false
              break
            }
            for (let r = 0; r < records.length; r++) {
              try {
                e.app.delete(records[r])
                removidosNaCol++
              } catch (delErr) {
                console.log('Aviso ao deletar registro na collection ' + item.name + ':', delErr)
              }
            }
            // Se o lote veio menor que 300, acabou
            if (records.length < 300) {
              continuar = false
            }
          }
        }
      } catch (colErr) {
        console.log('Aviso ao processar collection ' + item.name + ':', colErr)
      }

      resumo.push({
        collection: item.name,
        label: item.label,
        removidos: removidosNaCol,
      })
      totalGeral += removidosNaCol
    }

    // 3. Atualizar a collection configuracoes para refletir 0 unidades sem apagar a linha de configuração
    try {
      if (e.app.hasTable('configuracoes')) {
        const configs = e.app.findRecordsByFilter('configuracoes', '', '-created', 1, 0)
        if (configs && configs.length > 0) {
          const cfg = configs[0]
          cfg.set('total_unidades', 0)
          e.app.save(cfg)
        }
      }
    } catch (cfgErr) {
      console.log('Aviso ao atualizar configuracoes:', cfgErr)
    }

    return e.json(200, {
      success: true,
      message:
        'Limpeza de dados concluída com sucesso. Os usuários cadastrados foram integralmente preservados.',
      totalRemovidos: totalGeral,
      detalhes: resumo,
    })
  } catch (erroGeral) {
    console.log('Erro geral na limpeza de dados:', erroGeral)
    return e.json(500, {
      success: false,
      message: 'Ocorreu uma instabilidade ao executar a limpeza de dados. Tente novamente.',
      error: String(erroGeral),
    })
  }
})
