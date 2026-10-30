#!/bin/bash
# Builds a throwaway local Supabase stack for the browser tests: applies every
# migration in supabase/migrations, then seeds three staff accounts and a
# student, two schools and an application. Never touches the hosted project.
#
# Needs Docker running, the Supabase CLI and psql. Usage:
#   e2e/setup-local-db.sh            # start (or reuse) the stack and build it
#   source /tmp/aa-localdb/env.sh    # then export the app and test settings
#
# Two old migrations do not replay on an empty database (the hosted project ran
# them in a different order). Only the scratch copies here are patched:
#   035_create_event_extensions.sql   parts 1-6 skipped; already in the rewritten 009-018
#   20260928070928_scheduler_core.sql room/seat_no columns added first (live-only drift,
#                                     repaired upstream by 20260928072540)
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
WORK=/tmp/aa-localdb
DB=postgresql://postgres:postgres@127.0.0.1:54322/postgres
mkdir -p "$WORK/supabase/migrations" "$WORK/patched"
cp "$REPO/supabase/config.toml" "$WORK/supabase/config.toml"
sed -i '' 's/^project_id = .*/project_id = "aa-local-e2e"/' "$WORK/supabase/config.toml"

supabase status --workdir "$WORK" >/dev/null 2>&1 || supabase start --workdir "$WORK"

# Scratch patches (see header).
M="$REPO/supabase/migrations"
part7=$(grep -n "PART 7" "$M/035_create_event_extensions.sql" | head -1 | cut -d: -f1)
tail -n +$((part7 - 1)) "$M/035_create_event_extensions.sql" > "$WORK/patched/035_create_event_extensions.sql"
{ grep -E "add column if not exists (room|seat_no) " "$M/20260928072540_scheduler_room_fk_on_exams.sql"
  cat "$M/20260928070928_scheduler_core.sql"; } > "$WORK/patched/20260928070928_scheduler_core.sql"

# Apply in filename order, skipping what is already applied.
psql "$DB" -X -q -c "create table if not exists public._e2e_applied (name text primary key)"
for f in $(ls "$M" | sort); do
  if [ -n "$(psql "$DB" -X -A -t -c "select 1 from public._e2e_applied where name = '$f'")" ]; then continue; fi
  src="$M/$f"; [ -f "$WORK/patched/$f" ] && src="$WORK/patched/$f"
  psql "$DB" -X -q -v ON_ERROR_STOP=1 -1 -f "$src" >/dev/null
  psql "$DB" -X -q -c "insert into public._e2e_applied values ('$f')"
  echo "applied $f"
done

STATUS=$(supabase status --workdir "$WORK" -o json 2>/dev/null)
key() { echo "$STATUS" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>process.stdout.write(JSON.parse(d)['$1']))"; }
# A fresh random password for the local test accounts on every run; it is written to env.sh only.
export E2E_PASSWORD="$(openssl rand -base64 18)"
export SB_URL=http://127.0.0.1:54321 SB_SERVICE="$(key SERVICE_ROLE_KEY)"
(cd "$REPO" && node e2e/seed-local-db.mjs) | tail -1 > "$WORK/seed-ids.txt"

cat > "$WORK/env.sh" <<ENV
export NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$(key ANON_KEY)
export SUPABASE_SERVICE_ROLE_KEY=$(key SERVICE_ROLE_KEY)
export E2E_PASSWORD='$E2E_PASSWORD'
export E2E_SEED='$(cat "$WORK/seed-ids.txt")'
ENV
echo "Local test database ready. Next: source $WORK/env.sh"
