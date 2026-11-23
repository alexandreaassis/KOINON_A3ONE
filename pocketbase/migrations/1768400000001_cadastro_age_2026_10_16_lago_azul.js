/**
 * Cadastro REAL dos dados da AGE de 16/10/2026 do Condomínio Residencial Lago Azul.
 *
 * Operação pedida pelo usuário (dados reais, não de exemplo):
 *  - Ata parcial da AGE (texto integral do DOCX anexo, com duas alterações:
 *    assembleia HÍBRIDA declarada na abertura e reabertura da Sessão Permanente
 *    reforçada em 16/11/2026 às 19h00) → atas_assembleia (deliberação
 *    xdsbv7ge3f97wc8, sobrescrevendo o rascunho vazio).
 *  - 16 presenças presenciais da RELAÇÃO DE PRESENTES AGE 2026 (PDF anexo) →
 *    presencas_assinatura (forma 'presencial'; dois casos de procuração marcados
 *    com nome_procurador/cpf_procurador; ninguém marcado como remoto).
 *  - Mesa diretora na deliberação (Eduardo Sene Cardoso / Ricardo Zanoni).
 *  - Credenciamentos aprovados das unidades com procuração (104 e 803).
 *
 * Idempotente: procura registros existentes antes de criar/atualizar.
 */

const DELIB_ID = 'xdsbv7ge3f97wc8'

