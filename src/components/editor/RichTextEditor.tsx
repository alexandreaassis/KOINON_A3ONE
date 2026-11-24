import React, { useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import TextAlign from '@tiptap/extension-text-align'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import FontFamily from '@tiptap/extension-font-family'
import { Indent } from './extensions/indent'
import { LineHeight } from './extensions/lineHeight'
import { ParagraphSpacing } from './extensions/paragraphSpacing'
import { FontSize } from './extensions/fontSize'
import { sanitizeHtml, normalizarConteudoParaHtml } from '@/lib/sanitizeHtml'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Indent as IndentIcon,
  Outdent as OutdentIcon,
  Undo2,
  Redo2,
  Highlighter,
  Baseline,
  ChevronDown,
  RotateCcw,
} from 'lucide-react'

export interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: string
  className?: string
  readOnly?: boolean
}

const FONT_FAMILIES = [
  { label: 'Aptos', value: '"Aptos", "Archivo", Georgia, sans-serif' },
  { label: 'Padrão (Serif)', value: 'Georgia, Cambria, serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Arial (Sans)', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Inter / Segoe UI', value: 'Inter, -apple-system, "Segoe UI", sans-serif' },
  { label: 'Courier (Monospace)', value: '"Courier New", Courier, monospace' },
  { label: 'Garamond', value: 'Garamond, "EB Garamond", serif' },
]

const FONT_SIZES = [
  { label: '9 pt', value: '9pt' },
  { label: '10 pt', value: '10pt' },
  { label: '11 pt (Padrão)', value: '11pt' },
  { label: '12 pt', value: '12pt' },
  { label: '13 pt', value: '13pt' },
  { label: '14 pt', value: '14pt' },
  { label: '16 pt', value: '16pt' },
  { label: '18 pt', value: '18pt' },
]

const LINE_HEIGHTS = [
  { label: '1.0 (Simples)', value: '1.0' },
  { label: '1.15', value: '1.15' },
  { label: '1.3', value: '1.3' },
  { label: '1.5 (Padrão)', value: '1.5' },
  { label: '1.75', value: '1.75' },
  { label: '2.0 (Duplo)', value: '2.0' },
]

const PARAGRAPH_SPACINGS = [
  { label: 'Compacto (0px)', value: '0px' },
  { label: 'Pequeno (4px)', value: '4px' },
  { label: 'Médio (8px - Padrão)', value: '8px' },
  { label: 'Amplo (12px)', value: '12px' },
  { label: 'Largo (16px)', value: '16px' },
]

const TEXT_COLORS = [
  { label: 'Automático / Preto', value: '#0f172a' },
  { label: 'Cinza Escuro', value: '#334155' },
  { label: 'Cinza Médio', value: '#64748b' },
  { label: 'Azul Petróleo', value: '#0369a1' },
  { label: 'Azul Escuro', value: '#1e3a8a' },
  { label: 'Verde Bandeira', value: '#047857' },
  { label: 'Vermelho / Alerta', value: '#b91c1c' },
  { label: 'Dourado / Âmbar', value: '#b45309' },
]

const HIGHLIGHT_COLORS = [
  { label: 'Nenhum (Sem realce)', value: '' },
  { label: 'Amarelo Suave', value: '#fef08a' },
  { label: 'Verde Claro', value: '#bbf7d0' },
  { label: 'Azul Celeste', value: '#bae6fd' },
  { label: 'Laranja Suave', value: '#fed7aa' },
  { label: 'Rosa Claro', value: '#fbcfe8' },
  { label: 'Cinza Neutro', value: '#e2e8f0' },
]

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Digite o texto...',
  minHeight = '140px',
  className = '',
  readOnly = false,
}) => {
  const isUpdatingFromPropRef = useRef(false)
  const [corTextoAberta, setCorTextoAberta] = useState(false)
  const [realceAberto, setRealceAberto] = useState(false)

  const editor = useEditor({
    immediatelyRender: false,
    editable: !readOnly,
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }) as any,
      Underline as any,
      Subscript as any,
      Superscript as any,
      TextStyle as any,
      Color as any,
      Highlight.configure({ multicolor: true }) as any,
      FontFamily.configure({
        types: ['textStyle'],
      }) as any,
      FontSize as any,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
        defaultAlignment: 'justify',
      }) as any,
      Indent as any,
      LineHeight as any,
      ParagraphSpacing as any,
    ],
    content: normalizarConteudoParaHtml(value),
    onUpdate: ({ editor: currentEditor }) => {
      if (isUpdatingFromPropRef.current) return
      const rawHtml = currentEditor.getHTML()
      // Se estiver vazio (apenas <p></p>), retornar string vazia
      if (rawHtml === '<p></p>' || rawHtml === '<p><br></p>') {
        onChange('')
        return
      }
      const cleanHtml = sanitizeHtml(rawHtml)
      onChange(cleanHtml)
    },
  })

  // Sincronizar valor recebido via props se for alterado externamente
  useEffect(() => {
    if (!editor) return
    const currentHtml = editor.getHTML()
    const targetHtml = normalizarConteudoParaHtml(value)

    if (currentHtml !== targetHtml && value !== currentHtml) {
      isUpdatingFromPropRef.current = true
      editor.commands.setContent(targetHtml || '<p></p>', false)
      setTimeout(() => {
        isUpdatingFromPropRef.current = false
      }, 0)
    }
  }, [value, editor])

  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly)
    }
  }, [readOnly, editor])

  if (!editor) {
    return (
      <div
        className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-400"
        style={{ minHeight }}
      >
        Carregando editor de texto formatado...
      </div>
    )
  }

  return (
    <div
      className={`rounded-md border border-slate-300 bg-white shadow-sm overflow-hidden flex flex-col focus-within:border-cyan-600 focus-within:ring-1 focus-within:ring-cyan-600 ${className}`}
    >
      {/* Barra de Ferramentas Rica */}
      {!readOnly && (
        <div className="bg-slate-50 border-b border-slate-200 p-1 flex flex-wrap items-center gap-0.5 text-slate-700">
          {/* Grupo 1: Desfazer / Refazer */}
          <div className="flex items-center gap-0.5 pr-1 border-r border-slate-200">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              title="Desfazer (Ctrl+Z)"
              onClick={() => (editor.chain().focus() as any).undo().run()}
              disabled={!(editor.can() as any).undo()}
              className="h-7 w-7 p-0 text-slate-700 hover:bg-slate-200 disabled:opacity-30"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              title="Refazer (Ctrl+Y)"
              onClick={() => (editor.chain().focus() as any).redo().run()}
              disabled={!(editor.can() as any).redo()}
              className="h-7 w-7 p-0 text-slate-700 hover:bg-slate-200 disabled:opacity-30"
            >
              <Redo2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Grupo 2: Fonte e Tamanho */}
          <div className="flex items-center gap-1 px-1 border-r border-slate-200">
            {/* Seletor de Família de Fonte */}
            <select
              aria-label="Família da fonte"
              className="h-7 text-[11px] bg-white border border-slate-300 rounded px-1.5 py-0 text-slate-700 hover:border-slate-400 focus:outline-none focus:border-cyan-600"
              onChange={(e) => {
                const val = e.target.value
                if (val) {
                  ;(editor.chain().focus() as any).setFontFamily(val).run()
                } else {
                  ;(editor.chain().focus() as any).unsetFontFamily().run()
                }
              }}
              value={editor.getAttributes('textStyle').fontFamily || ''}
            >
              <option value="">Fonte: Padrão</option>
              {FONT_FAMILIES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>

            {/* Seletor de Tamanho de Fonte */}
            <select
              aria-label="Tamanho da fonte"
              className="h-7 text-[11px] bg-white border border-slate-300 rounded px-1.5 py-0 text-slate-700 hover:border-slate-400 focus:outline-none focus:border-cyan-600"
              onChange={(e) => {
                const val = e.target.value
                if (val) {
                  ;(editor.chain().focus() as any).setFontSize(val).run()
                } else {
                  ;(editor.chain().focus() as any).unsetFontSize().run()
                }
              }}
              value={editor.getAttributes('textStyle').fontSize || ''}
            >
              <option value="">Tam: Padrão</option>
              {FONT_SIZES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Grupo 3: Estilos Básicos (Negrito, Itálico, Sublinhado, Subscrito, Sobrescrito) */}
          <div className="flex items-center gap-0.5 px-1 border-r border-slate-200">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              title="Negrito (Ctrl+B)"
              onClick={() => (editor.chain().focus() as any).toggleBold().run()}
              className={`h-7 w-7 p-0 ${
                editor.isActive('bold')
                  ? 'bg-cyan-100 text-cyan-900 font-bold border border-cyan-300'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Bold className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              title="Itálico (Ctrl+I)"
              onClick={() => (editor.chain().focus() as any).toggleItalic().run()}
              className={`h-7 w-7 p-0 ${
                editor.isActive('italic')
                  ? 'bg-cyan-100 text-cyan-900 border border-cyan-300'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Italic className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              title="Sublinhado (Ctrl+U)"
              onClick={() => (editor.chain().focus() as any).toggleUnderline().run()}
              className={`h-7 w-7 p-0 ${
                editor.isActive('underline')
                  ? 'bg-cyan-100 text-cyan-900 border border-cyan-300'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              <UnderlineIcon className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              title="Subscrito (H₂O)"
              onClick={() => (editor.chain().focus() as any).toggleSubscript().run()}
              className={`h-7 w-7 p-0 ${
                editor.isActive('subscript')
                  ? 'bg-cyan-100 text-cyan-900 border border-cyan-300'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              <SubscriptIcon className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              title="Sobrescrito (X²)"
              onClick={() => (editor.chain().focus() as any).toggleSuperscript().run()}
              className={`h-7 w-7 p-0 ${
                editor.isActive('superscript')
                  ? 'bg-cyan-100 text-cyan-900 border border-cyan-300'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              <SuperscriptIcon className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Grupo 4: Cores (Cor da Fonte e Realce) */}
          <div className="flex items-center gap-0.5 px-1 border-r border-slate-200">
            {/* Popover Cor do Texto */}
            <Popover open={corTextoAberta} onOpenChange={setCorTextoAberta}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  title="Cor da Fonte"
                  className="h-7 px-1.5 flex items-center gap-1 text-slate-700 hover:bg-slate-200"
                >
                  <Baseline className="h-3.5 w-3.5" />
                  <span
                    className="w-3 h-1 rounded-sm border border-slate-400"
                    style={{
                      backgroundColor: editor.getAttributes('textStyle').color || '#0f172a',
                    }}
                  />
                  <ChevronDown className="h-2.5 w-2.5 opacity-60" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2 text-xs space-y-1.5" align="start">
                <div className="font-semibold text-slate-700 pb-1 border-b border-slate-100">
                  Cor da Fonte
                </div>
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {TEXT_COLORS.map((cor) => (
                    <button
                      key={cor.value}
                      type="button"
                      title={cor.label}
                      onClick={() => {
                        ;(editor.chain().focus() as any).setColor(cor.value).run()
                        setCorTextoAberta(false)
                      }}
                      className="h-6 w-6 rounded border border-slate-300 hover:scale-110 transition-transform shadow-xs flex items-center justify-center"
                      style={{ backgroundColor: cor.value }}
                    />
                  ))}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    ;(editor.chain().focus() as any).unsetColor().run()
                    setCorTextoAberta(false)
                  }}
                  className="w-full text-[11px] h-6 mt-1 text-slate-600 hover:bg-slate-100"
                >
                  <RotateCcw className="h-3 w-3 mr-1" /> Restaurar Padrão
                </Button>
              </PopoverContent>
            </Popover>

            {/* Popover Realce / Highlight */}
            <Popover open={realceAberto} onOpenChange={setRealceAberto}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  title="Cor de Realce (Highlight)"
                  className={`h-7 px-1.5 flex items-center gap-1 ${
                    editor.isActive('highlight')
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Highlighter className="h-3.5 w-3.5" />
                  <ChevronDown className="h-2.5 w-2.5 opacity-60" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2 text-xs space-y-1.5" align="start">
                <div className="font-semibold text-slate-700 pb-1 border-b border-slate-100">
                  Realce do Texto
                </div>
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  {HIGHLIGHT_COLORS.filter((h) => h.value).map((h) => (
                    <button
                      key={h.value}
                      type="button"
                      title={h.label}
                      onClick={() => {
                        ;(editor.chain().focus() as any).setHighlight({ color: h.value }).run()
                        setRealceAberto(false)
                      }}
                      className="h-6 rounded border border-slate-300 hover:scale-105 transition-transform text-[10px] font-medium"
                      style={{ backgroundColor: h.value }}
                    />
                  ))}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    ;(editor.chain().focus() as any).unsetHighlight().run()
                    setRealceAberto(false)
                  }}
                  className="w-full text-[11px] h-6 mt-1 text-slate-600 hover:bg-slate-100"
                >
                  <RotateCcw className="h-3 w-3 mr-1" /> Sem Realce
                </Button>
              </PopoverContent>
            </Popover>
          </div>

          {/* Grupo 5: Alinhamento de Texto */}
          <div className="flex items-center gap-0.5 px-1 border-r border-slate-200">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              title="Alinhar à Esquerda"
              onClick={() => (editor.chain().focus() as any).setTextAlign('left').run()}
              className={`h-7 w-7 p-0 ${
                editor.isActive({ textAlign: 'left' })
                  ? 'bg-cyan-100 text-cyan-900 border border-cyan-300'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              <AlignLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              title="Centralizar"
              onClick={() => (editor.chain().focus() as any).setTextAlign('center').run()}
              className={`h-7 w-7 p-0 ${
                editor.isActive({ textAlign: 'center' })
                  ? 'bg-cyan-100 text-cyan-900 border border-cyan-300'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              <AlignCenter className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              title="Alinhar à Direita"
              onClick={() => (editor.chain().focus() as any).setTextAlign('right').run()}
              className={`h-7 w-7 p-0 ${
                editor.isActive({ textAlign: 'right' })
                  ? 'bg-cyan-100 text-cyan-900 border border-cyan-300'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              <AlignRight className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              title="Justificar"
              onClick={() => (editor.chain().focus() as any).setTextAlign('justify').run()}
              className={`h-7 w-7 p-0 ${
                editor.isActive({ textAlign: 'justify' })
                  ? 'bg-cyan-100 text-cyan-900 border border-cyan-300'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              <AlignJustify className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Grupo 6: Listas (Marcadores e Numeração) */}
          <div className="flex items-center gap-0.5 px-1 border-r border-slate-200">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              title="Lista com Marcadores"
              onClick={() => (editor.chain().focus() as any).toggleBulletList().run()}
              className={`h-7 w-7 p-0 ${
                editor.isActive('bulletList')
                  ? 'bg-cyan-100 text-cyan-900 border border-cyan-300'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              <List className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              title="Lista Numerada"
              onClick={() => (editor.chain().focus() as any).toggleOrderedList().run()}
              className={`h-7 w-7 p-0 ${
                editor.isActive('orderedList')
                  ? 'bg-cyan-100 text-cyan-900 border border-cyan-300'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              <ListOrdered className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Grupo 7: Recuo (Diminuir / Aumentar Recuo) */}
          <div className="flex items-center gap-0.5 px-1 border-r border-slate-200">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              title="Diminuir Recuo"
              onClick={() => (editor.chain().focus() as any).outdent().run()}
              className="h-7 w-7 p-0 text-slate-700 hover:bg-slate-200"
            >
              <OutdentIcon className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              title="Aumentar Recuo"
              onClick={() => (editor.chain().focus() as any).indent().run()}
              className="h-7 w-7 p-0 text-slate-700 hover:bg-slate-200"
            >
              <IndentIcon className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Grupo 8: Espaçamentos (Linha e Parágrafo) */}
          <div className="flex items-center gap-1 pl-1">
            {/* Espaçamento de Linha */}
            <select
              aria-label="Espaçamento entre linhas"
              className="h-7 text-[11px] bg-white border border-slate-300 rounded px-1.5 py-0 text-slate-700 hover:border-slate-400 focus:outline-none focus:border-cyan-600"
              onChange={(e) => {
                const val = e.target.value
                if (val) {
                  ;(editor.chain().focus() as any).setLineHeight(val).run()
                } else {
                  ;(editor.chain().focus() as any).unsetLineHeight().run()
                }
              }}
              value={editor.getAttributes('paragraph').lineHeight || ''}
            >
              <option value="">Linhas: Padrão (1.5)</option>
              {LINE_HEIGHTS.map((lh) => (
                <option key={lh.value} value={lh.value}>
                  {lh.label}
                </option>
              ))}
            </select>

            {/* Espaçamento entre Parágrafos */}
            <select
              aria-label="Espaçamento entre parágrafos"
              className="h-7 text-[11px] bg-white border border-slate-300 rounded px-1.5 py-0 text-slate-700 hover:border-slate-400 focus:outline-none focus:border-cyan-600"
              onChange={(e) => {
                const val = e.target.value
                if (val) {
                  ;(editor.chain().focus() as any).setParagraphSpacing(val).run()
                } else {
                  ;(editor.chain().focus() as any).unsetParagraphSpacing().run()
                }
              }}
              value={editor.getAttributes('paragraph').marginBottom || ''}
            >
              <option value="">Parágrafos: Padrão (8px)</option>
              {PARAGRAPH_SPACINGS.map((ps) => (
                <option key={ps.value} value={ps.value}>
                  {ps.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Área Editável do Documento */}
      <div
        className="p-3 text-xs leading-relaxed text-slate-900 overflow-y-auto cursor-text bg-white rich-editor-content"
        style={{ minHeight }}
        onClick={() => {
          if (!editor.isFocused && !readOnly) {
            editor.commands.focus()
          }
        }}
      >
        <EditorContent editor={editor} />
        {!editor.getText().trim() && (
          <div className="pointer-events-none -mt-4 text-slate-400 text-xs italic select-none">
            {placeholder}
          </div>
        )}
      </div>
    </div>
  )
}
export default RichTextEditor
