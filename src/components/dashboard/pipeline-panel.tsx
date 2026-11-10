import type { PipelineStage } from "@/lib/supabase/queries/dashboard"
import { DashboardPanel } from "./dashboard-panel"

/** A navy ramp, light to dark, so later steps of the journey read as further along. */
const SHADES = ["#d5dce8", "#aab8cf", "#7f93b4", "#566f98", "#2f4b77", "#11294b"]

/** Applications still in progress by step of the journey: one bar for the shape, rows for the figures. */
export function PipelinePanel({ stages }: { stages: PipelineStage[] | null }) {
  const total = (stages ?? []).reduce((sum, s) => sum + s.count, 0)
  return (
    <DashboardPanel title="Applications in progress">
      {stages === null ? (
        <p className="text-sm text-muted-foreground">Application figures could not be loaded.</p>
      ) : total === 0 ? (
        <p className="text-sm text-muted-foreground">No applications are in progress.</p>
      ) : (
        <>
          <div className="flex h-2.5 overflow-hidden rounded-full bg-muted" role="img" aria-label={stages.map(s => `${s.label}: ${s.count}`).join(", ")}>
            {stages.map((s, i) => s.count > 0 && (
              <span key={s.stage} className="h-full border-r border-card last:border-r-0" style={{ width: `${(s.count / total) * 100}%`, background: SHADES[i] }} />
            ))}
          </div>
          <table className="mt-4 w-full text-sm">
            <thead className="sr-only"><tr><th>Step</th><th>Applications</th><th>Share</th></tr></thead>
            <tbody>
              {stages.map((s, i) => (
                <tr key={s.stage} className="border-b last:border-b-0">
                  <td className="py-2">
                    <span className="flex items-center gap-2.5">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: SHADES[i] }} aria-hidden="true" />
                      {s.label}
                    </span>
                  </td>
                  <td className="py-2 text-right font-medium tabular-nums">{s.count.toLocaleString("en-GB")}</td>
                  <td className="w-16 py-2 text-right tabular-nums text-muted-foreground">{Math.round((s.count / total) * 100)}%</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="pt-3 text-muted-foreground">Total in progress</td>
                <td className="pt-3 text-right font-semibold tabular-nums">{total.toLocaleString("en-GB")}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </>
      )}
    </DashboardPanel>
  )
}
