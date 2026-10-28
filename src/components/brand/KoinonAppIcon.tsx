import React from 'react'
import { KoinonSymbol } from './KoinonSymbol'

export interface KoinonAppIconProps {
  /**
   * Tamanho do ícone (quadrado).
   * @default 78
   */
  size?: number
  /**
   * Variante de cor de fundo:
   * - 'navy': fundo Marinho #002B5E (principal conforme manual)
   * - 'blue': fundo Azul #0066FF (variante do manual)
   * - 'light': fundo Gelo/Claro #F3F7FC com símbolo colorido
   * @default 'navy'
   */
  theme?: 'navy' | 'blue' | 'light'
  className?: string
  scaleMode?: 'master' | 'optical' | 'auto'
}

/**
 * Ícone do Aplicativo Koinon (Manual da Marca v1.0, págs. 2 e 9):
 * - Usa a versão compacta do símbolo (8 pontos mais grossos).
 * - Cerca de 20% de margem interna.
 * - Fundo Marinho #002B5E como ícone principal (pontos em #3D8BFF ou branco, centro branco).
 */
export const KoinonAppIcon: React.FC<KoinonAppIconProps> = ({
  size = 78,
  theme = 'navy',
  className = '',
}) => {
  const borderRadius = Math.round(size * 0.22)
  // ~20% de margem interna = símbolo com cerca de 60% a 64% do tamanho total
  const symbolSize = Math.round(size * 0.6)

  const bgColor = theme === 'blue' ? '#0066FF' : theme === 'light' ? '#F3F7FC' : '#002B5E'
  const symbolVariant = theme === 'blue' ? 'negative' : theme === 'light' ? 'color' : 'on-navy'

  return (
    <div
      className={`inline-flex items-center justify-center shadow-sm select-none shrink-0 ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: `${borderRadius}px`,
        backgroundColor: bgColor,
      }}
      role="img"
      aria-label="Ícone do Aplicativo Koinon"
    >
      <KoinonSymbol size={symbolSize} variant={symbolVariant} compact={true} />
    </div>
  )
}
