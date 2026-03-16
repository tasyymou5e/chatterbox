import { useState, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import { supabase } from '@/integrations/supabase/client';
import { SKILL_LEVEL_LABELS, type SkillLevel } from '@/types/lessonProgress';

interface CertificateData {
  userId: string;
  familyId: string;
  categoryId: string;
  categoryName: string;
  childName: string;
  skillLevel: SkillLevel;
  stats?: {
    accuracy: number;
    moonsEarned: number;
    totalStars: number;
  };
}

export function useCertificateGenerator() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePDF = useCallback((data: CertificateData): jsPDF => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Background
    doc.setFillColor(255, 251, 235);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Border
    doc.setDrawColor(251, 191, 36);
    doc.setLineWidth(3);
    doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
    doc.setLineWidth(1);
    doc.rect(15, 15, pageWidth - 30, pageHeight - 30);

    // Title
    doc.setFontSize(36);
    doc.setTextColor(146, 64, 14);
    doc.text('Certificate of Achievement', pageWidth / 2, 45, { align: 'center' });

    // "This certifies that"
    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.text('This certifies that', pageWidth / 2, 65, { align: 'center' });

    // Child name
    doc.setFontSize(32);
    doc.setTextColor(59, 130, 246);
    doc.text(data.childName, pageWidth / 2, 85, { align: 'center' });

    // "has successfully completed"
    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.text('has successfully completed', pageWidth / 2, 100, { align: 'center' });

    // Category name
    doc.setFontSize(24);
    doc.setTextColor(0, 0, 0);
    doc.text(data.categoryName, pageWidth / 2, 115, { align: 'center' });

    // Level
    doc.setFontSize(18);
    doc.setTextColor(180, 83, 9);
    doc.text(`at the ${SKILL_LEVEL_LABELS[data.skillLevel]} Level`, pageWidth / 2, 130, { align: 'center' });

    // Stats
    if (data.stats) {
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      const statsText = `Accuracy: ${Math.round(data.stats.accuracy)}% | Moons: ${data.stats.moonsEarned} | Stars: ${data.stats.totalStars}`;
      doc.text(statsText, pageWidth / 2, 150, { align: 'center' });
    }

    // Date
    const date = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(date, pageWidth / 2, pageHeight - 30, { align: 'center' });

    return doc;
  }, []);

  const generateAndDownload = useCallback(async (data: CertificateData) => {
    setSaving(true);
    setError(null);

    try {
      // Generate PDF
      const doc = generatePDF(data);
      
      // Download
      doc.save(`${data.childName}-${data.categoryName}-certificate.pdf`);

      // Save to database
      await supabase.from('certificates').insert({
        user_id: data.userId,
        family_id: data.familyId,
        category_id: data.categoryId,
        category_name: data.categoryName,
        skill_level_completed: data.skillLevel,
        child_name: data.childName,
        certificate_data: {
          accuracy: data.stats?.accuracy ?? 0,
          moons_earned: data.stats?.moonsEarned ?? 0,
          total_stars_earned: data.stats?.totalStars ?? 0,
          time_to_complete_days: 0,
        },
      });

      setSaving(false);
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }, [generatePDF]);

  return {
    generateAndDownload,
    generatePDF,
    saving,
    error,
  };
}
