"use client"

import type { DocumentCategory } from "@/lib/supabase/queries/cached-lists"
import { DocumentManager } from "@/components/features/document-manager"
import {
  uploadStudentDocuments, renameStudentDocument,
  deleteStudentDocument, getDocumentSignedUrl,
} from "@/lib/supabase/actions/student-documents"
import type { StudentDocumentRecord } from "@/lib/supabase/queries/student-resume-profile"

/** Student document manager — thin wrapper over the shared DocumentManager. */
export function StudentDocumentsSection({
  studentId, documents, categories, canWrite,
}: {
  studentId: string
  documents: StudentDocumentRecord[]
  /** Read-only staff can download only. */
  categories: DocumentCategory[]
  canWrite: boolean
}) {
  return (
    <DocumentManager
      categories={categories}
      ownerId={studentId}
      documents={documents}
      categorySections={["resume", "legal_documents", "other", "documents"]}
      uploadAction={uploadStudentDocuments}
      renameAction={renameStudentDocument}
      deleteAction={deleteStudentDocument}
      signedUrlAction={getDocumentSignedUrl}
      getFilePath={(doc) => (doc as StudentDocumentRecord).file_path}
      canWrite={canWrite}
    />
  )
}
