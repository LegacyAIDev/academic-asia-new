"use client"

import { DocumentManager } from "@/components/features/document-manager"
import {
  uploadSchoolDocuments, renameSchoolDocument,
  deleteSchoolDocument, getSchoolDocumentSignedUrl,
} from "@/lib/supabase/actions/school-documents"
import type { SchoolDocumentRecord } from "@/lib/supabase/queries/school-documents"
import { EXAM_PAPER_CATEGORY_CODE } from "@/lib/attachments/exam-paper-access"

// Exam papers are added on their entrance exam, never here.
const HIDDEN_CATEGORIES = [EXAM_PAPER_CATEGORY_CODE]

/** School document manager — thin wrapper over the shared DocumentManager. */
export function SchoolDocumentsSection({
  schoolId, documents, canWrite = true,
}: {
  schoolId: string
  documents: SchoolDocumentRecord[]
  canWrite?: boolean
}) {
  return (
    <DocumentManager
      ownerId={schoolId}
      documents={documents}
      categorySections={["school", "other"]}
      hiddenCategoryCodes={HIDDEN_CATEGORIES}
      uploadAction={uploadSchoolDocuments}
      renameAction={renameSchoolDocument}
      deleteAction={deleteSchoolDocument}
      signedUrlAction={getSchoolDocumentSignedUrl}
      getFilePath={(doc) => (doc as SchoolDocumentRecord).file_path}
      canWrite={canWrite}
    />
  )
}
