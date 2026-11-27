import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  api,
  type DeliberacaoRecord,
  type ApuracaoItemResult,
  type ApuracaoResponse,
  type LancamentoFisicoRecord,
} from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import {
  decidirResultadoItemPauta,
  rotularItemPauta,
  type ResultadoItemPauta,
} from '@/lib/tituloItemPauta'
import { useRealtime } from '@/hooks/use-realtime'
import {
  Activity,
  ThumbsUp,
  ThumbsDown,
  MinusCircle,
  Users,
  BarChart3,
  RefreshCw,
  Gavel,
  CheckCircle2,
  XCircle,
  Clock,
  Video,
  Handshake,
  ChevronLeft,
} from 'lucide-react'

/** Quórum da pauta normalizado em % e rótulo legível. */
interface QuorumItem {
  percentual: number
  rotulo: string
}

const ROTULO_QUORUM: Record<string, string> = {
  maioria_simples: 'Maioria simples dos presentes',
  maioria_absoluta: 'Maioria absoluta (metade + 1)',
  dois_tercos: 'Quórum regimental — dois terços',
  tres_quartos: 'Quórum regimental — três quartos',
  unanimidade: 'Unanimidade dos votos',
}

/**
 * Normaliza o campo `quorum_aplicavel` do item de pauta em percentual + rótulo.
 * Aceita chaves do regimento (ex.: "dois_tercos") e textos livres já usados
 * pela tela de Deliberações ("Maioria simples dos presentes", "2/3", "75%"...).
 */
export function normalizarQuorumItem(quorum?: string | null): QuorumItem {
  const bruto = (quorum || '').toString().trim().toLowerCase()
  if (!bruto) return { percentual: 50, rotulo: 'Maioria simples dos presentes' }

  if (ROTULO_QUORUM[bruto]) return { percentual: percentualDe(bruto), rotulo: ROTULO_QUORUM[bruto] }

  if (bruto.includes('simples')) return { percentual: 50, rotulo: 'Maioria simples dos presentes' }
  if (bruto.includes('absoluta')) return { percentual: 50, rotulo: 'Maioria absoluta' }
  if (bruto.includes('2/3') || bruto.includes('dois'))
    return { percentual: 66.67, rotulo: 'Quórum regimental — dois terços' }
  if (bruto.includes('3/4') || bruto.includes('tres') || bruto.includes('três'))
    return { percentual: 75, rotulo: 'Quórum regimental — três quartos' }
  if (bruto.includes('unanim') || bruto.includes('100%'))
    return { percentual: 100, rotulo: 'Unanimidade' }

  const pct = bruto.match(/(\d+(?:[.,]\d+)?)\s*%/)
  if (pct) {
    const v = Math.min(100, Math.max(0, parseFloat(pct[1].replace(',', '.'))))
    return { percentual: v, rotulo: `${v}% dos votos` }
  }

  return { percentual: 50, rotulo: quorum || 'Maioria simples dos presentes' }
}

function percentualDe(chave: string): number {
  switch (chave) {
    case 'maioria_absoluta':
      return 50
    case 'dois_tercos':
      return 66.67
    case 'tres_quartos':
      return 75
    case 'unanimidade':
      return 100
    default:
      return 50
  }
}

/** Votos consolidados (urna digital + lançamento físico) de um item de pauta. */
interface VotosConsolidados {
  favoravel: number
  desfavoravel: number
  nulo: number
  abstencao: number
  total: number
}

interface LinhaPautaApurada {
  item: ApuracaoItemResult
  quorum: QuorumItem
  votos: VotosConsolidados
  temFisico: boolean
  totalParticipantes: number
  resultado: ResultadoItemPauta
  decisaoTexto: string
}

const DEBOUNCE_MS = 450

/**
 * Painel de apuração em tempo real por item de pauta da deliberação ativa.
 *
 * Camada de dados: APENAS a apuração oficial — api.getApuracao já devolve
 * `apuracao.itens` agregado por item (votos { favoravel, contrario, abstencao,
 * nulo, branco, total }), totalComparecimentos, totalUnidadesElegiveis e
 * presencas { presencial, remoto, total }. NUNCA mapear votos unitários.
 * Os lançamentos físicos (api.getLancamentosFisicos) entram como ajuste de
 * consolidação em tela, mesmo padrão do BoletimUrnaDocumento (Seção 5).
 *
 * Tempo real: hook useRealtime nas collections presencas, lancamentos_fisicos
 * e deliberacoes — a urna agrega os votos no backend (não existe collection
 * 'votos'), então qualquer evento dispara um re-fetch com debounce da
 * apuração consolidada.
 */
