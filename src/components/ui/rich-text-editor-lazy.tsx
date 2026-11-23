"use client"

import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * The rich text editor, downloaded only when a form that uses it opens. Tiptap
 * and ProseMirror are large, and the student page would otherwise ship them to
 * everyone who only reads the profile.
 */
export const RichTextEditor = dynamic(
  () => import("@/components/ui/rich-text-editor").then(m => m.RichTextEditor),
  { ssr: false, loading: () => <Skeleton className="h-48 w-full" /> },
)
