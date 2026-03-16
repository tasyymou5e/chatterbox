import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { SiteHeader } from '@/components/SiteHeader';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageWrapperProps {
  title?: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
  showHeader?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  children: ReactNode;
}

const maxWidthClasses = {
  sm: 'max-w-screen-sm',
  md: 'max-w-screen-md',
  lg: 'max-w-screen-lg',
  xl: 'max-w-screen-xl',
  '2xl': 'max-w-screen-2xl',
  full: 'max-w-full',
};

const paddingClasses = {
  none: '',
  sm: 'px-4 py-4',
  md: 'px-6 py-6',
  lg: 'px-8 py-8',
};

export const PageWrapper: React.FC<PageWrapperProps> = ({
  title,
  description,
  breadcrumbs,
  actions,
  showHeader = true,
  maxWidth = 'xl',
  padding = 'md',
  className,
  children,
}) => {
  return (
    <div className="min-h-screen bg-background">
      {showHeader && <SiteHeader />}
      
      <main 
        className={cn(
          'mx-auto',
          maxWidthClasses[maxWidth],
          paddingClasses[padding],
          showHeader && 'pt-16',
          className
        )}
      >
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center text-sm text-muted-foreground mb-4">
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={index}>
                {index > 0 && <ChevronRight className="h-4 w-4 mx-2" />}
                {crumb.href ? (
                  <Link 
                    to={crumb.href}
                    className="hover:text-foreground transition-colors"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-foreground">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}

        {/* Page Header */}
        {(title || description || actions) && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              {title && (
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                  {title}
                </h1>
              )}
              {description && (
                <p className="text-muted-foreground mt-1">{description}</p>
              )}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        )}

        {/* Content */}
        {children}
      </main>
    </div>
  );
};

export default PageWrapper;
