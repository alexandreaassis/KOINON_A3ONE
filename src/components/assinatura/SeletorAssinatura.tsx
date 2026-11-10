import React, { useRef, useState, useEffect } from 'react'
import { FormatoAssinatura } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Eraser, PenTool, Type, FileX, Check } from 'lucide-react'

export interface DadosCapturaAssinatura {
  formato: FormatoAssinatura
  assinaturaVisual?: string // dataURL do canvas (se formato === 'desenho')
  assinaturaTexto?: string // texto digitado em fonte cursiva (se formato === 'texto')
}

interface SeletorAssinaturaProps {
  valorInicial?: DadosCapturaAssinatura
  nomeSugerido?: string
  onChange: (dados: DadosCapturaAssinatura) => void
  disabled?: boolean
}

const LIMITE_TAMANHO_DATAURL = 450000 // 450k caracteres (compatível com campo max 500000)

/**
 * Sanitiza e valida o dataURL da assinatura desenhada em canvas
 */
export function validarESanitizarDataUrl(dataUrl?: string): string | undefined {
  if (!dataUrl) return undefined
  const limpo = dataUrl.trim()
  if (
    !limpo.startsWith('data:image/png;base64,') &&
    !limpo.startsWith('data:image/webp;base64,') &&
    !limpo.startsWith('data:image/jpeg;base64,')
  ) {
    return undefined
  }
  if (limpo.length > LIMITE_TAMANHO_DATAURL) {
    return undefined
  }
  return limpo
}

/**
 * Extrai a assinatura do canvas com recorte do espaço em branco (bounding box)
 * e redimensionamento proporcional (altura máx ~100px) com fundo transparente em PNG otimizado.
 * Isso gera uma imagem compacta (frequentemente < 10KB ou ~15KB em base64), com fidelidade perfeita.
 */
export function otimizarCanvasAssinatura(canvas: HTMLCanvasElement): string | undefined {
  const ctx = canvas.getContext('2d')
  if (!ctx) return undefined

  const { width, height } = canvas
  if (width === 0 || height === 0) return undefined

  const imgData = ctx.getImageData(0, 0, width, height)
  const data = imgData.data

  let minX = width
  let minY = height
  let maxX = 0
  let maxY = 0
  let temPixel = false

  // Detectar bounding box de pixels visíveis (alpha > 15)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      const alpha = data[idx + 3]
      if (alpha > 15) {
        temPixel = true
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }

  if (!temPixel) {
    return undefined
  }

  // Adicionar margem de segurança ao redor do traço
  const padding = 10
  const cropX = Math.max(0, minX - padding)
  const cropY = Math.max(0, minY - padding)
  const cropWidth = Math.min(width - cropX, maxX - minX + 1 + padding * 2)
  const cropHeight = Math.min(height - cropY, maxY - minY + 1 + padding * 2)

  if (cropWidth <= 0 || cropHeight <= 0) return undefined

  // Redimensionar proporcionalmente para altura máx 70px e largura máx 260px.
  // BlocoAssinaturaCompacto e os PDFs exibem a imagem sobre a linha de base.
  // Incluímos a linha de base (horizontal baseline) na parte inferior da imagem gerada,
  // exatamente onde a assinatura se assenta no documento oficial.
  const maxTargetHeight = 70
  const maxTargetWidth = 260

  const scale = Math.min(1, maxTargetWidth / cropWidth, maxTargetHeight / cropHeight)

  const targetWidth = Math.max(1, Math.round(cropWidth * scale))
  const targetHeight = Math.max(1, Math.round(cropHeight * scale))

  // Linha de base discreta e elegante: reservamos 6px adicionais na parte inferior
  const linhaEspessura = 1.5
  const espacoAbaixoLinha = 3
  const alturaTotal = targetHeight + espacoAbaixoLinha + Math.ceil(linhaEspessura)

  // A linha de base se estende com uma margem elegante nas laterais
  const margemLinha = Math.min(16, Math.max(8, Math.round(targetWidth * 0.08)))
  const larguraTotal = targetWidth + margemLinha * 2

  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = larguraTotal
  tempCanvas.height = alturaTotal

  const tempCtx = tempCanvas.getContext('2d')
  if (!tempCtx) return undefined

  tempCtx.imageSmoothingEnabled = true
  tempCtx.imageSmoothingQuality = 'high'

  // 1. Desenhar o traço da assinatura centralizado horizontalmente acima da linha
  tempCtx.drawImage(
    canvas,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    margemLinha,
    0,
    targetWidth,
    targetHeight,
  )

  // 2. Desenhar a linha de base horizontal (#002B5E com opacidade suave ou cinza escuro regimental)
  const yLinha = targetHeight + 0.5
  tempCtx.strokeStyle = '#002B5E'
  tempCtx.lineWidth = linhaEspessura
  tempCtx.lineCap = 'round'
  tempCtx.beginPath()
  tempCtx.moveTo(4, yLinha)
  tempCtx.lineTo(larguraTotal - 4, yLinha)
  tempCtx.stroke()

  // Exportar como PNG preservando transparência
  const dataUrl = tempCanvas.toDataURL('image/png')
  return validarESanitizarDataUrl(dataUrl)
}

