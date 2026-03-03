import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

export function useAuth() {
    const [session, setSession] = useState<Session | null>(null);
    const [role, setRole] = useState<'superadmin' | 'sponsor' | null>(null);
    const [canScan, setCanScan] = useState<boolean>(false);
    const [canViewAnalytics, setCanViewAnalytics] = useState<boolean>(false);
    const [email, setEmail] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Initial session fetch
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            extractRole(session);
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            extractRole(session);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const extractRole = (currentSession: Session | null) => {
        if (!currentSession?.access_token) {
            setRole(null);
            return;
        }

        try {
            // Decode JWT payload (middle part of the token)
            const payload = currentSession.access_token.split('.')[1];
            const decoded = JSON.parse(atob(payload));

            // The custom hook injects 'role' directly or under 'app_metadata' depending on setup.
            // We'll check the top level first since our hook injects it there: `claims := jsonb_set(claims, '{role}', ...)`
            // Supabase reserves the 'role' claim for the database level Postgres Role (e.g. 'authenticated').
            // Using 'user_role' instead to prevent Database errors (401/500 role does not exist).
            const userRole = decoded.user_role || decoded.app_metadata?.user_role || null;
            const userCanScan = decoded.can_scan || decoded.app_metadata?.can_scan || false;
            const userCanViewAnalytics = decoded.can_view_analytics || decoded.app_metadata?.can_view_analytics || false;
            setRole(userRole as 'superadmin' | 'sponsor' | null);
            setCanScan(!!userCanScan);
            setCanViewAnalytics(!!userCanViewAnalytics);
            setEmail(currentSession.user?.email || null);
        } catch (e) {
            console.error("Error decoding JWT for role:", e);
            setRole(null);
            setCanScan(false);
            setCanViewAnalytics(false);
            setEmail(null);
        }
    };

    return { session, role, canScan, canViewAnalytics, email, loading };
}
