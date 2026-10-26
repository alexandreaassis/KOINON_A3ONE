/**
 * Utilitário centralizado para captura de DOM/Imagens com html-to-image local.
 * Garante que:
 * 1. O pacote npm local `html-to-image` seja utilizado (nunca carregado via CDN).
 * 2. Todas as operações utilizem `skipFonts: true` por padrão para prevenir o SecurityError
 *    de 'cssRules' com fontes externas do Google Fonts.
 * 3. window.htmlToImage e globalThis.htmlToImage fiquem disponíveis com funções seguras.
 */
import * as localHtmlToImage from 'html-to-image'

export type HtmlToImageOptions = Parameters<typeof localHtmlToImage.toPng>[1]

const defaultOptions: HtmlToImageOptions = {
  skipFonts: true,
}

export const toPng = (node: HTMLElement, options?: HtmlToImageOptions): Promise<string> => {
  return localHtmlToImage.toPng(node, { ...defaultOptions, ...options })
}

export const toJpeg = (node: HTMLElement, options?: HtmlToImageOptions): Promise<string> => {
  return localHtmlToImage.toJpeg(node, { ...defaultOptions, ...options })
}

export const toBlob = (node: HTMLElement, options?: HtmlToImageOptions): Promise<Blob | null> => {
  return localHtmlToImage.toBlob(node, { ...defaultOptions, ...options })
}

export const toPixelData = (
  node: HTMLElement,
  options?: HtmlToImageOptions,
): Promise<Uint8ClampedArray> => {
  return localHtmlToImage.toPixelData(node, { ...defaultOptions, ...options })
}

export const toSvg = (node: HTMLElement, options?: HtmlToImageOptions): Promise<string> => {
  return localHtmlToImage.toSvg(node, { ...defaultOptions, ...options })
}

export const toCanvas = (
  node: HTMLElement,
  options?: HtmlToImageOptions,
): Promise<HTMLCanvasElement> => {
  return localHtmlToImage.toCanvas(node, { ...defaultOptions, ...options })
}

export const getFontEmbedCSS = (
  node: HTMLElement,
  options?: HtmlToImageOptions,
): Promise<string> => {
  return localHtmlToImage.getFontEmbedCSS(node, { ...defaultOptions, ...options })
}

// Proteger CSSStyleSheet.prototype.cssRules contra SecurityError cross-origin
if (typeof window !== 'undefined') {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(CSSStyleSheet.prototype, 'cssRules')
    if (descriptor && descriptor.get) {
      const originalGet = descriptor.get
      Object.defineProperty(CSSStyleSheet.prototype, 'cssRules', {
        configurable: true,
        enumerable: true,
        get() {
          try {
            return originalGet.call(this)
          } catch {
            return [] as unknown as CSSRuleList
          }
        },
      })
    }
  } catch {
    // Silencioso se ambiente for restrito
  }

  const safeHtmlToImage = {
    ...localHtmlToImage,
    toPng,
    toJpeg,
    toBlob,
    toPixelData,
    toSvg,
    toCanvas,
    getFontEmbedCSS,
  }

  ;(window as unknown as { htmlToImage: typeof safeHtmlToImage }).htmlToImage = safeHtmlToImage
  ;(globalThis as unknown as { htmlToImage: typeof safeHtmlToImage }).htmlToImage = safeHtmlToImage
}

export default {
  toPng,
  toJpeg,
  toBlob,
  toPixelData,
  toSvg,
  toCanvas,
  getFontEmbedCSS,
}
