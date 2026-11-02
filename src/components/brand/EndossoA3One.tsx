import React from 'react'
import logoA3OneOficial from '@/assets/a3one-solucoes-integradas-2-5349d.png'

export interface EndossoA3OneProps {
  /**
   * Variante de cor:
   * - 'color': sobre fundo claro (frase em cinza #5A6B82, logo A3ONE oficial em azul/marinho)
   * - 'on-navy': sobre fundo marinho (frase em #8EC0FF, logo A3ONE com proteção de contraste)
   * - 'monochrome-white': para fundos escuros monocromáticos
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
 * Selo de Endosso Koinon — "uma solução A3ONE" (Manual da Marca Koinon / Logo Oficial A3ONE Soluções Integradas):
 * - Aplicação:
 *   (a) Abaixo, centralizado, em telas de entrada e capas;
 *   (b) No rodapé das telas do sistema, e-mails e documentos.
 * - Utiliza a imagem oficial anexada da A3ONE:
 *   Wordmark "A3ONE" com "A3" em azul (#0066FF) e "ONE" em marinho (#002B5E),
 *   mais a linha "Soluções Integradas" abaixo em marinho.
 */
export const EndossoA3One: React.FC<EndossoA3OneProps> = ({
  variant = 'color',
  layout = 'inline',
  className = '',
}) => {
  const isDark = variant === 'on-navy' || variant === 'monochrome-white'
  const textColor = variant === 'on-navy' ? '#8EC0FF' : isDark ? '#FFFFFF' : '#5A6B82'

  // A logo oficial tem texto em azul #0066FF e marinho #002B5E.
  // Em fundos escuros, uma base leve e suave garante legibilidade sem distorcer as cores da marca.
  const logoImg = (
    <div
      className={`inline-flex items-center justify-center shrink-0 ${
        isDark ? 'bg-white/95 px-2 py-0.5 rounded-[6px] shadow-xs' : ''
      }`}
    >
      <img
        src={logoA3OneOficial}
        alt="A3ONE Soluções Integradas"
        className={`shrink-0 select-none object-contain ${
          layout === 'stacked' ? 'h-7 sm:h-8' : 'h-5 sm:h-6'
        } w-auto`}
      />
    </div>
  )

  if (layout === 'stacked') {
    return (
      <div
        className={`inline-flex flex-col items-center justify-center gap-1.5 select-none ${className}`}
      >
        <span
          className="text-[11px] font-normal tracking-wide"
          style={{ fontFamily: "'Poppins', sans-serif", color: textColor }}
        >
          uma solução
        </span>
        {logoImg}
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
      {logoImg}
    </div>
  )
}
