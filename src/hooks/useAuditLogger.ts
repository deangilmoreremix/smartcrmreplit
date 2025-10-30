import { useCallback } from 'react';

interface AuditLogEntry {
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  timestamp: string;
  userId: string;
  ipAddress?: string;
}

export const useAuditLogger = () => {
  const logAction = useCallback(async (entry: Omit<AuditLogEntry, 'timestamp' | 'userId'>) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      await fetch('/api/audit/log', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...entry,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      // Silently fail audit logging to avoid disrupting main functionality
      console.warn('Audit logging failed:', error);
    }
  }, []);

  const logTenantAction = useCallback((action: string, tenantId: string, details?: Record<string, any>) => {
    logAction({
      action,
      resource: 'tenant',
      resourceId: tenantId,
      details,
    });
  }, [logAction]);

  const logPartnerAction = useCallback((action: string, partnerId: string, details?: Record<string, any>) => {
    logAction({
      action,
      resource: 'partner',
      resourceId: partnerId,
      details,
    });
  }, [logAction]);

  const logSystemAction = useCallback((action: string, details?: Record<string, any>) => {
    logAction({
      action,
      resource: 'system',
      details,
    });
  }, [logAction]);

  return {
    logAction,
    logTenantAction,
    logPartnerAction,
    logSystemAction,
  };
};