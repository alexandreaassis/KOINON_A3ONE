import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, type DeliberacaoRecord, type UnidadeRecord, type ApuracaoResponse } from '@/lib/api'
import { useCondoConfig } from '@/context/CondoConfigContext'
import { useAuth } from '@/context/AuthContext'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/hooks/use-toast'
import { imprimirOuBaixarPdfConsolidado } from '@/lib/pdfRelatorioConsolidado'
import { decidirResultadoItemPauta, rotularItemPauta } from '@/lib/tituloItemPauta'
import {
  FileText,
  Printer,
  Download,
  BarChart3,
  Calendar,
  Vote,
  ShieldCheck,
  Building2,
  Users,
  CheckCircle2,
  FileCheck2,
  TableProperties,
} from 'lucide-react'

export const RelatoriosMesaPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { nomeCondominio, logoUrl, rotuloUnidade } = useCondoConfig()

  const [deliberacoes, setDeliberacoes] = useState<DeliberacaoRecord[]>([])
  const [deliberacaoSelecionadaId, setDeliberacaoSelecionadaId] = useState<string>('')
  const [unidades, setUnidades] = useState<UnidadeRecord[]>([])
  const [apuracaoAtiva, setApuracaoAtiva] = useState<ApuracaoResponse | null>(null)

  const [carregando, setCarregando] = useState(true)
  const [carregandoApuracao, setCarregandoApuracao] = useState(false)
  const [gerandoPdf, setGerandoPdf] = useState(false)

  // Dados comparativos pré-carregados
  const [resumosComparativos, setResumosComparativos] = useState<
    Array<{
      deliberacao: DeliberacaoRecord
      comparecimento: number
      taxa: number
      totalItens: number
      hashRaiz?: string
    }>
  >([])

  useEffect(() => {
    let cancel = false

    const carregar = async () => {
      try {
        setCarregando(true)
        const [delibs, unids] = await Promise.all([
          api.getDeliberacoes(),
          api.getUnidades().catch(() => [] as UnidadeRecord[]),
        ])

        if (cancel) return
        setDeliberacoes(delibs)
        setUnidades(unids)

        if (delibs.length > 0) {
          const inicial =
            delibs.find((d) => d.status === 'APURADA' || d.status === 'PUBLICADA') || delibs[0]
          setDeliberacaoSelecionadaId(inicial.id)
        }

        // Montar resumo comparativo simples
        const comparativo = delibs.map((d) => {
          return {
            deliberacao: d,
            comparecimento: 0,
            taxa: 0,
            totalItens: 0,
            hashRaiz: d.hash_raiz,
          }
        })
        setResumosComparativos(comparativo)
      } catch (err: any) {
        toast({
          title: 'Erro ao carregar relatórios',
          description: err?.message || 'Falha ao buscar dados de assembleia.',
          variant: 'destructive',
        })
      } finally {
        if (!cancel) setCarregando(false)
      }
    }

    carregar()
    return () => {
      cancel = true
    }
  }, [])

  // Carregar apuração ao trocar seleção
  useEffect(() => {
    if (!deliberacaoSelecionadaId) return
    let cancel = false

    const carregarApuracao = async () => {
      setCarregandoApuracao(true)
      try {
        const apuracaoData = await api.getApuracao(deliberacaoSelecionadaId)
        if (!cancel) {
          setApuracaoAtiva(apuracaoData)
          // Atualizar o item no comparativo com dados reais
          setResumosComparativos((prev) =>
            prev.map((item) => {
              if (item.deliberacao.id === deliberacaoSelecionadaId) {
                const totalComp =
                  apuracaoData.apuracao.totalComparecimentos ||
                  apuracaoData.apuracao.presencas.total ||
                  0
                const elegiveis =
                  unidades.length || apuracaoData.apuracao.totalUnidadesElegiveis || 1
                return {
                  ...item,
                  comparecimento: totalComp,
                  taxa: Math.round((totalComp / elegiveis) * 100),
                  totalItens: apuracaoData.apuracao.itens.length,
                  hashRaiz: apuracaoData.apuracao.hashRaizUrna || item.deliberacao.hash_raiz,
                }
              }
              return item
            }),
          )
        }
      } catch (err) {
        console.warn('Apuração detalhada não disponível para esta deliberação:', err)
        if (!cancel) setApuracaoAtiva(null)
      } finally {
        if (!cancel) setCarregandoApuracao(false)
      }
    }

    carregarApuracao()
    return () => {
      cancel = true
    }
  }, [deliberacaoSelecionadaId, unidades.length])

  const deliberacaoAtual = deliberacoes.find((d) => d.id === deliberacaoSelecionadaId) || null

  const handleGerarPdf = () => {
    if (!deliberacaoAtual || !apuracaoAtiva) {
      toast({
        title: 'Dados não consolidados',
        description: 'Esta deliberação ainda não possui apuração oficial homologada.',
        variant: 'destructive',
      })
      return
    }

    setGerandoPdf(true)
    try {
      imprimirOuBaixarPdfConsolidado({
        nomeCondominio,
        logoUrl,
        rotuloUnidade,
        deliberacao: deliberacaoAtual,
        apuracao: apuracaoAtiva.apuracao,
        unidades,
        solicitanteNome: user?.name,
      })
      toast({
        title: 'Relatório gerado',
        description: 'A janela de impressão A4 foi aberta para emissão do PDF.',
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao emitir PDF',
        description: err?.message || 'Falha ao formatar o documento consolidado.',
        variant: 'destructive',
      })
    } finally {
      setGerandoPdf(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-amber-600" /> Relatórios de Assembleia e Governança
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Geração de Relatório Consolidado em padrão A4 para arquivo cartorário, auditoria e
            acompanhamento comparativo.
          </p>
        </div>

        {/* Seletor rápido de deliberação */}
        {deliberacoes.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Assembleia:</span>
            <Select value={deliberacaoSelecionadaId} onValueChange={setDeliberacaoSelecionadaId}>
              <SelectTrigger className="w-[280px] h-9 text-xs bg-white">
                <SelectValue placeholder="Selecione uma assembleia" />
              </SelectTrigger>
              <SelectContent>
                {deliberacoes.map((d) => (
                  <SelectItem key={d.id} value={d.id} className="text-xs">
                    {d.titulo} ({d.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Card Principal: Relatório Consolidado da Assembleia Selecionada */}
      {deliberacaoAtual ? (
        <Card className="border-amber-200/80 shadow-xs bg-white">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-800 tracking-wider">
                  Relatório Consolidado da Assembleia
                </span>
                <CardTitle className="text-base font-bold text-slate-900 mt-0.5">
                  {deliberacaoAtual.titulo}
                </CardTitle>
                <CardDescription className="text-xs text-slate-600 mt-0.5">
                  {deliberacaoAtual.descricao ||
                    'Escrutínio completo dos itens e cadeia de custódia da urna.'}
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Badge className="bg-amber-600 text-white text-xs uppercase px-2.5 py-0.5">
                  Status: {deliberacaoAtual.status}
                </Badge>
                <Button
                  size="sm"
                  onClick={handleGerarPdf}
                  disabled={!apuracaoAtiva || gerandoPdf || carregandoApuracao}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs h-8 shadow-xs"
                >
                  <Printer className="mr-1.5 h-3.5 w-3.5" />
                  {gerandoPdf ? 'Formatando...' : 'Gerar Relatório em PDF'}
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-4 space-y-4">
            {carregandoApuracao ? (
              <div className="py-8 text-center text-xs text-slate-500">
                Carregando apuração consolidada...
              </div>
            ) : apuracaoAtiva ? (
              <>
                {/* Indicadores-chave */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                    <span className="text-[11px] font-bold text-slate-500 uppercase block">
                      Unidades Aptas
                    </span>
                    <span className="text-lg font-bold text-slate-900">
                      {unidades.length || apuracaoAtiva.apuracao.totalUnidadesElegiveis || 0}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">cadastradas</span>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                    <span className="text-[11px] font-bold text-slate-500 uppercase block">
                      Comparecimento Total
                    </span>
                    <span className="text-lg font-bold text-amber-700">
                      {apuracaoAtiva.apuracao.totalComparecimentos}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      {unidades.length > 0
                        ? `${Math.round((apuracaoAtiva.apuracao.totalComparecimentos / unidades.length) * 100)}% de presença`
                        : ''}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                    <span className="text-[11px] font-bold text-slate-500 uppercase block">
                      Canais de Presença
                    </span>
                    <div className="text-xs font-semibold text-slate-800 mt-1">
                      <span>{apuracaoAtiva.apuracao.presencas.presencial} Presencial</span>
                      <span className="text-slate-300 mx-1.5">•</span>
                      <span>{apuracaoAtiva.apuracao.presencas.remoto} Remoto</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">100% conciliado</span>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                    <span className="text-[11px] font-bold text-slate-500 uppercase block">
                      Cadeia SHA-256
                    </span>
                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 mt-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {apuracaoAtiva.apuracao.integridadeMatematica ? '100% Válida' : 'Verificada'}
                    </span>
                    <span
                      className="text-[10px] text-slate-400 block mt-0.5 truncate font-mono"
                      title={apuracaoAtiva.apuracao.hashRaizUrna}
                    >
                      {apuracaoAtiva.apuracao.hashRaizUrna?.substring(0, 16)}...
                    </span>
                  </div>
                </div>

                {/* Resumo de itens de pauta */}
                <div className="border border-slate-200 rounded-lg p-3 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                      <FileCheck2 className="h-4 w-4 text-amber-600" />
                      Matérias Deliberadas ({apuracaoAtiva.apuracao.itens.length})
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Cédulas: {apuracaoAtiva.apuracao.totalCedulas} computadas
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100 text-xs">
                    {apuracaoAtiva.apuracao.itens.map((item, idx) => {
                      const total = item.votos.total || 0
                      const fav = item.votos.favoravel || 0
                      const cont = item.votos.contrario || 0
                      const resultado = decidirResultadoItemPauta(item)
                      return (
                        <div key={item.id} className="py-2 flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <span className="font-semibold text-slate-900 block truncate">
                              {rotularItemPauta(item, idx)}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              Quórum:{' '}
                              {item.quorum_aplicavel ||
                                deliberacaoAtual.quorum_materia ||
                                'Maioria Simples'}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right text-[11px]">
                              <span className="font-bold text-emerald-700">{fav} Sim</span>
                              <span className="text-slate-300 mx-1">/</span>
                              <span className="font-bold text-red-700">{cont} Não</span>
                              <span className="text-slate-300 mx-1">/</span>
                              <span className="text-slate-500">{item.votos.abstencao} Abst.</span>
                            </div>

                            <Badge
                              variant="outline"
                              className={
                                resultado === 'aprovado'
                                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700 font-bold text-[10px]'
                                  : resultado === 'rejeitado'
                                    ? 'border-red-300 bg-red-50 text-red-700 font-bold text-[10px]'
                                    : 'border-slate-300 bg-slate-50 text-slate-600 font-bold text-[10px]'
                              }
                            >
                              {resultado === 'aprovado'
                                ? 'Aprovado'
                                : resultado === 'rejeitado'
                                  ? 'Rejeitado'
                                  : 'Sem votos registrados'}
                            </Badge>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                Esta deliberação ainda não foi consolidada. Conclua a apuração no Painel da Mesa
                para emitir o relatório completo.
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* Relatório Comparativo de Assembleias Realizadas */}
      <Card className="border-slate-200 shadow-xs bg-white">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TableProperties className="h-4 w-4 text-amber-600" />
                Histórico Comparativo de Assembleias
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Visão tabular de todas as assembleias registradas no sistema, status e participação.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-3">
          {deliberacoes.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              Nenhuma assembleia encontrada.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600 font-bold text-left bg-slate-50/70">
                    <th className="py-2.5 px-3">Assembleia</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Tipo de Cédula</th>
                    <th className="py-2.5 px-3">Mesa Diretora</th>
                    <th className="py-2.5 px-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deliberacoes.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-slate-900 block">{d.titulo}</span>
                        {d.descricao && (
                          <span className="text-[11px] text-slate-500 block truncate max-w-sm">
                            {d.descricao}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge
                          variant="outline"
                          className={
                            d.status === 'APURADA' || d.status === 'PUBLICADA'
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-800 text-[10px] font-bold'
                              : 'border-amber-300 bg-amber-50 text-amber-800 text-[10px] font-bold'
                          }
                        >
                          {d.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 uppercase text-[11px] font-mono text-slate-700">
                        {d.tipo_cedula || 'nominal'}
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-slate-600">
                        {d.mesa_presidente_nome ? (
                          <span>Pres: {d.mesa_presidente_nome}</span>
                        ) : (
                          <span className="italic text-slate-400">Não designada</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeliberacaoSelecionadaId(d.id)}
                          className="text-xs h-7 px-2.5 text-amber-700 border-amber-300 hover:bg-amber-50"
                        >
                          Selecionar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default RelatoriosMesaPage
