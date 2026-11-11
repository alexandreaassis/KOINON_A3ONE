import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { AlertTriangle, Check, Copy, ExternalLink, FileSignature } from 'lucide-react'
import type { ZapSignSignatarioUrl } from '@/lib/api'

interface ModalZapsignLinksProps {
  aberto: boolean
  onOpenChange: (aberto: boolean) => void
  tituloDocumento: string
  docToken?: string | null
  signatarios: ZapSignSignatarioUrl[]
}

/**
 * Modal de links individuais de assinatura ZapSign — reutilizado pelo edital,
 * pela lista de presença e pela ata. Mostra copiar/abrir por signatário.
 */
export function ModalZapsignLinks({
  aberto,
  onOpenChange,
  tituloDocumento,
  docToken,
  signatarios,
}: ModalZapsignLinksProps) {
  const { toast } = useToast()
  const [copiandoIdx, setCopiandoIdx] = useState<number | null>(null)

  const copiar = async (url: string, nome: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiandoIdx(idx)
      toast({ title: 'Copiado!', description: `Link de ${nome} copiado.` })
      setTimeout(() => setCopiandoIdx(null), 1500)
    } catch {
      toast({
        title: 'Não foi possível copiar',
        description: 'Selecione o texto do link manualmente para copiar.',
        variant: 'destructive',
      })
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileSignature className="h-4 w-4 text-[#0066FF]" /> Documento Criado na ZapSign
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-600 pt-1">
            {tituloDocumento} foi submetido para assinatura eletrônica. Compartilhe os links
            individuais abaixo com cada signatário.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-3">
          {(!signatarios || signatarios.length === 0) && (
            <div className="p-3 rounded-lg border border-amber-300 bg-amber-50 text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Nenhum link de assinatura retornado pela ZapSign</p>
                <p className="leading-relaxed">
                  O documento foi criado, mas a ZapSign não devolveu os links individuais nesta
                  resposta. Distribua os convites diretamente pelo painel da ZapSign ou tente enviar
                  novamente.
                </p>
              </div>
            </div>
          )}

          {docToken && (
            <div className="p-2.5 rounded bg-slate-50 border border-slate-200 text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Token ZapSign
              </span>
              <span className="font-mono text-[11px] text-[#002B5E] break-all">{docToken}</span>
            </div>
          )}

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {signatarios.map((sig, idx) => (
              <div
                key={`${sig.token || sig.sign_url || idx}`}
                className="p-3 border border-slate-200 rounded-lg bg-white space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{sig.nome}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {sig.signed || sig.status === 'signed' ? '✓ Assinado' : 'Pendente'}
                  </Badge>
                </div>
                {sig.sign_url && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1">
                    <input
                      type="text"
                      readOnly
                      value={sig.sign_url}
                      className="w-full min-w-0 flex-1 text-[11px] font-mono bg-slate-50 border border-slate-200 rounded px-2 py-1 select-all break-all"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => copiar(sig.sign_url || '', sig.nome, idx)}
                      className="text-xs h-7 px-2"
                    >
                      {copiandoIdx === idx ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                    <a
                      href={sig.sign_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] bg-[#0066FF] hover:bg-[#0052cc] text-white rounded px-2.5 py-1 font-medium h-7 shrink-0"
                    >
                      <ExternalLink className="h-3 w-3" /> Abrir
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>

          <p className="text-[11px] text-slate-500">
            Assim que todos assinarem, o webhook da ZapSign atualiza o documento automaticamente com
            o PDF assinado e o hash SHA-256 (visível na Auditoria).
          </p>
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="bg-[#002B5E] text-white text-xs"
          >
            Entendido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
