import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import * as LucideIcons from 'lucide-react';

interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
}

interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: string;
  onCategoryChange: (categoryId: string) => void;
}

function CategoryFilterComponent({ categories, selectedCategory, onCategoryChange }: CategoryFilterProps) {
  const getIcon = (iconName: string) => {
    // Dynamic icon lookup from lucide-react
    const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[iconName];
    return Icon ? <Icon className="h-5 w-5" /> : <LucideIcons.Circle className="h-5 w-5" />;
  };

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold mb-4 text-center">Browse by Category</h2>
      
      {/* All Categories Button */}
      <div className="flex justify-center mb-4">
        <Button
          variant={selectedCategory === 'all' ? 'default' : 'outline'}
          onClick={() => onCategoryChange('all')}
          className="text-lg px-6 py-3"
        >
          🌟 All Categories
        </Button>
      </div>

      {/* Category Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {categories.map((category) => (
          <Card
            key={category.id}
            className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
              selectedCategory === category.id
                ? 'ring-2 ring-primary bg-primary/5'
                : 'hover:bg-gray-50'
            }`}
            onClick={() => onCategoryChange(category.id)}
          >
            <CardContent className="p-4 text-center">
              <div className="flex flex-col items-center space-y-2">
                <div className={`p-3 rounded-full ${
                  selectedCategory === category.id 
                    ? 'bg-primary text-white' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {getIcon(category.icon)}
                </div>
                <h3 className="font-medium text-sm text-center leading-tight">
                  {category.name}
                </h3>
                <p className="text-xs text-muted-foreground text-center line-clamp-2">
                  {category.description}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Phase 1: Performance optimization with React.memo
export const CategoryFilter = React.memo(CategoryFilterComponent, (prevProps, nextProps) => {
  return (
    prevProps.selectedCategory === nextProps.selectedCategory &&
    prevProps.categories.length === nextProps.categories.length &&
    prevProps.categories.every((cat, index) => 
      cat.id === nextProps.categories[index]?.id &&
      cat.name === nextProps.categories[index]?.name
    )
  );
});