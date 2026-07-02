'use client'

import { useRef, useState } from 'react'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold, Italic, Strikethrough, List, ListOrdered, Heading2,
  Link2, Link2Off, ImageIcon, Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { uploadIntroImage } from '@/lib/supabase/actions/student-intro-images'

type RichTextEditorProps = {
  value: string
  onChange: (html: string) => void
  studentId: string
  placeholder?: string
  className?: string
}

/**
 * Tiptap-based rich text editor (bold/italic/lists/headings, links and inline
 * image upload). Emits HTML via onChange. Images upload to the public intro
 * bucket so their URLs stay valid in-app and in emails to schools.
 */
export function RichTextEditor({
  value, onChange, studentId, placeholder, className,
}: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      // Disable StarterKit's bundled link so our configured Link is the only one
      StarterKit.configure({ link: false }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
      Image.configure({ HTMLAttributes: { class: 'rounded-md' } }),
      Placeholder.configure({ placeholder: placeholder ?? 'Write here…' }),
    ],
    content: value,
    editorProps: {
      attributes: { class: 'rich-content min-h-[220px] px-3 py-2.5 focus:outline-none' },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

  if (!editor) return null

  const setLink = () => {
    const previous = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('Link URL', previous ?? 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  const handleImageFile = async (file: File) => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const result = await uploadIntroImage(studentId, fd)
      if (result.success && result.data) {
        editor.chain().focus().setImage({ src: result.data.url }).run()
      } else {
        window.alert(result.error ?? 'Image upload failed')
      }
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className={cn('rounded-lg border border-border bg-background', className)}>
      <Toolbar
        editor={editor}
        uploading={uploading}
        onLink={setLink}
        onImage={() => fileInputRef.current?.click()}
      />
      <EditorContent editor={editor} />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleImageFile(file)
        }}
      />
    </div>
  )
}

function Toolbar({
  editor, uploading, onLink, onImage,
}: {
  editor: Editor
  uploading: boolean
  onLink: () => void
  onImage: () => void
}) {
  const btn = (active: boolean) =>
    cn('h-8 w-8 p-0', active && 'bg-muted text-foreground')

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border p-1.5">
      <Button type="button" variant="ghost" size="sm" className={btn(editor.isActive('bold'))}
        onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
        <Bold className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="sm" className={btn(editor.isActive('italic'))}
        onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
        <Italic className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="sm" className={btn(editor.isActive('strike'))}
        onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough">
        <Strikethrough className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="sm" className={btn(editor.isActive('heading', { level: 2 }))}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading">
        <Heading2 className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="sm" className={btn(editor.isActive('bulletList'))}
        onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list">
        <List className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="sm" className={btn(editor.isActive('orderedList'))}
        onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list">
        <ListOrdered className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="sm" className={btn(editor.isActive('link'))}
        onClick={onLink} title="Add link">
        <Link2 className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0"
        onClick={() => editor.chain().focus().unsetLink().run()} disabled={!editor.isActive('link')} title="Remove link">
        <Link2Off className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0"
        onClick={onImage} disabled={uploading} title="Insert image">
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
      </Button>
    </div>
  )
}
