

## Redesign: Admin Kids Catalog Overview

### Design Direction

**Aesthetic**: Industrial-playful hybrid — the admin dark theme (gray-900/800) stays as the structural shell, but the Kids Catalog page introduces warm, child-themed accent panels and data visualization that feels alive rather than sterile. Think "mission control for a children's playground."

**DFII Score**: 11 (Strong)
- Aesthetic Impact: 4 — warm data panels + playful iconography inside admin dark shell
- Context Fit: 4 — autism-focused kids app, admin needs clarity but also connection to child content
- Implementation Feasibility: 4 — uses existing design tokens, shadcn components, ProfessionalIllustration system
- Performance Safety: 3 — no heavy animations, CSS-only effects
- Consistency Risk: -4 — stays within admin layout conventions

**Differentiation**: If screenshotted without the logo, you'd recognize it by the colored domain cards with progress rings, the warm gradient summary strip, and the visual catalog cards (not just tables).

### Key Changes

#### 1. Hero Summary Strip
Replace the three plain Cards with a full-width gradient strip (using existing `--gradient-hero` token adapted for dark mode). Three stat blocks with large numbers, subtle icons, and a warm glow — not cold gray boxes.

#### 2. Visual Game Cards (replacing the Games table)
Switch from a flat table to a responsive card grid for the Games tab. Each card shows:
- Thumbnail (or a colored placeholder with content_type icon)
- Title, age range badge, category
- Tags as small pills
- Link to /games

This makes the catalog feel like the actual content kids see, giving admins real context.

#### 3. Skill Domain Visual Breakdown
Replace the Skills tab table header with colored domain cards (using `getDomainInfo` colors already in the codebase). Each domain gets a card with item count and a small bar showing proportion. The table stays below for detail.

#### 4. Test Coverage Visual Status
Replace the plain test table with status cards showing pass/category badges with colored indicators (green for page tests, blue for hooks, amber for utils). Add the ProfessionalIllustration `analytics` variant as an empty-state illustration.

#### 5. Typography & Spacing
- Page title: larger (text-3xl), with a subtle emoji anchor (keep the existing style but bolder)
- Section headers within tabs: use `text-lg font-semibold` with a left accent border
- More generous padding between sections (space-y-8 instead of space-y-6)

### Implementation Plan

**Single file change**: `src/pages/admin/AdminKidsCatalogOverview.tsx`

1. **Summary strip**: Replace the 3-card grid with a styled banner containing stat blocks with colored left borders (primary for games, secondary for skills, amber for tests)

2. **Games tab**: Add a toggle between table view and card grid view. Card grid uses `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` with cards showing thumbnail placeholder, title, type badge, age range, and tags

3. **Skills tab**: Add colored domain summary cards above the table — each domain gets its own small card with the domain color, icon, count, and percentage bar

4. **Tests tab**: Restyle entries as horizontal status cards instead of table rows, with category color coding and the ProfessionalIllustration component for empty states

5. **Polish**: Consistent use of `rounded-xl`, subtle `border-l-4` accent colors on section headers, and `bg-gray-800/50` card backgrounds that respect the admin dark theme

No changes to AdminLayout, routing, or data fetching logic. All visual only.

