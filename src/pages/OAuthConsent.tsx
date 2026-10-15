import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface OAuthResult { redirect_url?: string; redirect_to?: string }
interface AuthDetails extends OAuthResult { client?: { name?: string } }
interface OAuthApi {
  getAuthorizationDetails(id: string): Promise<{ data: AuthDetails | null; error: { message: string } | null }>;
  approveAuthorization(id: string): Promise<{ data: OAuthResult | null; error: { message: string } | null }>;
  denyAuthorization(id: string): Promise<{ data: OAuthResult | null; error: { message: string } | null }>;
}
const oauth = (): OAuthApi => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<AuthDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) { setError("Missing authorization request."); return; }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      try {
        const { data, error: err } = await oauth().getAuthorizationDetails(authorizationId);
        if (!active) return;
        if (err) { setError(err.message); return; }
        const immediate = data?.redirect_url ?? data?.redirect_to;
        if (immediate && !data?.client) { window.location.href = immediate; return; }
        setDetails(data ?? {});
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Authorization service unavailable.");
      }
    })();
    return () => { active = false; };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    try {
      const { data, error: err } = approve
        ? await oauth().approveAuthorization(authorizationId)
        : await oauth().denyAuthorization(authorizationId);
      if (err) { setError(err.message); setBusy(false); return; }
      const target = data?.redirect_url ?? data?.redirect_to;
      if (!target) { setError("No redirect returned by the authorization server."); setBusy(false); return; }
      window.location.href = target;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
      setBusy(false);
    }
  }

  const name = details?.client?.name ?? "An app";
  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader><CardTitle>{error ? "Authorization problem" : details ? `Connect ${name}` : "Loading…"}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {error && <p className="text-destructive">Could not load this request: {error}</p>}
          {details && !error && (
            <>
              <p className="text-muted-foreground">{name} wants to use Chatterbox as you, and will see the same family data you can see.</p>
              <div className="flex gap-2">
                <Button disabled={busy} onClick={() => decide(true)}>Approve</Button>
                <Button variant="outline" disabled={busy} onClick={() => decide(false)}>Deny</Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
