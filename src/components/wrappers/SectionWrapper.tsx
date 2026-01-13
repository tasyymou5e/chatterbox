import React, { ReactNode, useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export interface SectionWrapperProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  variant?: 'default' | 'card' | 'bordered';
  className?: string;
  children: ReactNode;
}

export const SectionWrapper: React.FC<SectionWrapperProps> = ({
  title,
  description,
  actions,
  collapsible = false,
  defaultOpen = true,
  variant = 'default',
  className,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const headerContent = (
    <div className="flex items-center justify-between">
      <div>
        {title && <h2 className="text-lg font-semibold">{title}</h2>}
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {actions}
        {collapsible && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
            className="h-8 w-8 p-0"
          >
            {isOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
    </div>
  );

  if (variant === 'card') {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              {title && <CardTitle>{title}</CardTitle>}
              {description && <CardDescription>{description}</CardDescription>}
            </div>
            <div className="flex items-center gap-2">
              {actions}
              {collapsible && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(!isOpen)}
                  className="h-8 w-8 p-0"
                >
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        {(!collapsible || isOpen) && <CardContent>{children}</CardContent>}
      </Card>
    );
  }

  if (variant === 'bordered') {
    return (
      <div className={cn('border rounded-lg', className)}>
        {(title || description || actions || collapsible) && (
          <div className="px-4 py-3 border-b bg-muted/50">{headerContent}</div>
        )}
        {(!collapsible || isOpen) && <div className="p-4">{children}</div>}
      </div>
    );
  }

  // Default variant
  return (
    <section className={cn('space-y-4', className)}>
      {(title || description || actions || collapsible) && (
        <div className="pb-2">{headerContent}</div>
      )}
      {(!collapsible || isOpen) && children}
    </section>
  );
};

export default SectionWrapper;
