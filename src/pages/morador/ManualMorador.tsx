import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  UserCheck,
  Vote,
  Receipt,
  FolderOpen,
  FileText,
  Printer,
  ArrowRight,
  MessageCircleQuestion,
  HelpCircle,
} from 'lucide-react'
import {
  CapaManual,
  TituloSecao,
  MockupTela,
  LegendaNumerada,
  CaixaImportante,
  CaixaDica,
  type SecaoManual,
} from './manual/BlocosManual'
import { PainelIaManual } from './manual/PainelIaManual'
import {
  MockupMinhaSituacao,
  MockupCredenciamento,
  MockupVotacao,
  MockupRecibo,
  MockupDocumentos,
  MockupAta,
  MockupFluxoCompleto,
} from './manual/MockupsTelas'
import { useNarracao } from '@/hooks/useNarracao'
import { KoinonSymbol } from '@/components/brand/KoinonSymbol'

/* Textos de narração (pt-BR) por seção */
const NARRACOES: Record<string, string> = {
  intro:
    'Bem-vindo ao Manual do Módulo do Morador do Koinon. Aqui você aprende, em linguagem simples, como funciona cada página do seu módulo. A assembleia eletrônica acontece em seis passos: você se cadastra, credencia, vota, recebe o recibo, e a mesa apura os votos e publica a ata. Vamos por partes!',
  situacao:
    'A página Minha Situação é o painel de controle do morador. Nela você vê se o seu cadastro já foi aprovado pela mesa, a sua situação financeira de forma informativa, e os avisos da assembleia, como o botão para ir ao credenciamento quando a votação começa.',
  credenciamento:
    'O credenciamento é a confirmação de que você, e somente você, vai participar da assembleia. Você confere seus dados, anexa um documento se a mesa pedir, e recebe por e-mail um código de seis números chamado O T P. Digite o código na tela e pronto: a mesa aprova o seu credenciamento, e você aparece na lista de presença, presencial ou remoto.',
  votacao:
    'A cabine de votação é o local mais protegido do sistema. Cada item da pauta aparece com as opções favorável, contrário e abstenção, e em algumas votações também nulo e branco. Cada unidade tem um voto. Seu voto é secreto: ninguém consegue ver o que você escolheu, nem a mesa. Depois de confirmar, o voto não pode ser alterado, e você recebe um recibo.',
  recibo:
    'O recibo é o comprovante do seu voto. Ele mostra o código de conferência, um código exclusivo da sua cédula, e a impressão digital, chamada hash, que funciona como a digital do dedo, garantindo que o voto não foi alterado. Guarde esse código: ele permite conferir o seu voto na apuração sem revelar em quem você votou.',
  documentos:
    'Na página Documentos da Assembleia ficam os arquivos oficiais: o edital de convocação, a pauta, a prestação de contas, a convenção, currículos de candidatos e propostas. Abra e baixe quando quiser, antes e depois da assembleia. Ler a pauta com calma antes de votar é o segredo de uma assembleia tranquila.',
  ata: 'A ata é o documento oficial que registra tudo o que foi decidido na assembleia. Depois de publicada pela mesa, com assinaturas eletrônicas, você pode ler a ata completa ou baixar o P D F. Ela vale como prova das deliberações.',
  informacoes:
    'E o que acontece com as suas informações? Seu credenciamento vira a lista de presença oficial da mesa. Seu voto vira a cédula com hash encadeado, que a apuração confere uma a uma. O resultado vai para o boletim da urna, a ata e o dossiê assinados, e tudo fica registrado na auditoria verificável do sistema. Nada se perde, tudo é conferível.',
  faq: 'Ficou com alguma dúvida comum? Esqueci a senha: use a opção Esqueci minha senha na tela de login. Não recebi o código: confira a caixa de spam e peça um novo código. Já votei: o voto confirmado não pode ser mudado. E a regra sobre inadimplência varia conforme a deliberação da assembleia. Qualquer dúvida, use a IA do Koinon ou fale com a mesa.',
}

