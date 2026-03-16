/**
 * TestCoverageMatrix Component
 * 
 * @description Interactive table showing component, hook, store, and edge function coverage
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Component,
  Code,
  Database,
  Cloud
} from 'lucide-react';
import type { 
  ComponentCoverage, 
  HookCoverage, 
  StoreCoverage, 
  EdgeFunctionCoverage,
  CoverageStatus
} from '@/types/testCoverage';

interface TestCoverageMatrixProps {
  componentCoverage: ComponentCoverage[];
  hookCoverage: HookCoverage[];
  storeCoverage: StoreCoverage[];
  edgeFunctionCoverage: EdgeFunctionCoverage[];
}

const coverageStatusConfig: Record<CoverageStatus, { icon: typeof CheckCircle; color: string }> = {
  'covered': { icon: CheckCircle, color: 'text-primary' },
  'partial': { icon: AlertCircle, color: 'text-accent-foreground' },
  'not-covered': { icon: XCircle, color: 'text-destructive' }
};

export function TestCoverageMatrix({
  componentCoverage,
  hookCoverage,
  storeCoverage,
  edgeFunctionCoverage
}: TestCoverageMatrixProps) {
  const [activeTab, setActiveTab] = useState('components');

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg">Coverage Matrix</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="components" className="flex items-center gap-1">
              <Component className="h-3 w-3" />
              Components
            </TabsTrigger>
            <TabsTrigger value="hooks" className="flex items-center gap-1">
              <Code className="h-3 w-3" />
              Hooks
            </TabsTrigger>
            <TabsTrigger value="stores" className="flex items-center gap-1">
              <Database className="h-3 w-3" />
              Stores
            </TabsTrigger>
            <TabsTrigger value="edge-functions" className="flex items-center gap-1">
              <Cloud className="h-3 w-3" />
              Edge Functions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="components" className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Component</TableHead>
                  <TableHead>Tests</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Categories</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {componentCoverage.map((comp) => {
                  const StatusIcon = coverageStatusConfig[comp.coverageStatus].icon;
                  return (
                    <TableRow key={comp.componentName}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{comp.componentName}</div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {comp.componentPath.split('/').pop()}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{comp.testCount}</Badge>
                      </TableCell>
                      <TableCell>
                        <StatusIcon className={`h-4 w-4 ${coverageStatusConfig[comp.coverageStatus].color}`} />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {comp.categories.slice(0, 3).map((cat, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {cat}
                            </Badge>
                          ))}
                          {comp.categories.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{comp.categories.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="hooks" className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hook</TableHead>
                  <TableHead>Unit Tests</TableHead>
                  <TableHead>E2E Coverage</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hookCoverage.map((hook) => (
                  <TableRow key={hook.hookName}>
                    <TableCell>
                      <div className="font-medium font-mono text-sm">{hook.hookName}</div>
                    </TableCell>
                    <TableCell>
                      {hook.hasUnitTests ? (
                        <CheckCircle className="h-4 w-4 text-primary" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell>
                      {hook.hasE2ECoverage ? (
                        <CheckCircle className="h-4 w-4 text-primary" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {hook.description}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="stores" className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Store</TableHead>
                  <TableHead>Unit Tests</TableHead>
                  <TableHead>E2E Coverage</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {storeCoverage.map((store) => (
                  <TableRow key={store.storeName}>
                    <TableCell>
                      <div className="font-medium font-mono text-sm">{store.storeName}</div>
                    </TableCell>
                    <TableCell>
                      {store.hasUnitTests ? (
                        <CheckCircle className="h-4 w-4 text-primary" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell>
                      {store.hasE2ECoverage ? (
                        <CheckCircle className="h-4 w-4 text-primary" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {store.description}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="edge-functions" className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Function</TableHead>
                  <TableHead>Test Method</TableHead>
                  <TableHead>Scenarios</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {edgeFunctionCoverage.map((fn) => (
                  <TableRow key={fn.functionName}>
                    <TableCell>
                      <div className="font-medium font-mono text-sm">{fn.functionName}</div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={fn.testMethod === 'not-tested' ? 'destructive' : 'secondary'}
                      >
                        {fn.testMethod}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {fn.scenarios.length > 0 ? (
                        <div className="text-xs text-muted-foreground">
                          {fn.scenarios.length} scenarios covered
                        </div>
                      ) : (
                        <span className="text-xs text-destructive">No coverage</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