export const SeletorAssinatura: React.FC<SeletorAssinaturaProps> = ({
  valorInicial,
  nomeSugerido = '',
  onChange,
  disabled = false,
}) => {
  const [formato, setFormato] = useState<FormatoAssinatura>(valorInicial?.formato || 'desenho')
  const [textoNome, setTextoNome] = useState<string>(valorInicial?.assinaturaTexto || nomeSugerido)
  const [fonteCursiva, setFonteCursiva] = useState<'great-vibes' | 'dancing-script'>(
    'dancing-script',
  )
  const [temDesenho, setTemDesenho] = useState<boolean>(!!valorInicial?.assinaturaVisual)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const isDrawingRef = useRef(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)

  // Ao mudar nome sugerido e não tiver texto próprio, preencher
  useEffect(() => {
    if (nomeSugerido && !textoNome) {
      setTextoNome(nomeSugerido)
    }
  }, [nomeSugerido])

  // Notificar pai quando alterar formato ou texto
  useEffect(() => {
    if (formato === 'em_branco') {
      onChange({ formato: 'em_branco' })
    } else if (formato === 'texto') {
      onChange({
        formato: 'texto',
        assinaturaTexto: textoNome.trim(),
      })
    } else if (formato === 'desenho') {
      if (canvasRef.current && temDesenho) {
        const visual = otimizarCanvasAssinatura(canvasRef.current) || valorInicial?.assinaturaVisual
        onChange({
          formato: 'desenho',
          assinaturaVisual: visual,
        })
      } else {
        onChange({
          formato: 'desenho',
          assinaturaVisual: valorInicial?.assinaturaVisual,
        })
      }
    }
  }, [formato, textoNome, temDesenho])

  // Configurar e restaurar canvas ao montar ou alterar tamanho (com ResizeObserver para manter resolução)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const inicializarTamanho = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      const larguraLogica = Math.max(260, Math.round(rect.width || 380))
      const alturaLogica = Math.max(180, Math.round(rect.height || 220))

      // Se a resolução interna já confere, não resetar o contexto nem apagar o desenho
      const targetW = Math.round(larguraLogica * dpr)
      const targetH = Math.round(alturaLogica * dpr)
      if (canvas.width === targetW && canvas.height === targetH) {
        return
      }

      // Salvar conteúdo desenhado antes de redimensionar caso o usuário gire a tela
      let backup: HTMLCanvasElement | null = null
      if (canvas.width > 0 && canvas.height > 0 && isDrawingRef.current === false) {
        backup = document.createElement('canvas')
        backup.width = canvas.width
        backup.height = canvas.height
        const bCtx = backup.getContext('2d')
        if (bCtx) bCtx.drawImage(canvas, 0, 0)
      }

      canvas.width = targetW
      canvas.height = targetH
      ctx.scale(dpr, dpr)

      // Restaurar o traço prévio se redimensionou
      if (backup && backup.width > 0) {
        ctx.drawImage(backup, 0, 0, targetW, targetH, 0, 0, larguraLogica, alturaLogica)
      } else if (valorInicial?.assinaturaVisual && formato === 'desenho') {
        const img = new Image()
        img.onload = () => {
          ctx.clearRect(0, 0, larguraLogica, alturaLogica)
          const aspect = img.width / (img.height || 1)
          const renderHeight = Math.min(alturaLogica * 0.65, 110)
          const renderWidth = Math.min(larguraLogica * 0.85, renderHeight * aspect)
          const renderX = (larguraLogica - renderWidth) / 2
          const renderY = alturaLogica * 0.72 - renderHeight
          ctx.drawImage(img, renderX, renderY, renderWidth, renderHeight)
          setTemDesenho(true)
        }
        img.src = valorInicial.assinaturaVisual
      }
    }

    inicializarTamanho()

    // Observar redimensionamento responsivo (ex: mudança de orientação no celular)
    let ro: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        inicializarTamanho()
      })
      ro.observe(canvas)
    }

    return () => {
      if (ro) ro.disconnect()
    }
  }, [formato])

  const startDrawing = (clientX: number, clientY: number) => {
    if (disabled) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    isDrawingRef.current = true
    lastPointRef.current = {
      x: clientX - rect.left,
      y: clientY - rect.top,
    }
  }

  const draw = (clientX: number, clientY: number) => {
    if (!isDrawingRef.current || disabled) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx || !lastPointRef.current) return

    const rect = canvas.getBoundingClientRect()
    const currentX = clientX - rect.left
    const currentY = clientY - rect.top

    ctx.strokeStyle = '#0f172a' // slate-900 traço fino e elegante
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    ctx.beginPath()
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y)
    ctx.lineTo(currentX, currentY)
    ctx.stroke()

    lastPointRef.current = { x: currentX, y: currentY }
    if (!temDesenho) setTemDesenho(true)
  }

  const stopDrawing = () => {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false
    lastPointRef.current = null

    const canvas = canvasRef.current
    if (canvas) {
      const visualOtimizado = otimizarCanvasAssinatura(canvas)
      if (visualOtimizado) {
        setTemDesenho(true)
      }
      onChange({
        formato: 'desenho',
        assinaturaVisual: visualOtimizado,
      })
    }
  }

  const handleLimparCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.restore()
    setTemDesenho(false)
    onChange({
      formato: 'desenho',
      assinaturaVisual: undefined,
    })
  }

  return (
    <div className="space-y-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <PenTool className="h-3.5 w-3.5 text-cyan-700" />
          Opção de Preenchimento da Assinatura:
        </Label>
        <span className="text-[10px] text-slate-500">Escolha como prefere apor sua assinatura</span>
      </div>

      <Tabs
        value={formato}
        onValueChange={(val) => setFormato(val as FormatoAssinatura)}
        className="w-full"
      >
        <TabsList className="grid grid-cols-3 bg-slate-200/90 p-0.5 h-8">
          <TabsTrigger
            value="desenho"
            disabled={disabled}
            className="text-[11px] h-7 data-[state=active]:bg-white data-[state=active]:text-slate-900"
          >
            <PenTool className="h-3 w-3 mr-1" />
            Assinar na Tela
          </TabsTrigger>
          <TabsTrigger
            value="texto"
            disabled={disabled}
            className="text-[11px] h-7 data-[state=active]:bg-white data-[state=active]:text-slate-900"
          >
            <Type className="h-3 w-3 mr-1" />
            Digitar Nome
          </TabsTrigger>
          <TabsTrigger
            value="em_branco"
            disabled={disabled}
            className="text-[11px] h-7 data-[state=active]:bg-white data-[state=active]:text-slate-900"
          >
            <FileX className="h-3 w-3 mr-1" />
            Deixar em Branco
          </TabsTrigger>
        </TabsList>

        {/* 1. Assinar na Tela (Canvas) */}
        <TabsContent value="desenho" className="pt-2 space-y-2">
          <div className="relative border-2 border-dashed border-slate-300 rounded-lg bg-white overflow-hidden touch-none select-none shadow-inner">
            {/* Linha de base visual (baseline de formulário de papel) */}
            <div className="absolute left-6 right-6 bottom-10 pointer-events-none flex items-center justify-between border-b-2 border-slate-300/80 z-0">
              <span className="text-[10px] font-medium text-slate-400/90 -mb-4 tracking-wider uppercase select-none">
                Linha de assinatura
              </span>
              <span className="text-[10px] text-slate-400/80 -mb-4 select-none">✕</span>
            </div>

            <canvas
              ref={canvasRef}
              className="w-full h-56 sm:h-52 block cursor-crosshair relative z-10"
              onMouseDown={(e) => startDrawing(e.clientX, e.clientY)}
              onMouseMove={(e) => draw(e.clientX, e.clientY)}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={(e) => {
                const touch = e.touches[0]
                if (touch) startDrawing(touch.clientX, touch.clientY)
              }}
              onTouchMove={(e) => {
                const touch = e.touches[0]
                if (touch) draw(touch.clientX, touch.clientY)
              }}
              onTouchEnd={stopDrawing}
            />

            {!temDesenho && (
              <div className="absolute inset-x-4 top-8 pointer-events-none flex flex-col items-center justify-center text-center text-slate-400 text-xs italic gap-1 z-0">
                <span className="font-medium text-slate-500 not-italic">
                  Espaço ampliado para assinar com o dedo ou mouse
                </span>
                <span className="text-[11px] text-slate-400">
                  Assine sobre a linha de base indicada abaixo
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500">
              Traço fino estilo caneta sobre fundo transparente.
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLimparCanvas}
              disabled={disabled || !temDesenho}
              className="h-6 px-2 text-[10px] text-slate-600 gap-1 border-slate-300"
            >
              <Eraser className="h-3 w-3" /> Limpar / Refazer
            </Button>
          </div>
        </TabsContent>

        {/* 2. Digitar Nome (Fonte Cursiva) */}
        <TabsContent value="texto" className="pt-2 space-y-2">
          <div className="space-y-1">
            <Input
              type="text"
              placeholder="Digite seu nome completo como deseja assinar..."
              value={textoNome}
              disabled={disabled}
              onChange={(e) => setTextoNome(e.target.value)}
              className="text-xs h-8 bg-white"
            />
          </div>

          {/* Pré-visualização da caligrafia */}
          <div className="p-3 bg-white border border-slate-200 rounded-md min-h-[56px] flex items-center justify-center text-center">
            {textoNome.trim() ? (
              <span
                style={{
                  fontFamily:
                    fonteCursiva === 'great-vibes'
                      ? '"Great Vibes", cursive'
                      : '"Dancing Script", cursive',
                }}
                className="text-2xl sm:text-3xl text-slate-900 tracking-wide select-none"
              >
                {textoNome}
              </span>
            ) : (
              <span className="text-slate-400 italic text-xs">
                Digite seu nome acima para ver a assinatura estilizada
              </span>
            )}
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-500">
            <span>Estilo de caligrafia manuscrita:</span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setFonteCursiva('dancing-script')}
                className={`px-2 py-0.5 rounded text-[10px] border ${
                  fonteCursiva === 'dancing-script'
                    ? 'bg-slate-900 text-white border-slate-900 font-bold'
                    : 'bg-white text-slate-700 border-slate-300'
                }`}
              >
                Dancing Script
              </button>
              <button
                type="button"
                onClick={() => setFonteCursiva('great-vibes')}
                className={`px-2 py-0.5 rounded text-[10px] border ${
                  fonteCursiva === 'great-vibes'
                    ? 'bg-slate-900 text-white border-slate-900 font-bold'
                    : 'bg-white text-slate-700 border-slate-300'
                }`}
              >
                Great Vibes
              </button>
            </div>
          </div>
        </TabsContent>

        {/* 3. Deixar em Branco */}
        <TabsContent value="em_branco" className="pt-2">
          <div className="p-3 bg-white border border-dashed border-slate-300 rounded-md text-center text-slate-600 space-y-1">
            <Check className="h-4 w-4 text-emerald-600 mx-auto" />
            <p className="font-semibold text-slate-800 text-xs">
              Espaço reservado para assinatura manual
            </p>
            <p className="text-[11px] text-slate-500">
              Nenhuma imagem gráfica será incluída acima da linha. O documento conterá a linha
              horizontal para assinatura física de caneta após a impressão.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