const SECOES: SecaoManual[] = [
  {
    id: 'situacao',
    titulo: 'Minha Situação — seu painel de controle',
    rota: '/situacao',
    icone: LayoutDashboard,
    resumo:
      'O retrato do seu vínculo com o condomínio e o aviso de quando a assembleia vai começar.',
  },
  {
    id: 'credenciamento',
    titulo: 'Credenciamento — confirme que é você',
    rota: '/credenciamento',
    icone: UserCheck,
    resumo: 'A validação da sua participação, com documento e código de segurança por e-mail.',
  },
  {
    id: 'votacao',
    titulo: 'Votação — a cabine de voto secreto',
    rota: '/votacao',
    icone: Vote,
    resumo: 'Onde você emite seu voto, com privacidade total e um voto por unidade.',
  },
  {
    id: 'recibo',
    titulo: 'Recibo — o comprovante do seu voto',
    rota: '/recibo',
    icone: Receipt,
    resumo: 'O código de conferência e a impressão digital do voto que você emitiu.',
  },
  {
    id: 'documentos',
    titulo: 'Documentos da Assembleia',
    rota: '/documentos-assembleia',
    icone: FolderOpen,
    resumo: 'Edital, pauta, prestação de contas e anexos — tudo em um só lugar.',
  },
  {
    id: 'ata',
    titulo: 'Ata da Assembleia',
    rota: '/ata-assembleia',
    icone: FileText,
    resumo: 'O documento oficial com tudo o que foi decidido, assinado pela mesa.',
  },
]

