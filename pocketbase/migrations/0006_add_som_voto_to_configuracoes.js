migrate(
  (app) => {
    const configuracoes = app.findCollectionByNameOrId('configuracoes')

    if (!configuracoes.fields.getByName('som_voto')) {
      configuracoes.fields.add(
        new FileField({
          name: 'som_voto',
          maxSelect: 1,
          maxSize: 10485760, // 10MB
          mimeTypes: [
            'audio/mpeg',
            'audio/mp3',
            'audio/ogg',
            'audio/wav',
            'audio/x-wav',
            'audio/wave',
            'audio/x-pn-wav',
            'audio/webm',
          ],
        }),
      )
      app.save(configuracoes)
    }
  },
  (app) => {
    try {
      const configuracoes = app.findCollectionByNameOrId('configuracoes')
      if (configuracoes.fields.getByName('som_voto')) {
        configuracoes.fields.removeByName('som_voto')
        app.save(configuracoes)
      }
    } catch (_) {}
  },
)
