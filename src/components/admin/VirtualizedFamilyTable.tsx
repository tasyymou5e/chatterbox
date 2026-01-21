/**
 * VirtualizedFamilyTable - High-performance family table with virtualization
 * Uses react-window v2.x List for efficient rendering of large family lists
 */

import { memo, useCallback, useMemo, CSSProperties } from 'react';
import { List } from 'react-window';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Edit, Trash2, Users, Send, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FamilyMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

export interface VirtualizedFamily {
  id: string;
  family_code: string;
  display_name: string;
  created_at: string;
  member_count: number;
  members?: FamilyMember[];
}

interface VirtualizedFamilyTableProps {
  families: VirtualizedFamily[];
  onView: (family: VirtualizedFamily) => void;
  onEdit?: (family: VirtualizedFamily) => void;
  onDelete?: (family: VirtualizedFamily) => void;
  onManageMembers?: (family: VirtualizedFamily) => void;
  onBulkEmail?: (family: VirtualizedFamily) => void;
  isAdmin?: boolean;
  height?: number;
}

const ROW_HEIGHT = 56;
const HEADER_HEIGHT = 48;

interface RowData {
  families: VirtualizedFamily[];
  onView: (family: VirtualizedFamily) => void;
  onEdit?: (family: VirtualizedFamily) => void;
  onDelete?: (family: VirtualizedFamily) => void;
  onManageMembers?: (family: VirtualizedFamily) => void;
  onBulkEmail?: (family: VirtualizedFamily) => void;
  isAdmin: boolean;
}

interface FamilyRowProps {
  ariaAttributes: {
    'aria-posinset': number;
    'aria-setsize': number;
    role: 'listitem';
  };
  index: number;
  style: CSSProperties;
  families: VirtualizedFamily[];
  onView: (family: VirtualizedFamily) => void;
  onEdit?: (family: VirtualizedFamily) => void;
  onDelete?: (family: VirtualizedFamily) => void;
  onManageMembers?: (family: VirtualizedFamily) => void;
  onBulkEmail?: (family: VirtualizedFamily) => void;
  isAdmin: boolean;
}

const FamilyRow = memo(function FamilyRow({
  index,
  style,
  families,
  onView,
  onEdit,
  onDelete,
  onManageMembers,
  onBulkEmail,
  isAdmin,
}: FamilyRowProps) {
  const family = families[index];

  if (!family) return null;

  const hasEmailRecipients = family.members?.some(m => m.email && m.email.trim().length > 0);

  return (
    <div
      style={style}
      className={cn(
        'flex items-center border-b border-border px-4 hover:bg-muted/50 cursor-pointer transition-colors',
        index % 2 === 0 ? 'bg-muted/30' : 'bg-muted/10'
      )}
      onClick={() => onView(family)}
    >
      {/* Expand icon */}
      <div className="w-8 flex items-center text-muted-foreground">
        <ChevronRight className="h-4 w-4" />
      </div>
      
      {/* Family Code */}
      <div className="w-[120px] font-mono text-foreground truncate pr-2">
        {family.family_code}
      </div>
      
      {/* Display Name */}
      <div className="flex-1 min-w-[200px] text-foreground truncate pr-2">
        {family.display_name}
      </div>
      
      {/* Member Count */}
      <div className="w-[120px] pr-2">
        <Badge 
          variant="secondary" 
          className="bg-primary text-primary-foreground"
        >
          {family.member_count} members
        </Badge>
      </div>
      
      {/* Created Date */}
      <div className="w-[120px] text-muted-foreground text-sm">
        {new Date(family.created_at).toLocaleDateString()}
      </div>
      
      {/* Actions */}
      <div className="w-[200px] flex gap-1 justify-end" onClick={e => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onView(family)}
          className="text-primary hover:text-primary/80 hover:bg-muted h-8 w-8 p-0"
          title="View Family"
        >
          <Eye className="h-4 w-4" />
        </Button>
        {isAdmin && onBulkEmail && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onBulkEmail(family)}
            className="text-purple-500 hover:text-purple-400 hover:bg-muted h-8 w-8 p-0"
            title="Email Family Members"
            disabled={!hasEmailRecipients}
          >
            <Send className="h-4 w-4" />
          </Button>
        )}
        {isAdmin && onEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(family)}
            className="text-green-500 hover:text-green-400 hover:bg-muted h-8 w-8 p-0"
            title="Edit Family"
          >
            <Edit className="h-4 w-4" />
          </Button>
        )}
        {isAdmin && onManageMembers && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onManageMembers(family)}
            className="text-primary hover:text-primary/80 hover:bg-muted h-8 w-8 p-0"
            title="Manage Members"
          >
            <Users className="h-4 w-4" />
          </Button>
        )}
        {isAdmin && onDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(family)}
            className="text-destructive hover:text-destructive/80 hover:bg-muted h-8 w-8 p-0"
            title="Delete Family"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
});

function VirtualizedFamilyTableComponent({
  families,
  onView,
  onEdit,
  onDelete,
  onManageMembers,
  onBulkEmail,
  isAdmin = false,
  height = 500,
}: VirtualizedFamilyTableProps) {
  // Memoize row props to pass to each row
  const rowProps = useMemo<RowData>(() => ({
    families,
    onView,
    onEdit,
    onDelete,
    onManageMembers,
    onBulkEmail,
    isAdmin,
  }), [families, onView, onEdit, onDelete, onManageMembers, onBulkEmail, isAdmin]);

  // Row component that receives react-window props and our custom props
  const RowComponent = useCallback((props: {
    ariaAttributes: { 'aria-posinset': number; 'aria-setsize': number; role: 'listitem' };
    index: number;
    style: CSSProperties;
  } & RowData) => {
    return <FamilyRow {...props} />;
  }, []);

  if (families.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No families found
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
        <div className="w-8" />
        <div className="w-[120px] text-muted-foreground font-medium text-sm">Code</div>
        <div className="flex-1 min-w-[200px] text-muted-foreground font-medium text-sm">Name</div>
        <div className="w-[120px] text-muted-foreground font-medium text-sm">Members</div>
        <div className="w-[120px] text-muted-foreground font-medium text-sm">Created</div>
        <div className="w-[200px] text-muted-foreground font-medium text-sm text-right">Actions</div>
      </div>

      {/* Virtualized List */}
      <List
        style={{ height: Math.min(height, families.length * ROW_HEIGHT) }}
        rowCount={families.length}
        rowHeight={ROW_HEIGHT}
        rowComponent={RowComponent}
        rowProps={rowProps}
        overscanCount={5}
      />

      {/* Performance indicator */}
      {families.length > 50 && (
        <div className="bg-muted/30 px-4 py-2 text-xs text-muted-foreground text-center border-t border-border">
          Showing {families.length} families with virtual scrolling
        </div>
      )}
    </div>
  );
}

export const VirtualizedFamilyTable = memo(VirtualizedFamilyTableComponent);
export default VirtualizedFamilyTable;
