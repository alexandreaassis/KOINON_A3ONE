/**
 * FASE 2 — Parametrização leve e prova de envio da convocação.
 * Migration 0040 — novos campos modelados, sem tocar em dados existentes.
 *
 * - `configuracoes`: parâmetros da organização (multi-organização futuro),
 *   campo `organization_id` já nascendo no modelo (trava da 2ª organização),
 *   e a trava lógica `segunda_organizacao_bloqueada`.
 * - `notificacoes`: prova de envio — canal, destinatário, payload e status de entrega.
 * - `deliberacoes`: hash do edital enviado.
 * - `organizacoes`: modelo já nascendo multi-organização, criada vazia se ausente.
 *
 * RESTRIÇÃO PERMANENTE: migration só ADICIONA campos — não reescreve editais
 * nem altera assembleias já convocadas.
 */
migrate(
  (app) => {
    // ---------------------------------------------------------------
    // configuracoes — parametrização da organização + trava multi-tenant
    // ---------------------------------------------------------------
    const configuracoes = app.findCollectionByNameOrId('configuracoes')

    const addSeAusente = (col, campo) => {
      if (!col.fields.getByName(campo.name)) {
        col.fields.add(campo)
      }
    }

    // Campo da organização (nativo da Fase 2D — trava da segunda organização)
    addSeAusente(configuracoes, new TextField({ name: 'organization_id', max: 64 }))

    // Tipo de organização: condominio | associacao | outro
    addSeAusente(
      configuracoes,
      new SelectField({
        name: 'tipo_organizacao',
        maxSelect: 1,
        values: ['condominio', 'associacao', 'outro'],
      }),
    )

    // Cargo do signatário
    addSeAusente(configuracoes, new TextField({ name: 'cargo_signatario', max: 80 }))

    // Documento normativo da organização (Convenção / Estatuto / etc.)
    addSeAusente(configuracoes, new TextField({ name: 'nome_documento_normativo', max: 120 }))
    addSeAusente(configuracoes, new TextField({ name: 'artigo_documento_normativo', max: 200 }))

    // Citação legal (configurável por tipo de organização)
    addSeAusente(configuracoes, new TextField({ name: 'citacao_legal_assembleia', max: 250 }))

    // Prazo mínimo de antecedência da convocação
    addSeAusente(
      configuracoes,
      new NumberField({ name: 'prazo_minimo_convocacao_dias', onlyInt: true }),
    )

    // Regra de procuração: firma reconhecida/eletrônica avançada | simples
    addSeAusente(
      configuracoes,
      new SelectField({
        name: 'regra_procuracao',
        maxSelect: 1,
        values: ['firma_ou_eletronica_avancada', 'procuracao_simples'],
      }),
    )

    // Link público de verificação do documento assinado (preparado para a Fase 3)
    addSeAusente(configuracoes, new URLField({ name: 'link_verificacao_assinatura' }))

    // Cláusula de aceite do método — versão, status e texto
    addSeAusente(configuracoes, new NumberField({ name: 'clausula_aceite_versao', onlyInt: true }))
    addSeAusente(
      configuracoes,
      new SelectField({
        name: 'clausula_aceite_status',
        maxSelect: 1,
        values: ['rascunho_aprovado_mesa', 'incorporada_normativo'],
      }),
    )
    addSeAusente(configuracoes, new TextField({ name: 'clausula_aceite_texto', max: 20000 }))

    // Instruções de acesso e votação eletrônica do edital
    addSeAusente(configuracoes, new JSONField({ name: 'instrucoes_acesso', maxSize: 2000000 }))

    // Trava lógica da segunda organização (Fase 2D)
    addSeAusente(configuracoes, new BoolField({ name: 'segunda_organizacao_bloqueada' }))

    app.save(configuracoes)

    // ---------------------------------------------------------------
    // notificacoes — prova de envio da convocação
    // ---------------------------------------------------------------
    const notificacoes = app.findCollectionByNameOrId('notificacoes')

    addSeAusente(notificacoes, new TextField({ name: 'prova_canal', max: 32 }))
    addSeAusente(notificacoes, new TextField({ name: 'prova_status', max: 32 }))
    addSeAusente(notificacoes, new DateField({ name: 'prova_data_hora' }))
    addSeAusente(notificacoes, new TextField({ name: 'prova_hash_documento', max: 128 }))
    addSeAusente(notificacoes, new JSONField({ name: 'prova_payload', maxSize: 2000000 }))
    addSeAusente(notificacoes, new TextField({ name: 'prova_deliberacao', max: 64 }))

    app.save(notificacoes)

    // ---------------------------------------------------------------
    // deliberacoes — hash do edital enviado (prova de envio, Fase 2C)
    // ---------------------------------------------------------------
    const deliberacoes = app.findCollectionByNameOrId('deliberacoes')
    addSeAusente(deliberacoes, new TextField({ name: 'hash_edital_enviado', max: 128 }))
    app.save(deliberacoes)

    // ---------------------------------------------------------------
    // organizacoes — modelo já nascendo multi-organização (Fase 2D):
    // cadastro/ativação de nova organização fica BLOQUEADO até isolamento
    // verificado e credenciais externas cifradas por organização.
    // ---------------------------------------------------------------
    let organizacoes = null
    try {
      organizacoes = app.findCollectionByNameOrId('organizacoes')
    } catch (_) {
      // coleção ainda não existe — criamos agora, vazia.
      const col = new Collection({
        name: 'organizacoes',
        type: 'base',
        listRule:
          "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'mesa')",
        viewRule:
          "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'mesa')",
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
          { name: 'nome', type: 'text', required: true, max: 160 },
          {
            name: 'tipo',
            type: 'select',
            required: true,
            maxSelect: 1,
            values: ['condominio', 'associacao', 'outro'],
          },
          { name: 'organization_id', type: 'text', required: true, max: 64 },
          { name: 'ativa', type: 'bool' },
          { name: 'isolamento_verificado', type: 'bool' },
          { name: 'bloqueada_motivo', type: 'text', max: 300 },
          { name: 'credenciais_externas_cifradas', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_organizacoes_organization_id ON organizacoes (organization_id)',
        ],
      })
      app.save(col)
    }
  },
  (app) => {
    // Rollback — remove apenas o que esta migration criou.
    try {
      const organizacoes = app.findCollectionByNameOrId('organizacoes')
      app.delete(organizacoes)
    } catch (_) {
      // coleção ainda não existia — nada a reverter.
    }

    const configuracoes = app.findCollectionByNameOrId('configuracoes')
    const camposConfig = [
      'organization_id',
      'tipo_organizacao',
      'cargo_signatario',
      'nome_documento_normativo',
      'artigo_documento_normativo',
      'citacao_legal_assembleia',
      'prazo_minimo_convocacao_dias',
      'regra_procuracao',
      'link_verificacao_assinatura',
      'clausula_aceite_versao',
      'clausula_aceite_status',
      'clausula_aceite_texto',
      'instrucoes_acesso',
      'segunda_organizacao_bloqueada',
    ]
    for (const nome of camposConfig) {
      if (configuracoes.fields.getByName(nome)) {
        configuracoes.fields.removeByName(nome)
      }
    }
    app.save(configuracoes)

    const notificacoes = app.findCollectionByNameOrId('notificacoes')
    for (const nome of [
      'prova_canal',
      'prova_status',
      'prova_data_hora',
      'prova_hash_documento',
      'prova_payload',
      'prova_deliberacao',
    ]) {
      if (notificacoes.fields.getByName(nome)) {
        notificacoes.fields.removeByName(nome)
      }
    }
    app.save(notificacoes)

    const deliberacoes = app.findCollectionByNameOrId('deliberacoes')
    if (deliberacoes.fields.getByName('hash_edital_enviado')) {
      deliberacoes.fields.removeByName('hash_edital_enviado')
      app.save(deliberacoes)
    }
  },
)
