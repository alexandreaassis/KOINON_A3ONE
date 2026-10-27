import React from 'react'

export interface KoinonSymbolProps {
  /**
   * Tamanho em pixels (largura e altura numéricos). Mínimo recomendado: 24px.
   * @default 24
   */
  size?: number
  /**
   * Variante de cor:
   * - 'color' / 'monochrome': arcos em Koinon Navy #12314F, ponto em Koinon Azure #1F6B94.
   * - 'negative' / 'negative-solid': arcos em branco puro #FFFFFF, ponto em Koinon Azure #1F6B94.
   */
  variant?: 'color' | 'negative' | 'negative-solid' | 'monochrome'
  className?: string
}

/**
 * Símbolo Oficial Koinon (Fiel à marca e imagem de referência):
 * Anel de SEIS ARCOS espessos com extremidades arredondadas (strokeLinecap="round"),
 * simetria radial de 60 graus, centro vazio e PONTO sólido maior em Koinon Azure #1F6B94
 * no eixo de 12 horas ligeiramente sobreposto ao arco superior.
 *
 * Cores exatas:
 * - Arcos: #12314F (Koinon Navy) ou #FFFFFF (versão negativa)
 * - Ponto: #1F6B94 (Koinon Azure)
 */
export const KoinonSymbol: React.FC<KoinonSymbolProps> = ({
  size = 24,
  variant = 'color',
  className = '',
}) => {
  const isNegative = variant === 'negative' || variant === 'negative-solid'
  const strokeColor = isNegative ? '#FFFFFF' : '#12314F'
  const dotColor = '#1F6B94'

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 240 240"
      width={size}
      height={size}
      role="img"
      aria-label="Símbolo Koinon: seis arcos e um ponto no topo"
      className={`shrink-0 select-none ${className}`}
    >
      {/* 6 Arcos com 43.2 graus cada e espessura 22, centro (120, 120), raio 78 */}
      <path
        d="M 91.31 52.88 A 78 78 0 0 1 148.69 52.88"
        fill="none"
        stroke={strokeColor}
        strokeWidth="22"
        strokeLinecap="round"
      />
      <path
        d="M 167.31 63.63 A 78 78 0 0 1 196.00 113.32"
        fill="none"
        stroke={strokeColor}
        strokeWidth="22"
        strokeLinecap="round"
      />
      <path
        d="M 196.00 126.68 A 78 78 0 0 1 167.31 176.37"
        fill="none"
        stroke={strokeColor}
        strokeWidth="22"
        strokeLinecap="round"
      />
      <path
        d="M 148.69 187.12 A 78 78 0 0 1 91.31 187.12"
        fill="none"
        stroke={strokeColor}
        strokeWidth="22"
        strokeLinecap="round"
      />
      <path
        d="M 72.69 176.37 A 78 78 0 0 1 44.00 126.68"
        fill="none"
        stroke={strokeColor}
        strokeWidth="22"
        strokeLinecap="round"
      />
      <path
        d="M 44.00 113.32 A 78 78 0 0 1 72.69 63.63"
        fill="none"
        stroke={strokeColor}
        strokeWidth="22"
        strokeLinecap="round"
      />
      {/* Ponto sólido em Koinon Azure sobre o arco superior no eixo de 12 horas */}
      <circle cx="120" cy="42" r="13" fill={dotColor} />
    </svg>
  )
}
