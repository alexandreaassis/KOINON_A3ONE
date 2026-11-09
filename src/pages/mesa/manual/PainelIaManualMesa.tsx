import React, { useRef, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { KoinonSymbol } from '@/components/brand/KoinonSymbol'
import { Send, Loader2, Sparkles, RotateCcw } from 'lucide-react'

interface Mensagem {
  id: string
  papel: 'usuario' | 'ia'
  texto: string
}

const PERGUNTAS_SUGERIDAS = [
  'Como funciona o Painel da Mesa?',
  'Como aprovo um credenciamento?',
  'O que é hash encadeado?',
  'Como publico a ata?',
]

/**
 * Painel "Pergunte à IA do Koinon" do Manual da Mesa — mesmo padrão do
 * PainelIaManual do morador, apontando para o endpoint da mesa
 * (/backend/v1/manual-mesa/chat, agente nativo koinon-manual-mesa).
 */
export const PainelIaManualMesa: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { toast } = useToast()
  const [mensagens, setMensagens] = useState<Mensagem[]>([
    {
      id: 'boas-vindas',
      papel: 'ia',
      texto:
        'Olá! Sou a IA do Koinon 🤖 Explico cada página do módulo da mesa: painel, credenciamentos, lista de presença, documentos, ata, deliberações e auditoria. Em que posso ajudar?',
    },
  ])
  const [entrada, setEntrada] = useState('')
  const [carregando, setCarregando] = useState(false)
  const conversaIdRef = useRef<string>('')
  const fimRef = useRef<HTMLDivElement | null>(null)
  const primeiraMontagemRef = useRef(true)

  React.useEffect(() => {
    // Evita rolar a página inteira no carregamento inicial do manual
    if (primeiraMontagemRef.current) {
      primeiraMontagemRef.current = false
      return
    }
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
      }>('/backend/v1/manual-mesa/chat', {
        method: 'POST',
        body: { pergunta, conversa_id: conversaIdRef.current || undefined },
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
            'Não consegui responder agora. Tente de novo em instantes.',
        },
      ])
    } catch (err: any) {
      const msg = err?.message || err?.response?.message
      toast({
        title: 'IA do Koinon',
        description:
          typeof msg === 'string' && msg
            ? msg
            : 'Não foi possível falar com a IA agora. Tente novamente.',
        variant: 'destructive',
      })
      setMensagens((ant) => [
        ...ant,
        {
          id: `e-${Date.now()}`,
          papel: 'ia',
          texto:
            'Tive um problema para responder agora. Tente novamente em instantes — ou fale com o suporte A3ONE.',
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

  return (
    <section className={className} aria-label="Pergunte à IA do Koinon">
      <div className="print-hidden overflow-hidden rounded-2xl border border-[#002B5E]/15 bg-white shadow-[0_10px_40px_rgba(0,43,94,0.08)]">
        {/* Cabeçalho do painel */}
        <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-[#002B5E] to-[#0066FF] px-4 py-3 text-white">
          <div className="flex items-center gap-2.5">
            <KoinonSymbol size={30} variant="on-navy" />
            <div>
              <p className="text-sm font-bold leading-tight">Pergunte à IA do Koinon</p>
              <p className="text-[11px] text-white/70 leading-tight">
                Dúvidas sobre o módulo da mesa diretora
              </p>
            </div>
          </div>
          <Sparkles className="h-4 w-4 text-white/80" aria-hidden />
        </div>

        {/* Mensagens */}
        <div className="h-80 overflow-y-auto px-4 py-4 space-y-3 bg-[#F3F7FC]/60">
          {mensagens.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.papel === 'usuario' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm whitespace-pre-wrap ${
                  m.papel === 'usuario'
                    ? 'rounded-br-sm bg-[#0066FF] text-white'
                    : 'rounded-bl-sm border border-slate-100 bg-white text-slate-700'
                }`}
              >
                {m.texto}
              </div>
            </div>
          ))}
          {carregando && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm border border-slate-100 bg-white px-3.5 py-2.5 text-[13px] text-slate-500 shadow-sm">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                A IA está pensando…
              </div>
            </div>
          )}
          <div ref={fimRef} />
        </div>

        {/* Sugestões + entrada */}
        <div className="border-t border-slate-100 bg-white px-4 py-3">
          <div className="flex flex-wrap gap-1.5">
            {PERGUNTAS_SUGERIDAS.map((p) => (
              <button
                key={p}
                type="button"
                disabled={carregando}
                onClick={() => enviarPergunta(p)}
                className="rounded-full border border-[#0066FF]/25 bg-[#0066FF]/5 px-2.5 py-1 text-[11px] font-medium text-[#0066FF] hover:bg-[#0066FF]/15 disabled:opacity-50"
              >
                {p}
              </button>
            ))}
          </div>
          <form
            className="mt-2.5 flex items-end gap-2"
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
              placeholder="Digite sua dúvida… (ex.: como instalo a assembleia com quórum?)"
              className="max-h-28 min-h-[42px] flex-1 resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] text-slate-700 placeholder:text-slate-400 focus:border-[#0066FF] focus:outline-none focus:ring-2 focus:ring-[#0066FF]/20"
              aria-label="Sua pergunta para a IA do Koinon"
            />
            <Button
              type="submit"
              size="icon"
              disabled={carregando || !entrada.trim()}
              className="h-[42px] w-[42px] shrink-0 rounded-xl bg-[#0066FF] hover:bg-[#0052CC]"
              aria-label="Enviar pergunta"
            >
              {carregando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-[10px] leading-snug text-slate-400">
              A IA explica o sistema, mas não decide deliberação e não vê dados dos moradores.
              Regras de quórum e inadimplência: confirme na Convenção e no edital.
            </p>
            <button
              type="button"
              onClick={limparConversa}
              className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold text-slate-400 hover:text-[#0066FF]"
            >
              <RotateCcw className="h-3 w-3" aria-hidden />
              Limpar
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
