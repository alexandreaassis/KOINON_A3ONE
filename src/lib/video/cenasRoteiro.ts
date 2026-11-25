import { BlocoRoteiroCena, converterTextoEmPartesLocucao } from '@/lib/docx/roteiroDocx'

export interface CenaApresentacaoVideo extends BlocoRoteiroCena {
  tipoVisual:
    | 'abertura'
    | 'link_mensagem'
    | 'identificacao_unidade'
    | 'quem_deve_cadastrar'
    | 'preenchimento_dados'
    | 'escolha_vinculo_declaracao'
    | 'assinatura_eletronica'
    | 'indicacao_de_fato'
    | 'envio_sucesso'
    | 'pendencia_mesa'
    | 'encerramento'
  simulacao: {
    unidadeTexto?: string
    temBloco?: boolean
    blocoTexto?: string
    campoFoco?: string
    camposPreenchidos?: {
      nome?: string
      cpf?: string
      dataNascimento?: string
      email?: string
      telefone?: string
    }
    vinculoSelecionado?: 'condomino' | 'locatario' | 'proprietario'
    declaracaoTexto?: string
    indicacaoAtiva?: boolean
    indicacaoNome?: string
    indicacaoTelefone?: string
    statusBadge?: string
    mensagemDestaque?: string
  }
}

