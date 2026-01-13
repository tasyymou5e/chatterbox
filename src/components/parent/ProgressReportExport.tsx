import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { logSupabaseQuery, logDataAccessIssue, logDataFetchSuccess, createQueryTimer } from '@/utils/parentPortalLogger';

interface ChildProgress {
  name: string;
  pointsEarned: number;
  choresCompleted: number;
  achievementsUnlocked: number;
  activeDays: number;
}

export function ProgressReportExport() {
  const { user } = useAuthStore();
  const [exporting, setExporting] = useState(false);

  const generateReport = async () => {
    if (!user?.id) return;

    setExporting(true);
    const timer = createQueryTimer();

    try {
      // Get families created by this parent
      const { data: families, error: familiesError } = await supabase
        .from('families')
        .select('id, display_name')
        .eq('created_by', user.id);

      logSupabaseQuery(
        { component: 'ReportExport', operation: 'fetchFamilies', userId: user.id, table: 'families' },
        { success: !familiesError, error: familiesError || undefined, rowCount: families?.length || 0 }
      );

      if (!families || families.length === 0) {
        logDataAccessIssue('ReportExport', 'No family found', {
          userId: user.id,
          expectedData: 'at least 1 family',
          actualResult: '0 families'
        });
        toast.error('No family found');
        return;
      }

      const familyIds = families.map(f => f.id);
      const familyName = families[0].display_name;

      // Get child members with profiles
      const { data: childMembers, error: membersError } = await supabase
        .from('family_members')
        .select('user_id')
        .in('family_id', familyIds)
        .eq('role', 'child');

      logSupabaseQuery(
        { component: 'ReportExport', operation: 'fetchChildMembers', userId: user.id, table: 'family_members' },
        { success: !membersError, error: membersError || undefined, rowCount: childMembers?.length || 0 }
      );

      if (!childMembers || childMembers.length === 0) {
        logDataAccessIssue('ReportExport', 'No children in family', {
          userId: user.id,
          expectedData: 'at least 1 child',
          actualResult: '0 children'
        });
        toast.error('No children in family');
        return;
      }

      const childUserIds = childMembers.map(m => m.user_id);

      // Get profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', childUserIds);

      logSupabaseQuery(
        { component: 'ReportExport', operation: 'fetchProfiles', userId: user.id, table: 'profiles' },
        { success: !profilesError, error: profilesError || undefined, rowCount: profiles?.length || 0 }
      );

      // Get last 30 days data
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Get completions
      const { data: completions, error: completionsError } = await supabase
        .from('chore_completions')
        .select('user_id, points_earned, completion_date')
        .in('user_id', childUserIds)
        .gte('completion_date', thirtyDaysAgo.toISOString().split('T')[0]);

      logSupabaseQuery(
        { component: 'ReportExport', operation: 'fetchCompletions', userId: user.id, table: 'chore_completions' },
        { success: !completionsError, error: completionsError || undefined, rowCount: completions?.length || 0 }
      );

      // Get achievements
      const { data: achievements, error: achievementsError } = await supabase
        .from('user_achievements')
        .select('user_id')
        .in('user_id', childUserIds)
        .gte('unlocked_at', thirtyDaysAgo.toISOString());

      logSupabaseQuery(
        { component: 'ReportExport', operation: 'fetchAchievements', userId: user.id, table: 'user_achievements' },
        { success: !achievementsError, error: achievementsError || undefined, rowCount: achievements?.length || 0 }
      );

      logDataFetchSuccess('ReportExport', {
        familyCount: families.length,
        memberCount: childMembers.length,
        recordCount: (completions?.length || 0) + (achievements?.length || 0),
        userId: user.id,
        duration: timer.elapsed()
      });

      // Build progress data
      const childrenProgress: ChildProgress[] = childUserIds.map(userId => {
        const profile = profiles?.find(p => p.user_id === userId);
        const childCompletions = completions?.filter(c => c.user_id === userId) || [];
        const childAchievements = achievements?.filter(a => a.user_id === userId) || [];
        const uniqueDays = new Set(childCompletions.map(c => c.completion_date)).size;

        return {
          name: `${profile?.first_name || 'Child'} ${profile?.last_name || ''}`.trim(),
          pointsEarned: childCompletions.reduce((sum, c) => sum + (c.points_earned || 0), 0),
          choresCompleted: childCompletions.length,
          achievementsUnlocked: childAchievements.length,
          activeDays: uniqueDays,
        };
      });

      // Generate PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Header
      doc.setFontSize(20);
      doc.setTextColor(99, 102, 241); // Primary color
      doc.text('Chatterbox Progress Report', pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(`Family: ${familyName}`, pageWidth / 2, 30, { align: 'center' });
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 36, { align: 'center' });
      doc.text(`Period: Last 30 Days`, pageWidth / 2, 42, { align: 'center' });

      // Summary
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Summary', 20, 55);
      
      const totalPoints = childrenProgress.reduce((sum, c) => sum + c.pointsEarned, 0);
      const totalChores = childrenProgress.reduce((sum, c) => sum + c.choresCompleted, 0);
      const totalAchievements = childrenProgress.reduce((sum, c) => sum + c.achievementsUnlocked, 0);

      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      doc.text(`• Total Points Earned: ${totalPoints}`, 25, 65);
      doc.text(`• Total Tasks Completed: ${totalChores}`, 25, 72);
      doc.text(`• Total Achievements Unlocked: ${totalAchievements}`, 25, 79);
      doc.text(`• Number of Children: ${childrenProgress.length}`, 25, 86);

      // Individual progress
      let yPos = 100;
      
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Individual Progress', 20, yPos);
      yPos += 10;

      childrenProgress.forEach(child => {
        if (yPos > 260) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(12);
        doc.setTextColor(99, 102, 241);
        doc.text(child.name, 25, yPos);
        yPos += 7;

        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        doc.text(`Points Earned: ${child.pointsEarned}`, 30, yPos);
        yPos += 5;
        doc.text(`Tasks Completed: ${child.choresCompleted}`, 30, yPos);
        yPos += 5;
        doc.text(`Achievements Unlocked: ${child.achievementsUnlocked}`, 30, yPos);
        yPos += 5;
        doc.text(`Active Days: ${child.activeDays}`, 30, yPos);
        yPos += 12;
      });

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('Generated by Chatterbox - Supporting children with autism', pageWidth / 2, 285, { align: 'center' });

      // Save
      doc.save(`chatterbox-progress-report-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Progress report downloaded');
    } catch (error) {
      logSupabaseQuery(
        { component: 'ReportExport', operation: 'generateReport', userId: user.id },
        { success: false, error: error as Error, duration: timer.elapsed() }
      );
      toast.error('Failed to generate report');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      onClick={generateReport}
      disabled={exporting}
      className="gap-2"
    >
      {exporting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      {exporting ? 'Generating...' : 'Export PDF Report'}
    </Button>
  );
}
