/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const deliberacoesId = app.findCollectionByNameOrId('deliberacoes').id

    // 1. Atualizar auditoria_events com novos tipos de evento para ata
    try {
      const audCol = app.findCollectionByNameOrId('auditoria_events')
      const audEventoField = audCol.fields.getByName('evento')
      if (audEventoField) {
        const eventosAtuais = audEventoField.values || []
        const novosTipos = ['ata_gerada_ia', 'ata_assinada_mesa', 'ata_publicada']
        let alterou = false
        for (let t of novosTipos) {
          if (!eventosAtuais.includes(t)) {
            eventosAtuais.push(t)
            alterou = true
          }
        }
        if (alterou) {
          audEventoField.values = eventosAtuais
          audEventoField.maxSelect = 1
          app.save(audCol)
        }
      }
    } catch (err) {
      console.log('Aviso ao atualizar tipos em auditoria_events:', err)
    }

    // 2. Criar a collection atas_assembleia
    const atasAssembleia = new Collection({
      name: 'atas_assembleia',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule:
        "@request.auth.id != '' && (@request.auth.role = 'mesa' || @request.auth.role = 'admin')",
      updateRule:
        "@request.auth.id != '' && (@request.auth.role = 'mesa' || @request.auth.role = 'admin')",
      deleteRule:
        "@request.auth.id != '' && (@request.auth.role = 'mesa' || @request.auth.role = 'admin')",
      fields: [
        {
          name: 'deliberacao',
          type: 'relation',
          required: true,
          collectionId: deliberacoesId,
          maxSelect: 1,
        },
        { name: 'titulo', type: 'text' },
        { name: 'texto_entrada_bruto', type: 'text', max: 500000 },
        { name: 'conteudo_html', type: 'text', max: 500000 },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['rascunho', 'assinada', 'publicada'],
          maxSelect: 1,
        },
        // Assinatura Presidente da Mesa
        { name: 'presidente_nome', type: 'text' },
        { name: 'presidente_cpf', type: 'text' },
        {
          name: 'presidente_formato',
          type: 'select',
          values: ['desenho', 'texto', 'em_branco'],
          maxSelect: 1,
        },
        { name: 'presidente_assinatura_visual', type: 'text', max: 500000 },
        { name: 'presidente_assinatura_texto', type: 'text' },
        { name: 'presidente_assinado_em', type: 'date' },
        { name: 'presidente_hash', type: 'text' },

        // Assinatura Secretário(a) da Mesa
        { name: 'secretario_nome', type: 'text' },
        { name: 'secretario_cpf', type: 'text' },
        {
          name: 'secretario_formato',
          type: 'select',
          values: ['desenho', 'texto', 'em_branco'],
          maxSelect: 1,
        },
        { name: 'secretario_assinatura_visual', type: 'text', max: 500000 },
        { name: 'secretario_assinatura_texto', type: 'text' },
        { name: 'secretario_assinado_em', type: 'date' },
        { name: 'secretario_hash', type: 'text' },

        // Snapshot do conteúdo assinado e Hash geral
        { name: 'conteudo_assinado_snapshot', type: 'text', max: 500000 },
        { name: 'hash_ata', type: 'text' },
        { name: 'hash_raiz_urna', type: 'text' },
        { name: 'data_publicacao', type: 'date' },

        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_atas_deliberacao ON atas_assembleia (deliberacao)',
        'CREATE INDEX idx_atas_status ON atas_assembleia (status)',
      ],
    })
    app.save(atasAssembleia)

    // 3. Declarar o AGENTE NATIVO DO SKIP CLOUD para redação jurídica da ata de assembleia
    try {
      $ai.agents.define(app, {
        slug: 'redator-ata-assembleia',
        name: 'Redator de Atas Condominiais Votum',
        description:
          'Especialista em redação jurídica formal de atas de assembleias gerais de condomínio edilício no Brasil.',
        systemPrompt:
          'Você é o assistente jurídico e secretário redator oficial do condomínio Lago Azul no sistema Votum. ' +
          'Sua missão é redigir a ATA COMPLETA, SOLENE e FORMAL de Assembleia Geral de Condomínio Edilício, ' +
          'com base no Código Civil Brasileiro (Lei nº 10.406/2002, arts. 1.331 a 1.358-A), na Convenção Condominial ' +
          'e nos dados estruturados da assembleia juntamente com as notas e relatos brutos fornecidos pela mesa diretora.\n\n' +
          'ESTRUTURA OBRIGATÓRIA DA ATA (formato HTML rico e limpo para editor Tiptap):\n' +
          '1. Cabeçalho solene: Data completa por extenso, horário da primeira e segunda convocação, local físico e virtual (Plataforma Votum), identificação precisa do Condomínio Lago Azul e base de convocação pelo Edital publicado.\n' +
          '2. Composição da Mesa Diretora: Identificação nominal e qualificação (nome completo e CPF) do(a) Presidente da Mesa e do(a) Secretário(a) designados.\n' +
          '3. Verificação de Quórum e Lista de Presença: Quantitativo de unidades participantes, quórum apurado, discriminação de presenças físicas presenciais, virtuais remotas e representações outorgadas por procuração.\n' +
          '4. Leitura e Confirmação da Ordem do Dia: Transcrição das matérias constantes do edital de convocação.\n' +
          '5. Discussão e Deliberação dos Itens da Pauta: Para cada item submetido à votação, descrever com fidelidade os debates e manifestações dos condôminos constantes das anotações da mesa, enunciando com clareza a decisão tomada, o quórum aplicável e o RESULTADO NUMÉRICO DA VOTAÇÃO (votos favoráveis, contrários, abstenções e percentuais apurados).\n' +
          '6. Referência expressa à integridade criptográfica da Urna Eletrônica Votum: Citar expressamente no corpo da ata a garantia do sigilo e o Hash Raiz SHA-256 consolidado da urna auditada.\n' +
          '7. Disposições Finais e Encerramento: Horário do encerramento da sessão, determinação da lavratura da presente ata por mim, Secretário(a), e assinatura conjunta com o Presidente da Mesa.\n\n' +
          'DIRETRIZES DE ESTILO:\n' +
          '- Use tags HTML semânticas adequadas: <h3>, <h4>, <p>, <ul>, <li>, <strong>, <em>.\n' +
          '- Redação em tom jurídico, imparcial, formal e sem abreviações informais.\n' +
          '- Números importantes e datas devem ser grafados por extenso e em algarismos (ex: "aos vinte e cinco dias do mês de março de dois mil e vinte e seis (25/03/2026)").\n' +
          '- NÃO invente resultados de votação discrepantes dos dados estruturados fornecidos.\n' +
          '- Retorne APENAS o HTML da ata, pronto para ser renderizado no editor, sem blocos ```html ou explicações antes ou depois.',
        tier: 'fast',
        tools: [
          { collection: 'deliberacoes', perms: { read: true, list: true } },
          { collection: 'itens_pauta', perms: { read: true, list: true } },
          { collection: 'presencas', perms: { read: true, list: true } },
          { collection: 'presencas_assinatura', perms: { read: true, list: true } },
          { collection: 'editais_deliberacao', perms: { read: true, list: true } },
          { collection: 'configuracoes', perms: { read: true, list: true } },
        ],
        memory: [
          {
            type: 'text',
            payload: {
              text:
                'Modelo Padrão de Ata de Assembleia Geral Condominial (Código Civil arts. 1.331-1.358):\n' +
                'A ata deve conter necessariamente: identificação do condomínio, dia, mês, ano e hora; local; convocação regular comprovada; ' +
                'presidente e secretário eleitos; quórum verificado; pauta integral; resumo fiel dos debates; registro formal das votações nominais ou secretas; ' +
                'resultado proclamado; hash criptográfico de auditoria; encerramento e assinatura dos membros da mesa.',
            },
          },
        ],
      })
    } catch (err) {
      console.log('Aviso ao declarar agente Skip Cloud redator-ata-assembleia:', err)
    }
  },
  (app) => {
    try {
      $ai.agents.delete(app, 'redator-ata-assembleia')
    } catch (_) {}
    try {
      const col = app.findCollectionByNameOrId('atas_assembleia')
      app.delete(col)
    } catch (_) {}
  },
)
