import { supabase } from './supabase';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW' | 'LOGIN' | 'EXPORT';
export type ResourceType = 'events' | 'registrations' | 'users' | 'sponsor_events';

export const logAudit = async (
    action: AuditAction,
    resourceType: ResourceType,
    resourceId?: string,
    details?: Record<string, any>
) => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const { error } = await supabase.from('audit_logs').insert({
            user_id: session.user.id,
            action,
            resource_type: resourceType,
            resource_id: resourceId || null,
            details: details || null
        });

        if (error) {
            console.error("Failed to insert audit log:", error);
        }
    } catch (e) {
        console.error("Error logging audit:", e);
    }
};
