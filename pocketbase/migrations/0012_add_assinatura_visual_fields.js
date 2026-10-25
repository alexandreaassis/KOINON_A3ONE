/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Atualizar collection assinaturas_documento com campos visuais
    try {
      const colAssinaturas = app.findCollectionByNameOrId('assinaturas_documento')
      if (colAssinaturas) {
        if (!colAssinaturas.fields.getByName('formato_assinatura')) {
          colAssinaturas.fields.add(
            new SelectField({
              name: 'formato_assinatura',
              required: false,
              values: ['desenho', 'texto', 'em_branco'],
            }),
          )
        }
        if (!colAssinaturas.fields.getByName('assinatura_visual')) {
          colAssinaturas.fields.add(
            new TextField({
              name: 'assinatura_visual',
              required: false,
            }),
          )
        }
        if (!colAssinaturas.fields.getByName('assinatura_texto')) {
          colAssinaturas.fields.add(
            new TextField({
              name: 'assinatura_texto',
              required: false,
            }),
          )
        }
        app.save(colAssinaturas)
      }
    } catch (err) {
      console.log('Aviso ao migrar assinaturas_documento:', err)
    }

    // 2. Atualizar collection editais_deliberacao com campos visuais
    try {
      const colEditais = app.findCollectionByNameOrId('editais_deliberacao')
      if (colEditais) {
        if (!colEditais.fields.getByName('formato_assinatura')) {
          colEditais.fields.add(
            new SelectField({
              name: 'formato_assinatura',
              required: false,
              values: ['desenho', 'texto', 'em_branco'],
            }),
          )
        }
        if (!colEditais.fields.getByName('assinatura_visual')) {
          colEditais.fields.add(
            new TextField({
              name: 'assinatura_visual',
              required: false,
            }),
          )
        }
        if (!colEditais.fields.getByName('assinatura_texto')) {
          colEditais.fields.add(
            new TextField({
              name: 'assinatura_texto',
              required: false,
            }),
          )
        }
        app.save(colEditais)
      }
    } catch (err) {
      console.log('Aviso ao migrar editais_deliberacao:', err)
    }

    // 3. Atualizar collection presencas_assinatura com campos visuais
    try {
      const colPresencas = app.findCollectionByNameOrId('presencas_assinatura')
      if (colPresencas) {
        if (!colPresencas.fields.getByName('formato_assinatura')) {
          colPresencas.fields.add(
            new SelectField({
              name: 'formato_assinatura',
              required: false,
              values: ['desenho', 'texto', 'em_branco'],
            }),
          )
        }
        if (!colPresencas.fields.getByName('assinatura_visual')) {
          colPresencas.fields.add(
            new TextField({
              name: 'assinatura_visual',
              required: false,
            }),
          )
        }
        if (!colPresencas.fields.getByName('assinatura_texto')) {
          colPresencas.fields.add(
            new TextField({
              name: 'assinatura_texto',
              required: false,
            }),
          )
        }
        app.save(colPresencas)
      }
    } catch (err) {
      console.log('Aviso ao migrar presencas_assinatura:', err)
    }
  },
  (app) => {
    // Revert
  },
)