const ManualMoradorPage: React.FC = () => {
  const navigate = useNavigate()
  const { suportaVoz, estado, secaoAtual, narrar, pausarOuContinuar, parar } = useNarracao()

  const narrando = estado === 'tocando'
  const emPausa = estado === 'pausado'

  const abrirImpressao = () => {
    window.print()
  }

  const ouvir = (id: string) => {
    narrar(id, NARRACOES[id] || '')
  }

  const irPara = (rota: string) => navigate(rota)

  const rolarParaSecao = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const contadoresPorSecao = useMemo(() => SECOES.length, [])

  return (
    <div className="min-h-screen bg-[#F3F7FC] pb-16">
      <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6">
        <CapaManual onImprimir={abrirImpressao} onRolarParaIa={() => rolarParaSecao('ia-koinon')} />

        {/* Índice */}
        <nav
          id="guia-conteudo"
          aria-label="Índice do manual"
          className="print-block mt-8 rounded-2xl border border-[#002B5E]/10 bg-white p-5 shadow-sm"
        >
          <h2 className="font-poppins text-lg font-bold text-[#002B5E]">Conteúdo do manual</h2>
          <ol className="mt-3 grid gap-2 sm:grid-cols-2">
            {SECOES.map((s, i) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  onClick={(e) => {
                    e.preventDefault()
                    rolarParaSecao(s.id)
                  }}
                  className="group flex items-center gap-2.5 rounded-xl border border-slate-100 px-3 py-2.5 text-sm text-slate-600 transition-colors hover:border-[#0066FF]/30 hover:bg-[#0066FF]/5 cursor-pointer"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#002B5E] text-[11px] font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="flex-1">{s.titulo}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-300 transition-colors group-hover:text-[#0066FF]" />
                </a>
              </li>
            ))}
            <li>
              <a
                href="#ia-koinon"
                onClick={(e) => {
                  e.preventDefault()
                  rolarParaSecao('ia-koinon')
                }}
                className="group flex items-center gap-2.5 rounded-xl border border-slate-100 px-3 py-2.5 text-sm text-slate-600 transition-colors hover:border-[#0066FF]/30 hover:bg-[#0066FF]/5 cursor-pointer"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0066FF] text-[11px] font-bold text-white">
                  7
                </span>
                <span className="flex-1">Pergunte à IA do Koinon</span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-300 transition-colors group-hover:text-[#0066FF]" />
              </a>
            </li>
          </ol>
        </nav>

        {/* Seção de abertura */}
        <section className="mt-10 space-y-5">
          <TituloSecao
            secao={{
              id: 'intro',
              titulo: 'Como funciona a assembleia eletrônica',
              rota: 'ciclo completo',
              icone: HelpCircle,
            }}
            onOuvir={() => ouvir('intro')}
            narrando={narrando && secaoAtual === 'intro'}
            emPausa={emPausa}
            suportaVoz={suportaVoz}
            onPausar={pausarOuContinuar}
            onParar={parar}
          />
          <p className="print-block text-sm leading-relaxed text-slate-600">
            A assembleia eletrônica do Lago Azul segue um ciclo completo, do cadastro à ata. Veja as
            seis etapas — e onde cada página do Módulo do Morador entra nessa história.
          </p>
          <MockupFluxoCompleto />
          <CaixaImportante>
            Nada no sistema substitui a mesa diretora: em qualquer etapa, a conferência final é
            sempre humana. O Koinon registra, organiza e protege as informações — e a mesa valida.
          </CaixaImportante>
        </section>

        {/* Seções das páginas */}
        {SECOES.map((s) => (
          <section key={s.id} className="mt-12 space-y-5">
            <TituloSecao
              secao={s}
              onOuvir={() => ouvir(s.id)}
              narrando={narrando && secaoAtual === s.id}
              emPausa={emPausa}
              suportaVoz={suportaVoz}
              onPausar={pausarOuContinuar}
              onParar={parar}
            />
            <p className="print-block text-sm leading-relaxed text-slate-600">{s.resumo}</p>
            <MockupSecao id={s.id} onIrPara={irPara} />
          </section>
        ))}

        {/* IA do Koinon */}
        <section className="mt-12 space-y-4">
          <TituloSecao
            secao={{
              id: 'ia-koinon',
              titulo: 'Pergunte à IA do Koinon',
              rota: 'assistente integrado',
              icone: MessageCircleQuestion,
            }}
            onOuvir={() => ouvir('informacoes')}
            narrando={narrando && secaoAtual === 'ia-koinon'}
            emPausa={emPausa}
            suportaVoz={suportaVoz}
            onPausar={pausarOuContinuar}
            onParar={parar}
          />
          <p className="print-block text-sm leading-relaxed text-slate-600">
            Tem alguma dúvida que o manual não respondeu? Pergunte à IA do Koinon: ela conhece cada
            página do Módulo do Morador e explica em linguagem simples. A conversa não registra seus
            dados pessoais.
          </p>
          <PainelIaManual />
        </section>

        {/* O que acontece com as minhas informações */}
        <section className="mt-12 space-y-5">
          <TituloSecao
            secao={{
              id: 'informacoes',
              titulo: 'O que acontece com as minhas informações',
              rota: 'fluxo do sistema',
              icone: LayoutDashboard,
            }}
            onOuvir={() => ouvir('informacoes')}
            narrando={narrando && secaoAtual === 'informacoes'}
            emPausa={emPausa}
            suportaVoz={suportaVoz}
            onPausar={pausarOuContinuar}
            onParar={parar}
          />
          <p className="print-block text-sm leading-relaxed text-slate-600">
            Cada ação sua no Módulo do Morador alimenta o restante do sistema. Veja o caminho, do
            credenciamento à auditoria.
          </p>
          <FluxoInformacoes />
        </section>

        {/* FAQ */}
        <section className="mt-12 space-y-5">
          <TituloSecao
            secao={{
              id: 'faq',
              titulo: 'Perguntas frequentes (FAQ)',
              rota: 'dúvidas comuns',
              icone: HelpCircle,
            }}
            onOuvir={() => ouvir('faq')}
            narrando={narrando && secaoAtual === 'faq'}
            emPausa={emPausa}
            suportaVoz={suportaVoz}
            onPausar={pausarOuContinuar}
            onParar={parar}
          />
          <FaqCurto />
          <CaixaDica>
            Regras como quórum e quem pode votar em caso de inadimplência são decididas em
            deliberação da assembleia — quando tiver dúvida sobre a regra vale usar a IA do Koinon
            ou perguntar à mesa diretora antes de votar.
          </CaixaDica>
        </section>

        {/* Rodapé institucional */}
        <footer className="print-block mt-14 rounded-2xl border border-[#002B5E]/10 bg-white p-6 text-center shadow-sm">
          <div className="flex items-center justify-center gap-3">
            <KoinonSymbol size={36} />
            <span className="font-poppins text-sm font-bold text-[#002B5E]">Koinon</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Assembleia Eletrônica Lago Azul — apuração conferida pela mesa
          </p>
          <div className="mt-3 flex justify-center">
            <span className="text-[11px] text-slate-400">
              Manual do Módulo do Morador · {contadoresPorSecao} páginas explicadas · atualizado em
              2026
            </span>
          </div>
        </footer>
      </div>
    </div>
  )
}

