import React from 'react'

export interface EndossoA3OneProps {
  /**
   * Variante de cor:
   * - 'color': sobre fundo claro (frase em cinza #5A6B82, logo A3ONE em azul/marinho)
   * - 'on-navy': sobre fundo marinho (frase em #8EC0FF, logo A3ONE em branco/#8EC0FF)
   * - 'monochrome-white': todo em branco (para fundos escuros monocromáticos)
   * - 'monochrome-black': todo em preto
   * @default 'color'
   */
  variant?: 'color' | 'on-navy' | 'monochrome-white' | 'monochrome-black'
  /**
   * Disposição:
   * - 'stacked': frase acima do logo A3ONE (telas de entrada, capas)
   * - 'inline': frase à esquerda do logo A3ONE (rodapés, cabeçalhos horizontais)
   * @default 'inline'
   */
  layout?: 'inline' | 'stacked'
  className?: string
}

/**
 * Selo de Endosso Koinon — "uma solução A3ONE" (Manual da Marca v1.0, pág. 11):
 * - Aplicação:
 *   (a) Abaixo, centralizado, em telas de entrada e capas;
 *   (b) No rodapé das telas do sistema, e-mails e documentos.
 * - Regras do selo:
 *   - O selo A3ONE nunca é maior que o símbolo Koinon.
 *   - A frase "uma solução" usa Poppins Regular em cinza #5A6B82 (ou #8EC0FF sobre marinho).
 *   - Logo A3ONE desenhado geometricamente (A estilizado com traço diagonal/chevron azul + '3ONE' + 'Soluções Integradas').
 */
export const EndossoA3One: React.FC<EndossoA3OneProps> = ({
  variant = 'color',
  layout = 'inline',
  className = '',
}) => {
  const isDark = variant === 'on-navy' || variant === 'monochrome-white'
  const textColor = variant === 'on-navy' ? '#8EC0FF' : isDark ? '#FFFFFF' : '#5A6B82'

  // Cores do logotipo A3ONE
  const aChevronColor =
    variant === 'monochrome-white'
      ? '#FFFFFF'
      : variant === 'monochrome-black'
        ? '#000000'
        : '#0066FF'
  const mainTextColor =
    variant === 'on-navy' || variant === 'monochrome-white'
      ? '#FFFFFF'
      : variant === 'monochrome-black'
        ? '#000000'
        : '#002B5E'
  const subTextColor =
    variant === 'on-navy'
      ? '#8EC0FF'
      : variant === 'monochrome-white'
        ? '#FFFFFF'
        : variant === 'monochrome-black'
          ? '#000000'
          : '#5A6B82'

  const logoA3OneSvg = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 160 48"
      height={layout === 'stacked' ? 24 : 18}
      role="img"
      aria-label="A3ONE Soluções Integradas"
      className="shrink-0 select-none inline-block align-middle"
    >
      {/* Glifo estilizado do 'A' (triângulo chevron com abertura inferior) */}
      <path
        d="M 6 30 L 18 6 L 30 30"
        fill="none"
        stroke={aChevronColor}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="11"
        y1="22"
        x2="25"
        y2="22"
        stroke={aChevronColor}
        strokeWidth="4"
        strokeLinecap="round"
      />

      {/* Texto "3ONE" em peso Bold / SemiBold geométrico */}
      <text
        x="36"
        y="28"
        fill={mainTextColor}
        fontFamily="'Poppins', sans-serif"
        fontWeight="800"
        fontSize="24"
        letterSpacing="0.02em"
      >
        3ONE
      </text>

      {/* Subtítulo "Soluções Integradas" */}
      <text
        x="8"
        y="43"
        fill={subTextColor}
        fontFamily="'Poppins', sans-serif"
        fontWeight="500"
        fontSize="7.5"
        letterSpacing="0.08em"
      >
        Soluções Integradas
      </text>
    </svg>
  )

  if (layout === 'stacked') {
    return (
      <div
        className={`inline-flex flex-col items-center justify-center gap-1 select-none ${className}`}
      >
        <span
          className="text-[11px] font-normal tracking-wide"
          style={{ fontFamily: "'Poppins', sans-serif", color: textColor }}
        >
          uma solução
        </span>
        {logoA3OneSvg}
      </div>
    )
  }

  return (
    <div className={`inline-flex items-center justify-center gap-2 select-none ${className}`}>
      <span
        className="text-[11px] font-normal tracking-wide whitespace-nowrap"
        style={{ fontFamily: "'Poppins', sans-serif", color: textColor }}
      >
        uma solução
      </span>
      {logoA3OneSvg}
    </div>
  )
}
