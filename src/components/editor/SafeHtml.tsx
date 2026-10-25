import React from 'react'
import { sanitizeHtml, isHtmlContent } from '@/lib/sanitizeHtml'

export interface SafeHtmlProps {
  content?: string | null
  className?: string
  fallbackText?: string
  style?: React.CSSProperties
}

/**
 * Renderiza conteúdo de texto rico de forma segura, com compatibilidade
 * retroativa para textos planos salvos antes do editor rico.
 */
export const SafeHtml: React.FC<SafeHtmlProps> = ({
  content,
  className = '',
  fallbackText = '',
  style,
}) => {
  if (!content || !content.trim()) {
    if (!fallbackText) return null
    return <span className={`text-slate-400 italic ${className}`}>{fallbackText}</span>
  }

  const raw = content.trim()

  // Se for texto plano antigo (sem tags HTML)
  if (!isHtmlContent(raw)) {
    return (
      <div className={`whitespace-pre-line ${className}`} style={style}>
        {raw}
      </div>
    )
  }

  const safeHtml = sanitizeHtml(raw)

  return (
    <div
      className={`rendered-document-html ${className}`}
      style={style}
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  )
}

export default SafeHtml
