import { supabase } from '../../../lib/supabase';
import type { Campaign, CampaignFilters, PaginatedResponse } from '../../../types/marketing';

/**
 * Fetch campaigns with pagination
 */
export async function fetchCampaigns(
    page: number = 1,
    perPage: number = 20,
    filters?: CampaignFilters
): Promise<PaginatedResponse<Campaign>> {
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = supabase
        .from('campaigns')
        .select(`
            *,
            template:email_templates(name, subject),
            segment:segments(name, client_count)
        `, { count: 'exact' });

    if (filters?.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
    }

    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data, error, count } = await query;

    if (error) {
        throw new Error(`Failed to fetch campaigns: ${error.message}`);
    }

    return {
        data: data || [],
        total: count || 0,
        page,
        per_page: perPage,
        total_pages: Math.ceil((count || 0) / perPage)
    };
}

/**
 * Fetch single campaign
 */
export async function fetchCampaignById(id: string): Promise<Campaign | null> {
    const { data, error } = await supabase
        .from('campaigns')
        .select(`
            *,
            template:email_templates(*),
            segment:segments(*)
        `)
        .eq('id', id)
        .single();

    if (error) {
        throw new Error(`Failed to fetch campaign: ${error.message}`);
    }

    return data;
}

/**
 * Create campaign
 */
export async function createCampaign(campaign: Partial<Campaign>): Promise<Campaign> {
    const { data, error } = await supabase
        .from('campaigns')
        .insert(campaign)
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to create campaign: ${error.message}`);
    }

    return data;
}

/**
 * Update campaign
 */
export async function updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign> {
    const { data, error } = await supabase
        .from('campaigns')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to update campaign: ${error.message}`);
    }

    return data;
}

/**
 * Delete campaign
 */
export async function deleteCampaign(id: string): Promise<void> {
    const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', id);

    if (error) {
        throw new Error(`Failed to delete campaign: ${error.message}`);
    }
}

/**
 * Send campaign via Supabase Edge Function
 */
export async function sendCampaign(id: string): Promise<{ success: boolean; sent: number; total: number }> {
    try {
        console.log('Invoking Edge Function for campaign:', id);

        // Use direct fetch instead of supabase.functions.invoke to debug/fix connection issues
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;

        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-campaign`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
            },
            body: JSON.stringify({ id })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Edge Function Error Response:', errorText);
            throw new Error(`Edge Function failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Campaign Send Error:', error);
        throw new Error(`Failed to send campaign: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Send preview email
 */
export async function sendPreview(previewData: {
    email: string;
    subject: string;
    html_content: string;
    variables?: any
}): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;

    try {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-campaign`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
            },
            body: JSON.stringify({
                action: 'preview',
                ...previewData
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Edge Function Preview Error:', errorText);
            throw new Error(`Failed to send preview: ${errorText}`);
        }
    } catch (error) {
        console.error('Preview Send Error:', error);
        throw new Error(`Failed to send preview: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
