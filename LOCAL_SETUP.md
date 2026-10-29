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
`AI_GATEWAY_MODEL` (see `supabase/functions/_shared/ai-gateway.ts`).

## Not copied

- Storage files. The hosted buckets were empty when this was written; the buckets and
  policies are recreated.
- The hourly edge-function health-check cron job. In production it calls the hosted
  functions URL.
