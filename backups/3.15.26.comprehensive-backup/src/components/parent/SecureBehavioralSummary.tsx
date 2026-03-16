import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Activity, Clock, Zap } from "lucide-react";
import { useSecureBehavioralSummary } from "@/hooks/useSecureBehavioralSummary";
import { Skeleton } from "@/components/ui/skeleton";

interface SecureBehavioralSummaryProps {
  familyId?: string;
}

export const SecureBehavioralSummary = ({ familyId }: SecureBehavioralSummaryProps) => {
  const { summaries, loading, error } = useSecureBehavioralSummary(familyId);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Family Activity Summary</CardTitle>
          <CardDescription>Privacy-safe overview of family engagement</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Family Activity Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {error.includes('Access denied') 
              ? 'Only family creators can view activity summaries'
              : 'Unable to load activity summary'}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!summaries || summaries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Family Activity Summary</CardTitle>
          <CardDescription>Privacy-safe overview of family engagement</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No recent activity data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Family Activity Summary
        </CardTitle>
        <CardDescription>Privacy-safe overview of recent family engagement (last 30 days)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {summaries.map((summary, index) => (
          <div key={summary.child_user_id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Family Member {index + 1}</h4>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Last active: {new Date(summary.last_activity_date).toLocaleDateString()}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-blue-500" />
                <span className="text-muted-foreground">Sessions:</span>
                <span className="font-medium">{summary.total_sessions}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-green-500" />
                <span className="text-muted-foreground">Avg. Duration:</span>
                <span className="font-medium">
                  {summary.avg_session_duration 
                    ? `${Math.round(summary.avg_session_duration / 60)}m`
                    : 'N/A'}
                </span>
              </div>
            </div>

            {summary.most_used_features && summary.most_used_features.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Most Used Features:</p>
                <div className="flex flex-wrap gap-1">
                  {summary.most_used_features.slice(0, 4).map((feature, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {feature.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                  {summary.most_used_features.length > 4 && (
                    <Badge variant="outline" className="text-xs">
                      +{summary.most_used_features.length - 4} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        
        <div className="text-xs text-muted-foreground mt-4 p-2 bg-muted/50 rounded">
          <p>🔒 Privacy Note: This summary shows anonymized activity patterns only. Individual behavioral data remains private to each user.</p>
        </div>
      </CardContent>
    </Card>
  );
};