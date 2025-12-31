import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Settings, DollarSign, Save, Loader2 } from "lucide-react";

interface CostThreshold {
  id: string;
  threshold_type: string;
  threshold_value: number;
  warning_percentage: number;
  enabled: boolean;
}

interface CurrentCosts {
  daily: number;
  weekly: number;
  monthly: number;
}

export function LLMCostThresholdSettings() {
  const [thresholds, setThresholds] = useState<CostThreshold[]>([]);
  const [currentCosts, setCurrentCosts] = useState<CurrentCosts>({ daily: 0, weekly: 0, monthly: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const fetchData = async () => {
    try {
      // Fetch thresholds
      const { data: thresholdData, error: thresholdError } = await supabase
        .from("llm_cost_thresholds")
        .select("*")
        .order("threshold_type");

      if (thresholdError) throw thresholdError;
      setThresholds(thresholdData || []);

      // Fetch current costs
      const { data: costData, error: costError } = await supabase
        .from("llm_api_calls")
        .select("cost_usd, created_at");

      if (costError) throw costError;

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const costs = (costData || []).reduce(
        (acc, call) => {
          const callDate = new Date(call.created_at);
          const cost = Number(call.cost_usd) || 0;

          if (callDate >= todayStart) acc.daily += cost;
          if (callDate >= weekAgo) acc.weekly += cost;
          if (callDate >= monthStart) acc.monthly += cost;

          return acc;
        },
        { daily: 0, weekly: 0, monthly: 0 }
      );

      setCurrentCosts(costs);
    } catch (error) {
      console.error("Failed to fetch threshold data:", error);
      toast.error("Failed to load threshold settings");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const updateThreshold = (id: string, field: keyof CostThreshold, value: unknown) => {
    setThresholds((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
    setHasChanges(true);
  };

  const saveThresholds = async () => {
    setIsSaving(true);
    try {
      for (const threshold of thresholds) {
        const { error } = await supabase
          .from("llm_cost_thresholds")
          .update({
            threshold_value: threshold.threshold_value,
            warning_percentage: threshold.warning_percentage,
            enabled: threshold.enabled,
            updated_at: new Date().toISOString(),
          })
          .eq("id", threshold.id);

        if (error) throw error;
      }

      toast.success("Thresholds saved successfully");
      setHasChanges(false);
    } catch (error) {
      console.error("Failed to save thresholds:", error);
      toast.error("Failed to save thresholds");
    } finally {
      setIsSaving(false);
    }
  };

  const getThresholdLabel = (type: string) => {
    switch (type) {
      case "daily":
        return "Daily Limit";
      case "weekly":
        return "Weekly Limit";
      case "monthly":
        return "Monthly Limit";
      default:
        return type;
    }
  };

  const getCurrentCost = (type: string) => {
    switch (type) {
      case "daily":
        return currentCosts.daily;
      case "weekly":
        return currentCosts.weekly;
      case "monthly":
        return currentCosts.monthly;
      default:
        return 0;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Cost Thresholds
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-pulse text-muted-foreground">Loading settings...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Cost Thresholds
            </CardTitle>
            <CardDescription className="mt-1">
              Set spending limits and receive alerts when approaching thresholds
            </CardDescription>
          </div>
          {hasChanges && (
            <Button onClick={saveThresholds} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Save Changes
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {thresholds.map((threshold) => {
          const currentCost = getCurrentCost(threshold.threshold_type);
          const percentUsed = threshold.threshold_value > 0
            ? (currentCost / threshold.threshold_value) * 100
            : 0;
          const isWarning = percentUsed >= threshold.warning_percentage;
          const isExceeded = percentUsed >= 100;

          return (
            <div
              key={threshold.id}
              className={`p-4 rounded-lg border ${
                !threshold.enabled
                  ? "opacity-50 bg-muted/30"
                  : isExceeded
                  ? "border-destructive bg-destructive/10"
                  : isWarning
                  ? "border-orange-500 bg-orange-500/10"
                  : "bg-card"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <h4 className="font-medium">{getThresholdLabel(threshold.threshold_type)}</h4>
                    <p className="text-sm text-muted-foreground">
                      ${currentCost.toFixed(2)} / ${threshold.threshold_value.toFixed(2)}
                      <span className="ml-2">
                        ({percentUsed.toFixed(1)}%)
                      </span>
                    </p>
                  </div>
                </div>
                <Switch
                  checked={threshold.enabled}
                  onCheckedChange={(checked) => updateThreshold(threshold.id, "enabled", checked)}
                />
              </div>

              <Progress
                value={Math.min(percentUsed, 100)}
                className={`h-2 mb-4 ${
                  isExceeded
                    ? "[&>div]:bg-destructive"
                    : isWarning
                    ? "[&>div]:bg-orange-500"
                    : ""
                }`}
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`limit-${threshold.id}`} className="text-xs">
                    Spending Limit ($)
                  </Label>
                  <Input
                    id={`limit-${threshold.id}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={threshold.threshold_value}
                    onChange={(e) =>
                      updateThreshold(threshold.id, "threshold_value", parseFloat(e.target.value) || 0)
                    }
                    disabled={!threshold.enabled}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor={`warning-${threshold.id}`} className="text-xs">
                    Warning at (%)
                  </Label>
                  <Input
                    id={`warning-${threshold.id}`}
                    type="number"
                    min="1"
                    max="100"
                    value={threshold.warning_percentage}
                    onChange={(e) =>
                      updateThreshold(
                        threshold.id,
                        "warning_percentage",
                        Math.min(100, Math.max(1, parseInt(e.target.value) || 80))
                      )
                    }
                    disabled={!threshold.enabled}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          );
        })}

        {thresholds.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Settings className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No thresholds configured</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
