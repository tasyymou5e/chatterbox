/**
 * Search bar component for the catalog
 */

import React, { useCallback } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

interface CatalogSearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  ageFilter: string;
  onAgeFilterChange: (value: string) => void;
}

export const CatalogSearchBar = React.memo(function CatalogSearchBar({
  searchTerm,
  onSearchChange,
  ageFilter,
  onAgeFilterChange
}: CatalogSearchBarProps) {
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSearchChange(e.target.value);
    },
    [onSearchChange]
  );

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search games, videos, and activities..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="pl-10 text-lg"
          />
        </div>
        <Select value={ageFilter} onValueChange={onAgeFilterChange}>
          <SelectTrigger className="w-full lg:w-48">
            <SelectValue placeholder="Age Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ages</SelectItem>
            <SelectItem value="3-5">Ages 3-5</SelectItem>
            <SelectItem value="6-8">Ages 6-8</SelectItem>
            <SelectItem value="9-12">Ages 9-12</SelectItem>
            <SelectItem value="13+">Ages 13+</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
});

export default CatalogSearchBar;
