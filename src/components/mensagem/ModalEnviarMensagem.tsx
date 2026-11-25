import React, { useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { toast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { api } from '@/lib/api'
import { useCondoConfig } from '@/context/CondoConfigContext'
import { normalizarNumeroWhatsapp, montarLinkWhatsapp } from '@/lib/whatsapp'
import {
  aplicarVariaveis,
  modeloPadrao,
  resolverModelo,
  VARIAVEIS_MODELO,
  ROTULOS_VARIAVEIS,
  type CanalModelo,
  type TipoModelo,
} from '@/lib/modelosMensagem'
import { Mail, MessageCircle, Send, Variable, AlertTriangle } from 'lucide-react'

export interface ModalEnviarMensagemProps {
  aberto: boolean
  onOpenChange: (aberto: boolean) => void
  nome: string
  telefone?: string | null
  email?: string | null
  unidade?: string
  link?: string
  /** Tela de origem, registrada no histórico de envios. */
  tela: string
}

type ModoSelecionado = 'whatsapp' | 'email'

const TIPOS_MODELO: Array<{ valor: TipoModelo; rotulo: string }> = [
  { valor: 'cadastro_aprovado', rotulo: 'Cadastro aprovado' },
  { valor: 'ata_publicada', rotulo: 'Ata publicada' },
]

/**
 * Diálogo de mensagem direta individual para um cadastro/pessoa:
 * escolha de canal (WhatsApp e/ou e-mail), modelo cadastrado em
 * Configurações › Modelos de mensagem, preview com as variáveis
 * [NOME]/[UNIDADE]/[LINK] substituídas e edição livre antes de enviar.
 * WhatsApp abre o wa.me do morador (envio manual pelo WhatsApp Oficial);
 * e-mail parte pelo SMTP da plataforma e registra no Histórico de envios.
 */
const ModalEnviarMensagem: React.FC<ModalEnviarMensagemProps> = ({
  aberto,
  onOpenChange,
  nome,
  telefone,
  email,
  unidade,
  link,
  tela,
}) => {
  const { modelosMensagem } = useCondoConfig()

  const [modo, setModo] = useState<ModoSelecionado>('whatsapp')
  const [tipoModelo, setTipoModelo] = useState<TipoModelo>('cadastro_aprovado')
  const [texto, setTexto] = useState('')
  const [editadoPeloUsuario, setEditadoPeloUsuario] = useState(false)
  const [enviandoEmail, setEnviandoEmail] = useState(false)

  const contatoWhats = useMemo(
    () => (telefone ? normalizarNumeroWhatsapp(telefone) : null),
    [telefone],
  )
  const numeroOk = !!contatoWhats && contatoWhats.valido && contatoWhats.internacional.length >= 12
  const emailOk = !!email && email.includes('@')

  // Modelo salvo (ou default quando não há modelo cadastrado para o canal)
  const modeloResolvido = useMemo(
    () => resolverModelo(modelosMensagem, modo, tipoModelo, { nome, unidade }),
    [modelosMensagem, modo, tipoModelo, nome, unidade],
  )
  const usaDefault = useMemo(
    () =>
      resolverModelo(modelosMensagem, modo, tipoModelo, { nome, unidade }) ===
      modeloPadrao(modo, tipoModelo, { nome, unidade }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [modelosMensagem, modo, tipoModelo, nome, unidade],
  )

  // Prévia do texto com as variáveis substituídas
  const preview = useMemo(
    () => aplicarVariaveis(texto, { nome, unidade, link }),
    [texto, nome, unidade, link],
  )

  // Ao abrir (ou trocar canal/modelo), recarrega o texto do modelo — a edição
  // livre do usuário prevalece enquanto ele não voltar a trocar de modelo.
  useEffect(() => {
    if (!aberto) return
    setEditadoPeloUsuario(false)
    setTexto(aplicarVariaveis(modeloResolvido, { nome, unidade, link }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, modo, tipoModelo])

  const rotuloTipoModelo =
    TIPOS_MODELO.find((t) => t.valor === tipoModelo)?.rotulo ?? 'mensagem livre'

  const registrarEnvio = async (canal: CanalModelo, mensagemFinal: string) => {
    const resposta = await api.enviarMensagemDireta({
      canal,
      destinatario: canal === 'email' ? (email as string) : (contatoWhats?.internacional ?? ''),
      destinatario_nome: nome,
      unidade,
      mensagem: mensagemFinal,
      modelo: `${rotuloTipoModelo} (${canal === 'email' ? 'e-mail' : 'WhatsApp'})`,
      tela,
    })
    return resposta
  }

  const enviarEmail = async () => {
    if (!emailOk || !preview.trim()) return
    setEnviandoEmail(true)
    try {
      const resp = await registrarEnvio('email', preview)
      toast({
        title: 'E-mail enviado',
        description: resp?.message || `Mensagem enviada para ${email} e registrada no Histórico.`,
      })
      onOpenChange(false)
    } catch (err) {
      toast({
        title: 'Erro ao enviar e-mail',
        description: getErrorMessage(err, 'Não foi possível enviar a mensagem por e-mail.'),
        variant: 'destructive',
      })
    } finally {
      setEnviandoEmail(false)
    }
  }

  const enviarWhatsapp = async () => {
    if (!contatoWhats || !numeroOk || !preview.trim()) return
    try {
      // Registro do disparo manual no Histórico (wa.me é aberto na sequência)
      await registrarEnvio('whatsapp', preview)
    } catch (err) {
      // Falha de registro não impede o disparo manual pelo wa.me
      console.warn('Aviso ao registrar disparo de WhatsApp no histórico:', err)
    }
    window.open(
      montarLinkWhatsapp(contatoWhats.internacional, preview),
      '_blank',
      'noopener,noreferrer',
    )
    onOpenChange(false)
  }

  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Send className="h-4 w-4 text-[#0066FF]" /> Enviar mensagem
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-600 pt-1">
            Mensagem individual para <strong>{nome || 'cadastro'}</strong>
            {unidade ? ` — ${unidade}` : ''}. Escolha o canal, o modelo e edite o texto à vontade
            antes de enviar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Dados do cadastro */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 space-y-1">
            <p className="text-xs text-slate-700">
              <span className="font-semibold">Nome:</span> {nome || '—'}
            </p>
            <p className="text-xs text-slate-700">
              <span className="font-semibold">Telefone:</span>{' '}
              {contatoWhats?.formatado || telefone || 'não informado'}
              {telefone && !numeroOk && (
                <span className="ml-2 font-semibold text-red-700">(número inválido)</span>
              )}
            </p>
            <p className="text-xs text-slate-700">
              <span className="font-semibold">E-mail:</span> {email || 'não informado'}
            </p>
            {unidade && (
              <p className="text-xs text-slate-700">
                <span className="font-semibold">Unidade:</span> {unidade}
              </p>
            )}
          </div>

          {/* Canal */}
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setModo('whatsapp')}
              aria-pressed={modo === 'whatsapp'}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-xs transition-colors cursor-pointer ${
                modo === 'whatsapp'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <MessageCircle className="h-4 w-4 shrink-0" />
              <span>
                <span className="block font-semibold">WhatsApp</span>
                <span className="block text-[11px] text-slate-500">
                  Abre o wa.me do morador (envio manual)
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setModo('email')}
              aria-pressed={modo === 'email'}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-xs transition-colors cursor-pointer ${
                modo === 'email'
                  ? 'border-[#0066FF] bg-[#0066FF]/5 text-[#002B5E]'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <Mail className="h-4 w-4 shrink-0" />
              <span>
                <span className="block font-semibold">E-mail</span>
                <span className="block text-[11px] text-slate-500">
                  Envia pelo SMTP da plataforma
                </span>
              </span>
            </button>
          </div>

          {/* Modelo */}
          <div className="space-y-1.5">
            <Label htmlFor="modelo-mensagem" className="text-xs font-semibold text-slate-700">
              Modelo de mensagem
            </Label>
            <Select value={tipoModelo} onValueChange={(v) => setTipoModelo(v as TipoModelo)}>
              <SelectTrigger id="modelo-mensagem" className="text-xs h-9 bg-white">
                <SelectValue placeholder="Escolha o modelo..." />
              </SelectTrigger>
              <SelectContent className="text-xs">
                {TIPOS_MODELO.map((t) => (
                  <SelectItem key={t.valor} value={t.valor}>
                    {t.rotulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-slate-500">
              {usaDefault
                ? 'Não há modelo cadastrado para este canal em Configurações › Modelos de mensagem — usando o texto padrão.'
                : 'Modelo cadastrado em Configurações › Modelos de mensagem.'}
            </p>
          </div>

          {/* Texto editável */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <Label htmlFor="texto-mensagem" className="text-xs font-semibold text-slate-700">
                Mensagem (editável)
              </Label>
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                <Variable className="h-3 w-3" />
                {VARIAVEIS_MODELO.map((v) => (
                  <Badge key={v} variant="secondary" className="font-mono text-[10px] px-1 py-0">
                    {v} {ROTULOS_VARIAVEIS[v]}
                  </Badge>
                ))}
              </span>
            </div>
            <Textarea
              id="texto-mensagem"
              value={texto}
              onChange={(e) => {
                setTexto(e.target.value)
                setEditadoPeloUsuario(true)
              }}
              rows={6}
              className="text-xs"
            />
            <p className="text-[11px] text-slate-500">
              Prévia do envio: as variáveis são substituídas pelos dados do cadastro.{' '}
              {editadoPeloUsuario && 'Edição livre — a alteração vale só para este envio.'}
            </p>
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 whitespace-pre-line">
              {preview || '—'}
            </div>
          </div>

          {/* Avisos de destinatário indisponível */}
          {modo === 'whatsapp' && telefone && !numeroOk && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Número de WhatsApp inválido</AlertTitle>
              <AlertDescription>
                Confira o telefone no cadastro — o botão de envio fica desabilitado enquanto o
                número não for válido.
              </AlertDescription>
            </Alert>
          )}
          {modo === 'email' && !emailOk && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>E-mail não informado</AlertTitle>
              <AlertDescription>
                Este cadastro não tem e-mail válido — o envio por este canal não está disponível.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-1">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          {modo === 'whatsapp' ? (
            <Button
              type="button"
              size="sm"
              disabled={!numeroOk || !preview.trim()}
              onClick={enviarWhatsapp}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
            >
              <MessageCircle className="h-3.5 w-3.5" /> Abrir WhatsApp
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              disabled={!emailOk || !preview.trim() || enviandoEmail}
              onClick={enviarEmail}
              className="bg-[#0066FF] hover:bg-[#0055D4] text-white text-xs gap-1.5"
            >
              <Mail className="h-3.5 w-3.5" />
              {enviandoEmail ? 'Enviando...' : 'Enviar e-mail'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ModalEnviarMensagem
