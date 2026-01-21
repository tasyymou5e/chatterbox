/**
 * AgeGroupMenu - Right-side filter panel for age groups
 * Features: collapsible design, content counts, visual icons
 */

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react';
// Button removed - unused
import { Badge } from '@/components/ui/badge';
import type { AgeGroup } from '@/types/kidsPortal';
import { cn } from '@/lib/utils';

interface AgeGroupMenuProps {
  selectedAgeGroup: AgeGroup | 'all';
  onAgeGroupChange: (ageGroup: AgeGroup | 'all') => void;
  contentCounts?: Record<AgeGroup | 'all', number>;
  className?: string;
}

interface AgeOption {
  value: AgeGroup | 'all';
  label: string;
  emoji: string;
  description: string;
}

const ageOptions: AgeOption[] = [
  { value: 'all', label: 'All Ages', emoji: '🌈', description: 'Everything!' },
  { value: '3-5', label: '3-5 years', emoji: '🧸', description: 'Early learners' },
  { value: '6-8', label: '6-8 years', emoji: '🎨', description: 'Explorers' },
  { value: '9-12', label: '9-12 years', emoji: '🚀', description: 'Adventurers' },
  { value: '13+', label: '13+ years', emoji: '⭐', description: 'Teens' },
];

export const AgeGroupMenu: React.FC<AgeGroupMenuProps> = ({
  selectedAgeGroup,
  onAgeGroupChange,
  contentCounts = {},
  className
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div 
      className={cn(
        "fixed right-0 top-1/2 -translate-y-1/2 z-40 transition-all duration-300",
        isCollapsed ? "translate-x-[calc(100%-48px)]" : "translate-x-0",
        className
      )}
    >
      {/* Toggle button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full bg-white dark:bg-slate-800 rounded-l-lg p-2 shadow-lg border border-r-0 border-border"
        aria-label={isCollapsed ? 'Show age filter' : 'Hide age filter'}
      >
        {isCollapsed ? (
          <ChevronLeft className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        )}
      </button>

      {/* Menu panel */}
      <div className="bg-white dark:bg-slate-800 rounded-l-2xl shadow-xl border border-r-0 border-border p-4 w-48">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
          <Filter className="h-4 w-4 text-purple-500" />
          <span className="font-semibold text-sm text-foreground">Age Filter</span>
        </div>

        <div className="space-y-2">
          {ageOptions.map((option) => {
            const isSelected = selectedAgeGroup === option.value;
            const count = contentCounts[option.value] || 0;

            return (
              <button
                key={option.value}
                onClick={() => onAgeGroupChange(option.value)}
                className={cn(
                  "w-full flex items-center gap-3 p-2 rounded-xl transition-all text-left",
                  isSelected 
                    ? "bg-purple-100 dark:bg-purple-900/50 ring-2 ring-purple-400" 
                    : "hover:bg-muted"
                )}
              >
                <span className="text-2xl">{option.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "text-sm font-medium",
                      isSelected ? "text-purple-700 dark:text-purple-300" : "text-foreground"
                    )}>
                      {option.label}
                    </span>
                    {count > 0 && (
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          "text-xs min-w-[24px] justify-center",
                          isSelected && "bg-purple-200 dark:bg-purple-800"
                        )}
                      >
                        {count}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {option.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AgeGroupMenu;