const ApuracaoAoVivoPage: React.FC = () => {
  const { toast } = useToast()
  const navigate = useNavigate()
  const [deliberacao, setDeliberacao] = useState<DeliberacaoRecord | null>(null)
  const [deliberacoes, setDeliberacoes] = useState<DeliberacaoRecord[]>([])
  const [apuracao, setApuracao] = useState<ApuracaoResponse['apuracao'] | null>(null)
  const [lancamentosFisicos, setLancamentosFisicos] = useState<LancamentoFisicoRecord[]>([])
  const [carregando, setCarregando] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const deliberacaoIdRef = useRef<string | null>(null)
  const montadoRef = useRef(true)

  useEffect(() => {
    montadoRef.current = true
    return () => {
      montadoRef.current = false
    }
  }, [])

  /** Recarrega a apuração oficial + lançamentos físicos da deliberação. */
  const recarregar = useCallback(async (idDeliberacao: string, silencioso = false) => {
    if (!silencioso) setAtualizando(true)
    try {
      const [resp, fisicos] = await Promise.all([
        api.getApuracao(idDeliberacao),
        api.getLancamentosFisicos(idDeliberacao).catch(() => [] as LancamentoFisicoRecord[]),
      ])
      if (!montadoRef.current) return

      setApuracao(resp?.apuracao || null)
      const delibResp = resp?.deliberacao
      if (delibResp && deliberacaoIdRef.current === delibResp.id) {
        // Atualiza apenas os campos seguros (o payload da apuração tipa
        // modalidade_presencial como string solta; o espalhar cruza tipos).
        setDeliberacao((atual) =>
          atual && atual.id === delibResp.id
            ? {
                ...atual,
                status: delibResp.status,
                titulo: delibResp.titulo,
                hash_raiz: delibResp.hash_raiz,
              }
            : atual,
        )
      }
      setLancamentosFisicos(fisicos || [])
      setErro(null)
    } catch (e) {
      if (montadoRef.current) {
        setErro(getErrorMessage(e, 'Não foi possível atualizar a apuração.'))
      }
    } finally {
      if (montadoRef.current && !silencioso) setAtualizando(false)
    }
  }, [])

  // Carga inicial: deliberações + seleção da ativa (EM_VOTACAO) ou da URL
  useEffect(() => {
    let cancelado = false
    ;(async () => {
      try {
        const lista = await api.getDeliberacoes()
        if (cancelado) return
        const ordenadas = [...(lista || [])].sort((a, b) =>
          (b.created || '').localeCompare(a.created || ''),
        )
        setDeliberacoes(ordenadas)
        const ativa = ordenadas.find((d) => d.status === 'EM_VOTACAO') || ordenadas[0] || null
        setDeliberacao(ativa)
        if (ativa) {
          deliberacaoIdRef.current = ativa.id
          await recarregar(ativa.id)
        }
      } catch (e) {
        if (!cancelado) setErro(getErrorMessage(e, 'Erro ao carregar as deliberações.'))
      } finally {
        if (!cancelado) setCarregando(false)
      }
    })()
    return () => {
      cancelado = true
    }
    // recarregar é estável (useCallback sem deps)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Agenda um re-fetch da apuração (com debounce), sem spinner. */
  const agendarRefetchDebounced = useCallback(() => {
    const id = deliberacaoIdRef.current
    if (!id) return
    window.setTimeout(() => {
      if (montadoRef.current) recarregar(id, true)
    }, DEBOUNCE_MS)
  }, [recarregar])

  // Tempo real: qualquer evento em presencas, lancamentos_fisicos ou
  // deliberacoes dispara um re-fetch com debounce da apuração consolidada
  // (a urna agrega os votos no backend; não existe collection 'votos').
  useRealtime('presencas', agendarRefetchDebounced, !!deliberacao)
  useRealtime('lancamentos_fisicos', agendarRefetchDebounced, !!deliberacao)
  useRealtime('deliberacoes', agendarRefetchDebounced, !!deliberacao)

  const linhas: LinhaPautaApurada[] = useMemo(() => {
    if (!apuracao) return []
    const porItemFisico = new Map<string, LancamentoFisicoRecord>()
    for (const l of lancamentosFisicos) porItemFisico.set(l.item, l)

    return (apuracao.itens || []).map((item) => {
      const quorum = normalizarQuorumItem(item.quorum_aplicavel)
      const fisico = porItemFisico.get(item.id)
      const favoravel = (item.votos.favoravel || 0) + (fisico?.favoraveis || 0)
      const desfavoravel = (item.votos.contrario || 0) + (fisico?.contrarios || 0)
      const abstencao = (item.votos.abstencao || 0) + (fisico?.abstencoes || 0)
      const nulo = item.votos.nulo || 0
      const totalVotos = favoravel + desfavoravel + abstencao + nulo

      // Resultado regimental sobre os votos CONSOLIDADOS (digital + físico)
      const resultado = decidirResultadoItemPauta({
        votos: {
          favoravel,
          contrario: desfavoravel,
          abstencao,
          nulo,
          branco: item.votos.branco || 0,
          total: totalVotos,
        },
      })

      return {
        item,
        quorum,
        votos: { favoravel, desfavoravel, nulo, abstencao, total: totalVotos },
        temFisico: !!fisico,
        totalParticipantes: apuracao.totalComparecimentos || 0,
        resultado,
        decisaoTexto: textoDecisao(resultado, quorum),
      }
    })
  }, [apuracao, lancamentosFisicos])

  const totalElegiveis = apuracao?.totalUnidadesElegiveis || 0
  const totalComparecimentos = apuracao?.totalComparecimentos || 0
  const presencas = apuracao?.presencas || { presencial: 0, remoto: 0, total: 0 }

  const trocarDeliberacao = async (id: string) => {
    const d = deliberacoes.find((x) => x.id === id) || null
    setDeliberacao(d)
    deliberacaoIdRef.current = d ? d.id : null
    if (d) await recarregar(d.id)
  }

  const atualizarManual = async () => {
    if (!deliberacao) return
    await recarregar(deliberacao.id)
    toast({ title: 'Apuração atualizada', description: 'Contagem recarregada da urna.' })
  }

  return (
    // AppLayout já é aplicado pela rota /mesa/apuracao em App.tsx — aqui fica
    // apenas o container de conteúdo (cabeçalho próprio + faixa + cards), sem
    // duplicar menu lateral e barra superior dentro da página.
    <div className="space-y-6">
      {/* Cabeçalho da página (equivalente ao title/subtitle do AppLayout) */}
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-[#002B5E]">
          <Activity className="h-5 w-5 text-[#0066FF]" /> Apuração ao Vivo
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Contagem em tempo real por pauta da deliberação ativa
        </p>
      </div>

      <div className="space-y-4">
        {/* Cabeçalho: deliberação monitorada + status do tempo real */}
        <Card className="border-[#002B5E]/15">
          <CardContent className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0066FF]/10">
                <Activity className="h-5 w-5 text-[#0066FF]" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500">Deliberação monitorada</p>
                <p className="truncate text-sm font-bold text-[#002B5E]">
                  {deliberacao ? deliberacao.titulo : 'Nenhuma deliberação encontrada'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {deliberacoes.length > 1 && (
                <Select
                  value={deliberacao?.id || ''}
                  onValueChange={(id) => void trocarDeliberacao(id)}
                >
                  <SelectTrigger
                    className="h-9 w-[220px] text-xs"
                    aria-label="Escolher deliberação"
                  >
                    <SelectValue placeholder="Escolher deliberação" />
                  </SelectTrigger>
                  <SelectContent>
                    {deliberacoes.map((d) => (
                      <SelectItem key={d.id} value={d.id} className="text-xs">
                        {d.titulo} {d.status === 'EM_VOTACAO' ? '(em votação)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => void atualizarManual()}
                disabled={atualizando || !deliberacao}
              >
                <RefreshCw className={`h-4 w-4 ${atualizando ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              <Badge className="gap-1.5 border border-green-200 bg-green-50 text-green-700">
                <span className="motion-reduce:animate-none h-2 w-2 animate-pulse rounded-full bg-green-500" />
                Tempo real
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Total de participantes (elegíveis × comparecimentos) + modalidades */}
        {deliberacao && (
          <Card className="border-[#002B5E]/15">
            <CardContent className="grid grid-cols-2 gap-3 py-3 sm:grid-cols-4">
              <MiniDado
                rotulo="Unidades elegíveis"
                valor={totalElegiveis}
                icone={<Users className="h-4 w-4 text-[#0066FF]" />}
              />
              <MiniDado
                rotulo="Comparecimentos"
                valor={totalComparecimentos}
                icone={<BarChart3 className="h-4 w-4 text-[#0066FF]" />}
              />
              <MiniDado
                rotulo="Presencial"
                valor={presencas.presencial}
                icone={<Gavel className="h-4 w-4 text-[#0066FF]" />}
              />
              <MiniDado
                rotulo="Remoto"
                valor={presencas.remoto}
                icone={<Video className="h-4 w-4 text-[#0066FF]" />}
              />
            </CardContent>
          </Card>
        )}

        {erro && (
          <Alert variant="destructive">
            <AlertTitle>Erro na apuração</AlertTitle>
            <AlertDescription>{erro}</AlertDescription>
          </Alert>
        )}

        {carregando ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-2xl" />
            ))}
          </div>
        ) : !deliberacao || linhas.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <BarChart3 className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="font-semibold text-slate-700">Nenhuma pauta para apurar</p>
              <p className="mt-1 text-sm text-slate-500">
                Cadastre os itens de pauta em Deliberações e Pautas e abra a votação.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => navigate('/mesa/deliberacoes')}
              >
                <ChevronLeft className="h-4 w-4" />
                Ir para Deliberações e Pautas
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {linhas.map((l, idx) => (
              <CardLinhaPauta key={l.item.id} linha={l} idx={idx} />
            ))}
            <p className="flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
              <span>
                Contagem consolidada da urna digital + lançamento físico • atualização automática a
                cada voto
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

/** Texto de decisão exibido no selo de resultado do card. */
function textoDecisao(r: ResultadoItemPauta, q: QuorumItem): string {
  switch (r) {
    case 'aprovado':
      return 'Aprovado'
    case 'rejeitado':
      return 'Reprovado'
    default:
      return q.percentual >= 100 ? 'Aguardando unanimidade' : 'Aguardando quórum'
  }
}

/** Mini indicador numérico (elegíveis, comparecimento, presencial, remoto). */
const MiniDado: React.FC<{ rotulo: string; valor: number; icone: React.ReactNode }> = ({
  rotulo,
  valor,
  icone,
}) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
    <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
      {icone}
      {rotulo}
    </p>
    <p className="mt-0.5 text-xl font-bold leading-tight text-[#002B5E]">{valor}</p>
  </div>
)

/** Card de um item de pauta com contagens, quórum e selo de resultado. */
const CardLinhaPauta: React.FC<{ linha: LinhaPautaApurada; idx: number }> = ({ linha, idx }) => {
  const { item, quorum, votos, temFisico, totalParticipantes } = linha
  const { favoravel, desfavoravel, nulo, abstencao, total: totalVotos } = votos

  // Item de ELEIÇÃO: mostra contagem por candidato em vez de Favorável/Contrário.
  const candidatos = Array.isArray(item.candidatos_eleicao) ? item.candidatos_eleicao : []
  const ehEleicao = item.tipo_eleicao === 'eleicao' && candidatos.length > 0
  const porCandidato = Array.isArray(item.porCandidato) ? item.porCandidato : []

  const eleicaoInfo = (() => {
    if (!ehEleicao) return null
    const totais = porCandidato.map((p) => p.total || 0)
    const maxVotos = Math.max(0, ...totais)
    const totalEleicao = totais.reduce((s, v) => s + v, 0)
    const lideres = totais
      .map((v, i) => ({ v, i }))
      .filter((x) => x.v === maxVotos && maxVotos > 0)
      .map((x) => x.i)
    const empate = lideres.length > 1
    return { maxVotos, totalEleicao, lideres, empate }
  })()

  const percFavor = totalVotos > 0 ? (favoravel / Math.max(1, totalVotos)) * 100 : 0
  const percDesfavor = totalVotos > 0 ? (desfavoravel / Math.max(1, totalVotos)) * 100 : 0

  const selo = {
    aprovado: {
      bg: 'bg-green-50',
      border: 'border-green-300',
      text: 'text-green-700',
      icon: CheckCircle2,
    },
    rejeitado: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700', icon: XCircle },
    sem_votos: {
      bg: 'bg-amber-50',
      border: 'border-amber-300',
      text: 'text-amber-700',
      icon: Clock,
    },
  }[linha.resultado]

  const IconeSelo = selo.icon

  return (
    <Card className={`overflow-hidden border ${selo.border}`}>
      <CardHeader className="bg-slate-50/60 py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-[#002B5E]">
            <Gavel className="h-4 w-4 shrink-0 text-[#0066FF]" />
            <span className="truncate">{rotularItemPauta(item, idx)}</span>
          </CardTitle>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {temFisico && (
              <Badge variant="outline" className="border-slate-300 text-[10px] text-slate-600">
                + lançamento físico
              </Badge>
            )}
            <Badge variant="outline" className="border-[#002B5E]/25 text-[10px] text-[#002B5E]">
              <Users className="mr-1 h-3 w-3" />
              {totalParticipantes} participante(s)
            </Badge>
            <Badge
              className={`gap-1 border text-xs font-bold ${selo.bg} ${selo.border} ${selo.text}`}
            >
              <IconeSelo className="h-3.5 w-3.5" />
              {linha.decisaoTexto}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pb-4 pt-3">
        {/* ELEIÇÃO: contagem por candidato + selo "Eleito" no mais votado */}
        {ehEleicao && eleicaoInfo ? (
          <div className="space-y-2">
            {eleicaoInfo.empate && (
              <Alert className="border-amber-300 bg-amber-50 text-amber-950">
                <AlertTitle className="text-xs font-bold">Empate na apuração</AlertTitle>
                <AlertDescription className="text-xs">
                  Há mais de um candidato com {eleicaoInfo.maxVotos} voto(s). A mesa diretora deve
                  decidir o desempate conforme o regimento.
                </AlertDescription>
              </Alert>
            )}
            <div className="grid grid-cols-1 gap-2">
              {candidatos.map((candidato, i) => {
                const qtd = porCandidato[i]?.total || 0
                const perc =
                  eleicaoInfo.totalEleicao > 0 ? (qtd / eleicaoInfo.totalEleicao) * 100 : 0
                const eleito = !eleicaoInfo.empate && eleicaoInfo.lideres.includes(i)
                return (
                  <div
                    key={`${item.id}-cand-${i}`}
                    className={`flex items-center justify-between gap-2 rounded-xl border p-3 ${
                      eleito ? 'border-green-300 bg-green-50/60' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {candidato.nome}
                      </p>
                      {candidato.cargo && (
                        <p className="truncate text-[11px] text-slate-500">{candidato.cargo}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {eleito && (
                        <Badge className="bg-green-600 text-white gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Eleito
                        </Badge>
                      )}
                      <div className="w-24 space-y-1">
                        <p className="text-right text-sm font-bold text-[#002B5E]">{qtd}</p>
                        <div className="h-1.5 rounded-full bg-slate-200 opacity-60" aria-hidden>
                          <div
                            className="h-1.5 rounded-full bg-[#0066FF]"
                            style={{ width: `${Math.min(100, perc)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <Contador
              icone={<ThumbsUp className="h-4 w-4 text-green-600" />}
              rotulo="Favorável"
              valor={favoravel}
              perc={percFavor}
              corBarra="bg-green-500"
            />
            <Contador
              icone={<ThumbsDown className="h-4 w-4 text-red-600" />}
              rotulo="Desfavorável"
              valor={desfavoravel}
              perc={percDesfavor}
              corBarra="bg-red-500"
            />
            <Contador
              icone={<MinusCircle className="h-4 w-4 text-slate-500" />}
              rotulo="Nulo"
              valor={nulo}
              perc={totalVotos > 0 ? (nulo / totalVotos) * 100 : 0}
              corBarra="bg-slate-400"
            />
          </div>
        )}

        {(abstencao > 0 || item.votos.branco > 0) && (
          <p className="flex items-center gap-1 text-[11px] text-slate-500">
            <Handshake className="h-3 w-3" /> {abstencao} abstenção(ões)
            {item.votos.branco > 0 ? ` • ${item.votos.branco} voto(s) em branco` : ''} — não computa
            para o resultado.
          </p>
        )}

        {/* Quórum aplicável e evolução da contagem */}
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
            <span className="truncate">
              Quórum aplicável: <strong className="text-slate-700">{quorum.rotulo}</strong>
            </span>
            <span className="shrink-0">
              {favoravel + desfavoravel}/{totalVotos} votos válidos
            </span>
          </div>
          <Progress value={Math.min(100, percFavor + percDesfavor)} className="h-2" />
        </div>
      </CardContent>
    </Card>
  )
}

/** Bloco de contador colorido usado em cada status (Favorável/Desfavorável/Nulo). */
const Contador: React.FC<{
  icone: React.ReactNode
  rotulo: string
  valor: number
  perc: number
  corBarra: string
}> = ({ icone, rotulo, valor, perc, corBarra }) => (
  <div className="space-y-1.5 rounded-xl border border-slate-200 bg-white p-3">
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
        {icone}
        {rotulo}
      </span>
      <span className="text-lg font-bold leading-none text-[#002B5E]">{valor}</span>
    </div>
    <div className={`h-1.5 rounded-full ${corBarra} opacity-30`} aria-hidden>
      <div
        className={`h-1.5 rounded-full ${corBarra}`}
        style={{ width: `${Math.min(100, perc)}%` }}
      />
    </div>
  </div>
)

export { ApuracaoAoVivoPage }
export default ApuracaoAoVivoPage
