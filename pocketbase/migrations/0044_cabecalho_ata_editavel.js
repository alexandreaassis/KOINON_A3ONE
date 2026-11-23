/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const atasCol = app.findCollectionByNameOrId('atas_assembleia')
    if (!atasCol) {
      throw new Error('Collection atas_assembleia não encontrada (migration 0044)')
    }

    // Campos editáveis do cabeçalho do PDF da ata.
    // Apenas adicionados se ainda não existirem (idempotente).
    if (!atasCol.fields.getByName('cabecalho_tag')) {
      atasCol.fields.add(new TextField({ name: 'cabecalho_tag', max: 200 }))
    }
    if (!atasCol.fields.getByName('cabecalho_condominio')) {
      atasCol.fields.add(new TextField({ name: 'cabecalho_condominio', max: 200 }))
    }
    if (!atasCol.fields.getByName('cabecalho_subtitulo')) {
      atasCol.fields.add(new TextField({ name: 'cabecalho_subtitulo', max: 200 }))
    }
    app.save(atasCol)

    // Backfill retroativo: atas gravadas antes destes campos continuam
    // imprimindo com o cabeçalho padrão — gravamos os defaults nos registros
    // existentes (tag e subtítulo fixos; condomínio = nome atual da configuração).
    let nomeCondominio = ''
    try {
      const configs = app.findRecordsByFilter('configuracoes', 'id != ""', '-created', 1, 0)
      if (configs.length > 0) {
        nomeCondominio = configs[0].getString('nome_condominio') || ''
      }
    } catch (err) {
      console.log('Aviso ao ler nome do condomínio na migration 0044:', err)
    }

    const existentes = app.findRecordsByFilter('atas_assembleia', 'id != ""', '-created', 0, 0)
    for (const ata of existentes) {
      let alterou = false
      if (ata.getString('cabecalho_tag') === '') {
        ata.set('cabecalho_tag', 'Ata de Assembleia e Deliberativa')
        alterou = true
      }
      if (ata.getString('cabecalho_condominio') === '') {
        ata.set('cabecalho_condominio', nomeCondominio)
        alterou = true
      }
      if (ata.getString('cabecalho_subtitulo') === '') {
        ata.set('cabecalho_subtitulo', 'Assembleia Geral de Condôminos')
        alterou = true
      }
      if (alterou) {
        app.save(ata)
      }
    }
  },
  (app) => {
    try {
      const atasCol = app.findCollectionByNameOrId('atas_assembleia')
      if (atasCol) {
        const nomes = ['cabecalho_tag', 'cabecalho_condominio', 'cabecalho_subtitulo']
        for (let n of nomes) {
          atasCol.fields.removeByName(n)
        }
        app.save(atasCol)
      }
    } catch (err) {
      console.log('Erro no rollback da migração 0044:', err)
    }
  },
)
