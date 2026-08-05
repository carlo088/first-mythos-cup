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

For application or agent changes, run:

```bash
npm ci
npm test
npm run typecheck
git diff --check
```

The persistent Fly machine has 2 GB of memory and runs the Hermes gateway at
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

After a push, use Vercel CLI with the protected token and the configured
`VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` to inspect the remotely built production
deployment and its logs. Confirm both the dashboard and the saved-snapshot API.
Never enable paid AIS calls merely to validate a deployment.

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
