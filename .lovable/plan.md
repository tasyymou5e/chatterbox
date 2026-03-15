

## Accessibility Testing Suite — Plan

### Context

This project uses **Playwright** (not Selenium/Python) for E2E testing, with specs in `tests-e2e/`. The request references Selenium + Python + axe-selenium-python, but those don't fit this stack. The correct approach is **@axe-core/playwright**, which provides the same axe-core WCAG engine integrated with the existing Playwright setup.

### What We'll Build

**1. New test file: `tests-e2e/accessibility.spec.ts`**

A standalone Playwright test suite using `@axe-core/playwright` (`AxeBuilder`) that:

- Scans every critical page across all three portals:
  - **Public**: `/`, `/auth`
  - **Admin**: `/admin/login`, `/admin/dashboard`, `/admin/kids-catalog`
  - **Parent**: `/parent-dashboard`
  - **Kids**: `/kids`, `/games`
- Runs axe with tags `['wcag2a', 'wcag2aa', 'best-practice']`
- Asserts zero critical/serious violations (configurable threshold)
- Captures full-page screenshots annotated with violation info on failure
- Outputs JSON results per page for aggregation

**2. Package dependency**

Add `@axe-core/playwright` to devDependencies (the project already has `@storybook/addon-a11y` which bundles axe-core, but we need the Playwright integration package).

**3. Test structure per page**

```typescript
import AxeBuilder from '@axe-core/playwright';

test('Homepage meets WCAG 2.1 AA', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'best-practice'])
    .analyze();

  // Attach JSON results for reporting
  await test.info().attach('a11y-results', {
    body: JSON.stringify(results.violations, null, 2),
    contentType: 'application/json',
  });

  // Fail on critical/serious only
  const serious = results.violations.filter(
    v => v.impact === 'critical' || v.impact === 'serious'
  );
  expect(serious).toEqual([]);
});
```

Each page test will also:
- Run context-limited scans (e.g., just `main`, just modals if present)
- Log violation details: rule ID, impact, description, affected nodes, HTML snippet
- Take screenshot on violation for the HTML report

**4. Admin test dashboard integration**

Add an `AccessibilityResultsCard` component to the Tests tab on the Admin Kids Catalog page (or the admin test dashboard) that:
- Reads stored accessibility scan results (from the Playwright JSON reporter output, imported via the existing `testResultsStore`)
- Shows aggregated a11y score (violations by impact level)
- Lists top violations with affected pages

**5. CI integration**

The existing `playwright.config.ts` already supports CI mode. The new spec file will automatically be picked up. We'll add a Playwright project specifically for a11y if desired, or it runs with the default `chromium` project.

### Files to Create/Edit

| File | Action |
|------|--------|
| `tests-e2e/accessibility.spec.ts` | Create — full accessibility test suite |
| `package.json` | Add `@axe-core/playwright` to devDependencies |
| `src/pages/admin/kids-catalog/TestsTabContent.tsx` | Add accessibility results summary section |

### Key Design Decisions

- **Playwright + axe-core** instead of Selenium + Python — matches the existing test infrastructure
- **Threshold-based failures**: only `critical` and `serious` violations fail the build; `moderate` and `minor` are reported but don't block
- **JSON attachments** per test for the Playwright HTML reporter — no separate reporting infrastructure needed
- **No new edge functions or DB tables** — results live in the Playwright report output and can be imported via the existing `testResultsStore`

