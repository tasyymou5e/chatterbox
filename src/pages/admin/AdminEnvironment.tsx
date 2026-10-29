/**
 * AdminEnvironment
 *
 * @description Environment status page for the admin portal:
 * 1. Backend target (local Docker stack vs hosted Supabase project)
 * 2. Edge function secrets (configured / missing / optional, booleans only — never values)
 * 3. Live row counts for key tables
 * 4. Static snapshot of the local copy's completeness (see LOCAL_SETUP.md)
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  Server,
  Cloud,
  KeyRound,
  Database,
  ClipboardCheck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { secureLog } from '@/utils/wideLogger';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────────

type EnvironmentKind = 'local' | 'hosted';

interface SecretStatus {
  name: string;
  configured: boolean;
  feature: string;
  /** Unset is fine: the secret has a default or is not read by any function. */
  optional?: boolean;
}

interface EnvironmentReport {
  environment: EnvironmentKind;
  secrets: SecretStatus[];
  aiGatewayKeyConfigured?: boolean;
}

type CountedTable =
  | 'content_items'
  | 'content_categories'
  | 'life_skill_catalog'
  | 'profiles'
  | 'families'
  | 'family_members';

interface TableCount {
  table: CountedTable;
  label: string;
  count: number | null;
  error: string | null;
}

// ─── Static data ────────────────────────────────────────────────────────────────

const COUNTED_TABLES: ReadonlyArray<{ table: CountedTable; label: string }> = [
  { table: 'content_items', label: 'Games catalog items' },
  { table: 'content_categories', label: 'Content categories' },
  { table: 'life_skill_catalog', label: 'Life skill catalog' },
  { table: 'profiles', label: 'Profiles' },
  { table: 'families', label: 'Families' },
  { table: 'family_members', label: 'Family members' },
];

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', 'kong', 'host.docker.internal', '::1', '[::1]']);

const SNAPSHOT_DATE = '2026-10-29';

const SNAPSHOT_FACTS: ReadonlyArray<{ label: string; value: string }> = [
  { label: 'Tables compared', value: '126 (every COPY block in supabase/local/dump/data.sql)' },
  { label: 'Identical', value: '121' },
  { label: 'Differ only due to activity since restore', value: '5' },
  { label: 'Missing', value: 'None' },
  { label: 'Auth users', value: '11' },
  { label: 'Storage buckets / objects', value: '3 / 0 (production has no objects either)' },
  { label: 'Cron jobs', value: '1 (cleanup-old-health-logs-daily)' },
  { label: 'content_items', value: '45 (all active)' },
  { label: 'content_categories', value: '11' },
  { label: 'life_skill_catalog', value: '40' },
];

const ACTIVITY_DIFF_TABLES = [
  'auth.audit_log_entries',
  'auth.sessions',
  'auth.mfa_amr_claims',
  'auth.refresh_tokens (expired tokens cleaned up)',
  'public.user_activity_logs',
];

const NOT_WORKING_LOCALLY: ReadonlyArray<string> = [
  'AI plans and assessment reviews: need the AI_GATEWAY_* settings or LOVABLE_API_KEY.',
  'AI chat (ai-chat, lovable provider) and ai-session-helper: always need LOVABLE_API_KEY.',
  'grok-chat and text-to-speech: need GROK_API_KEY. llm-with-failover and ai-chat with a non-lovable provider: need LLM_<PROVIDER>_API_KEY (for example LLM_GROK_API_KEY).',
  'Family emails: need RESEND_API_KEY.',
  'Scheduled jobs: need SCHEDULER_SECRET.',
  'All of the above also need internet access to reach the providers.',
  'Auth emails (sign-up, password reset) go to Mailpit, not real inboxes.',
  'The hourly edge-function health-check cron is intentionally not recreated (it calls hosted URLs).',
  'imgproxy and the connection pooler are stopped (not needed).',
  'Edge functions fetch imports from deno.land / esm.sh on first run, then cache them.',
];

// ─── Helpers ────────────────────────────────────────────────────────────────────

