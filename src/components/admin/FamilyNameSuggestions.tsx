import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Shuffle } from 'lucide-react';

const familySuggestions = {
  classic: [
    '🏡 The Johnsons',
    '👨‍👩‍👧‍👦 The Williams',
    '🌟 The Anderson Family',
    '💎 The Thompson Clan',
    '🏠 The Davis Family',
    '✨ The Miller House',
    '🔹 The Wilson Circle',
    '🌸 The Garcia Family'
  ],
  fun: [
    '🚀 The Space Explorers',
    '🦄 The Rainbow Warriors',
    '🎭 The Drama Queens',
    '🎨 The Creative Crew',
    '🎪 The Circus Masters',
    '🏰 The Castle Builders',
    '🎯 The Goal Achievers',
    '🎵 The Music Makers'
  ],
  nature: [
    '🌸 The Blossom Family',
    '🦋 The Butterfly Squad',
    '🌳 The Oak Tree Bunch',
    '🌊 The Ocean Breeze Family',
    '⭐ The Stargazers',
    '🌈 The Rainbow Connection',
    '🌻 The Sunflower Gang',
    '🍃 The Forest Friends'
  ],
  adventure: [
    '🏕️ The Happy Campers',
    '⚽ The Goal Kickers',
    '📚 The Bookworms',
    '🍕 The Pizza Lovers',
    '🎮 The Game Masters',
    '🏃‍♂️ The Adventure Seekers',
    '🎪 The Fun Bunch',
    '🎳 The Strike Team'
  ],
  silly: [
    '🤪 The Giggle Squad',
    '🍪 The Cookie Monsters',
    '🦸‍♀️ The Superhero Family',
    '🎈 The Balloon Bunch',
    '🧸 The Teddy Bear Crew',
    '🎉 The Party People',
    '🤡 The Laugh Factory',
    '🍦 The Ice Cream Dream Team'
  ]
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

  const allSuggestions = Object.values(familySuggestions).flat();
  
  const filteredSuggestions = allSuggestions.filter(suggestion =>
    suggestion.toLowerCase().includes(searchQuery.toLowerCase()) ||
    value.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const generateRandom = () => {
    const randomSuggestion = allSuggestions[Math.floor(Math.random() * allSuggestions.length)];
    onChange(randomSuggestion);
    setOpen(false);
  };

  const handleSuggestionSelect = (suggestion: string) => {
    onChange(suggestion);
    setOpen(false);
  };

  const handleInputChange = (newValue: string) => {
    onChange(newValue);
    setSearchQuery(newValue);
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <div className="flex gap-2">
          <PopoverTrigger asChild>
            <div className="flex-1">
              <Input
                value={value}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder={placeholder}
                className="w-full"
                onFocus={() => setOpen(true)}
              />
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
        
        <PopoverContent className="w-80 p-0" align="start">
          <Command>
            <CommandList className="max-h-64">
              <CommandEmpty>No suggestions found.</CommandEmpty>
              
              <CommandGroup heading="🏛️ Classic Families">
                {familySuggestions.classic
                  .filter(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((suggestion) => (
                    <CommandItem
                      key={suggestion}
                      onSelect={() => handleSuggestionSelect(suggestion)}
                      className="cursor-pointer"
                    >
                      {suggestion}
                    </CommandItem>
                  ))}
              </CommandGroup>

              <CommandGroup heading="🎉 Fun & Playful">
                {familySuggestions.fun
                  .filter(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((suggestion) => (
                    <CommandItem
                      key={suggestion}
                      onSelect={() => handleSuggestionSelect(suggestion)}
                      className="cursor-pointer"
                    >
                      {suggestion}
                    </CommandItem>
                  ))}
              </CommandGroup>

              <CommandGroup heading="🌿 Nature Themed">
                {familySuggestions.nature
                  .filter(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((suggestion) => (
                    <CommandItem
                      key={suggestion}
                      onSelect={() => handleSuggestionSelect(suggestion)}
                      className="cursor-pointer"
                    >
                      {suggestion}
                    </CommandItem>
                  ))}
              </CommandGroup>

              <CommandGroup heading="🏃‍♂️ Adventure & Activity">
                {familySuggestions.adventure
                  .filter(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((suggestion) => (
                    <CommandItem
                      key={suggestion}
                      onSelect={() => handleSuggestionSelect(suggestion)}
                      className="cursor-pointer"
                    >
                      {suggestion}
                    </CommandItem>
                  ))}
              </CommandGroup>

              <CommandGroup heading="🤪 Silly & Humorous">
                {familySuggestions.silly
                  .filter(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((suggestion) => (
                    <CommandItem
                      key={suggestion}
                      onSelect={() => handleSuggestionSelect(suggestion)}
                      className="cursor-pointer"
                    >
                      {suggestion}
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