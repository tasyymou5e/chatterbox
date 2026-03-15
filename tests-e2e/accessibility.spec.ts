/**
 * Accessibility Testing Suite
 *
 * @description Comprehensive WCAG 2.1/2.2 AA automated checks using axe-core.
 * Scans all critical pages across Public, Admin, Parent, and Kids portals.
 *
 * Run standalone:   npx playwright test accessibility
 * Run with suite:   npx playwright test
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/* ------------------------------------------------------------------ */
/*  Configuration                                                      */
/* ------------------------------------------------------------------ */

/** Violation impacts that cause the test to fail */
const FAIL_IMPACTS: string[] = ['critical', 'serious'];

/** axe-core rule tags to include */
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'best-practice'];

/** Pages to scan, grouped by portal */
const PAGES: { portal: string; path: string; label: string; context?: string }[] = [
  // Public
  { portal: 'public', path: '/', label: 'Homepage' },
  { portal: 'public', path: '/auth', label: 'Auth Page' },

  // Admin
  { portal: 'admin', path: '/admin/login', label: 'Admin Login' },
  { portal: 'admin', path: '/admin/dashboard', label: 'Admin Dashboard' },
  { portal: 'admin', path: '/admin/kids-catalog', label: 'Admin Kids Catalog' },

  // Parent
  { portal: 'parent', path: '/parent-dashboard', label: 'Parent Dashboard' },

  // Kids
  { portal: 'kids', path: '/kids', label: 'Kids Portal' },
  { portal: 'kids', path: '/games', label: 'Games Page' },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

interface AxeViolation {
  id: string;
  impact?: string;
  description: string;
  helpUrl: string;
  nodes: { html: string; target: string[] }[];
}

/** Build a human-readable summary string from violations */
function formatViolationSummary(violations: AxeViolation[]): string {
  if (violations.length === 0) return 'No violations found ✅';

  return violations
    .map(
      (v, i) =>
        `${i + 1}. [${(v.impact || 'unknown').toUpperCase()}] ${v.id}\n` +
        `   ${v.description}\n` +
        `   Affected nodes: ${v.nodes.length}\n` +
        `   Help: ${v.helpUrl}\n` +
        v.nodes
          .slice(0, 3)
          .map((n) => `     → ${n.target.join(' > ')}\n       ${n.html.slice(0, 120)}`)
          .join('\n'),
    )
    .join('\n\n');
}

/** Filter violations by fail-worthy impact levels */
function getFailingViolations(violations: AxeViolation[]): AxeViolation[] {
  return violations.filter((v) => FAIL_IMPACTS.includes(v.impact || ''));
}

/* ------------------------------------------------------------------ */
/*  Full-page accessibility scans                                      */
/* ------------------------------------------------------------------ */

test.describe('Accessibility — Full Page Scans', () => {
  for (const page_ of PAGES) {
    test(`[${page_.portal}] ${page_.label} (${page_.path}) meets WCAG 2.1 AA`, async ({
      page,
    }) => {
      // Navigate & wait for network idle
      await page.goto(page_.path, { waitUntil: 'networkidle' });

      // Run axe analysis
      const results = await new AxeBuilder({ page })
        .withTags(AXE_TAGS)
        .analyze();

      // Attach full JSON results to the Playwright report
      await test.info().attach(`a11y-results-${page_.portal}-${page_.label}`, {
        body: JSON.stringify(
          {
            url: page_.path,
            portal: page_.portal,
            timestamp: new Date().toISOString(),
            violationCount: results.violations.length,
            violations: results.violations,
            passes: results.passes.length,
            incomplete: results.incomplete.length,
            inapplicable: results.inapplicable.length,
          },
          null,
          2,
        ),
        contentType: 'application/json',
      });

      // Attach human-readable summary
      await test.info().attach(`a11y-summary-${page_.label}`, {
        body: formatViolationSummary(results.violations as AxeViolation[]),
        contentType: 'text/plain',
      });

      // Screenshot on any violations for visual debugging
      if (results.violations.length > 0) {
        await page.screenshot({
          path: `playwright-report/a11y-${page_.portal}-${page_.label.replace(/\s/g, '-')}.png`,
          fullPage: true,
        });
      }

      // Assert: only fail on critical/serious violations
      const failing = getFailingViolations(results.violations as AxeViolation[]);
      expect(
        failing,
        `${failing.length} critical/serious a11y violation(s) on ${page_.label}:\n${formatViolationSummary(failing)}`,
      ).toEqual([]);
    });
  }
});

/* ------------------------------------------------------------------ */
/*  Context-limited scans (main content area)                          */
/* ------------------------------------------------------------------ */

test.describe('Accessibility — Main Content Area Scans', () => {
  const contextPages = PAGES.filter((p) =>
    ['/', '/admin/dashboard', '/admin/kids-catalog', '/kids', '/games'].includes(p.path),
  );

  for (const page_ of contextPages) {
    test(`[${page_.portal}] ${page_.label} — main content region`, async ({ page }) => {
      await page.goto(page_.path, { waitUntil: 'networkidle' });

      // Only scan <main> if it exists, otherwise fall back to full document
      const hasMain = (await page.locator('main').count()) > 0;

      const builder = new AxeBuilder({ page }).withTags(AXE_TAGS);
      if (hasMain) {
        builder.include('main');
      }

      const results = await builder.analyze();

      await test.info().attach(`a11y-main-${page_.label}`, {
        body: JSON.stringify(
          {
            url: page_.path,
            context: hasMain ? 'main' : 'document',
            violations: results.violations,
          },
          null,
          2,
        ),
        contentType: 'application/json',
      });

      const failing = getFailingViolations(results.violations as AxeViolation[]);
      expect(
        failing,
        `${failing.length} critical/serious a11y violation(s) in main content of ${page_.label}`,
      ).toEqual([]);
    });
  }
});

/* ------------------------------------------------------------------ */
/*  Keyboard navigation checks                                        */
/* ------------------------------------------------------------------ */

test.describe('Accessibility — Keyboard Navigation', () => {
  test('Auth page — all interactive elements reachable via Tab', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'networkidle' });

    // Tab through the page and collect focused elements
    const focusedElements: string[] = [];

    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      const tag = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const role = el.getAttribute('role') || el.tagName.toLowerCase();
        const label =
          el.getAttribute('aria-label') ||
          el.getAttribute('name') ||
          el.textContent?.trim().slice(0, 30) ||
          '';
        return `${role}: ${label}`;
      });
      if (tag) focusedElements.push(tag);
    }

    await test.info().attach('keyboard-nav-auth', {
      body: JSON.stringify(focusedElements, null, 2),
      contentType: 'application/json',
    });

    // Expect at least some interactive elements to be focusable
    expect(focusedElements.length).toBeGreaterThan(0);
  });

  test('Homepage — visible focus indicators on Tab', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Check that the focused element has a visible outline or ring
    const hasFocusStyle = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return false;
      const styles = window.getComputedStyle(el);
      const outline = styles.outlineStyle;
      const boxShadow = styles.boxShadow;
      return (
        (outline !== 'none' && outline !== '') ||
        (boxShadow !== 'none' && boxShadow !== '')
      );
    });

    expect(hasFocusStyle).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  Heading structure checks                                           */
