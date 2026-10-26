/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Atualizar limite do campo assinatura_visual na collection assinaturas_documento
    try {
      const colAssinaturas = app.findCollectionByNameOrId('assinaturas_documento')
      if (colAssinaturas) {
        const campoAssinatura = colAssinaturas.fields.getByName('assinatura_visual')
        if (campoAssinatura) {
          campoAssinatura.max = 500000
        } else {
          colAssinaturas.fields.add(
            new TextField({
              name: 'assinatura_visual',
              required: false,
              max: 500000,
            }),
          )
        }
        app.save(colAssinaturas)
      }
    } catch (err) {
      console.log('Aviso ao migrar limite de assinatura_visual em assinaturas_documento:', err)
    }

    // 2. Atualizar limite do campo assinatura_visual na collection editais_deliberacao
    try {
      const colEditais = app.findCollectionByNameOrId('editais_deliberacao')
      if (colEditais) {
        const campoAssinatura = colEditais.fields.getByName('assinatura_visual')
        if (campoAssinatura) {
          campoAssinatura.max = 500000
        } else {
          colEditais.fields.add(
            new TextField({
              name: 'assinatura_visual',
              required: false,
              max: 500000,
            }),
          )
        }
        app.save(colEditais)
      }
    } catch (err) {
      console.log('Aviso ao migrar limite de assinatura_visual em editais_deliberacao:', err)
    }

    // 3. Atualizar limite do campo assinatura_visual na collection presencas_assinatura
    try {
      const colPresencas = app.findCollectionByNameOrId('presencas_assinatura')
      if (colPresencas) {
        const campoAssinatura = colPresencas.fields.getByName('assinatura_visual')
        if (campoAssinatura) {
          campoAssinatura.max = 500000
        } else {
          colPresencas.fields.add(
            new TextField({
              name: 'assinatura_visual',
              required: false,
              max: 500000,
            }),
          )
        }
        app.save(colPresencas)
      }
    } catch (err) {
      console.log('Aviso ao migrar limite de assinatura_visual em presencas_assinatura:', err)
    }
  },
  (app) => {
    // Reverter para 5000 se necessário
    const colecoes = ['assinaturas_documento', 'editais_deliberacao', 'presencas_assinatura']
    for (let i = 0; i < colecoes.length; i++) {
      try {
        const col = app.findCollectionByNameOrId(colecoes[i])
        if (col) {
          const campo = col.fields.getByName('assinatura_visual')
          if (campo) {
            campo.max = 5000
            app.save(col)
          }
        }
      } catch (_) {}
    }
  },
)
