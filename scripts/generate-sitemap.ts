// Runs before `vite dev` and `vite build` (predev/prebuild hooks); writes public/sitemap.xml.

import { writeFileSync } from "fs"
import { resolve } from "path"

const BASE_URL = "https://chatterbox.life"

interface SitemapEntry {
  path: string
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never"
  priority?: string
}

const entries: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/about", changefreq: "monthly", priority: "0.8" },
  { path: "/games", changefreq: "weekly", priority: "0.9" },
  { path: "/assessment", changefreq: "monthly", priority: "0.8" },
  { path: "/features/educational-games", changefreq: "monthly", priority: "0.8" },
  { path: "/features/communication-support", changefreq: "monthly", priority: "0.8" },
  { path: "/features/progress-tracking", changefreq: "monthly", priority: "0.8" },
  { path: "/features/family-management", changefreq: "monthly", priority: "0.8" },
  { path: "/support/help-center", changefreq: "monthly", priority: "0.6" },
  { path: "/support/contact", changefreq: "yearly", priority: "0.5" },
  { path: "/support/privacy-policy", changefreq: "yearly", priority: "0.3" },
  { path: "/support/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/connect/community-forum", changefreq: "weekly", priority: "0.6" },
  { path: "/connect/parent-resources", changefreq: "monthly", priority: "0.7" },
  { path: "/connect/therapist-tools", changefreq: "monthly", priority: "0.6" },
  { path: "/connect/research-studies", changefreq: "monthly", priority: "0.6" },
]

function generateSitemap(items: SitemapEntry[]) {
  const urls = items.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n"),
  )

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n")
}

writeFileSync(resolve("public/sitemap.xml"), generateSitemap(entries))
console.log(`sitemap.xml written (${entries.length} entries)`)