/* ------------------------------------------------------------------ */

test.describe('Accessibility — Heading Structure', () => {
  const headingPages = ['/', '/auth', '/kids'];

  for (const path of headingPages) {
    test(`${path} — has exactly one H1 and logical heading order`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'networkidle' });

      const headings = await page.evaluate(() => {
        const nodes = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        return Array.from(nodes).map((h) => ({
          level: parseInt(h.tagName[1]),
          text: h.textContent?.trim().slice(0, 60) || '',
        }));
      });

      await test.info().attach(`headings-${path.replace(/\//g, '-') || 'home'}`, {
        body: JSON.stringify(headings, null, 2),
        contentType: 'application/json',
      });

      // Exactly one H1
      const h1Count = headings.filter((h) => h.level === 1).length;
      expect(h1Count, `Expected 1 H1 on ${path}, found ${h1Count}`).toBe(1);

      // No skipped heading levels (e.g., H1 → H3 without H2)
      for (let i = 1; i < headings.length; i++) {
        const jump = headings[i].level - headings[i - 1].level;
        expect(
          jump,
          `Heading level skipped on ${path}: H${headings[i - 1].level} → H${headings[i].level}`,
        ).toBeLessThanOrEqual(1);
      }
    });
  }
});

/* ------------------------------------------------------------------ */
/*  Image alt text checks                                              */
/* ------------------------------------------------------------------ */

test.describe('Accessibility — Image Alt Text', () => {
  test('All images have alt attributes', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const images = await page.evaluate(() => {
      const imgs = document.querySelectorAll('img');
      return Array.from(imgs).map((img) => ({
        src: img.src?.slice(0, 80),
        alt: img.alt,
        hasAlt: img.hasAttribute('alt'),
        role: img.getAttribute('role'),
      }));
    });

    await test.info().attach('image-alt-audit', {
      body: JSON.stringify(images, null, 2),
      contentType: 'application/json',
    });

    // Every <img> must have an alt attribute (can be empty for decorative)
    const missingAlt = images.filter((i) => !i.hasAlt && i.role !== 'presentation');
    expect(
      missingAlt,
      `${missingAlt.length} image(s) missing alt attribute`,
    ).toEqual([]);
  });
});
