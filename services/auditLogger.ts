
import type { AuditLog } from '../types.ts';

import { generateUUID } from '../utils/uuid.ts';

import { supabase } from './supabaseClient.ts';

const IP_STORAGE_KEY = 'mentis-session-ip';

export const logAccess = async (
    user: { id: string; email: string } | null,
    resource: string,
    resourceId: string | undefined,
    action: string,
    details: Record<string, any> = {}
): Promise<AuditLog | null> => {
    if (!user) {
        return null;
    }

    const newLog: Partial<AuditLog> = {
        userId: user.id,
        userEmail: user.email,
        action,
        resource,
        resourceId,
        details,
        timestamp: new Date().toISOString(),
    };

    try {
        const { error } = await supabase.from('audit_logs').insert({
            actor_id: newLog.userId,
            action: newLog.action,
            resource: newLog.resource,
            resource_id: newLog.resourceId,
            details: newLog.details
            // ip_address é populado no servidor via trigger do banco (trg_set_audit_log_ip)
        });

        if (error) {
            console.error("Failed to write audit log to Supabase:", error);
        }
    } catch (e) {
        console.error("Exception writing audit log:", e);
    }

    return {
        id: 'pending-uuid',
        ...newLog
    } as AuditLog;
};

// Legacy Wrapper for backward compatibility
export const logEvent = async (user: { id: string; email: string } | null, action: string, details: Record<string, any> = {}): Promise<AuditLog | null> => {
    // Infer resource from action or details
    let resource = 'system';
    let resourceId = details.id || details.patientId || details.sessionId || details.goalId || undefined;

    if (action.includes('patient')) resource = 'patient';
    else if (action.includes('session')) resource = 'session';
    else if (action.includes('financial') || action.includes('payment')) resource = 'financial';
    else if (action.includes('document')) resource = 'document';
    else if (action.includes('goal') || action.includes('intervention')) resource = 'treatment_plan';
    else if (action.includes('login') || action.includes('logout')) resource = 'auth';

    return logAccess(user, resource, resourceId, action, details);
};

export const fetchLogs = async (): Promise<AuditLog[]> => {
    const { data, error } = await supabase
        .from('audit_logs')
        .select(`
            id,
            actor_id,
            action,
            resource,
            resource_id,
            details,
            ip_address,
            created_at,
            profiles ( email ) -- Join to get email if policies allow
        `)
        .order('created_at', { ascending: false })
        .limit(100);

    if (error) {
        console.error("Failed to fetch audit logs:", error);
        return [];
    }

    return data.map((row: any) => ({
        id: row.id,
        userId: row.actor_id,
        userEmail: row.profiles?.email || 'Unknown', // This relies on Profiles RLS allowing read
        action: row.action,
        resource: row.resource,
        resourceId: row.resource_id,
        timestamp: row.created_at,
        details: row.details,
        ipAddress: row.ip_address || '',
        sessionId: 'db-session'
    }));
};

