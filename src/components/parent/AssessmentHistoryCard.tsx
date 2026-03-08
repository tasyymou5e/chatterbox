import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ClipboardCheck, Plus, Download, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { getInstrumentById } from '@/data/assessmentInstruments';
import type { AssessmentScores } from '@/utils/assessmentScoring';
import jsPDF from 'jspdf';

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

function generatePDFForResult(result: AssessmentResult) {
  const instrument = getInstrumentById(result.assessment_type);
  if (!instrument || !result.scores) return;

  const scores = result.scores;
  const aiReview = result.ai_review;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  const checkPage = (needed: number) => {
    if (y + needed > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      y = 20;
    }
  };

  const addWrappedText = (text: string, x: number, fontSize: number, maxWidth: number) => {
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, maxWidth);
    for (const line of lines) {
      checkPage(fontSize * 0.5);
      doc.text(line, x, y);
      y += fontSize * 0.45;
    }
  };

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(instrument.shortName + ' Assessment Report', margin, y);
  y += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${format(new Date(result.created_at), 'MMMM d, yyyy')}`, margin, y);
  y += 5;
  if (result.subject_name) {
    doc.text(`Subject: ${result.subject_name}`, margin, y);
    y += 5;
  }
  doc.text(`Assessment: ${instrument.name}`, margin, y);
  y += 10;

  // Overall
  doc.setDrawColor(100, 149, 237);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Overall Assessment', margin, y);
  y += 7;

  doc.setFontSize(12);
  doc.text(`Grade: ${scores.overallGrade}`, margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(scores.overallLabel, margin, y);
  y += 8;

  if (aiReview?.overall) {
    doc.setFont('helvetica', 'italic');
    addWrappedText(aiReview.overall, margin, 9, contentWidth);
    y += 5;
  }

  // Categories
  for (const catScore of scores.categories) {
    checkPage(40);
    y += 5;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(catScore.categoryName, margin, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Score: ${catScore.rawScore} / ${catScore.maxScore} | Grade: ${catScore.grade} | ${catScore.label}`, margin, y);
    y += 6;

    // Progress bar
    doc.setFillColor(230, 230, 230);
    doc.rect(margin, y, contentWidth, 4, 'F');
    const barColor = catScore.grade === 'A' || catScore.grade === 'None' ? [76, 175, 80]
      : catScore.grade === 'B' || catScore.grade === 'Low' ? [100, 149, 237]
      : catScore.grade === 'C' || catScore.grade === 'Moderate' ? [255, 152, 0]
      : [244, 67, 54];
    doc.setFillColor(barColor[0], barColor[1], barColor[2]);
    doc.rect(margin, y, (contentWidth * catScore.percentage) / 100, 4, 'F');
    y += 8;

    if (aiReview?.categories?.[catScore.categoryId]) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      addWrappedText(aiReview.categories[catScore.categoryId], margin, 9, contentWidth);
      y += 3;
    }
  }

  // Disclaimer
  checkPage(30);
  y += 10;
  doc.setDrawColor(255, 152, 0);
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('DISCLAIMER', margin, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  addWrappedText(instrument.disclaimer, margin, 8, contentWidth);

  y += 8;
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text('Generated by ChatterBox Life Assessment Tool', margin, y);

  doc.save(`${instrument.shortName}_Assessment_${format(new Date(result.created_at), 'yyyy-MM-dd')}.pdf`);
}

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
        .select('id, assessment_type, subject_name, overall_grade, created_at, scores, ai_review')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (data) setResults(data as unknown as AssessmentResult[]);
      setLoading(false);
    };
    fetchResults();
  }, []);

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
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50"
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
                  {r.scores && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      title="Download PDF Report"
                      onClick={(e) => {
                        e.stopPropagation();
                        generatePDFForResult(r);
                      }}
                    >
                      <Download className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
