/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 0051 — Modelos de mensagem (WhatsApp/e-mail) editáveis pela mesa.
 *
 * Guarda os modelos como texto plano em 4 campos novos da collection
 * `configuracoes` (mesma casa dos demais parâmetros da organização; o
 * grupos_config da convenção é um array e não é tocado). Campos vazios =
 * mesa ainda não personalizou — o front cai no texto pronto histórico.
 */
migrate(
  (app) => {
    const configuracoes = app.findCollectionByNameOrId('configuracoes')
    if (!configuracoes) {
      throw new Error('Collection configuracoes não encontrada (migration 0051)')
    }

    const addSeAusente = (campo) => {
      if (!configuracoes.fields.getByName(campo.name)) {
        configuracoes.fields.add(campo)
      }
    }

    addSeAusente(new TextField({ name: 'modelo_wa_cadastro_aprovado', max: 2000 }))
    addSeAusente(new TextField({ name: 'modelo_wa_ata_publicada', max: 2000 }))
    addSeAusente(new TextField({ name: 'modelo_email_cadastro_aprovado', max: 2000 }))
    addSeAusente(new TextField({ name: 'modelo_email_ata_publicada', max: 2000 }))

    app.save(configuracoes)
  },
  (app) => {
    try {
      const configuracoes = app.findCollectionByNameOrId('configuracoes')
      if (configuracoes) {
        const nomes = [
          'modelo_wa_cadastro_aprovado',
          'modelo_wa_ata_publicada',
          'modelo_email_cadastro_aprovado',
          'modelo_email_ata_publicada',
        ]
        for (const n of nomes) {
          configuracoes.fields.removeByName(n)
        }
        app.save(configuracoes)
      }
    } catch (err) {
      console.log('Erro no rollback da migração 0051:', err)
    }
  },
)
