import { supabase } from '../../../lib/supabase';
import type { 
    BypassFlag, 
    BypassFlagStatus, 
    SecurityException, 
    ChurnAnalysisItem 
} from '../../../types/marketing';

/**
 * Fetch all bypass flags
 */
export async function fetchBypassFlags(): Promise<BypassFlag[]> {
    // 1. Fetch flags and clients
    const { data: flags, error: flagError } = await supabase
        .from('bypass_flags')
        .select(`
            *,
            client:clients(full_name, email, mobile)
        `)
        .order('created_at', { ascending: false });

    if (flagError) {
        throw new Error(`Failed to fetch bypass flags: ${flagError.message}`);
    }

    if (!flags || flags.length === 0) return [];

    // 2. Resolve merchant names for all unique merchant_ids
    const merchantIds = [...new Set(flags.map(f => f.merchant_id))];
    const { data: merchants, error: merchantError } = await supabase
        .from('merchants')
        .select('hyperzod_merchant_id, name')
        .in('hyperzod_merchant_id', merchantIds);

    if (merchantError) {
        console.error('Failed to fetch merchant names:', merchantError);
    }

    // 3. Map merchant names back to flags
    return flags.map(flag => {
        const merchant = merchants?.find(m => m.hyperzod_merchant_id === flag.merchant_id);
        return {
            ...flag,
            chef: merchant ? { name: merchant.name } : undefined
        };
    });
}

/**
 * Update the status of a bypass flag
 */
export async function updateBypassFlagStatus(id: string, status: BypassFlagStatus): Promise<void> {
    const { error } = await supabase
        .from('bypass_flags')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

    if (error) {
        throw new Error(`Failed to update bypass flag status: ${error.message}`);
    }
}

/**
 * Fetch customers at risk of churning using the RPC
 */
export async function fetchAtRiskCustomers(days: number = 30): Promise<ChurnAnalysisItem[]> {
    const { data, error } = await supabase
        .rpc('detect_platform_churn', { p_days_threshold: days });

    if (error) {
        throw new Error(`Failed to fetch at-risk customers: ${error.message}`);
    }

    return data || [];
}

/**
 * Fetch all security exceptions
 */
export async function fetchSecurityExceptions(): Promise<SecurityException[]> {
    const { data, error } = await supabase
        .from('security_exceptions')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        throw new Error(`Failed to fetch security exceptions: ${error.message}`);
    }

    return data || [];
}

/**
 * Add a new security exception
 */
export async function addSecurityException(exception: Partial<SecurityException>): Promise<SecurityException> {
    const { data, error } = await supabase
        .from('security_exceptions')
        .upsert({ ...exception, updated_at: new Date().toISOString() })
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to add security exception: ${error.message}`);
    }

    return data;
}

/**
 * Manually trigger the behavioral analysis audit
 */
export async function triggerAnalysis(): Promise<{ success: boolean; count?: number }> {
    const { data, error } = await supabase.rpc('run_security_audit');

    if (error) {
        throw new Error(error.message || 'Failed to trigger behavioral analysis.');
    }

    return data;
}

/**
 * Remove a security exception
 */
export async function removeSecurityException(id: string): Promise<void> {
    const { error } = await supabase
        .from('security_exceptions')
        .delete()
        .eq('id', id);

    if (error) {
        throw new Error(`Failed to remove security exception: ${error.message}`);
    }
}
