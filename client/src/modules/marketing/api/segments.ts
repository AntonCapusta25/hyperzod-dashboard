import { supabase } from '../../../lib/supabase';
import type { Segment, PaginatedResponse } from '../../../types/marketing';

/**
 * Fetch segments with pagination
 */
export async function fetchSegments(
    page: number = 1,
    perPage: number = 20
): Promise<PaginatedResponse<Segment>> {
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    const { data, error, count } = await supabase
        .from('segments')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

    if (error) {
        throw new Error(`Failed to fetch segments: ${error.message}`);
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
 * Fetch a single segment by ID
 */
export async function fetchSegmentById(id: string): Promise<Segment | null> {
    const { data, error } = await supabase
        .from('segments')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        throw new Error(`Failed to fetch segment: ${error.message}`);
    }

    return data;
}

/**
 * Create a new segment
 */
export async function createSegment(segment: Partial<Segment>): Promise<Segment> {
    const { data, error } = await supabase
        .from('segments')
        .insert(segment)
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to create segment: ${error.message}`);
    }

    return data;
}

/**
 * Update a segment
 */
export async function updateSegment(id: string, updates: Partial<Segment>): Promise<Segment> {
    const { data, error } = await supabase
        .from('segments')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to update segment: ${error.message}`);
    }

    return data;
}

/**
 * Delete a segment
 */
export async function deleteSegment(id: string): Promise<void> {
    const { error } = await supabase
        .from('segments')
        .delete()
        .eq('id', id);

    if (error) {
        throw new Error(`Failed to delete segment: ${error.message}`);
    }
}

/**
 * Calculate client count for a segment (Preview)
 * This is a mock implementation for now, ideally we run a count query on the backend
 */
export async function previewSegmentCount(_rules: any): Promise<number> {
    // TODO: Implement actual query calculation on backend/supa
    // For now returning a mock random number for UI testing
    // In real implementation, this would call an Edge Function or RPC
    return Math.floor(Math.random() * 100) + 1;
}

/**
 * Get all manually added clients for a segment
 */
export async function getSegmentMembers(segmentId: string): Promise<any[]> {
    const { data, error } = await supabase
        .from('segment_members')
        .select(`
            id,
            client_id,
            added_at,
            clients:client_id (
                id,
                first_name,
                last_name,
                email,
                full_name
            )
        `)
        .eq('segment_id', segmentId)
        .order('added_at', { ascending: false });

    if (error) {
        throw new Error(`Failed to fetch segment members: ${error.message}`);
    }

    return data || [];
}

/**
 * Add a single client to a segment
 */
export async function addClientToSegment(segmentId: string, clientId: string): Promise<void> {
    const { error } = await supabase
        .from('segment_members')
        .insert({
            segment_id: segmentId,
            client_id: clientId
        });

    if (error) {
        throw new Error(`Failed to add client to segment: ${error.message}`);
    }
}

/**
 * Add multiple clients to a segment at once
 */
export async function bulkAddClientsToSegment(segmentId: string, clientIds: string[]): Promise<void> {
    const records = clientIds.map(clientId => ({
        segment_id: segmentId,
        client_id: clientId
    }));

    const { error } = await supabase
        .from('segment_members')
        .insert(records);

    if (error) {
        throw new Error(`Failed to add clients to segment: ${error.message}`);
    }
}

/**
 * Remove a client from a segment
 */
export async function removeClientFromSegment(segmentId: string, clientId: string): Promise<void> {
    const { error } = await supabase
        .from('segment_members')
        .delete()
        .eq('segment_id', segmentId)
        .eq('client_id', clientId);

    if (error) {
        throw new Error(`Failed to remove client from segment: ${error.message}`);
    }
}

/**
 * Get the count of manually added clients for a static segment
 */
export async function getSegmentMemberCount(segmentId: string): Promise<number> {
    const { count, error } = await supabase
        .from('segment_members')
        .select('*', { count: 'exact', head: true })
        .eq('segment_id', segmentId);

    if (error) {
        throw new Error(`Failed to count segment members: ${error.message}`);
    }

    return count || 0;
}

