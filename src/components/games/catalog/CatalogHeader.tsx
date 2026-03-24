/**
 * Catalog header component with title, description, and status badges
 */

import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface CatalogHeaderProps {
  isAuthenticated: boolean;
  realtimeConnected: boolean;
  userFamily: string | null;
  isParent: boolean;
  showCuration: boolean;
  onToggleCuration: () => void;
  useVirtualScrolling: boolean;
  onToggleVirtualScrolling: () => void;
  isDevelopment: boolean;
}

export const CatalogHeader = React.memo(function CatalogHeader({
  isAuthenticated,
  realtimeConnected,
  userFamily,
  isParent,
  showCuration,
  onToggleCuration,
  useVirtualScrolling,
  onToggleVirtualScrolling,
  isDevelopment
}: CatalogHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="text-center mb-8">
      <h1 className="text-4xl font-bold text-primary mb-4">
        🎮 Games & Activities Catalog
      </h1>
      <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
        Discover educational games, videos, and interactive content designed for children with autism and special needs
      </p>
      
      {/* Authentication Status */}
      {!isAuthenticated && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg mt-4 max-w-md mx-auto flex items-center justify-between gap-3">
          <p className="text-sm">
            <strong>Sign in</strong> to save favorites and unlock family-specific activities.
          </p>
          <Button size="sm" onClick={() => navigate('/auth?tab=signin')}>
            Sign In
          </Button>
        </div>
      )}
      
      <div className="flex flex-wrap justify-center gap-2 mt-4">
        {realtimeConnected && (
          <div className="text-xs text-green-600 bg-green-50 px-3 py-1 rounded-full">
            ✓ {userFamily ? 'Family channel' : 'Global channel'} active
          </div>
        )}
        {userFamily && (
          <div className="text-xs text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
            👨‍👩‍👧‍👦 Family content enabled
          </div>
        )}
        {isParent && (
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleCuration}
            className="text-xs"
          >
            {showCuration ? 'Hide' : 'Show'} Content Management
          </Button>
        )}
        {isDevelopment && (
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleVirtualScrolling}
            className="text-xs"
          >
            {useVirtualScrolling ? 'Disable' : 'Enable'} Virtual Scrolling
          </Button>
        )}
      </div>
    </div>
  );
});

export default CatalogHeader;
