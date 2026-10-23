import type { PlacementRow } from "@/lib/schools/placement-history"

/** The five figures of the chosen academic year, as plain text: label over figure, no icons or colour. */
export function PlacementKpiTiles({ figures }: { figures: PlacementRow }) {
  const tiles = [
    { label: "Applications submitted", value: figures.applications.toLocaleString("en-GB") },
    { label: "Offers received", value: figures.offers.toLocaleString("en-GB") },
    { label: "Offers accepted", value: figures.accepted.toLocaleString("en-GB") },
    { label: "Final placements", value: figures.placed.toLocaleString("en-GB") },
    { label: "Placement rate", value: figures.rate },
  ]

  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-5">
      {tiles.map((tile, index) => (
        // The rate takes the full last row on a phone instead of sitting alone in half of it.
        <div key={tile.label} className={`border-t pt-3 ${index === tiles.length - 1 ? "col-span-2 sm:col-span-1" : ""}`}>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{tile.label}</dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums">{tile.value}</dd>
        </div>
      ))}
    </dl>
  )
}