/* Mockup + legenda de cada seção, com dados fiéis a cada tela real */
const MockupSecao: React.FC<{ id: string; onIrPara: (rota: string) => void }> = ({
  id,
  onIrPara,
}) => {
  if (id === 'situacao') {
    return (
      <div className="space-y-4">
        <MockupTela
          titulo="koinon · Minha Situação"
          marcadores={[
            { n: 1, x: 88, y: 8 },
            { n: 2, x: 30, y: 32 },
            { n: 3, x: 72, y: 32 },
            { n: 4, x: 50, y: 84 },
          ]}
        >
          <MockupMinhaSituacao />
        </MockupTela>
        <LegendaNumerada
          itens={[
            {
              n: 1,
              titulo: 'Aviso da assembleia',
              texto:
                'Quando houver assembleia marcada ou em andamento, este aviso aparece com botões diretos para credenciamento e votação.',
            },
            {
              n: 2,
              titulo: 'Seu cadastro',
              texto: 'Nome, unidade e vínculo com o condomínio, e se a mesa já aprovou o cadastro.',
            },
            {
              n: 3,
              titulo: 'Situação financeira',
              texto:
                'Resumo informativo de pendências. Não substitui o boleto nem o extrato oficial do condomínio.',
            },
            {
              n: 4,
              titulo: 'Botões de atalho',
              texto:
                'Com a votação aberta, os atalhos levam direto ao credenciamento e à cabine de votação.',
            },
          ]}
        />
      </div>
    )
  }
  if (id === 'credenciamento') {
    return (
      <div className="space-y-4">
        <MockupTela
          titulo="koinon · Credenciamento"
          marcadores={[
            { n: 1, x: 20, y: 22 },
            { n: 2, x: 55, y: 38 },
            { n: 3, x: 42, y: 60 },
            { n: 4, x: 50, y: 92 },
          ]}
        >
          <MockupCredenciamento />
        </MockupTela>
        <LegendaNumerada
          itens={[
            {
              n: 1,
              titulo: 'Seus dados',
              texto:
                'CPF e vínculo com a unidade (proprietário, inquilino etc.). Confira com calma antes de seguir.',
            },
            {
              n: 2,
              titulo: 'Documento (se a mesa pedir)',
              texto:
                'Foto ou PDF de um documento que comprove o vínculo. Anexar é simples, como enviar uma foto no WhatsApp.',
            },
            {
              n: 3,
              titulo: 'Código de segurança (OTP)',
              texto:
                'Chega por e-mail. São seis números que valem por poucos minutos. Digite-os na tela para provar que é você.',
            },
            {
              n: 4,
              titulo: 'Aprovação da mesa',
              texto:
                'Depois do código, a mesa diretora confirma seu credenciamento. Aí você entra na lista de presença da assembleia.',
            },
          ]}
        />
        <CaixaImportante>
          OTP é a sigla de “senha de uso único”. Pense nela como aquele código que o banco manda no
          celular para confirmar uma transferência: serve uma vez, dura pouco e ninguém mais deve
          usá-lo. No Koinon ele chega por e-mail.
        </CaixaImportante>
        <CaixaDica>
          Não achou o código? Olhe a caixa de spam/lixo eletrônico e confira se o e-mail cadastrado
          está correto. Ainda nada? Peça à mesa para reenviar — e mantenha a tela aberta enquanto
          espera.
        </CaixaDica>
      </div>
    )
  }
  if (id === 'votacao') {
    return (
      <div className="space-y-4">
        <MockupTela
          titulo="koinon · Cabine de Votação"
          marcadores={[
            { n: 1, x: 50, y: 14 },
            { n: 2, x: 30, y: 40 },
            { n: 3, x: 50, y: 66 },
            { n: 4, x: 50, y: 90 },
          ]}
        >
          <MockupVotacao />
        </MockupTela>
        <LegendaNumerada
          itens={[
            {
              n: 1,
              titulo: 'Item da pauta',
              texto:
                'Cada item em votação aparece um de cada vez, com a descrição completa da proposta.',
            },
            {
              n: 2,
              titulo: 'Sua escolha',
              texto:
                'Favorável (concordo), Contrário (discordo) ou Abstenção (não vou opinar, mas estou presente). Em algumas votações aparecem também Nulo e Branco.',
            },
            {
              n: 3,
              titulo: 'Confirmar voto',
              texto: 'Confira bem antes de tocar: confirmado o voto, não dá para mudar nem apagar.',
            },
            {
              n: 4,
              titulo: 'Sigilo garantido',
              texto:
                'O sistema separa a sua identidade do conteúdo do voto. Ninguém — nem a mesa — consegue descobrir em que você votou.',
            },
          ]}
        />
        <CaixaImportante>
          Cada unidade tem um voto. Se a sua casa tem mais de um morador cadastrado, combinem entre
          vocês quem vai votar — o sistema aceita somente o primeiro voto confirmado da unidade em
          cada item.
        </CaixaImportante>
      </div>
    )
  }
  if (id === 'recibo') {
    return (
      <div className="space-y-4">
        <MockupTela
          titulo="koinon · Recibo"
          marcadores={[
            { n: 1, x: 30, y: 16 },
            { n: 2, x: 28, y: 44 },
            { n: 3, x: 72, y: 44 },
          ]}
        >
          <MockupRecibo />
        </MockupTela>
        <LegendaNumerada
          itens={[
            {
              n: 1,
              titulo: 'Comprovante por assembleia',
              texto:
                'Cada assembleia em que você votou tem o seu recibo, com data e hora do registro.',
            },
            {
              n: 2,
              titulo: 'Código de conferência',
              texto:
                'É o “RG do seu voto”. Guarde-o: ele permite conferir que o seu voto entrou na apuração, sem revelar em que você votou.',
            },
            {
              n: 3,
              titulo: 'Hash (impressão digital)',
              texto:
                'Uma sequência única gerada a partir do seu voto — como a digital do dedo. Qualquer alteração no voto muda o hash na hora, e isso aparece na auditoria.',
            },
          ]}
        />
        <CaixaDica>
          Tirou uma foto ou anotou o código? Ótimo. Se ficar qualquer dúvida na apuração, é esse
          código que a mesa usa para localizar o seu voto na conferência.
        </CaixaDica>
      </div>
    )
  }
  if (id === 'documentos') {
    return (
      <div className="space-y-4">
        <MockupTela
          titulo="koinon · Documentos da Assembleia"
          marcadores={[
            { n: 1, x: 50, y: 10 },
            { n: 2, x: 28, y: 36 },
            { n: 3, x: 50, y: 90 },
          ]}
        >
          <MockupDocumentos />
        </MockupTela>
        <LegendaNumerada
          itens={[
            {
              n: 1,
              titulo: 'Pasta da assembleia',
              texto:
                'Os documentos ficam organizados por assembleia, com data e tipo bem visíveis.',
            },
            {
              n: 2,
              titulo: 'Cada documento',
              texto:
                'Edital de convocação, pauta, prestação de contas, convenção, currículos de candidatos, propostas… Abra tocando no documento.',
            },
            {
              n: 3,
              titulo: 'Sempre disponível',
              texto:
                'Você pode ler na hora ou baixar para o celular. Os documentos continuam disponíveis mesmo depois da assembleia terminar.',
            },
          ]}
        />
        <CaixaImportante>
          O edital é a convocação oficial: nele estão data, hora, local/link e os assuntos que serão
          votados. Ler o edital com antecedência evita surpresas no dia da assembleia.
        </CaixaImportante>
      </div>
    )
  }
  if (id === 'ata') {
    return (
      <div className="space-y-4">
        <MockupTela
          titulo="koinon · Ata da Assembleia"
          marcadores={[
            { n: 1, x: 78, y: 14 },
            { n: 2, x: 50, y: 40 },
            { n: 3, x: 30, y: 66 },
          ]}
        >
          <MockupAta />
        </MockupTela>
        <LegendaNumerada
          itens={[
            {
              n: 1,
              titulo: 'Status da ata',
              texto:
                'Enquanto a mesa está redigindo, a ata aparece como “em elaboração”. Quando publicada, todos os moradores têm acesso.',
            },
            {
              n: 2,
              titulo: 'Texto oficial',
              texto:
                'Tudo o que foi discutido e decidido, com as deliberações e os resultados das votações.',
            },
            {
              n: 3,
              titulo: 'Assinaturas eletrônicas',
              texto:
                'A ata é assinada pela mesa diretora. As assinaturas eletrônicas garantem que o documento não foi alterado depois de assinado.',
            },
          ]}
        />
        <CaixaDica>
          A ata substitui, para todos os efeitos, a ata escrita à mão dos tempos de papel. Guarde o
          arquivo PDF no seu celular ou computador — ele é a sua prova oficial das decisões.
        </CaixaDica>
      </div>
    )
  }
  return null
}

