"use client"

import { DocumentManager } from "@/components/features/document-manager"
import {
  uploadSchoolDocuments, renameSchoolDocument,
  deleteSchoolDocument, getSchoolDocumentSignedUrl,
} from "@/lib/supabase/actions/school-documents"
import type { SchoolDocumentRecord } from "@/lib/supabase/queries/school-documents"

/** School document manager — thin wrapper over the shared DocumentManager. */
export function SchoolDocumentsSection({
  schoolId, documents,
}: {
  schoolId: string
  documents: SchoolDocumentRecord[]
}) {
  return (
    <DocumentManager
      ownerId={schoolId}
      documents={documents}
      categorySections={["school", "other"]}
      uploadAction={uploadSchoolDocuments}
      renameAction={renameSchoolDocument}
      deleteAction={deleteSchoolDocument}
      signedUrlAction={getSchoolDocumentSignedUrl}
      getFilePath={(doc) => (doc as SchoolDocumentRecord).file_path}
    />
  )
}