/** supabase-js reports every non-2xx as a generic message; surface the function's own error instead. */
async function describeInvokeError(err: unknown): Promise<string> {
  if (err instanceof FunctionsHttpError) {
    const response = err.context as Response;
    try {
      const body = await response.json();
      if (body && typeof body.error === 'string' && body.error) {
        return `${body.error} (HTTP ${response.status})`;
      }
    } catch {
      // Body was not JSON; fall back to the status code.
    }
    return `api-integration-status returned HTTP ${response.status}`;
  }
  return err instanceof Error ? err.message : 'Failed to load edge function secrets';
}

function getBackendTarget(): { url: string; host: string; kind: EnvironmentKind } {
  const url: string = import.meta.env.VITE_SUPABASE_URL ?? '';
  try {
    const host = new URL(url).hostname.toLowerCase();
    return { url, host, kind: LOCAL_HOSTS.has(host) ? 'local' : 'hosted' };
  } catch {
    return { url, host: '', kind: 'hosted' };
  }
}

function EnvironmentBadge({ kind }: { kind: EnvironmentKind }) {
  return kind === 'local' ? (
    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30 gap-1">
      <Server className="h-3 w-3" /> Local
    </Badge>
  ) : (
    <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30 gap-1">
      <Cloud className="h-3 w-3" /> Hosted
    </Badge>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────────

export default function AdminEnvironment() {
  const backend = getBackendTarget();
  const isLocal = backend.kind === 'local';
  const localHost = backend.host || '127.0.0.1';
  const studioUrl = `http://${localHost}:54323`;
  const mailpitUrl = `http://${localHost}:54324`;

  const [report, setReport] = useState<EnvironmentReport | null>(null);
  const [loadingSecrets, setLoadingSecrets] = useState(true);
  const [secretsError, setSecretsError] = useState<string | null>(null);

  const [counts, setCounts] = useState<TableCount[]>([]);
  const [loadingCounts, setLoadingCounts] = useState(true);

  const [snapshotOpen, setSnapshotOpen] = useState(isLocal);

  const fetchSecrets = useCallback(async () => {
    setLoadingSecrets(true);
    setSecretsError(null);
    try {
      const { data, error } = await supabase.functions.invoke('api-integration-status', {
        body: { action: 'environment' },
      });
      if (error) throw error;
      if (!data || !Array.isArray((data as EnvironmentReport).secrets)) {
        throw new Error('Unexpected response from api-integration-status');
      }
      setReport(data as EnvironmentReport);
    } catch (err) {
      secureLog.error('Failed to load edge function environment', err, 'AdminEnvironment');
      setSecretsError(await describeInvokeError(err));
      setReport(null);
    } finally {
      setLoadingSecrets(false);
    }
  }, []);

  const fetchCounts = useCallback(async () => {
    setLoadingCounts(true);
    const results = await Promise.all(
      COUNTED_TABLES.map(async ({ table, label }): Promise<TableCount> => {
        try {
          const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });
          if (error) throw error;
          return { table, label, count: count ?? 0, error: null };
        } catch (err) {
          secureLog.error(`Failed to count ${table}`, err, 'AdminEnvironment');
          return {
            table,
            label,
            count: null,
            error: err instanceof Error ? err.message : 'Count failed',
          };
        }
      })
    );
    setCounts(results);
    setLoadingCounts(false);
  }, []);

  useEffect(() => {
    fetchSecrets();
    fetchCounts();
  }, [fetchSecrets, fetchCounts]);

  const refreshAll = () => {
    fetchSecrets();
    fetchCounts();
  };

  const missingSecrets = report?.secrets.filter((s) => !s.configured && !s.optional) ?? [];
  const functionsEnvironment = report?.environment;
  const showLocalSteps = (functionsEnvironment ?? backend.kind) === 'local' && missingSecrets.length > 0;
  const refreshing = loadingSecrets || loadingCounts;

  // ─── Sections ─────────────────────────────────────────────────────────────────

  const snapshotCard = (
    <Card className={cn(isLocal && 'border-primary/40')}>
      <Collapsible open={snapshotOpen} onOpenChange={setSnapshotOpen}>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5" />
                Local Copy Status
              </CardTitle>
              <CardDescription>
                Snapshot of the local Docker copy taken {SNAPSHOT_DATE}. Static; re-check after
                re-running scripts/local/pull-supabase.sh.
              </CardDescription>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1" aria-label="Toggle local copy status">
                {snapshotOpen ? 'Hide' : 'Show'}
                <ChevronDown className={cn('h-4 w-4 transition-transform', snapshotOpen && 'rotate-180')} />
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-6">
            <p className="text-sm text-muted-foreground">
              The local stack is fully separate from the hosted project: local changes never
              reach production.
            </p>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="font-semibold mb-2">Data completeness</h3>
                <Table>
                  <TableBody>
                    {SNAPSHOT_FACTS.map((fact) => (
                      <TableRow key={fact.label}>
                        <TableCell className="text-muted-foreground">{fact.label}</TableCell>
                        <TableCell className="font-medium">{fact.value}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <p className="text-sm text-muted-foreground mt-3">
                  Tables that differ only due to activity since the restore:
                </p>
                <ul className="list-disc pl-5 text-sm text-muted-foreground mt-1">
                  {ACTIVITY_DIFF_TABLES.map((t) => (
                    <li key={t}>
                      <code>{t}</code>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Not copied / not working locally</h3>
                <ul className="space-y-2 text-sm">
                  {NOT_WORKING_LOCALLY.map((item) => (
                    <li key={item} className="flex gap-2">
                      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-yellow-500" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild aria-label="Back to dashboard">
            <Link to="/admin/dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Environment</h1>
            <p className="text-muted-foreground">
              Backend target, edge function secrets and data status
            </p>
          </div>
        </div>
        <Button onClick={refreshAll} disabled={refreshing} className="flex items-center gap-2">
          <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Backend target */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Backend Target
            <EnvironmentBadge kind={backend.kind} />
          </CardTitle>
          <CardDescription>
            The Supabase API this frontend was built against (VITE_SUPABASE_URL)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">
            <span className="text-muted-foreground">API URL: </span>
            <code className="font-mono">{backend.url || '(not set)'}</code>
          </p>
          {isLocal ? (
            <>
              <p className="text-sm text-muted-foreground">
                Local Supabase stack in Docker (<code>npx supabase start</code>). It is fully
                separate from the hosted project; nothing done here reaches production.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" asChild>
                  <a href={studioUrl} target="_blank" rel="noopener noreferrer" className="gap-2">
                    Supabase Studio <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a href={mailpitUrl} target="_blank" rel="noopener noreferrer" className="gap-2">
                    Mailpit (auth emails) <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Hosted Supabase project. Changes made here affect production data.
            </p>
          )}
          {functionsEnvironment && functionsEnvironment !== backend.kind && (
            <p className="text-sm text-yellow-600 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Edge functions report a {functionsEnvironment} environment, but the frontend targets a{' '}
              {backend.kind} backend.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Local copy status: prominent when local */}
      {isLocal && snapshotCard}

      {/* Edge function secrets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Edge Function Secrets
            {functionsEnvironment && <EnvironmentBadge kind={functionsEnvironment} />}
          </CardTitle>
          <CardDescription>
            Whether each secret is set in the edge runtime. Values are never sent to the browser.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingSecrets ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : secretsError ? (
            <div className="py-6 text-center text-muted-foreground space-y-3">
              <XCircle className="h-10 w-10 mx-auto text-red-500" />
              <p className="font-medium">Could not load edge function secrets</p>
              <p className="text-sm">{secretsError}</p>
              <Button variant="outline" size="sm" onClick={fetchSecrets}>
                Try again
              </Button>
            </div>
          ) : report ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Secret</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Enables</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.secrets.map((secret) => (
                    <TableRow key={secret.name}>
                      <TableCell className="font-mono text-sm">{secret.name}</TableCell>
                      <TableCell>
                        {secret.configured ? (
                          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30 gap-1">
                            <CheckCircle className="h-3 w-3" /> Configured
                          </Badge>
                        ) : secret.optional ? (
                          <Badge variant="outline" className="text-muted-foreground gap-1">
                            Not set (optional)
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30 gap-1">
                            <XCircle className="h-3 w-3" /> Missing
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{secret.feature}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {report.aiGatewayKeyConfigured !== undefined && (
                <p className="text-sm flex items-center gap-2">
                  {report.aiGatewayKeyConfigured ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  AI plans / assessment reviews key{' '}
                  {report.aiGatewayKeyConfigured ? 'resolved' : 'not resolved'}{' '}
                  <span className="text-muted-foreground">
                    (generate-daily-plan, ai-assessment-review: AI_GATEWAY_API_KEY, else
                    LOVABLE_API_KEY; an empty AI_GATEWAY_API_KEY line hides LOVABLE_API_KEY.
                    ai-chat and ai-session-helper need LOVABLE_API_KEY itself.)
                  </span>
                </p>
              )}

              <p className="text-sm text-muted-foreground">
                Not listed: <code>LLM_&lt;PROVIDER&gt;_API_KEY</code> secrets (for example{' '}
                <code>LLM_GROK_API_KEY</code>), read by llm-with-failover and by ai-chat when a
                non-lovable provider is selected. Provider names come from the llm_providers table.
              </p>

              {showLocalSteps && (
                <div className="rounded-lg border bg-muted/30 p-4 space-y-3 text-sm">
                  <p className="font-medium">
                    {missingSecrets.length} required secret{missingSecrets.length === 1 ? '' : 's'} missing.
                    To add them to the local stack:
                  </p>
                  <ol className="list-decimal pl-5 space-y-2">
                    <li>
                      Copy the template (the result is gitignored):
                      <pre className="mt-1 rounded bg-muted p-2 font-mono text-xs overflow-x-auto">
                        cp supabase/functions/.env.example supabase/functions/.env
                      </pre>
                    </li>
                    <li>
                      Fill in the keys you need in <code>supabase/functions/.env</code>, preferably
                      dev/test keys. To use the Lovable gateway, set <code>LOVABLE_API_KEY</code> and
                      remove the three <code>AI_GATEWAY_*</code> lines.
                    </li>
                    <li>
                      Restart the stack so the functions pick them up:
                      <pre className="mt-1 rounded bg-muted p-2 font-mono text-xs overflow-x-auto">
                        npx supabase stop && npx supabase start
                      </pre>
                    </li>
                  </ol>
                  <p className="text-muted-foreground">
                    These features also need internet access to reach the providers.
                  </p>
                </div>
              )}

              {functionsEnvironment === 'hosted' && (
                <p className="text-sm text-muted-foreground">
                  Hosted secrets are managed in the Supabase dashboard &gt; Edge Functions &gt;
                  Secrets.
                </p>
              )}
            </>
          ) : null}
        </CardContent>
      </Card>

      {/* Live data counts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Live Data Counts
          </CardTitle>
          <CardDescription>Row counts for key tables in the current backend</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingCounts ? (
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
              {COUNTED_TABLES.map(({ table }) => (
                <Skeleton key={table} className="h-20" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
              {counts.map((c) => (
                <div key={c.table} className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">{c.label}</p>
                  {c.error ? (
                    <p className="text-sm text-red-500 flex items-center gap-1 mt-1" title={c.error}>
                      <XCircle className="h-4 w-4" /> Unavailable
                    </p>
                  ) : (
                    <p className="text-2xl font-bold">{c.count?.toLocaleString()}</p>
                  )}
                  <p className="text-xs text-muted-foreground font-mono mt-1">{c.table}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Local copy status: secondary (collapsed) when hosted */}
      {!isLocal && snapshotCard}

      {/* Quick Links */}
      <div className="flex flex-wrap gap-4 justify-center">
        <Button variant="outline" asChild>
          <Link to="/admin/data-health">Data Health</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/admin/system-monitoring">System Monitoring</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/admin/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
