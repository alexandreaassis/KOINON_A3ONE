/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const configCol = app.findCollectionByNameOrId('configuracoes')

    if (!configCol.fields.getByName('email_oficial')) {
      configCol.fields.add(
        new TextField({
          name: 'email_oficial',
        }),
      )
    }

    if (!configCol.fields.getByName('nome_remetente')) {
      configCol.fields.add(
        new TextField({
          name: 'nome_remetente',
        }),
      )
    }

    if (!configCol.fields.getByName('whatsapp_oficial')) {
      configCol.fields.add(
        new TextField({
          name: 'whatsapp_oficial',
        }),
      )
    }

    if (!configCol.fields.getByName('smtp_host')) {
      configCol.fields.add(
        new TextField({
          name: 'smtp_host',
        }),
      )
    }

    if (!configCol.fields.getByName('smtp_port')) {
      configCol.fields.add(
        new NumberField({
          name: 'smtp_port',
        }),
      )
    }

    if (!configCol.fields.getByName('smtp_user')) {
      configCol.fields.add(
        new TextField({
          name: 'smtp_user',
        }),
      )
    }

    if (!configCol.fields.getByName('smtp_encryption')) {
      configCol.fields.add(
        new SelectField({
          name: 'smtp_encryption',
          values: ['starttls', 'ssl', 'none'],
          maxSelect: 1,
        }),
      )
    }

    if (!configCol.fields.getByName('smtp_ativo')) {
      configCol.fields.add(
        new BoolField({
          name: 'smtp_ativo',
        }),
      )
    }

    app.save(configCol)
    console.log('Migração 0027: campos de canais de envio adicionados com sucesso.')
  },
  (app) => {
    try {
      const configCol = app.findCollectionByNameOrId('configuracoes')
      const nomes = [
        'email_oficial',
        'nome_remetente',
        'whatsapp_oficial',
        'smtp_host',
        'smtp_port',
        'smtp_user',
        'smtp_encryption',
        'smtp_ativo',
      ]
      for (let i = 0; i < nomes.length; i++) {
        try {
          if (configCol.fields.getByName(nomes[i])) {
            configCol.fields.removeByName(nomes[i])
          }
        } catch (_) {}
      }
      app.save(configCol)
    } catch (_) {}
  },
)
