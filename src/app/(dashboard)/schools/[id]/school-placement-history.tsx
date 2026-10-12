import { TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toPlacementRows, type PlacementRow, type PlacementYearCounts } from "@/lib/schools/placement-history"

const COLUMNS = ["Applications", "Offers", "Students placed", "Placement rate"]

function Row({ row, strong = false }: { row: PlacementRow; strong?: boolean }) {
  const weight = strong ? "font-semibold" : undefined
  return (
    <TableRow className={strong ? "bg-muted/30 hover:bg-muted/30" : undefined}>
      <th scope="row" className={`p-2 pl-6 text-left align-middle text-sm ${weight ?? "font-medium"}`}>{row.label}</th>
      {[row.applications, row.offers, row.placed, row.rate].map((value, index) => (
        <TableCell key={COLUMNS[index]} className={`text-right text-sm tabular-nums ${index === 3 ? "pr-6" : ""} ${weight ?? ""}`}>
          {typeof value === "number" ? value.toLocaleString("en-GB") : value}
        </TableCell>
      ))}
    </TableRow>
  )
}

/**
 * How many of our students applied to this school, got an offer and were placed,
 * per academic year. The card says how each figure is defined, because the
 * application statuses come from the old system and are not self-explanatory.
 */
export function SchoolPlacementHistory({ counts }: { counts: PlacementYearCounts[] | null }) {
  const { rows, total } = toPlacementRows(counts ?? [])

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          Placement history
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          By current application status. Offers include conditional offers, offers the family declined and any
          application with a deposit; placed means deposited, or joined the school and left later; enquiries are not
          counted. Rate = placed ÷ applications.
        </p>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {counts === null ? (
          <p role="alert" className="px-6 pb-6 text-sm text-destructive">Placement history is unavailable right now. Reload the page to try again.</p>
        ) : total === null ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground">No applications to this school yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-6 min-w-[130px]">Academic year</TableHead>
                  {COLUMNS.map((column, index) => (
                    <TableHead key={column} className={`min-w-[110px] text-right ${index === 3 ? "pr-6" : ""}`}>{column}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(row => <Row key={row.label} row={row} />)}
                <Row row={total} strong />
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
