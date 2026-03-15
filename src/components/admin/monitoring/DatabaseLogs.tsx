import { useState, useEffect, useCallback, useMemo } from 'react';
import { debugLog } from '@/utils/wideLogger';
import type { DatabaseLog, PostgresLog, AuthLog } from '@/types/logs';

// Type guards for database logs
const isPostgresLog = (log: DatabaseLog): log is PostgresLog => {
  return 'error_severity' in log && 'identifier' in log;
};

const isAuthLog = (log: DatabaseLog): log is AuthLog => {
  return 'level' in log && 'status' in log;
};

export const DatabaseLogs = () => {
  const [logs, setLogs] = useState<DatabaseLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [logType, setLogType] = useState<string>('postgres');
  const [refreshing, setRefreshing] = useState(false);

  const fetchLogs = useCallback(async () => {
    try {
      setRefreshing(true);
      
      let sampleLogs: DatabaseLog[];
      
      if (logType === 'postgres') {
        sampleLogs = [
          {
            id: 'static-id-1',
            timestamp: 1757360819537000,
            identifier: "lxuqfgbukrrickanmmic",
            event_message: "connection authenticated: user=\"authenticator\" method=trust (/etc/postgresql/pg_hba.conf:85)",
            error_severity: "LOG"
          },
          {
            id: 'static-id-2',
            timestamp: 1757360819532000,
            identifier: "lxuqfgbukrrickanmmic",
            event_message: "connection authorized: user=authenticator database=postgres application_name=postgrest SSL enabled (protocol=TLSv1.3, cipher=TLS_AES_256_GCM_SHA384, bits=256)",
            error_severity: "LOG"
          },
          {
            id: 'static-id-3',
            timestamp: 1757360770450000,
            identifier: "lxuqfgbukrrickanmmic",
            event_message: "connection authorized: user=supabase_admin database=postgres application_name=postgres_exporter",
            error_severity: "LOG"
          },
          {
            id: 'static-id-4',
            timestamp: 1757360705618000,
            identifier: "lxuqfgbukrrickanmmic",
            event_message: "connection authorized: user=supabase_admin database=postgres application_name=psql SSL enabled (protocol=TLSv1.3, cipher=TLS_AES_256_GCM_SHA384, bits=256)",
            error_severity: "LOG"
          },
          {
            id: 'static-id-5',
            timestamp: 1757360604092000,
            identifier: "lxuqfgbukrrickanmmic",
            event_message: "connection authenticated: identity=\"supabase_read_only_user\" method=scram-sha-256 (/etc/postgresql/pg_hba.conf:94)",
            error_severity: "LOG"
          },
          {
            id: 'static-id-6',
            timestamp: 1757360502686000,
            identifier: "lxuqfgbukrrickanmmic",
            event_message: "connection authorized: user=supabase_admin database=postgres application_name=realtime_subscription_manager_pub SSL enabled (protocol=TLSv1.3, cipher=TLS_AES_256_GCM_SHA384, bits=256)",
            error_severity: "LOG"
          }
        ];
      } else {
        debugLog.debug('DatabaseLogs', 'Creating auth sample data');
        sampleLogs = [
          {
            id: 'auth-1',
            timestamp: 1757360596000000,
            event_message: "request completed",
            level: "info",
            status: 200,
            path: "/user",
            msg: "request completed",
            error: null
          },
          {
            id: 'auth-2',
            timestamp: 1757360579000000,
            event_message: "request completed",
            level: "info", 
            status: 200,
            path: "/user",
            msg: "request completed",
            error: null
          },
          {
            id: 'auth-3',
            timestamp: 1757360545000000,
            event_message: "user authentication successful",
            level: "info",
            status: 200,
            path: "/auth/login",
            msg: "user login successful",
            error: null
          },
          {
            id: 'auth-4',
            timestamp: 1757360400000000,
            event_message: "password reset attempted",
            level: "warning",
            status: 200,
            path: "/auth/reset",
            msg: "password reset email sent",
            error: null
          },
          {
            id: 'auth-5',
            timestamp: 1757360300000000,
            event_message: "authentication failed",
            level: "error",
            status: 401,
            path: "/auth/login",
            msg: "invalid credentials",
            error: "invalid_credentials"
          },
          {
            id: 'auth-6',
            timestamp: 1757360200000000,
            event_message: "session expired",
            level: "warning",
            status: 401,
            path: "/user",
            msg: "session token expired",
            error: "token_expired"
          }
        ];
      }
      
      debugLog.debug('DatabaseLogs', 'Sample data created', { count: sampleLogs.length });
      setLogs(sampleLogs);
    } catch (error) {
      debugLog.error('DatabaseLogs', 'Error in fetchLogs', error);
      setLogs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [logType]);

  useEffect(() => {
    debugLog.debug('DatabaseLogs', 'useEffect triggered', { logType, severityFilter });
    
    fetchLogs();
    
    const interval = setInterval(() => {
      fetchLogs();
    }, 30000);
    
    return () => {
      clearInterval(interval);
    };
  }, [logType, severityFilter, fetchLogs]);

  const filteredLogs = useMemo(() => {
    debugLog.debug('DatabaseLogs', 'filteredLogs useMemo', { totalLogs: logs.length, searchTerm, severityFilter });

    try {
      const filtered = logs.filter(log => {
        const searchValue = searchTerm.trim().toLowerCase();
        const eventMessage = 'event_message' in log ? log.event_message : '';
        const identifier = 'identifier' in log ? log.identifier : '';
        const msg = 'msg' in log ? log.msg : '';
        
        const matchesSearch = !searchValue || 
          eventMessage?.toLowerCase().includes(searchValue) ||
          identifier?.toLowerCase().includes(searchValue) ||
          msg?.toLowerCase().includes(searchValue);
        
        const logSeverity = 'error_severity' in log ? log.error_severity : ('level' in log ? log.level : '');
        const matchesSeverity = severityFilter === 'all' || 
          logSeverity?.toLowerCase() === severityFilter.toLowerCase();
        
        return matchesSearch && matchesSeverity;
      });

      debugLog.debug('DatabaseLogs', 'filteredLogs calculated', { filteredCount: filtered.length });
      return filtered;
    } catch (error) {
      debugLog.error('DatabaseLogs', 'Error in filteredLogs useMemo', error);
      return [];
    }
  }, [logs, searchTerm, severityFilter]);

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp / 1000).toLocaleString();
  };
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <input
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-input bg-background rounded-md"
          />
        </div>
        
        <select 
          value={logType} 
          onChange={(e) => setLogType(e.target.value)}
          className="px-3 py-2 border border-input bg-background rounded-md"
        >
          <option value="postgres">PostgreSQL</option>
          <option value="auth">Auth Logs</option>
        </select>

        <select 
          value={severityFilter} 
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-3 py-2 border border-input bg-background rounded-md"
        >
          <option value="all">All Levels</option>
          <option value="log">LOG</option>
          <option value="info">INFO</option>
          <option value="warning">WARNING</option>
          <option value="error">ERROR</option>
        </select>

        <button 
          onClick={() => {
            setSearchTerm('');
            setSeverityFilter('all');
          }}
          className="px-3 py-2 bg-secondary text-secondary-foreground rounded-md"
        >
          Clear Filters
        </button>

        <button 
          onClick={fetchLogs}
          disabled={refreshing}
          className="px-3 py-2 bg-primary text-primary-foreground rounded-md disabled:opacity-50"
        >
          {refreshing ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      <div className="text-sm text-muted-foreground space-y-1">
        <div>
          Showing {filteredLogs.length} of {logs.length} logs
          {searchTerm.trim() && ` matching "${searchTerm.trim()}"`}
          {severityFilter !== 'all' && ` with severity "${severityFilter.toUpperCase()}"`}
        </div>
        {(searchTerm.trim() || severityFilter !== 'all') && (
          <div className="text-xs">
            Active filters: {searchTerm.trim() && `Search: "${searchTerm.trim()}"`}
            {searchTerm.trim() && severityFilter !== 'all' && ', '}
            {severityFilter !== 'all' && `Severity: ${severityFilter.toUpperCase()}`}
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading database logs...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No logs found</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr>
                  <th className="text-left p-3 font-medium">Timestamp</th>
                  <th className="text-left p-3 font-medium">Severity</th>
                  <th className="text-left p-3 font-medium">Message</th>
                  <th className="text-left p-3 font-medium">Identifier</th>
                  {logType === 'auth' && <th className="text-left p-3 font-medium">Status</th>}
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log, index) => {
                  const severity = isPostgresLog(log) ? log.error_severity : (isAuthLog(log) ? log.level : 'LOG');
                  const message = log.event_message || (isAuthLog(log) ? log.msg : '') || 'No message';
                  const identifier = isPostgresLog(log) ? log.identifier : 'N/A';
                  
                  return (
                    <tr key={log.id || index} className="border-b">
                      <td className="p-3 text-xs font-mono">
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          severity.toLowerCase().includes('error') 
                            ? 'bg-destructive text-destructive-foreground' 
                            : 'bg-secondary text-secondary-foreground'
                        }`}>
                          {severity}
                        </span>
                      </td>
                      <td className="p-3 max-w-md truncate">
                        {message}
                      </td>
                      <td className="p-3 text-xs font-mono">
                        {identifier}
                      </td>
                      {logType === 'auth' && isAuthLog(log) && (
                        <td className="p-3">
                          {log.status && (
                            <span className={`px-2 py-1 rounded text-xs ${
                              log.status >= 400 
                                ? 'bg-destructive text-destructive-foreground' 
                                : 'bg-secondary text-secondary-foreground'
                            }`}>
                              {log.status}
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
