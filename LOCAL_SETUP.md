# Running Chatterbox Locally

Runs the full app against a local Supabase stack in Docker, loaded with a copy of the
hosted database (schema, data and auth users).

## Prerequisites

- Docker Desktop (running)
- Node.js 20+ (for the Supabase CLI via `npx`)
- On Windows: run the commands from WSL or Git Bash

## 1. Start the local Supabase stack

```bash
npx supabase start
```

The first run downloads the Supabase images (a few GB). When it finishes it prints the
local `API_URL` (`http://127.0.0.1:54321`), `ANON_KEY` and Studio URL
(`http://127.0.0.1:54323`).

Migrations are disabled for the local stack in `supabase/config.toml`: the history in
`supabase/migrations` does not replay cleanly on an empty database. The database is
loaded from the hosted project instead (next step).

## 2. Copy the hosted database

In the Supabase dashboard, open the project, click **Connect**, and copy the
**Session pooler** connection string. Put your database password in it, then:

```bash
SUPABASE_DB_URL='postgresql://postgres.<project-ref>:<password>@<host>:5432/postgres' \
  scripts/local/pull-supabase.sh
```

The script dumps the hosted roles, schema and data, resets the local database, restores
the dump, and then applies `supabase/local/post-restore.sql`. That file restores the
objects `supabase db dump` skips because they live in Supabase-managed schemas: the
`on_auth_user_created` trigger, storage buckets and policies, realtime tables and the
log-cleanup cron job.

Re-run the script any time to refresh the local copy. Existing users can sign in
locally with their usual passwords.

The dump files in `supabase/local/dump/` contain real user data. They are gitignored;
keep them private.

## 3. Build and run the app in Docker

```bash
docker compose up -d --build
```

Open http://localhost:8080. The image builds the production bundle with the local
Supabase URL and key baked in (see `docker-compose.yml`) and serves it with nginx.
Rebuild with the same command after code changes.

Emails sent by Supabase Auth (sign-up confirmation, password reset) go to Mailpit at
http://127.0.0.1:54324 instead of real inboxes.

To stop everything:

```bash
docker compose down
```
```bash
npx supabase stop
```

The local database is kept between restarts.

### Alternative: Vite dev server (hot reload)

```bash
cp .env.local.example .env.local
```
```bash
npm install --legacy-peer-deps --no-package-lock
```
```bash
npx vite
```

`npm run dev` also works if Bun is installed (its `predev` hook uses `bunx`).
`package-lock.json` is out of date and `bun.lock` points some packages at Lovable's
private npm cache, hence installing from `package.json` alone.

## Edge functions

`supabase start` serves everything in `supabase/functions`. Functions that call external
services need their keys:

```bash
cp supabase/functions/.env.example supabase/functions/.env
```

Fill in the keys you need, then restart the stack (`npx supabase stop && npx supabase start`)
so the functions pick them up.

The AI plan and assessment functions call an OpenAI-compatible chat API. In production
that is the Lovable AI gateway (`LOVABLE_API_KEY`). Locally you can use any
OpenAI-compatible provider through `AI_GATEWAY_URL`, `AI_GATEWAY_API_KEY` and
`AI_GATEWAY_MODEL` (see `supabase/functions/_shared/ai-gateway.ts`). AI chat and `ai-session-helper`
always use the Lovable gateway and need `LOVABLE_API_KEY`.

## What works locally

Status as of 2026-10-29. The admin page **/admin/environment** shows the live version:
backend target, which edge function secrets are set (yes/no only, never values), and row
counts for key tables.

The local stack is fully separate from the hosted project (`lxuqfgbukrrickanmmic`);
nothing done locally reaches production. `docker compose` builds the frontend with the
`LOCAL_*` build args, so it never targets production either.

Running: Postgres, REST, auth, storage, realtime, Studio (http://127.0.0.1:54323),
Mailpit (http://127.0.0.1:54324) and the edge runtime serving all 33 functions. imgproxy
and the connection pooler are stopped; nothing here needs them.

Data: comparing every COPY block in `supabase/local/dump/data.sql` with the local
database, 121 of 126 tables are identical. The other 5 differ only because of activity
since the restore (`auth.audit_log_entries`, `auth.sessions`, `auth.mfa_amr_claims`,
`auth.refresh_tokens` (expired tokens cleaned up), `public.user_activity_logs`). Nothing
is missing: 11 auth users, 3 storage buckets, 1 cron job (`cleanup-old-health-logs-daily`),
45 `content_items` (all active), 11 `content_categories`, 40 `life_skill_catalog` rows.

Needs configuration: until `supabase/functions/.env` exists (see Edge functions above),
these fail:

- AI plans and assessment reviews (`generate-daily-plan`, `ai-assessment-review`): the
  `AI_GATEWAY_*` settings or `LOVABLE_API_KEY`. To use the Lovable gateway, remove the
  `AI_GATEWAY_*` lines: an empty `AI_GATEWAY_API_KEY=` hides `LOVABLE_API_KEY`.
- AI chat (`ai-chat` with the default `lovable` provider) and `ai-session-helper`: always
  `LOVABLE_API_KEY`; they ignore the `AI_GATEWAY_*` settings.
- `grok-chat` and `text-to-speech`: `GROK_API_KEY`. `llm-with-failover`, and `ai-chat` with
  a non-lovable provider, read `LLM_<PROVIDER>_API_KEY` (for example `LLM_GROK_API_KEY`).
  `OPENAI_API_KEY` is not read by any function (only the admin status check reports it).
- Family emails: `RESEND_API_KEY`.
- Scheduled jobs: `SCHEDULER_SECRET`.

Prefer dev/test keys. These features also need internet access to reach the providers.
Edge functions download their imports from deno.land / esm.sh on first run, then cache
them.

If a page such as `/admin/kids-catalog` shows no data, it most likely loaded before the
restore or the image rebuild finished: re-run the restore if needed, rebuild, and reload.

## Not copied

- Storage files. The hosted project has no storage objects; the buckets and policies are
  recreated.
- The hourly edge-function health-check cron job. In production it calls the hosted
  functions URL, so it is intentionally not recreated locally.
