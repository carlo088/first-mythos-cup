# Autonomous operations runbook

## Durable locations

- Repository: `/opt/data/workspace/first-mythos-cup`
- Hermes state, sessions, skills, and pairing: `/opt/data`
- Protected runtime credentials: `/opt/data/.env`
- GitHub canonical branch: `main`
- Vercel project: `first-mythos-cup`
- Fly app: `first-mythos-cup-hermes`
- Supabase project reference: `jnqccspdghuyqxpftihk`

The Fly volume, GitHub, Vercel, and Supabase are durable. The container image
filesystem outside `/opt/data` is replaceable.

## Before changing code

1. `cd /opt/data/workspace/first-mythos-cup`.
2. Run `git status --short` and preserve unrelated or unfinished work.
3. Authenticate GitHub with the environment-provided token and run
   `gh auth setup-git`; never place a token in a remote URL.
   The container supplies the non-secret commit identity `Eolo Hermes`; do not
   replace it with the owner's personal email or put credentials in Git config.
4. Run `git fetch origin` and compare the current branch with `origin/main`.
5. If the tree is clean, fast-forward with `git pull --ff-only origin main`.
   If it is dirty or has diverged, stop and report the exact state instead of
   overwriting work.
6. Read `AGENTS.md`, `.agents/hermes.md`, and `docs/PROJECT_PLAN.md`.

## Verification and publishing

Keep provider round-trips low: combine related read-only inspections, do not
repeat `git status` between unchanged steps, and prefer one verification command
over separate test/typecheck turns. Run `npm ci` only when `package.json` or the
lockfile changed, dependencies are missing, or a clean install is specifically
needed. For application or agent changes, run:

```bash
npm run verify
git diff --check
```

The persistent Fly machine has 4 GB of memory and runs the Hermes gateway at
the same time. Do **not** run `npm run build`, `next build`, or `vercel build`
locally on Fly: Next.js production compilation can exhaust the VM and interrupt
the active agent. The canonical production build runs remotely on Vercel after
the commit is pushed. Treat a successful Vercel production deployment as the
build gate, inspect its logs, and report any failure instead of retrying a local
build with different memory flags.

Review `git diff` before committing. Do not commit `.env*`, tokens, generated
build output, logs, or provider payloads. Push focused commits to `main` only
after the owner explicitly requests publication or deployment. GitHub pushes
trigger the Vercel production build.

For an ordinary web publish, commit the focused verified change, then make one
terminal call that loads `/opt/data/.env` and runs:

```bash
node /opt/data/skills/project/first-mythos-cup/scripts/publish_web.mjs
```

The script configures the protected GitHub credential helper, fetches and
rebases focused local commits onto the latest `origin/main`, pushes `main`,
waits for the exact Git commit's Vercel deployment, and checks the dashboard,
vessel API, and leaderboard API. A real rebase conflict stops without pushing.
Do not separately load generic GitHub skills, repeat deployment polling through
model turns, or re-run checks already performed by this script. If it fails,
inspect only the reported failing layer. Never enable paid AIS calls merely to
validate a deployment.

## Model TPM discipline

Every model/tool iteration sends the system prompt, tool schemas, and retained
conversation back to the provider. Prompt caching lowers cost but does not make
those repeated requests free of rate-limit pressure. Keep the number and size of
model round-trips low:

- Issue independent read-only tool calls together in one assistant turn.
- Do not repeat an unchanged status, authentication, or deployment inspection.
- Use this project runbook for ordinary GitHub and Vercel work. Load an
  additional generic skill only when it contains instructions this runbook does
  not cover.
- Request narrow file ranges and bounded logs; do not return whole build logs,
  lockfiles, generated output, or dependency trees to the model.
- Prefer `npm run verify` once over separate install, test, typecheck, and build
  loops. Do not run `npm ci` when dependencies are already present and unchanged.
- If a credential or permission check fails twice with the same result, stop
  retrying it and report the exact missing capability to the owner.

The gateway has a pre-request pacer and deterministic old-tool-result pruning.
Do not remove or weaken either control merely to make a task finish faster.

## Fly self-deployment

`flyctl` and its app-scoped token are available for inspecting this app.
Changing the Hermes container can restart the active Telegram gateway. Before
`flyctl deploy`, require explicit owner confirmation, ensure all work is pushed
to GitHub, and state that Telegram may be unavailable briefly. Never destroy
the machine or volume. Verify the machine reaches `started` and the gateway
process resumes after deployment.

## Database operations

Supabase schema changes, migrations, deletes, RLS changes, and credential
changes require explicit owner confirmation. Prefer additive migrations and a
backup or reversible migration. Never put the database password in commands,
commits, Telegram messages, or logs. Use the scoped Supabase access token only
when it is configured.

