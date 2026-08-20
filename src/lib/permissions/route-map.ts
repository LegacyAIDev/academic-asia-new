import { MODULES, type ModuleKey } from './modules'

/**
 * Maps a pathname to the module that governs it.
 *
 * Order matters — '/' is the catch-all and must stay last, otherwise it would
 * match every route. Pure function with no I/O so it can be unit-tested and
 * used from client components.
 */
const ROUTE_MODULES: { prefix: string; module: ModuleKey }[] = [
  { prefix: '/students', module: MODULES.STUDENTS },
  { prefix: '/schools', module: MODULES.SCHOOLS },
  { prefix: '/events', module: MODULES.EVENTS },
  { prefix: '/exams', module: MODULES.EXAMS },
  { prefix: '/staff', module: MODULES.STAFF },
  { prefix: '/reports', module: MODULES.REPORTS },
  { prefix: '/settings', module: MODULES.SETTINGS },
  { prefix: '/', module: MODULES.DASHBOARD },
]

export function moduleForPath(pathname: string): ModuleKey {
  const match = ROUTE_MODULES.find(
    r => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`) || r.prefix === '/',
  )
  return match?.module ?? MODULES.DASHBOARD
}
