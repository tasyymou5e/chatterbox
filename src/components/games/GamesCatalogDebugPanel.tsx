import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

interface GamesCatalogDebugPanelProps {
  isLoading: boolean;
  contentItems: any[];
  categories: any[];
  favorites: string[];
  userFamily: string | null;
  isParent: boolean;
  realtimeConnected: boolean;
  cacheStats: any;
  onCacheReset: () => void;
  onForceRefresh: () => void;
}

export const GamesCatalogDebugPanel: React.FC<GamesCatalogDebugPanelProps> = ({
  isLoading,
  contentItems,
  categories,
  favorites,
  userFamily,
  isParent: _isParent,
  realtimeConnected,
  cacheStats,
  onCacheReset,
  onForceRefresh
}) => {
  const { user } = useAuth();

  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <Card className="mb-6 border-yellow-200 bg-yellow-50">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Debug Panel (Development Only)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* System Status */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="space-y-1">
            <div className="font-medium">Authentication</div>
            <Badge variant={user ? "default" : "destructive"}>
              {user ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
              {user ? 'Signed In' : 'Not Signed In'}
            </Badge>
          </div>
          
          <div className="space-y-1">
            <div className="font-medium">Data Loading</div>
            <Badge variant={isLoading ? "secondary" : "default"}>
              {isLoading ? 'Loading...' : 'Loaded'}
            </Badge>
          </div>
          
          <div className="space-y-1">
            <div className="font-medium">Realtime</div>
            <Badge variant={realtimeConnected ? "default" : "destructive"}>
              {realtimeConnected ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
              {realtimeConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
          
          <div className="space-y-1">
            <div className="font-medium">Family Status</div>
            <Badge variant={userFamily ? "default" : "secondary"}>
              {userFamily ? `Family: ${userFamily.substring(0, 8)}...` : 'No Family'}
            </Badge>
          </div>
        </div>

        {/* Data Counts */}
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div>
            <div className="font-medium">Content Items</div>
            <div className="text-lg font-bold">{contentItems.length}</div>
          </div>
          <div>
            <div className="font-medium">Categories</div>
            <div className="text-lg font-bold">{categories.length}</div>
          </div>
          <div>
            <div className="font-medium">Favorites</div>
            <div className="text-lg font-bold">{favorites.length}</div>
          </div>
        </div>

        {/* Cache Stats */}
        {cacheStats && (
          <div className="text-xs">
            <div className="font-medium mb-1">Cache Statistics</div>
            <div className="bg-white p-2 rounded border">
              <pre className="text-xs">{JSON.stringify(cacheStats, null, 2)}</pre>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onCacheReset}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Reset Cache
          </Button>
          <Button size="sm" variant="outline" onClick={onForceRefresh}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Force Refresh
          </Button>
        </div>

        {/* Error Indicators */}
        <div className="space-y-2 text-xs">
          {!user && (
            <div className="p-2 bg-yellow-100 border border-yellow-300 rounded">
              ⚠️ Not authenticated - some features may not work
            </div>
          )}
          {contentItems.length === 0 && !isLoading && (
            <div className="p-2 bg-red-100 border border-red-300 rounded">
              ❌ No content items loaded - check database connection
            </div>
          )}
          {categories.length === 0 && !isLoading && (
            <div className="p-2 bg-red-100 border border-red-300 rounded">
              ❌ No categories loaded - check database connection
            </div>
          )}
          {!realtimeConnected && (
            <div className="p-2 bg-orange-100 border border-orange-300 rounded">
              ⚠️ Realtime disconnected - updates may be delayed
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};