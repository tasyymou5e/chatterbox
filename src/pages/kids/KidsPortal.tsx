/**
 * KidsPortal - Main unified portal page for children
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { KidsPortalLayout, KidsContentCard, AgeGroupMenu, KidsProgressHeader, KidsGameLauncher } from '@/components/kids';
import { useKidsContentLoader } from '@/hooks/useKidsContentLoader';
import type { KidContentItem, ContentType, AgeGroup, ChildProfile } from '@/types/kidsPortal';
import { Loader2 } from 'lucide-react';

export default function KidsPortal() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [childProfile, setChildProfile] = useState<ChildProfile | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ContentType>('game');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<AgeGroup | 'all'>('all');
  const [activeGame, setActiveGame] = useState<KidContentItem | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // Load child profile and family
  useEffect(() => {
    async function loadProfile() {
      if (!user?.id) {
        navigate('/auth');
        return;
      }

      try {
        // Get profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar_url, role')
          .eq('id', user.id)
          .single();

        // Get family membership
        const { data: membership } = await supabase
          .from('family_members')
          .select('family_id')
          .eq('user_id', user.id)
          .limit(1)
          .single();

        if (profile) {
          setChildProfile({
            id: profile.id,
            firstName: profile.first_name || 'Friend',
            lastName: profile.last_name || undefined,
            ageGroup: '6-8', // Default, could be from metadata
            avatarUrl: profile.avatar_url || undefined,
            totalStars: 0,
            totalMoons: 0,
          });
        }

        if (membership) {
          setFamilyId(membership.family_id);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setIsLoadingProfile(false);
      }
    }

    loadProfile();
  }, [user?.id, navigate]);

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

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sky-100 to-purple-100">
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
        onClose={() => setActiveGame(null)}
      />
    </>
  );
}
