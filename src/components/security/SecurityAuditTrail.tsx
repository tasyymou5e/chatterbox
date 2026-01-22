/**
 * Enhanced security audit trail with comprehensive logging
 */
import React, { useState, useEffect } from 'react';
import { cWarn } from '@/utils/conditionalLogger';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter, Download, Search, Shield, User, Database, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import type { AuditEventDetails } from '@/types/analytics';

interface AuditEvent {
  id: string;
  user_id: string | null;
  event_type: string;
  severity: string;
  event_details: AuditEventDetails;
  created_at: string;
  ip_address?: unknown;
  user_agent?: string | null;
}

interface AuditFilters {
  event_type?: string;
  severity?: string;
  user_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export const SecurityAuditTrail: React.FC = () => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<AuditFilters>({});
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  useEffect(() => {
    loadAuditEvents();
  }, [filters, currentPage]);

  const isValidUUID = (uuid: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  };

  const loadAuditEvents = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('security_audit_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

      // Apply filters with validation
      if (filters.event_type && filters.event_type !== 'all') {
        query = query.eq('event_type', filters.event_type);
      }
      
      if (filters.severity && filters.severity !== 'all') {
        query = query.eq('severity', filters.severity);
      }
      
      if (filters.user_id && filters.user_id.trim()) {
        if (isValidUUID(filters.user_id.trim())) {
          query = query.eq('user_id', filters.user_id.trim());
        } else {
          // Skip invalid UUID to prevent database errors
          cWarn('Invalid UUID format for user_id filter', filters.user_id);
        }
      }
      
      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from);
      }
      
      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      // Map DB rows to typed AuditEvent interface
      const typedEvents: AuditEvent[] = (data || []).map(row => ({
        id: row.id,
        user_id: row.user_id,
        event_type: row.event_type,
        severity: row.severity,
        event_details: (row.event_details as AuditEventDetails) || {},
        created_at: row.created_at,
        ip_address: row.ip_address,
        user_agent: row.user_agent,
      }));

      setEvents(typedEvents);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Failed to load audit events:', error);
      setEvents([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  const exportAuditLog = async () => {
    try {
      const { data, error } = await supabase
        .from('security_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10000); // Export last 10k events

      if (error) throw error;

      const csvContent = [
        'Timestamp,User ID,Event Type,Severity,Details,IP Address',
        ...(data || []).map(event => {
          const details = (event.event_details as AuditEventDetails) || {};
          return [
            event.created_at,
            event.user_id || '',
            event.event_type,
            event.severity,
            JSON.stringify(event.event_details).replace(/"/g, '""'),
            details.ip_address || ''
          ].join(',');
        })
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `security-audit-${format(new Date(), 'yyyy-MM-dd-HH-mm')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export audit log:', error);
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'authentication':
      case 'login':
      case 'logout':
        return <User className="h-4 w-4" />;
      case 'rls_violation':
      case 'database_access':
        return <Database className="h-4 w-4" />;
      case 'security_alert':
      case 'suspicious_activity':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const formatEventDetails = (details: AuditEventDetails): string => {
    if (!details) return '';
    
    // Format common event details
    if (details.alert_type) {
      return `Alert: ${details.alert_type}`;
    }
    
    if (details.table && details.operation) {
      return `${details.operation} on ${details.table}`;
    }
    
    if (details.activity_type) {
      return `Activity: ${details.activity_type}`;
    }
    
    return JSON.stringify(details, null, 2).substring(0, 200) + '...';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Security Audit Trail</h1>
        </div>
        <Button onClick={exportAuditLog} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Log
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Event Type</label>
              <Select 
                value={filters.event_type || 'all'} 
                onValueChange={(value) => setFilters({...filters, event_type: value === 'all' ? undefined : value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="authentication">Authentication</SelectItem>
                  <SelectItem value="rls_violation">RLS Violation</SelectItem>
                  <SelectItem value="security_alert">Security Alert</SelectItem>
                  <SelectItem value="suspicious_activity">Suspicious Activity</SelectItem>
                  <SelectItem value="family_access_attempt">Family Access</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Severity</label>
              <Select 
                value={filters.severity || 'all'} 
                onValueChange={(value) => setFilters({...filters, severity: value === 'all' ? undefined : value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All levels</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Date From</label>
              <Input 
                type="datetime-local"
                value={filters.date_from || ''}
                onChange={(e) => setFilters({...filters, date_from: e.target.value || undefined})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Date To</label>
              <Input 
                type="datetime-local"
                value={filters.date_to || ''}
                onChange={(e) => setFilters({...filters, date_to: e.target.value || undefined})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">User ID</label>
              <Input 
                placeholder="Enter valid UUID"
                value={filters.user_id || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setFilters({...filters, user_id: value || undefined});
                }}
                className={filters.user_id && filters.user_id.trim() && !isValidUUID(filters.user_id.trim()) ? 'border-red-500' : ''}
              />
              {filters.user_id && filters.user_id.trim() && !isValidUUID(filters.user_id.trim()) && (
                <p className="text-xs text-red-500">Please enter a valid UUID format</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search events"
                  className="pl-8"
                  value={filters.search || ''}
                  onChange={(e) => setFilters({...filters, search: e.target.value || undefined})}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center mt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setFilters({});
                setCurrentPage(1);
              }}
            >
              Clear Filters
            </Button>
            <div className="text-sm text-muted-foreground">
              Showing {events.length} of {totalCount} events
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Events */}
      <Card>
        <CardHeader>
          <CardTitle>Security Events</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No security events found matching your criteria.
            </div>
          ) : (
            <div className="space-y-2">
              {events.map((event) => (
                <Card key={event.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {getEventIcon(event.event_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="font-medium">{event.event_type}</span>
                          <Badge variant={getSeverityColor(event.severity)}>
                            {event.severity}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(event.created_at), 'MMM d, yyyy HH:mm:ss')}
                          </span>
                        </div>
                        
                        <div className="text-sm space-y-1">
                          {event.user_id && (
                            <div>
                              <span className="font-medium">User ID:</span> {event.user_id}
                            </div>
                          )}
                          
                          <div>
                            <span className="font-medium">Details:</span>
                            <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto">
                              {formatEventDetails(event.event_details)}
                            </pre>
                          </div>
                          
                          {event.event_details?.ip_address && (
                            <div>
                              <span className="font-medium">IP Address:</span> {event.event_details.ip_address}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalCount > pageSize && (
            <div className="flex justify-center space-x-2 mt-6">
              <Button 
                variant="outline" 
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="flex items-center px-3">
                Page {currentPage} of {Math.ceil(totalCount / pageSize)}
              </span>
              <Button 
                variant="outline" 
                onClick={() => setCurrentPage(Math.min(Math.ceil(totalCount / pageSize), currentPage + 1))}
                disabled={currentPage >= Math.ceil(totalCount / pageSize)}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};