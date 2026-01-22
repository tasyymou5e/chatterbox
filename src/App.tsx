import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useAutoErrorLogging } from "@/hooks/useAutoErrorLogging";
import { SecurityMonitoringProvider } from '@/components/security/SecurityMonitoringService';
import { ProductionSecurityWrapper } from '@/components/security/ProductionSecurityWrapper';
import { usePerformanceMonitoringSafe } from "@/hooks/usePerformanceMonitoringSafe";
import { PWAInstallPrompt } from '@/components/pwa/PWAInstallPrompt';
import {
  coreRoutes,
  parentRoutes,
  kidsRoutes,
  featureRoutes,
  supportRoutes,
  connectRoutes,
  gameRoutes,
  adminAuthRoutes,
  adminChildRoutes,
  getAdminLayoutRoute,
  notFoundRoute,
} from '@/routes';

const App = () => {
  useAutoErrorLogging();
  
  const { measurePageLoad, measureMemoryUsage } = usePerformanceMonitoringSafe();
  const ENABLE_PERFORMANCE_MONITORING = true;
  
  useEffect(() => {
    if (!ENABLE_PERFORMANCE_MONITORING) return;
    
    const timer = setTimeout(() => {
      measurePageLoad();
      measureMemoryUsage();
    }, 1000);
    
    const memoryInterval = setInterval(() => {
      measureMemoryUsage();
    }, 60000);
    
    return () => {
      clearTimeout(timer);
      clearInterval(memoryInterval);
    };
  }, [ENABLE_PERFORMANCE_MONITORING, measurePageLoad, measureMemoryUsage]);

  const adminLayoutRoute = getAdminLayoutRoute();

  return (
    <TooltipProvider>
      <ProductionSecurityWrapper>
        <SecurityMonitoringProvider>
          <ErrorBoundary componentName="App">
            <Toaster />
            <Sonner />
            <PWAInstallPrompt />
            <Routes>
              {/* Core routes */}
              {coreRoutes.map(route => (
                <Route key={route.path} path={route.path} element={route.element} />
              ))}
              
              {/* Parent routes */}
              {parentRoutes.map(route => (
                <Route key={route.path} path={route.path} element={route.element} />
              ))}
              
              {/* Kids routes */}
              {kidsRoutes.map(route => (
                <Route key={route.path} path={route.path} element={route.element} />
              ))}
              
              {/* Feature routes */}
              {featureRoutes.map(route => (
                <Route key={route.path} path={route.path} element={route.element} />
              ))}
              
              {/* Support routes */}
              {supportRoutes.map(route => (
                <Route key={route.path} path={route.path} element={route.element} />
              ))}
              
              {/* Connect routes */}
              {connectRoutes.map(route => (
                <Route key={route.path} path={route.path} element={route.element} />
              ))}
              
              {/* Game routes */}
              {gameRoutes.map(route => (
                <Route key={route.path} path={route.path} element={route.element} />
              ))}
              
              {/* Admin auth routes */}
              {adminAuthRoutes.map(route => (
                <Route key={route.path} path={route.path} element={route.element} />
              ))}
              
              {/* Protected Admin routes with layout */}
              <Route path={adminLayoutRoute.path} element={adminLayoutRoute.element}>
                {adminChildRoutes.map(route => (
                  <Route 
                    key={route.path || 'index'} 
                    index={route.path === ''}
                    path={route.path || undefined}
                    element={route.element} 
                  />
                ))}
              </Route>
              
              {/* Catch-all route */}
              <Route path={notFoundRoute.path} element={notFoundRoute.element} />
            </Routes>
          </ErrorBoundary>
        </SecurityMonitoringProvider>
      </ProductionSecurityWrapper>
    </TooltipProvider>
  );
};

export default App;
