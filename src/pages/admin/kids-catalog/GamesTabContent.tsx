/**
 * GamesTabContent
 * Visual card grid + table toggle for the Games catalog tab
 */
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, ExternalLink, LayoutGrid, List, Gamepad2, Video, Music, BookOpen } from 'lucide-react';
import type { CatalogContentItem } from '@/components/games/types/catalog';
import { Button } from '@/components/ui/button';

interface Props {
  items: CatalogContentItem[];
  loading: boolean;
}

const contentTypeIcons: Record<string, React.ReactNode> = {
  game: <Gamepad2 className="h-8 w-8" />,
  video: <Video className="h-8 w-8" />,
  music: <Music className="h-8 w-8" />,
  article: <BookOpen className="h-8 w-8" />,
};

const contentTypeColors: Record<string, string> = {
  game: 'from-primary/20 to-primary/5',
  video: 'from-secondary/20 to-secondary/5',
  music: 'from-accent/20 to-accent/5',
  article: 'from-muted to-muted/50',
};

export function GamesTabContent({ items, loading }: Props) {
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const filtered = items.filter(item =>
    item.title.toLowerCase().includes(search.toLowerCase()) ||
    item.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search games..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border p-1">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
            className="h-8 w-8 p-0"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'table' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('table')}
            className="h-8 w-8 p-0"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-muted-foreground">Loading games catalog...</div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-muted-foreground">
          {search ? 'No games match your search.' : 'No games found in the catalog.'}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item => {
            const colorGrad = contentTypeColors[item.content_type] || contentTypeColors.article;
            return (
              <Card key={item.id} className="group overflow-hidden rounded-xl border-border/50 hover:border-primary/30 transition-[border-color,box-shadow] hover:shadow-md">
                {/* Thumbnail / Placeholder */}
                <div className={`h-32 bg-gradient-to-br ${colorGrad} flex items-center justify-center relative`}>
                  {item.thumbnail_url ? (
                    <img
                      src={item.thumbnail_url}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="text-muted-foreground/40">
                      {contentTypeIcons[item.content_type] || <Gamepad2 className="h-8 w-8" />}
                    </div>
                  )}
                  {/* Age badge */}
                  {(item.age_min || item.age_max) && (
                    <Badge variant="secondary" className="absolute top-2 right-2 text-xs font-semibold shadow-sm">
                      {item.age_min && item.age_max
                        ? `${item.age_min}–${item.age_max}y`
                        : item.age_min ? `${item.age_min}+` : ''}
                    </Badge>
                  )}
                </div>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-sm text-foreground leading-tight group-hover:text-primary transition-colors">
                      {item.title}
                    </h3>
                    <Badge variant="outline" className="text-[10px] shrink-0">{item.content_type}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {item.description || 'No description'}
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex flex-wrap gap-1">
                      {item.tags?.slice(0, 2).map(tag => (
                        <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">{tag}</Badge>
                      ))}
                      {(item.tags?.length || 0) > 2 && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">+{(item.tags?.length || 0) - 2}</Badge>
                      )}
                    </div>
                    <a href="/games" className="flex items-center gap-1 text-[10px] text-primary hover:underline">
                      <ExternalLink className="h-3 w-3" /> View
                    </a>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="rounded-xl">
          <CardContent className="p-0">
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
                {filtered.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.title}</TableCell>
                    <TableCell><Badge variant="outline">{item.content_type}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{item.content_categories?.name || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.age_min && item.age_max ? `${item.age_min}–${item.age_max}` : item.age_min ? `${item.age_min}+` : '—'}
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
