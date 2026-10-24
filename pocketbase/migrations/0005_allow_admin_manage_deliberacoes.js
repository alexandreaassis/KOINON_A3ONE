migrate(
  (app) => {
    // 1. Atualizar regras da collection deliberacoes
    const deliberacoes = app.findCollectionByNameOrId('deliberacoes')
    deliberacoes.listRule = "@request.auth.id != ''"
    deliberacoes.viewRule = "@request.auth.id != ''"
    deliberacoes.createRule =
      "@request.auth.id != '' && (@request.auth.role = 'mesa' || @request.auth.role = 'admin')"
    deliberacoes.updateRule =
      "@request.auth.id != '' && (@request.auth.role = 'mesa' || @request.auth.role = 'admin')"
    deliberacoes.deleteRule =
      "@request.auth.id != '' && (@request.auth.role = 'mesa' || @request.auth.role = 'admin')"
    app.save(deliberacoes)

    // 2. Atualizar regras da collection itens_pauta
    const itensPauta = app.findCollectionByNameOrId('itens_pauta')
    itensPauta.listRule = "@request.auth.id != ''"
    itensPauta.viewRule = "@request.auth.id != ''"
    itensPauta.createRule =
      "@request.auth.id != '' && (@request.auth.role = 'mesa' || @request.auth.role = 'admin')"
    itensPauta.updateRule =
      "@request.auth.id != '' && (@request.auth.role = 'mesa' || @request.auth.role = 'admin')"
    itensPauta.deleteRule =
      "@request.auth.id != '' && (@request.auth.role = 'mesa' || @request.auth.role = 'admin')"
    app.save(itensPauta)

    // 3. Atualizar regras da collection presencas
    const presencas = app.findCollectionByNameOrId('presencas')
    presencas.listRule = "@request.auth.id != ''"
    presencas.viewRule = "@request.auth.id != ''"
    presencas.createRule =
      "@request.auth.id != '' && (@request.auth.role = 'mesa' || @request.auth.role = 'admin')"
    presencas.updateRule =
      "@request.auth.id != '' && (@request.auth.role = 'mesa' || @request.auth.role = 'admin')"
    presencas.deleteRule =
      "@request.auth.id != '' && (@request.auth.role = 'mesa' || @request.auth.role = 'admin')"
    app.save(presencas)

    // 4. Atualizar regras da collection credenciamentos
    const credenciamentos = app.findCollectionByNameOrId('credenciamentos')
    credenciamentos.updateRule =
      "@request.auth.id != '' && (@request.auth.role = 'mesa' || @request.auth.role = 'admin')"
    credenciamentos.deleteRule =
      "@request.auth.id != '' && (@request.auth.role = 'mesa' || @request.auth.role = 'admin')"
    app.save(credenciamentos)

    // 5. Atualizar regras da collection unidades
    const unidades = app.findCollectionByNameOrId('unidades')
    unidades.createRule =
      "@request.auth.id != '' && (@request.auth.role = 'mesa' || @request.auth.role = 'admin')"
    unidades.updateRule =
      "@request.auth.id != '' && (@request.auth.role = 'mesa' || @request.auth.role = 'admin')"
    unidades.deleteRule =
      "@request.auth.id != '' && (@request.auth.role = 'mesa' || @request.auth.role = 'admin')"
    app.save(unidades)

    // 6. Atualizar regras da collection sessoes
    const sessoes = app.findCollectionByNameOrId('sessoes')
    sessoes.deleteRule =
      "@request.auth.id != '' && (@request.auth.role = 'mesa' || @request.auth.role = 'admin')"
    app.save(sessoes)
  },
  (app) => {
    const revertRules = (colName, hasCreate) => {
      try {
        const col = app.findCollectionByNameOrId(colName)
        if (hasCreate) {
          col.createRule = "@request.auth.id != '' && @request.auth.role = 'mesa'"
        }
        col.updateRule = "@request.auth.id != '' && @request.auth.role = 'mesa'"
        col.deleteRule = "@request.auth.id != '' && @request.auth.role = 'mesa'"
        app.save(col)
      } catch (_) {}
    }

    revertRules('deliberacoes', true)
    revertRules('itens_pauta', true)
    revertRules('presencas', true)
    revertRules('unidades', true)

    try {
      const cred = app.findCollectionByNameOrId('credenciamentos')
      cred.updateRule = "@request.auth.id != '' && @request.auth.role = 'mesa'"
      cred.deleteRule = "@request.auth.id != '' && @request.auth.role = 'mesa'"
      app.save(cred)
    } catch (_) {}

    try {
      const sess = app.findCollectionByNameOrId('sessoes')
      sess.deleteRule = "@request.auth.id != '' && @request.auth.role = 'mesa'"
      app.save(sess)
    } catch (_) {}
  },
)