export const CENAS_ROTEIRO_OFICIAIS: CenaApresentacaoVideo[] = [
  // CENA 1: (a) Abertura — Por que o cadastro é necessário
  {
    id: 'cena-abertura',
    letra: 'a',
    titulo: 'Abertura — Por que o cadastro é necessário',
    tipoVisual: 'abertura',
    focoAnimacaoSeta: 'Logomarca oficial Koinon girando e endosso A3ONE',
    duracaoEstimadaSegundos: 22,
    duracaoEstimadaTexto: '22 segundos',
    dicasLocutor: 'Tom acolhedor, firme e institucional. Olhar direto para a câmera.',
    textoLocucaoOriginal:
      'Olá, moradores do condomínio! **Sejam muito bem-vindos à plataforma Koinon**. [pausa] Nosso condomínio agora conta com uma tecnologia moderna para as nossas assembleias. [pausa] Mas para que você possa participar, votar e ser ouvido com total **segurança jurídica**, precisamos do seu **cadastro oficial atualizado**. [pausa] É esse cadastro que garante a **identificação correta da sua unidade**, a apuração rigorosa do quórum e a **validade de cada deliberação** em cartório.',
    partesLocucao: converterTextoEmPartesLocucao(
      'Olá, moradores do condomínio! **Sejam muito bem-vindos à plataforma Koinon**. [pausa] Nosso condomínio agora conta com uma tecnologia moderna para as nossas assembleias. [pausa] Mas para que você possa participar, votar e ser ouvido com total **segurança jurídica**, precisamos do seu **cadastro oficial atualizado**. [pausa] É esse cadastro que garante a **identificação correta da sua unidade**, a apuração rigorosa do quórum e a **validade de cada deliberação** em cartório.',
    ),
    simulacao: {
      mensagemDestaque: 'Credenciamento seguro • Identificação da unidade • Quórum legal',
    },
  },

  // CENA 2: (b) O link chegar por WhatsApp ou e-mail e como abrir
  {
    id: 'cena-link',
    letra: 'b',
    titulo: 'O link pelo WhatsApp ou E-mail — Como abrir',
    tipoVisual: 'link_mensagem',
    focoAnimacaoSeta: 'Mensagem de WhatsApp e botão do link seguro da unidade',
    duracaoEstimadaSegundos: 18,
    duracaoEstimadaTexto: '18 segundos',
    dicasLocutor:
      'Tom prático e explicativo. Aponte mentalmente para a tela do celular/computador.',
    textoLocucaoOriginal:
      'Você receberá um **link exclusivo** da administração pelo **WhatsApp** ou por **e-mail**. [pausa] Esse link é pessoal e pertence exclusivamente à sua unidade. [pausa] Basta **clicar no link** diretamente no seu celular ou computador. Você não precisa baixar nenhum aplicativo da loja; a página abre direto no seu navegador com total praticidade.',
    partesLocucao: converterTextoEmPartesLocucao(
      'Você receberá um **link exclusivo** da administração pelo **WhatsApp** ou por **e-mail**. [pausa] Esse link é pessoal e pertence exclusivamente à sua unidade. [pausa] Basta **clicar no link** diretamente no seu celular ou computador. Você não precisa baixar nenhum aplicativo da loja; a página abre direto no seu navegador com total praticidade.',
    ),
    simulacao: {
      unidadeTexto: 'Apto 1203',
      temBloco: false,
    },
  },

  // CENA 3: (c) Identificação da unidade na página
  {
    id: 'cena-identificacao-unidade',
    letra: 'c',
    titulo: 'Identificação da Unidade — "Apto 1203" e Bloco "—"',
    tipoVisual: 'identificacao_unidade',
    focoAnimacaoSeta: 'Caixa de identificação "Apto 1203" com bloco "—" (Torre única)',
    duracaoEstimadaSegundos: 16,
    duracaoEstimadaTexto: '16 segundos',
    dicasLocutor: 'Demonstrar tranquilidade sobre a torre única.',
    textoLocucaoOriginal:
      'Assim que a página carregar, repare no topo: **confira a sua unidade**. [pausa] No nosso exemplo, vemos claramente **"Apto 1203"**. [pausa] Se o seu condomínio for torre única, o bloco aparecerá como um traço (**"—"**), exatamente como manda a nossa convenção. Verifique se o número corresponde ao seu imóvel antes de prosseguir.',
    partesLocucao: converterTextoEmPartesLocucao(
      'Assim que a página carregar, repare no topo: **confira a sua unidade**. [pausa] No nosso exemplo, vemos claramente **"Apto 1203"**. [pausa] Se o seu condomínio for torre única, o bloco aparecerá como um traço (**"—"**), exatamente como manda a nossa convenção. Verifique se o número corresponde ao seu imóvel antes de prosseguir.',
    ),
    simulacao: {
      unidadeTexto: 'Apto 1203',
      temBloco: false,
      blocoTexto: 'Torre única (—)',
    },
  },

  // CENA 4: (d) Orientação "Quem deve se cadastrar nesta unidade?"
  {
    id: 'cena-quem-deve-cadastrar',
    letra: 'd',
    titulo: 'Orientação — Quem deve se cadastrar nesta unidade?',
    tipoVisual: 'quem_deve_cadastrar',
    focoAnimacaoSeta: 'Quadro azul com os 3 tópicos de orientação oficial',
    duracaoEstimadaSegundos: 24,
    duracaoEstimadaTexto: '24 segundos',
    dicasLocutor: 'Ritmo pausado para o morador absorver as três situações distintas.',
    textoLocucaoOriginal:
      'Logo abaixo, leia com atenção o quadro: **Quem deve se cadastrar nesta unidade?** [pausa] Temos três situações bem simples: [pausa] Primeiro: se você é **Condômino residente**, ou seja, o proprietário que mora no apartamento, um único cadastro seu é suficiente. [pausa] Segundo: se o **imóvel é alugado**, o mesmo link cadastra o **Inquilino morador**. [pausa] E terceiro: permite também o cadastro do **Proprietário não morador**, totalizando no máximo **duas pessoas vinculadas à unidade**.',
    partesLocucao: converterTextoEmPartesLocucao(
      'Logo abaixo, leia com atenção o quadro: **Quem deve se cadastrar nesta unidade?** [pausa] Temos três situações bem simples: [pausa] Primeiro: se você é **Condômino residente**, ou seja, o proprietário que mora no apartamento, um único cadastro seu é suficiente. [pausa] Segundo: se o **imóvel é alugado**, o mesmo link cadastra o **Inquilino morador**. [pausa] E terceiro: permite também o cadastro do **Proprietário não morador**, totalizando no máximo **duas pessoas vinculadas à unidade**.',
    ),
    simulacao: {
      unidadeTexto: 'Apto 1203',
    },
  },

  // CENA 5: (e) Preenchimento dos dados: Nome, CPF, Data de Nascimento e Telefone com máscara
  {
    id: 'cena-preenchimento-dados',
    letra: 'e',
    titulo: 'Preenchimento dos Dados — Nome, CPF, Nascimento e Telefone',
    tipoVisual: 'preenchimento_dados',
    focoAnimacaoSeta: 'Campos do formulário sendo digitados progressivamente com máscara',
    duracaoEstimadaSegundos: 26,
    duracaoEstimadaTexto: '26 segundos',
    dicasLocutor: 'Destaque a data de nascimento e a formatação automática do telefone.',
    textoLocucaoOriginal:
      'Agora vamos ao formulário. [pausa] Digite seu **Nome Completo**. [pausa] Em seguida, informe o seu **CPF**, com validação instantânea dos onze dígitos. [pausa] Muita atenção aqui: preencha a sua **DATA DE NASCIMENTO**, dado essencial para certificar a sua identidade e evitar homônimos na assembleia. [pausa] Coloque seu **e-mail oficial** para receber editais e convocações, e o seu **telefone celular**, que a plataforma formata automaticamente com a máscara progressiva com DDD.',
    partesLocucao: converterTextoEmPartesLocucao(
      'Agora vamos ao formulário. [pausa] Digite seu **Nome Completo**. [pausa] Em seguida, informe o seu **CPF**, com validação instantânea dos onze dígitos. [pausa] Muita atenção aqui: preencha a sua **DATA DE NASCIMENTO**, dado essencial para certificar a sua identidade e evitar homônimos na assembleia. [pausa] Coloque seu **e-mail oficial** para receber editais e convocações, e o seu **telefone celular**, que a plataforma formata automaticamente com a máscara progressiva com DDD.',
    ),
    simulacao: {
      campoFoco: 'todos',
      camposPreenchidos: {
        nome: 'José Exemplo da Silva',
        cpf: '123.456.789-00',
        dataNascimento: '1982-05-14',
        email: 'jose.exemplo@email.com',
        telefone: '(11) 98765-4321',
      },
    },
  },

  // CENA 6: (f) Escolha do vínculo e a DECLARAÇÃO legal
  {
    id: 'cena-escolha-vinculo-declaracao',
    letra: 'f',
    titulo: 'Escolha do Vínculo e Declaração Legal correspondente',
    tipoVisual: 'escolha_vinculo_declaracao',
    focoAnimacaoSeta: 'Campo de seleção de vínculo e caixa da Declaração Legal dinâmica',
    duracaoEstimadaSegundos: 28,
    duracaoEstimadaTexto: '28 segundos',
    dicasLocutor: 'Tom solene e esclarecedor sobre o fundamento legal de cada declaração.',
    textoLocucaoOriginal:
      'No campo **Seu Vínculo com esta Unidade**, selecione a sua condição real. [pausa] Veja que interessante: conforme você escolhe, a plataforma exibe imediatamente a **Declaração Legal correspondente**. [pausa] Se você for **Locatário**, a declaração é fundamentada na **Lei do Inquilinato nº 8.245 de 1991**. [pausa] Se for **Condômino residente** ou **Proprietário não morador**, a declaração é fundamentada nos **artigos 1.228 e 1.331 do Código Civil**. [pausa] E todas elas incluem a garantia expressa de tratamento de dados sob a **LGPD**.',
    partesLocucao: converterTextoEmPartesLocucao(
      'No campo **Seu Vínculo com esta Unidade**, selecione a sua condição real. [pausa] Veja que interessante: conforme você escolhe, a plataforma exibe imediatamente a **Declaração Legal correspondente**. [pausa] Se você for **Locatário**, a declaração é fundamentada na **Lei do Inquilinato nº 8.245 de 1991**. [pausa] Se for **Condômino residente** ou **Proprietário não morador**, a declaração é fundamentada nos **artigos 1.228 e 1.331 do Código Civil**. [pausa] E todas elas incluem a garantia expressa de tratamento de dados sob a **LGPD**.',
    ),
    simulacao: {
      vinculoSelecionado: 'condomino',
      declaracaoTexto:
        'Declaro, sob as penas da lei, que sou proprietário legítimo da unidade para a qual estou me cadastrando, na forma dos arts. 1.228 e 1.331 do Código Civil (Lei nº 10.406/2002), que resido na unidade e que as informações prestadas neste cadastro são verdadeiras. Autorizo o tratamento dos meus dados pessoais exclusivamente para fins de credenciamento e participação na assembleia, nos termos da Lei nº 13.709/2018 (LGPD).',
    },
  },

  // CENA 7: (g) Assinatura eletrônica
  {
    id: 'cena-assinatura-eletronica',
    letra: 'g',
    titulo: 'Assinatura Eletrônica — Nome, Data/Hora e IP',
    tipoVisual: 'assinatura_eletronica',
    focoAnimacaoSeta: 'Botão "Assinar declaração eletronicamente" e registro de auditoria',
    duracaoEstimadaSegundos: 20,
    duracaoEstimadaTexto: '20 segundos',
    dicasLocutor: 'Enfatizar a validade jurídica sem burocracia de cartório físico.',
    textoLocucaoOriginal:
      'Quando todos os campos obrigatórios estiverem corretos, o botão principal azul ficará ativo: **"Assinar declaração eletronicamente"**. [pausa] Ao clicar, o sistema grava a sua assinatura com o seu **nome completo, a data e hora exatas e o endereço IP** do seu dispositivo. [pausa] Isso confere **rastreabilidade e autenticidade** para a assembleia, dispensando impressões ou papel.',
    partesLocucao: converterTextoEmPartesLocucao(
      'Quando todos os campos obrigatórios estiverem corretos, o botão principal azul ficará ativo: **"Assinar declaração eletronicamente"**. [pausa] Ao clicar, o sistema grava a sua assinatura com o seu **nome completo, a data e hora exatas e o endereço IP** do seu dispositivo. [pausa] Isso confere **rastreabilidade e autenticidade** para a assembleia, dispensando impressões ou papel.',
    ),
    simulacao: {
      campoFoco: 'botao-assinar',
    },
  },

  // CENA 8: (h) Indicação do locatário/proprietário de fato
  {
    id: 'cena-indicacao-de-fato',
    letra: 'h',
    titulo: 'Indicação Complementar — Locatário ou Proprietário de Fato',
    tipoVisual: 'indicacao_de_fato',
    focoAnimacaoSeta: 'Botão e formulário retrátil de indicação da outra pessoa',
    duracaoEstimadaSegundos: 22,
    duracaoEstimadaTexto: '22 segundos',
    dicasLocutor: 'Explicar como inquilinos e proprietários colaboram para completar a unidade.',
    textoLocucaoOriginal:
      'Caso a sua unidade seja alugada, você pode usar o botão: **"Indicar o morador/proprietário de fato"**. [pausa] Se você é o inquilino, informe aqui o **nome e o telefone do proprietário**. [pausa] Se você for o proprietário, informe o nome e telefone do seu inquilino. [pausa] A mesa diretora recebe essa informação para entrar em contato e providenciar o registro da outra pessoa.',
    partesLocucao: converterTextoEmPartesLocucao(
      'Caso a sua unidade seja alugada, você pode usar o botão: **"Indicar o morador/proprietário de fato"**. [pausa] Se você é o inquilino, informe aqui o **nome e o telefone do proprietário**. [pausa] Se você for o proprietário, informe o nome e telefone do seu inquilino. [pausa] A mesa diretora recebe essa informação para entrar em contato e providenciar o registro da outra pessoa.',
    ),
    simulacao: {
      indicacaoAtiva: true,
      indicacaoNome: 'Maria Proprietária Exemplo',
      indicacaoTelefone: '(11) 91234-5678',
    },
  },

  // CENA 9: (i) Envio e mensagem de cadastro feito com sucesso
  {
    id: 'cena-envio-sucesso',
    letra: 'i',
    titulo: 'Envio Concluído — Cadastro Realizado com Sucesso',
    tipoVisual: 'envio_sucesso',
    focoAnimacaoSeta: 'Tela verde/âmbar de sucesso com confirmação da declaração assinada',
    duracaoEstimadaSegundos: 18,
    duracaoEstimadaTexto: '18 segundos',
    dicasLocutor: 'Tom de alívio e comemoração tranquila.',
    textoLocucaoOriginal:
      'Pronto! Em poucos segundos surge a tela de confirmação: **Cadastro Enviado com Sucesso!** [pausa] Uma mensagem detalhada confirma que a sua **declaração de vínculo e assinatura eletrônica** foram devidamente registradas no banco de dados do condomínio com protocolo seguro.',
    partesLocucao: converterTextoEmPartesLocucao(
      'Pronto! Em poucos segundos surge a tela de confirmação: **Cadastro Enviado com Sucesso!** [pausa] Uma mensagem detalhada confirma que a sua **declaração de vínculo e assinatura eletrônica** foram devidamente registradas no banco de dados do condomínio com protocolo seguro.',
    ),
    simulacao: {
      statusBadge: 'Pendente de Homologação',
      mensagemDestaque:
        'Seus dados e a assinatura eletrônica da declaração foram registrados com sucesso!',
    },
  },

  // CENA 10: (j) Pendência até aprovação da mesa
  {
    id: 'cena-pendencia-mesa',
    letra: 'j',
    titulo: 'Pendência até Homologação pela Mesa Diretora',
    tipoVisual: 'pendencia_mesa',
    focoAnimacaoSeta: 'Quadro explicativo de conferência documental pela mesa diretora',
    duracaoEstimadaSegundos: 22,
    duracaoEstimadaTexto: '22 segundos',
    dicasLocutor: 'Transmitir confiança e rigor administrativo.',
    textoLocucaoOriginal:
      'Lembre-se de um detalhe muito importante: o cadastro fica com status **"Pendente"** até que a **mesa diretora da assembleia** faça a conferência documental da unidade. [pausa] Assim que a mesa homologar, você receberá a **confirmação oficial por e-mail** e estará 100% habilitado para credenciamento e votação nas assembleias.',
    partesLocucao: converterTextoEmPartesLocucao(
      'Lembre-se de um detalhe muito importante: o cadastro fica com status **"Pendente"** até que a **mesa diretora da assembleia** faça a conferência documental da unidade. [pausa] Assim que a mesa homologar, você receberá a **confirmação oficial por e-mail** e estará 100% habilitado para credenciamento e votação nas assembleias.',
    ),
    simulacao: {
      statusBadge: 'Pendente',
      mensagemDestaque:
        'Conferência da unidade pela Mesa Diretora • Habilitação nas Deliberações e Votações',
    },
  },

  // CENA 11: (k) Encerramento institucional
  {
    id: 'cena-encerramento',
    letra: 'k',
    titulo: 'Encerramento Institucional — Koinon e A3ONE',
    tipoVisual: 'encerramento',
    focoAnimacaoSeta: 'Logomarca Koinon final com endosso oficial A3ONE Soluções Integradas',
    duracaoEstimadaSegundos: 20,
    duracaoEstimadaTexto: '20 segundos',
    dicasLocutor: 'Fechamento elegante, caloroso e de agradecimento.',
    textoLocucaoOriginal:
      'Viu como é simples, rápido e transparente? [pausa] **Não deixe para a última hora**: abra o link da sua unidade e faça seu cadastro agora mesmo. [pausa] Contamos com a sua participação para construir um condomínio cada vez mais participativo e organizado. [pausa] **Koinon — uma solução A3ONE**. Muito obrigado a todos!',
    partesLocucao: converterTextoEmPartesLocucao(
      'Viu como é simples, rápido e transparente? [pausa] **Não deixe para a última hora**: abra o link da sua unidade e faça seu cadastro agora mesmo. [pausa] Contamos com a sua participação para construir um condomínio cada vez mais participativo e organizado. [pausa] **Koinon — uma solução A3ONE**. Muito obrigado a todos!',
    ),
    simulacao: {
      mensagemDestaque: 'Democracia condominial, transparência e segurança jurídica.',
    },
  },
]
