import { supabase } from '../../../lib/supabase';
import type { Client, ClientFilters, PaginatedResponse } from '../../../types/marketing';

/**
 * Fetch clients with pagination and filters
 */
export async function fetchClients(
    page: number = 1,
    perPage: number = 50,
    filters?: ClientFilters
): Promise<PaginatedResponse<Client>> {
    let query = supabase
        .from('clients')
        .select('*', { count: 'exact' });

    // Apply filters
    if (filters?.search) {
        query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
    }

    if (filters?.status !== undefined) {
        query = query.eq('status', filters.status);
    }

    if (filters?.email_verified !== undefined) {
        if (filters.email_verified) {
            query = query.not('email_verified_at', 'is', null);
        } else {
            query = query.is('email_verified_at', null);
        }
    }

    if (filters?.mobile_verified !== undefined) {
        if (filters.mobile_verified) {
            query = query.not('mobile_verified_at', 'is', null);
        } else {
            query = query.is('mobile_verified_at', null);
        }
    }

    if (filters?.email_unsubscribed !== undefined) {
        query = query.eq('email_unsubscribed', filters.email_unsubscribed);
    }

    if (filters?.min_total_spent !== undefined) {
        query = query.gte('total_spent', filters.min_total_spent);
    }

    if (filters?.max_total_spent !== undefined) {
        query = query.lte('total_spent', filters.max_total_spent);
    }

    if (filters?.min_total_orders !== undefined) {
        query = query.gte('total_orders', filters.min_total_orders);
    }

    if (filters?.max_total_orders !== undefined) {
        query = query.lte('total_orders', filters.max_total_orders);
    }

    if (filters?.last_order_after) {
        query = query.gte('last_order_date', filters.last_order_after);
    }

    if (filters?.last_order_before) {
        query = query.lte('last_order_date', filters.last_order_before);
    }

    // Apply pagination
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    query = query.range(from, to);

    // Order by most recent
    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
        throw new Error(`Failed to fetch clients: ${error.message}`);
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
 * Fetch a single client by ID
 */
export async function fetchClientById(id: string): Promise<Client | null> {
    const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        throw new Error(`Failed to fetch client: ${error.message}`);
    }

    return data;
}

/**
 * Update client data
 */
export async function updateClient(id: string, updates: Partial<Client>): Promise<Client> {
    const { data, error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to update client: ${error.message}`);
    }

    return data;
}

/**
 * Get client count by filters
 */
export async function getClientCount(filters?: ClientFilters): Promise<number> {
    let query = supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });

    // Apply same filters as fetchClients
    if (filters?.search) {
        query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
    }

    if (filters?.status !== undefined) {
        query = query.eq('status', filters.status);
    }

    const { count, error } = await query;

    if (error) {
        throw new Error(`Failed to count clients: ${error.message}`);
    }

    return count || 0;
}

/**
 * Unsubscribe a client from emails
 */
export async function unsubscribeClient(id: string): Promise<void> {
    const { error } = await supabase
        .from('clients')
        .update({
            email_unsubscribed: true,
            email_unsubscribed_at: new Date().toISOString()
        })
        .eq('id', id);

    if (error) {
        throw new Error(`Failed to unsubscribe client: ${error.message}`);
    }
}
