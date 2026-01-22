/**
 * Enhanced Security Monitoring for Critical Issues
 * Implements security recommendations from code review
 */

import { secureLog } from '@/utils/secureLogging';

interface SecurityEvent {
  type: 'password_generation' | 'session_anomaly' | 'auth_failure_pattern' | 'cors_mismatch';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  details: Record<string, any>;
}

class SecurityEnhancedMonitoring {
  private static instance: SecurityEnhancedMonitoring;
  private failedAuthAttempts = new Map<string, { count: number; firstAttempt: number }>();
  private sessionTracking = new Map<string, { ip: string; userAgent: string; lastSeen: number }>();
  private readonly FAILED_AUTH_THRESHOLD = 5; // 5 failed attempts trigger alert
  private readonly FAILED_AUTH_WINDOW = 300000; // 5 minutes window
  private readonly SESSION_ANOMALY_THRESHOLD = 2; // Different IP/user agent for same session

  static getInstance(): SecurityEnhancedMonitoring {
    if (!SecurityEnhancedMonitoring.instance) {
      SecurityEnhancedMonitoring.instance = new SecurityEnhancedMonitoring();
    }
    return SecurityEnhancedMonitoring.instance;
  }

  /**
   * Validate password generation method
   */
  validatePasswordGeneration(password: string, method: 'secure' | 'insecure'): void {
    if (method === 'insecure') {
      const event: SecurityEvent = {
        type: 'password_generation',
        severity: 'high',
        timestamp: Date.now(),
        details: {
          method,
          passwordLength: password.length,
          hasValidChars: /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password)
        }
      };

      this.logSecurityEvent(event);
    }
  }

  /**
   * Track failed authentication attempts for brute force detection
   */
  trackFailedAuth(email: string, ip: string, userAgent: string): void {
    const key = `${email}:${ip}`;
    const now = Date.now();
    const existing = this.failedAuthAttempts.get(key);

    if (!existing || now - existing.firstAttempt > this.FAILED_AUTH_WINDOW) {
      this.failedAuthAttempts.set(key, {
        count: 1,
        firstAttempt: now
      });
    } else {
      existing.count++;
      
      if (existing.count >= this.FAILED_AUTH_THRESHOLD) {
        const event: SecurityEvent = {
          type: 'auth_failure_pattern',
          severity: 'high',
          timestamp: now,
          details: {
            email,
            ip,
            userAgent: this.sanitizeUserAgent(userAgent),
            attemptCount: existing.count,
            timeWindow: this.FAILED_AUTH_WINDOW,
            suspicionLevel: this.calculateSuspicionLevel(existing.count)
          }
        };

        this.logSecurityEvent(event);
      }
    }

    // Clean old entries periodically
    this.cleanupOldEntries(now);
  }

  /**
   * Track session anomalies (IP/user agent changes)
   */
  trackSessionActivity(sessionId: string, ip: string, userAgent: string): void {
    const existing = this.sessionTracking.get(sessionId);
    const now = Date.now();

    if (existing) {
      const ipChanged = existing.ip !== ip;
      const userAgentChanged = existing.userAgent !== userAgent;
      const anomalies = [ipChanged, userAgentChanged].filter(Boolean).length;

      if (anomalies >= this.SESSION_ANOMALY_THRESHOLD) {
        const event: SecurityEvent = {
          type: 'session_anomaly',
          severity: 'medium',
          timestamp: now,
          details: {
            sessionId: this.hashSessionId(sessionId),
            ipChanged,
            userAgentChanged,
            previousIp: this.hashIp(existing.ip),
            currentIp: this.hashIp(ip),
            timeSinceLastActivity: now - existing.lastSeen,
            anomalyScore: anomalies
          }
        };

        this.logSecurityEvent(event);
      }
    }

    this.sessionTracking.set(sessionId, { ip, userAgent, lastSeen: now });
  }

  /**
   * Monitor CORS configuration issues
   */
  monitorCorsConfiguration(requestOrigin: string, allowedOrigin: string, corsHeaders: Record<string, string>): void {
    const hasWildcardCors = corsHeaders['Access-Control-Allow-Origin'] === '*';
    const hasDynamicCors = allowedOrigin !== requestOrigin;

    if (hasWildcardCors || (hasDynamicCors && !this.isOriginAllowed(requestOrigin))) {
      const event: SecurityEvent = {
        type: 'cors_mismatch',
        severity: 'medium',
        timestamp: Date.now(),
        details: {
          requestOrigin,
          allowedOrigin,
          hasWildcardCors,
          hasDynamicCors,
          corsHeaders: Object.keys(corsHeaders),
          risk: hasWildcardCors ? 'wildcard' : 'origin_mismatch'
        }
      };

      this.logSecurityEvent(event);
    }
  }

  /**
   * Log security event with appropriate severity
   */
  private logSecurityEvent(event: SecurityEvent): void {
    const logLevel = event.severity === 'critical' ? 'critical' : 
                   event.severity === 'high' ? 'high' : 'medium';

    secureLog.security(event.type, event.details, logLevel as 'high' | 'medium' | 'critical');

    // For critical events, consider additional notification methods
    if (event.severity === 'critical') {
      this.sendCriticalAlert(event);
    }
  }

  /**
   * Calculate suspicion level based on failed attempts
   */
  private calculateSuspicionLevel(attempts: number): 'low' | 'medium' | 'high' | 'critical' {
    if (attempts < 5) return 'low';
    if (attempts < 10) return 'medium';
    if (attempts < 20) return 'high';
    return 'critical';
  }

  /**
   * Sanitize user agent for logging
   */
  private sanitizeUserAgent(userAgent: string): string {
    return userAgent.substring(0, 100).replace(/[^\w\s\-./]/g, '*');
  }

  /**
   * Hash session ID for logging (don't expose actual session IDs)
   */
  private hashSessionId(sessionId: string): string {
    // Simple hash for demonstration - use proper hashing in production
    return sessionId.substring(0, 8) + '****';
  }

  /**
   * Hash IP for logging (partial privacy protection)
   */
  private hashIp(ip: string): string {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.***.***`;
    }
    return ip.substring(0, 6) + '****';
  }

  /**
   * Check if origin is in allowed list
   */
  private isOriginAllowed(origin: string): boolean {
    const allowedOrigins = [
      'https://lovable.dev',
      'https://*.lovable.dev',
      'https://*.lovableproject.com',
      'https://lxuqfgbukrrickanmmic.supabase.co',
      'http://localhost:3000',
      'http://localhost:5173'
    ];

    return allowedOrigins.some(allowed => {
      if (allowed.includes('*')) {
        const regex = new RegExp(allowed.replace('*', '[a-zA-Z0-9-]+'));
        return regex.test(origin);
      }
      return allowed === origin;
    });
  }

  /**
   * Clean old entries to prevent memory leaks
   */
  private cleanupOldEntries(now: number): void {
    // Clean failed auth attempts older than window
    for (const [key, entry] of this.failedAuthAttempts.entries()) {
      if (now - entry.firstAttempt > this.FAILED_AUTH_WINDOW) {
        this.failedAuthAttempts.delete(key);
      }
    }

    // Clean session tracking older than 1 hour
    const sessionTimeout = 3600000; // 1 hour
    for (const [sessionId, session] of this.sessionTracking.entries()) {
      if (now - session.lastSeen > sessionTimeout) {
        this.sessionTracking.delete(sessionId);
      }
    }
  }

  /**
   * Send critical security alerts (implement as needed)
   */
  private sendCriticalAlert(event: SecurityEvent): void {
    // This could integrate with:
    // - Email notifications
    // - Slack/Discord webhooks
    // - SMS alerts
    // - External security monitoring services
    
    console.error('CRITICAL SECURITY ALERT:', event);
  }

  /**
   * Generate security report
   */
  generateSecurityReport(): {
    timestamp: number;
    activeFailedAttempts: number;
    activeSessions: number;
    recentEvents: SecurityEvent[];
    recommendations: string[];
  } {
    const now = Date.now();
    const activeFailedAttempts = Array.from(this.failedAuthAttempts.values())
      .filter(entry => now - entry.firstAttempt < this.FAILED_AUTH_WINDOW)
      .reduce((sum, entry) => sum + entry.count, 0);

    const recentEvents = this.getRecentEvents();
    const recommendations = this.generateRecommendations(recentEvents);

    return {
      timestamp: now,
      activeFailedAttempts,
      activeSessions: this.sessionTracking.size,
      recentEvents,
      recommendations
    };
  }

  /**
   * Get recent security events
   */
  private getRecentEvents(): SecurityEvent[] {
    // In a real implementation, this would pull from a persistent store
    // For now, return a summary of current state
    const events: SecurityEvent[] = [];
    const now = Date.now();

    for (const [key, entry] of this.failedAuthAttempts.entries()) {
      if (entry.count >= this.FAILED_AUTH_THRESHOLD) {
        events.push({
          type: 'auth_failure_pattern',
          severity: 'high',
          timestamp: entry.firstAttempt,
          details: {
            attemptCount: entry.count,
            key: key.substring(0, 20) + '****'
          }
        });
      }
    }

    return events.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);
  }

  /**
   * Generate security recommendations
   */
  private generateRecommendations(events: SecurityEvent[]): string[] {
    const recommendations: string[] = [];
    const eventTypes = new Set(events.map(e => e.type));

    if (eventTypes.has('auth_failure_pattern')) {
      recommendations.push('Consider implementing CAPTCHA after 3 failed attempts');
      recommendations.push('Review password reset frequency for suspicious accounts');
    }

    if (eventTypes.has('session_anomaly')) {
      recommendations.push('Implement multi-factor authentication for session changes');
      recommendations.push('Consider notifying users of session anomalies');
    }

    if (eventTypes.has('cors_mismatch')) {
      recommendations.push('Review CORS configuration to prevent wildcard usage');
      recommendations.push('Implement dynamic origin validation for all endpoints');
    }

    if (eventTypes.has('password_generation')) {
      recommendations.push('Ensure all password generation uses cryptographically secure methods');
      recommendations.push('Audit existing passwords generated with insecure methods');
    }

    return recommendations;
  }
}

// Export singleton instance
export const securityEnhancedMonitoring = SecurityEnhancedMonitoring.getInstance();

export default securityEnhancedMonitoring;