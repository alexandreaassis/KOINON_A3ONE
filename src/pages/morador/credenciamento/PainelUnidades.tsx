import React, { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock, RefreshCw, ShieldCheck, UserCheck } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  api,
  type CredenciamentoRecord,
  type DeliberacaoRecord,
  type UnidadeRecord,
} from '@/lib/api'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { formatarUnidadeComBloco } from '@/lib/formatadorUnidade'

export type StatusCredenciamento = 'nao_credenciado' | 'pendente' | 'aprovado' | 'rejeitado'

export interface LinhaUnidadeCredenciamento {
  unidade: UnidadeRecord
  credenciamento: CredenciamentoRecord | null
  status: StatusCredenciamento
}

const ROTULO_STATUS: Record<StatusCredenciamento, string> = {
  nao_credenciado: 'Não credenciado',
  pendente: 'Pendente de homologação',
  aprovado: 'Credenciado (aprovado)',
  rejeitado: 'Credenciamento rejeitado',
}

const CLASSE_STATUS: Record<StatusCredenciamento, string> = {
  nao_credenciado: 'bg-[#5A6B82]/15 text-[#002B5E] border-[#5A6B82]/30',
  pendente: 'bg-amber-50 text-amber-700 border-amber-300',
  aprovado: 'bg-emerald-50 text-emerald-700 border-emerald-300',
  rejeitado: 'bg-red-50 text-red-700 border-red-300',
}

const ICONE_STATUS: Record<StatusCredenciamento, React.ComponentType<{ className?: string }>> = {
  nao_credenciado: ShieldCheck,
  pendente: Clock,
  aprovado: CheckCircle2,
  rejeitado: AlertTriangle,
}

export function rotuloStatusCredenciamento(status: StatusCredenciamento): string {
  return ROTULO_STATUS[status]
}

/**
 * Painel que lista TODAS as unidades vinculadas à conta (users.unidades) com o
 * status de credenciamento de cada uma para a deliberação informada.
 */
export const PainelUnidades: React.FC<{
  deliberacao: DeliberacaoRecord | null
  unidades: UnidadeRecord[]
  /** Incrementado pela página após cada submissão para recarregar os status */
  versao: number
  onCredenciar: (linha: LinhaUnidadeCredenciamento) => void
}> = ({ deliberacao, unidades, versao, onCredenciar }) => {
  const [linhas, setLinhas] = useState<LinhaUnidadeCredenciamento[] | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [atualizacoes, setAtualizacoes] = useState(0)

  const idsUnidades = useMemo(
    () =>
      unidades
        .map((u) => u.id)
        .sort()
        .join(','),
    [unidades],
  )

  useEffect(() => {
    let ativo = true
    const carregar = async () => {
      if (!deliberacao || unidades.length === 0) {
        setLinhas(null)
        setCarregando(false)
        setErro(null)
        return
      }
      setCarregando(true)
      setErro(null)
      try {
        const registros = await api.getCredenciamentos()
        if (!ativo) return
        const porUnidade = new Map<string, CredenciamentoRecord>()
        for (const c of registros) {
          // Mantém o credenciamento mais recente de cada unidade (a mesa homologa cada procuração)
          const atual = porUnidade.get(c.unidade)
          const dataAtual = c.updated || c.created || ''
          const dataAnterior = atual ? atual.updated || atual.created || '' : ''
          if (!atual || dataAtual >= dataAnterior) {
            porUnidade.set(c.unidade, c)
          }
        }
        setLinhas(
          unidades.map((unidade) => {
            const credenciamento = porUnidade.get(unidade.id) || null
            const status: StatusCredenciamento = credenciamento
              ? (credenciamento.status as StatusCredenciamento)
              : 'nao_credenciado'
            return { unidade, credenciamento, status }
          }),
        )
      } catch (err) {
        if (!ativo) return
        setErro(
          getErrorMessage(
            err,
            'Não foi possível carregar o status de credenciamento das unidades.',
          ),
        )
        setLinhas(null)
      } finally {
        if (ativo) setCarregando(false)
      }
    }
    carregar()
    return () => {
      ativo = false
    }
  }, [deliberacao, idsUnidades, versao, atualizacoes])

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base text-[#002B5E]">Unidades vinculadas à conta</CardTitle>
            {deliberacao ? (
              <CardDescription className="mt-1">
                Status de credenciamento para{' '}
                <strong className="font-semibold">{deliberacao.titulo}</strong>. Cada unidade é
                credenciada separadamente — inclusive as representadas por procuração.
              </CardDescription>
            ) : (
              <CardDescription className="mt-1">
                Não há assembleia ou deliberação em andamento no momento.
              </CardDescription>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAtualizacoes((v) => v + 1)}
            className="shrink-0 gap-2 border-[#5A6B82]/25 text-[#002B5E] hover:bg-[#F3F7FC]"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {erro && (
          <div className="mb-4 flex items-start gap-2 rounded-[10px] border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{erro}</span>
          </div>
        )}
        {carregando ? (
          <div className="space-y-2" aria-busy="true" aria-live="polite">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-[12px]" />
            ))}
          </div>
        ) : linhas ? (
          <ListaUnidades linhas={linhas} onCredenciar={onCredenciar} />
        ) : (
          <ListaUnidadesSimples unidades={unidades} />
        )}
      </CardContent>
    </Card>
  )
}

