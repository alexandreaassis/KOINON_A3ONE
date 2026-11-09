import React, { useRef, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { KoinonSymbol } from '@/components/brand/KoinonSymbol'
import { Send, Loader2, Sparkles, RotateCcw, Copy, Check, Bot } from 'lucide-react'

export interface MensagemChatSindico {
  id: string
  papel: 'usuario' | 'ia'
  texto: string
}

export const SUGESTOES_SINDICO = [
  'Redigir convocação para WhatsApp',
  'Resumir última assembleia',
  'Como aumentar a participação?',
  'Explicar quórum de instalação',
]

export interface PainelIaSindicoProps {
  contextoExecutivo?: string
  className?: string
}

export const PainelIaSindico: React.FC<PainelIaSindicoProps> = ({
  contextoExecutivo = '',
  className = '',
}) => {
  const { toast } = useToast()
  const [mensagens, setMensagens] = useState<MensagemChatSindico[]>([
    {
      id: 'boas-vindas',
      papel: 'ia',
      texto:
        'Olá, Síndico(a)! Sou sua IA de Governança e Apoio Executivo 🤖\n\nPosso redigir mensagens de convocação prontas para WhatsApp e e-mail, resumir o histórico executivo das assembleias, analisar indicadores de participação e sugerir ações práticas para engajar as unidades. Como posso ajudar agora?',
    },
  ])
  const [entrada, setEntrada] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [copiadoId, setCopiadoId] = useState<string | null>(null)
  const conversaIdRef = useRef<string>('')
  const fimRef = useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [mensagens, carregando])

  const enviarPergunta = async (texto: string) => {
    const pergunta = texto.trim()
    if (!pergunta || carregando) return

    setEntrada('')
    const idPergunta = `p-${Date.now()}`
    setMensagens((ant) => [...ant, { id: idPergunta, papel: 'usuario', texto: pergunta }])
    setCarregando(true)

    try {
      const resposta = await pb.send<{
        success: boolean
        resposta?: string
        conversa_id?: string
        message?: string
      }>('/backend/v1/sindico/chat', {
        method: 'POST',
        body: {
          pergunta,
          conversa_id: conversaIdRef.current || undefined,
          contexto: contextoExecutivo || undefined,
        },
      })

      if (resposta?.conversa_id) conversaIdRef.current = resposta.conversa_id
      setMensagens((ant) => [
        ...ant,
        {
          id: `r-${Date.now()}`,
          papel: 'ia',
          texto:
            resposta?.resposta ||
            resposta?.message ||
            'Não consegui processar a resposta neste momento. Tente novamente em instantes.',
        },
      ])
    } catch (err: unknown) {
      const msg =
        (err as { message?: string; response?: { message?: string } })?.message ||
        (err as { response?: { message?: string } })?.response?.message
      toast({
        title: 'IA do Síndico',
        description:
          typeof msg === 'string' && msg
            ? msg
            : 'Não foi possível conversar com o assistente do síndico. Tente novamente.',
        variant: 'destructive',
      })
      setMensagens((ant) => [
        ...ant,
        {
          id: `e-${Date.now()}`,
          papel: 'ia',
          texto:
            'Tive uma instabilidade temporária ao consultar o modelo. Tente novamente em instantes ou utilize a convocação rápida.',
        },
      ])
    } finally {
      setCarregando(false)
    }
  }

  const limparConversa = () => {
    conversaIdRef.current = ''
    setMensagens((ant) => ant.slice(0, 1))
  }

  const copiarTextoMensagem = async (id: string, texto: string) => {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiadoId(id)
      toast({
        title: 'Texto copiado!',
        description: 'Conteúdo copiado para a área de transferência.',
      })
      setTimeout(() => setCopiadoId(null), 2500)
    } catch {
      toast({
        title: 'Falha ao copiar',
        description: 'Selecione o texto e copie manualmente.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div
      className={`overflow-hidden rounded-xl border border-sky-200/90 bg-white shadow-xs ${className}`}
      aria-label="Assistente de IA do Síndico"
    >
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-[#002B5E] via-[#00408A] to-[#0066FF] px-4 py-3 text-white">
        <div className="flex items-center gap-2.5">
          <KoinonSymbol size={28} variant="on-navy" />
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-bold leading-tight">Assistente do Síndico & Governança</p>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white">
                <Sparkles className="h-2.5 w-2.5" /> IA Nativa
              </span>
            </div>
            <p className="text-[11px] text-white/80 leading-tight">
              Redação de convocações institucionais, análise de quórum e resumo das assembleias
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={limparConversa}
          title="Reiniciar conversa"
          className="flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-[11px] font-semibold text-white/90 hover:bg-white/20 transition-colors"
        >
          <RotateCcw className="h-3 w-3" />
          <span className="hidden sm:inline">Nova conversa</span>
        </button>
      </div>

      {/* Histórico das Mensagens */}
      <div className="h-72 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50/70">
        {mensagens.map((m) => {
          const isUser = m.papel === 'usuario'
          return (
            <div key={m.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`group relative max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-xs whitespace-pre-wrap ${
                  isUser
                    ? 'rounded-br-xs bg-[#0066FF] text-white font-medium'
                    : 'rounded-bl-xs border border-slate-200 bg-white text-slate-800'
                }`}
              >
                {!isUser && (
                  <div className="flex items-center justify-between gap-2 mb-1 pb-1 border-b border-slate-100 text-[10px] font-semibold text-sky-800">
                    <span className="flex items-center gap-1">
                      <Bot className="h-3 w-3" /> IA do Síndico
                    </span>
                    <button
                      type="button"
                      onClick={() => copiarTextoMensagem(m.id, m.texto)}
                      className="opacity-70 hover:opacity-100 transition-opacity flex items-center gap-1 text-slate-500 hover:text-sky-700"
                      title="Copiar mensagem"
                    >
                      {copiadoId === m.id ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-600" />
                          <span className="text-emerald-600 font-bold">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
                {m.texto}
              </div>
            </div>
          )
        })}

        {carregando && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl rounded-bl-xs border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-600 shadow-xs">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#0066FF]" />
              O assistente do síndico está elaborando a resposta…
            </div>
          </div>
        )}
        <div ref={fimRef} />
      </div>

      {/* Sugestões e Input */}
      <div className="border-t border-slate-200 bg-white px-4 py-3">
        <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-sky-600" /> Sugestões:
          </span>
          {SUGESTOES_SINDICO.map((sug) => (
            <button
              key={sug}
              type="button"
              disabled={carregando}
              onClick={() => enviarPergunta(sug)}
              className="rounded-full border border-sky-300 bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-800 hover:bg-sky-100 hover:border-sky-400 disabled:opacity-50 transition-colors"
            >
              {sug}
            </button>
          ))}
        </div>

        <form
          className="flex items-end gap-2"
          onSubmit={(ev) => {
            ev.preventDefault()
            enviarPergunta(entrada)
          }}
        >
          <textarea
            value={entrada}
            onChange={(ev) => setEntrada(ev.target.value)}
            onKeyDown={(ev) => {
              if (ev.key === 'Enter' && !ev.shiftKey) {
                ev.preventDefault()
                enviarPergunta(entrada)
              }
            }}
            rows={1}
            placeholder="Peça uma convocação, resumo das assembleias ou dicas de quórum…"
            className="max-h-24 min-h-[40px] flex-1 resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#0066FF] focus:outline-none focus:ring-2 focus:ring-[#0066FF]/20"
            aria-label="Mensagem para o assistente do síndico"
          />
          <Button
            type="submit"
            size="sm"
            disabled={carregando || !entrada.trim()}
            className="h-[40px] px-3.5 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white shrink-0 font-semibold gap-1.5"
            aria-label="Enviar para o assistente"
          >
            {carregando ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span className="hidden sm:inline text-xs">Enviar</span>
              </>
            )}
          </Button>
        </form>

        <p className="mt-2 text-[10px] text-slate-400 leading-snug">
          O assistente gera minutas executivas e sugestões de governança. Decisões formais cabem à
          assembleia e devem observar a Convenção do condomínio.
        </p>
      </div>
    </div>
  )
}
