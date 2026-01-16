import { supabase } from '../../../lib/supabase';
import type { ClientTag } from '../../../types/marketing';

/**
 * Fetch all tags
 */
export async function fetchTags(): Promise<ClientTag[]> {
    const { data, error } = await supabase
        .from('client_tags')
        .select('*')
        .order('name');

    if (error) {
        throw new Error(`Failed to fetch tags: ${error.message}`);
    }

    return data || [];
}

/**
 * Create a new tag
 */
export async function createTag(tag: Omit<ClientTag, 'id' | 'created_at' | 'updated_at'>): Promise<ClientTag> {
    const { data, error } = await supabase
        .from('client_tags')
        .insert(tag)
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to create tag: ${error.message}`);
    }

    return data;
}

/**
 * Update a tag
 */
export async function updateTag(id: string, updates: Partial<ClientTag>): Promise<ClientTag> {
    const { data, error } = await supabase
        .from('client_tags')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to update tag: ${error.message}`);
    }

    return data;
}

/**
 * Delete a tag
 */
export async function deleteTag(id: string): Promise<void> {
    const { error } = await supabase
        .from('client_tags')
        .delete()
        .eq('id', id);

    if (error) {
        throw new Error(`Failed to delete tag: ${error.message}`);
    }
}

/**
 * Assign tags to a client
 */
export async function assignTagsToClient(clientId: string, tagIds: string[]): Promise<void> {
    // First, remove existing tags
    await supabase
        .from('client_tag_assignments')
        .delete()
        .eq('client_id', clientId);

    // Then, insert new tags
    if (tagIds.length > 0) {
        const assignments = tagIds.map(tagId => ({
            client_id: clientId,
            tag_id: tagId
        }));

        const { error } = await supabase
            .from('client_tag_assignments')
            .insert(assignments);

        if (error) {
            throw new Error(`Failed to assign tags: ${error.message}`);
        }
    }
}

/**
 * Get tags for a specific client
 */
export async function getClientTags(clientId: string): Promise<ClientTag[]> {
    const { data, error } = await supabase
        .from('client_tag_assignments')
        .select('tag_id, client_tags(*)')
        .eq('client_id', clientId);

    if (error) {
        throw new Error(`Failed to fetch client tags: ${error.message}`);
    }

    return data?.map((item: any) => item.client_tags) || [];
}

/**
 * Bulk assign a tag to multiple clients
 */
export async function bulkAssignTag(clientIds: string[], tagId: string): Promise<void> {
    const assignments = clientIds.map(clientId => ({
        client_id: clientId,
        tag_id: tagId
    }));

    const { error } = await supabase
        .from('client_tag_assignments')
        .upsert(assignments, { onConflict: 'client_id,tag_id' });

    if (error) {
        throw new Error(`Failed to bulk assign tag: ${error.message}`);
    }
}
