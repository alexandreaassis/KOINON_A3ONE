import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { pb } from '@/lib/pocketbase/client'
import { api, type DeliberacaoRecord, type ItemPautaRecord } from '@/lib/api'
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
import { decidirResultadoItemPauta, type ResultadoItemPauta } from '@/lib/tituloItemPauta'
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
} from 'lucide-react'

/** Voto unitário já consolidado (digital + físico) vindo da apuração oficial da urna. */
interface VotoUnidadeApurado {
  unidade: string
  voto: 'favoravel' | 'desfavoravel' | 'nulo' | 'abstencao' | string
}

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

interface LinhaPautaApurada {
  item: ItemPautaRecord
  quorum: QuorumItem
  favoravel: number
  desfavoravel: number
  nulo: number
  abstencao: number
  totalVotos: number
  totalParticipantes: number
  resultado: ResultadoItemPauta
  decisaoTexto: string
}

/**
 * Painel de apuração em tempo real por item de pauta da deliberação ativa.
 * Usa subscriptions do PocketBase (mesmo mecanismo do quórum ao vivo do
 * Painel da Mesa) para atualizar sem recarregar a página.
 */
const ApuracaoAoVivoPage: React.FC = () => {
  const { toast } = useToast()
  const [deliberacao, setDeliberacao] = useState<DeliberacaoRecord | null>(null)
  const [deliberacoes, setDeliberacoes] = useState<DeliberacaoRecord[]>([])
  const [itensPauta, setItensPauta] = useState<ItemPautaRecord[]>([])
  const [votosPorItem, setVotosPorItem] = useState<Record<string, VotoUnidadeApurado[]>>({})
  const [totalAptos, setTotalAptos] = useState(0)
  const [carregando, setCarregando] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const montadoRef = useRef(true)

  useEffect(() => {
    montadoRef.current = true
    return () => {
      montadoRef.current = false
    }
  }, [])

  /** Recarrega tudo que compõe a apuração da deliberação selecionada. */
  const recarregar = useCallback(async (idDeliberacao: string, silencioso = false) => {
    if (!silencioso) setAtualizando(true)
    try {
      const [itens, apuracao, aptos] = await Promise.all([
        api.getItensPauta(idDeliberacao),
        api.getApuracao(idDeliberacao),
        api.getUnidadesAptas(idDeliberacao).catch(() => 0),
      ])

      if (!montadoRef.current) return

      setItensPauta(itens || [])
      setTotalAptos(typeof aptos === 'number' ? aptos : 0)

      const mapa: Record<string, VotoUnidadeApurado[]> = {}
      const listaVotos = (apuracao?.votos_unidades || []) as VotoUnidadeApurado[]
      for (const v of listaVotos) {
        const chave = String(v.item || '')
        if (!mapa[chave]) mapa[chave] = []
        mapa[chave].push(v)
      }
      setVotosPorItem(mapa)
      setErro(null)
    } catch (e) {
      if (montadoRef.current) {
        setErro(getErrorMessage(e, 'Não foi possível atualizar a apuração.'))
      }
    } finally {
      if (montadoRef.current && !silencioso) setAtualizando(false)
    }
  }, [])

  // Carga inicial: deliberações + seleção da ativa
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
        if (ativa) await recarregar(ativa.id)
      } catch (e) {
        if (!cancelado) setErro(getErrorMessage(e, 'Erro ao carregar as deliberações.'))
      } finally {
        if (!cancelado) setCarregando(false)
      }
    })()
    return () => {
      cancelado = true
    }
  }, [recarregar])

  // Tempo real: assina votos, itens de pauta, presenças e a própria deliberação
  useEffect(() => {
    if (!deliberacao) return
    const unsubs: Array<() => void> = []

    const agendar = (() => {
      let timer: ReturnType<typeof setTimeout> | null = null
      return () => {
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => {
          if (deliberacao && montadoRef.current) recarregar(deliberacao.id, true)
        }, 250)
      }
    })()

    try {
      unsubs.push(pb.collection('votos').subscribe('*', agendar))
      unsubs.push(pb.collection('itens_pauta').subscribe('*', agendar))
      unsubs.push(pb.collection('presencas').subscribe('*', agendar))
      unsubs.push(pb.collection('deliberacoes').subscribe('*', agendar))
    } catch (e) {
      console.warn('Falha ao assinar tempo real da apuração', e)
    }

    return () => {
      unsubs.forEach((u) => {
        try {
          u()
        } catch {
          /* ignore */
        }
      })
    }
  }, [deliberacao, recarregar])

  const linhas: LinhaPautaApurada[] = useMemo(() => {
    if (!deliberacao) return []
    const votosAtivos = votosPorItem[''] || [] // votos sem item (urna legada)
    return itensPauta.map((item) => {
      const quorum = normalizarQuorumItem(item.quorum_aplicavel)
      const votosItem = votosPorItem[item.id] || votosAtivos

      let favoravel = 0
      let desfavoravel = 0
      let nulo = 0
      let abstencao = 0
      for (const v of votosItem) {
        const val = String(v.voto || '').toLowerCase()
        if (val.includes('fav') || val === 'sim' || val === 'yes') favoravel++
        else if (val.includes('desfav') || val === 'nao' || val === 'não' || val === 'no')
          desfavoravel++
        else if (val.includes('nulo') || val.includes('null')) nulo++
        else if (val.includes('absten')) abstencao++
        else nulo++
      }

      const totalVotos = favoravel + desfavoravel + nulo + abstencao
      const resultado = decidirResultadoItemPauta({
        favoravel,
        desfavoravel,
        nulo,
        abstencao,
        totalAptos,
        percentualExigido: quorum.percentual,
      })

      return {
        item,
        quorum,
        favoravel,
        desfavoravel,
        nulo,
        abstencao,
        totalVotos,
        totalParticipantes: totalAptos,
        resultado,
        decisaoTexto: textoDecisao(resultado, quorum),
      }
    })
  }, [itensPauta, votosPorItem, totalAptos, deliberacao])

  const totalGeralVotos = linhas.reduce((acc, l) => acc + l.totalVotos, 0)

  const trocarDeliberacao = async (id: string) => {
    const d = deliberacoes.find((x) => x.id === id) || null
    setDeliberacao(d)
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
            <p className="text-xs text-slate-500 text-center">
              {totalGeralVotos} voto(s) registrados nesta deliberação • atualização automática a
              cada voto
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
    case 'reprovado':
      return 'Reprovado'
    default:
      return q.percentual >= 100 ? 'Aguardando unanimidade' : 'Aguardando quórum'
  }
}

/** Card de uma linha de pauta com contagens e selo de resultado. */
const CardLinhaPauta: React.FC<{ linha: LinhaPautaApurada }> = ({ linha }) => {
  const { item, quorum, favoravel, desfavoravel, nulo, abstencao, totalVotos, totalParticipantes } =
    linha

  const percFavor = totalVotos > 0 ? (favoravel / Math.max(1, totalVotos)) * 100 : 0
  const percDesfavor = totalVotos > 0 ? (desfavoravel / Math.max(1, totalVotos)) * 100 : 0

  const selo = {
    aprovado: {
      bg: 'bg-green-50',
      border: 'border-green-300',
      text: 'text-green-700',
      icon: CheckCircle2,
    },
    reprovado: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700', icon: XCircle },
    em_disputa: {
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
            <span className="truncate">
              {item.ordem ? `${item.ordem}. ` : ''}
              {item.titulo}
            </span>
          </CardTitle>
          <div className="flex items-center gap-2 shrink-0">
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

        {abstencao > 0 && (
          <p className="text-[11px] text-slate-500 flex items-center gap-1">
            <HelpCircle className="h-3 w-3" /> {abstencao} abstenção(ões) registrada(s) — não
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
