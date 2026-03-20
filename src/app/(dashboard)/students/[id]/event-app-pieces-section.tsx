"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Trash2, Music } from "lucide-react"

export type PieceEntry = { piece: string; composer: string }

type Props = {
  pieces: PieceEntry[]
  onChange: (pieces: PieceEntry[]) => void
}

const inputStyles = "h-9 bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 text-sm"

/** Repeatable piece/composer inputs for music audition events */
export function EventAppPiecesSection({ pieces, onChange }: Props) {
  const addPiece = () => onChange([...pieces, { piece: "", composer: "" }])

  const removePiece = (index: number) => onChange(pieces.filter((_, i) => i !== index))

  const updatePiece = (index: number, field: keyof PieceEntry, value: string) => {
    const updated = [...pieces]
    updated[index] = { ...updated[index], [field]: value }
    onChange(updated)
  }

  return (
    <div className="group">
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500/20 to-pink-500/5 text-pink-600">
              <Music className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold text-foreground">Pieces</span>
          </div>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addPiece}>
            <Plus className="h-3 w-3" /> Add Piece
          </Button>
        </div>
        <div className="space-y-3">
          {pieces.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-3">No pieces added</p>
          )}
          {pieces.map((entry, i) => (
            <div key={i} className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">Piece</Label>
                <Input
                  className={inputStyles}
                  value={entry.piece}
                  onChange={(e) => updatePiece(i, "piece", e.target.value)}
                  placeholder="e.g. Nocturne Op.9 No.2"
                />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">Composer</Label>
                <Input
                  className={inputStyles}
                  value={entry.composer}
                  onChange={(e) => updatePiece(i, "composer", e.target.value)}
                  placeholder="e.g. Chopin"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0"
                onClick={() => removePiece(i)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
