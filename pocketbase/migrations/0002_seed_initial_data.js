migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const unidades = app.findCollectionByNameOrId('unidades')
    const deliberacoes = app.findCollectionByNameOrId('deliberacoes')
    const itensPauta = app.findCollectionByNameOrId('itens_pauta')

    // 1. Seed mesa user: alexandre@a3one.com.br
    let mesaUser
    try {
      mesaUser = app.findAuthRecordByEmail('_pb_users_auth_', 'alexandre@a3one.com.br')
    } catch (_) {
      mesaUser = new Record(users)
      mesaUser.setEmail('alexandre@a3one.com.br')
      mesaUser.setPassword('Skip@Pass')
      mesaUser.setVerified(true)
      mesaUser.set('name', 'Alexandre (Mesa Administradora)')
      mesaUser.set('role', 'mesa')
      app.save(mesaUser)
    }

    // Seed morador user: morador@lagoazul.com.br
    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'morador@lagoazul.com.br')
    } catch (_) {
      const morador = new Record(users)
      morador.setEmail('morador@lagoazul.com.br')
      morador.setPassword('Skip@Pass')
      morador.setVerified(true)
      morador.set('name', 'Carlos Alberto Souza')
      morador.set('role', 'morador')
      app.save(morador)
    }

    // 2. Seed 52 unidades (Blocos A e B: 4 andares x 6 ou 7 aptos = 52 unidades)
    const nomesFicticios = [
      'Ana Beatriz Vasconcelos',
      'Carlos Alberto Souza',
      'Mariana Lima Duarte',
      'Roberto Silva Santos',
      'Fernanda Oliveira Rocha',
      'Lucas Mendes Pereira',
      'Patricia Carvalho Dias',
      'Ricardo Gomes Martins',
      'Juliana Castro Neves',
      'Marcelo Ferreira Costa',
      'Camila Ribeiro Alves',
      'Eduardo Cunha Barbosa',
      'Bruna Pires Correia',
      'Gustavo Henrique Lopes',
      'Vanessa Teixeira Melo',
      'Thiago Cardoso Freire',
      'Amanda Soares Moreira',
      'Felipe Nascimento Cruz',
      'Larissa Ramos Guimarães',
      'Rodrigo Azevedo Pinto',
      'Renata Miranda Frota',
      'Diego Silveira Nogueira',
      'Priscila Monteiro Brandão',
      'Leandro Tavares Paiva',
      'Beatriz Farias Machado',
      'Andre Luis Albuquerque',
      'Tatiana Dantas Vasconcelos',
      'Fabio Borges Fontes',
      'Carolina Abreu Rezende',
      'Alexandre Viana Prado',
      'Helena Campos Magalhães',
      'Victor Hugo Camargo',
      'Daniela Moura Leite',
      'Caio Vinicius Meireles',
      'Monique Guedes Lins',
      'Renan Antunes Barreto',
      'Flavia Peixoto Caldas',
      'Murilo Sampaio Guerra',
      'Natalia Furtado Coelho',
      'Arthur Bernardes Paes',
      'Debora Toledo Aragão',
      'Igor Cavalcante Chaves',
      'Sabrina Figueiredo Rios',
      'Bruno Cesar Queiroz',
      'Luana Marinho Sales',
      'Otavio Bueno Esteves',
      'Raquel Valente Paim',
      'Sergio Franco Medeiros',
      'Viviane Teles Dorneles',
      'Vinicius Lacerda Porto',
      'Jessica Brandão Xavier',
      'Leonardo Pontes Bessa',
    ]

    for (let i = 1; i <= 52; i++) {
      const bloco = i <= 26 ? 'Bloco A' : 'Bloco B'
      const andar = Math.floor(((i - 1) % 26) / 6) + 1
      const porta = (((i - 1) % 26) % 6) + 1
      const ident = andar + '0' + porta // ex: 101, 102 ... 502
      const identificador = bloco === 'Bloco A' ? ident + 'A' : ident + 'B'

      try {
        app.findFirstRecordByData('unidades', 'identificador', identificador)
      } catch (_) {
        const rec = new Record(unidades)
        const idx = i - 1
        const nome = nomesFicticios[idx] || 'Condômino Unidade ' + identificador
        const cleanNome = nome
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/\s+/g, '.')
        rec.set('identificador', identificador)
        rec.set('bloco', bloco)
        rec.set('responsavel_nome', nome)
        rec.set('contato_celular', '(61) 9' + (8100 + i) + '-' + (1000 + i))
        rec.set('contato_email', cleanNome + '@lagoazul.com.br')
        rec.set('ativo', true)
        app.save(rec)
      }
    }

    // Also seed one example deliberação: AGUARDANDO_ABERTURA
    let delib
    try {
      delib = app.findFirstRecordByData(
        'deliberacoes',
        'titulo',
        'Assembleia Geral Extraordinária 2025/1 — Lago Azul',
      )
    } catch (_) {
      delib = new Record(deliberacoes)
      delib.set('titulo', 'Assembleia Geral Extraordinária 2025/1 — Lago Azul')
      delib.set(
        'descricao',
        'Deliberação para aprovação das contas do exercício anterior, plano orçamentário de modernização da portaria e instalação de energia solar nas áreas comuns.',
      )
      // Data início: hoje, fim: +3 dias
      const now = new Date()
      const future = new Date(Date.now() + 3 * 86400000)
      delib.set('data_inicio', now.toISOString().replace('T', ' ').substring(0, 19))
      delib.set('data_fim', future.toISOString().replace('T', ' ').substring(0, 19))
      delib.set('status', 'AGUARDANDO_ABERTURA')
      delib.set('quorum_instalacao', 27) // 50% + 1 das 52 unidades
      delib.set('quorum_materia', 'maioria simples')
      delib.set('tipo_cedula', 'secreta')
      delib.set('inadimplente_pode_votar', true)
      delib.set('locatario_pode_votar', false)
      app.save(delib)

      // Itens de pauta
      const itens = [
        {
          ordem: 1,
          titulo: 'Item 1 — Prestação de Contas do Exercício 2024',
          texto:
            'Apreciação e aprovação do relatório financeiro, receitas e despesas apresentadas pela administração e parecer favorável do Conselho Fiscal.',
          quorum_aplicavel: 'Maioria simples dos presentes',
        },
        {
          ordem: 2,
          titulo: 'Item 2 — Projeto de Modernização e Controle de Acesso da Portaria',
          texto:
            'Aprovação de verba extraordinária de R$ 48.000,00 rateada em 4 parcelas para implantação de portaria eletrônica e reconhecimento facial.',
          quorum_aplicavel: 'Maioria simples dos presentes',
        },
        {
          ordem: 3,
          titulo: 'Item 3 — Implantação de Usina Solar Fotovoltaica para Áreas Comuns',
          texto:
            'Contratação de empresa especializada para instalação de painéis solares na cobertura com economia projetada de 75% na energia condominial.',
          quorum_aplicavel: '2/3 dos condôminos',
        },
      ]

      for (const it of itens) {
        const pautaRec = new Record(itensPauta)
        pautaRec.set('deliberacao', delib.id)
        pautaRec.set('ordem', it.ordem)
        pautaRec.set('titulo', it.titulo)
        pautaRec.set('texto', it.texto)
        pautaRec.set('quorum_aplicavel', it.quorum_aplicavel)
        app.save(pautaRec)
      }
    }

    // Seed sample credenciamento for unit 101A (Carlos Alberto Souza) so morador can test immediately
    try {
      const unit101 = app.findFirstRecordByData('unidades', 'identificador', '101A')
      const credCol = app.findCollectionByNameOrId('credenciamentos')
      try {
        app.findFirstRecordByData('credenciamentos', 'cpf', '123.456.789-00')
      } catch (_) {
        const credRec = new Record(credCol)
        credRec.set('unidade', unit101.id)
        credRec.set('cpf', '123.456.789-00')
        credRec.set('titular_nome', 'Carlos Alberto Souza')
        credRec.set('tipo_vinculo', 'proprietario')
        credRec.set('status', 'aprovado')
        credRec.set('data_analise', new Date().toISOString().replace('T', ' ').substring(0, 19))
        if (mesaUser) {
          credRec.set('aprovado_por', mesaUser.id)
        }
        app.save(credRec)
      }
    } catch (_) {}
  },
  (app) => {
    // rollback
  },
)
