import React from 'react'

export interface KoinonSymbolProps {
  /**
   * Tamanho em pixels (largura e altura numéricos). Mínimo recomendado: 24px.
   * @default 24
   */
  size?: number
  /**
   * Variante de cor:
   * - 'color' / 'monochrome': arcos em Koinon Ink #1C2331, ponto em Aegean #216E75.
   * - 'negative' / 'negative-solid': arcos em branco puro #FFFFFF, ponto em Aegean #216E75.
   */
  variant?: 'color' | 'negative' | 'negative-solid' | 'monochrome'
  className?: string
}

/**
 * Símbolo Oficial Koinon (Regra Seção 5):
 * Anel de SEIS ARCOS de igual comprimento e espessura, separados por SEIS INTERVALOS iguais,
 * simetria radial de 60 graus, centro completamente vazio, e um PONTO sólido em Aegean repousando
 * sobre o arco superior, no eixo de 12 horas.
 *
 * Duas variantes:
 * - Variante ÓPTICA (< 48px): Espessura 12, arco 44 graus, intervalo 16 graus
 * - Variante MASTER (>= 48px): Espessura 16, arco 46 graus, intervalo 14 graus
 */
export const KoinonSymbol: React.FC<KoinonSymbolProps> = ({
  size = 24,
  variant = 'color',
  className = '',
}) => {
  const isNegative = variant === 'negative' || variant === 'negative-solid'
  const strokeColor = isNegative ? '#FFFFFF' : '#1C2331'
  const dotColor = '#216E75' // Aegean mantido conforme especificação

  const isMaster = size >= 48

  if (isMaster) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 240 240"
        width={size}
        height={size}
        role="img"
        aria-label="Símbolo com seis arcos e um ponto no topo"
        className={`shrink-0 select-none ${className}`}
      >
        <path
          d="M 89.53 48.20 A 78 78 0 0 1 150.47 48.20"
          fill="none"
          stroke={strokeColor}
          strokeWidth="16"
          strokeLinecap="round"
        />
        <path
          d="M 166.94 57.71 A 78 78 0 0 1 197.42 110.49"
          fill="none"
          stroke={strokeColor}
          strokeWidth="16"
          strokeLinecap="round"
        />
        <path
          d="M 197.42 129.51 A 78 78 0 0 1 166.94 182.29"
          fill="none"
          stroke={strokeColor}
          strokeWidth="16"
          strokeLinecap="round"
        />
        <path
          d="M 150.47 191.80 A 78 78 0 0 1 89.53 191.80"
          fill="none"
          stroke={strokeColor}
          strokeWidth="16"
          strokeLinecap="round"
        />
        <path
          d="M 73.06 182.29 A 78 78 0 0 1 42.58 129.51"
          fill="none"
          stroke={strokeColor}
          strokeWidth="16"
          strokeLinecap="round"
        />
        <path
          d="M 42.58 110.49 A 78 78 0 0 1 73.06 57.71"
          fill="none"
          stroke={strokeColor}
          strokeWidth="16"
          strokeLinecap="round"
        />
        <circle cx="120" cy="42" r="8" fill={dotColor} />
      </svg>
    )
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 240 240"
      width={size}
      height={size}
      role="img"
      aria-label="Símbolo com seis arcos e um ponto no topo"
      className={`shrink-0 select-none ${className}`}
    >
      <path
        d="M 90.78 47.68 A 78 78 0 0 1 149.22 47.68"
        fill="none"
        stroke={strokeColor}
        strokeWidth="12"
        strokeLinecap="round"
      />
      <path
        d="M 168.02 58.54 A 78 78 0 0 1 197.24 109.14"
        fill="none"
        stroke={strokeColor}
        strokeWidth="12"
        strokeLinecap="round"
      />
      <path
        d="M 197.24 130.86 A 78 78 0 0 1 168.02 181.46"
        fill="none"
        stroke={strokeColor}
        strokeWidth="12"
        strokeLinecap="round"
      />
      <path
        d="M 149.22 192.32 A 78 78 0 0 1 90.78 192.32"
        fill="none"
        stroke={strokeColor}
        strokeWidth="12"
        strokeLinecap="round"
      />
      <path
        d="M 71.98 181.46 A 78 78 0 0 1 42.76 130.86"
        fill="none"
        stroke={strokeColor}
        strokeWidth="12"
        strokeLinecap="round"
      />
      <path
        d="M 42.76 109.14 A 78 78 0 0 1 71.98 58.54"
        fill="none"
        stroke={strokeColor}
        strokeWidth="12"
        strokeLinecap="round"
      />
      <circle cx="120" cy="42" r="6" fill={dotColor} />
    </svg>
  )
}
