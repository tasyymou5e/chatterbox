/**
 * Assessment Scoring Utilities
 */
import type { AssessmentInstrument, ScoringRule } from '@/data/assessmentInstruments';

export type CategoryScore = {
  categoryId: string;
  categoryName: string;
  rawScore: number;
  maxScore: number;
  grade: string;
  label: string;
  percentage: number;
};

export type AssessmentScores = {
  categories: CategoryScore[];
  overallScore: number;
  overallMaxScore: number;
  overallGrade: string;
  overallLabel: string;
  overallPercentage: number;
};

function getGrade(score: number, rule: ScoringRule): { grade: string; label: string } {
  if (!rule.gradeRanges || rule.gradeRanges.length === 0) {
    return { grade: 'N/A', label: 'Not graded' };
  }
  for (const range of rule.gradeRanges) {
    if (score >= range.min && score <= range.max) {
      return { grade: range.grade, label: range.label };
    }
  }
  const last = rule.gradeRanges[rule.gradeRanges.length - 1];
  return { grade: last.grade, label: last.label };
}

export function computeScores(
  instrument: AssessmentInstrument,
  answers: Record<string, number>
): AssessmentScores {
  const categoryScores: CategoryScore[] = [];
  let totalScore = 0;
  let totalMax = 0;

  for (const category of instrument.categories) {
    const rule = instrument.scoring[category.id];
    const questionValues = category.questions.map(q => answers[q.id] ?? 0);
    const maxPerQ = Math.max(...category.questions.flatMap(q => q.options.map(o => o.value)), 1);
    const maxScore = category.questions.length * maxPerQ;

    let rawScore: number;
    let gradeInfo: { grade: string; label: string };

    switch (rule.type) {
      case 'sum':
        rawScore = questionValues.reduce((a, b) => a + b, 0);
        gradeInfo = getGrade(rawScore, rule);
        break;
      case 'average':
      case 'severity_average':
        rawScore = questionValues.length > 0
          ? questionValues.reduce((a, b) => a + b, 0) / questionValues.length
          : 0;
        gradeInfo = getGrade(rawScore, rule);
        break;
      case 'criteria_met':
        rawScore = questionValues.filter(v => v > 0).length;
        const threshold = rule.criteriaThreshold ?? 1;
        gradeInfo = rawScore >= threshold
          ? { grade: 'Met', label: `${rawScore}/${category.questions.length} criteria met (need ${threshold})` }
          : { grade: 'Not Met', label: `${rawScore}/${category.questions.length} criteria met (need ${threshold})` };
        break;
      default:
        rawScore = 0;
        gradeInfo = { grade: 'N/A', label: 'Unknown scoring type' };
    }

    categoryScores.push({
      categoryId: category.id,
      categoryName: category.name,
      rawScore: Math.round(rawScore * 100) / 100,
      maxScore: rule.type === 'criteria_met' ? category.questions.length : (rule.type === 'severity_average' || rule.type === 'average' ? maxPerQ : maxScore),
      grade: gradeInfo.grade,
      label: gradeInfo.label,
      percentage: maxScore > 0 ? Math.round((questionValues.reduce((a, b) => a + b, 0) / maxScore) * 100) : 0,
    });

    totalScore += questionValues.reduce((a, b) => a + b, 0);
    totalMax += maxScore;
  }

  // Overall scoring
  let overallRaw: number;
  if (instrument.overallScoring.type === 'sum' || instrument.overallScoring.type === 'criteria_met') {
    overallRaw = totalScore;
  } else {
    overallRaw = totalMax > 0 ? totalScore / instrument.categories.reduce((sum, c) => sum + c.questions.length, 0) : 0;
  }

  // Special case for DSM-5 interview: check if both A (3/3) and B (2/4) are met
  let overallGrade: { grade: string; label: string };
  if (instrument.id === 'dsm5_interview') {
    const aMet = categoryScores.find(c => c.categoryId === 'criterion_a')?.grade === 'Met';
    const bMet = categoryScores.find(c => c.categoryId === 'criterion_b')?.grade === 'Met';
    const additionalMet = categoryScores.find(c => c.categoryId === 'additional')?.grade === 'Met';
    if (aMet && bMet && additionalMet) {
      overallGrade = { grade: 'Met', label: 'All DSM-5 criteria met for ASD' };
    } else {
      const missing: string[] = [];
      if (!aMet) missing.push('Group A');
      if (!bMet) missing.push('Group B');
      if (!additionalMet) missing.push('C/D/E');
      overallGrade = { grade: 'Not Met', label: `Criteria not fully met (missing: ${missing.join(', ')})` };
    }
  } else {
    overallGrade = getGrade(
      instrument.overallScoring.type === 'severity_average' ? overallRaw : totalScore,
      instrument.overallScoring
    );
  }

  return {
    categories: categoryScores,
    overallScore: Math.round(overallRaw * 100) / 100,
    overallMaxScore: instrument.overallScoring.type === 'sum' ? totalMax : 3,
    overallGrade: overallGrade.grade,
    overallLabel: overallGrade.label,
    overallPercentage: totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0,
  };
}
