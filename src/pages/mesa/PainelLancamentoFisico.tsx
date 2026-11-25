import React, { useEffect, useMemo, useState } from 'react'
import {
  api,
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
        setTotais(mapa)
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

  const totalDigitais = useMemo(() => {
    return itens.map((i) => ({
      itemId: i.id,
      favoraveis: 0,
      contrarios: 0,
      abstencoes: 0,
    }))
  }, [itens])

  const salvar = async (itemId: string) => {
    const t = totais[itemId] || iniciaTotais()
    setSalvando(itemId)
    try {
      const resp = await api.salvarLancamentoFisico({
        deliberacaoId: deliberacao.id,
        itemId,
        favoraveis: parseInt(t.favoraveis || '0', 10) || 0,
        contrarios: parseInt(t.contrarios || '0', 10) || 0,
        abstencoes: parseInt(t.abstencoes || '0', 10) || 0,
        observacao: observacao.trim() || undefined,
      })
      if (!resp.success) throw new Error(resp.message || 'Falha ao salvar lançamento.')
      toast({
        title: 'Lançamento físico registrado',
        description: 'Os totais entram na consolidação do boletim da urna.',
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
                      onClick={() =>
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
