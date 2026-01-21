/**
 * VirtualizedUserTable - High-performance user table with virtualization
 * Uses react-window v2.x List for efficient rendering of large user lists
 */

import { memo, useCallback, useMemo, CSSProperties } from 'react';
import { List } from 'react-window';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Edit, Trash2, Key } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface VirtualizedUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  created_at: string;
  roles: string[];
  families: { family_code: string; display_name: string }[];
}

interface VirtualizedUserTableProps {
  users: VirtualizedUser[];
  onView: (user: VirtualizedUser) => void;
  onEdit?: (user: VirtualizedUser) => void;
  onDelete?: (user: VirtualizedUser) => void;
  onPasswordReset?: (user: VirtualizedUser) => void;
  isAdmin?: boolean;
  height?: number;
}

const ROW_HEIGHT = 64;
const HEADER_HEIGHT = 48;

const getRoleBadgeColor = (role: string): string => {
  switch (role) {
    case 'admin': return 'bg-destructive';
    case 'read_only': return 'bg-purple-600';
    case 'parent': return 'bg-primary';
    case 'child': return 'bg-green-600';
    default: return 'bg-muted';
  }
};

interface RowData {
  users: VirtualizedUser[];
  onView: (user: VirtualizedUser) => void;
  onEdit?: (user: VirtualizedUser) => void;
  onDelete?: (user: VirtualizedUser) => void;
  onPasswordReset?: (user: VirtualizedUser) => void;
  isAdmin: boolean;
}

interface UserRowProps {
  ariaAttributes: {
    'aria-posinset': number;
    'aria-setsize': number;
    role: 'listitem';
  };
  index: number;
  style: CSSProperties;
  users: VirtualizedUser[];
  onView: (user: VirtualizedUser) => void;
  onEdit?: (user: VirtualizedUser) => void;
  onDelete?: (user: VirtualizedUser) => void;
  onPasswordReset?: (user: VirtualizedUser) => void;
  isAdmin: boolean;
}

const UserRow = memo(function UserRow({
  index,
  style,
  users,
  onView,
  onEdit,
  onDelete,
  onPasswordReset,
  isAdmin,
}: UserRowProps) {
  const user = users[index];

  if (!user) return null;

  return (
    <div
      style={style}
      className={cn(
        'flex items-center border-b border-border px-4',
        index % 2 === 0 ? 'bg-muted/30' : 'bg-muted/10'
      )}
    >
      {/* Name */}
      <div className="flex-1 min-w-[150px] text-foreground truncate pr-2">
        {user.first_name} {user.last_name}
      </div>
      
      {/* Email */}
      <div className="flex-1 min-w-[200px] text-muted-foreground font-mono text-sm truncate pr-2">
        {user.email}
      </div>
      
      {/* Roles */}
      <div className="w-[140px] flex flex-wrap gap-1 pr-2">
        {user.roles.slice(0, 2).map((role) => (
          <Badge
            key={role}
            variant="secondary"
            className={cn(getRoleBadgeColor(role), 'text-white text-xs')}
          >
            {role}
          </Badge>
        ))}
        {user.roles.length > 2 && (
          <Badge variant="outline" className="text-muted-foreground text-xs">
            +{user.roles.length - 2}
          </Badge>
        )}
      </div>
      
      {/* Families */}
      <div className="w-[120px] flex flex-wrap gap-1 pr-2">
        {user.families.slice(0, 1).map((family, idx) => (
          <Badge
            key={idx}
            variant="outline"
            className="border-border text-muted-foreground text-xs"
          >
            {family.family_code}
          </Badge>
        ))}
        {user.families.length > 1 && (
          <Badge variant="outline" className="text-muted-foreground text-xs">
            +{user.families.length - 1}
          </Badge>
        )}
      </div>
      
      {/* Joined */}
      <div className="w-[100px] text-muted-foreground text-sm">
        {new Date(user.created_at).toLocaleDateString()}
      </div>
      
      {/* Actions */}
      <div className="w-[150px] flex gap-1 justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onView(user)}
          className="text-primary hover:text-primary/80 hover:bg-muted h-8 w-8 p-0"
          title="View User"
        >
          <Eye className="h-4 w-4" />
        </Button>
        {isAdmin && onEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(user)}
            className="text-green-500 hover:text-green-400 hover:bg-muted h-8 w-8 p-0"
            title="Edit User"
          >
            <Edit className="h-4 w-4" />
          </Button>
        )}
        {isAdmin && onPasswordReset && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPasswordReset(user)}
            className="text-yellow-500 hover:text-yellow-400 hover:bg-muted h-8 w-8 p-0"
            title="Reset Password"
          >
            <Key className="h-4 w-4" />
          </Button>
        )}
        {isAdmin && onDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(user)}
            className="text-destructive hover:text-destructive/80 hover:bg-muted h-8 w-8 p-0"
            title="Delete User"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
});

function VirtualizedUserTableComponent({
  users,
  onView,
  onEdit,
  onDelete,
  onPasswordReset,
  isAdmin = false,
  height = 500,
}: VirtualizedUserTableProps) {
  // Memoize row props to pass to each row
  const rowProps = useMemo<RowData>(() => ({
    users,
    onView,
    onEdit,
    onDelete,
    onPasswordReset,
    isAdmin,
  }), [users, onView, onEdit, onDelete, onPasswordReset, isAdmin]);

  // Row component that receives react-window props and our custom props
  const RowComponent = useCallback((props: {
    ariaAttributes: { 'aria-posinset': number; 'aria-setsize': number; role: 'listitem' };
    index: number;
    style: CSSProperties;
  } & RowData) => {
    return <UserRow {...props} />;
  }, []);

  if (users.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No users found
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div 
        className="flex items-center bg-muted/50 px-4 border-b border-border"
        style={{ height: HEADER_HEIGHT }}
      >
        <div className="flex-1 min-w-[150px] text-muted-foreground font-medium text-sm">Name</div>
        <div className="flex-1 min-w-[200px] text-muted-foreground font-medium text-sm">Email</div>
        <div className="w-[140px] text-muted-foreground font-medium text-sm">Roles</div>
        <div className="w-[120px] text-muted-foreground font-medium text-sm">Families</div>
        <div className="w-[100px] text-muted-foreground font-medium text-sm">Joined</div>
        <div className="w-[150px] text-muted-foreground font-medium text-sm text-right">Actions</div>
      </div>

      {/* Virtualized List */}
      <List
        style={{ height: Math.min(height, users.length * ROW_HEIGHT) }}
        rowCount={users.length}
        rowHeight={ROW_HEIGHT}
        rowComponent={RowComponent}
        rowProps={rowProps}
        overscanCount={5}
      />

      {/* Performance indicator */}
      {users.length > 100 && (
        <div className="bg-muted/30 px-4 py-2 text-xs text-muted-foreground text-center border-t border-border">
          Showing {users.length} users with virtual scrolling
        </div>
      )}
    </div>
  );
}

export const VirtualizedUserTable = memo(VirtualizedUserTableComponent);
export default VirtualizedUserTable;
