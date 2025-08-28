import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heart, Play, Star } from 'lucide-react';

interface ContentItem {
  id: string;
  title: string;
  description: string;
  content_type: string;
  url: string;
  thumbnail_url: string;
  age_min: number;
  age_max: number;
  autism_features: any;
  tags: string[];
  is_free: boolean;
  content_categories?: {
    name: string;
    icon: string;
  };
}

interface ContentCardProps {
  item: ContentItem;
  isFavorited: boolean;
  onFavorite: () => void;
  onClick: () => void;
}

export function ContentCard({ item, isFavorited, onFavorite, onClick }: ContentCardProps) {
  const getContentIcon = (type: string) => {
    switch (type) {
      case 'game': return '🎮';
      case 'video': return '📺';
      case 'website': return '🌐';
      case 'app': return '📱';
      default: return '🎯';
    }
  };

  const getAutismBadges = (features: any) => {
    const badges = [];
    if (features.sensory_friendly) badges.push('Sensory Friendly');
    if (features.non_verbal_friendly) badges.push('Non-Verbal');
    if (features.executive_function) badges.push('Executive Function');
    return badges;
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer bg-white border-2 hover:border-primary/20">
      <CardHeader className="p-0">
        <div 
          className="relative aspect-video bg-gradient-to-br from-blue-100 to-purple-100 rounded-t-lg overflow-hidden"
          onClick={onClick}
        >
          {item.thumbnail_url ? (
            <img
              src={item.thumbnail_url}
              alt={item.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <span className="text-4xl">{getContentIcon(item.content_type)}</span>
            </div>
          )}
          
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <Button size="lg" className="bg-white/90 text-primary hover:bg-white">
              <Play className="h-5 w-5 mr-2" />
              Open
            </Button>
          </div>

          {/* Favorite Button */}
          <Button
            size="sm"
            variant="ghost"
            className="absolute top-2 right-2 bg-white/80 hover:bg-white"
            onClick={(e) => {
              e.stopPropagation();
              onFavorite();
            }}
          >
            <Heart 
              className={`h-4 w-4 ${isFavorited ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} 
            />
          </Button>

          {/* Free Badge */}
          {item.is_free && (
            <Badge className="absolute top-2 left-2 bg-green-500 text-white">
              FREE
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4" onClick={onClick}>
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-lg line-clamp-1 mb-1">
              {item.title}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {item.description}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">
              {getContentIcon(item.content_type)} {item.content_type}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Ages {item.age_min}-{item.age_max}
            </Badge>
            {item.content_categories && (
              <Badge variant="outline" className="text-xs">
                {item.content_categories.name}
              </Badge>
            )}
          </div>

          {/* Autism-specific features */}
          {getAutismBadges(item.autism_features).length > 0 && (
            <div className="flex flex-wrap gap-1">
              {getAutismBadges(item.autism_features).map((feature, index) => (
                <Badge key={index} variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                  ✨ {feature}
                </Badge>
              ))}
            </div>
          )}

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.tags.slice(0, 3).map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  #{tag}
                </Badge>
              ))}
              {item.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{item.tags.length - 3} more
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}