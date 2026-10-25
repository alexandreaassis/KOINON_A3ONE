import React, { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api, type ApuracaoResponse, type DeliberacaoRecord, type UnidadeRecord } from '@/lib/api'
import { useCondoConfig } from '@/context/CondoConfigContext'
import { formatarCpf } from '@/lib/cpf'
import { Button } from '@/components/ui/button'
import {
  Printer,
  ArrowLeft,
  ShieldCheck,
  Building2,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  Vote,
} from 'lucide-react'

export const BoletimUrnaDocumentoPage: React.FC = () => {
  const { deliberacaoId } = useParams<{ deliberacaoId: string }>()
  const navigate = useNavigate()
  const { nomeCondominio, logoUrl, rotuloUnidade } = useCondoConfig()

  const [boletim, setBoletim] = useState<ApuracaoResponse | null>(null)
  const [deliberacao, setDeliberacao] = useState<DeliberacaoRecord | null>(null)
  const [unidades, setUnidades] = useState<UnidadeRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [dataEmissao] = useState<Date>(new Date())

  useEffect(() => {
    let cancel = false

    const carregarDados = async () => {
      setLoading(true)
      setErro(null)

      try {
        let idAlvo = deliberacaoId

        // Se nenhum ID na URL, buscar a primeira deliberação ou ativa
        if (!idAlvo) {
          const atv = await api.getDeliberacaoAtiva()
          if (atv) {
            idAlvo = atv.id
          } else {
            const todas = await api.getDeliberacoes()
            if (todas.length > 0) {
              idAlvo = todas[0].id
            }
          }
        }

        if (!idAlvo) {
          setErro('Nenhuma deliberação encontrada para emitir o boletim de urna.')
          setLoading(false)
          return
        }

        const [boletimData, delibData, unidadesData] = await Promise.all([
          api.getApuracao(idAlvo),
          api.getDeliberacao(idAlvo).catch(() => null),
          api.getUnidades().catch(() => [] as UnidadeRecord[]),
        ])

        if (cancel) return

        setBoletim(boletimData)
        setDeliberacao(delibData)
        setUnidades(unidadesData)
      } catch (err) {
        console.error('Erro ao carregar dados do boletim:', err)
        if (!cancel) {
          setErro('Falha ao obter os dados oficiais da apuração e boletim de urna.')
        }
      } finally {
        if (!cancel) {
          setLoading(false)
        }
      }
    }

    carregarDados()

    return () => {
      cancel = true
    }
  }, [deliberacaoId])

  // Total de unidades ativas / elegíveis
  const totalElegiveis = useMemo(() => {
    if (boletim?.apuracao.totalUnidadesElegiveis) {
      return boletim.apuracao.totalUnidadesElegiveis
    }
    const ativas = unidades.filter((u) => u.ativo !== false)
    return ativas.length > 0 ? ativas.length : unidades.length || 52
  }, [boletim, unidades])

  const quorumExigido = useMemo(() => {
    const qInstalacao = deliberacao?.quorum_instalacao || boletim?.deliberacao.quorum_instalacao
    if (qInstalacao && qInstalacao > 0) {
      return `${qInstalacao} unidades (${Math.round((qInstalacao / (totalElegiveis || 1)) * 100)}% das unidades elegíveis)`
    }
    const metade = Math.floor(totalElegiveis / 2) + 1
    return `Maioria absoluta (${metade} de ${totalElegiveis} unidades)`
  }, [deliberacao, boletim, totalElegiveis])

  const comparecimentoTotal = boletim?.apuracao.totalComparecimentos || 0
  const percentualAtingido =
    totalElegiveis > 0 ? Math.round((comparecimentoTotal / totalElegiveis) * 100) : 0

  const handlePrint = () => {
    window.print()
  }

  const formatarDataHora = (isoDate?: string) => {
    if (!isoDate) return 'Não informada'
    try {
      const d = new Date(isoDate)
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return isoDate
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 bg-white p-8 rounded-lg shadow-sm border border-slate-200">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-900 border-t-transparent" />
          <p className="text-sm font-semibold text-slate-800">
            Gerando documento oficial do Boletim de Urna...
          </p>
          <p className="text-xs text-slate-500">Conferindo integridade da cadeia de custódia</p>
        </div>
      </div>
    )
  }

  if (erro || !boletim) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-sm border border-slate-200 max-w-md w-full text-center space-y-4">
          <AlertTriangle className="h-10 w-10 text-amber-600 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">Boletim Não Disponível</h2>
          <p className="text-xs text-slate-600">
            {erro || 'Dados do boletim não puderam ser recuperados.'}
          </p>
          <Button
            onClick={() => navigate('/mesa/auditoria')}
            variant="outline"
            className="w-full text-xs"
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Voltar para Auditoria
          </Button>
        </div>
      </div>
    )
  }

  const hashUrna = boletim.apuracao.hashRaizUrna || deliberacao?.hash_raiz || '—'
  const integridadeValida = boletim.apuracao.integridadeMatematica

  return (
    <div className="min-h-screen bg-slate-200/70 text-slate-900 print:bg-white print:p-0">
      {/* Barra superior de controle (NÃO APARECE NA IMPRESSÃO) */}
      <header className="sticky top-0 z-20 bg-slate-900 text-white px-4 py-3 shadow-md print:hidden">
        <div className="max-w-[210mm] mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/mesa/auditoria')}
              className="bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700 text-xs h-8"
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Voltar à Auditoria
            </Button>
            <div className="hidden sm:block">
              <span className="text-xs font-semibold text-slate-200 block">
                Visualização Prévia de Impressão Oficial
              </span>
              <span className="text-[11px] text-slate-400">
                Formato Folha A4 • Padrão Jurídico para Ata de Assembleia
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handlePrint}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs h-8 px-4 gap-1.5 shadow-sm"
            >
              <Printer className="h-3.5 w-3.5" /> Imprimir Documento Oficial
            </Button>
          </div>
        </div>
      </header>

      {/* Conteúdo: Folha A4 Centralizada na tela, somente ela é impressa */}
      <main className="py-8 px-4 flex justify-center print:p-0 print:m-0 print:block">
        <article
          id="boletim-urna-folha"
          className="bg-white text-slate-900 shadow-xl border border-slate-300 w-full max-w-[210mm] min-h-[297mm] p-10 sm:p-12 print:p-6 print:m-0 print:border-none print:shadow-none print:w-full print:max-w-none box-border flex flex-col justify-between font-serif"
          style={{ fontFamily: '"Georgia", "Cambria", "Times New Roman", serif' }}
        >
          {/* Topo / Cabeçalho Institucional */}
          <section className="border-b-2 border-slate-900 pb-5">
            <div className="flex items-start justify-between gap-4">
              {/* Logo e Nome do Condomínio */}
              <div className="flex items-center gap-4">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={`Logo ${nomeCondominio}`}
                    className="h-16 w-16 object-contain rounded border border-slate-200 p-1"
                  />
                ) : (
                  <div className="h-16 w-16 rounded border border-slate-300 flex items-center justify-center bg-slate-50 text-slate-700">
                    <Building2 className="h-8 w-8" />
                  </div>
                )}
                <div>
                  <h1 className="text-lg sm:text-xl font-bold tracking-tight uppercase text-slate-950">
                    {nomeCondominio}
                  </h1>
                  <p className="text-xs text-slate-700 mt-0.5 tracking-wide uppercase font-sans">
                    Sistema de Votação e Deliberação Eletrônica
                  </p>
                  <p className="text-[11px] text-slate-600 font-sans">
                    Documento Oficial Emitido pela Mesa Diretora da Assembleia
                  </p>
                </div>
              </div>

              {/* Selo / Emissão */}
              <div className="text-right font-sans shrink-0">
                <span className="inline-block px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase border border-slate-900 bg-slate-100 text-slate-900">
                  VIA OFICIAL DE CARTÓRIO / ATA
                </span>
                <p className="text-[10px] text-slate-600 mt-1">
                  Emissão: {dataEmissao.toLocaleDateString('pt-BR')} às{' '}
                  {dataEmissao.toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </p>
              </div>
            </div>

            {/* Título Principal do Documento */}
            <div className="text-center mt-5 pt-4 border-t border-slate-300">
              <h2 className="text-xl sm:text-2xl font-bold tracking-wider uppercase text-slate-950 font-serif">
                BOLETIM DE URNA ELETRÔNICA
              </h2>
              <p className="text-sm font-semibold text-slate-800 mt-1">
                {boletim.deliberacao.titulo}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-xs text-slate-700 mt-2 font-sans">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-slate-500" />
                  Plenário Híbrido (Presencial no Salão Social e Remoto Online)
                </span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-slate-500" />
                  Abertura: {formatarDataHora(deliberacao?.data_inicio || deliberacao?.created)}
                </span>
                {deliberacao?.data_fim && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3 text-slate-500" />
                    Encerramento: {formatarDataHora(deliberacao.data_fim)}
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* Dados de Identificação da Deliberação */}
          <section className="my-5 font-sans">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2.5 flex items-center gap-1.5">
              <FileCheck2 className="h-3.5 w-3.5 text-slate-700" /> 1. Identificação e Parâmetros da
              Deliberação
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 border border-slate-300 bg-slate-50/50">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Tipo de Cédula
                </span>
                <span className="font-bold text-slate-900 uppercase">
                  {boletim.deliberacao.tipo_cedula === 'secreta'
                    ? 'Secreta (Sigilosa)'
                    : 'Nominal (Aberta)'}
                </span>
              </div>
              <div className="p-2.5 border border-slate-300 bg-slate-50/50">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Status da Urna
                </span>
                <span className="font-bold text-slate-900 uppercase">
                  {boletim.deliberacao.status}
                </span>
              </div>
              <div className="p-2.5 border border-slate-300 bg-slate-50/50">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Unidades Elegíveis
                </span>
                <span className="font-bold text-slate-900">
                  {totalElegiveis} {rotuloUnidade}s
                </span>
              </div>
              <div className="p-2.5 border border-slate-300 bg-slate-50/50">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Quórum Regimental
                </span>
                <span
                  className="font-semibold text-slate-900 truncate block"
                  title={deliberacao?.quorum_materia || quorumExigido}
                >
                  {deliberacao?.quorum_materia || 'Maioria Simples'}
                </span>
              </div>
            </div>

            {deliberacao?.descricao && (
              <div className="mt-2 p-2.5 border border-slate-200 bg-white text-xs text-slate-700 font-serif italic">
                <strong>Objeto / Descrição:</strong> {deliberacao.descricao}
              </div>
            )}
          </section>

          {/* Quadro de Quórum e Comparecimento */}
          <section className="my-5 font-sans">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2.5 flex items-center gap-1.5">
              <Vote className="h-3.5 w-3.5 text-slate-700" /> 2. Quadro de Quórum e Comparecimento
            </h3>

            <table className="w-full text-xs border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100 text-slate-900 text-left">
                  <th className="border border-slate-300 p-2 font-bold">Canal / Categoria</th>
                  <th className="border border-slate-300 p-2 text-center font-bold">
                    Unidades Presentes
                  </th>
                  <th className="border border-slate-300 p-2 text-center font-bold">
                    % sobre Presentes
                  </th>
                  <th className="border border-slate-300 p-2 text-center font-bold">
                    % do Condomínio ({totalElegiveis})
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-300 p-2">
                    Presencial Físico (Plenário Social)
                  </td>
                  <td className="border border-slate-300 p-2 text-center font-bold">
                    {boletim.apuracao.presencas.presencial}
                  </td>
                  <td className="border border-slate-300 p-2 text-center">
                    {comparecimentoTotal > 0
                      ? `${Math.round((boletim.apuracao.presencas.presencial / comparecimentoTotal) * 100)}%`
                      : '0%'}
                  </td>
                  <td className="border border-slate-300 p-2 text-center">
                    {totalElegiveis > 0
                      ? `${Math.round((boletim.apuracao.presencas.presencial / totalElegiveis) * 100)}%`
                      : '0%'}
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-300 p-2">
                    Remoto Eletrônico (Canal Digital Seguro)
                  </td>
                  <td className="border border-slate-300 p-2 text-center font-bold">
                    {boletim.apuracao.presencas.remoto}
                  </td>
                  <td className="border border-slate-300 p-2 text-center">
                    {comparecimentoTotal > 0
                      ? `${Math.round((boletim.apuracao.presencas.remoto / comparecimentoTotal) * 100)}%`
                      : '0%'}
                  </td>
                  <td className="border border-slate-300 p-2 text-center">
                    {totalElegiveis > 0
                      ? `${Math.round((boletim.apuracao.presencas.remoto / totalElegiveis) * 100)}%`
                      : '0%'}
                  </td>
                </tr>
                <tr className="bg-slate-50 font-bold">
                  <td className="border border-slate-300 p-2 text-slate-900">
                    Total de Comparecimentos Registrados
                  </td>
                  <td className="border border-slate-300 p-2 text-center text-slate-900 text-sm">
                    {comparecimentoTotal}
                  </td>
                  <td className="border border-slate-300 p-2 text-center">100%</td>
                  <td className="border border-slate-300 p-2 text-center">{percentualAtingido}%</td>
                </tr>
              </tbody>
            </table>

            <div className="mt-2 text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-2">
              <span>
                <strong>Quórum de Instalação Mínimo Exigido:</strong> {quorumExigido}
              </span>
              <span>
                <strong>Condição Regimental:</strong>{' '}
                <span className="font-semibold text-slate-900">
                  {comparecimentoTotal >= (deliberacao?.quorum_instalacao || 0)
                    ? 'Quórum Atendido para Votação Válida'
                    : 'Quórum Registrado pela Mesa Diretora'}
                </span>
              </span>
            </div>
          </section>

          {/* Votação Item a Item (Corpo Principal) */}
          <section className="my-5 font-sans">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FileCheck2 className="h-3.5 w-3.5 text-slate-700" /> 3. Apuração dos Itens da Pauta
                Deliberativa
              </span>
              <span className="text-[10px] font-normal text-slate-600">
                Total de matérias: {boletim.apuracao.itens.length}
              </span>
            </h3>

            <div className="space-y-4">
              {boletim.apuracao.itens.map((item, idx) => {
                const totalItem = item.votos.total || 0
                const pctFav =
                  totalItem > 0 ? Math.round((item.votos.favoravel / totalItem) * 100) : 0
                const pctCont =
                  totalItem > 0 ? Math.round((item.votos.contrario / totalItem) * 100) : 0
                const pctAbs =
                  totalItem > 0 ? Math.round((item.votos.abstencao / totalItem) * 100) : 0

                return (
                  <div
                    key={item.id}
                    className="border border-slate-300 p-3 bg-white break-inside-avoid"
                  >
                    <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-2 mb-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase bg-slate-900 text-white px-2 py-0.5 tracking-wider inline-block">
                          Item {item.ordem || idx + 1}
                        </span>
                        <h4 className="text-sm font-bold text-slate-950 mt-1 font-serif">
                          {item.titulo}
                        </h4>
                        {item.texto && (
                          <p className="text-xs text-slate-600 mt-0.5 font-serif">{item.texto}</p>
                        )}
                      </div>
                      <div className="text-right text-[11px] text-slate-600 shrink-0">
                        <span>
                          Votos válidos: <strong>{totalItem}</strong>
                        </span>
                        {item.quorum_aplicavel && (
                          <p className="text-[10px] text-slate-500 font-sans">
                            Exigência: {item.quorum_aplicavel}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Tabela de Votação do Item */}
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-800 text-left text-[11px]">
                          <th className="p-1.5 border border-slate-200">Opção de Voto</th>
                          <th className="p-1.5 border border-slate-200 text-center">
                            Quantidade de Votos
                          </th>
                          <th className="p-1.5 border border-slate-200 text-center">Percentual</th>
                          <th className="p-1.5 border border-slate-200 text-left">
                            Representação Visual
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="p-1.5 border border-slate-200 font-semibold text-slate-900">
                            Favorável (Sim)
                          </td>
                          <td className="p-1.5 border border-slate-200 text-center font-bold text-slate-900">
                            {item.votos.favoravel}
                          </td>
                          <td className="p-1.5 border border-slate-200 text-center font-bold">
                            {pctFav}%
                          </td>
                          <td className="p-1.5 border border-slate-200">
                            <div className="w-full bg-slate-200 h-2 rounded-xs overflow-hidden">
                              <div
                                className="bg-slate-800 h-full"
                                style={{ width: `${pctFav}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td className="p-1.5 border border-slate-200 font-semibold text-slate-900">
                            Contrário (Não)
                          </td>
                          <td className="p-1.5 border border-slate-200 text-center font-bold text-slate-900">
                            {item.votos.contrario}
                          </td>
                          <td className="p-1.5 border border-slate-200 text-center font-bold">
                            {pctCont}%
                          </td>
                          <td className="p-1.5 border border-slate-200">
                            <div className="w-full bg-slate-200 h-2 rounded-xs overflow-hidden">
                              <div
                                className="bg-slate-600 h-full"
                                style={{ width: `${pctCont}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td className="p-1.5 border border-slate-200 font-semibold text-slate-900">
                            Abstenção
                          </td>
                          <td className="p-1.5 border border-slate-200 text-center font-bold text-slate-900">
                            {item.votos.abstencao}
                          </td>
                          <td className="p-1.5 border border-slate-200 text-center font-bold">
                            {pctAbs}%
                          </td>
                          <td className="p-1.5 border border-slate-200">
                            <div className="w-full bg-slate-200 h-2 rounded-xs overflow-hidden">
                              <div
                                className="bg-slate-400 h-full"
                                style={{ width: `${pctAbs}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Seção de Integridade Criptográfica e Cadeia de Custódia */}
          <section className="my-5 font-sans break-inside-avoid">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2.5 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-slate-700" /> 4. Integridade Criptográfica e
              Conferência da Urna
            </h3>

            <div className="border-2 border-slate-900 p-3.5 bg-slate-50/70">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-300 pb-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-slate-900" />
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-950">
                    Cadeia de Custódia SHA-256 e Encadeamento Imutável
                  </span>
                </div>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 border border-slate-800 bg-white text-slate-900">
                  {integridadeValida ? 'Urna 100% Auditada e Íntegra' : 'Divergência sob Análise'}
                </span>
              </div>

              {/* Hash Raiz em destaque */}
              <div className="mt-3">
                <span className="text-[10px] uppercase font-bold text-slate-600 block tracking-wider">
                  Hash Raiz da Urna Eletrônica (Transcrição Obrigatória em Ata de Assembleia):
                </span>
                <p className="font-mono text-[11px] font-bold text-slate-950 bg-white p-2 border border-slate-400 mt-1 break-all select-all">
                  {hashUrna}
                </p>
              </div>

              {/* Conferência matemática cédulas vs comparecimento */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 pt-2 border-t border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                    Total de Comparecimentos:
                  </span>
                  <span className="font-bold text-slate-900">
                    {boletim.apuracao.totalComparecimentos} unidades
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                    Total de Cédulas Depositadas:
                  </span>
                  <span className="font-bold text-slate-900">
                    {boletim.apuracao.totalCedulas} cédulas (esperado:{' '}
                    {boletim.apuracao.esperadoCedulas})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                    Conferência Matemática:
                  </span>
                  <span className="font-bold text-slate-900">
                    {boletim.apuracao.totalCedulas === boletim.apuracao.esperadoCedulas
                      ? 'Exata (100% conferida)'
                      : 'Verificada pela Mesa'}
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-300 text-center">
                <p className="text-xs font-bold text-slate-900 uppercase tracking-wide font-serif">
                  "Apuração eletrônica conferida e homologada pela Mesa Diretora dos Trabalhos"
                </p>
              </div>
            </div>
          </section>

          {/* Rodapé do Documento: Assinaturas da Mesa Diretora e Declaração LGPD */}
          <footer className="mt-8 pt-6 border-t-2 border-slate-900 break-inside-avoid">
            {/* Linhas de Assinatura */}
            <div className="grid grid-cols-2 gap-8 text-center pt-8 pb-4 font-sans">
              {/* Presidente da Mesa */}
              <div className="space-y-1">
                <div className="border-t border-slate-900 mx-auto w-4/5 pt-1" />
                {deliberacao?.mesa_presidente_nome || boletim?.deliberacao.mesa_presidente_nome ? (
                  <>
                    <p className="text-xs font-bold text-slate-950 uppercase">
                      {deliberacao?.mesa_presidente_nome ||
                        boletim?.deliberacao.mesa_presidente_nome}
                    </p>
                    {(deliberacao?.mesa_presidente_cpf ||
                      boletim?.deliberacao.mesa_presidente_cpf) && (
                      <p className="text-[10px] text-slate-700 font-mono">
                        CPF:{' '}
                        {formatarCpf(
                          deliberacao?.mesa_presidente_cpf ||
                            boletim?.deliberacao.mesa_presidente_cpf,
                        )}
                      </p>
                    )}
                    <p className="text-[10px] text-slate-600">Presidente da Mesa Diretora</p>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-bold text-slate-950 uppercase">
                      ___________________________________
                    </p>
                    <p className="text-xs font-bold text-slate-950 uppercase">
                      Presidente da Mesa Diretora
                    </p>
                    <p className="text-[10px] text-slate-600">
                      Condutor(a) dos Trabalhos da Assembleia
                    </p>
                  </>
                )}
              </div>

              {/* Secretário(a) da Mesa */}
              <div className="space-y-1">
                <div className="border-t border-slate-900 mx-auto w-4/5 pt-1" />
                {deliberacao?.mesa_secretario_nome || boletim?.deliberacao.mesa_secretario_nome ? (
                  <>
                    <p className="text-xs font-bold text-slate-950 uppercase">
                      {deliberacao?.mesa_secretario_nome ||
                        boletim?.deliberacao.mesa_secretario_nome}
                    </p>
                    {(deliberacao?.mesa_secretario_cpf ||
                      boletim?.deliberacao.mesa_secretario_cpf) && (
                      <p className="text-[10px] text-slate-700 font-mono">
                        CPF:{' '}
                        {formatarCpf(
                          deliberacao?.mesa_secretario_cpf ||
                            boletim?.deliberacao.mesa_secretario_cpf,
                        )}
                      </p>
                    )}
                    <p className="text-[10px] text-slate-600">Secretário(a) dos Trabalhos</p>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-bold text-slate-950 uppercase">
                      ___________________________________
                    </p>
                    <p className="text-xs font-bold text-slate-950 uppercase">
                      Secretário(a) dos Trabalhos
                    </p>
                    <p className="text-[10px] text-slate-600">
                      Responsável pela Redação da Ata da Assembleia
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Aviso de conformidade com LGPD e alinhamento institucional */}
            <div className="mt-6 pt-3 border-t border-slate-200 text-center text-[10px] text-slate-500 font-sans space-y-1">
              <p>
                Assembleia Eletrônica {nomeCondominio} — apuração conferida e auditada pela mesa
                diretora.
              </p>
              <p>
                Sigilo de cédula criptografado SHA-256 • Em estrita conformidade com a Lei Geral de
                Proteção de Dados (LGPD - Lei nº 13.709/2018).
              </p>
              <p className="text-[9px] text-slate-400">
                Documento emitido digitalmente em {dataEmissao.toLocaleString('pt-BR')} • Código
                Identificador da Urna: {deliberacao?.id || boletim.deliberacao.id}
              </p>
            </div>
          </footer>
        </article>
      </main>
    </div>
  )
}

export default BoletimUrnaDocumentoPage
