import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ClipboardCheck, ChevronRight, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

interface AssessmentResult {
  id: string;
  assessment_type: string;
  subject_name: string;
  overall_grade: string | null;
  created_at: string;
}

const gradeColor = (grade: string | null): string => {
  switch (grade) {
    case 'A':
    case 'None':
    case 'Met':
      return 'bg-secondary text-secondary-foreground';
    case 'B':
    case 'Low':
      return 'bg-primary text-primary-foreground';
    case 'C':
    case 'Moderate':
      return 'bg-warning text-warning-foreground';
    case 'D':
    case 'High':
    case 'Not Met':
      return 'bg-destructive text-destructive-foreground';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const assessmentLabel: Record<string, string> = {
  atec: 'ATEC',
  dsm5_interview: 'DSM-5 Interview',
  dsm5tr_clinician: 'DSM-5-TR Clinician',
};

export const AssessmentHistoryCard: React.FC = () => {
  const navigate = useNavigate();
  const [results, setResults] = useState<AssessmentResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from('assessment_results')
        .select('id, assessment_type, subject_name, overall_grade, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (data) setResults(data);
      setLoading(false);
    };
    fetchResults();
  }, []);

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-primary" />
          <CardTitle className="text-base text-foreground">Assessment History</CardTitle>
        </div>
        <Button size="sm" variant="outline" onClick={() => navigate('/assessment')}>
          <Plus className="w-4 h-4 mr-1" />
          New Assessment
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : results.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-3">No assessments taken yet.</p>
            <Button size="sm" onClick={() => navigate('/assessment')}>
              Take Your First Assessment
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {results.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => navigate('/assessment')}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {assessmentLabel[r.assessment_type] || r.assessment_type}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.subject_name} • {format(new Date(r.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {r.overall_grade && (
                    <Badge className={gradeColor(r.overall_grade)}>{r.overall_grade}</Badge>
                  )}
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
