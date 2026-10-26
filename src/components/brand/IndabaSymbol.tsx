import React from 'react'

export interface IndabaSymbolProps {
  /**
   * Tamanho em pixels (largura e altura). Mínimo recomendado: 24px.
   * @default 32
   */
  size?: number
  /**
   * Variante de cor:
   * - 'color': círculo Ocre (#E39A2B), traços Indaba Deep (#1E1B18)
   * - 'negative': círculo Ocre (#E39A2B) ou branco (#FFFFFF), traços brancos (#FFFFFF) para uso sobre Indaba Deep
   * - 'negative-solid': tudo em branco puro (#FFFFFF)
   * - 'monochrome': tudo em Indaba Deep (#1E1B18) sobre fundo claro
   */
  variant?: 'color' | 'negative' | 'negative-solid' | 'monochrome'
  className?: string
}

/**
 * Símbolo Oficial Indaba:
 * - Círculo central sólido em Ocre #E39A2B (ou branco na versão negative-solid/monocromática)
 * - Cercado por seis posições radiais distribuídas a 60 graus
 * - Cinco traços radiais curtos de espessura uniforme com pontas arredondadas
 * - Um dos seis traços é substituído por um pequeno ponto circular deslocado ligeiramente para fora do anel
 *   (representando aquele chamado a entrar no encontro).
 * - Geometria limpa, sem ornamento, textura ou detalhes decorativos.
 */
export const IndabaSymbol: React.FC<IndabaSymbolProps> = ({
  size = 32,
  variant = 'color',
  className = '',
}) => {
  // Configuração de cores por variante
  let centerFill = '#E39A2B'
  let strokeColor = '#1E1B18'
  let dotFill = '#E39A2B'

  if (variant === 'negative') {
    centerFill = '#E39A2B'
    strokeColor = '#FFFFFF'
    dotFill = '#E39A2B'
  } else if (variant === 'negative-solid') {
    centerFill = '#FFFFFF'
    strokeColor = '#FFFFFF'
    dotFill = '#FFFFFF'
  } else if (variant === 'monochrome') {
    centerFill = '#1E1B18'
    strokeColor = '#1E1B18'
    dotFill = '#1E1B18'
  }

  // Raio do viewBox: sistema 64x64 com centro em (32, 32)
  // Círculo central: r = 9
  // Distância dos 5 traços radiais: de r=16 até r=23 (comprimento 7, espessura 3.5, pontas arredondadas)
  // Ângulos dos 5 traços (graus): 30, 90, 150, 210, 270 (ou 0, 60, 120, 180, 240)
  // Posição do ponto circular deslocado: ângulo a 330 graus (ou 300), centro a r = 24.5, raio = 2.75

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className}`}
      aria-hidden="true"
    >
      {/* Círculo central sólido */}
      <circle cx="32" cy="32" r="8.5" fill={centerFill} />

      {/* 5 traços radiais curtos a cada 60 graus com pontas arredondadas */}
      {/* Ângulo 30°: cos(30)=0.866, sin(30)=0.5 */}
      <line
        x1="45"
        y1="39.5"
        x2="51"
        y2="43"
        stroke={strokeColor}
        strokeWidth="3.2"
        strokeLinecap="round"
      />

      {/* Ângulo 90°: vertical inferior */}
      <line
        x1="32"
        y1="47"
        x2="32"
        y2="54"
        stroke={strokeColor}
        strokeWidth="3.2"
        strokeLinecap="round"
      />

      {/* Ângulo 150°: inferior esquerdo */}
      <line
        x1="19"
        y1="39.5"
        x2="13"
        y2="43"
        stroke={strokeColor}
        strokeWidth="3.2"
        strokeLinecap="round"
      />

      {/* Ângulo 210°: superior esquerdo */}
      <line
        x1="19"
        y1="24.5"
        x2="13"
        y2="21"
        stroke={strokeColor}
        strokeWidth="3.2"
        strokeLinecap="round"
      />

      {/* Ângulo 270°: vertical superior */}
      <line
        x1="32"
        y1="17"
        x2="32"
        y2="10"
        stroke={strokeColor}
        strokeWidth="3.2"
        strokeLinecap="round"
      />

      {/* 6ª posição (330° / superior direito): o traço é substituído por um ponto circular
          deslocado ligeiramente para fora do anel (aquele chamado a entrar no encontro) */}
      <circle cx="49" cy="22" r="2.8" fill={dotFill} />
    </svg>
  )
}
