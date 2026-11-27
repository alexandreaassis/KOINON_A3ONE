import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  CalendarX2,
  Copy,
  ExternalLink,
  KeyRound,
  MessageSquarePlus,
  Video,
  VideoOff,
} from 'lucide-react'
import { useState } from 'react'
import { useMeetSala } from '@/hooks/useMeetSala'
import { useToast } from '@/hooks/use-toast'
import { api } from '@/lib/api'

interface MeetCardProps {
  deliberacaoId: number | null
  meetLink?: string
  onLinkAtualizado: (link: string) => void
  onAbrirConvocacao: (link: string) => void
}

export const MeetCard = ({
  deliberacaoId,
  meetLink,
  onLinkAtualizado,
  onAbrirConvocacao,
}: MeetCardProps) => {
  const { toast } = useToast()
  const [copiando, setCopiando] = useState(false)
  const { criarSala, carregando, credenciaisConfiguradas } = useMeetSala()

  const temSala = !!meetLink

  const copiarLink = async () => {
    if (!meetLink) return
    setCopiando(true)
    try {
      await navigator.clipboard.writeText(meetLink)
      toast({
        title: 'Link copiado!',
        description: 'O link da sala Meet está na área de transferência.',
      })
    } catch {
      toast({ title: 'Erro ao copiar', description: 'Tente novamente.', variant: 'destructive' })
    } finally {
      setCopiando(false)
    }
  }

  const handleCriarSala = async () => {
    if (!deliberacaoId) return
    const resp = await criarSala(deliberacaoId)
    if (resp) onLinkAtualizado(resp.meet_link || '')
  }

  if (!deliberacaoId) {
    return (
      <Card className="border-slate-200 shadow-xs rounded-xl bg-white">
        <CardContent className="py-6 flex items-center gap-3 text-xs text-slate-500">
          <VideoOff className="h-4 w-4 shrink-0" />
          Nenhuma assembleia ativa — a sala do Google Meet é criada a partir da assembleia em
          andamento.
        </CardContent>
      </Card>
    )
  }

  if (temSala) {
    return (
      <Card className="border-emerald-200 shadow-xs rounded-xl bg-white">
        <CardContent className="py-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Video className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="text-xs font-semibold text-emerald-900">
                Sala Google Meet criada
              </span>
            </div>
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] px-2 py-0">
              Ativa
            </Badge>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <code className="text-[11px] font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-2 py-1 truncate max-w-full">
              {meetLink}
            </code>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-[11px] gap-1.5 border-emerald-300 text-emerald-800 hover:bg-emerald-50"
              onClick={copiarLink}
              disabled={copiando}
            >
              <Copy className="h-3 w-3" /> Copiar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-[11px] gap-1.5 border-emerald-300 text-emerald-800 hover:bg-emerald-50"
              onClick={() => window.open(meetLink, '_blank', 'noopener')}
              aria-label="Abrir sala do Google Meet em nova aba"
            >
              <ExternalLink className="h-3 w-3" /> Abrir
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-[11px] gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-50"
              onClick={() => onAbrirConvocacao(meetLink || '')}
            >
              <MessageSquarePlus className="h-3 w-3" /> Enviar no Convite
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Sem credencial Meet configurada: botão desabilitado + aviso de configuração
  if (!credenciaisConfiguradas) {
    return (
      <Card className="border-slate-200 shadow-xs rounded-xl bg-white">
        <CardContent className="py-4 space-y-3">
          <div className="flex items-center gap-2">
            <Video className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-600">
              Sala de reunião da assembleia
            </span>
            <Badge
              variant="outline"
              className="ml-auto border-slate-300 text-slate-500 text-[10px] px-2 py-0 shrink-0"
            >
              Credencial ausente
            </Badge>
          </div>
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
            <KeyRound className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-900 leading-relaxed">
              Configure as credenciais do Google Meet em Administração para habilitar a criação da
              sala.
            </p>
          </div>
          <Button type="button" size="sm" className="h-8 text-[11px] gap-1.5" disabled>
            <VideoOff className="h-3 w-3" /> Criar sala Meet
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-[#002B5E]/15 shadow-xs rounded-xl bg-white">
      <CardContent className="py-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Video className="h-4 w-4 text-[#0066FF] shrink-0" />
            <span className="text-xs font-semibold text-[#002B5E]">
              Sala de reunião da assembleia
            </span>
          </div>
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] px-2 py-0 shrink-0">
            Conexão Ativa
          </Badge>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Crie a sala no Google Meet pela API oficial. O link fica salvo nesta assembleia e pode ser
          enviado no convite aos condôminos.
        </p>
        <Button
          type="button"
          size="sm"
          className="h-8 text-[11px] gap-1.5 bg-[#0066FF] hover:bg-[#0056D6] text-white font-semibold"
          onClick={handleCriarSala}
          disabled={carregando}
        >
          {carregando ? (
            <>
              <CalendarX2 className="h-3 w-3 animate-spin" /> Criando sala…
            </>
          ) : (
            <>
              <Video className="h-3 w-3" /> Criar sala Meet
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

// re-export do tipo para uso no painel
export type { MeetCardProps }

// exporta também o Skeleton para uso futuro (evita lint de import não utilizado)
void Skeleton
