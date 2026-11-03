import React, { useState, useEffect, useCallback, useRef } from 'react'
import { CENAS_ROTEIRO_OFICIAIS, CenaApresentacaoVideo } from '@/lib/video/cenasRoteiro'
import { gerarDocxRoteiro, baixarBlobComoArquivo } from '@/lib/docx/roteiroDocx'
import { SimuladorTelaCadastro } from '@/components/video/SimuladorTelaCadastro'
import { LegendaGuiaLocucao } from '@/components/video/LegendaGuiaLocucao'
import { KoinonLogo } from '@/components/brand/KoinonLogo'
import { EndossoA3One } from '@/components/brand/EndossoA3One'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  RotateCcw,
  FileText,
  Video,
  CheckCircle,
} from 'lucide-react'

export const ApresentacaoVideoCadastroPage: React.FC = () => {
  const [indiceCena, setIndiceCena] = useState(0)
  const [modoTelaCheia, setModoTelaCheia] = useState(false)
  const [modoGravacao, setModoGravacao] = useState(false)
  const [reproducaoAutomatica, setReproducaoAutomatica] = useState(false)
  const [baixandoDocx, setBaixandoDocx] = useState(false)
  const [downloadConcluido, setDownloadConcluido] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)

  const cenas = CENAS_ROTEIRO_OFICIAIS
  const cenaAtual: CenaApresentacaoVideo = cenas[indiceCena]

  const totalCenas = cenas.length

  const avancarCena = useCallback(() => {
    setIndiceCena((prev) => (prev < totalCenas - 1 ? prev + 1 : 0))
  }, [totalCenas])

  const voltarCena = useCallback(() => {
    setIndiceCena((prev) => (prev > 0 ? prev - 1 : totalCenas - 1))
  }, [totalCenas])

  // Navegação por teclas de seta (esquerda / direita) e barra de espaço
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Evitar captura se o usuário estiver digitando em algum input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return

      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault()
        avancarCena()
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        voltarCena()
      } else if (e.key === 'Escape') {
        // Se estiver em modo gravação, sai do modo gravação e restaura a visualização normal
        setModoGravacao((prev) => {
          if (prev) {
            // Se o navegador estiver em fullscreen nativo e sairmos via ESC, o browser já lida ou podemos garantir saída
            if (document.fullscreenElement) {
              document.exitFullscreen().catch(() => {})
            }
            return false
          }
          return prev
        })
      } else if (!modoGravacao && (e.key === ' ' || e.key === 'Spacebar')) {
        e.preventDefault()
        setReproducaoAutomatica((prev) => !prev)
      } else if (!modoGravacao && e.key === 'Home') {
        e.preventDefault()
        setIndiceCena(0)
      } else if (!modoGravacao && e.key === 'End') {
        e.preventDefault()
        setIndiceCena(totalCenas - 1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [avancarCena, voltarCena, totalCenas, modoGravacao])

  // Reprodução automática se ativada
  useEffect(() => {
    if (!reproducaoAutomatica) return

    const duracaoSegundos = cenaAtual.duracaoEstimadaSegundos || 18
    const timer = setTimeout(() => {
      avancarCena()
    }, duracaoSegundos * 1000)

    return () => clearTimeout(timer)
  }, [reproducaoAutomatica, indiceCena, cenaAtual, avancarCena])

  // Ativar modo gravação (limpo, tela cheia com requestFullscreen quando suportado)
  const ativarModoGravacao = async () => {
    setModoGravacao(true)
    setReproducaoAutomatica(false) // No modo gravação a transição é controlada manualmente pelas setas
    try {
      if (!document.fullscreenElement && containerRef.current) {
        await containerRef.current.requestFullscreen()
      }
    } catch (err) {
      console.warn('Fullscreen nativo indisponível ou recusado:', err)
    }
  }

  // Alternar tela cheia normal
  const toggleTelaCheia = async () => {
    try {
      if (!document.fullscreenElement) {
        if (containerRef.current) {
          await containerRef.current.requestFullscreen()
          setModoTelaCheia(true)
        }
      } else {
        await document.exitFullscreen()
        setModoTelaCheia(false)
        if (modoGravacao) {
          setModoGravacao(false)
        }
      }
    } catch (err) {
      console.error('Erro ao alternar tela cheia:', err)
      setModoTelaCheia((prev) => !prev)
    }
  }

  useEffect(() => {
    const onFsChange = () => {
      const isFs = !!document.fullscreenElement
      setModoTelaCheia(isFs)
      // Se saiu do fullscreen nativo enquanto estava no modo gravação, também sincroniza o estado
      if (!isFs && modoGravacao) {
        setModoGravacao(false)
      }
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [modoGravacao])

  // Gerar e baixar documento Word .docx real
  const handleBaixarDocx = () => {
    try {
      setBaixandoDocx(true)
      const blob = gerarDocxRoteiro(cenas, 'Condomínio Residencial Lago Azul')
      baixarBlobComoArquivo(blob, 'Roteiro_Gravacao_Cadastro_Moradores_Koinon.docx')
      setDownloadConcluido(true)
      setTimeout(() => setDownloadConcluido(false), 4000)
    } catch (err) {
      console.error('Erro ao gerar documento .docx:', err)
    } finally {
      setBaixandoDocx(false)
    }
  }

  // MODO GRAVAÇÃO ATIVO: renderização 100% limpa em tela cheia
  // Apenas o slide da cena atual, fundo limpo (#F3F7FC), sem cabeçalho, rodapé, legenda ou chips
  if (modoGravacao) {
    return (
      <div
        ref={containerRef}
        tabIndex={0}
        className="fixed inset-0 z-50 w-screen h-screen bg-[#F3F7FC] text-[#002B5E] font-['Poppins',sans-serif] flex items-center justify-center p-4 sm:p-8 md:p-12 overflow-hidden outline-hidden select-none"
      >
        <div className="w-full max-w-6xl flex items-center justify-center">
          <SimuladorTelaCadastro cena={cenaAtual} modoApresentacao={true} modoGravacao={true} />
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`min-h-screen bg-[#F3F7FC] text-[#002B5E] font-['Poppins',sans-serif] flex flex-col justify-between ${
        modoTelaCheia ? 'p-2 sm:p-4' : 'p-4 sm:p-6'
      }`}
    >
      {/* Barra Superior / Controles Institucionais */}
      <header className="max-w-6xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-3 bg-white px-5 py-3 rounded-[14px] border border-[#5A6B82]/20 shadow-xs mb-4">
        <div className="flex items-center gap-3">
          <KoinonLogo size={38} variant="color" />
          <div className="h-6 w-px bg-[#5A6B82]/20 hidden sm:block" />
          <div className="hidden sm:flex flex-col">
            <span className="text-xs font-semibold text-[#002B5E]">
              Apresentação Visual e Roteiro
            </span>
            <span className="text-[10px] text-[#5A6B82]">
              Gravação de Vídeo Institucional • Cadastro da Unidade
            </span>
          </div>
        </div>

        {/* Botão de Download do Roteiro em Word .docx Real */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleBaixarDocx}
            disabled={baixandoDocx}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[10px] bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            title="Baixar roteiro de locução humana formatado em arquivo Microsoft Word (.docx)"
          >
            {downloadConcluido ? (
              <>
                <CheckCircle className="h-4 w-4 text-emerald-300" />
                <span>Roteiro Baixado (.docx)</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                <span>Baixar Roteiro (.docx)</span>
              </>
            )}
          </button>

          {/* Botão de Modo Gravação Limpo */}
          <button
            type="button"
            onClick={ativarModoGravacao}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[10px] bg-[#002B5E] hover:bg-[#001D40] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            title="Ativar modo de gravação limpo em tela cheia (apenas slides, sem cabeçalhos/rodapés). Navegação por setas e Esc para sair."
          >
            <Video className="h-4 w-4 text-[#8EC0FF]" />
            <span className="hidden sm:inline">Modo Gravação</span>
            <Maximize2 className="h-3.5 w-3.5 opacity-70" />
          </button>

          {/* Botão de Tela Cheia Normal */}
          <button
            type="button"
            onClick={toggleTelaCheia}
            className="p-2 rounded-[10px] border border-[#5A6B82]/30 hover:bg-[#F3F7FC] text-[#002B5E] transition-colors cursor-pointer"
            title={modoTelaCheia ? 'Sair da tela cheia (Esc)' : 'Modo tela cheia com controles'}
          >
            {modoTelaCheia ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* Conteúdo Central: Tela Animada + Setas */}
      <main className="max-w-6xl mx-auto w-full flex-1 flex flex-col justify-center gap-4">
        {/* Simulador da Tela da Cena com Seta Animada */}
        <div className="w-full">
          <SimuladorTelaCadastro cena={cenaAtual} modoApresentacao={modoTelaCheia} />
        </div>

        {/* Legenda-guia no rodapé da cena com o texto de locução */}
        <div className="w-full">
          <LegendaGuiaLocucao cena={cenaAtual} indiceAtual={indiceCena} totalCenas={totalCenas} />
        </div>
      </main>

      {/* Barra de Navegação e Controle de Gravação */}
      <footer className="max-w-6xl mx-auto w-full mt-4 bg-white p-4 rounded-[14px] border border-[#5A6B82]/20 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Controles de Cenas (Voltar / Avançar) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={voltarCena}
            className="flex items-center gap-1 px-3 py-1.5 rounded-[8px] border border-[#5A6B82]/30 text-xs font-semibold text-[#002B5E] hover:bg-[#F3F7FC] transition-colors"
            title="Cena anterior (Seta para a esquerda)"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Anterior</span>
          </button>

          <button
            type="button"
            onClick={avancarCena}
            className="flex items-center gap-1 px-3.5 py-1.5 rounded-[8px] bg-[#002B5E] hover:bg-[#001D40] text-xs font-semibold text-white transition-colors"
            title="Próxima cena (Seta para a direita ou Espaço)"
          >
            <span>Próxima</span>
            <ChevronRight className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => setReproducaoAutomatica((prev) => !prev)}
            className={`p-1.5 rounded-[8px] border text-xs flex items-center gap-1 font-medium transition-colors ${
              reproducaoAutomatica
                ? 'bg-amber-100 border-amber-300 text-amber-900'
                : 'border-[#5A6B82]/30 text-[#5A6B82] hover:bg-[#F3F7FC]'
            }`}
            title="Alternar avanço automático de cenas"
          >
            {reproducaoAutomatica ? (
              <>
                <Pause className="h-3.5 w-3.5" />
                <span className="text-[11px]">Pausar Auto</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" />
                <span className="text-[11px]">Auto</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIndiceCena(0)}
            className="p-1.5 rounded-[8px] border border-[#5A6B82]/30 text-[#5A6B82] hover:bg-[#F3F7FC] transition-colors"
            title="Reiniciar apresentação na Cena 1 (Home)"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Indicadores de Cenas (Bolinhas / Chips) */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-1">
          {cenas.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setIndiceCena(i)}
              className={`h-7 px-2.5 rounded-[6px] text-[11px] font-semibold transition-all ${
                i === indiceCena
                  ? 'bg-[#0066FF] text-white shadow-xs scale-105'
                  : 'bg-[#F3F7FC] text-[#5A6B82] hover:bg-[#8EC0FF]/20'
              }`}
              title={`${c.letra.toUpperCase()}: ${c.titulo}`}
            >
              {c.letra.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Endosso A3ONE Oficial */}
        <div className="shrink-0">
          <EndossoA3One variant="color" layout="inline" />
        </div>
      </footer>
    </div>
  )
}

export default ApresentacaoVideoCadastroPage
