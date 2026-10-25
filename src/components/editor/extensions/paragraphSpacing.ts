import { Extension } from '@tiptap/core'

export interface ParagraphSpacingOptions {
  types: string[]
  defaultMarginBottom: string
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    paragraphSpacing: {
      setParagraphSpacing: (marginBottom: string) => ReturnType
      unsetParagraphSpacing: () => ReturnType
    }
  }
}

export const ParagraphSpacing = Extension.create<ParagraphSpacingOptions>({
  name: 'paragraphSpacing',

  addOptions() {
    return {
      types: ['paragraph', 'heading'],
      defaultMarginBottom: 'normal',
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          marginBottom: {
            default: null,
            parseHTML: (element) => element.style.marginBottom || null,
            renderHTML: (attributes) => {
              if (!attributes.marginBottom || attributes.marginBottom === 'normal') {
                return {}
              }
              return {
                style: `margin-bottom: ${attributes.marginBottom};`,
              }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      setParagraphSpacing:
        (marginBottom: string) =>
        ({ commands }: any) => {
          return this.options.types.every((type) =>
            commands.updateAttributes(type, { marginBottom }),
          )
        },
      unsetParagraphSpacing:
        () =>
        ({ commands }: any) => {
          return this.options.types.every((type) => commands.resetAttributes(type, 'marginBottom'))
        },
    }
  },
})
