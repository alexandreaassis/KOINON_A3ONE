import React from 'react'

export interface KoinonSymbolProps {
  /**
   * Tamanho em pixels (largura e altura).
   * Mínimo recomendado: 24px (abaixo de 24px usa variante compacta de 8 pontos).
   * @default 42
   */
  size?: number
  /**
   * Variante de cor:
   * - 'color': pontos em Azul Koinon #0066FF, ponto central em Marinho #002B5E
   * - 'on-navy': pontos em Azul #3D8BFF, ponto central em Branco #FFFFFF
   * - 'negative' / 'negative-solid': tudo em Branco #FFFFFF
   * - 'monochrome': tudo em Preto #000000
   */
  variant?: 'color' | 'on-navy' | 'negative' | 'negative-solid' | 'monochrome'
  /**
   * Forçar variante compacta (8 pontos) ou automática baseada em size (< 24px)
   */
  compact?: boolean
  className?: string
  scaleMode?: 'master' | 'optical' | 'auto'
}

/**
 * Símbolo "Círculo Comum" Koinon (Manual da Marca v1.0):
 * - Grade de 200x200 unidades, anel com raio de 70 unidades (centro 100, 100).
 * - 12 pontos a cada 30°, deslocados em 15° do eixo vertical.
 * - Eixo vertical divide: 6 pontos SÓLIDOS à esquerda (presencial) e 6 pontos VAZADOS à direita (remoto, traço 5).
 * - Ponto central sólido Ø30 (raio 15) no centro (100, 100) — "o comum: a pauta e a decisão".
 * - Pontos do anel: Ø24 (raio 12).
 *
 * Versão Compacta (16–32px):
 * - 8 pontos (4 sólidos à esquerda, 4 vazados à direita), mais grossos para máxima legibilidade.
 */
