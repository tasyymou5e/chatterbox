import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertTriangle,
  Bell,
  BellOff,
  CheckCircle2,
  Clock,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";

interface CostAlert {
  id: string;
  alert_type: string;
  threshold_type: string | null;
  threshold_value: number | null;
  current_value: number;
  severity: string;
  provider: string | null;
  message: string;
  acknowledged: boolean | null;
  acknowledged_at: string | null;
  acknowledged_by?: string | null;
  metadata: unknown;
  created_at: string | null;
}

interface LLMCostAlertsProps {
  onAlertCountChange?: (count: number) => void;
}

export function LLMCostAlerts({ onAlertCountChange }: LLMCostAlertsProps) {
  const [alerts, setAlerts] = useState<CostAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);

  const fetchAlerts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("llm_cost_alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setAlerts(data || []);
      
      const unacknowledgedCount = (data || []).filter((a) => !a.acknowledged).length;
      onAlertCountChange?.(unacknowledgedCount);
    } catch (error) {
      console.error("Failed to fetch alerts:", error);
    } finally {
      setIsLoading(false);
    }
  }, [onAlertCountChange]);

  const checkThresholds = async () => {
    setIsChecking(true);
    try {
      const { data, error } = await supabase.rpc("check_llm_cost_thresholds");
      if (error) throw error;
      
      if (data && data.length > 0) {
        toast.warning(`${data.length} new alert(s) created`);
      } else {
        toast.success("All costs within thresholds");
      }
      
      await fetchAlerts();
    } catch (error) {
      console.error("Failed to check thresholds:", error);
      toast.error("Failed to check thresholds");
    } finally {
      setIsChecking(false);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from("llm_cost_alerts")
        .update({
          acknowledged: true,
          acknowledged_at: new Date().toISOString(),
        })
        .eq("id", alertId);

      if (error) throw error;
      
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === alertId
            ? { ...a, acknowledged: true, acknowledged_at: new Date().toISOString() }
            : a
        )
      );
      
      const unacknowledgedCount = alerts.filter((a) => !a.acknowledged && a.id !== alertId).length;
      onAlertCountChange?.(unacknowledgedCount);
      
      toast.success("Alert acknowledged");
    } catch (error) {
      console.error("Failed to acknowledge alert:", error);
      toast.error("Failed to acknowledge alert");
    }
  };

  const acknowledgeAll = async () => {
    try {
      const { error } = await supabase
        .from("llm_cost_alerts")
        .update({
          acknowledged: true,
          acknowledged_at: new Date().toISOString(),
        })
        .eq("acknowledged", false);

      if (error) throw error;
      
      setAlerts((prev) =>
        prev.map((a) => ({
          ...a,
          acknowledged: true,
          acknowledged_at: new Date().toISOString(),
        }))
      );
      
      onAlertCountChange?.(0);
      toast.success("All alerts acknowledged");
    } catch (error) {
      console.error("Failed to acknowledge all alerts:", error);
      toast.error("Failed to acknowledge alerts");
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return <Badge variant="destructive">Critical</Badge>;
      case "high":
        return <Badge className="bg-orange-500 hover:bg-orange-600">High</Badge>;
      case "medium":
        return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-black">Medium</Badge>;
      case "low":
        return <Badge variant="secondary">Low</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const getAlertIcon = (alertType: string, severity: string) => {
    if (severity === "critical") {
      return <XCircle className="h-5 w-5 text-destructive" />;
    }
    if (alertType === "threshold_exceeded") {
      return <AlertTriangle className="h-5 w-5 text-orange-500" />;
    }
    return <Bell className="h-5 w-5 text-yellow-500" />;
  };

  const unacknowledgedAlerts = alerts.filter((a) => !a.acknowledged);
  const acknowledgedAlerts = alerts.filter((a) => a.acknowledged);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Cost Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-pulse text-muted-foreground">Loading alerts...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Cost Alerts
            {unacknowledgedAlerts.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unacknowledgedAlerts.length}
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={checkThresholds}
              disabled={isChecking}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isChecking ? "animate-spin" : ""}`} />
              Check Now
            </Button>
            {unacknowledgedAlerts.length > 0 && (
              <Button variant="outline" size="sm" onClick={acknowledgeAll}>
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Acknowledge All
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BellOff className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No cost alerts</p>
            <p className="text-sm">Thresholds are being monitored</p>
          </div>
        ) : (
          <>
            {unacknowledgedAlerts.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Active Alerts</h4>
                {unacknowledgedAlerts.map((alert) => (
                  <Alert
                    key={alert.id}
                    className={
                      alert.severity === "critical"
                        ? "border-destructive bg-destructive/10"
                        : alert.severity === "high"
                        ? "border-orange-500 bg-orange-500/10"
                        : ""
                    }
                  >
                    <div className="flex items-start gap-3">
                      {getAlertIcon(alert.alert_type, alert.severity)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getSeverityBadge(alert.severity)}
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {alert.created_at ? format(new Date(alert.created_at), "MMM d, h:mm a") : 'N/A'}
                          </span>
                        </div>
                        <AlertDescription className="text-sm">
                          {alert.message}
                        </AlertDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => acknowledgeAlert(alert.id)}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Alert>
                ))}
              </div>
            )}

            {acknowledgedAlerts.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Recent History ({acknowledgedAlerts.length})
                </h4>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {acknowledgedAlerts.slice(0, 10).map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-center gap-3 p-2 rounded-md bg-muted/50 text-sm"
                    >
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1 text-muted-foreground line-clamp-1">
                        {alert.message}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {alert.created_at ? format(new Date(alert.created_at), "MMM d") : 'N/A'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
