/**
 * AdminKidsCatalogOverview
 * 
 * @description Unified admin view showing all kids-facing catalog items:
 * 1. Games Catalog (content_items) — browsed at /games
 * 2. Skill/Activity Catalog (life_skill_catalog) — used in Skill Plans at /kids
 * 3. Test Coverage summary for kids features
 */
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Gamepad2, BookOpen, FlaskConical, Search, ExternalLink, Layers } from 'lucide-react';
import { getDomainInfo, getItemTypeInfo, SKILL_DOMAINS, ITEM_TYPES } from '@/types/skillPlan';
import type { CatalogContentItem } from '@/components/games/types/catalog';
import { secureLog } from '@/utils/wideLogger';

// ─── Types ──────────────────────────────────────────────────────────────────────

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

interface TestFileEntry {
  file: string;
  portal: string;
  description: string;
  category: 'component' | 'hook' | 'page' | 'util';
}

// ─── Static test coverage data ──────────────────────────────────────────────────

const KIDS_TEST_FILES: TestFileEntry[] = [
  { file: 'tests/component/pages/KidsPortal.test.tsx', portal: '/kids', description: 'Kids Portal rendering, loading state, age-appropriate content sections', category: 'page' },
  { file: 'tests/component/utils/RateLimiter.test.ts', portal: 'Global (security)', description: 'Rate limiter used across login & kids APIs', category: 'util' },
];

// ─── Component ──────────────────────────────────────────────────────────────────

export default function AdminKidsCatalogOverview() {
  const [gameItems, setGameItems] = useState<CatalogContentItem[]>([]);
  const [skillItems, setSkillItems] = useState<SkillCatalogItem[]>([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const [loadingSkills, setLoadingSkills] = useState(true);
  const [searchGames, setSearchGames] = useState('');
  const [searchSkills, setSearchSkills] = useState('');

  // Fetch games catalog (content_items)
  useEffect(() => {
    const fetchGames = async () => {
      try {
        const { data, error } = await supabase
          .from('content_items')
          .select('id, title, description, content_type, category_id, url, thumbnail_url, age_min, age_max, autism_features, tags, is_free, content_categories(name, icon)')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        if (error) throw error;
        setGameItems((data || []) as unknown as CatalogContentItem[]);
      } catch (err) {
        secureLog.error('Failed to load games catalog', err, 'AdminKidsCatalogOverview');
      } finally {
        setLoadingGames(false);
      }
    };
    fetchGames();
  }, []);

  // Fetch skill catalog via edge function
  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('manage-skill-plan', {
          body: { action: 'get_catalog' },
        });
        if (error) throw error;
        setSkillItems(data?.items || []);
      } catch (err) {
        secureLog.error('Failed to load skill catalog', err, 'AdminKidsCatalogOverview');
      } finally {
        setLoadingSkills(false);
      }
    };
    fetchSkills();
  }, []);

  const filteredGames = gameItems.filter(item =>
    item.title.toLowerCase().includes(searchGames.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchGames.toLowerCase())
  );

  const filteredSkills = skillItems.filter(item =>
    item.title.toLowerCase().includes(searchSkills.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchSkills.toLowerCase()) ||
    item.skill_domain?.toLowerCase().includes(searchSkills.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Kids Catalog Overview</h1>
        <p className="text-muted-foreground mt-1">
          All kid-facing content, skill activities, and test coverage in one place.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <Gamepad2 className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-sm font-medium">Games Catalog</CardTitle>
              <CardDescription className="text-xs">Browsed at /games</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{gameItems.length}</p>
            <p className="text-xs text-muted-foreground">active content items</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-sm font-medium">Skill Catalog</CardTitle>
              <CardDescription className="text-xs">Used in Skill Plans at /kids</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{skillItems.length}</p>
            <p className="text-xs text-muted-foreground">skill activities across {SKILL_DOMAINS.length} domains</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-sm font-medium">Test Coverage</CardTitle>
              <CardDescription className="text-xs">Kids feature tests</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{KIDS_TEST_FILES.length}</p>
            <p className="text-xs text-muted-foreground">test files covering kids features</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="games" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="games" className="gap-2">
            <Gamepad2 className="h-4 w-4" /> Games ({filteredGames.length})
          </TabsTrigger>
          <TabsTrigger value="skills" className="gap-2">
            <BookOpen className="h-4 w-4" /> Skills ({filteredSkills.length})
          </TabsTrigger>
          <TabsTrigger value="tests" className="gap-2">
            <FlaskConical className="h-4 w-4" /> Tests ({KIDS_TEST_FILES.length})
          </TabsTrigger>
        </TabsList>

        {/* Games Catalog Tab */}
        <TabsContent value="games" className="space-y-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search games..."
              value={searchGames}
              onChange={(e) => setSearchGames(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <Card>
            <CardContent className="p-0">
              {loadingGames ? (
                <div className="p-8 text-center text-muted-foreground">Loading games catalog...</div>
              ) : filteredGames.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  {searchGames ? 'No games match your search.' : 'No games found in the catalog.'}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Ages</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead>Portal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGames.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.content_type}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.content_categories?.name || '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.age_min && item.age_max
                            ? `${item.age_min}–${item.age_max}`
                            : item.age_min ? `${item.age_min}+` : '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {item.tags?.slice(0, 3).map(tag => (
                              <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                            ))}
                            {(item.tags?.length || 0) > 3 && (
                              <Badge variant="secondary" className="text-xs">+{(item.tags?.length || 0) - 3}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <a href="/games" className="flex items-center gap-1 text-xs text-primary hover:underline">
                            <ExternalLink className="h-3 w-3" /> /games
                          </a>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Skill Catalog Tab */}
        <TabsContent value="skills" className="space-y-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search skills by title, domain..."
              value={searchSkills}
              onChange={(e) => setSearchSkills(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {/* Domain summary chips */}
          <div className="flex flex-wrap gap-2">
            {SKILL_DOMAINS.map(domain => {
              const count = skillItems.filter(i => i.skill_domain === domain.value).length;
              return (
                <Badge key={domain.value} variant="outline" className="gap-1">
                  <Layers className="h-3 w-3" />
                  {domain.label}: {count}
                </Badge>
              );
            })}
          </div>

          <Card>
            <CardContent className="p-0">
              {loadingSkills ? (
                <div className="p-8 text-center text-muted-foreground">Loading skill catalog...</div>
              ) : filteredSkills.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  {searchSkills ? 'No skills match your search.' : 'No skill items found. The manage-skill-plan edge function may not be deployed.'}
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
                    {filteredSkills.map(item => {
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
        </TabsContent>

        {/* Test Coverage Tab */}
        <TabsContent value="tests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Kids Feature Test Files</CardTitle>
              <CardDescription>Test files that verify kids portal, games, and related features</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Test File</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Tests Portal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {KIDS_TEST_FILES.map(entry => (
                    <TableRow key={entry.file}>
                      <TableCell className="font-mono text-xs">{entry.file}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{entry.category}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{entry.description}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{entry.portal}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Item type summary from skill catalog */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Item Types in Skill Catalog</CardTitle>
              <CardDescription>Breakdown by activity type ({ITEM_TYPES.length} types)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {ITEM_TYPES.map(type => {
                  const count = skillItems.filter(i => i.item_type === type.value).length;
                  return (
                    <div key={type.value} className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                      <span className="text-2xl">{type.icon}</span>
                      <div>
                        <p className="text-sm font-medium text-foreground">{type.label}</p>
                        <p className="text-xs text-muted-foreground">{count} items</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