export const KoinonSymbol: React.FC<KoinonSymbolProps> = ({
  size = 42,
  variant = 'color',
  compact = false,
  className = '',
}) => {
  const isCompact = compact || (typeof size === 'number' && size < 24)

  // Cores conforme variante do Manual
  let ringPointColor = '#0066FF' // Azul Koinon
  let ringHollowColor = '#0066FF'
  let centerColor = '#002B5E' // Marinho Koinon

  if (variant === 'on-navy') {
    // Versão negativa da sidebar/fundo escuro conforme Manual da Marca:
    // arcos/pontos em branco (#FFFFFF), ponto central em Azul #0066FF
    ringPointColor = '#FFFFFF'
    ringHollowColor = '#FFFFFF'
    centerColor = '#0066FF'
  } else if (variant === 'negative' || variant === 'negative-solid') {
    // Versão negativa do Manual: arcos/pontos brancos, ponto central em Azul #0066FF
    ringPointColor = '#FFFFFF'
    ringHollowColor = '#FFFFFF'
    centerColor = '#0066FF'
  } else if (variant === 'monochrome') {
    ringPointColor = '#000000'
    ringHollowColor = '#000000'
    centerColor = '#000000'
  }

  if (isCompact) {
    // Versão compacta: 8 pontos a cada 45°, deslocados em 22.5° do eixo vertical
    // 4 pontos sólidos à esquerda, 4 vazados à direita
    // Ângulos do topo (-90°):
    // Esquerda (sólidos): -90 - 22.5 = -112.5°, -157.5°, -202.5°, -247.5°
    // Direita (vazados): -90 + 22.5 = -67.5°, -22.5°, +22.5°, +67.5°
    const compactRadius = 66
    const leftAngles = [-112.5, -157.5, -202.5, -247.5]
    const rightAngles = [-67.5, -22.5, 22.5, 67.5]

    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 200 200"
        width={size}
        height={size}
        role="img"
        aria-label="Símbolo Koinon Compacto: Círculo Comum"
        className={`shrink-0 select-none ${className}`}
      >
        {/* Ponto Central sólido Ø34 (r=17) */}
        <circle cx="100" cy="100" r="17" fill={centerColor} />

        {/* 4 Pontos Sólidos à Esquerda (Presencial) Ø30 (r=15) */}
        {leftAngles.map((ang, i) => {
          const rad = (ang * Math.PI) / 180
          const cx = +(100 + compactRadius * Math.cos(rad)).toFixed(2)
          const cy = +(100 + compactRadius * Math.sin(rad)).toFixed(2)
          return <circle key={`c-left-${i}`} cx={cx} cy={cy} r="15" fill={ringPointColor} />
        })}

        {/* 4 Pontos Vazados à Direita (Remoto) Ø30 (r=15), traço 6 */}
        {rightAngles.map((ang, i) => {
          const rad = (ang * Math.PI) / 180
          const cx = +(100 + compactRadius * Math.cos(rad)).toFixed(2)
          const cy = +(100 + compactRadius * Math.sin(rad)).toFixed(2)
          return (
            <circle
              key={`c-right-${i}`}
              cx={cx}
              cy={cy}
              r="12"
              fill="none"
              stroke={ringHollowColor}
              strokeWidth="6"
            />
          )
        })}
      </svg>
    )
  }

  // Símbolo Completo Padrão: 12 pontos a cada 30°, deslocados em 15° do eixo vertical
  // Grade 200x200, anel raio 70, centro (100, 100)
  // Lado Esquerdo (sólidos, x < 100):
  // Ângulos a partir do topo (-90°): -105°, -135°, -165°, -195°, -225°, -255°
  // Lado Direito (vazados, x > 100):
  // Ângulos a partir do topo (-90°): -75°, -45°, -15°, +15°, +45°, +75°
  const R = 70
  const leftAngles = [-105, -135, -165, -195, -225, -255]
  const rightAngles = [-75, -45, -15, 15, 45, 75]

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 200"
      width={size}
      height={size}
      role="img"
      aria-label="Símbolo Koinon: Círculo Comum — anel de 12 pontos divididos entre presencial e remoto com ponto central"
      className={`shrink-0 select-none ${className}`}
    >
      {/* Ponto central sólido Ø30 (raio 15) no centro (100, 100) */}
      <circle cx="100" cy="100" r="15" fill={centerColor} />

      {/* 6 Pontos sólidos à esquerda (Presencial) Ø24 (raio 12) */}
      {leftAngles.map((deg, i) => {
        const rad = (deg * Math.PI) / 180
        const cx = +(100 + R * Math.cos(rad)).toFixed(2)
        const cy = +(100 + R * Math.sin(rad)).toFixed(2)
        return <circle key={`left-${i}`} cx={cx} cy={cy} r="12" fill={ringPointColor} />
      })}

      {/* 6 Pontos vazados à direita (Remoto) Ø24 (raio 12, traço 5: raio mediano 9.5) */}
      {rightAngles.map((deg, i) => {
        const rad = (deg * Math.PI) / 180
        const cx = +(100 + R * Math.cos(rad)).toFixed(2)
        const cy = +(100 + R * Math.sin(rad)).toFixed(2)
        return (
          <circle
            key={`right-${i}`}
            cx={cx}
            cy={cy}
            r="9.5"
            fill="none"
            stroke={ringHollowColor}
            strokeWidth="5"
          />
        )
      })}
    </svg>
  )
}

/**
 * Ícone indicador de modalidade conforme manual (ponto sólido = presencial, vazado = remoto)
 */
export const ModalidadeIcon: React.FC<{
  modalidade: 'presencial' | 'remoto' | string
  size?: number
  className?: string
}> = ({ modalidade, size = 14, className = '' }) => {
  const isPresencial = modalidade === 'presencial' || modalidade === 'Presencial'

  if (isPresencial) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width={size}
        height={size}
        className={`shrink-0 inline-block align-middle ${className}`}
        role="img"
        aria-label="Presencial (ponto sólido)"
      >
        <circle cx="12" cy="12" r="9" fill="#0066FF" />
      </svg>
    )
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={`shrink-0 inline-block align-middle ${className}`}
      role="img"
      aria-label="Remoto (ponto vazado)"
    >
      <circle cx="12" cy="12" r="7" fill="none" stroke="#0066FF" strokeWidth="4" />
    </svg>
  )
}
