/**
 * KidsPortal - Main unified portal page for children
 * Gates on assessments, shows approved plan as primary view
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { KidsPortalLayout, AgeGroupMenu, KidsProgressHeader, EmbeddedGameViewer, MascotGuide, useMascotGuide } from '@/components/kids';
import { SkillPlanDashboard } from '@/components/kids/SkillPlanDashboard';
import { SkillGamesBrowser } from '@/components/kids/SkillGamesBrowser';
import { KidsAssessmentGate } from '@/components/kids/KidsAssessmentGate';
import { useChildProfile } from '@/hooks/useChildProfile';
import { useChildAvatar } from '@/hooks/useChildAvatar';
import { useLessonProgressStore } from '@/stores/lessonProgressStore';
import { useIdleDetector } from '@/hooks/useIdleDetector';
import { cLog } from '@/utils/wideLogger';
import type { KidContentItem, ContentType, AgeGroup, ChildProfile } from '@/types/kidsPortal';
import { KidsLoadingState } from '@/components/illustrations';

export default function KidsPortal() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<ContentType>('game');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<AgeGroup | 'all'>('all');
  const [activeGame, setActiveGame] = useState<KidContentItem | null>(null);

  const mascot = useMascotGuide();
  const { profile: baseProfile, familyId, isLoading: isLoadingProfile } = useChildProfile(user?.id);
  const { avatar, saveAvatar, uploadAvatar, isSaving: isAvatarSaving } = useChildAvatar(user?.id, familyId || undefined);
  const { progressByCategory, fetchAllProgress, setUser } = useLessonProgressStore();

  const { isIdle } = useIdleDetector({
    timeoutMs: 30 * 60 * 1000,
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (user?.id && familyId) {
      setUser(user.id, familyId);
      fetchAllProgress();
      setTimeout(() => mascot.showGuide('welcome'), 1000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, familyId, setUser, fetchAllProgress]);

  const { totalStars, totalMoons } = useMemo(() => {
    let stars = 0;
    let moons = 0;
    progressByCategory.forEach((progress) => {
      stars += progress.current_stars || 0;
      moons += progress.moons_earned || 0;
    });
    return { totalStars: stars, totalMoons: moons };
  }, [progressByCategory]);

  const childProfile: ChildProfile | null = useMemo(() => {
    if (!baseProfile) return null;
    return { ...baseProfile, totalStars, totalMoons };
  }, [baseProfile, totalStars, totalMoons]);

  useEffect(() => {
    if (!user?.id && !isLoadingProfile) {
      navigate('/auth');
    }
  }, [user?.id, isLoadingProfile, navigate]);

  const handleGameComplete = (results: { score: number; duration: number; completed: boolean }) => {
    cLog('Game completed', results);
    if (results.completed) {
      mascot.celebrateAchievement(results.score > 80 ? 'Amazing score!' : undefined);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted">
        <KidsLoadingState message="Loading your portal..." />
      </div>
    );
  }

  // isIdle is now passed as a prop to SkillPlanDashboard for auto-pause integration

  return (
    <>
      <KidsAssessmentGate>
        <KidsPortalLayout
          childProfile={childProfile}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onLogout={handleLogout}
          avatar={avatar}
          onAvatarSave={saveAvatar}
          onAvatarUpload={uploadAvatar}
          isAvatarSaving={isAvatarSaving}
        >
          <div className="flex flex-col gap-6">
            <KidsProgressHeader profile={childProfile} className="mb-2" />

            {/* Skill Plan Dashboard - primary full view */}
            <SkillPlanDashboard isIdle={isIdle} />

            {/* Free-play Skill Games Browser */}
            <SkillGamesBrowser />
          </div>

          <AgeGroupMenu
            selectedAgeGroup={selectedAgeGroup}
            onAgeGroupChange={setSelectedAgeGroup}
            contentCounts={{ 'all': 0, '3-5': 0, '6-8': 0, '9-12': 0, '13+': 0 }}
          />
        </KidsPortalLayout>
      </KidsAssessmentGate>

      {activeGame && (
        <EmbeddedGameViewer
          game={activeGame}
          childProfile={childProfile}
          familyId={familyId || undefined}
          onClose={() => setActiveGame(null)}
          onComplete={handleGameComplete}
        />
      )}

      {mascot.visible && (
        <MascotGuide
          context={mascot.context}
          customMessage={mascot.customMessage}
          childName={childProfile?.firstName}
          streakCount={childProfile?.currentStreak}
          onDismiss={mascot.hideGuide}
          autoHide={mascot.context === 'welcome'}
          autoHideDelay={6000}
        />
      )}
    </>
  );
}
