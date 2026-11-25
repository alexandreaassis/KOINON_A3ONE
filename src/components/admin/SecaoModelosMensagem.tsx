import React, { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useCondoConfig } from '@/context/CondoConfigContext'
import { useAuth } from '@/context/AuthContext'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { toast } from '@/hooks/use-toast'
import { MessageSquareText, Save, Variable, ShieldCheck } from 'lucide-react'
import {
  CAMPOS_MODELO,
  DESCRICAO_VARIAVEIS,
  VARIAVEIS_MODELO,
  modeloPadrao,
  type CanalModelo,
  type TipoModelo,
} from '@/lib/modelosMensagem'
import { getErrorMessage } from '@/lib/pocketbase/errors'

type ChaveFormulario =
  | 'modelo_wa_cadastro_aprovado'
  | 'modelo_wa_ata_publicada'
  | 'modelo_email_cadastro_aprovado'
  | 'modelo_email_ata_publicada'

const ITENS: Array<{
  chave: ChaveFormulario
  canal: CanalModelo
  tipo: TipoModelo
  rotulo: string
  descricao: string
}> = [
  {
    chave: 'modelo_wa_cadastro_aprovado',
    canal: 'whatsapp',
    tipo: 'cadastro_aprovado',
    rotulo: 'WhatsApp — cadastro aprovado',
    descricao:
      'Texto inicial da mensagem enviada ao aprovar um cadastro na Aprovação de Cadastros e nos Cadastros da Unidade.',
  },
  {
    chave: 'modelo_wa_ata_publicada',
    canal: 'whatsapp',
    tipo: 'ata_publicada',
    rotulo: 'WhatsApp — ata publicada',
    descricao: 'Texto inicial da notificação "Notificar moradores por WhatsApp" na ata publicada.',
  },
  {
    chave: 'modelo_email_cadastro_aprovado',
    canal: 'email',
    tipo: 'cadastro_aprovado',
    rotulo: 'E-mail — cadastro aprovado',
    descricao: 'Texto inicial do e-mail de aprovação de cadastro.',
  },
  {
    chave: 'modelo_email_ata_publicada',
    canal: 'email',
    tipo: 'ata_publicada',
    rotulo: 'E-mail — ata publicada',
    descricao: 'Texto inicial do e-mail de ata publicada.',
  },
]

export const SecaoModelosMensagem: React.FC = () => {
  const { config, recarregarConfig } = useCondoConfig()
  const { user } = useAuth()

  const padroes = (): Record<ChaveFormulario, string> => ({
    modelo_wa_cadastro_aprovado: modeloPadrao('whatsapp', 'cadastro_aprovado'),
    modelo_wa_ata_publicada: modeloPadrao('whatsapp', 'ata_publicada'),
    modelo_email_cadastro_aprovado: modeloPadrao('email', 'cadastro_aprovado'),
    modelo_email_ata_publicada: modeloPadrao('email', 'ata_publicada'),
  })

  const doConfig = (): Record<ChaveFormulario, string> => {
    const base = padroes()
    for (const item of ITENS) {
      const salvo = (config as unknown as Record<string, unknown> | undefined)?.[item.chave]
      if (typeof salvo === 'string' && salvo !== '') {
        base[item.chave] = salvo
      }
    }
    return base
  }

  const [valores, setValores] = useState<Record<ChaveFormulario, string>>(padroes)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!config) return
    // Texto salvo prevalece; campo vazio/ausente no banco = default (mesma
    // regra de resolução dos pontos de envio, em modelosMensagem.ts).
    setValores(doConfig())
    setCarregando(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config])

  const alterou = carregando
    ? false
    : ITENS.some((item) => {
        const salvo = (config as Record<string, unknown> | undefined)?.[item.chave]
        return (valores[item.chave] ?? '') !== (typeof salvo === 'string' ? salvo : '')
      })

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!config) return
    setSalvando(true)
    try {
      await api.salvarModelosMensagem({ ...valores })
      await api.registrarEventoAuditoria({
        evento: 'configuracao_atualizada',
        fator: `Admin ${user?.name || user?.email} atualizou os modelos de mensagem (WhatsApp/e-mail)`,
      })
      await recarregarConfig()
      toast({
        title: 'Modelos salvos',
        description:
          'Os textos salvos passam a ser o início das mensagens nos pontos de envio manual.',
      })
    } catch (err) {
      console.error('Erro ao salvar modelos de mensagem:', err)
      toast({
        title: 'Erro ao salvar',
        description: getErrorMessage(err, 'Falha ao gravar os modelos de mensagem.'),
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Card id="card-modelos-mensagem">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquareText className="h-5 w-5 text-emerald-700" /> Modelos de mensagem (WhatsApp e
          e-mail)
        </CardTitle>
        <CardDescription>
          {DESCRICAO_VARIAVEIS} Cada envio continua editável na hora — o modelo salvo é apenas o
          texto inicial.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form id="form-modelos-mensagem" onSubmit={handleSalvar} className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
              <Variable className="h-3.5 w-3.5" /> Variáveis disponíveis:
            </span>
            {VARIAVEIS_MODELO.map((v) => (
              <Badge key={v} variant="secondary" className="font-mono">
                {v}
              </Badge>
            ))}
          </div>

          {ITENS.map((item) => (
            <div key={item.chave} className="space-y-1.5">
              <Label htmlFor={item.chave}>{item.rotulo}</Label>
              <p className="text-xs text-slate-500">{item.descricao}</p>
              <Textarea
                id={item.chave}
                value={valores[item.chave]}
                onChange={(e) =>
                  setValores((atual) => ({ ...atual, [item.chave]: e.target.value }))
                }
                rows={item.tipo === 'cadastro_aprovado' && item.canal === 'whatsapp' ? 4 : 3}
                className="font-mono text-xs"
                placeholder={modeloPadrao(item.canal, item.tipo)}
              />
            </div>
          ))}

          <Alert>
            <ShieldCheck className="h-4 w-4" />
            <AlertTitle>Segurança</AlertTitle>
            <AlertDescription>
              A senha temporária nunca é incluída nas mensagens — o morador define a própria senha
              em "Esqueci minha senha".
            </AlertDescription>
          </Alert>
        </form>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={salvando || carregando || !alterou}
          onClick={() => setValores(padroes())}
        >
          Restaurar padrões
        </Button>
        <Button
          type="submit"
          form="form-modelos-mensagem"
          disabled={salvando || carregando || !alterou}
        >
          <Save className="h-4 w-4 mr-1.5" /> Salvar modelos
        </Button>
      </CardFooter>
    </Card>
  )
}
