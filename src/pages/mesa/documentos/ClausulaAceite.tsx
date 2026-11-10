/**
 * Cláusula de Aceite do método de assinatura eletrônica (aba da tela do edital).
 * Gera o texto-modelo via gerarClausulaAceite (src/lib/organizacao/config.ts),
 * exibe a marca de validação e permite download .txt.
 */
import { useMemo, useState } from 'react'
import { Download, FileText, Scale, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MARCA_VALIDACAO_ADVOGADO, gerarClausulaAceite } from '@/lib/organizacao/config'

export interface ClausulaAceiteProps {
  nomeOrganizacao: string
  nomeDocumentoNormativo: string
  cargoSignatario: string
  clausulaSalva?: string | null
  versaoSalva?: string | null
  statusSalvo?: string | null
  onSalvar?: (texto: string) => Promise<void> | void
}

export function ClausulaAceite({
  nomeOrganizacao,
  nomeDocumentoNormativo,
  cargoSignatario,
  clausulaSalva,
  versaoSalva,
  statusSalvo,
  onSalvar,
}: ClausulaAceiteProps) {
  const [salvando, setSalvando] = useState(false)

  const texto = useMemo(
    () =>
      gerarClausulaAceite({
        nome_organizacao: nomeOrganizacao || 'a organização',
        nome_documento_normativo: nomeDocumentoNormativo || 'documento normativo',
        cargo_signatario: cargoSignatario || 'Síndico',
      }),
    [nomeOrganizacao, nomeDocumentoNormativo, cargoSignatario],
  )

  const baixarTxt = () => {
    const blob = new Blob(['\ufeff' + texto], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'clausula-aceite-assinatura-eletronica.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const salvar = async () => {
    if (!onSalvar) return
    try {
      setSalvando(true)
      await onSalvar(texto)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Scale className="h-4 w-4 text-[#0066FF]" />
          Cláusula de Aceite do Método de Assinatura
        </CardTitle>
        <CardDescription>
          Texto-modelo para incorporação ao {nomeDocumentoNormativo || 'documento normativo'} —
          define o método de assinatura eletrônica aceito pela organização (MP 2.200-2/2001, art.
          10, §2º; Lei 14.063/2020).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            <strong>{MARCA_VALIDACAO_ADVOGADO}</strong> — a plataforma não presta consultoria
            jurídica. Valide o texto com o advogado da organização antes de incorporá-lo ao
            documento normativo ou aprová-lo em assembleia.
          </span>
        </div>

        {clausulaSalva ? (
          <p className="text-xs text-slate-500">
            Versão registrada na configuração: <strong>{versaoSalva || '—'}</strong> • Status:{' '}
            <strong>{statusSalvo || '—'}</strong> • O texto abaixo é gerado a partir da configuração
            atual da organização.
          </p>
        ) : (
          <p className="text-xs text-slate-500">
            Nenhuma versão registrada ainda — gere, valide com o advogado e registre na configuração
            da organização.
          </p>
        )}

        <div className="rounded-md border bg-slate-50 p-4">
          <pre className="whitespace-pre-wrap font-serif text-[13px] leading-relaxed text-slate-800">
            {texto}
          </pre>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={baixarTxt}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Baixar .txt
          </Button>
          {onSalvar && (
            <Button size="sm" onClick={salvar} disabled={salvando}>
              <FileText className="mr-1.5 h-3.5 w-3.5" />
              {salvando ? 'Registrando…' : 'Registrar na configuração'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
