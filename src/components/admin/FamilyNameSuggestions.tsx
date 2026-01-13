import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Shuffle, X, Clock, TrendingUp } from 'lucide-react';

// Family suggestions with weighted categories
const familySuggestions = {
  classic: {
    weight: 3,
    items: [
      '🏡 The Johnsons',
      '👨‍👩‍👧‍👦 The Williams',
      '🌟 The Anderson Family',
      '💎 The Thompson Clan',
      '🏠 The Davis Family',
      '✨ The Miller House',
      '🔹 The Wilson Circle',
      '🌸 The Garcia Family',
      '👑 The Royal Rodriguez',
      '🏆 The Champion Changs'
    ]
  },
  fun: {
    weight: 3,
    items: [
      '🚀 The Space Explorers',
      '🦄 The Rainbow Warriors',
      '🎭 The Drama Queens',
      '🎨 The Creative Crew',
      '🎪 The Circus Masters',
      '🏰 The Castle Builders',
      '🎯 The Goal Achievers',
      '🎵 The Music Makers',
      '🎮 The Gaming Legends',
      '🎪 The Fun Factory'
    ]
  },
  nature: {
    weight: 2,
    items: [
      '🌸 The Blossom Family',
      '🦋 The Butterfly Squad',
      '🌳 The Oak Tree Bunch',
      '🌊 The Ocean Breeze Family',
      '⭐ The Stargazers',
      '🌈 The Rainbow Connection',
      '🌻 The Sunflower Gang',
      '🍃 The Forest Friends',
      '🏔️ The Mountain Climbers',
      '🌙 The Moonlight Clan'
    ]
  },
  adventure: {
    weight: 2,
    items: [
      '🏕️ The Happy Campers',
      '⚽ The Goal Kickers',
      '📚 The Bookworms',
      '🎮 The Game Masters',
      '🏃‍♂️ The Adventure Seekers',
      '🎪 The Fun Bunch',
      '🎳 The Strike Team',
      '🏊‍♀️ The Swimming Squad',
      '🚴‍♂️ The Bike Riders',
      '⛰️ The Trail Blazers'
    ]
  },
  holidays: {
    weight: 1,
    items: [
      '🎄 The Christmas Crew',
      '🎃 The Halloween Heroes',
      '🐰 The Easter Bunnies',
      '🎆 The Fireworks Family',
      '💝 The Valentine Bunch',
      '🍀 The Lucky Leprechauns',
      '🦃 The Thankful Turkeys',
      '👻 The Spooky Squad',
      '🎊 The New Year Ninjas',
      '💖 The Love Birds'
    ]
  },
  occupations: {
    weight: 2,
    items: [
      '👩‍⚕️ The Doctor Dynasty',
      '👩‍🏫 The Teaching Team',
      '👨‍🍳 The Chef Champions',
      '👮‍♀️ The Safety Squad',
      '👨‍💼 The Business Bunch',
      '👩‍🎨 The Artist Clan',
      '👨‍🔧 The Fix-It Family',
      '👩‍✈️ The Flying Squad',
      '👨‍🚒 The Hero House',
      '👩‍💻 The Tech Tribe'
    ]
  },
  colors: {
    weight: 1,
    items: [
      '🔴 The Crimson Crew',
      '🔵 The Blue Bunch',
      '🟢 The Green Gang',
      '🟡 The Golden Group',
      '🟣 The Purple Pack',
      '🟠 The Orange Orchard',
      '⚫ The Midnight Squad',
      '⚪ The Snow White Family',
      '🌈 The Colorful Clan',
      '✨ The Silver Stars'
    ]
  },
  foods: {
    weight: 2,
    items: [
      '🍕 The Pizza Lovers',
      '🍪 The Cookie Monsters',
      '🍦 The Ice Cream Dream Team',
      '🥗 The Healthy Bunch',
      '🍔 The Burger Brigade',
      '🍰 The Sweet Treats',
      '🌮 The Taco Tuesday Tribe',
      '🍜 The Noodle Squad',
      '🥞 The Pancake People',
      '☕ The Coffee Clan'
    ]
  },
  animals: {
    weight: 2,
    items: [
      '🐱 The Cool Cats',
      '🐶 The Dog Pack',
      '🦁 The Lion Pride',
      '🐨 The Koala Crew',
      '🐧 The Penguin Squad',
      '🦅 The Eagle Eye Family',
      '🐰 The Bunny Hop Bunch',
      '🦋 The Butterfly Brigade',
      '🐢 The Turtle Tribe',
      '🦊 The Clever Foxes'
    ]
  },
  silly: {
    weight: 1,
    items: [
      '🤪 The Giggle Squad',
      '🤡 The Laugh Factory',
      '🎈 The Balloon Bunch',
      '🧸 The Teddy Bear Crew',
      '🎉 The Party People',
      '🦸‍♀️ The Superhero Family',
      '🤖 The Robot Regiment',
      '👽 The Alien Alliance',
      '🎪 The Silly Circus',
      '🍌 The Banana Bunch'
    ]
  }
};

