"use client"

import { useRef, useState, useTransition } from "react"
import { Download, FileUp, Loader2, Upload } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useRouterWithProgress } from "@/components/layout/navigation-progress"
import { applyResultsImport, previewResultsImport, type ImportPreview } from "@/lib/supabase/actions/school-results-import"
import { IMPORT_COLUMNS, SAMPLE_CSV } from "@/lib/schools/results-import"

/** How many problems are listed before "and N more". */
const SHOWN_PROBLEMS = 50

/** Offers the sample CSV as a file download. */
function downloadSample() {
  const url = URL.createObjectURL(new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8" }))
  const link = Object.assign(document.createElement("a"), { href: url, download: "school-exam-results-sample.csv" })
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Released a moment later: some browsers (Safari) drop a download whose file is released at once.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Import schools' published exam results from a CSV, in a side drawer:
 * download the sample, choose a file, see what it would add or update and
 * which lines have problems, then import.
 */
export function ResultsImportSheet({ trigger }: { trigger?: React.ReactNode }) {
  const router = useRouterWithProgress()
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<{ name: string; text: string } | null>(null)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isChecking, startChecking] = useTransition()
  const [isImporting, startImporting] = useTransition()

  const reset = () => { setFile(null); setPreview(null); setError(null); if (inputRef.current) inputRef.current.value = "" }

  const choose = async (picked: File | undefined) => {
    reset()
    if (!picked) return
    if (!/\.csv$/i.test(picked.name)) return setError("Choose a .csv file. In Excel or Google Sheets, use Save as or Download as CSV.")
    const text = await picked.text()
    setFile({ name: picked.name, text })
    startChecking(async () => {
      const result = await previewResultsImport(text)
      if (!result.success || !result.data) return setError(result.error ?? "Could not read the file.")
      setPreview(result.data)
    })
  }

  const importNow = () => {
    if (!file) return
    startImporting(async () => {
      const result = await applyResultsImport(file.text)
      if (!result.success || !result.data) return setError(result.error ?? "The import failed.")
      const { added, updated, skipped } = result.data
      toast.success(`Imported: ${added} added, ${updated} updated${skipped ? `, ${skipped} lines skipped` : ""}`)
      setOpen(false)
      reset()
      router.refresh()
    })
  }

  const ready = preview ? preview.toAdd + preview.toUpdate : 0

  return (
    <Sheet open={open} onOpenChange={next => { setOpen(next); if (!next) reset() }}>
      <SheetTrigger asChild>
        {trigger ?? <Button variant="outline" className="gap-2"><Upload className="h-4 w-4" /> Import exam results</Button>}
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="shrink-0 border-b px-6 py-4">
          <SheetTitle>Import exam results</SheetTitle>
          <SheetDescription>Schools&apos; published GCSE, A-level and other results, from a CSV file.</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5 text-sm">
          <section className="space-y-2">
            <h3 className="font-semibold">1. Prepare the file</h3>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li>One row per school, exam year, exam type and grade band (for example GCSE 9–7, or A Level A*–A).</li>
              <li>Columns: {IMPORT_COLUMNS.map((column, i) => <span key={column}>{i > 0 && ", "}<code className="text-foreground">{column}</code></span>)}.</li>
              <li><b className="text-foreground">Needed:</b> the school, <code>exam_year</code>, <code>exam_type</code>, <code>grade_from</code> and <code>result_percent</code>. <code>grade_to</code> and <code>remarks</code> are optional.</li>
              <li><b className="text-foreground">The school</b> is matched by its name as it appears in the CRM. Two schools share a name (Trinity School); for those, fill in <code>school_id</code> instead.</li>
              <li>A single top grade (A* only) leaves <code>grade_to</code> empty. An IB average diploma score leaves both grades empty.</li>
              <li><b className="text-foreground">Uploading the same result again updates it</b> (same school, year, exam type and grades); anything else is added.</li>
            </ul>
            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={downloadSample}>
              <Download className="h-4 w-4" /> Download sample CSV
            </Button>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">2. Choose the file</h3>
            <input ref={inputRef} type="file" accept=".csv,text/csv" className="sr-only" id="results-csv" aria-label="CSV file of exam results"
              onChange={event => void choose(event.target.files?.[0])} />
            <Button type="button" variant="outline" className="gap-2" onClick={() => inputRef.current?.click()} disabled={isChecking || isImporting}>
              <FileUp className="h-4 w-4" /> {file ? "Choose another file" : "Choose CSV file"}
            </Button>
            {file && <p className="text-muted-foreground">{file.name}</p>}
            {isChecking && <p className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Checking the file…</p>}
            {error && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-destructive">{error}</p>}
          </section>

          {preview && (
            <section className="space-y-3" aria-label="What the import will do">
              <h3 className="font-semibold">3. Check and import</h3>
              <p>
                <b>{preview.toAdd}</b> {preview.toAdd === 1 ? "result" : "results"} to add and <b>{preview.toUpdate}</b> to update,
                across {preview.schools} {preview.schools === 1 ? "school" : "schools"}.
                {preview.problems.length > 0 && <> <b className="text-destructive">{preview.problems.length}</b> {preview.problems.length === 1 ? "line has a problem and will be skipped" : "lines have problems and will be skipped"}.</>}
              </p>
              {preview.problems.length > 0 && (
                <ul className="max-h-64 space-y-1 overflow-y-auto rounded-md border p-3" aria-label="Lines with problems">
                  {preview.problems.slice(0, SHOWN_PROBLEMS).map(problem => (
                    <li key={problem.line}><span className="font-medium tabular-nums">Line {problem.line}:</span> {problem.message}</li>
                  ))}
                  {preview.problems.length > SHOWN_PROBLEMS && <li className="text-muted-foreground">and {preview.problems.length - SHOWN_PROBLEMS} more</li>}
                </ul>
              )}
            </section>
          )}
        </div>

        <div className="shrink-0 border-t bg-background px-6 py-3">
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isImporting}>Cancel</Button>
            <Button type="button" onClick={importNow} disabled={!preview || ready === 0 || isImporting || isChecking} className="gap-2">
              {isImporting && <Loader2 className="h-4 w-4 animate-spin" />}
              {preview ? `Import ${ready} ${ready === 1 ? "result" : "results"}` : "Import"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
