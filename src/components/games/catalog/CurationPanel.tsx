/**
 * Parent content curation panel
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, ShieldX, Sparkles } from 'lucide-react';

interface CurationPanelProps {
  isVisible: boolean;
}

export const CurationPanel = React.memo(function CurationPanel({
  isVisible
}: CurationPanelProps) {
  if (!isVisible) return null;

  return (
    <div className="mb-8">
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Family Content Management Active
          </h3>
          <p className="text-sm text-muted-foreground mb-3">
            Use the controls on each content card to manage what your family can access.
          </p>
          <div className="flex gap-2 text-xs">
            <Badge variant="outline" className="bg-yellow-100 text-yellow-700">
              <Sparkles className="h-3 w-3 mr-1" />
              Feature: Highlight for family
            </Badge>
            <Badge variant="outline" className="bg-green-100 text-green-700">
              <Shield className="h-3 w-3 mr-1" />
              Allow: Normal access
            </Badge>
            <Badge variant="outline" className="bg-red-100 text-red-700">
              <ShieldX className="h-3 w-3 mr-1" />
              Block: Hide from family
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

export default CurationPanel;
