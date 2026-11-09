// Hook de narração com Web Speech API (nativa do navegador, sem serviços externos).
// Voz pt-BR preferida; fallback silencioso quando o navegador não suporta.
import { useCallback, useEffect, useRef, useState } from 'react'

type EstadoNarracao = 'parado' | 'tocando' | 'pausado'

const suporta = typeof window !== 'undefined' && 'speechSynthesis' in window

function escolherVozPtBr(): SpeechSynthesisVoice | null {
  if (!suporta) return null
  const vozes = window.speechSynthesis.getVoices()
  if (vozes.length === 0) return null
  return (
    vozes.find((v) => v.lang?.toLowerCase().startsWith('pt-br')) ||
    vozes.find((v) => v.lang?.toLowerCase().startsWith('pt')) ||
    null
  )
}

export function useNarracao() {
  const [suportaVoz] = useState<boolean>(() => suporta)
  const [estado, setEstado] = useState<EstadoNarracao>('parado')
  const [secaoAtual, setSecaoAtual] = useState<string | null>(null)
  const vozesCarregadas = useRef(false)
  const secaoRef = useRef<string | null>(null)

  useEffect(() => {
    if (!suporta) return
    const carregarVozes = () => {
      vozesCarregadas.current = true
    }
    carregarVozes()
    window.speechSynthesis.addEventListener('voiceschanged', carregarVozes)
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', carregarVozes)
      window.speechSynthesis.cancel()
    }
  }, [])

  const parar = useCallback(() => {
    if (!suporta) return
    window.speechSynthesis.cancel()
    setEstado('parado')
    secaoRef.current = null
    setSecaoAtual(null)
  }, [])

  const narrar = useCallback((idSecao: string, texto: string) => {
    if (!suporta || !texto.trim()) return
    // Trocar de seção cancela a narração anterior (requisito do manual)
    window.speechSynthesis.cancel()
    secaoRef.current = idSecao
    setSecaoAtual(idSecao)

    const fala = new SpeechSynthesisUtterance(texto)
    fala.lang = 'pt-BR'
    const voz = escolherVozPtBr()
    if (voz) fala.voice = voz
    fala.rate = 0.98
    fala.pitch = 1
    fala.onend = () => {
      if (secaoRef.current === idSecao) {
        setEstado('parado')
        secaoRef.current = null
        setSecaoAtual(null)
      }
    }
    fala.onerror = () => {
      if (secaoRef.current === idSecao) {
        setEstado('parado')
        secaoRef.current = null
        setSecaoAtual(null)
      }
    }
    window.speechSynthesis.speak(fala)
    setEstado('tocando')
  }, [])

  const pausarOuContinuar = useCallback(() => {
    if (!suporta) return
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume()
      setEstado('tocando')
    } else if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause()
      setEstado('pausado')
    }
  }, [])

  // Para a narração quando o usuário sai da página
  useEffect(() => {
    return () => {
      if (suporta) window.speechSynthesis.cancel()
    }
  }, [])

  return { suportaVoz, estado, secaoAtual, narrar, pausarOuContinuar, parar }
}
