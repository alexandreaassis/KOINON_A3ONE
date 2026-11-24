/// <reference path="../pb_data/types.d.ts" />

/**
 * Saneamento de segredo (0017): a migration original gravava a chave Groq em
 * texto puro dentro do próprio arquivo versionado — o GitHub bloqueou o push
 * (secret scanning). A collection e o registro continuam existindo, mas o
 * VALOR da chave nunca mais fica no repositório:
 *
 * - Regra permanente: a chave GROQ_API_KEY vive APENAS no registro da
 *   collection `configuracoes_backend`, gravado por caminho não versionado
 *   (painel Skip Cloud ou POST /backend/v1/admin/groq/config — hook
 *   groq_config.js, admin autenticado, valor nunca devolvido ao cliente).
 * - Esta migration é idempotente: em cópias novas do projeto, cria o registro
 *   com valor VAZIO (sem segredo); em bases que já têm a chave, PRESERVA o
 *   valor existente (não sobrescreve, não apaga).
 */
migrate(
  (app) => {
    let collection
    try {
      collection = app.findCollectionByNameOrId('configuracoes_backend')
    } catch (_) {
      // Base nova: cria a collection com as mesmas regras nulas da 0017
      collection = new Collection({
        name: 'configuracoes_backend',
        type: 'base',
        listRule: null,
        viewRule: null,
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
          { name: 'chave', type: 'text', required: true },
          { name: 'valor', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_configuracoes_backend_chave ON configuracoes_backend (chave)',
        ],
      })
      app.save(collection)
      console.log('Migração 0047: collection configuracoes_backend criada.')
    }

    // Registro GROQ_API_KEY: cria vazio se não existir; preserva se já existe.
    let registro
    try {
      registro = app.findFirstRecordByData('configuracoes_backend', 'chave', 'GROQ_API_KEY')
    } catch (_) {
      registro = null
    }

    if (!registro) {
      const novo = new Record(collection)
      novo.set('chave', 'GROQ_API_KEY')
      novo.set('valor', '') // preenchida por caminho não versionado (painel/hook admin)
      app.save(novo)
      console.log('Migração 0047: registro GROQ_API_KEY criado com valor vazio.')
    }
    // Se o registro já existe, o valor atual é PRESERVADO (nunca sobrescrito aqui).
  },
  (app) => {
    // Rollback: apenas limpa o valor do registro (a collection permanece).
    try {
      const rec = app.findFirstRecordByData('configuracoes_backend', 'chave', 'GROQ_API_KEY')
      if (rec) {
        rec.set('valor', '')
        app.save(rec)
      }
    } catch (err) {
      console.log('Erro no rollback da migração 0047:', err)
    }
  },
)
