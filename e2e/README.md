# Browser tests

End-to-end checks of features in a real Chrome against the real app and a throwaway local Supabase stack. They never touch the hosted project.

| Suite | Feature | Checks |
|---|---|---|
| `email-filing.e2e.mjs` | Email filing (Communications tab, viewer, roles) | 16 |
| `task-planner.e2e.mjs` | Task Planner | 10 |
| `activity-log.e2e.mjs` | Activity history | 9 |
| `paper-versions.e2e.mjs` | Entrance exam paper versions | 9 |
| `date-fields.e2e.mjs` | Dates keep the day picked (UAT DEV24-001), in Hong Kong time | 6 |
| `stale-editor.e2e.mjs` | An older student editor cannot overwrite a newer save (UAT DEV24-002) | 5 |
| `online-exam.e2e.mjs` | Online exams save; booking form lists why it cannot save (UAT DEV24-003) | 6 |
| `exam-completion.e2e.mjs` | A Scheduler exam reaches the exam desk and All exams and is completed; group candidates each get a record (UAT DEV24-004) | 6 |
| `group-attendance.e2e.mjs` | Exam desk counts and marks attendance per candidate (UAT DEV24-005) | 4 |
| `events-workflow.e2e.mjs` | Every event type: create, view, edit, scheduler, delete | 33 |
| `scheduler-workflow.e2e.mjs` | Other booking types, cancelling, blocked times, rooms | 7 |
| `staff-workflow.e2e.mjs` | Admin creates and edits a staff member, who can then sign in | 4 |
| `records-workflow.e2e.mjs` | School create/edit/delete, student delete, PDF and spreadsheet exports | 7 |

Two sweeps cover the whole app rather than one feature:

- `node e2e/app-sweep.mjs` opens every page and tab as each role (`SWEEP_ROLES=admin,manager,staff,junior`) and lists error screens, uncaught errors, console errors, 5xx responses and failed requests.
- `node e2e/dialog-sweep.mjs` opens every New/Add/Edit control on the main pages (`SWEEP_ROLE=manager`) and presses save on the untouched form, flagging forms that save blank records or refuse without saying why. It writes blank records to the local database.

## Run them

Needs Docker running, the Supabase CLI, `psql` and Google Chrome.

```bash
e2e/setup-local-db.sh                    # local stack, all migrations, test accounts and records
source /tmp/aa-localdb/env.sh            # app and test settings for the local stack
npx next build && npx next start -p 3100 # production build: fast and steady timings
node e2e/email-filing.e2e.mjs            # each suite prints PASS/FAIL per check
```

The seed also creates an English Year 9 entrance exam at Headington School and an examination booking today that uses it, for `paper-versions`; rerun `setup-local-db.sh` on another day for a fresh booking. Each suite expects its own data to start empty (no filed emails before `email-filing`, no tasks before `task-planner`, no activity or exams before `activity-log`, no exam paper files before `paper-versions`); clear those tables between runs. `activity-log`, `date-fields`, `stale-editor`, `online-exam`, `exam-completion` and `group-attendance` use `psql`. Failure screenshots go to `/tmp/aa-e2e-shots`.

Test accounts (password in `env.sh`): `admin@aa.test` (Admin, level 0: staff and access levels), `manager@aa.test` (Manager, exam team), `staff@aa.test` (Staff: Students write, Schools read), `junior@aa.test` (Junior: read only).

`setup-local-db.sh` also writes the exam paper PDFs `paper-versions` uploads (`e2e/make-fixtures.mjs`); the email files for `email-filing` are not generated. It patches two old migrations in its scratch copy only, because they do not replay on an empty database; see its header.
