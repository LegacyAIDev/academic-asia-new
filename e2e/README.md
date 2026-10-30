# Browser tests

End-to-end checks of features in a real Chrome against the real app and a throwaway local Supabase stack. They never touch the hosted project.

| Suite | Feature | Checks |
|---|---|---|
| `email-filing.e2e.mjs` | Email filing (Communications tab, viewer, roles) | 16 |
| `task-planner.e2e.mjs` | Task Planner | 10 |
| `activity-log.e2e.mjs` | Activity history | 9 |
| `paper-versions.e2e.mjs` | Entrance exam paper versions | 9 |

## Run them

Needs Docker running, the Supabase CLI, `psql` and Google Chrome.

```bash
e2e/setup-local-db.sh                    # local stack, all migrations, test accounts and records
source /tmp/aa-localdb/env.sh            # app and test settings for the local stack
npx next build && npx next start -p 3100 # production build: fast and steady timings
node e2e/email-filing.e2e.mjs            # each suite prints PASS/FAIL per check
```

The seed also creates an English Year 9 entrance exam at Headington School and an examination booking today that uses it, for `paper-versions`; rerun `setup-local-db.sh` on another day for a fresh booking. Each suite expects its own data to start empty (no filed emails before `email-filing`, no tasks before `task-planner`, no activity or exams before `activity-log`, no exam paper files before `paper-versions`); clear those tables between runs. `activity-log` uses `psql`. Failure screenshots go to `/tmp/aa-e2e-shots`.

Test accounts (password in `env.sh`): `manager@aa.test` (Manager, exam team), `staff@aa.test` (Staff: Students write, Schools read), `junior@aa.test` (Junior: read only).

`setup-local-db.sh` patches two old migrations in its scratch copy only, because they do not replay on an empty database; see its header.
