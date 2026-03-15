/**
 * TestsTabContent
 * Visual test coverage status cards + item type summary
 */
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileCode, CheckCircle2, Shield, AlertTriangle, Info } from 'lucide-react';
import { ITEM_TYPES } from '@/types/skillPlan';
import { ProfessionalIllustration } from '@/components/illustrations/ProfessionalIllustration';

interface TestFileEntry {
  file: string;
  portal: string;
  description: string;
  category: 'component' | 'hook' | 'page' | 'util';
}

interface Props {
  testFiles: TestFileEntry[];
  skillItems: { item_type: string }[];
}

const categoryStyles: Record<string, { border: string; bg: string; text: string }> = {
  page: { border: 'border-l-secondary', bg: 'bg-secondary/5', text: 'text-secondary' },
  component: { border: 'border-l-primary', bg: 'bg-primary/5', text: 'text-primary' },
  hook: { border: 'border-l-accent', bg: 'bg-accent/5', text: 'text-accent' },
  util: { border: 'border-l-warning', bg: 'bg-warning/5', text: 'text-warning' },
};

export function TestsTabContent({ testFiles, skillItems }: Props) {
  return (
    <div className="space-y-6">
      {/* Test file status cards */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <div className="w-1 h-5 rounded-full bg-primary" />
          Kids Feature Test Files
        </h3>
        {testFiles.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-12">
            <ProfessionalIllustration variant="content" size="md" />
            <p className="text-muted-foreground text-sm">No test files found for kids features.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {testFiles.map(entry => {
              const style = categoryStyles[entry.category] || categoryStyles.util;
              return (
                <div
                  key={entry.file}
                  className={`rounded-xl border border-border/50 ${style.bg} border-l-4 ${style.border} p-4 flex items-start gap-4 hover:bg-muted/20 transition-colors`}
                >
                  <div className={`rounded-lg p-2 bg-card border border-border/50 ${style.text}`}>
                    <FileCode className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-xs font-mono text-foreground/90 break-all">{entry.file}</code>
                      <Badge variant="outline" className={`capitalize text-[10px] ${style.text}`}>
                        {entry.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{entry.description}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary" className="text-xs">{entry.portal}</Badge>
                    <CheckCircle2 className="h-4 w-4 text-secondary" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Item type summary */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <div className="w-1 h-5 rounded-full bg-accent" />
          Skill Catalog Item Types
        </h3>
        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Activity Type Breakdown</CardTitle>
            <CardDescription className="text-xs">{ITEM_TYPES.length} types across the skill catalog</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {ITEM_TYPES.map(type => {
                const count = skillItems.filter(i => i.item_type === type.value).length;
                return (
                  <div key={type.value} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/30 hover:bg-muted/50 transition-colors">
                    <span className="text-2xl">{type.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{type.label}</p>
                      <p className="text-xs text-muted-foreground">{count} items</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Accessibility Testing Summary */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <div className="w-1 h-5 rounded-full bg-secondary" />
          Accessibility Compliance (WCAG 2.1 AA)
        </h3>
        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-secondary" />
              axe-core Scan Coverage
            </CardTitle>
            <CardDescription className="text-xs">
              Automated WCAG 2.1 AA checks across all portals via @axe-core/playwright
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { portal: 'Public', pages: ['/', '/auth'], icon: '🌐' },
                { portal: 'Admin', pages: ['/admin/login', '/admin/dashboard', '/admin/kids-catalog'], icon: '🔧' },
                { portal: 'Parent', pages: ['/parent-dashboard'], icon: '👨‍👩‍👧' },
                { portal: 'Kids', pages: ['/kids', '/games'], icon: '🧒' },
              ].map((group) => (
                <div
                  key={group.portal}
                  className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/30 hover:bg-muted/50 transition-colors"
                >
                  <span className="text-2xl">{group.icon}</span>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">{group.portal}</p>
                    <p className="text-xs text-muted-foreground">{group.pages.length} page(s) scanned</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {group.pages.map((p) => (
                        <Badge key={p} variant="outline" className="text-[10px] font-mono">
                          {p}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Check types */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { label: 'Full Page Scans', desc: '8 pages × full document axe analysis', icon: <CheckCircle2 className="h-4 w-4 text-secondary" /> },
                { label: 'Main Content Scans', desc: '5 pages × context-limited <main> scan', icon: <Info className="h-4 w-4 text-primary" /> },
                { label: 'Keyboard & Structure', desc: 'Tab navigation, heading order, alt text', icon: <AlertTriangle className="h-4 w-4 text-accent" /> },
              ].map((check) => (
                <div
                  key={check.label}
                  className="flex items-start gap-2 p-3 rounded-lg bg-card border border-border/40"
                >
                  {check.icon}
                  <div>
                    <p className="text-xs font-medium text-foreground">{check.label}</p>
                    <p className="text-[11px] text-muted-foreground">{check.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              Run: <code className="bg-muted px-1.5 py-0.5 rounded text-[11px]">npx playwright test accessibility</code> · 
              Fails on <span className="text-destructive font-medium">critical</span> / <span className="text-destructive font-medium">serious</span> violations only.
              Import results via the Test Results Dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
