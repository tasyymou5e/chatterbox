/**
 * KidsPortal - Main unified portal page for children
 * Integrates games, chores, and tasks with progress tracking
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { KidsPortalLayout, KidsContentCard, AgeGroupMenu, KidsProgressHeader, KidsGameLauncher } from '@/components/kids';
import { useKidsContentLoader } from '@/hooks/useKidsContentLoader';
import { useChildProfile } from '@/hooks/useChildProfile';
import { useLessonProgressStore } from '@/stores/lessonProgressStore';
import { cLog } from '@/utils/conditionalLogger';
import type { KidContentItem, ContentType, AgeGroup, ChildProfile } from '@/types/kidsPortal';
import { Loader2 } from 'lucide-react';

export default function KidsPortal() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<ContentType>('game');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<AgeGroup | 'all'>('all');
  const [activeGame, setActiveGame] = useState<KidContentItem | null>(null);

  // Use the new reusable hook for profile loading
  const { profile: baseProfile, familyId, isLoading: isLoadingProfile } = useChildProfile(user?.id);

  // Progress store for real stars/moons
  const { progressByCategory, fetchAllProgress, setUser } = useLessonProgressStore();

  // Initialize progress store when user and family are available
  useEffect(() => {
    if (user?.id && familyId) {
      setUser(user.id, familyId);
      fetchAllProgress();
    }
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
    // Could show a completion summary or trigger additional rewards
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg font-medium text-foreground">Loading your portal...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <KidsPortalLayout
        childProfile={childProfile}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
      >
        <div className="flex gap-6">
          <div className="flex-1">
            <KidsProgressHeader profile={childProfile} className="mb-6" />

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : content.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-xl text-muted-foreground">No content found!</p>
                <p className="text-sm text-muted-foreground mt-2">Try changing your filters.</p>
              </div>
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

      <KidsGameLauncher
        game={activeGame}
        childProfile={childProfile}
        familyId={familyId || undefined}
        onClose={() => setActiveGame(null)}
        onComplete={handleGameComplete}
      />
    </>
  );
}
