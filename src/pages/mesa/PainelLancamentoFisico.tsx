import React, { useEffect, useMemo, useState } from 'react'
import {
  api,
  itemEhEleicao,
  normalizarCandidatosEleicao,
  normalizarVotosPorCandidato,
  type DeliberacaoRecord,
  type ItemPautaRecord,
  type LancamentoFisicoRecord,
} from '@/lib/api'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { Save, RotateCcw, Loader2, PenLine, History } from 'lucide-react'

interface TotaisItem {
  favoraveis: string
  contrarios: string
  abstencoes: string
}

/** Item é de eleição quando marcado e com candidatos cadastrados. */
const ehItemEleicao = (item: ItemPautaRecord): boolean =>
  itemEhEleicao(item) && normalizarCandidatosEleicao(item.candidatos_eleicao).length > 0

interface Props {
  deliberacao: DeliberacaoRecord
  itens: ItemPautaRecord[]
  onSalvo?: () => void
}

const iniciaTotais = (): TotaisItem => ({ favoraveis: '', contrarios: '', abstencoes: '' })

/**
 * Painel de lançamento manual dos totais físicos (cédulas de papel)
 * pela mesa diretora (modalidade_presencial = 'manual', migration 0053).
 *
 * Cada item recebe favoráveis/contrários/abstenções; os valores entram na
 * consolidação do Boletim da Urna junto com os votos digitais. A trilha
 * de auditoria (quem lançou, quando, valores anteriores) fica no backend
 * (hook lancamento_fisico.js, collection lancamentos_fisicos).
 */
