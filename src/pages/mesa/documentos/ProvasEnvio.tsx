/**
 * Provas de envio da convocação (migration 0040 — campos prova_* em notificacoes).
 * Tabela de trilha + exportação CSV (BOM UTF-8, separador ";" para Excel pt-BR).
 */
import { useMemo } from 'react'
import { Download, MailCheck, ShieldCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { NotificacaoRecord } from '@/lib/api'

export interface ProvasEnvioProps {
  notificacoes: NotificacaoRecord[]
}

function escaparCsv(valor?: string | null): string {
  const v = (valor ?? '').toString().replace(/"/g, '""')
  return `"${v}"`
}

function formatarDataHora(iso?: string | null): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    return d.toLocaleString('pt-BR')
  } catch {
    return iso
  }
}

const ROTULO_STATUS: Record<string, string> = {
  enviada: 'Enviada',
  falha: 'Falha',
  pendente: 'Pendente',
}

export function ProvasEnvio({ notificacoes }: ProvasEnvioProps) {
  const comProva = useMemo(
    () => notificacoes.filter((n) => n.prova_canal || n.prova_status || n.prova_data_hora),
    [notificacoes],
  )

  const exportarCsv = () => {
    const cabecalho = [
      'Destinatário',
      'Canal',
      'Status',
      'Data/hora do envio',
      'Hash do documento (SHA-256)',
      'Tipo',
    ]
    const linhas = comProva.map((n) =>
      [
        n.destinatario || '',
        n.prova_canal || '',
        n.prova_status || n.status || '',
        formatarDataHora(n.prova_data_hora),
        n.prova_hash_documento || '',
        n.tipo || '',
      ]
        .map(escaparCsv)
        .join(';'),
    )
    const csv = '\ufeff' + [cabecalho.map(escaparCsv).join(';'), ...linhas].join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `provas-envio-convocacao-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-[#0066FF]" />
              Provas de envio
            </CardTitle>
            <CardDescription>
              Trilha de auditoria da convocação: canal, status, data/hora e hash SHA-256 do PDF
              anexado a cada envio (migration 0040).
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={exportarCsv}
            disabled={comProva.length === 0}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Exportar CSV ({comProva.length})
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {comProva.length === 0 ? (
          <div className="flex items-center gap-2 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-sm text-slate-500">
            <MailCheck className="h-4 w-4" />
            Nenhuma prova de envio registrada ainda — elas aparecem aqui após o disparo da
            convocação com o PDF anexado.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-semibold">Destinatário</th>
                  <th className="px-3 py-2 font-semibold">Canal</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Data/hora</th>
                  <th className="px-3 py-2 font-semibold">Hash do documento</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {comProva.map((n) => {
                  const status = n.prova_status || n.status
                  const falhou = status === 'falha'
                  const enviada = status === 'enviada'
                  return (
                    <tr key={n.id} className="align-top">
                      <td className="px-3 py-2 font-medium text-slate-700">{n.destinatario}</td>
                      <td className="px-3 py-2 text-slate-600">{n.prova_canal || '—'}</td>
                      <td className="px-3 py-2">
                        <Badge
                          className={
                            falhou
                              ? 'bg-red-100 text-red-700'
                              : enviada
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-700'
                          }
                        >
                          {ROTULO_STATUS[status] || status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] text-slate-600">
                        {formatarDataHora(n.prova_data_hora) || '—'}
                      </td>
                      <td className="max-w-[220px] px-3 py-2 font-mono text-[10px] break-all text-slate-600">
                        {n.prova_hash_documento || '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
