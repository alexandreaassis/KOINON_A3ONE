import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/use-toast'
import { MessageCircle, Copy, ExternalLink } from 'lucide-react'
import { copiarTexto, montarLinkWhatsapp } from '@/lib/whatsapp'

export interface ContatoWhatsapp {
  /** Somente dígitos com prefixo 55 (saída de normalizarNumeroWhatsapp). */
  internacional: string
  /** Telefone legível, para exibição. */
  formatado: string
}

export interface DialogWhatsappProps {
  aberto: boolean
  onFechar: () => void
  titulo: string
  descricao?: string
  contato?: ContatoWhatsapp | null
  mensagem: string
  onMensagemChange: (nova: string) => void
  rotuloMensagem?: string
}

/**
 * Dialog genérico de envio manual por WhatsApp: mensagem editável em textarea,
 * botão que abre o deep link wa.me com o texto preenchido e botão de copiar.
 * Sem integração de API — o disparo é feito pela pessoa da mesa.
 */
const DialogWhatsapp: React.FC<DialogWhatsappProps> = ({
  aberto,
  onFechar,
  titulo,
  descricao,
  contato,
  mensagem,
  onMensagemChange,
  rotuloMensagem = 'Mensagem (editável)',
}) => {
  const numeroOk = !!contato && contato.internacional.length >= 12

  const abrirWhatsapp = () => {
    if (!contato || !numeroOk) return
    window.open(
      montarLinkWhatsapp(contato.internacional, mensagem),
      '_blank',
      'noopener,noreferrer',
    )
  }

  const copiar = async () => {
    const ok = await copiarTexto(mensagem)
    toast({
      title: ok ? 'Mensagem copiada' : 'Não foi possível copiar',
      description: ok
        ? 'Cole no WhatsApp (ou onde preferir) e envie.'
        : 'Copie o texto manualmente da caixa acima.',
      variant: ok ? 'default' : 'destructive',
    })
  }

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-emerald-600" /> {titulo}
          </DialogTitle>
          {descricao && (
            <DialogDescription className="text-xs text-slate-600 pt-1">
              {descricao}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-3 py-1">
          {contato && (
            <p className="text-xs text-slate-700">
              <span className="font-semibold">Número:</span> {contato.formatado}
              {!numeroOk && (
                <span className="ml-2 text-red-700 font-semibold">
                  (número inválido — confira o cadastro)
                </span>
              )}
            </p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="mensagem-whatsapp" className="text-xs font-semibold text-slate-700">
              {rotuloMensagem}
            </Label>
            <Textarea
              id="mensagem-whatsapp"
              value={mensagem}
              onChange={(e) => onMensagemChange(e.target.value)}
              rows={6}
              className="text-xs"
            />
          </div>
          <p className="text-[11px] text-slate-500">
            O envio é manual: abrimos o WhatsApp com o texto pronto — nenhum sistema dispara
            mensagem por você. Nunca envie senhas por esta via.
          </p>
        </div>

        <DialogFooter className="gap-2 pt-1 sm:flex-col sm:justify-end">
          <Button
            type="button"
            size="sm"
            disabled={!numeroOk}
            onClick={abrirWhatsapp}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
          >
            <MessageCircle className="h-3.5 w-3.5" /> Abrir WhatsApp
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={copiar}
            className="text-xs gap-1.5"
          >
            <Copy className="h-3.5 w-3.5" /> Copiar mensagem
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default DialogWhatsapp
