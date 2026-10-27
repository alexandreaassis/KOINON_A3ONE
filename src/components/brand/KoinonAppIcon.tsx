import React from 'react'
import { KoinonSymbol } from './KoinonSymbol'

export interface KoinonAppIconProps {
  /**
   * Tamanho do ícone (quadrado).
   * @default 48
   */
  size?: number
  className?: string
}

/**
 * Ícone de App e Favicon Koinon:
 * - Quadrado arredondado com cantos proporcionais e fundo Koinon Navy #12314F
 * - Símbolo Koinon negativo (arcos brancos, ponto Koinon Azure #1F6B94)
 */
export const KoinonAppIcon: React.FC<KoinonAppIconProps> = ({ size = 48, className = '' }) => {
  const borderRadius = Math.round(size * 0.22)
  const symbolSize = Math.round(size * 0.64)

  return (
    <div
      className={`inline-flex items-center justify-center bg-[#12314F] shadow-sm select-none shrink-0 ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: `${borderRadius}px`,
      }}
    >
      <KoinonSymbol size={symbolSize} variant="negative" />
    </div>
  )
}
