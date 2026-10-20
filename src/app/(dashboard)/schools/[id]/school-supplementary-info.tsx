import Link from "next/link"
import { Calendar, Info } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getSchoolSupplementaryInfo, getSupInfoCategories } from "@/lib/supabase/queries/school-supplementary-info"
import { SupInfoDialog, EditSupInfoButton, DeleteSupInfoButton } from "./sup-info-dialog"

const PAGE_SIZE = 25

type Props = { schoolId: string; page: number; canWrite: boolean }

/** Supplementary information of a school, 25 rows per page, shown under the notes on the "Notes & Info" tab. */
export async function SchoolSupplementaryInfo({ schoolId, page, canWrite }: Props) {
  const [result, categories] = await Promise.all([
    getSchoolSupplementaryInfo({ schoolId, page, pageSize: PAGE_SIZE }),
    getSupInfoCategories(),
  ])
  const pageHref = (target: number) => `/schools/${schoolId}?tab=notes&supPage=${target}`

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Info className="h-4 w-4 text-muted-foreground" />
            Supplementary Information
            <Badge variant="secondary" className="ml-2">{result.totalCount} records</Badge>
          </CardTitle>
          {canWrite && <SupInfoDialog schoolId={schoolId} mode="create" categories={categories} />}
        </div>
      </CardHeader>
      <CardContent>
        {result.items.length === 0 && result.totalCount > 0 ? (
          // A hand-edited or stale ?supPage= past the last page.
          <p className="py-8 text-center text-sm text-muted-foreground">
            There is nothing on this page.{" "}
            <Link href={pageHref(1)} scroll={false} className="text-primary underline-offset-2 hover:underline">Back to page 1</Link>
          </p>
        ) : result.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50">
              <Info className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-1 text-lg font-medium">No Supplementary Info</h3>
            {canWrite && (
              <>
                <p className="mb-4 text-sm text-muted-foreground">Add supplementary information for this school.</p>
                <SupInfoDialog schoolId={schoolId} mode="create" categories={categories} />
              </>
            )}
          </div>
        ) : (
          <>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[100px]">Year</TableHead>
                    <TableHead className="w-[180px]">Category</TableHead>
                    <TableHead>Information</TableHead>
                    {canWrite && <TableHead className="w-[80px] text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          {item.school_year || "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">{item.category?.label ?? "—"}</Badge>
                      </TableCell>
                      <TableCell>
                        <p className="line-clamp-2 text-sm text-muted-foreground">{item.info || "—"}</p>
                      </TableCell>
                      {canWrite && (
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <EditSupInfoButton supInfo={item} schoolId={schoolId} categories={categories} />
                            <DeleteSupInfoButton supInfoId={item.id} schoolId={schoolId} categoryLabel={item.category?.label ?? "Unknown"} />
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {result.totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-muted-foreground">Page {result.page} of {result.totalPages}</p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={result.page <= 1} asChild>
                    <Link href={pageHref(result.page - 1)} scroll={false}>Previous</Link>
                  </Button>
                  <Button variant="outline" size="sm" disabled={result.page >= result.totalPages} asChild>
                    <Link href={pageHref(result.page + 1)} scroll={false}>Next</Link>
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
