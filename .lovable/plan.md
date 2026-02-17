

# Bulk Delete for Admin Portal: Users and Families

## Overview

Add checkbox-based multi-select and bulk delete functionality to both the **AdminUsers** and **AdminFamilies** pages. Bulk operations will call the existing edge functions (`admin-delete-user` and `delete-family-comprehensive`) in sequence for each selected item, reusing the proven deletion logic.

---

## What Changes

### 1. New Component: `BulkDeleteConfirmDialog.tsx`

A shared confirmation dialog used by both pages. It shows:
- Count of selected items (e.g., "Delete 5 users")
- Warning about what will be deleted
- A typed confirmation (e.g., type `DELETE 5 USERS`)
- Checkbox to confirm understanding
- Progress indicator during deletion (e.g., "Deleting 3 of 5...")
- Summary of results when complete (successes/failures)

### 2. AdminUsers Page Updates (`AdminUsers.tsx`)

- Add `selectedUserIds` state (Set of user IDs)
- Add a "Select All" checkbox in the table header
- Add individual checkboxes per row
- Show a floating action bar when items are selected: "{N} selected -- [Delete Selected]"
- Wire "Delete Selected" to `BulkDeleteConfirmDialog`
- On confirm, loop through selected IDs calling `admin-delete-user` for each
- Clear selection and refresh list on completion

### 3. AdminFamilies Page Updates (`AdminFamilies.tsx`)

- Add `selectedFamilyIds` state (Set of family IDs)
- Add a "Select All" checkbox next to the families header
- Add individual checkboxes per family row (in the collapsible header)
- Show a floating action bar when items are selected: "{N} selected -- [Delete Selected]"
- Wire "Delete Selected" to `BulkDeleteConfirmDialog`
- On confirm, loop through selected IDs calling `delete-family-comprehensive` for each (with `preserveUserAccounts` based on each family's `is_test_family` flag)
- Clear selection and refresh list on completion

### 4. No Edge Function Changes

The existing `admin-delete-user` and `delete-family-comprehensive` functions already handle full cleanup comprehensively:

**User deletion** cleans up: `user_roles`, `family_members`, `child_accounts`, `profiles`, `auth.users`

**Family deletion** cleans up: all family members, child accounts, the family record (which cascades to 24+ dependent tables), user roles, and optionally auth user accounts

Bulk delete simply calls these sequentially for each selected item.

---

## Technical Details

### Selection State Pattern

```text
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

// Toggle single
const toggleSelection = (id: string) => {
  setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
};

// Select/deselect all (filtered only)
const toggleAll = () => {
  if (selectedIds.size === filteredItems.length) {
    setSelectedIds(new Set());
  } else {
    setSelectedIds(new Set(filteredItems.map(i => i.id)));
  }
};
```

### Bulk Delete Execution Pattern

```text
for (const item of selectedItems) {
  try {
    await supabase.functions.invoke('edge-function', { body: { ... } });
    successCount++;
  } catch {
    failedItems.push(item);
  }
  // Update progress: "Deleting {current} of {total}..."
}
```

### Floating Action Bar

When 1+ items are selected, a sticky bar appears at the bottom of the card:
- Shows count: "3 users selected"
- "Deselect All" button
- "Delete Selected" button (red, destructive)
- Only visible to admin role users

### Safety Guards

- Admin-only: checkboxes and bulk actions only render when `userRole === 'admin'`
- Confirmation dialog requires typing `DELETE {N} USERS` or `DELETE {N} FAMILIES`
- Checkbox acknowledgment required
- Progress shown during deletion (cannot close dialog mid-operation)
- Results summary shows successes and any failures
- Self-deletion prevention: current admin user cannot be selected for deletion

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/admin/BulkDeleteConfirmDialog.tsx` | **Create** -- shared bulk delete confirmation dialog |
| `src/pages/admin/AdminUsers.tsx` | **Modify** -- add selection state, checkboxes, floating bar |
| `src/pages/admin/AdminFamilies.tsx` | **Modify** -- add selection state, checkboxes, floating bar |

No edge function or database changes required.

