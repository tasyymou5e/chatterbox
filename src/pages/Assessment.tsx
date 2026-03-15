import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, ClipboardCheck, Brain, FileText, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { allInstruments, getInstrumentById } from '@/data/assessmentInstruments';
import type { AssessmentInstrument } from '@/data/assessmentInstruments';
import { AssessmentForm } from '@/components/assessment/AssessmentForm';
import { AssessmentResults } from '@/components/assessment/AssessmentResults';
import { AssessmentPDFExport } from '@/components/assessment/AssessmentPDFExport';
import { computeScores, type AssessmentScores } from '@/utils/assessmentScoring';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

type ViewState = 'select' | 'form' | 'results';

const instrumentIcons: Record<string, React.ReactNode> = {
  atec: <ClipboardCheck className="w-8 h-8 text-primary" />,
  dsm5_interview: <Brain className="w-8 h-8 text-secondary" />,
  dsm5tr_clinician: <FileText className="w-8 h-8 text-accent" />,
};

const Assessment: React.FC = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<ViewState>('select');
  const [selectedInstrument, setSelectedInstrument] = useState<AssessmentInstrument | null>(null);
  const [scores, setScores] = useState<AssessmentScores | null>(null);
  const [aiReview, setAiReview] = useState<{ categories: Record<string, string>; overall: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [subjectName, setSubjectName] = useState('');
  const [_answers, setAnswers] = useState<Record<string, number>>({});

  // Read query params for child context
  const searchParams = new URLSearchParams(window.location.search);
  const childIdParam = searchParams.get('childId');
  const typeParam = searchParams.get('type');

  // Auto-select instrument if type param is provided
  useEffect(() => {
    if (typeParam && view === 'select') {
      const inst = getInstrumentById(typeParam);
      if (inst) {
        setSelectedInstrument(inst);
        setView('form');
      }
    }
  }, [typeParam]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectInstrument = (id: string) => {
    const inst = getInstrumentById(id);
    if (inst) {
      setSelectedInstrument(inst);
      setView('form');
      setScores(null);
      setAiReview(null);
      setAnswers({});
    }
  };

  const handleSubmit = useCallback(async (formAnswers: Record<string, number>, name: string) => {
    if (!selectedInstrument) return;
    setIsSubmitting(true);
    setSubjectName(name);
    setAnswers(formAnswers);

    try {
      const computed = computeScores(selectedInstrument, formAnswers);
      setScores(computed);
      setView('results');

      // Save to database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('assessment_results').insert([{
          user_id: user.id,
          child_id: childIdParam || user.id,
          assessment_type: selectedInstrument.id,
          subject_name: name,
          answers: formAnswers as any,
          scores: computed as any,
          overall_grade: computed.overallGrade,
        }]);
      }

      // Request AI review
      setIsLoadingAI(true);
      try {
        const { data, error } = await supabase.functions.invoke('ai-assessment-review', {
          body: {
            assessmentType: selectedInstrument.id,
            assessmentName: selectedInstrument.name,
            scores: computed,
            answers: formAnswers,
            categories: selectedInstrument.categories.map(c => ({
              id: c.id,
              name: c.name,
              questions: c.questions.map(q => ({ id: q.id, text: q.text })),
            })),
          },
        });

        if (error) throw error;
        if (data?.review) {
          setAiReview(data.review);
          // Update the DB record with AI review
          if (user) {
            const { data: results } = await supabase
              .from('assessment_results')
              .select('id')
              .eq('user_id', user.id)
              .eq('assessment_type', selectedInstrument.id)
              .order('created_at', { ascending: false })
              .limit(1);
            if (results?.[0]) {
              await supabase
                .from('assessment_results')
                .update({ ai_review: data.review as any })
                .eq('id', results[0].id);
            }
          }
        }
      } catch (aiError) {
        console.error('AI review error:', aiError);
        toast({
          title: 'AI Review Unavailable',
          description: 'Scores are ready but AI analysis could not be generated. You can still view and download your results.',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingAI(false);
      }
    } catch (err) {
      console.error('Assessment submission error:', err);
      toast({
        title: 'Error',
        description: 'Failed to process assessment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedInstrument]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (view === 'form') setView('select');
              else if (view === 'results') setView('select');
              else navigate(-1);
            }}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {view === 'select' ? 'ASD Assessment Tools' : selectedInstrument?.shortName}
            </h1>
            <p className="text-sm text-muted-foreground">
              {view === 'select'
                ? 'Select an assessment instrument to begin'
                : view === 'form'
                ? 'Answer all questions to receive AI-powered analysis'
                : 'Review your results and download the report'}
            </p>
          </div>
        </div>

        {/* Instrument Selection */}
        {view === 'select' && (
          <div className="grid gap-4 md:grid-cols-3">
            {allInstruments.map(inst => (
              <Card
                key={inst.id}
                className="border-border hover:border-primary/50 cursor-pointer transition-all hover:shadow-md"
                onClick={() => selectInstrument(inst.id)}
              >
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto mb-2">{instrumentIcons[inst.id]}</div>
                  <CardTitle className="text-base text-foreground">{inst.shortName}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-xs text-center">
                    {inst.description.slice(0, 120)}...
                  </CardDescription>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    {inst.categories.reduce((sum, c) => sum + c.questions.length, 0)} questions • {inst.categories.length} sections
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Form */}
        {view === 'form' && selectedInstrument && (
          <AssessmentForm
            instrument={selectedInstrument}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        )}

        {/* Results */}
        {view === 'results' && selectedInstrument && scores && (
          <div className="space-y-6">
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => navigate('/parent')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Return to Dashboard
              </Button>
              <AssessmentPDFExport
                instrument={selectedInstrument}
                scores={scores}
                aiReview={aiReview}
                subjectName={subjectName}
              />
            </div>
            <AssessmentResults
              instrument={selectedInstrument}
              scores={scores}
              aiReview={aiReview}
              isLoadingAI={isLoadingAI}
            />
            <div className="flex flex-col items-center gap-3 pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">Assessment complete — your results have been saved.</p>
              {childIdParam ? (
                <Button size="lg" className="w-full" onClick={() => navigate('/kids')}>
                  <Home className="w-4 h-4 mr-2" />
                  Continue to My Portal
                </Button>
              ) : (
                <Button size="lg" className="w-full" onClick={() => navigate('/parent')}>
                  <Home className="w-4 h-4 mr-2" />
                  Return to Parent Dashboard
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Assessment;
