import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  api,
  type DeliberacaoRecord,
  type ApuracaoItemResult,
  type ApuracaoResponse,
} from '@/lib/api'
import { AppLayout } from '@/components/layout/AppLayout'
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
import type { LancamentoFisicoRecord } from '@/lib/api'
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
  HelpCircle,
  Clock,
  WifiOff,
} from 'lucide-react'

/** Quórum regimental da pauta, normalizado em % e rótulo legível. */
interface QuorumItem {
  percentual: number
  rotulo: string
}

const ROTULO_QUORUM: Record<string, string> = {
  maioria_simples: 'Maioria simples dos presentes',
  maioria_absoluta: 'Maioria absoluta (metade + 1 dos aptos)',
  dois_tercos: 'Dois terços dos votos',
  tres_quartos: 'Três quartos dos votos',
  unanimidade: 'Unanimidade dos votos',
}

/**
 * Normaliza o campo `quorum_aplicavel` do item de pauta em percentual.
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
    return { percentual: 66.67, rotulo: 'Dois terços' }
  if (bruto.includes('3/4') || bruto.includes('tres') || bruto.includes('três'))
    return { percentual: 75, rotulo: 'Três quartos' }
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

const DEBOUNCE_MS = 400

/**
 * Painel de apuração em tempo real por item de pauta da deliberação ativa.
 * Dados: APENAS a apuração oficial (api.getApuracao → apuracao.itens, já
 * agregada por item) + lançamentos físicos (api.getLancamentosFisicos).
 * Tempo real: hook useRealtime em presencas, lancamentos_fisicos e
 * deliberacoes, com re-fetch com debounce — a urna agrega votos no backend,
 * então qualquer evento dispara um re-fetch da apuração consolidada.
 */
