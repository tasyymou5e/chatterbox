import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Download, X, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { getInstrumentById } from '@/data/assessmentInstruments';
import type { AssessmentScores, CategoryScore } from '@/utils/assessmentScoring';

interface AssessmentResult {
  id: string;
  assessment_type: string;
  subject_name: string;
  overall_grade: string | null;
  created_at: string;
  scores: AssessmentScores | null;
  ai_review: { categories: Record<string, string>; overall: string } | null;
}

const gradeBarColor = (grade: string): string => {
  switch (grade) {
    case 'A': case 'None': case 'Met':
      return 'bg-secondary';
    case 'B': case 'Low':
      return 'bg-primary';
    case 'C': case 'Moderate':
      return 'bg-warning';
    case 'D': case 'High': case 'Not Met':
      return 'bg-destructive';
    default:
      return 'bg-muted';
  }
};

const gradeBadgeColor = (grade: string): string => {
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

const CategoryDetail: React.FC<{ cat: CategoryScore; aiNote?: string }> = ({ cat, aiNote }) => (
  <div className="space-y-2 p-3 rounded-lg bg-background border border-border/50">
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-foreground">{cat.categoryName}</span>
      <Badge className={gradeBadgeColor(cat.grade)} variant="secondary">{cat.grade} — {cat.label}</Badge>
    </div>
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${gradeBarColor(cat.grade)}`}
            style={{ width: `${cat.percentage}%` }}
          />
        </div>
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {cat.rawScore}/{cat.maxScore}
      </span>
    </div>
    {aiNote && (
      <p className="text-xs text-muted-foreground italic leading-relaxed">{aiNote}</p>
    )}
  </div>
);

interface Props {
  result: AssessmentResult;
  onClose: () => void;
  onDownload: () => void;
}

export const AssessmentResultDetail: React.FC<Props> = ({ result, onClose, onDownload }) => {
  const instrument = getInstrumentById(result.assessment_type);
  const scores = result.scores;
  const aiReview = result.ai_review;

  if (!scores) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        No detailed scores available for this assessment.
        <Button size="sm" variant="ghost" onClick={onClose} className="ml-2">
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="border-t border-border bg-muted/10 p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-sm font-semibold text-foreground">
            {instrument?.name || result.assessment_type}
          </h4>
          <p className="text-xs text-muted-foreground">
            {result.subject_name} • {format(new Date(result.created_at), 'MMMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" onClick={onDownload} className="h-7 text-xs">
            <Download className="w-3 h-3 mr-1" />
            PDF
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose} className="h-7 w-7 p-0">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Overall Score */}
      <div className="p-3 rounded-lg bg-background border border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">Overall</span>
          <Badge className={gradeBadgeColor(scores.overallGrade)}>
            {scores.overallGrade} — {scores.overallLabel}
          </Badge>
        </div>
        <div className="h-2.5 rounded-full bg-muted overflow-hidden mb-2">
          <div
            className={`h-full rounded-full transition-all ${gradeBarColor(scores.overallGrade)}`}
            style={{ width: `${scores.overallPercentage}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {scores.overallScore}/{scores.overallMaxScore} ({Math.round(scores.overallPercentage)}%)
        </p>
        {aiReview?.overall && (
          <p className="text-xs text-muted-foreground italic mt-2 leading-relaxed">{aiReview.overall}</p>
        )}
      </div>

      {/* Category Breakdown */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Category Breakdown</p>
        {scores.categories.map((cat) => (
          <CategoryDetail
            key={cat.categoryId}
            cat={cat}
            aiNote={aiReview?.categories?.[cat.categoryId]}
          />
        ))}
      </div>
    </div>
  );
};
