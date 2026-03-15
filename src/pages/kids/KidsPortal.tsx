/**
 * KidsPortal - Main unified portal page for children
 * Gates on assessments, shows approved plan as primary view
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { KidsPortalLayout, KidsContentCard, AgeGroupMenu, KidsProgressHeader, EmbeddedGameViewer, MascotGuide, useMascotGuide } from '@/components/kids';
import { SkillPlanDashboard } from '@/components/kids/SkillPlanDashboard';
import { KidsAssessmentGate } from '@/components/kids/KidsAssessmentGate';
import { useKidsContentLoader } from '@/hooks/useKidsContentLoader';
import { useChildProfile } from '@/hooks/useChildProfile';
import { useChildAvatar } from '@/hooks/useChildAvatar';
import { useLessonProgressStore } from '@/stores/lessonProgressStore';
import { useIdleDetector } from '@/hooks/useIdleDetector';
import { cLog } from '@/utils/conditionalLogger';
import type { KidContentItem, ContentType, AgeGroup, ChildProfile } from '@/types/kidsPortal';
import { KidsLoadingState, KidsEmptyState } from '@/components/illustrations';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';

export default function KidsPortal() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<ContentType>('game');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<AgeGroup | 'all'>('all');
  const [activeGame, setActiveGame] = useState<KidContentItem | null>(null);
  
  // Mascot guide state
  const mascot = useMascotGuide();
  const { profile: baseProfile, familyId, isLoading: isLoadingProfile } = useChildProfile(user?.id);

  // Avatar system
  const { avatar, saveAvatar, uploadAvatar, isSaving: isAvatarSaving } = useChildAvatar(user?.id, familyId || undefined);

  // Progress store for real stars/moons
  const { progressByCategory, fetchAllProgress, setUser } = useLessonProgressStore();

  // Idle detection - 30 minute timeout
  const { isIdle } = useIdleDetector({
    timeoutMs: 30 * 60 * 1000,
    enabled: !!user?.id,
  });

  // Initialize progress store when user and family are available
  useEffect(() => {
    if (user?.id && familyId) {
      setUser(user.id, familyId);
      fetchAllProgress();
      setTimeout(() => mascot.showGuide('welcome'), 1000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, familyId, setUser, fetchAllProgress]);

  // Calculate total stars and moons from progress store
  const { totalStars, totalMoons } = useMemo(() => {
    let stars = 0;
    let moons = 0;
    progressByCategory.forEach((progress) => {
      stars += progress.current_stars || 0;
      moons += progress.moons_earned || 0;
    });
    return { totalStars: stars, totalMoons: moons };
  }, [progressByCategory]);

  // Merge real progress data into profile
  const childProfile: ChildProfile | null = useMemo(() => {
    if (!baseProfile) return null;
    return {
      ...baseProfile,
      totalStars,
      totalMoons,
    };
  }, [baseProfile, totalStars, totalMoons]);

  // Redirect if not logged in
  useEffect(() => {
    if (!user?.id && !isLoadingProfile) {
      navigate('/auth');
    }
  }, [user?.id, isLoadingProfile, navigate]);

  // Load content
  const { content, isLoading, toggleFavorite, recordLaunch, contentCounts } = useKidsContentLoader({
    childId: user?.id,
    familyId: familyId || undefined,
    contentType: activeTab,
    ageGroup: selectedAgeGroup,
  });

  const handleLaunch = (item: KidContentItem) => {
    recordLaunch(item);
    if (item.type === 'game' && item.launchUrl) {
      setActiveGame(item);
    }
  };

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

  // Idle screen - welcome back
  if (isIdle) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted">
        <Card className="max-w-md mx-auto border-2 border-primary/20">
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="text-6xl">👋</div>
            <h2 className="text-2xl font-bold text-foreground">Welcome Back!</h2>
            <p className="text-muted-foreground text-center">
              You were away for a while. Ready to continue?
            </p>
            <Button size="lg" className="gap-2" onClick={() => window.location.reload()}>
              <Play className="h-5 w-5" /> Let's Go!
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      {/* Gate behind assessments + approved plan */}
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
          <div className="flex gap-6">
            <div className="flex-1">
              <KidsProgressHeader profile={childProfile} className="mb-6" />

              {/* Skill Plan Dashboard - primary view */}
              <div className="mb-6">
                <SkillPlanDashboard />
              </div>

              {/* Content grid below the plan */}
              {isLoading ? (
                <KidsLoadingState message="Finding fun stuff..." />
              ) : content.length === 0 ? (
                <KidsEmptyState
                  illustration="exploring"
                  title="No games here yet!"
                  message="Try changing your filters to discover more fun activities."
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {content.map((item) => (
                    <KidsContentCard
                      key={item.id}
                      item={item}
                      onLaunch={handleLaunch}
                      onFavoriteToggle={toggleFavorite}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <AgeGroupMenu
            selectedAgeGroup={selectedAgeGroup}
            onAgeGroupChange={setSelectedAgeGroup}
            contentCounts={contentCounts}
          />
        </KidsPortalLayout>
      </KidsAssessmentGate>

      {/* Embedded Game Viewer */}
      {activeGame && (
        <EmbeddedGameViewer
          game={activeGame}
          childProfile={childProfile}
          familyId={familyId || undefined}
          onClose={() => setActiveGame(null)}
          onComplete={handleGameComplete}
        />
      )}

      {/* Mascot Guide */}
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
