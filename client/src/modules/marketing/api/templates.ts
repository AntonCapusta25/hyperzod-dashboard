import { supabase } from '../../../lib/supabase';
import type { EmailTemplate, PaginatedResponse } from '../../../types/marketing';

/**
 * Fetch templates with pagination
 */
export async function fetchTemplates(
    page: number = 1,
    perPage: number = 20
): Promise<PaginatedResponse<EmailTemplate>> {
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    const { data, error, count } = await supabase
        .from('email_templates')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

    if (error) {
        throw new Error(`Failed to fetch templates: ${error.message}`);
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
 * Fetch a single template by ID
 */
export async function fetchTemplateById(id: string): Promise<EmailTemplate | null> {
    const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        throw new Error(`Failed to fetch template: ${error.message}`);
    }

    return data;
}

/**
 * Create a new template
 */
export async function createTemplate(template: Partial<EmailTemplate>): Promise<EmailTemplate> {
    const { data, error } = await supabase
        .from('email_templates')
        .insert(template)
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to create template: ${error.message}`);
    }

    return data;
}

/**
 * Update a template
 */
export async function updateTemplate(id: string, updates: Partial<EmailTemplate>): Promise<EmailTemplate> {
    const { data, error } = await supabase
        .from('email_templates')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to update template: ${error.message}`);
    }

    return data;
}

/**
 * Delete a template
 */
export async function deleteTemplate(id: string): Promise<void> {
    const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', id);

    if (error) {
        throw new Error(`Failed to delete template: ${error.message}`);
    }
}
