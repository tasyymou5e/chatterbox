/**
 * KidsPortalLayout - Age-appropriate colorful layout for children
 * Features: gradient header, star counter, tab navigation
 */

import React from 'react';
import { Star, Moon, Gamepad2, CheckSquare, Sparkles, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ChildProfile, ContentType } from '@/types/kidsPortal';
import { cn } from '@/lib/utils';

interface KidsPortalLayoutProps {
  childProfile: ChildProfile | null;
  activeTab: ContentType;
  onTabChange: (tab: ContentType) => void;
  onLogout?: () => void;
  children: React.ReactNode;
}

export const KidsPortalLayout: React.FC<KidsPortalLayoutProps> = ({
  childProfile,
  activeTab,
  onTabChange,
  onLogout,
  children
}) => {
  const tabs: { value: ContentType; label: string; icon: React.ReactNode }[] = [
    { value: 'game', label: 'Games', icon: <Gamepad2 className="h-5 w-5" /> },
    { value: 'chore', label: 'My Tasks', icon: <CheckSquare className="h-5 w-5" /> },
    { value: 'activity', label: 'Activities', icon: <Sparkles className="h-5 w-5" /> },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 via-purple-50 to-pink-100 dark:from-slate-900 dark:via-purple-950 dark:to-slate-900">
      {/* Colorful Header */}
      <header className="bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Welcome message */}
            <div className="flex items-center gap-4">
              {childProfile?.avatarUrl ? (
                <img 
                  src={childProfile.avatarUrl} 
                  alt={childProfile.firstName}
                  className="w-12 h-12 rounded-full border-2 border-white/50 shadow-md"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
                  {childProfile?.firstName?.charAt(0) || '?'}
                </div>
              )}
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
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
};

export default KidsPortalLayout;
