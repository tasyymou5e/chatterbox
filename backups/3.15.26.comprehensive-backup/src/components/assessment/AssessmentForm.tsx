import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, Send } from 'lucide-react';
import type { AssessmentInstrument } from '@/data/assessmentInstruments';

interface AssessmentFormProps {
  instrument: AssessmentInstrument;
  onSubmit: (answers: Record<string, number>, subjectName: string) => void;
  isSubmitting?: boolean;
}

export const AssessmentForm: React.FC<AssessmentFormProps> = ({ instrument, onSubmit, isSubmitting }) => {
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [subjectName, setSubjectName] = useState('');

  const category = instrument.categories[currentCategoryIndex];
  const totalQuestions = instrument.categories.reduce((sum, c) => sum + c.questions.length, 0);
  const answeredCount = Object.keys(answers).length;
  const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  const categoryAnswered = useMemo(() => {
    return category.questions.filter(q => answers[q.id] !== undefined).length;
  }, [category, answers]);

  const allAnswered = answeredCount === totalQuestions;
  const isLastCategory = currentCategoryIndex === instrument.categories.length - 1;

  const handleAnswer = (questionId: string, value: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = () => {
    if (allAnswered) {
      onSubmit(answers, subjectName);
    }
  };

  return (
    <div className="space-y-6">
      {/* Subject name */}
      <Card className="border-border">
        <CardContent className="pt-6">
          <Label htmlFor="subject-name" className="text-foreground font-semibold">
            Name of person being assessed (optional)
          </Label>
          <Input
            id="subject-name"
            value={subjectName}
            onChange={e => setSubjectName(e.target.value)}
            placeholder="Enter name..."
            className="mt-2 max-w-md"
          />
        </CardContent>
      </Card>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Section {currentCategoryIndex + 1} of {instrument.categories.length}</span>
          <span>{answeredCount} / {totalQuestions} questions answered</span>
        </div>
        <Progress value={progress} className="h-3" />
      </div>

      {/* Category navigation chips */}
      <div className="flex flex-wrap gap-2">
        {instrument.categories.map((cat, idx) => {
          const catAnswered = cat.questions.filter(q => answers[q.id] !== undefined).length;
          const catComplete = catAnswered === cat.questions.length;
          return (
            <button
              key={cat.id}
              onClick={() => setCurrentCategoryIndex(idx)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                idx === currentCategoryIndex
                  ? 'bg-primary text-primary-foreground'
                  : catComplete
                  ? 'bg-secondary/20 text-secondary-foreground border border-secondary'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {cat.name.length > 30 ? cat.name.slice(0, 30) + '…' : cat.name}
              {catComplete && ' ✓'}
            </button>
          );
        })}
      </div>

      {/* Questions */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg text-foreground">{category.name}</CardTitle>
          {category.description && (
            <CardDescription>{category.description}</CardDescription>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {categoryAnswered} / {category.questions.length} answered in this section
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {category.questions.map((question, qIdx) => (
            <div key={question.id} className="p-4 rounded-lg bg-muted/30 border border-border/50">
              <p className="text-sm font-medium text-foreground mb-3">
                {qIdx + 1}. {question.text}
              </p>
              <RadioGroup
                value={answers[question.id]?.toString()}
                onValueChange={(val) => handleAnswer(question.id, parseInt(val))}
                className="flex flex-wrap gap-3"
              >
                {question.options.map(option => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem
                      value={option.value.toString()}
                      id={`${question.id}_${option.value}`}
                    />
                    <Label
                      htmlFor={`${question.id}_${option.value}`}
                      className="text-sm cursor-pointer text-foreground"
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={() => setCurrentCategoryIndex(i => Math.max(0, i - 1))}
          disabled={currentCategoryIndex === 0}
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Previous
        </Button>

        {isLastCategory ? (
          <Button
            onClick={handleSubmit}
            disabled={!allAnswered || isSubmitting}
            className="bg-primary hover:bg-primary/90"
          >
            <Send className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Analyzing...' : 'Submit for AI Review'}
          </Button>
        ) : (
          <Button
            onClick={() => setCurrentCategoryIndex(i => Math.min(instrument.categories.length - 1, i + 1))}
          >
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
};
