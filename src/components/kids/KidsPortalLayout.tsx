/**
 * KidsPortalLayout - Age-appropriate colorful layout for children
 * Features: gradient header, star counter, tab navigation, customizable avatar, seasonal decorations
 */

import React, { useState } from 'react';
import { Star, Moon, Gamepad2, CheckSquare, Sparkles, LogOut, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ChildProfile, ContentType } from '@/types/kidsPortal';
import type { AvatarConfig, AvatarCustomization } from '@/types/avatar';
import { cn } from '@/lib/utils';
import { AvatarDisplay, AvatarBuilder } from '@/components/avatar';
import { SeasonalDecorations, useSeasonalTheme } from '@/components/illustrations';

interface KidsPortalLayoutProps {
  childProfile: ChildProfile | null;
  activeTab: ContentType;
  onTabChange: (tab: ContentType) => void;
  onLogout?: () => void;
  children: React.ReactNode;
  /** Avatar configuration for the child */
  avatar?: AvatarConfig | null;
  /** Callback when avatar is saved */
  onAvatarSave?: (customization: AvatarCustomization) => Promise<void>;
  /** Callback for avatar upload */
  onAvatarUpload?: (file: File) => Promise<string>;
  /** Whether avatar is being saved */
  isAvatarSaving?: boolean;
}

export const KidsPortalLayout: React.FC<KidsPortalLayoutProps> = ({
  childProfile,
  activeTab,
  onTabChange,
  onLogout,
  children,
  avatar,
  onAvatarSave,
  onAvatarUpload,
  isAvatarSaving = false,
}) => {
  const [isAvatarBuilderOpen, setIsAvatarBuilderOpen] = useState(false);
  
  const tabs: { value: ContentType; label: string; icon: React.ReactNode }[] = [
    { value: 'game', label: 'Games', icon: <Gamepad2 className="h-5 w-5" /> },
    { value: 'chore', label: 'My Tasks', icon: <CheckSquare className="h-5 w-5" /> },
    { value: 'activity', label: 'Activities', icon: <Sparkles className="h-5 w-5" /> },
  ];

  const { holiday } = useSeasonalTheme();
  const isFestive = holiday !== 'none';

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 via-purple-50 to-pink-100 dark:from-slate-900 dark:via-purple-950 dark:to-slate-900 relative overflow-hidden">
      {/* Seasonal Decorations Layer */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <SeasonalDecorations intensity={isFestive ? 'festive' : 'normal'} />
      </div>

      {/* Colorful Header */}
      <header className="relative z-10 bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Avatar and Welcome message */}
            <div className="flex items-center gap-4">
              <div className="relative group">
                <AvatarDisplay
                  avatar={avatar}
                  name={childProfile?.firstName}
                  size="md"
                  onClick={onAvatarSave ? () => setIsAvatarBuilderOpen(true) : undefined}
                  editable={!!onAvatarSave}
                  className="border-2 border-white/50 shadow-md"
                />
                {onAvatarSave && (
                  <button
                    onClick={() => setIsAvatarBuilderOpen(true)}
                    className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Edit avatar"
                  >
                    <Pencil className="w-3 h-3 text-primary" />
                  </button>
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold">
                  Hi, {childProfile?.firstName || 'Friend'}! 👋
                </h1>
                <p className="text-sm text-white/80">
                  Ready to learn and play?
                </p>
              </div>
            </div>

            {/* Center: Progress counters */}
            <div className="hidden md:flex items-center gap-6">
              <div className="flex items-center gap-2 bg-white/20 rounded-full px-4 py-2">
                <Star className="h-5 w-5 text-yellow-300 fill-yellow-300" />
                <span className="font-bold text-lg">{childProfile?.totalStars || 0}</span>
                <span className="text-sm text-white/80">Stars</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 rounded-full px-4 py-2">
                <Moon className="h-5 w-5 text-blue-200 fill-blue-200" />
                <span className="font-bold text-lg">{childProfile?.totalMoons || 0}</span>
                <span className="text-sm text-white/80">Moons</span>
              </div>
              {childProfile?.currentStreak && childProfile.currentStreak > 0 && (
                <div className="flex items-center gap-2 bg-white/20 rounded-full px-4 py-2">
                  <span className="text-xl">🔥</span>
                  <span className="font-bold text-lg">{childProfile.currentStreak}</span>
                  <span className="text-sm text-white/80">Streak</span>
                </div>
              )}
            </div>

            {/* Right: Logout button */}
            {onLogout && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={onLogout}
                className="text-white hover:bg-white/20"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            )}
          </div>

          {/* Mobile progress counters */}
          <div className="flex md:hidden items-center justify-center gap-4 mt-4">
            <div className="flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1.5">
              <Star className="h-4 w-4 text-yellow-300 fill-yellow-300" />
              <span className="font-bold">{childProfile?.totalStars || 0}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1.5">
              <Moon className="h-4 w-4 text-blue-200 fill-blue-200" />
              <span className="font-bold">{childProfile?.totalMoons || 0}</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="container mx-auto px-4 pb-4">
          <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as ContentType)}>
            <TabsList className="w-full bg-white/10 p-1">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-3 text-white/80 data-[state=active]:bg-white data-[state=active]:text-purple-600 rounded-lg transition-all",
                    "text-sm md:text-base font-medium"
                  )}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-4 py-6">
        {children}
      </main>

      {/* Avatar Builder Dialog */}
      {onAvatarSave && (
        <AvatarBuilder
          open={isAvatarBuilderOpen}
          onOpenChange={setIsAvatarBuilderOpen}
          initialCustomization={avatar ? {
            baseCharacter: avatar.baseCharacter,
            skinTone: avatar.skinTone,
            hairColor: avatar.hairColor,
            hairStyle: avatar.hairStyle,
            eyeColor: avatar.eyeColor,
            accessory: avatar.accessory,
            outfitColor: avatar.outfitColor,
          } : undefined}
          onSave={onAvatarSave}
          onUpload={onAvatarUpload}
          isSaving={isAvatarSaving}
          allowUpload={!!onAvatarUpload}
        />
      )}
    </div>
  );
};

export default KidsPortalLayout;
