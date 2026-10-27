import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  api,
  type DeliberacaoRecord,
  type ItemPautaRecord,
  type EditalDeliberacaoRecord,
  type AssinaturaDocumentoRecord,
} from '@/lib/api'
import { useCondoConfig } from '@/context/CondoConfigContext'
import { formatarCpf } from '@/lib/cpf'
import { imprimirOuBaixarPdfEdital, type DadosEditalPdf } from '@/lib/pdfEdital'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SafeHtml } from '@/components/editor/SafeHtml'
import { BlocoAssinaturaCompacto } from '@/components/assinatura/BlocoAssinaturaCompacto'
import {
  Printer,
  Download,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ShieldCheck,
} from 'lucide-react'

export const EditalDocumentoPage: React.FC = () => {
  const { deliberacaoId } = useParams<{ deliberacaoId: string }>()
  const navigate = useNavigate()
  const { nomeCondominio, logoUrl } = useCondoConfig()

  const [deliberacao, setDeliberacao] = useState<DeliberacaoRecord | null>(null)
  const [itensPauta, setItensPauta] = useState<ItemPautaRecord[]>([])
  const [editalSalvo, setEditalSalvo] = useState<EditalDeliberacaoRecord | null>(null)
  const [assinatura, setAssinatura] = useState<AssinaturaDocumentoRecord | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    const carregar = async () => {
      setCarregando(true)
      try {
        let dId = deliberacaoId
        if (!dId) {
          const ativa = await api.getDeliberacaoAtiva()
          dId = ativa?.id
        }

        if (!dId) {
          setErro('Nenhuma assembleia encontrada.')
          setCarregando(false)
          return
        }

        const [delib, itens, edital, assinaturas] = await Promise.all([
          api.getDeliberacao(dId),
          api.getItensPauta(dId),
          api.getEditalPorDeliberacao(dId),
          api.getAssinaturasPorDeliberacao(dId),
        ])

        setDeliberacao(delib)
        setItensPauta(itens)
        setEditalSalvo(edital)

        const assEdital = assinaturas.find(
          (a) => a.documento_tipo === 'edital' && a.status === 'valida',
        )
        setAssinatura(assEdital || null)
      } catch (err: any) {
        console.error('Erro ao carregar edital para visualização/impressão:', err)
        setErro(err?.message || 'Falha ao processar dados do edital.')
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [deliberacaoId])

  // Montar dados consolidados do documento
  const dadosConsolidados: DadosEditalPdf | null = deliberacao
    ? {
        nomeCondominio,
        logoUrl: logoUrl || undefined,
        titulo: editalSalvo?.titulo || deliberacao.titulo || 'Assembleia Geral de Condôminos',
        subtitulo:
          editalSalvo?.subtitulo || 'Convocação Formal aos Senhores Condôminos e Moradores',
        textoAbertura:
          editalSalvo?.texto_abertura ||
          `O Síndico e a Mesa Diretora do ${nomeCondominio}, no uso de suas atribuições legais conferidas pelo Código Civil Brasileiro (Lei nº 10.406/2002, art. 1.350) e pela Convenção Condominial, vêm por meio deste CONVOCAR todos os senhores condôminos titulares de unidades autônomas a se reunirem em Assembleia Geral:`,
        dataAssembleia: editalSalvo?.data_assembleia || 'Conforme cronograma da assembleia',
        primeiraConvocacao: editalSalvo?.primeira_convocacao || '19:00',
        segundaConvocacao: editalSalvo?.segunda_convocacao || '19:30',
        localTexto:
          editalSalvo?.local_texto || 'Salão de Festas do Condomínio / Plataforma Virtual Koinon',
        itensPauta: itensPauta.map((it) => ({
          ordem: it.ordem,
          titulo: it.titulo,
          texto: it.texto,
        })),
        ordemDiaCustom: editalSalvo?.ordem_dia_custom || '',
        disposicoesGerais:
          editalSalvo?.disposicoes_gerais ||
          'Os condôminos poderão votar presencialmente ou por meio da Plataforma Virtual Koinon. É admitida representação por procuração com firma reconhecida ou assinatura eletrônica idônea.',
        regrasParticipacao:
          editalSalvo?.regras_participacao ||
          `• Quórum de aprovação por matéria: ${deliberacao.quorum_materia || 'Maioria simples'}.\n• Voto de condômino inadimplente: ${deliberacao.inadimplente_pode_votar ? 'Permitido' : 'Vedado'} (conforme convenção).\n• Voto de locatário: ${deliberacao.locatario_pode_votar ? 'Permitido' : 'Vedado'}.\n• Modalidade de voto: ${deliberacao.tipo_cedula === 'secreta' ? 'Cédula Secreta com criptografia SHA-256' : 'Votação Aberta Nominal'}.`,
        sindicoNome:
          editalSalvo?.sindico_nome ||
          assinatura?.assinante_nome ||
          deliberacao.mesa_presidente_nome ||
          'Síndico(a) / Mesa Diretora',
        sindicoCpf: formatarCpf(
          editalSalvo?.sindico_cpf ||
            assinatura?.assinante_cpf ||
            deliberacao.mesa_presidente_cpf ||
            '',
        ),
        cargoConvocante:
          editalSalvo?.cargo_convocante || `Representante Legal do ${nomeCondominio}`,
        status: editalSalvo?.status || (assinatura ? 'assinado' : 'rascunho'),
        hashAssinatura: editalSalvo?.hash_assinado || assinatura?.hash_documento || null,
        dataAssinatura:
          editalSalvo?.data_assinatura || assinatura?.data_hora || assinatura?.created || null,
        formatoAssinatura:
          editalSalvo?.formato_assinatura || assinatura?.formato_assinatura || 'desenho',
        assinaturaVisual:
          editalSalvo?.assinatura_visual || assinatura?.assinatura_visual || undefined,
        assinaturaTexto: editalSalvo?.assinatura_texto || assinatura?.assinatura_texto || undefined,
      }
    : null

  const handleImprimir = () => {
    window.print()
  }

  const handleBaixarPdf = () => {
    if (!dadosConsolidados) return
    imprimirOuBaixarPdfEdital(dadosConsolidados)
  }

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-700 text-sm">
        Carregando Edital Oficial de Convocação...
      </div>
    )
  }

  if (erro || !deliberacao || !dadosConsolidados) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <AlertTriangle className="h-10 w-10 text-amber-600 mb-2" />
        <h2 className="text-lg font-bold text-slate-900">Edital Não Disponível</h2>
        <p className="text-xs text-slate-600 mt-1 max-w-md">{erro || 'Dados não localizados.'}</p>
        <Button
          onClick={() => navigate('/mesa/documentos')}
          variant="outline"
          className="mt-4 text-xs"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Voltar para Documentos
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-8 print:p-0 print:bg-white text-slate-900">
      {/* Barra Superior de Ações (Oculta na impressão) */}
      <div className="max-w-[850px] mx-auto mb-6 flex items-center justify-between print:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/mesa/documentos')}
          className="text-xs gap-1.5 bg-white border-slate-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao Painel
        </Button>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleBaixarPdf}
            variant="outline"
            className="bg-white hover:bg-slate-50 border-slate-300 text-slate-800 text-xs gap-1.5"
          >
            <Download className="h-3.5 w-3.5" /> Baixar PDF
          </Button>
          <Button
            size="sm"
            onClick={handleImprimir}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs gap-1.5"
          >
            <Printer className="h-3.5 w-3.5" /> Imprimir Edital A4
          </Button>
        </div>
      </div>

      {/* DOCUMENTO OFICIAL A4 */}
      <article className="max-w-[850px] mx-auto bg-white border border-slate-300 shadow-md print:shadow-none print:border-none p-8 sm:p-12 rounded-lg print:p-0 font-serif leading-relaxed">
        {/* Cabeçalho */}
        <header className="border-b-2 border-slate-900 pb-4 mb-6 font-sans">
          <div className="flex items-center justify-between gap-4">
            {logoUrl && (
              <img
                src={logoUrl}
                alt={nomeCondominio}
                className="h-14 w-14 object-contain print:h-12 print:w-12"
              />
            )}
            <div className="flex-1 text-center">
              <span className="text-[10px] uppercase tracking-widest font-bold text-cyan-800 block">
                Edital Oficial de Convocação
              </span>
              <h1 className="text-xl font-bold text-slate-950 uppercase">{nomeCondominio}</h1>
              <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Assembleia Geral de Condôminos
              </p>
            </div>
            <div className="text-right text-[11px] font-mono text-slate-600">
              <span>Emissão:</span>
              <br />
              <strong>{new Date().toLocaleDateString('pt-BR')}</strong>
              <div className="mt-1">
                <Badge
                  variant="outline"
                  className="text-[9px] uppercase px-1.5 py-0 border-slate-400"
                >
                  {dadosConsolidados.hashAssinatura ? 'Assinado' : 'Rascunho'}
                </Badge>
              </div>
            </div>
          </div>
        </header>

        {/* Título Principal */}
        <div className="text-center space-y-1 border-b border-slate-200 pb-4 mb-6">
          <h2 className="text-lg font-bold text-slate-950 uppercase tracking-wide">
            {dadosConsolidados.titulo}
          </h2>
          {dadosConsolidados.subtitulo && (
            <p className="text-xs text-slate-600 font-sans italic">{dadosConsolidados.subtitulo}</p>
          )}
        </div>

        {/* Corpo do Edital */}
        <div className="space-y-4 text-xs font-sans">
          <div className="text-justify leading-relaxed text-slate-800">
            <SafeHtml content={dadosConsolidados.textoAbertura} />
          </div>

          <div className="bg-slate-50 border border-slate-300 p-4 rounded-md space-y-2">
            <p>
              <strong>• Data da Assembleia:</strong> {dadosConsolidados.dataAssembleia}
            </p>
            <p>
              <strong>• 1ª Convocação:</strong> às {dadosConsolidados.primeiraConvocacao} horas (com
              quórum legal).
            </p>
            <p>
              <strong>• 2ª Convocação:</strong> às {dadosConsolidados.segundaConvocacao} horas (com
              qualquer número de presentes).
            </p>
            <p>
              <strong>• Local / Plataforma:</strong> {dadosConsolidados.localTexto}
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
              Ordem do Dia / Pauta de Deliberações:
            </h3>
            {dadosConsolidados.ordemDiaCustom &&
            dadosConsolidados.ordemDiaCustom.trim().length > 0 ? (
              <div className="text-slate-800 pl-2">
                <SafeHtml content={dadosConsolidados.ordemDiaCustom} />
              </div>
            ) : (
              <ol className="list-decimal list-inside space-y-1.5 pl-2">
                {dadosConsolidados.itensPauta.length > 0 ? (
                  dadosConsolidados.itensPauta.map((it) => (
                    <li key={it.ordem} className="text-xs text-slate-800">
                      <strong>{it.titulo}</strong>
                      {it.texto && (
                        <span className="text-slate-600 block pl-4 font-normal">{it.texto}</span>
                      )}
                    </li>
                  ))
                ) : (
                  <li className="text-xs text-slate-500 italic">
                    Nenhum item de pauta adicionado ainda nesta deliberação.
                  </li>
                )}
              </ol>
            )}
          </div>

          <div className="space-y-2 pt-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
              Disposições Gerais e Instruções:
            </h3>
            <div className="text-justify leading-relaxed text-slate-700">
              <SafeHtml content={dadosConsolidados.disposicoesGerais} />
            </div>
          </div>

          {dadosConsolidados.regrasParticipacao && (
            <div className="space-y-2 pt-2">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
                Regras de Participação e Convenção:
              </h3>
              <div className="text-justify leading-relaxed text-slate-700">
                <SafeHtml content={dadosConsolidados.regrasParticipacao} />
              </div>
            </div>
          )}
        </div>

        {/* Rodapé e Assinatura Eletrônica */}
        <div className="mt-12 pt-8 border-t-2 border-slate-900 font-sans text-center break-inside-avoid">
          <BlocoAssinaturaCompacto
            nome={dadosConsolidados.sindicoNome}
            cpf={dadosConsolidados.sindicoCpf}
            cargo={dadosConsolidados.cargoConvocante}
            formato={dadosConsolidados.formatoAssinatura}
            assinaturaVisual={dadosConsolidados.assinaturaVisual}
            assinaturaTexto={dadosConsolidados.assinaturaTexto}
            alinhamento="center"
          />

          {/* Selo Criptográfico de Assinatura */}
          {dadosConsolidados.hashAssinatura ? (
            <div className="mt-4 p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-left space-y-1 font-mono text-[10px]">
              <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>DOCUMENTO ASSINADO DIGITALMENTE (SHA-256)</span>
              </div>
              <p className="text-slate-600 break-all">
                <strong>Hash:</strong> {dadosConsolidados.hashAssinatura}
              </p>
              <p className="text-slate-500">
                <strong>Data/Hora do Carimbo:</strong>{' '}
                {dadosConsolidados.dataAssinatura
                  ? new Date(dadosConsolidados.dataAssinatura).toLocaleString('pt-BR')
                  : 'Registrado no ato'}
              </p>
            </div>
          ) : (
            <div className="mt-4 p-2.5 rounded border border-dashed border-slate-300 text-[11px] text-slate-500 italic">
              Documento em rascunho / aguardando assinatura eletrônica do convocante.
            </div>
          )}
        </div>
      </article>
    </div>
  )
}

export default EditalDocumentoPage