const ApuracaoAoVivoPage: React.FC = () => {
  const { toast } = useToast()
  const params = useParams<{ deliberacaoId?: string }>()
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
      if (delibResp) {
        // Mantém o record local sincronizado com a resposta da apuração
        setDeliberacao((atual) =>
          atual && atual.id === delibResp.id ? { ...atual, ...delibResp } : atual,
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
        const daUrl = params.deliberacaoId
          ? ordenadas.find((d) => d.id === params.deliberacaoId) || null
          : null
        const ativa =
          daUrl ||
          ordenadas.find((d) => d.status === 'EM_VOTACAO') ||
          ordenadas[0] ||
          null
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
  }, [recarregar, params.deliberacaoId])

  // Tempo real: qualquer evento em presencas, lancamentos_fisicos ou
  // deliberacoes dispara um re-fetch com debounce da apuração consolidada
  // (a urna agrega os votos no backend; não existe collection 'votos').
  const agendarRefetch = useCallback(() => {
    const id = deliberacaoIdRef.current
    if (!id) return
    window.setTimeout(() => {
      if (montadoRef.current) recarregar(id, true)
    }, DEBOUNCE_MS)
  }, [recarregar])

  const agendarRefetchDebounced = useMemo(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    return () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(agendarRefetch, DEBOUNCE_MS)
    }
  }, [agendarRefetch])

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

  const totalGeralVotos = linhas.reduce((acc, l) => acc + l.votos.total, 0)
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
    <AppLayout
      title="Apuração ao Vivo"
      subtitle="Contagem em tempo real por pauta da deliberação ativa"
    >
      <div className="space-y-4">
        {/* Cabeçalho: deliberação ativa + status do tempo real */}
        <Card className="border-[#002B5E]/15">
          <CardContent className="py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-[#0066FF]/10 flex items-center justify-center shrink-0">
                <Activity className="h-5 w-5 text-[#0066FF]" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500">Deliberação monitorada</p>
                <p className="text-sm font-bold text-[#002B5E] truncate">
                  {deliberacao ? deliberacao.titulo : 'Nenhuma deliberação encontrada'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {deliberacoes.length > 1 && (
                <Select value={deliberacao?.id || ''} onValueChange={trocarDeliberacao}>
                  <SelectTrigger className="h-9 w-[220px] text-xs">
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
                onClick={atualizarManual}
                disabled={atualizando || !deliberacao}
              >
                <RefreshCw className={`h-4 w-4 ${atualizando ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              <Badge className="bg-green-50 text-green-700 border border-green-200 gap-1.5">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse motion-reduce:animate-none" />
                Tempo real
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Total de participantes (elegíveis, comparecimento e canais) */}
        {deliberacao && (
          <Card className="border-[#002B5E]/15">
            <CardContent className="py-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                icone={<Activity className="h-4 w-4 text-[#0066FF]" />}
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
              <BarChart3 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="font-semibold text-slate-700">Nenhuma pauta para apurar</p>
              <p className="text-sm text-slate-500 mt-1">
                Cadastre os itens de pauta em Deliberações e Pautas e abra a votação.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {linhas.map((l) => (
              <CardLinhaPauta key={l.item.id} linha={l} />
            ))}
            <p className="text-xs text-slate-500 text-center flex items-center justify-center gap-1.5">
              <WifiOff className="h-3 w-3 hidden" />
              <span>
                {totalGeralVotos} voto(s) consolidados nesta deliberação • atualização automática
                a cada voto
              </span>
            </p>
          </div>
        )}
      </div>
    </AppLayout>
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
    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
      {icone}
      {rotulo}
    </p>
    <p className="text-xl font-bold text-[#002B5E] leading-tight mt-0.5">{valor}</p>
  </div>
)

/** Card de uma linha de pauta com contagens e selo de resultado. */
const CardLinhaPauta: React.FC<{ linha: LinhaPautaApurada }> = ({ linha }) => {
  const { item, quorum, votos, temFisico, totalParticipantes } = linha
  const { favoravel, desfavoravel, nulo, abstencao, total: totalVotos } = votos

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
    <Card className={`border ${selo.border} overflow-hidden`}>
      <CardHeader className="py-3 bg-slate-50/60">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-sm font-bold text-[#002B5E] flex items-center gap-2">
            <Gavel className="h-4 w-4 text-[#0066FF] shrink-0" />
            <span className="truncate">{rotularItemPauta(item, 0)}</span>
          </CardTitle>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {temFisico && (
              <Badge variant="outline" className="text-[10px] border-slate-300 text-slate-600">
                + lançamento físico
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px] border-[#002B5E]/25 text-[#002B5E]">
              <Users className="h-3 w-3 mr-1" />
              {totalParticipantes} participante(s)
            </Badge>
            <Badge
              className={`text-xs font-bold border ${selo.bg} ${selo.border} ${selo.text} gap-1`}
            >
              <IconeSelo className="h-3.5 w-3.5" />
              {linha.decisaoTexto}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-3 pb-4 space-y-3">
        {/* Contagem Favorável / Desfavorável / Nulo */}
        <div className="grid grid-cols-3 gap-2">
          <Contador
            icone={<ThumbsUp className="h-4 w-4 text-green-600" />}
            rotulo="Favorável"
            valor={favoravel}
            corBarra="bg-green-500"
            perc={percFavor}
          />
          <Contador
            icone={<ThumbsDown className="h-4 w-4 text-red-600" />}
            rotulo="Desfavorável"
            valor={desfavoravel}
            corBarra="bg-red-500"
            perc={percDesfavor}
          />
          <Contador
            icone={<MinusCircle className="h-4 w-4 text-slate-500" />}
            rotulo="Nulo"
            valor={nulo}
            corBarra="bg-slate-400"
            perc={totalVotos > 0 ? (nulo / totalVotos) * 100 : 0}
          />
        </div>

        {(abstencao > 0 || item.votos.branco > 0) && (
          <p className="text-[11px] text-slate-500 flex items-center gap-1">
            <HelpCircle className="h-3 w-3" /> {abstencao} abstenção(ões)
            {item.votos.branco > 0 ? ` • ${item.votos.branco} voto(s) em branco` : ''} — não
            computa para o resultado.
          </p>
        )}

        {/* Barra de evolução rumo ao quórum exigido */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>
              Quórum regimental: <strong className="text-slate-700">{quorum.rotulo}</strong>
            </span>
            <span>
              {favoravel + desfavoravel}/{totalVotos} votos válidos computados
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
  <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1.5">
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
        {icone}
        {rotulo}
      </span>
      <span className="text-lg font-bold text-[#002B5E] leading-none">{valor}</span>
    </div>
    <Progress value={Math.min(100, perc)} className="h-1.5" />
    <div
      className={`h-0.5 rounded-full ${corBarra}`}
      style={{ width: `${Math.min(100, perc)}%` }}
    />
  </div>
)

export default ApuracaoAoVivoPage
