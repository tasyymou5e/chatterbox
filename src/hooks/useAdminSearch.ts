/**
 * Server-Side Search with Caching for Admin Portal
 * Replaces client-side filtering with efficient database queries
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Filter, 
  RefreshCw, 
  Loader2, 
  X,
  Clock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/admin/SkeletonLoading';

interface SearchFilters {
  query: string;
  role: string;
  status: 'active' | 'inactive' | 'all';
  familyId?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

interface SearchResult {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  roles: string[];
  families: { family_code: string; display_name: string }[];
  created_at: string;
  last_login?: string;
  status: 'active' | 'inactive';
  matchScore: number;
}

interface SearchStats {
  total: number;
  filtered: number;
  searchTime: number;
  cacheHit: boolean;
}

interface SearchCache {
  results: SearchResult[];
  timestamp: number;
  query: string;
  filters: string;
}

const useAdminSearch = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    role: 'all',
    status: 'all'
  });
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [debouncing, setDebouncing] = useState(false);
  const [cache, setCache] = useState<Map<string, SearchCache>>(new Map());
  const [stats, setStats] = useState<SearchStats>({
    total: 0,
    filtered: 0,
    searchTime: 0,
    cacheHit: false
  });
  
  const { toast } = useToast();

  // Cache management
  const getCacheKey = useCallback((query: string, filterString: string) => {
    return `${query}:${filterString}`;
  }, []);

  const getFromCache = useCallback((key: string) => {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < 300000) { // 5 minutes cache
      return cached;
    }
    return null;
  }, [cache]);

  const setCacheEntry = useCallback((key: string, data: SearchResult[]) => {
    const newCache = new Map(cache);
    newCache.set(key, {
      results: data,
      timestamp: Date.now(),
      query: filters.query,
      filters: key.split(':')[1]
    });
    setCache(newCache);
  }, [cache, filters]);

  // Search function with server-side filtering and caching
  const performSearch = useCallback(async () => {
    if (!filters.query.trim()) {
      setResults([]);
      setStats(prev => ({ ...prev, filtered: 0, cacheHit: false }));
      return;
    }

    const startTime = Date.now();
    setDebouncing(true);
    setLoading(true);

    try {
      const filterString = `${filters.role}:${filters.status}:${filters.familyId || ''}`;
      const cacheKey = getCacheKey(filters.query, filterString);
      
      // Check cache first
      const cachedResults = getFromCache(cacheKey);
      if (cachedResults) {
        setResults(cachedResults.results);
        setStats({
          total: cachedResults.results.length,
          filtered: cachedResults.results.length,
          searchTime: Date.now() - startTime,
          cacheHit: true
        });
        return;
      }

      // Server-side search with advanced query
      const { data, error } = await supabase.rpc('admin_search_users', {
        search_query: filters.query,
        role_filter: filters.role === 'all' ? null : filters.role,
        status_filter: filters.status === 'all' ? null : filters.status,
        family_id_filter: filters.familyId || null,
        limit: 100,
        offset: 0,
        include_ranking: true
      });

      if (error) {
        throw error;
      }

      const searchResults = data || [];
      setResults(searchResults);
      
      // Cache the results
      setCacheEntry(cacheKey, searchResults);
      
      const searchTime = Date.now() - startTime;
      setStats({
        total: searchResults.length,
        filtered: searchResults.length,
        searchTime,
        cacheHit: false
      });

      toast({
        title: 'Search Complete',
        description: `Found ${searchResults.length} users in ${searchTime}ms`,
        variant: 'default'
      });

    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: 'Search Failed',
        description: 'Failed to perform search. Please try again.',
        variant: 'destructive'
      });
      setResults([]);
    } finally {
      setLoading(false);
      setDebouncing(false);
    }
  }, [filters, getCacheKey, getFromCache, setCacheEntry, toast]);

  // Debounced search
  const debouncedSearch = useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    return () => {
      clearTimeout(timeoutId);
      setDebouncing(true);
      timeoutId = setTimeout(() => {
        performSearch();
      }, 300); // 300ms debounce
    };
  }, [performSearch]);

  // Handle search input change
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    setFilters(prev => ({ ...prev, query: value }));
    debouncedSearch();
  }, [debouncedSearch]);

  // Handle filter change
  const handleFilterChange = useCallback((filterType: keyof SearchFilters, value: string) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
    debouncedSearch();
  }, [debouncedSearch]);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setFilters({
      query: '',
      role: 'all',
      status: 'all'
    });
    setResults([]);
    setStats({
      total: 0,
      filtered: 0,
      searchTime: 0,
      cacheHit: false
    });
  }, []);

  // Highlight matching text
  const highlightMatch = useCallback((text: string, query: string) => {
    if (!query || !text) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>');
  }, []);

  // Perform initial search if query exists
  useEffect(() => {
    if (filters.query.trim()) {
      performSearch();
    }
  }, []);

  return {
    searchTerm,
    filters,
    results,
    loading,
    debouncing,
    stats,
    handleSearchChange,
    handleFilterChange,
    clearSearch,
    highlightMatch
  };
};

export default useAdminSearch;

// Server-side search UI component
export const AdvancedSearch: React.FC<{
  onSearch: (query: string) => void;
  onFilterChange: (filterType: keyof SearchFilters, value: string) => void;
  loading: boolean;
  stats: SearchStats;
  searchTerm: string;
}> = ({ onSearch, onFilterChange, loading, stats, searchTerm }) => {
  return (
    <div className="bg-gray-800 border-gray-700 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-medium flex items-center">
          <Search className="h-4 w-4 mr-2" />
          Advanced Search
        </h3>
        {stats.searchTime > 0 && (
          <Badge variant="outline" className="text-gray-300 border-gray-600">
            <Clock className="h-3 w-3 mr-1" />
            {stats.searchTime}ms
            {stats.cacheHit && ' (cached)'}
          </Badge>
        )}
      </div>
      
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search users by name, email, or family code..."
            value={searchTerm}
            onChange={(e) => onSearch(e.target.value)}
            className="pl-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
          />
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSearch('')}
          className="border-gray-600 text-gray-300 hover:bg-gray-700"
        >
          <X className="h-4 w-4" />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSearch(searchTerm)}
          disabled={loading}
          className="border-gray-600 text-gray-300 hover:bg-gray-700"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Role
          </label>
          <Select onValueChange={(value) => onFilterChange('role', value)}>
            <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent className="bg-gray-700 border-gray-600">
              <SelectItem value="all" className="text-white">All Roles</SelectItem>
              <SelectItem value="admin" className="text-white">Admins</SelectItem>
              <SelectItem value="read_only" className="text-white">Read Only</SelectItem>
              <SelectItem value="parent" className="text-white">Parents</SelectItem>
              <SelectItem value="child" className="text-white">Children</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Status
          </label>
          <Select onValueChange={(value) => onFilterChange('status', value)}>
            <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent className="bg-gray-700 border-gray-600">
              <SelectItem value="all" className="text-white">All Status</SelectItem>
              <SelectItem value="active" className="text-white">Active</SelectItem>
              <SelectItem value="inactive" className="text-white">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Search Results Summary */}
      {stats.total > 0 && (
        <div className="bg-gray-700 rounded p-3 text-sm text-gray-300">
          <div className="flex justify-between items-center">
            <span>Found {stats.filtered} of {stats.total} users</span>
            {stats.cacheHit && (
              <Badge variant="secondary" className="ml-2">
                Cached
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Search Performance Stats */}
      <div className="text-xs text-gray-400 space-y-1">
        <div className="flex justify-between">
          <span>Search Time: {stats.searchTime}ms</span>
          <span>Cache: {stats.cacheHit ? 'Hit' : 'Miss'}</span>
        </div>
      </div>
    </div>
  );
};