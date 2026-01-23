/**
 * Hook for verifying edge function deployment status
 */
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { 
  EdgeFunctionStatus, 
  EdgeFunctionHealthSummary, 
  DeploymentVerificationResult 
} from '@/types/edgeFunctionHealth';

// List of known edge functions to verify
const EDGE_FUNCTIONS = [
  { name: 'security-monitoring', hasHealthEndpoint: true },
  { name: 'security-testing', hasHealthEndpoint: true },
  { name: 'error-collector', hasHealthEndpoint: false },
  { name: 'create-test-family', hasHealthEndpoint: false },
  { name: 'create-child-account', hasHealthEndpoint: false },
  { name: 'complete-child-account', hasHealthEndpoint: false },
  { name: 'admin-create-user', hasHealthEndpoint: false },
  { name: 'admin-update-user', hasHealthEndpoint: false },
  { name: 'admin-add-family-member', hasHealthEndpoint: false },
  { name: 'admin-remove-family-member', hasHealthEndpoint: false },
  { name: 'cleanup-test-families', hasHealthEndpoint: false },
  { name: 'delete-family-comprehensive', hasHealthEndpoint: false },
  { name: 'send-family-email', hasHealthEndpoint: false },
  { name: 'api-integration-status', hasHealthEndpoint: false },
  { name: 'grok-chat', hasHealthEndpoint: false },
  { name: 'manage-llm-provider', hasHealthEndpoint: false },
  { name: 'process-recurring-chores', hasHealthEndpoint: false },
  { name: 'supabase-analytics-query', hasHealthEndpoint: false },
  { name: 'text-to-speech', hasHealthEndpoint: false },
  { name: 'update-site-settings', hasHealthEndpoint: false },
];

export function useEdgeFunctionHealth() {
  const [functions, setFunctions] = useState<EdgeFunctionStatus[]>([]);
  const [summary, setSummary] = useState<EdgeFunctionHealthSummary>({
    total: EDGE_FUNCTIONS.length,
    healthy: 0,
    unhealthy: 0,
    unknown: EDGE_FUNCTIONS.length,
    lastVerified: null,
  });
  const [isVerifying, setIsVerifying] = useState(false);
  const [lastVerified, setLastVerified] = useState<string | null>(null);

  const checkFunctionHealth = useCallback(async (
    funcConfig: { name: string; hasHealthEndpoint: boolean }
  ): Promise<EdgeFunctionStatus> => {
    const startTime = Date.now();
    
    try {
      if (funcConfig.hasHealthEndpoint) {
        // For functions with health endpoints, try POST with health action
        const { data, error } = await supabase.functions.invoke(funcConfig.name, {
          body: { action: 'health' },
        });

        if (error) {
          throw error;
        }

        return {
          name: funcConfig.name,
          status: data?.status === 'ok' ? 'healthy' : 'healthy', // If we get a response, it's deployed
          lastChecked: new Date().toISOString(),
          responseTimeMs: Date.now() - startTime,
          error: null,
          hasHealthEndpoint: true,
        };
      } else {
        // For functions without health endpoints, try OPTIONS (CORS preflight)
        // This at least verifies the function is deployed
        const response = await fetch(
          `https://lxuqfgbukrrickanmmic.supabase.co/functions/v1/${funcConfig.name}`,
          { method: 'OPTIONS' }
        );
        
        const responseTime = Date.now() - startTime;
        
        // CORS preflight should return 200 or 204
        if (response.ok || response.status === 204) {
          return {
            name: funcConfig.name,
            status: 'healthy',
            lastChecked: new Date().toISOString(),
            responseTimeMs: responseTime,
            error: null,
            hasHealthEndpoint: false,
          };
        }
        
        return {
          name: funcConfig.name,
          status: 'unhealthy',
          lastChecked: new Date().toISOString(),
          responseTimeMs: responseTime,
          error: `HTTP ${response.status}`,
          hasHealthEndpoint: false,
        };
      }
    } catch (err) {
      return {
        name: funcConfig.name,
        status: 'unhealthy',
        lastChecked: new Date().toISOString(),
        responseTimeMs: Date.now() - startTime,
        error: err instanceof Error ? err.message : 'Unknown error',
        hasHealthEndpoint: funcConfig.hasHealthEndpoint,
      };
    }
  }, []);

  const verifyAllFunctions = useCallback(async (): Promise<DeploymentVerificationResult> => {
    setIsVerifying(true);
    
    // Set all functions to checking state
    setFunctions(EDGE_FUNCTIONS.map(f => ({
      name: f.name,
      status: 'checking' as const,
      lastChecked: null,
      responseTimeMs: null,
      error: null,
      hasHealthEndpoint: f.hasHealthEndpoint,
    })));

    // Check all functions in parallel with concurrency limit
    const results: EdgeFunctionStatus[] = [];
    const batchSize = 5; // Check 5 at a time to avoid overwhelming
    
    for (let i = 0; i < EDGE_FUNCTIONS.length; i += batchSize) {
      const batch = EDGE_FUNCTIONS.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(func => checkFunctionHealth(func))
      );
      results.push(...batchResults);
      
      // Update state progressively
      setFunctions(prev => {
        const updated = [...prev];
        batchResults.forEach((result, idx) => {
          const globalIdx = i + idx;
          if (globalIdx < updated.length) {
            updated[globalIdx] = result;
          }
        });
        return updated;
      });
    }

    const verifiedAt = new Date().toISOString();
    const newSummary: EdgeFunctionHealthSummary = {
      total: results.length,
      healthy: results.filter(f => f.status === 'healthy').length,
      unhealthy: results.filter(f => f.status === 'unhealthy').length,
      unknown: results.filter(f => f.status === 'unknown').length,
      lastVerified: verifiedAt,
    };

    setFunctions(results);
    setSummary(newSummary);
    setLastVerified(verifiedAt);
    setIsVerifying(false);

    return {
      functions: results,
      summary: newSummary,
      verifiedAt,
    };
  }, [checkFunctionHealth]);

  const verifySingleFunction = useCallback(async (name: string): Promise<EdgeFunctionStatus> => {
    const funcConfig = EDGE_FUNCTIONS.find(f => f.name === name);
    if (!funcConfig) {
      return {
        name,
        status: 'unknown',
        lastChecked: new Date().toISOString(),
        responseTimeMs: null,
        error: 'Function not in known list',
        hasHealthEndpoint: false,
      };
    }

    // Set to checking
    setFunctions(prev => prev.map(f => 
      f.name === name ? { ...f, status: 'checking' as const } : f
    ));

    const result = await checkFunctionHealth(funcConfig);
    
    // Update the specific function
    setFunctions(prev => prev.map(f => 
      f.name === name ? result : f
    ));

    // Update summary
    setSummary(prev => {
      const currentFuncs = functions.map(f => f.name === name ? result : f);
      return {
        ...prev,
        healthy: currentFuncs.filter(f => f.status === 'healthy').length,
        unhealthy: currentFuncs.filter(f => f.status === 'unhealthy').length,
        unknown: currentFuncs.filter(f => f.status === 'unknown' || f.status === 'checking').length,
        lastVerified: new Date().toISOString(),
      };
    });

    return result;
  }, [checkFunctionHealth, functions]);

  return {
    functions,
    summary,
    isVerifying,
    lastVerified,
    verifyAllFunctions,
    verifySingleFunction,
    edgeFunctionCount: EDGE_FUNCTIONS.length,
  };
}
