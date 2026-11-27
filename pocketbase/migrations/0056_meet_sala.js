/// <reference path="../pb_data/types.d.ts" />

/**
 * Fase 1 da integração Google Meet — campos na deliberação (assembleia ativa):
 * - meet_link: link público meet.google.com/xxx-xxxx-xxx exibido e compartilhado pela mesa
 * - meet_space_name: identificador do espaço na API do Meet (ex.: spaces/jQCFfuBOdN5z)
 * - meet_criado_em: data/hora da criação da sala
 *
 * A credencial (service account JSON) NÃO fica na deliberação: fica cifrada em
 * configuracoes_backend ( GOOGLE_MEET_SA_JSON ), gravada pelo hook
 * /backend/v1/meet/config, no mesmo padrão do token ZapSign e da GROQ_API_KEY.
 */
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('deliberacoes')
    if (col) {
      if (!col.fields.getByName('meet_link')) {
        col.fields.add(new TextField({ name: 'meet_link', max: 500 }))
      }
      if (!col.fields.getByName('meet_space_name')) {
        col.fields.add(new TextField({ name: 'meet_space_name', max: 200 }))
      }
      if (!col.fields.getByName('meet_criado_em')) {
        col.fields.add(new DateField({ name: 'meet_criado_em' }))
      }
      app.save(col)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('deliberacoes')
      if (col) {
        for (let n of ['meet_link', 'meet_space_name', 'meet_criado_em']) {
          col.fields.removeByName(n)
        }
        app.save(col)
      }
    } catch (err) {
      console.log('Erro no rollback da migração 0056 (meet):', err)
    }
  },
)
