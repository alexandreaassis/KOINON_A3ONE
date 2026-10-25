import DOMPurify from 'dompurify'

/**
 * Configuração estrita de sanitização permitindo tags e atributos estilísticos
 * seguros (inline styles para alinhamento, recuo, fontes, tamanhos, cores, espaçamento).
 */
const PURIFY_CONFIG = {
  ALLOWED_TAGS: [
    'p',
    'span',
    'strong',
    'b',
    'em',
    'i',
    'u',
    's',
    'sub',
    'sup',
    'mark',
    'ul',
    'ol',
    'li',
    'br',
    'div',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'blockquote',
    'hr',
  ],
  ALLOWED_ATTR: [
    'style',
    'class',
    'data-indent',
    'data-line-height',
    'data-paragraph-spacing',
    'data-color',
  ],
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'href', 'src'],
}

/**
 * Sanitiza código HTML gerado pelo editor para armazenamento e renderização seguros.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return ''
  const clean = DOMPurify.sanitize(html, PURIFY_CONFIG)
  return String(clean)
}

/**
 * Verifica se um texto recebido contém HTML ou se é texto puro legado.
 */
export function isHtmlContent(content: string): boolean {
  if (!content) return false
  const trimmed = content.trim()
  return /<\/?[a-z][\s\S]*>/i.test(trimmed)
}

/**
 * Converte texto puro legado (com \n) em HTML limpo com parágrafos.
 * Se o conteúdo já for HTML, apenas o sanitiza.
 */
export function normalizarConteudoParaHtml(content: string): string {
  if (!content || !content.trim()) return ''

  if (isHtmlContent(content)) {
    return sanitizeHtml(content)
  }

  // Texto puro: quebrar por quebras duplas de linha em parágrafos
  const paragraphs = content
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)

  if (paragraphs.length === 0) {
    const single = content.replace(/\n/g, '<br />')
    return `<p>${single}</p>`
  }

  const html = paragraphs.map((p) => `<p>${p.replace(/\n/g, '<br />')}</p>`).join('')

  return sanitizeHtml(html)
}