/** Exibição sem deliberação ativa ou quando a consulta falhou: apenas as unidades da conta. */
const ListaUnidadesSimples: React.FC<{ unidades: UnidadeRecord[] }> = ({ unidades }) => (
  <ul className="space-y-2">
    {unidades.map((u) => (
      <li
        key={u.id}
        className="flex items-center justify-between gap-3 rounded-[12px] border border-[#5A6B82]/20 bg-[#F3F7FC] px-4 py-3"
      >
        <span className="text-sm font-medium text-[#002B5E]">{formatarUnidadeComBloco(u)}</span>
        <Badge variant="outline" className={CLASSE_STATUS.nao_credenciado}>
          {ROTULO_STATUS.nao_credenciado}
        </Badge>
      </li>
    ))}
  </ul>
)

const ListaUnidades: React.FC<{
  linhas: LinhaUnidadeCredenciamento[]
  onCredenciar: (linha: LinhaUnidadeCredenciamento) => void
}> = ({ linhas, onCredenciar }) => (
  <ul className="space-y-2">
    {linhas.map(({ unidade, credenciamento, status }) => {
      const StatusIcone = ICONE_STATUS[status]
      return (
        <li
          key={unidade.id}
          className="flex flex-col gap-3 rounded-[12px] border border-[#5A6B82]/20 bg-[#F3F7FC] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex min-w-0 items-start gap-3">
            <StatusIcone className="mt-0.5 h-4 w-4 shrink-0 text-[#5A6B82]" aria-hidden="true" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#002B5E]">
                {formatarUnidadeComBloco(unidade)}
              </p>
              {credenciamento && status !== 'nao_credenciado' && (
                <p className="mt-0.5 truncate text-xs text-[#5A6B82]">
                  {credenciamento.titular_nome} • CPF {credenciamento.cpf}
                </p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="outline" className={CLASSE_STATUS[status]}>
              {ROTULO_STATUS[status]}
            </Badge>
            {status !== 'aprovado' && (
              <Button
                size="sm"
                onClick={() => onCredenciar({ unidade, credenciamento, status })}
                className="gap-2 bg-[#0066FF] text-[#FFFFFF] hover:bg-[#0052CC]"
              >
                <UserCheck className="h-3.5 w-3.5" />
                Credenciar esta unidade
              </Button>
            )}
          </div>
        </li>
      )
    })}
  </ul>
)
