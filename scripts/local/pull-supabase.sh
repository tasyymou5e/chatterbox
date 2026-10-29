#!/usr/bin/env bash
# Copy the hosted Supabase database (schema, data, auth users) into the local
# Supabase stack started with `npx supabase start`. Safe to re-run: the local
# database is reset first.
#
# Usage:
#   SUPABASE_DB_URL='postgresql://postgres.<ref>:<password>@<host>:5432/postgres' \
#     scripts/local/pull-supabase.sh
#
# Get SUPABASE_DB_URL from the dashboard: Connect > Session pooler (works on IPv4).
# See LOCAL_SETUP.md.
set -euo pipefail

cd "$(dirname "$0")/../.."

: "${SUPABASE_DB_URL:?Set SUPABASE_DB_URL to the hosted database connection string (see LOCAL_SETUP.md)}"

PROJECT_ID=$(sed -n 's/^project_id *= *"\(.*\)"/\1/p' supabase/config.toml)
DB_CONTAINER="supabase_db_${PROJECT_ID}"
DUMP_DIR=supabase/local/dump
mkdir -p "$DUMP_DIR"

if ! docker ps --format '{{.Names}}' | grep -qx "$DB_CONTAINER"; then
  echo "Local stack is not running ($DB_CONTAINER). Run: npx supabase start" >&2
  exit 1
fi

echo "==> Dumping hosted database"
npx supabase db dump --db-url "$SUPABASE_DB_URL" -f "$DUMP_DIR/roles.sql" --role-only
npx supabase db dump --db-url "$SUPABASE_DB_URL" -f "$DUMP_DIR/schema.sql"
npx supabase db dump --db-url "$SUPABASE_DB_URL" -f "$DUMP_DIR/data.sql" --use-copy --data-only

echo "==> Resetting local database"
npx supabase db reset --local

echo "==> Restoring into local database"
{
  cat "$DUMP_DIR/roles.sql" "$DUMP_DIR/schema.sql"
  echo "SET session_replication_role = replica;"
  # Drop empty COPY blocks. Supabase-managed schemas contain tables the local
  # `postgres` role has no INSERT grant on (storage.buckets_vectors,
  # storage.vector_indexes: newer than the local image's storage migrations).
  # Even a zero-row COPY fails there, and --single-transaction rolls back the
  # whole restore. Blocks with no rows carry no data, so dropping them is lossless.
  awk '/^COPY .* FROM stdin;$/ { hdr = $0; if ((getline nxt) > 0) { if (nxt == "\\.") next; print hdr; print nxt; next } print hdr; next } { print }' "$DUMP_DIR/data.sql"
  echo "SET session_replication_role = DEFAULT;"
  cat supabase/local/post-restore.sql
} | docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres --single-transaction -v ON_ERROR_STOP=1 -q

echo "==> Done. Local users can sign in with their existing passwords."
echo "    Dump files in $DUMP_DIR contain real user data: keep them private."
