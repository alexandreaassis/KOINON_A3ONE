migrate(
  (app) => {
    // 1. Adicionar campo 'regra_locatario' na collection 'itens_pauta'
    const itensCol = app.findCollectionByNameOrId('itens_pauta')
    if (!itensCol.fields.getByName('regra_locatario')) {
      itensCol.fields.add(
        new SelectField({
          name: 'regra_locatario',
          values: ['somente_proprietario', 'morador_substitui_ausente', 'morador_vota_sempre'],
          maxSelect: 1,
        }),
      )
      app.save(itensCol)
    }

    // 2. Adicionar campos 'vinculo_votante' e 'regra_aplicada' na collection 'cedulas' para auditoria detalhada
    const cedulasCol = app.findCollectionByNameOrId('cedulas')
    let saveCedulas = false
    if (!cedulasCol.fields.getByName('vinculo_votante')) {
      cedulasCol.fields.add(
        new SelectField({
          name: 'vinculo_votante',
          values: ['proprietario', 'condomino', 'locatario'],
          maxSelect: 1,
        }),
      )
      saveCedulas = true
    }
    if (!cedulasCol.fields.getByName('regra_aplicada')) {
      cedulasCol.fields.add(
        new TextField({
          name: 'regra_aplicada',
        }),
      )
      saveCedulas = true
    }
    if (saveCedulas) {
      app.save(cedulasCol)
    }

    // 3. Adicionar valores 'condomino' e 'morador' em tipo_vinculo de 'credenciamentos' se necessário
    const credCol = app.findCollectionByNameOrId('credenciamentos')
    const tipoVinculoField = credCol.fields.getByName('tipo_vinculo')
    if (tipoVinculoField) {
      // Garantir que contenha proprietario, condomino, locatario, promitente, usufrutuario, procurador
      const vals = tipoVinculoField.values || []
      let mudou = false
      if (!vals.includes('condomino')) {
        vals.push('condomino')
        mudou = true
      }
      if (mudou) {
        tipoVinculoField.values = vals
        tipoVinculoField.maxSelect = vals.length
        app.save(credCol)
      }
    }

    // 4. Criar collection 'cadastros_unidade'
    // Representa o cadastro formal de pessoas por unidade (Proprietário, Condômino ou Locatário)
    // Cada unidade pode ter até 2 vínculos ativos simultâneos: PROPRIETÁRIO (não mora) e MORADOR (condômino ou locatário).
    const unidadesCol = app.findCollectionByNameOrId('unidades')
    try {
      app.findCollectionByNameOrId('cadastros_unidade')
    } catch (_) {
      const cadastrosCol = new Collection({
        name: 'cadastros_unidade',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.role = 'admin' || @request.auth.role = 'mesa'",
        updateRule: "@request.auth.role = 'admin' || @request.auth.role = 'mesa'",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
          {
            name: 'unidade',
            type: 'relation',
            required: true,
            collectionId: unidadesCol.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          { name: 'nome', type: 'text', required: true },
          { name: 'cpf', type: 'text', required: true },
          { name: 'email', type: 'email' },
          { name: 'telefone', type: 'text' },
          {
            name: 'vinculo',
            type: 'select',
            required: true,
            values: ['proprietario', 'condomino', 'locatario'],
            maxSelect: 1,
          },
          { name: 'ativo', type: 'bool' },
          { name: 'observacoes', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_cadastros_unidade ON cadastros_unidade (unidade)',
          'CREATE INDEX idx_cadastros_cpf ON cadastros_unidade (cpf)',
          'CREATE INDEX idx_cadastros_vinculo ON cadastros_unidade (vinculo)',
        ],
      })
      app.save(cadastrosCol)
    }

    // 5. Backfill/Mapeamento inicial seguro para itens_pauta existentes:
    // Se 'regra_locatario' estiver vazia, herda da deliberacao correspondente:
    // se deliberacao.locatario_pode_votar === true -> 'morador_vota_sempre'
    // se deliberacao.locatario_pode_votar === false -> 'somente_proprietario'
    try {
      app
        .db()
        .newQuery(`
      UPDATE itens_pauta
      SET regra_locatario = (
        CASE
          WHEN (SELECT locatario_pode_votar FROM deliberacoes WHERE deliberacoes.id = itens_pauta.deliberacao) = 1
          THEN 'morador_vota_sempre'
          ELSE 'somente_proprietario'
        END
      )
      WHERE regra_locatario IS NULL OR regra_locatario = ''
    `)
        .execute()
    } catch (err) {
      console.log('Aviso ao inicializar regra_locatario em itens_pauta:', err)
    }
  },
  (app) => {
    try {
      const cadCol = app.findCollectionByNameOrId('cadastros_unidade')
      app.delete(cadCol)
    } catch (_) {}
  },
)
