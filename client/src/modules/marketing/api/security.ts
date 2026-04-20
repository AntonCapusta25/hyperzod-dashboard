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
    const { data, error } = await supabase
        .from('bypass_flags')
        .select(`
            *,
            client:clients(full_name, email, mobile)
        `)
        .order('created_at', { ascending: false });

    if (error) {
        throw new Error(`Failed to fetch bypass flags: ${error.message}`);
    }

    // Since we can't easily join on text merchant_id in Supabase without a formal FK,
    // we'll fetch merchant names manually in the component if needed, 
    // or just rely on the stored merchant_id for now.
    return data || [];
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
