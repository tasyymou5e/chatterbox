/**
 * Production security wrapper that removes development artifacts
 */
import React, { useEffect } from 'react';
import { initSecureLogging, secureLog } from '@/utils/secureLogging';

interface ProductionSecurityWrapperProps {
  children: React.ReactNode;
}

export const ProductionSecurityWrapper: React.FC<ProductionSecurityWrapperProps> = ({ 
  children 
}) => {
  useEffect(() => {
    // Initialize secure logging on app start
    initSecureLogging();
    
    // Remove development tools in production
    if (process.env.NODE_ENV === 'production') {
      // Disable right-click context menu
      const disableRightClick = (e: MouseEvent) => {
        e.preventDefault();
        return false;
      };
      
      // Disable F12, Ctrl+Shift+I, Ctrl+U, etc.
      const disableDevTools = (e: KeyboardEvent) => {
        if (
          e.key === 'F12' ||
          (e.ctrlKey && e.shiftKey && e.key === 'I') ||
          (e.ctrlKey && e.shiftKey && e.key === 'C') ||
          (e.ctrlKey && e.key === 'U')
        ) {
          e.preventDefault();
          return false;
        }
        return undefined;
      };
      
      // Disable drag and drop for security
      const disableDragDrop = (e: DragEvent) => {
        e.preventDefault();
        return false;
      };
      
      // Add event listeners
      document.addEventListener('contextmenu', disableRightClick);
      document.addEventListener('keydown', disableDevTools);
      document.addEventListener('dragover', disableDragDrop);
      document.addEventListener('drop', disableDragDrop);
      
      // Security headers check
      const checkSecurityHeaders = () => {
        // Check if running over HTTPS in production
        if (window.location.protocol !== 'https:') {
          secureLog.security('Application should be served over HTTPS in production', { protocol: window.location.protocol }, 'low');
        }
        
        // Check for security headers (these would be set by server/CDN)
        fetch(window.location.href, { method: 'HEAD' })
          .then(response => {
            const securityHeaders = [
              'content-security-policy',
              'x-frame-options',
              'x-content-type-options',
              'referrer-policy',
              'permissions-policy'
            ];
            
            securityHeaders.forEach(header => {
              if (!response.headers.get(header)) {
                secureLog.security('Missing security header', { header }, 'low');
              }
            });
          })
          .catch(() => {
            // Silent fail - don't log network errors
          });
      };
      
      checkSecurityHeaders();
      
      // Cleanup function
      return () => {
        document.removeEventListener('contextmenu', disableRightClick);
        document.removeEventListener('keydown', disableDevTools);
        document.removeEventListener('dragover', disableDragDrop);
        document.removeEventListener('drop', disableDragDrop);
      };
    }
    return undefined;
  }, []);

  // Content Security Policy meta tag injection
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      // Check if CSP meta tag exists, if not warn
      const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      if (!cspMeta) {
        secureLog.security('Content Security Policy meta tag not found. Consider adding CSP headers.', null, 'low');
      }
    }
  }, []);

  return <>{children}</>;
};