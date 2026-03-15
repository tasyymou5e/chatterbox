

## Plan: Admin Portal — Left Sidebar with Accordion Navigation

### Problem
The admin portal has 15 navigation links crammed into a horizontal top bar. They overflow on most screens and waste vertical space. Moving to a collapsible left sidebar with grouped accordion sections solves both issues.

### What Changes

**1. New file: `src/components/admin/AdminSidebar.tsx`**

A sidebar component using the existing `Sidebar` from `src/components/ui/sidebar.tsx` with accordion-style groups:

| Group | Items |
|-------|-------|
| **Overview** | Dashboard |
| **Management** | Families, Users, Content |
| **Analytics** | Reports, Kids Catalog |
| **Monitoring** | System Monitoring, LLM Monitor, Uptime Report, Logs Triage |
| **Security & Health** | Security Center, Integrity, Data Health, Auto-Repair |
| **Resources** | Architecture Ebook |

Each group uses `SidebarGroup` with `Collapsible` for expand/collapse. Active route's group stays open by default. Icons preserved from current nav. Collapsed mode shows icons only.

**2. Edit: `src/pages/admin/AdminLayout.tsx`**

- Wrap content in `SidebarProvider`
- Replace the top `<nav>` bar with `<AdminSidebar />`
- Add a slim top header containing: logo, `SidebarTrigger`, user email, sign-out button
- Main content uses `flex-1` alongside the sidebar
- Remove `max-w-7xl` constraint on main content (sidebar already constrains width)

### Layout Structure
```text
┌──────────────────────────────────────────┐
│ [≡] Admin Portal          user@email [→]│  ← slim header
├────────┬─────────────────────────────────┤
│Overview│                                 │
│ Dashboard                                │
│Mgmt    │        <Outlet />               │
│ Families│       (page content)           │
│ Users  │                                 │
│ Content│                                 │
│Analytics                                 │
│ Reports│                                 │
│ Kids.. │                                 │
│Monitor │                                 │
│ System │                                 │
│ LLM    │                                 │
│ ...    │                                 │
├────────┤                                 │
│Security│                                 │
│ ...    │                                 │
└────────┴─────────────────────────────────┘
```

### Files
| File | Action |
|------|--------|
| `src/components/admin/AdminSidebar.tsx` | Create — grouped accordion sidebar |
| `src/pages/admin/AdminLayout.tsx` | Rewrite — sidebar layout with slim header |

### Technical Notes
- Uses existing `SidebarProvider`, `Sidebar`, `SidebarGroup`, `SidebarMenu*`, `SidebarTrigger`, `SidebarRail` from `src/components/ui/sidebar.tsx`
- Uses existing `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` for accordion groups
- Active route detection via `useLocation` + `startsWith` for group auto-expand
- `collapsible="icon"` mode so sidebar shrinks to icon strip rather than disappearing
- Dark theme maintained: `bg-gray-800` sidebar, `bg-gray-900` content area
- No routing changes — all paths remain identical
- No changes to parent or kids portals