const ATA_HTML = `
<h3>ATA PARCIAL DA ASSEMBLEIA GERAL EXTRAORDINÁRIA DO CONDOMÍNIO RESIDENCIAL LAGO AZUL</h3>

<p><strong>CONDOMÍNIO RESIDENCIAL LAGO AZUL</strong></p>

<p>Rua Ernani Lacerda de Athayde, 210 — Gleba Fazenda Palhano — Londrina-PR</p>

<p><strong>Assembleia Geral Extraordinária do dia dezesseis de outubro de dois mil e vinte e seis.</strong></p>

<p>Aos dezesseis dias do mês de outubro de dois mil e vinte e seis, às 19h30min, em segunda convocação, reuniu-se no Salão de Festas do Condomínio a Assembleia Geral Extraordinária do Condomínio Residencial Lago Azul, <strong>instituída em formato HÍBRIDO, com participação presencial no Salão de Festas e participação remota pelo sistema eletrônico de votação do condomínio</strong>. Em estrito cumprimento ao disposto no Artigo 13 da Convenção Condominial, que veda ao Síndico a presidência ou secretariado dos trabalhos assembleares, foi aclamado por unanimidade dos presentes para presidir a reunião o Dr. Eduardo Sene Cardoso, advogado contratado pelo condomínio, o qual convidou para secretariar os trabalhos o Sr. Ricardo Zanoni (Apto 604). Registrou-se a presença e participação ativa do Síndico Administrador, Sr. Alexandre Aurélio Assis (Apto 1203), da Vice Síndica Sra. Edilaine Pereira Lima Zanoni (Apto 604), dos Conselheiros Fiscais Sra. Neuza Amélia Boni da Costa (Apto 1004), Sr. Roberto Lozam e Sr. Ismael José da Silva (Apto 102), além dos demais condôminos e representados relacionados na lista oficial de presença.</p>

<h4>DA MESA DIRETORA E DA LEITURA DA ORDEM DO DIA</h4>

<p>Composta a Mesa Diretora e declarada aberta a sessão pelo Senhor Presidente, procedeu-se à leitura formal do Edital de Convocação, regularmente expedido e distribuído a todos os condôminos dentro dos prazos estatutários, constando da pauta deliberativa e informativa os seguintes tópicos centrais:</p>

<ol>
<li><strong>Revisão e Modernização do Texto da Convenção Condominial;</strong></li>
<li><strong>Aprovação de Contratação de Obra Emergencial na Fachada do Edifício;</strong></li>
<li><strong>Informes da Ação Judicial Movida contra a Companhia de Saneamento do Paraná (Sanepar).</strong></li>
</ol>

<h4>DAS DELIBERAÇÕES E REGISTROS DA MINUTA DA NOVA CONVENÇÃO CONDOMINIAL</h4>

<p>Passando-se ao primeiro item da Ordem do Dia, a Mesa concedeu a palavra à assessoria jurídica especializada contratada para a condução do projeto de modernização do estatuto condominial. Foi apresentada a estrutura conceitual da minuta da nova Convenção, desenvolvida com o intuito de atualizar o texto original datado de 2009, segregando normas de direito de propriedade (permanentes) das diretrizes operacionais de convivência (a serem remetidas ao Regimento Interno). Posta a matéria em discussão e deliberação pelo Plenário, restaram fixadas e aprovadas por unanimidade dos presentes as seguintes diretrizes normativas:</p>

<p><strong>1. Destinação Residencial, Veto a Aluguel por Temporada/Airbnb e Repúblicas:</strong> Ratificou-se expressamente que o Condomínio Residencial Lago Azul se destina única e exclusivamente ao uso residencial familiar. Submetido a voto, o Plenário aprovou, de forma unânime e categórica, a proibição absoluta de locações por temporada e hospedagens de curto prazo operadas por intermédio de plataformas digitais ou aplicativos de intermediação imobiliária (tipo Airbnb ou similares). Adicionalmente, aprovou-se a vedação expressa à instalação de repúblicas no edifício, entendida esta como a locação ou sublocação fracionada da unidade autônoma para mais de duas pessoas que não possuam vínculo familiar.</p>

<p><strong>2. Regras e Limites para Animais de Estimação:</strong> Foi aprovada a limitação do número máximo de até 2 (dois) animais de estimação de porte convencional por unidade autônoma, não se aplicando dita restrição a peixes e aves mantidos estritamente no interior da unidade que não circulem pelas áreas comuns. Exigir-se-á a comprovação do cartão de vacinação atualizado sempre que solicitado pela administração, o uso obrigatório de coleira e guia durante o trânsito, e o transporte exclusivo pelo elevador de serviço, utilizando-se o trajeto mais curto entre a unidade e a via pública (ressalvada a hipótese de inoperância do elevador de serviço). É terminantemente proibido o acesso ou permanência de animais nas áreas sociais e de lazer (piscina, academia, playground, salão de festas e churrasqueira), ressalvada rigorosamente a exceção legal conferida ao cão-guia e cão de assistência para pessoas com deficiência, nos termos exatos da Lei Federal nº 11.126/2005.</p>

<p><strong>3. Diretrizes para Obras, Reformas e Mudanças:</strong> Estabeleceu-se a obrigatoriedade de comunicação prévia de qualquer obra ou reforma à administração do condomínio com antecedência mínima de 10 (dez) dias, acompanhada da apresentação da respectiva Anotação de Responsabilidade Técnica (ART) ou Registro de Responsabilidade Técnica (RRT) firmados por profissional habilitado, nas hipóteses exigidas pelas normas técnicas da ABNT. A execução de ruídos e os horários para reformas deverão respeitar rigorosamente os limites estipulados no Regimento Interno. Para a realização de mudanças (entrada ou saída), exige-se o agendamento prévio perante a portaria com antecedência mínima de 24 (vinte e quatro) horas, bem como o recolhimento prévio da taxa de mudança aplicável.</p>

<h4>DA CONVERSÃO EM SESSÃO PERMANENTE (ARTS. 1.351 E 1.354-A DO CÓDIGO CIVIL)</h4>

<p>Expostos os artigos da minuta da nova Convenção e considerando a necessidade de atingimento do quórum qualificado de 2/3 (dois terços) das frações ideais que compõem o condomínio, exigido imperativamente pelo <strong>Artigo 1.351 do Código Civil Brasileiro</strong> para a alteração da Convenção Condominial (correspondente a no mínimo 36 votos favoráveis entre as 52/53 unidades autônomas do edifício), a Assembleia deliberou e aprovou, por unanimidade dos condôminos presentes e participantes, a conversão da presente reunião em <strong>Sessão Permanente</strong>, em estrita consonância com o procedimento previsto no <strong>Artigo 1.354-A do Código Civil Brasileiro</strong>.</p>

<p>Ficou fixado o prazo de suspensão temporária dos trabalhos assembleares por até 30 (trinta) dias, agendando-se a data de reabertura, consolidação final dos votos e encerramento definitivo para o dia <strong>16 de novembro de 2026, às 19h00min</strong>, no mesmo local. Registrou-se de forma expressa que <strong>a presente Assembleia permanece ABERTA por período adicional, na condição de Sessão Permanente, até a data de reabertura acima fixada</strong>, permanecendo válidos, eficazes e irrevogáveis todos os votos colhidos nesta data, prosseguindo-se a coleta de votos dos condôminos ausentes mediante formalização física e utilização do sistema/aplicativo eletrônico oficial de votação do condomínio.</p>

<h4>DA OBRA EMERGENCIAL DA FACHADA DO EDIFÍCIO</h4>

<p>Avançando para o segundo item da pauta, o Síndico Administrador apresentou o diagnóstico técnico detalhado acerca do descolamento e queda de pastilhas do revestimento externo da fachada do edifício, com risco iminente de acidentes graves contra transeuntes e danos patrimoniais, além do surgimento de infiltrações nas unidades. Diante dos orçamentos apresentados e analisados pela governança, o Plenário aprovou, por unanimidade, a contratação da empresa <strong>ZM Engenharia</strong> para a execução dos serviços de remoção de toda a faixa de pastilhas soltas e aplicação de revestimento corretivo em grafiato, com utilização de balancim e emissão de ART.</p>

<p>O valor ajustado para a mão de obra especializada e equipamentos é de <strong>R$ 109.250,00</strong> (cento e nove mil, duzentos e cinquenta reais), resultante da negociação que concedeu 5% de desconto sobre o valor base de R$ 115.000,00, acrescido da estimativa de compra de materiais na ordem de aproximadamente <strong>R$ 10.000,00</strong> (dez mil reais). Como engenharia financeira para o custeio, a Assembleia aprovou o adiantamento integral dos valores mediante utilização das verbas do <strong>Fundo de Reserva</strong>, aprovando-se a recomposição imediata do saldo do Fundo pelos condôminos mediante rateio parcelado em <strong>36 (trinta e seis) parcelas mensais e sucessivas</strong>, gerando um impacto individual estimado entre <strong>R$ 64,00 e R$ 65,00 mensais por unidade autônoma</strong>.</p>

<h4>DOS INFORMES SOBRE A AÇÃO JUDICIAL CONTRA A SANEPAR</h4>

<p>No tocante ao terceiro item da Ordem do Dia, a assessoria jurídica e o Síndico prestaram informações atualizadas sobre o andamento da Ação Indenizatória movida pelo Condomínio contra a Companhia de Saneamento do Paraná (Sanepar), em razão do vazamento de água e consequente afundamento de solo ocorridos na entrada do edifício a partir do evento de 30 de abril de 2025.</p>

<p>Foi informado que a demanda busca o ressarcimento integral do montante de <strong>R$ 73.000,00</strong> (setenta e três mil reais), sendo R$ 65.500,00 relativos aos custos operacionais de reconstrução da estrutura afetada e R$ 7.500,00 concernentes aos honorários do laudo pericial encomendado. O advogado informou que a Sanepar apresentou contestação reconhecendo expressamente a sua responsabilidade pelo incidente, contudo impugnou os valores pleiteados fundamentando sua defesa em normas administrativas e manuais internos não produzidos nos autos, oferecendo em sede de acordo o valor de R$ 30.000,00. O processo encontra-se em fase de instrução processual, tendo o Condomínio requerido a produção de perícia judicial e a inversão do ônus da prova com base no Código de Defesa do Consumidor, aguardando-se decisão saneadora do Juízo.</p>

<h4>DO ENCERRAMENTO TEMPORÁRIO E FECHO</h4>

<p>Nada mais havendo a tratar nesta primeira etapa da Assembleia Geral Extraordinária, o Senhor Presidente declarou suspensos os trabalhos, ficando os condôminos devidamente notificados da continuação da Sessão Permanente até a data designada de 16 de novembro de 2026, às 19h00min. Para constar, lavrou-se a presente ata parcial que, lida, achada conforme e aprovada, vai rubricada e assinada pelos membros da Mesa Diretora e demais componentes da governança condominial.</p>

<p>Londrina-PR, 16 de outubro de 2026.</p>
`.trim()