/* ---------- Fluxo das informações (seção final) ---------- */
const FluxoInformacoes: React.FC = () => {
  const passos = [
    {
      de: 'Você credencia',
      para: 'Lista de presença da mesa',
      texto:
        'Seu credenciamento aprovado entra na lista de presença oficial, marcado como presencial ou remoto, com nome, unidade e vínculo.',
    },
    {
      de: 'Você vota',
      para: 'Cédula com hash encadeado',
      texto:
        'Seu voto vira uma cédula eletrônica com uma impressão digital (hash) ligada à anterior — como elos de uma corrente. Se alguém tentar mexer, a corrente quebra e o sistema avisa.',
    },
    {
      de: 'A mesa apura',
      para: 'Boletim da urna',
      texto:
        'A apuração soma os votos por item da pauta, confere os hashes e compara com o quórum exigido. O resultado vira o boletim da urna, conferido pela mesa.',
    },
    {
      de: 'A mesa registra',
      para: 'Ata e dossiê assinados',
      texto:
        'Os resultados entram na ata e no dossiê para cartório, ambos com assinaturas eletrônicas da mesa. É o documento oficial das decisões.',
    },
    {
      de: 'Tudo fica registrado',
      para: 'Auditoria verificável',
      texto:
        'Cada passo — cadastro, credenciamento, voto, apuração — fica registrado com data e hora. Qualquer morador pode pedir conferência à mesa; nada é apagado.',
    },
  ]
  return (
    <div className="space-y-3">
      {passos.map((p, i) => (
        <div key={p.de} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#0066FF] to-[#002B5E] text-[13px] font-bold text-white">
              {i + 1}
            </span>
            {i < passos.length - 1 && (
              <span className="my-1 w-px flex-1 bg-[#0066FF]/20" aria-hidden />
            )}
          </div>
          <div className="flex-1 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
            <p className="text-sm font-bold text-[#002B5E]">
              {p.de} <span className="text-[#0066FF]">→</span> {p.para}
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{p.texto}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ---------- FAQ ---------- */
const FaqCurto: React.FC = () => {
  const perguntas = [
    {
      p: 'Esqueci minha senha. E agora?',
      r: 'Na tela de login, toque em “Esqueci minha senha”. Você receberá um e-mail para criar uma nova. Se o e-mail não chegar em alguns minutos, confira o spam.',
    },
    {
      p: 'Não recebi o código OTP no meu e-mail.',
      r: 'Espere um minuto e confira a caixa de spam. Ainda nada? Peça à mesa para reenviar o código. Cada código vale por pouco tempo — se demorar demais, peça um novo.',
    },
    {
      p: 'Já votei, mas me arrependi. Posso mudar o voto?',
      r: 'Não. Assim que o voto é confirmado, ele é registrado com a impressão digital (hash) e não pode mais ser alterado nem apagado — é isso que garante a segurança da votação. Por isso a tela pede para você conferir antes de confirmar.',
    },
    {
      p: 'Estou com pendências financeiras. Posso votar?',
      r: 'Depende do que a assembleia decidir. O Condomínio Lago Azul configura essa regra a cada deliberação — em algumas votações o morador com pendências pode votar, em outras não. Em caso de dúvida, pergunte à mesa diretora antes de votar.',
    },
    {
      p: 'Minha unidade tem dois moradores cadastrados. Quem vota?',
      r: 'A unidade tem um voto. Combinem entre vocês quem vai votar em cada assembleia — o sistema aceita apenas o primeiro voto confirmado da unidade em cada item.',
    },
    {
      p: 'Preciso estar em casa para votar?',
      r: 'Não. O módulo do morador funciona de qualquer lugar, pelo celular ou computador, com internet. No credenciamento você indica se está presencial (no salão) ou remoto.',
    },
  ]
  const [aberta, setAberta] = React.useState<number | null>(0)
  return (
    <div className="space-y-2">
      {perguntas.map((item, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm"
        >
          <button
            type="button"
            onClick={() => setAberta(aberta === i ? null : i)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
            aria-expanded={aberta === i}
          >
            <span className="text-sm font-semibold text-[#002B5E]">{item.p}</span>
            <span
              className={`shrink-0 text-[#0066FF] transition-transform ${aberta === i ? 'rotate-180' : ''}`}
              aria-hidden
            >
              ▼
            </span>
          </button>
          {aberta === i && (
            <p className="border-t border-slate-50 bg-[#F3F7FC]/60 px-4 py-3 text-[13px] leading-relaxed text-slate-600">
              {item.r}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

export default ManualMoradorPage