export const PainelLancamentoFisico: React.FC<Props> = ({ deliberacao, itens, onSalvo }) => {
  const { user } = useAuth()
  const [lancamentos, setLancamentos] = useState<LancamentoFisicoRecord[]>([])
  const [totais, setTotais] = useState<Record<string, TotaisItem>>({})
  const [votosCandidatos, setVotosCandidatos] = useState<Record<string, string[]>>({})
  const [observacao, setObservacao] = useState('')
  const [salvando, setSalvando] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let cancel = false
    setCarregando(true)
    ;(async () => {
      try {
        const lista = await api.getLancamentosFisicos(deliberacao.id)
        if (cancel) return
        setLancamentos(lista)
        const mapa: Record<string, TotaisItem> = {}
        for (const item of itens) {
          const l = lista.find((x) => x.item === item.id)
          mapa[item.id] = l
            ? {
                favoraveis: String(l.favoraveis ?? ''),
                contrarios: String(l.contrarios ?? ''),
                abstencoes: String(l.abstencoes ?? ''),
              }
            : iniciaTotais()
        }
        const mapaCand: Record<string, string[]> = {}
        for (const item of itens) {
          if (!ehItemEleicao(item)) continue
          const l = lista.find((x) => x.item === item.id)
          const arr = normalizarVotosPorCandidato(l?.votos_por_candidato)
          mapaCand[item.id] = normalizarCandidatosEleicao(item.candidatos_eleicao).map((_, i) =>
            String(arr[i] ?? ''),
          )
        }
        setVotosCandidatos(mapaCand)
      } catch (err: unknown) {
        toast({
          title: 'Falha ao carregar lançamentos',
          description: getErrorMessage(err, 'Tente novamente.'),
          variant: 'destructive',
        })
      } finally {
        if (!cancel) setCarregando(false)
      }
    })()
    return () => {
      cancel = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliberacao.id, itens.map((i) => i.id).join('|')])

  /** Itens de eleição: guarda só a contagem por candidato. */
  const salvar = async (itemId: string) => {
    const item = itens.find((i) => i.id === itemId)
    if (!item) return
    setSalvando(itemId)
    try {
      if (ehItemEleicao(item)) {
        const arr = (votosCandidatos[itemId] || []).map((v) => parseInt(v || '0', 10) || 0)
        const resp = await api.salvarLancamentoFisico({
          deliberacaoId: deliberacao.id,
          itemId,
          votosPorCandidato: arr,
          observacao: observacao.trim() || undefined,
        })
        if (!resp.success) throw new Error(resp.message || 'Falha ao salvar lançamento.')
      } else {
        const t = totais[itemId] || iniciaTotais()
        const resp = await api.salvarLancamentoFisico({
          deliberacaoId: deliberacao.id,
          itemId,
          favoraveis: parseInt(t.favoraveis || '0', 10) || 0,
          contrarios: parseInt(t.contrarios || '0', 10) || 0,
          abstencoes: parseInt(t.abstencoes || '0', 10) || 0,
          observacao: observacao.trim() || undefined,
        })
        if (!resp.success) throw new Error(resp.message || 'Falha ao salvar lançamento.')
      }
      toast({
        title: 'Lançamento físico registrado',
        description: ehItemEleicao(item)
          ? 'A contagem por candidato entra na apuração da eleição.'
          : 'Os totais entram na consolidação do boletim da urna.',
      })
      const lista = await api.getLancamentosFisicos(deliberacao.id)
      setLancamentos(lista)
      setObservacao('')
      onSalvo?.()
    } catch (err: unknown) {
      toast({
        title: 'Não foi possível salvar',
        description: getErrorMessage(err, 'Verifique os valores e tente novamente.'),
        variant: 'destructive',
      })
    } finally {
      setSalvando(null)
    }
  }

  const setCampo = (itemId: string, campo: keyof TotaisItem, valor: string) => {
    const apenasDigitos = valor.replace(/\D/g, '').slice(0, 4)
    setTotais((t) => ({
      ...t,
      [itemId]: { ...(t[itemId] || iniciaTotais()), [campo]: apenasDigitos },
    }))
  }

  const setVotoCandidato = (itemId: string, indice: number, valor: string) => {
    const apenasDigitos = valor.replace(/\D/g, '').slice(0, 4)
    setVotosCandidatos((t) => {
      const atual = t[itemId] || []
      const novo = [...atual]
      novo[indice] = apenasDigitos
      return { ...t, [itemId]: novo }
    })
  }

  const lancamentoDoItem = (itemId: string) => lancamentos.find((l) => l.item === itemId)

  if (carregando) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500 p-4">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando lançamentos físicos…
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <PenLine className="h-4 w-4 text-[#0066FF]" /> Lançamento manual dos votos físicos
          </h3>
          <p className="text-xs text-slate-500">
            Digite os totais apurados nas cédulas de papel de cada item. A trilha de auditoria
            registra quem lançou, quando e os valores anteriores.
          </p>
        </div>
        {user && (
          <Badge variant="outline" className="text-[10px]">
            Operador: {user.name || user.email}
          </Badge>
        )}
      </div>

      <div className="space-y-3">
        {itens.length === 0 && (
          <p className="text-sm text-slate-500">
            Nenhum item de pauta nesta deliberação para lançar totais.
          </p>
        )}
        {itens.map((item) => {
          const l = lancamentoDoItem(item.id)
          return (
            <Card key={item.id} className="border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-900">
                  {item.ordem ? `${item.ordem}. ` : ''}
                  {item.titulo}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {ehItemEleicao(item) ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {normalizarCandidatos(item.candidatos_eleicao).map((cand, i) => (
                        <div key={`${item.id}-cand-${i}`} className="space-y-1">
                          <Label htmlFor={`cand-${item.id}-${i}`} className="text-[11px]">
                            {cand.nome}
                            {cand.cargo ? ` — ${cand.cargo}` : ''}
                          </Label>
                          <Input
                            id={`cand-${item.id}-${i}`}
                            inputMode="numeric"
                            autoComplete="off"
                            className="h-9"
                            value={votosCandidatos[item.id]?.[i] ?? ''}
                            onChange={(e) => setVotoCandidato(item.id, i, e.target.value)}
                            placeholder="0"
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Eleição: lance a contagem de cédulas físicas por candidato. Ela entra na
                      apuração junto com os votos digitais da urna.
                    </p>
                  </>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        ['favoraveis', 'Favoráveis'],
                        ['contrarios', 'Contrários'],
                        ['abstencoes', 'Abstenções'],
                      ] as const
                    ).map(([campo, rotulo]) => (
                      <div key={campo} className="space-y-1">
                        <Label htmlFor={`${campo}-${item.id}`} className="text-[11px]">
                          {rotulo}
                        </Label>
                        <Input
                          id={`${campo}-${item.id}`}
                          inputMode="numeric"
                          autoComplete="off"
                          className="h-9"
                          value={totais[item.id]?.[campo] ?? ''}
                          onChange={(e) => setCampo(item.id, campo, e.target.value)}
                          placeholder="0"
                        />
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  {l ? (
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      <History className="h-3 w-3" />
                      Último lançamento por {l.lancado_por || 'mesa'} — {l.created || ''}
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400">Sem lançamento físico ainda.</span>
                  )}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => {
                        if (ehItemEleicao(item)) {
                          const arr = l?.votos_por_candidato ?? []
                          setVotosCandidatos((t) => ({
                            ...t,
                            [item.id]: normalizarCandidatos(item.candidatos_eleicao).map((_, i) =>
                              String(arr[i] ?? ''),
                            ),
                          }))
                        } else {
                          setTotais((t) => ({
                            ...t,
                            [item.id]: l
                              ? {
                                  favoraveis: String(l.favoraveis ?? ''),
                                  contrarios: String(l.contrarios ?? ''),
                                  abstencoes: String(l.abstencoes ?? ''),
                                }
                              : iniciaTotais(),
                          }))
                        }
                      }}
                    >
                      <RotateCcw className="mr-1 h-3 w-3" /> Reverter
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 text-xs bg-[#0066FF] hover:bg-[#0055d4]"
                      onClick={() => void salvar(item.id)}
                      disabled={salvando === item.id}
                    >
                      {salvando === item.id ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <Save className="mr-1 h-3 w-3" />
                      )}
                      Salvar totais
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="space-y-1">
        <Label htmlFor="obs-lancamento" className="text-[11px]">
          Observação geral (opcional — consta na trilha de auditoria)
        </Label>
        <Input
          id="obs-lancamento"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder="Ex.: cédulas conferidas pelo secretário às 20h35"
          maxLength={200}
        />
      </div>
    </div>
  )
}

export default PainelLancamentoFisico
