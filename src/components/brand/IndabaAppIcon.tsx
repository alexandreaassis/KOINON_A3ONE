import React from 'react'
import { IndabaSymbol } from './IndabaSymbol'

export interface IndabaAppIconProps {
  /**
   * Tamanho do ícone (quadrado).
   * @default 48
   */
  size?: number
  className?: string
}

/**
 * Ícone de App e Favicon Indaba:
 * - Quadrado arredondado com fundo Indaba Deep #1E1B18
 * - Símbolo em Ocre #E39A2B (círculo e ponto Ocre, traços em Areia #F4EFE7 ou Ocre)
 */
export const IndabaAppIcon: React.FC<IndabaAppIconProps> = ({ size = 48, className = '' }) => {
  const borderRadius = Math.round(size * 0.22) // Curvatura equilibrada
  const symbolSize = Math.round(size * 0.65)

  return (
    <div
      className={`inline-flex items-center justify-center bg-[#1E1B18] shadow-sm select-none shrink-0 ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: `${borderRadius}px`,
      }}
    >
      <IndabaSymbol size={symbolSize} variant="negative" />
    </div>
  )
}