### Race legs

Legs live in `public.race_legs`. Always store start/end coordinates, UTC
`starts_at`/`ends_at`, corridor metres, and status. Position inserts must go to
`public.vessel_positions`; the database trigger assigns `leg_id` when time and
route corridor match. Frontends read Supabase through internal APIs and must
not receive a separate mock or provider path. Deleting a leg sets historical
position `leg_id` values to null and cascades that leg's scores; the UI tolerates
missing data, but deletion still requires owner confirmation.

Finished-race points live in `public.leg_scores`. Write one validated integer
0–100 per leg/MMSI. Its trigger recalculates aggregate `public.vessel_scores`.
Do not edit aggregate totals independently.

### Conversational race-management protocol

The owner can operate races in normal language over Telegram. Be helpful with
partial messages, but do not invent operational facts. Query current legs when
an existing race is referenced, so replies are based on the database rather
than stale chat context.

**New leg intake.** A new leg needs five fields: a unique race name, start
latitude/longitude, finish latitude/longitude, start date/time, and finish
date/time. Accept decimal degrees or degree/minute notation with N/E/S/W
suffixes. Use `Europe/Athens` as the race-local time zone unless the owner says
otherwise. A bare time without a date, an unsigned coordinate with an unclear
hemisphere, or unclear start/finish endpoint is incomplete. Ask one compact
question listing only missing fields; never ask again for data already given.

When complete, echo name, normalized decimal coordinates, Greece-local time,
UTC time, and the default 1,800 m corridor. Ask for confirmation before the
write unless the owner has clearly confirmed those exact normalized values in
the same message.

**Time corrections and finish messages.** Match a named leg exactly, or use a
single active leg only when unambiguous. “Race just finished” means set
`ends_at` to the received-message time in Greece time and status to `finished`.
“It finished one hour ago” means that message time minus one hour. Convert the
resolved instant to UTC before writing, retain the start time, and report saved
local plus UTC end times. If two legs could match, ask which one; never finish
multiple legs. Confirm old → new values before writing when the race or date is
ambiguous.

**Manual scoring.** Recognize “Prima Regatina: Isera 10, Fizzy 7, Tiamat 4”,
“give Fizzy 8 instead”, or “scores are 10/7/4”. Resolve names only against
Isera, Fizzy, and Tiamat. For an ordered shorthand such as `10/7/4`, ask for
the boat order unless it was explicitly established immediately before. Validate
each supplied value as an integer 0–100. Write only supplied values to
`leg_scores`; omitted boats retain their existing score. Read back the leg's
scores and refreshed leaderboard afterwards. Never write `vessel_scores`.

**Safety and recovery.** All writes use protected Supabase credentials and are
followed by a narrow read-back of affected rows. Do not delete a leg, position
history, or scores from a conversational request without an explicit target and
confirmation. If a request is ambiguous, ask a single focused question rather
than guessing. If a write fails, say it did not take effect.

### Vessel ingestion scheduler

`/opt/hermes/bin/first-mythos-cup-vessel-worker` runs as a separate Node child
beside the Hermes gateway on the same Fly VM. It does not use model context.
It checks once per minute but contacts providers only when due:

- Greece 22:00–08:00: disabled.
- Greece daytime outside a stored active time window: hourly.
- During a stored race time window: every five minutes.

One cycle requests all three MMSIs and writes normalized rows to
`vessel_positions`. MyShipTracking costs one credit per vessel, so the maximum
ordinary-day budget is 42 credits and each regatta hour adds 36 credits.
`VESSEL_DATA_MODE=mock` is the hard cost gate and is currently active; the
worker process stays alive but makes no provider calls. Never switch Fly to
`VESSEL_DATA_MODE=live` without explicit owner authorization acknowledging this
budget and confirming the provider and Supabase secrets are present. After a
mode change, verify the process and one aggregate cycle from logs without
printing coordinates or credentials. To stop spending immediately, restore
mock mode and restart the machine.

## Credential boundaries

- `GITHUB_TOKEN`: fine-grained access to this repository only; contents and
  workflows read/write, no organization administration.
- `VERCEL_TOKEN`: access to this project/team for deployments, logs, and server
  environment configuration.
- `FLY_API_TOKEN`: app-scoped deploy token for `first-mythos-cup-hermes`, not an
  organization-wide token.
- `SUPABASE_ACCESS_TOKEN`: project operations only when required.
- Provider keys remain server-side. Paid-provider use requires an explicit
  cost acknowledgement.

Never reveal, echo, print, commit, or send any credential. If a credential is
exposed, stop using it and instruct the owner to rotate it.
