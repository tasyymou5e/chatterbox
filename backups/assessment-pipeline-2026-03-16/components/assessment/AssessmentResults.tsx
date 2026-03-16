import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle } from 'lucide-react';
import type { AssessmentScores, CategoryScore } from '@/utils/assessmentScoring';
import type { AssessmentInstrument } from '@/data/assessmentInstruments';

interface AssessmentResultsProps {
  instrument: AssessmentInstrument;
  scores: AssessmentScores;
  aiReview: {
    categories: Record<string, string>;
    overall: string;
  } | null;
  isLoadingAI?: boolean;
}

const gradeColor = (grade: string): string => {
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

const CategoryResult: React.FC<{
  score: CategoryScore;
  aiNarrative?: string;
}> = ({ score, aiNarrative }) => (
  <Card className="border-border">
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <CardTitle className="text-sm font-semibold text-foreground">
          {score.categoryName}
        </CardTitle>
        <Badge className={gradeColor(score.grade)}>{score.grade}</Badge>
      </div>
      <CardDescription className="text-xs">{score.label}</CardDescription>
    </CardHeader>
    <CardContent className="space-y-3">
      <div>
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Score: {score.rawScore} / {score.maxScore}</span>
          <span>{score.percentage}%</span>
        </div>
        <Progress value={score.percentage} className="h-2" />
      </div>
      {aiNarrative && (
        <div className="mt-3 p-3 rounded-lg bg-muted/30 border border-border/50">
          <p className="text-xs font-medium text-muted-foreground mb-1">AI Analysis</p>
          <p className="text-sm text-foreground whitespace-pre-line">{aiNarrative}</p>
        </div>
      )}
    </CardContent>
  </Card>
);

export const AssessmentResults: React.FC<AssessmentResultsProps> = ({
  instrument,
  scores,
  aiReview,
  isLoadingAI,
}) => {
  return (
    <div className="space-y-6">
      {/* Disclaimer */}
      <Card className="border-warning/50 bg-warning/5">
        <CardContent className="pt-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            {instrument.disclaimer}
          </p>
        </CardContent>
      </Card>

      {/* Overall Score */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-foreground">Overall Assessment</CardTitle>
          <div className="flex items-center gap-3 mt-2">
            <Badge className={`text-lg px-4 py-1 ${gradeColor(scores.overallGrade)}`}>
              {scores.overallGrade}
            </Badge>
            <span className="text-sm text-muted-foreground">{scores.overallLabel}</span>
          </div>
        </CardHeader>
        <CardContent>
          {aiReview?.overall && (
            <div className="p-4 rounded-lg bg-background border border-border">
              <p className="text-xs font-medium text-muted-foreground mb-2">AI Overall Summary</p>
              <p className="text-sm text-foreground whitespace-pre-line">{aiReview.overall}</p>
            </div>
          )}
          {isLoadingAI && !aiReview && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
              AI is analyzing your responses...
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Category Scores */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Category Breakdown</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {scores.categories.map(score => (
            <CategoryResult
              key={score.categoryId}
              score={score}
              aiNarrative={aiReview?.categories?.[score.categoryId]}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
