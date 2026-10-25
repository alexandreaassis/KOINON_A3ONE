import { Extension } from '@tiptap/core'
import { TextSelection, AllSelection } from 'prosemirror-state'
import type { Node as ProseMirrorNode } from 'prosemirror-model'

export interface IndentOptions {
  types: string[]
  minIndent: number
  maxIndent: number
  step: number
  unit: string
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    indent: {
      indent: () => ReturnType
      outdent: () => ReturnType
    }
  }
}

function clamp(val: number, min: number, max: number): number {
  if (val < min) return min
  if (val > max) return max
  return val
}

function isListNode(node: ProseMirrorNode): boolean {
  return (
    node.type.name === 'bulletList' ||
    node.type.name === 'orderedList' ||
    node.type.name === 'bullet_list' ||
    node.type.name === 'order_list'
  )
}

export const Indent = Extension.create<IndentOptions>({
  name: 'indent',

  addOptions() {
    return {
      types: ['paragraph', 'heading', 'listItem'],
      minIndent: 0,
      maxIndent: 160,
      step: 20,
      unit: 'px',
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) => {
              const ml = element.style.marginLeft || element.style.paddingLeft
              if (!ml) return 0
              const parsed = parseInt(ml, 10)
              return Number.isNaN(parsed) ? 0 : parsed
            },
            renderHTML: (attributes) => {
              const val = attributes.indent
              if (!val || val <= 0) return {}
              return {
                style: `margin-left: ${val}px;`,
              }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      indent:
        () =>
        ({ tr, state, dispatch }: any) => {
          const { selection } = state
          if (!(selection instanceof TextSelection || selection instanceof AllSelection)) {
            return false
          }

          const { from, to } = selection
          let modified = false

          tr.doc.nodesBetween(from, to, (node: ProseMirrorNode, pos: number) => {
            if (this.options.types.includes(node.type.name)) {
              const currentIndent = (node.attrs.indent as number) || 0
              const nextIndent = clamp(
                currentIndent + this.options.step,
                this.options.minIndent,
                this.options.maxIndent,
              )
              if (nextIndent !== currentIndent) {
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  indent: nextIndent,
                })
                modified = true
              }
              return false
            }
            if (isListNode(node)) return true
            return true
          })

          if (modified && dispatch) {
            dispatch(tr)
            return true
          }
          return false
        },

      outdent:
        () =>
        ({ tr, state, dispatch }: any) => {
          const { selection } = state
          if (!(selection instanceof TextSelection || selection instanceof AllSelection)) {
            return false
          }

          const { from, to } = selection
          let modified = false

          tr.doc.nodesBetween(from, to, (node: ProseMirrorNode, pos: number) => {
            if (this.options.types.includes(node.type.name)) {
              const currentIndent = (node.attrs.indent as number) || 0
              const nextIndent = clamp(
                currentIndent - this.options.step,
                this.options.minIndent,
                this.options.maxIndent,
              )
              if (nextIndent !== currentIndent) {
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  indent: nextIndent,
                })
                modified = true
              }
              return false
            }
            if (isListNode(node)) return true
            return true
          })

          if (modified && dispatch) {
            dispatch(tr)
            return true
          }
          return false
        },
    }
  },

  addKeyboardShortcuts() {
    return {
      Tab: () => {
        if (this.editor.isActive('bulletList') || this.editor.isActive('orderedList')) {
          return false
        }
        return this.editor.commands.indent()
      },
      'Shift-Tab': () => {
        if (this.editor.isActive('bulletList') || this.editor.isActive('orderedList')) {
          return false
        }
        return this.editor.commands.outdent()
      },
    }
  },
})
