# Graphics Tech Stack Documentation

> **Last Updated**: 2026-01-22  
> **Auto-Updated**: Yes (via docRegistry)

This document defines the approved graphics libraries and visual asset tools for the Chatterbox platform.

---

## Current Technology Stack

| Category | Current Library | Version | Status |
|----------|----------------|---------|--------|
| Charts | Recharts | ^3.6.0 | ✅ Deeply integrated |
| Icons | Lucide React | ^0.562.0 | ✅ Used in 50+ components |
| UI Components | shadcn/ui (Radix primitives) | Various | ✅ Core architecture |
| Styling | Tailwind CSS | ^3.4.19 | ✅ Foundation |
| Animations | Framer Motion | ^11.x | ✅ Page transitions, gestures |
| Animations | React Spring | ^9.x | ✅ Physics-based motion |

---

## Library-by-Library Analysis

### Charts

<!-- AUTO-GENERATED:START charts-comparison -->
| Library | Bundle Size | Recommendation | Notes |
|---------|-------------|----------------|-------|
| **Recharts (current)** | ~300KB | ✅ Keep | Already integrated with ChartContainer wrapper, HSL theming system, and 6+ chart components |
| react-chartjs-2 | ~200KB | ❌ Not recommended | Would require rebuilding chart theming infrastructure |
| Nivo | ~400KB | ❌ Not recommended | Larger bundle, overkill for needs |
| Victory | ~350KB | ❌ Not recommended | More enterprise-focused, not child-friendly aesthetics |
| ApexCharts | ~450KB | ❌ Not recommended | Heaviest option, complex API |
<!-- AUTO-GENERATED:END charts-comparison -->

**Verdict**: Recharts is optimal. The existing `src/components/ui/chart.tsx` provides CSS variable integration, color sanitization, and consistent styling that would need to be rebuilt with any alternative.

### Icons

<!-- AUTO-GENERATED:START icons-comparison -->
| Library | Icon Count | Recommendation | Notes |
|---------|------------|----------------|-------|
| **Lucide (current)** | 1,400+ | ✅ Keep | Tree-shakeable, consistent stroke weight, clean aesthetic |
| react-icons | 40,000+ | ❌ Not recommended | Mega-bundle, inconsistent styles between icon sets |
| Heroicons | 300+ | 🔶 Consider as supplement | Similar style to Lucide, but smaller set |
| Tabler Icons | 4,000+ | ❌ Not recommended | Would require style normalization |
| Iconoir | 1,300+ | ❌ Not recommended | Similar to Lucide but less popular/maintained |
<!-- AUTO-GENERATED:END icons-comparison -->

**Verdict**: Lucide is the best choice for autism-friendly design. The consistent 2px stroke width and rounded corners align with the calm, approachable aesthetic. If specialty icons are needed, Heroicons is the only compatible supplement.

### Illustrations

<!-- AUTO-GENERATED:START illustrations-comparison -->
| Library | Style | Recommendation | Best For |
|---------|-------|----------------|----------|
| unDraw | Flat/Corporate | ✅ Good for landing pages | Marketing sections |
| Blush | Customizable characters | ✅ Excellent for Kids Portal | Child-friendly scenes |
| Open Doodles | Hand-drawn/Playful | ✅ Best for Kids Portal | Games, empty states |
<!-- AUTO-GENERATED:END illustrations-comparison -->

**Verdict**: For the target audience (children with autism):
- **Open Doodles** for the Kids Portal (playful, non-threatening)
- **unDraw** for parent/admin sections (professional but warm)

### Background Generators

<!-- AUTO-GENERATED:START backgrounds-comparison -->
| Tool | Output Type | Recommendation | Best For |
|------|-------------|----------------|----------|
| BGJar | SVG patterns | ✅ Good | Simple geometric backgrounds |
| Haikei | SVG waves/blobs | ✅ Best fit | Matches soft gradient aesthetic |
| Cool Backgrounds | Various | ✅ Good for variety | Hero sections |
<!-- AUTO-GENERATED:END backgrounds-comparison -->

**Verdict**: Haikei aligns best with the existing design tokens. The `tailwind.config.ts` already defines soft gradients (`--gradient-hero`, `--gradient-card`) and shadows (`--shadow-soft`). Haikei's blob and wave generators complement this aesthetic.

### UI Component Libraries

<!-- AUTO-GENERATED:START ui-comparison -->
| Library | Architecture | Recommendation | Notes |
|---------|--------------|----------------|-------|
| **shadcn/ui (current)** | Radix + Tailwind | ✅ Keep | Foundation of 50+ UI components |
| Mantine | Hooks-first | ❌ Not recommended | Would require complete rewrite |
| Chakra UI | Style props | ❌ Not recommended | Different styling paradigm |
<!-- AUTO-GENERATED:END ui-comparison -->

**Verdict**: Switching from shadcn/ui would be a massive undertaking. The entire component library (`src/components/ui/`) and design system is built on this foundation.

---

## Animation Libraries

### Framer Motion
- **Use For**: Page transitions, modal animations, drag gestures, layout animations, stagger effects
- **Bundle Size**: ~32KB
- **Integration**: `src/lib/animations.ts` contains shared variants

### React Spring
- **Use For**: Physics-based motion, celebration effects, number counters, parallax scrolling
- **Bundle Size**: ~22KB
- **Integration**: Spring configs in `src/lib/animations.ts`

---

## Component Statistics

<!-- AUTO-GENERATED:START component-stats -->
| Metric | Count |
|--------|-------|
| Total UI Components | 50+ |
| Chart Components | 6+ |
| Icon Usage Instances | 100+ |
| Animation Components | 5+ |
<!-- AUTO-GENERATED:END component-stats -->

---

## Final Recommendations Summary

```
┌─────────────────┬──────────────────────────────────────┬─────────────────────┐
│    Category     │           Recommendation             │       Action        │
├─────────────────┼──────────────────────────────────────┼─────────────────────┤
│ Charts          │ Recharts                             │ ✅ No change needed │
│ Icons           │ Lucide                               │ ✅ No change needed │
│ UI Components   │ shadcn/ui                            │ ✅ No change needed │
│ Illustrations   │ Open Doodles (kids) + unDraw (adults)│ 📁 Add as static SVGs│
│ Backgrounds     │ Haikei                               │ 🎨 Generate SVGs    │
│ Animations      │ Framer Motion + React Spring         │ ✅ Integrated       │
└─────────────────┴──────────────────────────────────────┴─────────────────────┘
```

---

## Design Token Integration

All graphics libraries integrate with the design system via:

- **HSL Color Variables**: `hsl(var(--primary))`, `hsl(var(--accent))`
- **Semantic Tokens**: `--background`, `--foreground`, `--muted`
- **Chart Colors**: `--chart-1` through `--chart-5`
- **Gradient Presets**: `--gradient-hero`, `--gradient-card`
- **Shadow System**: `--shadow-soft`, `--shadow-elegant`

---

## Related Documentation

- [COMPONENT_DOCUMENTATION.md](./COMPONENT_DOCUMENTATION.md) - UI component details
- [ARCHITECTURE_DOCUMENTATION.md](./ARCHITECTURE_DOCUMENTATION.md) - Overall architecture
- [BUNDLE_OPTIMIZATION.md](./BUNDLE_OPTIMIZATION.md) - Performance considerations
- [KIDS_PORTAL_DOCUMENTATION.md](./KIDS_PORTAL_DOCUMENTATION.md) - Kids Portal specifics