const PRESENCAS = [
  // [unidadeId, nome, cpf, forma, nomeProcurador, cpfProcurador]
  ['j2xran9mmcm711h', 'Ismael José Da Silva', '11624604900', 'presencial', '', ''],
  [
    '5gx7hucoeva0w4v',
    'Edilaine Pereira Lima Zanoni',
    '65411439949',
    'procuracao',
    'Edilaine Pereira Lima Zanoni',
    '65411439949',
  ],
  ['i5dxsscta32l7ow', 'Andressa Layana Da Cunha Souza', '04010373989', 'presencial', '', ''],
  ['m5xdo2r7mq4oei9', 'Roberto Lozam', '18906028920', 'presencial', '', ''],
  ['wal8m3xsa5scgvn', 'Nei Jose Nogueira', '20287828972', 'presencial', '', ''],
  ['f413w3j162txl3z', 'Suelen Paschoalotto Alves De Almeida', '04513671971', 'presencial', '', ''],
  ['m6v12bvoxq38ija', 'Luciana Frasson Ribeiro', '02251300929', 'presencial', '', ''],
  ['epher614u2bxq94', 'Ricardo Zanoni', '61386120944', 'presencial', '', ''],
  [
    'q2wefy8i3uk9bo5',
    'Ludinei Picelli',
    '04311000987',
    'procuracao',
    'Ludinei Picelli',
    '04311000987',
  ],
  ['hbchcgulaagvafq', 'Rudhy Wielganczuk', '05853020900', 'presencial', '', ''],
  ['akvhe4hk796i968', 'Ludinei Picelli', '04311000987', 'presencial', '', ''],
  ['hhfvg2i3g7kjxle', 'Neuza Amélia Boni Da Costa', '00740524976', 'presencial', '', ''],
  ['wbh57rxr2hxz421', 'Alda Do Carmo Custódio Lopes', '04243395950', 'presencial', '', ''],
  ['sksjoatrcshsffs', 'Alexandre Aurélio Assis', '81022620797', 'presencial', '', ''],
  ['ivgeuyzj1nvt2vh', 'Ludinei Picelli', '04311000987', 'presencial', '', ''],
  ['shrci6m6cad9yes', 'Elvio Batista De Souza', '04631714972', 'presencial', '', ''],
]

