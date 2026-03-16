/**
 * SkillsTabContent
 * Colored domain breakdown cards + skill detail table
 */
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, ExternalLink } from 'lucide-react';
import { getDomainInfo, getItemTypeInfo, SKILL_DOMAINS } from '@/types/skillPlan';

interface SkillCatalogItem {
  id: string;
  title: string;
  description: string | null;
  skill_domain: string;
  item_type: string;
  category: string;
  difficulty: string;
  age_group: string;
  is_active: boolean | null;
  autism_skill_tags: string[];
  clinical_reference: string | null;
}

interface Props {
  items: SkillCatalogItem[];
  loading: boolean;
}

export function SkillsTabContent({ items, loading }: Props) {
  const [search, setSearch] = useState('');

  const filtered = items.filter(item =>
    item.title.toLowerCase().includes(search.toLowerCase()) ||
    item.description?.toLowerCase().includes(search.toLowerCase()) ||
    item.skill_domain?.toLowerCase().includes(search.toLowerCase())
  );

  const totalItems = items.length;

  return (
    <div className="space-y-5">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search skills by title, domain..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Domain breakdown cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {SKILL_DOMAINS.map(domain => {
          const count = items.filter(i => i.skill_domain === domain.value).length;
          const pct = totalItems > 0 ? (count / totalItems) * 100 : 0;
          const domainInfo = getDomainInfo(domain.value);
          return (
            <div
              key={domain.value}
              className="rounded-xl border border-border/50 bg-card/80 p-4 space-y-2 hover:bg-muted/20 transition-colors"
            >
              <div className="flex items-center justify-between">
                <Badge variant="outline" className={`text-xs ${domainInfo.color}`}>
                  {domain.label}
                </Badge>
                <span className="text-lg font-bold text-foreground">{count}</span>
              </div>
              {/* Proportion bar */}
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary/70 transition-[width] duration-500"
                  style={{ width: `${Math.max(pct, 2)}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground">{pct.toFixed(0)}% of catalog</p>
            </div>
          );
        })}
      </div>

      {/* Detail table */}
      <Card className="rounded-xl">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground">Loading skill catalog...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              {search ? 'No skills match your search.' : 'No skill items found. The manage-skill-plan edge function may not be deployed.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead>Age Group</TableHead>
                  <TableHead>Clinical Ref</TableHead>
                  <TableHead>Portal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(item => {
                  const domainInfo = getDomainInfo(item.skill_domain);
                  const typeInfo = getItemTypeInfo(item.item_type);
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={domainInfo.color}>
                          {domainInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span>{typeInfo.icon} {typeInfo.label}</span>
                      </TableCell>
                      <TableCell className="capitalize text-muted-foreground">{item.difficulty}</TableCell>
                      <TableCell className="text-muted-foreground">{item.age_group}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{item.clinical_reference || '—'}</TableCell>
                      <TableCell>
                        <a href="/kids" className="flex items-center gap-1 text-xs text-primary hover:underline">
                          <ExternalLink className="h-3 w-3" /> /kids
                        </a>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
