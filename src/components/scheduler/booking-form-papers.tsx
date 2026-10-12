'use client'

import { useEffect, useState } from 'react'
import { useWatch } from 'react-hook-form'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { filterPaperOptions, paperFilterOptions, toSnapshotPaper, totalPaperMinutes } from '@/lib/exams/exam-paper-selection'
import { MAX_SNAPSHOT_PAPERS, labelAfterPaperChange } from '@/lib/scheduler/assessment-snapshot'
import { getSchoolExamPaperOptionsAction } from '@/lib/supabase/actions/exam-papers'
import type { ExamPaperOption } from '@/lib/supabase/queries/exam-papers'
import type { BookingForm } from './booking-dialog'

/** Stands for "no selection": a Radix Select cannot hold an empty string value. */
const ALL = '__all__'

/**
 * Lets the person booking an examination choose which of the school's entrance
 * exam papers the student sits. Only the format is shown here (subject, year
 * level, duration); the paper files themselves stay with the examination team.
 */
export function BookingFormPapers({ form }: { form: BookingForm }) {
  const schoolId = useWatch({ control: form.control, name: 'school_id' })
  const snapshot = useWatch({ control: form.control, name: 'assessment_snapshot' })
  const chosen = snapshot?.papers ?? []

  const [loaded, setLoaded] = useState<{ schoolId: string; options: ExamPaperOption[]; failed: boolean } | null>(null)
  const [entryYear, setEntryYear] = useState<string | null>(null)
  const [yearLevel, setYearLevel] = useState<string | null>(null)

  useEffect(() => {
    if (!schoolId) return
    let cancelled = false
    getSchoolExamPaperOptionsAction(schoolId).then(result => {
      if (cancelled) return
      const options = result.success ? result.data ?? [] : []
      setLoaded({ schoolId, options, failed: !result.success })
      // A school can hold years of papers, so the list opens on the newest entry year.
      setEntryYear(paperFilterOptions(options).entryYears[0] ?? null)
      setYearLevel(null)
    })
    return () => {
      cancelled = true
    }
  }, [schoolId])

  if (!schoolId) return <p className="text-sm text-muted-foreground">Choose the application first to pick the papers.</p>
  if (loaded?.schoolId !== schoolId) return <p className="text-sm text-muted-foreground">Loading the school&apos;s papers…</p>
  // A failed load must not read like a school without papers, or someone books an exam without them.
  if (loaded.failed) return <p className="text-sm text-destructive">The school&apos;s papers could not be loaded. Close this window and open it again.</p>
  if (loaded.options.length === 0) return <p className="text-sm text-muted-foreground">No entrance exams are recorded for this school.</p>

  const { entryYears, yearLevels } = paperFilterOptions(loaded.options)
  const visible = filterPaperOptions(loaded.options, entryYear, yearLevel)
  const minutes = totalPaperMinutes(chosen)
  const isFull = chosen.length >= MAX_SNAPSHOT_PAPERS

  const setPapers = (papers: typeof chosen) => {
    const label = labelAfterPaperChange(snapshot?.label, chosen)
    form.setValue(
      'assessment_snapshot',
      { label, version: snapshot?.version ?? null, notes: snapshot?.notes ?? null, papers },
      { shouldDirty: true },
    )
    // Written to the text box's own field as well, so the box on screen is sure to show the cleared label.
    form.setValue('assessment_snapshot.label', label)
  }

  const toggle = (option: ExamPaperOption) => {
    setPapers(chosen.some(paper => paper.id === option.id)
      ? chosen.filter(paper => paper.id !== option.id)
      : [...chosen, toSnapshotPaper(option)])
  }

  const filter = (value: string | null, onChange: (v: string | null) => void, allLabel: string, list: string[]) => (
    <Select value={value ?? ALL} onValueChange={v => onChange(v === ALL ? null : v)}>
      <SelectTrigger size="sm" className="w-[160px]" aria-label={allLabel}><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {list.map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}
      </SelectContent>
    </Select>
  )

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {filter(entryYear, setEntryYear, 'All entry years', entryYears)}
        {filter(yearLevel, setYearLevel, 'All year levels', yearLevels)}
      </div>

      <ul className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border p-2">
        {visible.length === 0 && <li className="text-sm text-muted-foreground">No papers match these filters.</li>}
        {visible.map(option => {
          const checked = chosen.some(paper => paper.id === option.id)
          return (
            <li key={option.id} className="flex items-center gap-2">
              <Checkbox id={`paper-${option.id}`} checked={checked} disabled={!checked && isFull} onCheckedChange={() => toggle(option)} />
              <Label htmlFor={`paper-${option.id}`} className="flex flex-1 flex-wrap items-center gap-x-2 text-sm font-normal">
                <span className="font-medium">{option.subject || 'Paper'}</span>
                <span className="text-muted-foreground tabular-nums">
                  {[option.year_level, option.duration_minutes ? `${option.duration_minutes} min` : null].filter(Boolean).join(' · ')}
                </span>
                {option.paper_request_from_school && <Badge variant="outline" className="text-[10px]">Request from school</Badge>}
              </Label>
            </li>
          )
        })}
      </ul>

      {/* Chosen papers stay listed here whatever the filters show, so each can always be removed. */}
      {chosen.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {chosen.map(paper => (
            <li key={paper.id}>
              <Badge variant="secondary" className="gap-1 pr-1">
                {[paper.subject, paper.year_level].filter(Boolean).join(' · ')}
                <button
                  type="button"
                  aria-label={`Remove ${paper.subject}`}
                  className="rounded-sm p-0.5 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => setPapers(chosen.filter(p => p.id !== paper.id))}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground tabular-nums">
        {chosen.length === 0 ? 'No papers chosen yet.' : `${chosen.length} chosen${minutes ? ` · ${minutes} min in total` : ''}`}
        {isFull && ` · at most ${MAX_SNAPSHOT_PAPERS} papers per booking`}
      </p>
    </div>
  )
}