migrate(
  (app) => {
    const atas = app.findCollectionByNameOrId('atas_assembleia')
    const presencas = app.findCollectionByNameOrId('presencas_assinatura')
    const deliberacoes = app.findCollectionByNameOrId('deliberacoes')
    const credenciamentos = app.findCollectionByNameOrId('credenciamentos')

    const agora = new Date().toISOString().replace('T', ' ').substring(0, 19)

    // 1. Mesa diretora na deliberação
    const delib = app.findRecordById('deliberacoes', DELIB_ID)
    if (!delib.getString('mesa_presidente_nome')) {
      delib.set('mesa_presidente_nome', 'Eduardo Sene Cardoso')
      delib.set('mesa_presidente_cpf', '')
      delib.set('mesa_secretario_nome', 'Ricardo Zanoni')
      delib.set('mesa_secretario_cpf', '')
      delib.set('mesa_eleita_em', agora)
      app.save(delib)
    }

    // 2. Ata da AGE (sobrescreve rascunho vazio existente)
    let ata
    try {
      ata = app.findFirstRecordByData('atas_assembleia', 'deliberacao', DELIB_ID)
    } catch (_) {
      ata = null
    }
    if (!ata) {
      ata = new Record(atas)
      ata.set('deliberacao', DELIB_ID)
      ata.set('status', 'rascunho')
      ata.set('modo_assinatura', 'manual_impressao')
    }
    ata.set(
      'titulo',
      'ATA PARCIAL DA ASSEMBLEIA GERAL EXTRAORDINÁRIA DO CONDOMÍNIO RESIDENCIAL LAGO AZUL — 16/10/2026',
    )
    ata.set('conteudo_html', ATA_HTML)
    ata.set('texto_entrada_bruto', '')
    ata.set('presidente_nome', 'Eduardo Sene Cardoso')
    ata.set('secretario_nome', 'Ricardo Zanoni')
    app.save(ata)

    // 3. Presenças reais (16 pessoas, todas presencialmente presentes)
    for (const [unidadeId, nome, cpf, forma, nomeProc, cpfProc] of PRESENCAS) {
      let pres
      try {
        pres = app.findFirstRecordByFilter(
          'presencas_assinatura',
          'deliberacao = {:d} && unidade = {:u}',
          { d: DELIB_ID, u: unidadeId },
        )
      } catch (_) {
        pres = null
      }
      if (!pres) {
        pres = new Record(presencas)
        pres.set('deliberacao', DELIB_ID)
        pres.set('unidade', unidadeId)
      }
      pres.set('nome', nome)
      pres.set('cpf', cpf)
      pres.set('forma', forma)
      pres.set('nome_procurador', nomeProc || '')
      pres.set('cpf_procurador', cpfProc || '')
      pres.set('data_hora_assinatura', '2026-10-16 19:30:00')
      app.save(pres)
    }

    // 4. Credenciamentos aprovados para as unidades representadas por procuração
    const procs = [
      ['5gx7hucoeva0w4v', 'Edilaine Pereira Lima Zanoni', '65411439949'],
      ['q2wefy8i3uk9bo5', 'Ludinei Picelli', '04311000987'],
    ]
    for (const [unidadeId, nome, cpf] of procs) {
      let cred
      try {
        cred = app.findFirstRecordByFilter('credenciamentos', 'unidade = {:u} && cpf = {:c}', {
          u: unidadeId,
          c: cpf,
        })
      } catch (_) {
        cred = null
      }
      if (!cred) {
        cred = new Record(credenciamentos)
        cred.set('unidade', unidadeId)
        cred.set('titular_nome', nome)
        cred.set('cpf', cpf)
        cred.set('tipo_vinculo', 'procurador')
        cred.set('status', 'aprovado')
        cred.set('data_analise', agora)
      }
      app.save(cred)
    }
  },
  (app) => {
    // rollback: não remove dados reais cadastrados
  },
)
