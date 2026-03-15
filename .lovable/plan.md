

## Fix: Admin Sidebar Menu Font Color

**Problem**: Menu items use `text-gray-300` at rest, which is too dark against the `bg-gray-800` sidebar background.

**Fix**: Change the resting text color from `text-gray-300` to `text-gray-100` in `AdminSidebar.tsx` (line 142), making items clearly readable without hover.

Also update the group label color from `text-gray-400` to `text-gray-300` (line 118) for consistency.

**File**: `src/components/admin/AdminSidebar.tsx`
- Line 118: `text-gray-400` → `text-gray-300`
- Line 142: `text-gray-300` → `text-gray-100`

