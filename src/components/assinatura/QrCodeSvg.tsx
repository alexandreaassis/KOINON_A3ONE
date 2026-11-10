/**
 * Componente React que renderiza o SVG nítido do QR Code (ISO/IEC 18004).
 * Utiliza path combinado com shapeRendering="crispEdges", quiet zone padronizada (margin=4)
 * e preserveAspectRatio="xMidYMid meet" com aspectRatio 1:1 estrito.
 */
import React from 'react'
import { generateQrMatrix } from '@/lib/qrEngine'

export interface QrCodeSvgProps {
  value: string
  size?: number | string
  className?: string
  bgColor?: string
  fgColor?: string
  includeMargin?: boolean
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
}

export const QrCodeSvg: React.FC<QrCodeSvgProps> = ({
  value,
  size = 200,
  className = '',
  bgColor = '#FFFFFF',
  fgColor = '#002B5E',
  includeMargin = true,
  errorCorrectionLevel = 'M',
}) => {
  const matrix = React.useMemo(() => {
    try {
      return generateQrMatrix(value, errorCorrectionLevel)
    } catch (err) {
      console.warn('Erro ao gerar matriz do QR Code:', err)
      return []
    }
  }, [value, errorCorrectionLevel])

  if (!matrix.length) {
    return (
      <div
        className={`flex items-center justify-center border border-dashed text-xs text-slate-400 ${className}`}
        style={{ width: size, height: size }}
      >
        QR indisponível
      </div>
    )
  }

  // Margem oficial recomendada (quiet zone de 4 módulos)
  const margin = includeMargin ? 4 : 0
  const matrixSize = matrix.length
  const totalSize = matrixSize + margin * 2

  // Gerar um único path SVG para performance e nitidez absoluta
  let pathData = ''
  for (let r = 0; r < matrixSize; r += 1) {
    for (let c = 0; c < matrixSize; c += 1) {
      if (matrix[r][c]) {
        const x = c + margin
        const y = r + margin
        pathData += `M${x},${y}h1v1h-1z `
      }
    }
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${totalSize} ${totalSize}`}
      width={size}
      height={size}
      className={`block shrink-0 ${className}`}
      shapeRendering="crispEdges"
      preserveAspectRatio="xMidYMid meet"
      style={{
        maxWidth: '100%',
        aspectRatio: '1 / 1',
      }}
      aria-label="QR Code para assinatura eletrônica"
    >
      <rect width={totalSize} height={totalSize} fill={bgColor} />
      <path d={pathData} fill={fgColor} />
    </svg>
  )
}

export default QrCodeSvg
