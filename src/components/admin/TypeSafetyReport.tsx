/**
 * Component to report on TypeScript implementation progress
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, Clock, Code } from 'lucide-react';

export const TypeSafetyReport = () => {
  const improvements = [
    {
      category: 'Auth System',
      status: 'completed',
      items: [
        'Replaced any types in useAuth and useAdminAuth hooks',
        'Added proper Supabase User and Session types',
        'Implemented SupabaseError interface for consistent error handling'
      ]
    },
    {
      category: 'Error Handling',
      status: 'completed',
      items: [
        'Replaced catch (error: any) with catch (error: unknown)',
        'Added type guards for error classification',
        'Implemented structured error handling utilities'
      ]
    },
    {
      category: 'Database Types',
      status: 'completed',
      items: [
        'Created typed interfaces for JSON database fields',
        'Added BrowserInfo, DeviceInfo, and ErrorMetadata interfaces',
        'Enhanced Supabase type integration'
      ]
    },
    {
      category: 'Logging System',
      status: 'completed',
      items: [
        'Implemented structured logging utility',
        'Added log levels and context tracking',
        'Created performance monitoring hooks'
      ]
    },
    {
      category: 'Component Types',
      status: 'in-progress',
      items: [
        'Updated ApplicationLogs component with proper types',
        'Enhanced error boundary with structured logging',
        'Added performance monitoring components'
      ]
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in-progress':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'in-progress':
        return <Badge className="bg-yellow-100 text-yellow-800">In Progress</Badge>;
      default:
        return <Badge variant="destructive">Pending</Badge>;
    }
  };

  const completedCount = improvements.filter(i => i.status === 'completed').length;
  const totalCount = improvements.length;
  const progressPercentage = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-6 w-6" />
            TypeScript Strictness Enhancement Report
          </CardTitle>
          <CardDescription>
            Progress on implementing type safety improvements across the codebase
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <h3 className="font-semibold">Overall Progress</h3>
                <p className="text-sm text-muted-foreground">
                  {completedCount} of {totalCount} categories completed
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">{progressPercentage}%</div>
                <div className="w-20 h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-[width] duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            </div>

            {improvements.map((improvement, index) => (
              <Card key={index} className="border-l-4 border-l-primary">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {getStatusIcon(improvement.status)}
                      {improvement.category}
                    </CardTitle>
                    {getStatusBadge(improvement.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {improvement.items.map((item, itemIndex) => (
                      <li key={itemIndex} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Key Achievements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-green-600">✅ Completed</h4>
              <ul className="space-y-1 text-sm">
                <li>• Eliminated critical `any` types in auth system</li>
                <li>• Implemented structured error handling</li>
                <li>• Added comprehensive type guards</li>
                <li>• Created logging infrastructure</li>
                <li>• Enhanced database type safety</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-blue-600">🔄 Next Steps</h4>
              <ul className="space-y-1 text-sm">
                <li>• Replace remaining component `any` types</li>
                <li>• Enable strict TypeScript configuration</li>
                <li>• Add performance monitoring to more components</li>
                <li>• Implement comprehensive error reporting</li>
                <li>• Create type-safe API wrapper functions</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};