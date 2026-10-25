import { Extension } from '@tiptap/core'

export interface LineHeightOptions {
  types: string[]
  defaultLineHeight: string
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    lineHeight: {
      setLineHeight: (lineHeight: string) => ReturnType
      unsetLineHeight: () => ReturnType
    }
  }
}

export const LineHeight = Extension.create<LineHeightOptions>({
  name: 'lineHeight',

  addOptions() {
    return {
      types: ['paragraph', 'heading'],
      defaultLineHeight: 'normal',
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element) => element.style.lineHeight || null,
            renderHTML: (attributes) => {
              if (!attributes.lineHeight || attributes.lineHeight === 'normal') {
                return {}
              }
              return {
                style: `line-height: ${attributes.lineHeight};`,
              }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      setLineHeight:
        (lineHeight: string) =>
        ({ commands }: any) => {
          return this.options.types.every((type) => commands.updateAttributes(type, { lineHeight }))
        },
      unsetLineHeight:
        () =>
        ({ commands }: any) => {
          return this.options.types.every((type) => commands.resetAttributes(type, 'lineHeight'))
        },
    }
  },
})
