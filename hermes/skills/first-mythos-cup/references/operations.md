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

The script pushes `main`, waits for the exact Git commit's Vercel deployment,
and checks the dashboard, vessel API, and leaderboard API. Do not separately
load generic GitHub skills, repeat deployment polling through model turns, or
re-run checks already performed by this script. If it fails, inspect only the
reported failing layer. Never enable paid AIS calls merely to validate a
deployment.

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
