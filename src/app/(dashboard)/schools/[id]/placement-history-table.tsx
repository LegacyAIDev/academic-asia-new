import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { PlacementRow } from "@/lib/schools/placement-history"

const COLUMNS = ["Applications", "Offers", "Accepted", "Placed", "Rate"]

function Row({ row, selected, strong = false }: { row: PlacementRow; selected: boolean; strong?: boolean }) {
  const weight = strong ? "font-semibold" : undefined
  return (
    <TableRow
      aria-current={selected ? "true" : undefined}
      className={selected ? "bg-muted/40 hover:bg-muted/40" : strong ? "hover:bg-transparent" : undefined}
    >
      <th scope="row" className={`p-2 pl-6 text-left align-middle text-sm ${weight ?? "font-medium"} ${selected ? "underline decoration-primary decoration-2 underline-offset-4" : ""}`}>{row.label}</th>
      {[row.applications, row.offers, row.accepted, row.placed, row.rate].map((value, index) => (
        <TableCell key={COLUMNS[index]} className={`text-right text-sm tabular-nums ${index === 4 ? "pr-6" : ""} ${weight ?? ""}`}>
          {typeof value === "number" ? value.toLocaleString("en-GB") : value}
        </TableCell>
      ))}
    </TableRow>
  )
}

/** One row per academic year and an "All years" total, so the totals stay in view next to the chosen year. */
export function PlacementHistoryTable({ rows, total, selectedLabel }: { rows: PlacementRow[]; total: PlacementRow; selectedLabel: string }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-6 min-w-[130px]">Academic year</TableHead>
            {COLUMNS.map((column, index) => (
              <TableHead key={column} className={`min-w-[96px] text-right ${index === 4 ? "pr-6" : ""}`}>{column}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(row => <Row key={row.label} row={row} selected={row.label === selectedLabel} />)}
          <Row row={total} selected={total.label === selectedLabel} strong />
        </TableBody>
      </Table>
    </div>
  )
}
