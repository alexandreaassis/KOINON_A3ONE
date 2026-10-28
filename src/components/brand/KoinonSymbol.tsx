import React from 'react'

export interface KoinonSymbolProps {
  /**
   * Tamanho em pixels (largura e altura numéricos). Mínimo recomendado: 24px.
   * @default 42
   */
  size?: number
  /**
   * Variante de cor:
   * - 'color' / 'monochrome': arcos em Koinon Navy #12314F, ponto em Koinon Azure #1F6B94.
   * - 'negative' / 'negative-solid': arcos em branco puro #FFFFFF, ponto em Koinon Azure #1F6B94.
   */
  variant?: 'color' | 'negative' | 'negative-solid' | 'monochrome'
  /**
   * Ajuste de renderização:
   * - 'master': ponto com maior destaque (r=19, cy=42 no viewBox 240x240) para tamanhos a partir de 48px.
   * - 'optical': compensação óptica (r=15, cy=42 no viewBox 240x240) para tamanhos reduzidos (24–32px).
   * - 'auto': seleciona automaticamente com base na prop `size` (< 48px usa optical, >= 48px usa master).
   * @default 'auto'
   */
  scaleMode?: 'master' | 'optical' | 'auto'
  className?: string
}

/**
 * Símbolo Oficial Koinon (Fiel à marca e imagem de referência):
 * Anel de SEIS ARCOS espessos com extremidades arredondadas (strokeLinecap="round"),
 * simetria radial de 60 graus, centro vazio e PONTO sólido proeminente em Koinon Azure #1F6B94
 * no eixo de 12 horas ligeiramente sobreposto ao arco superior.
 *
 * Cores exatas:
 * - Arcos: #12314F (Koinon Navy) ou #FFFFFF (versão negativa)
 * - Ponto: #1F6B94 (Koinon Azure)
 */
export const KoinonSymbol: React.FC<KoinonSymbolProps> = ({
  size = 42,
  variant = 'color',
  scaleMode = 'auto',
  className = '',
}) => {
  const isNegative = variant === 'negative' || variant === 'negative-solid'
  const strokeColor = isNegative ? '#FFFFFF' : '#12314F'
  const dotColor = '#1F6B94'

  // Determina se aplica a variante óptica ou master
  const isOptical =
    scaleMode === 'optical' || (scaleMode === 'auto' && typeof size === 'number' && size < 48)

  // Variante Master: r=19 (cy=42) para maior destaque e presença visual no arco superior
  // Variante Óptica (24-32px): r=15 (cy=42) preservando clareza e proporção harmônica
  const dotRadius = isOptical ? 15 : 19
  const dotCy = 42

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
      <circle cx="120" cy={dotCy} r={dotRadius} fill={dotColor} />
    </svg>
  )
}
