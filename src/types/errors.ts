/**
 * Specific type interfaces for error handling and system monitoring
 * Replaces generic 'any' types with structured interfaces
 */

export interface SystemErrorContext {
  userId?: string;
  sessionId?: string;
  familyId?: string;
  route?: string;
  component?: string;
  action?: string;
  timestamp: string;
  userAgent?: string;
  url?: string;
}

export interface ErrorMetadata {
  source?: 'client' | 'server' | 'database' | 'external';
  category?: 'validation' | 'network' | 'permission' | 'system' | 'user';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  tags?: string[];
  relatedErrors?: string[];
  resolution?: {
    status: 'open' | 'in_progress' | 'resolved' | 'ignored';
    assignedTo?: string;
    notes?: string;
    resolvedAt?: string;
  };
}

export interface BrowserInfo {
  name?: string;
  version?: string;
  engine?: string;
  platform?: string;
  mobile?: boolean;
  cookieEnabled?: boolean;
  javaEnabled?: boolean;
  language?: string;
  languages?: string[];
  onLine?: boolean;
  userAgent?: string;
  vendor?: string;
  plugins?: string[];
}

export interface DeviceInfo {
  type?: 'desktop' | 'tablet' | 'mobile' | 'tv' | 'embedded';
  os?: {
    name?: string;
    version?: string;
    architecture?: string;
  };
  screen?: {
    width?: number;
    height?: number;
    colorDepth?: number;
    pixelRatio?: number;
    orientation?: 'portrait' | 'landscape';
  };
  memory?: {
    total?: number;
    used?: number;
    available?: number;
  };
  connection?: {
    effectiveType?: '2g' | '3g' | '4g' | 'slow-2g';
    downlink?: number;
    rtt?: number;
  };
}

export interface PerformanceMetadata {
  timing?: {
    navigationStart?: number;
    loadEventEnd?: number;
    domContentLoaded?: number;
    firstPaint?: number;
    firstContentfulPaint?: number;
  };
  resources?: {
    count?: number;
    totalSize?: number;
    loadTime?: number;
    failed?: string[];
  };
  memory?: {
    usedJSMemorySize?: number;
    totalJSMemorySize?: number;
    jsMemoryLimit?: number;
  };
  vitals?: {
    fcp?: number; // First Contentful Paint
    lcp?: number; // Largest Contentful Paint
    fid?: number; // First Input Delay
    cls?: number; // Cumulative Layout Shift
  };
}

export interface AlertMetadata {
  source?: string;
  category?: string;
  affectedUsers?: string[];
  relatedComponents?: string[];
  metrics?: {
    errorRate?: number;
    responseTime?: number;
    userImpact?: number;
  };
  escalation?: {
    level: number;
    nextLevel?: string;
    timeout?: number;
  };
  notification?: {
    channels: string[];
    recipients: string[];
    sent: boolean;
    sentAt?: string;
  };
}

export interface SystemHealthMetadata {
  services?: {
    [serviceName: string]: {
      status: 'healthy' | 'degraded' | 'down';
      lastCheck: string;
      responseTime?: number;
      errorRate?: number;
    };
  };
  resources?: {
    cpu?: number;
    memory?: number;
    disk?: number;
    network?: number;
  };
  dependencies?: {
    [dependencyName: string]: {
      available: boolean;
      version?: string;
      latency?: number;
    };
  };
}

export interface LogMetadata {
  level?: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  category?: string;
  tags?: string[];
  correlationId?: string;
  traceId?: string;
  spanId?: string;
  duration?: number;
  context?: Record<string, unknown>;
}