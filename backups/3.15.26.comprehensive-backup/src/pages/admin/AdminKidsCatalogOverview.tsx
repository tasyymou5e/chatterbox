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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Gamepad2, BookOpen, FlaskConical } from 'lucide-react';
import type { CatalogContentItem } from '@/components/games/types/catalog';
import { secureLog } from '@/utils/wideLogger';
import { KidsCatalogSummaryStrip } from './kids-catalog/KidsCatalogSummaryStrip';
import { GamesTabContent } from './kids-catalog/GamesTabContent';
import { SkillsTabContent } from './kids-catalog/SkillsTabContent';
import { TestsTabContent } from './kids-catalog/TestsTabContent';

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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          🧒 Kids Catalog Overview
        </h1>
        <p className="text-muted-foreground mt-1">
          All kid-facing content, skill activities, and test coverage in one place.
        </p>
      </div>

      {/* Summary Strip */}
      <KidsCatalogSummaryStrip
        gameCount={gameItems.length}
        skillCount={skillItems.length}
        testCount={KIDS_TEST_FILES.length}
      />

      {/* Tabs */}
      <Tabs defaultValue="games" className="w-full">
        <TabsList className="grid w-full grid-cols-3 rounded-xl h-11">
          <TabsTrigger value="games" className="gap-2 rounded-lg">
            <Gamepad2 className="h-4 w-4" /> Games ({gameItems.length})
          </TabsTrigger>
          <TabsTrigger value="skills" className="gap-2 rounded-lg">
            <BookOpen className="h-4 w-4" /> Skills ({skillItems.length})
          </TabsTrigger>
          <TabsTrigger value="tests" className="gap-2 rounded-lg">
            <FlaskConical className="h-4 w-4" /> Tests ({KIDS_TEST_FILES.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="games" className="mt-6">
          <GamesTabContent items={gameItems} loading={loadingGames} />
        </TabsContent>

        <TabsContent value="skills" className="mt-6">
          <SkillsTabContent items={skillItems} loading={loadingSkills} />
        </TabsContent>

        <TabsContent value="tests" className="mt-6">
          <TestsTabContent testFiles={KIDS_TEST_FILES} skillItems={skillItems} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
