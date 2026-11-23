/// <reference path="../pb_data/types.d.ts" />

/**
 * Correção pontual das presenças por procuração da AGE (deliberação xdsbv7ge3f97wc8).
 *
 * Os registros das unidades 104 e 803 foram gravados com o nome do PROCURADOR nos
 * campos nome e nome_procurador. Pelo padrão correto, o campo principal (nome/cpf)
 * é sempre do PROPRIETÁRIO aprovado da unidade, e o procurador fica só em
 * nome_procurador/cpf_procurador.
 *
 * Seleciona somente as presenças por procuração dessas duas unidades nessa deliberação.
 * Idempotente: regravar os mesmos valores não altera nada. Em base vazia não faz nada.
 */
migrate(
  (app) => {
    const deliberacao = 'xdsbv7ge3f97wc8'
    const correcoes = {
      // unidade 104
      '5gx7hucoeva0w4v': {
        nome: 'Iracema De Melo Mangoni',
        cpf: '70303819804',
        nome_procurador: 'Edilaine Pereira Lima Zanoni',
        cpf_procurador: '65411439949',
      },
      // unidade 803
      q2wefy8i3uk9bo5: {
        nome: 'Lourdes Dos Reis',
        cpf: '19029179953',
        nome_procurador: 'Ludinei Picelli',
        cpf_procurador: '04311000987',
      },
    }

    const registros = app.findRecordsByFilter(
      'presencas_assinatura',
      "deliberacao = '" +
        deliberacao +
        "' && forma = 'procuracao' && (unidade = '5gx7hucoeva0w4v' || unidade = 'q2wefy8i3uk9bo5')",
      '',
      10,
      0,
    )

    for (const registro of registros) {
      const dados = correcoes[registro.getString('unidade')]
      if (!dados) continue
      registro.set('nome', dados.nome)
      registro.set('cpf', dados.cpf)
      registro.set('nome_procurador', dados.nome_procurador)
      registro.set('cpf_procurador', dados.cpf_procurador)
      app.save(registro)
    }
  },
  (app) => {
    // Sem reversão: os dados corretos não devem voltar a ter o procurador como titular.
  },
)
