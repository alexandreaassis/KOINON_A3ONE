import React from 'react'
import { KoinonSymbol } from './KoinonSymbol'

export interface KoinonLogoProps {
  /**
   * Altura do símbolo e proporção do logotipo completo.
   * Mínimo do símbolo: 24px.
   * @default 42
   */
  size?: number
  /**
   * Variante de cor conforme o Manual da Marca v1.0:
   * - 'color': símbolo em Azul #0066FF / ponto central Marinho #002B5E, logotipo em Marinho #002B5E
   * - 'on-navy': sobre fundo marinho, pontos do símbolo em #3D8BFF, centro e letras em Branco #FFFFFF
   * - 'negative' / 'negative-solid': tudo em Branco puro #FFFFFF (para fundo azul ou escuro)
   * - 'monochrome': todo em Preto #000000
   */
  variant?: 'color' | 'on-navy' | 'negative' | 'negative-solid' | 'monochrome'
  /**
   * Orientação do logotipo:
   * - 'horizontal' (principal)
   * - 'vertical'
   * @default 'horizontal'
   */
  orientation?: 'horizontal' | 'vertical'
  /**
   * Opcional: subtítulo institucional (ex: nome do condomínio).
   */
  subtitle?: string
  className?: string
  scaleMode?: 'master' | 'optical' | 'auto'
}

/**
 * Logomarca Oficial Koinon (Manual da Marca v1.0, págs. 3 e 4):
 * - Une o símbolo Círculo Comum ao logotipo KOINON desenhado em formas geométricas vetoriais.
 * - Versão horizontal é a principal; versão vertical disponível.
 * - Tipografia da marca: Poppins com geometria precisa do "O" circular e "K" nítido.
 * - Proporção: a altura do wordmark KOINON é calibrada proporcionalmente ao símbolo.
 *
 * Cores:
 * - Versão Colorida: símbolo em Azul Koinon #0066FF + Marinho #002B5E, wordmark em Marinho #002B5E.
 * - Sobre Fundo Marinho ('on-navy'): pontos do anel em #3D8BFF, centro e wordmark em #FFFFFF.
 * - Versão Negativa ('negative'): tudo em #FFFFFF.
 * - Monocromática Preto ('monochrome'): tudo em #000000.
 */
export const KoinonLogo: React.FC<KoinonLogoProps> = ({
  size = 42,
  variant = 'color',
  orientation = 'horizontal',
  subtitle,
  className = '',
}) => {
  const isDark = variant === 'on-navy' || variant === 'negative' || variant === 'negative-solid'
  const isBlack = variant === 'monochrome'

  // Cor do wordmark KOINON em formas geométricas
  const wordmarkColor = isDark ? '#FFFFFF' : isBlack ? '#000000' : '#002B5E'
  const subtitleColor = variant === 'on-navy' ? '#8EC0FF' : isDark ? '#E2E8F0' : '#5A6B82'

  // Proporção harmônica da altura das letras KOINON em relação ao símbolo
  const wordmarkHeight = Math.max(16, Math.round(size * 0.62))
  const gapPx = Math.max(8, Math.round(size * 0.36))

  // Render do wordmark KOINON em SVG geométrico (não texto editável / sujeito a font swaps incorretos)
  // Grade do wordmark: viewBox 0 0 280 44
  const wordmarkSvg = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 280 44"
      height={wordmarkHeight}
      role="img"
      aria-label="KOINON"
      className="shrink-0 select-none inline-block align-middle"
    >
      <g fill={wordmarkColor}>
        {/* K: haste vertical + diagonais geométricas */}
        <path d="M 6 4 L 14 4 L 14 40 L 6 40 Z" />
        <path d="M 14 24 L 33 4 L 44 4 L 23 24 L 45 40 L 34 40 Z" />

        {/* O: círculo externo e interno perfeitos */}
        <path
          fillRule="evenodd"
          d="M 72 4 C 83.05 4 92 12.95 92 24 C 92 35.05 83.05 44 72 44 C 60.95 44 52 35.05 52 24 C 52 12.95 60.95 4 72 4 Z M 72 12 C 65.37 12 60 17.37 60 24 C 60 30.63 65.37 36 72 36 C 78.63 36 84 30.63 84 24 C 84 17.37 78.63 12 72 12 Z"
        />

        {/* I: haste simples limpa */}
        <path d="M 103 4 L 111 4 L 111 40 L 103 40 Z" />

        {/* N: hastes verticais + diagonal */}
        <path d="M 122 4 L 130 4 L 130 40 L 122 40 Z" />
        <path d="M 124 4 L 152 38 L 152 4 L 160 4 L 160 40 L 152 40 L 124 6 Z" />
        <path d="M 152 4 L 160 4 L 160 40 L 152 40 Z" />

        {/* O: segundo círculo */}
        <path
          fillRule="evenodd"
          d="M 191 4 C 202.05 4 211 12.95 211 24 C 211 35.05 202.05 44 191 44 C 179.95 44 171 35.05 171 24 C 171 12.95 179.95 4 191 4 Z M 191 12 C 184.37 12 179 17.37 179 24 C 179 30.63 184.37 36 191 36 C 197.63 36 203 30.63 203 24 C 203 17.37 197.63 12 191 12 Z"
        />

        {/* N: segundo N */}
        <path d="M 222 4 L 230 4 L 230 40 L 222 40 Z" />
        <path d="M 224 4 L 252 38 L 252 4 L 260 4 L 260 40 L 252 40 L 224 6 Z" />
        <path d="M 252 4 L 260 4 L 260 40 L 252 40 Z" />
      </g>
    </svg>
  )

  if (orientation === 'vertical') {
    return (
      <div
        className={`inline-flex flex-col items-center justify-center select-none ${className}`}
        style={{ gap: `${Math.round(size * 0.25)}px` }}
      >
        <KoinonSymbol size={size} variant={variant} />
        <div className="flex flex-col items-center text-center">
          {wordmarkSvg}
          {subtitle && (
            <span
              className="text-[10px] font-medium tracking-wide uppercase mt-1 truncate max-w-[200px]"
              style={{ fontFamily: "'Poppins', sans-serif", color: subtitleColor }}
            >
              {subtitle}
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className={`inline-flex items-center select-none ${className}`}
      style={{ gap: `${gapPx}px` }}
    >
      <KoinonSymbol size={size} variant={variant} />

      <div className="flex flex-col justify-center leading-none">
        {wordmarkSvg}
        {subtitle && (
          <span
            className="text-[10px] font-medium tracking-wide uppercase mt-1 truncate max-w-[260px]"
            style={{ fontFamily: "'Poppins', sans-serif", color: subtitleColor }}
          >
            {subtitle}
          </span>
        )}
      </div>
    </div>
  )
}
