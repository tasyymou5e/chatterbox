import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ClipboardCheck, Plus, Download, Users, ChevronRight, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

import type { AssessmentScores } from '@/utils/assessmentScoring';
import { AssessmentResultDetail } from './AssessmentResultDetail';
import { AssessmentTrendChart } from './AssessmentTrendChart';
import { generateAssessmentPDF } from '@/utils/assessmentPdfGenerator';

interface AssessmentResult {
  id: string;
  assessment_type: string;
  subject_name: string;
  overall_grade: string | null;
  created_at: string;
  scores: AssessmentScores | null;
  ai_review: { categories: Record<string, string>; overall: string } | null;
}

const gradeColor = (grade: string | null): string => {
  switch (grade) {
    case 'A': case 'None': case 'Met':
      return 'bg-secondary text-secondary-foreground';
    case 'B': case 'Low':
      return 'bg-primary text-primary-foreground';
    case 'C': case 'Moderate':
      return 'bg-warning text-warning-foreground';
    case 'D': case 'High': case 'Not Met':
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
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data, error } = await supabase
        .from('assessment_results')
        .select('id, assessment_type, subject_name, overall_grade, created_at, scores, ai_review')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Failed to fetch assessment results:', error);
      }
      if (data) setResults(data as unknown as AssessmentResult[]);
      setLoading(false);
    };
    fetchResults();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 mb-1">
          <Users className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg text-foreground">Family Management</CardTitle>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Assessment History</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => navigate('/assessment')}>
            <Plus className="w-4 h-4 mr-1" />
            New Assessment
          </Button>
        </div>
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
                className="rounded-lg bg-muted/30 border border-border/50 overflow-hidden"
              >
                <button
                  type="button"
                  className="flex items-center justify-between w-full p-3 text-left hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => toggleExpand(r.id)}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {expandedId === r.id ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {assessmentLabel[r.assessment_type] || r.assessment_type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {r.subject_name} • {format(new Date(r.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.overall_grade && (
                      <Badge className={gradeColor(r.overall_grade)}>{r.overall_grade}</Badge>
                    )}
                    {r.scores && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        title="Download PDF Report"
                        onClick={(e) => {
                          e.stopPropagation();
                          generateAssessmentPDF(r);
                        }}
                      >
                        <Download className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                </button>

                {expandedId === r.id && (
                  <AssessmentResultDetail
                    result={r}
                    onClose={() => setExpandedId(null)}
                    onDownload={() => generateAssessmentPDF(r)}
                  />
                )}
              </div>
            ))}
          </div>
        )}
        {results.length >= 2 && <AssessmentTrendChart results={results} />}
      </CardContent>
    </Card>
  );
};
