/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Criar collection configuracoes_backend com acesso exclusivo server-side (regras nulas)
    let collection
    try {
      collection = app.findCollectionByNameOrId('configuracoes_backend')
    } catch (_) {
      collection = new Collection({
        name: 'configuracoes_backend',
        type: 'base',
        listRule: null,
        viewRule: null,
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
          {
            name: 'chave',
            type: 'text',
            required: true,
          },
          {
            name: 'valor',
            type: 'text',
            required: false,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_configuracoes_backend_chave ON configuracoes_backend (chave)',
        ],
      })
      app.save(collection)
      console.log('Migração 0017: collection configuracoes_backend criada com sucesso.')
    }

    // 2. Gravar registro inicial (chave GROQ_API_KEY) de forma idempotente (upsert)
    const chave = 'GROQ_API_KEY'
    const valor = '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'

    try {
      const existente = app.findFirstRecordByData('configuracoes_backend', 'chave', chave)
      if (existente) {
        existente.set('valor', valor)
        app.save(existente)
        console.log('Migração 0017: chave GROQ_API_KEY atualizada com sucesso.')
      }
    } catch (_) {
      const novoRegistro = new Record(collection)
      novoRegistro.set('chave', chave)
      novoRegistro.set('valor', valor)
      app.save(novoRegistro)
      console.log('Migração 0017: chave GROQ_API_KEY inserida com sucesso.')
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('configuracoes_backend')
      app.delete(col)
    } catch (_) {}
  },
)