// Local storage utilities for recently used suggestions
const RECENT_SUGGESTIONS_KEY = 'family-name-recent-suggestions';
const POPULAR_SUGGESTIONS_KEY = 'family-name-popular-suggestions';

const getRecentSuggestions = (): string[] => {
  try {
    const recent = localStorage.getItem(RECENT_SUGGESTIONS_KEY);
    return recent ? JSON.parse(recent) : [];
  } catch {
    return [];
  }
};

const saveRecentSuggestion = (suggestion: string) => {
  try {
    const recent = getRecentSuggestions();
    const updated = [suggestion, ...recent.filter(s => s !== suggestion)].slice(0, 8);
    localStorage.setItem(RECENT_SUGGESTIONS_KEY, JSON.stringify(updated));
    
    // Also track popularity
    const popular = JSON.parse(localStorage.getItem(POPULAR_SUGGESTIONS_KEY) || '{}');
    popular[suggestion] = (popular[suggestion] || 0) + 1;
    localStorage.setItem(POPULAR_SUGGESTIONS_KEY, JSON.stringify(popular));
  } catch {
    // Ignore localStorage errors
  }
};

const getPopularSuggestions = (): string[] => {
  try {
    const popular = JSON.parse(localStorage.getItem(POPULAR_SUGGESTIONS_KEY) || '{}');
    return Object.entries(popular)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 6)
      .map(([name]) => name);
  } catch {
    return [];
  }
};

// Highlight matching text in suggestions
const highlightMatch = (text: string, search: string) => {
  if (!search.trim()) return text;
  
  const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, index) => 
    regex.test(part) ? (
      <mark key={index} className="bg-primary/20 text-primary rounded px-0.5">
        {part}
      </mark>
    ) : part
  );
};

interface FamilyNameSuggestionsProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function FamilyNameSuggestions({ 
  value, 
  onChange, 
  placeholder = "Enter family display name..." 
}: FamilyNameSuggestionsProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSuggestions, setRecentSuggestions] = useState<string[]>([]);
  const [popularSuggestions, setPopularSuggestions] = useState<string[]>([]);

  // Load recent and popular suggestions on mount
  useEffect(() => {
    setRecentSuggestions(getRecentSuggestions());
    setPopularSuggestions(getPopularSuggestions());
  }, []);

  // Create weighted array for random selection
  const weightedSuggestions = useMemo(() => {
    const weighted: string[] = [];
    Object.entries(familySuggestions).forEach(([, category]) => {
      for (let i = 0; i < category.weight; i++) {
        weighted.push(...category.items);
      }
    });
    return weighted;
  }, []);

  // Filter suggestions based on search
  const getFilteredSuggestions = (suggestions: string[]) => {
    return suggestions.filter(suggestion =>
      suggestion.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  // Generate weighted random suggestion
  const generateRandom = () => {
    const randomSuggestion = weightedSuggestions[Math.floor(Math.random() * weightedSuggestions.length)];
    onChange(randomSuggestion);
    saveRecentSuggestion(randomSuggestion);
    setRecentSuggestions(getRecentSuggestions());
    setPopularSuggestions(getPopularSuggestions());
    setOpen(false);
  };

  const handleSuggestionSelect = (suggestion: string) => {
    onChange(suggestion);
    saveRecentSuggestion(suggestion);
    setRecentSuggestions(getRecentSuggestions());
    setPopularSuggestions(getPopularSuggestions());
    setOpen(false);
  };

  const handleInputChange = (newValue: string) => {
    onChange(newValue);
    setSearchQuery(newValue);
  };

  const handleClear = () => {
    onChange('');
    setSearchQuery('');
  };

  const clearRecentHistory = () => {
    try {
      localStorage.removeItem(RECENT_SUGGESTIONS_KEY);
      localStorage.removeItem(POPULAR_SUGGESTIONS_KEY);
      setRecentSuggestions([]);
      setPopularSuggestions([]);
    } catch {
      // Ignore localStorage errors
    }
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <div className="flex gap-2">
          <PopoverTrigger asChild>
            <div className="flex-1 relative">
              <Input
                value={value}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder={placeholder}
                className="w-full pr-8"
                onFocus={() => setOpen(true)}
              />
              {value && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleClear}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </PopoverTrigger>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={generateRandom}
            className="shrink-0"
            title="Surprise me with a random name!"
          >
            <Shuffle className="h-4 w-4" />
          </Button>
        </div>
        
        <PopoverContent className="w-96 p-0" align="start">
          <Command>
            <CommandList className="max-h-80">
              <CommandEmpty>
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground">No suggestions found.</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={generateRandom}
                    className="mt-2"
                  >
                    <Shuffle className="h-3 w-3 mr-1" />
                    Try random instead
                  </Button>
                </div>
              </CommandEmpty>
              
              {/* Recently Used */}
              {recentSuggestions.length > 0 && (
                <CommandGroup>
                  <div className="flex items-center justify-between px-2 py-1">
                    <div className="flex items-center text-xs font-medium text-muted-foreground">
                      <Clock className="h-3 w-3 mr-1" />
                      Recently Used
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearRecentHistory}
                      className="h-5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Clear
                    </Button>
                  </div>
                  {getFilteredSuggestions(recentSuggestions).map((suggestion) => (
                    <CommandItem
                      key={`recent-${suggestion}`}
                      onSelect={() => handleSuggestionSelect(suggestion)}
                      className="cursor-pointer px-3 py-2"
                    >
                      {highlightMatch(suggestion, searchQuery)}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Popular Suggestions */}
              {popularSuggestions.length > 0 && (
                <CommandGroup>
                  <div className="flex items-center px-2 py-1">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    <span className="text-xs font-medium text-muted-foreground">Popular Choices</span>
                  </div>
                  {getFilteredSuggestions(popularSuggestions).slice(0, 4).map((suggestion) => (
                    <CommandItem
                      key={`popular-${suggestion}`}
                      onSelect={() => handleSuggestionSelect(suggestion)}
                      className="cursor-pointer px-3 py-2"
                    >
                      {highlightMatch(suggestion, searchQuery)}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Category Groups */}
              <CommandGroup heading="🏛️ Classic Families">
                {getFilteredSuggestions(familySuggestions.classic.items).map((suggestion) => (
                  <CommandItem
                    key={suggestion}
                    onSelect={() => handleSuggestionSelect(suggestion)}
                    className="cursor-pointer px-3 py-2"
                  >
                    {highlightMatch(suggestion, searchQuery)}
                  </CommandItem>
                ))}
              </CommandGroup>

              <CommandGroup heading="🎉 Fun & Playful">
                {getFilteredSuggestions(familySuggestions.fun.items).map((suggestion) => (
                  <CommandItem
                    key={suggestion}
                    onSelect={() => handleSuggestionSelect(suggestion)}
                    className="cursor-pointer px-3 py-2"
                  >
                    {highlightMatch(suggestion, searchQuery)}
                  </CommandItem>
                ))}
              </CommandGroup>

              <CommandGroup heading="🌿 Nature Themed">
                {getFilteredSuggestions(familySuggestions.nature.items).map((suggestion) => (
                  <CommandItem
                    key={suggestion}
                    onSelect={() => handleSuggestionSelect(suggestion)}
                    className="cursor-pointer px-3 py-2"
                  >
                    {highlightMatch(suggestion, searchQuery)}
                  </CommandItem>
                ))}
              </CommandGroup>

              <CommandGroup heading="🏃‍♂️ Adventure & Activity">
                {getFilteredSuggestions(familySuggestions.adventure.items).map((suggestion) => (
                  <CommandItem
                    key={suggestion}
                    onSelect={() => handleSuggestionSelect(suggestion)}
                    className="cursor-pointer px-3 py-2"
                  >
                    {highlightMatch(suggestion, searchQuery)}
                  </CommandItem>
                ))}
              </CommandGroup>

              <CommandGroup heading="🎄 Holiday Themes">
                {getFilteredSuggestions(familySuggestions.holidays.items).map((suggestion) => (
                  <CommandItem
                    key={suggestion}
                    onSelect={() => handleSuggestionSelect(suggestion)}
                    className="cursor-pointer px-3 py-2"
                  >
                    {highlightMatch(suggestion, searchQuery)}
                  </CommandItem>
                ))}
              </CommandGroup>

              <CommandGroup heading="👩‍⚕️ Occupation Based">
                {getFilteredSuggestions(familySuggestions.occupations.items).map((suggestion) => (
                  <CommandItem
                    key={suggestion}
                    onSelect={() => handleSuggestionSelect(suggestion)}
                    className="cursor-pointer px-3 py-2"
                  >
                    {highlightMatch(suggestion, searchQuery)}
                  </CommandItem>
                ))}
              </CommandGroup>

              <CommandGroup heading="🌈 Color Themed">
                {getFilteredSuggestions(familySuggestions.colors.items).map((suggestion) => (
                  <CommandItem
                    key={suggestion}
                    onSelect={() => handleSuggestionSelect(suggestion)}
                    className="cursor-pointer px-3 py-2"
                  >
                    {highlightMatch(suggestion, searchQuery)}
                  </CommandItem>
                ))}
              </CommandGroup>

              <CommandGroup heading="🍕 Food Lovers">
                {getFilteredSuggestions(familySuggestions.foods.items).map((suggestion) => (
                  <CommandItem
                    key={suggestion}
                    onSelect={() => handleSuggestionSelect(suggestion)}
                    className="cursor-pointer px-3 py-2"
                  >
                    {highlightMatch(suggestion, searchQuery)}
                  </CommandItem>
                ))}
              </CommandGroup>

              <CommandGroup heading="🐱 Animal Kingdom">
                {getFilteredSuggestions(familySuggestions.animals.items).map((suggestion) => (
                  <CommandItem
                    key={suggestion}
                    onSelect={() => handleSuggestionSelect(suggestion)}
                    className="cursor-pointer px-3 py-2"
                  >
                    {highlightMatch(suggestion, searchQuery)}
                  </CommandItem>
                ))}
              </CommandGroup>

              <CommandGroup heading="🤪 Silly & Humorous">
                {getFilteredSuggestions(familySuggestions.silly.items).map((suggestion) => (
                  <CommandItem
                    key={suggestion}
                    onSelect={() => handleSuggestionSelect(suggestion)}
                    className="cursor-pointer px-3 py-2"
                  >
                    {highlightMatch(suggestion, searchQuery)}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {value && (
        <p className="text-sm text-muted-foreground">
          💡 Preview: This will create a family with code like "FAM-2025-001"
        </p>
      )}
    </div>
  );
}