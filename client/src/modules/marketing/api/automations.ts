import { supabase } from '../../../lib/supabase';
import type { Automation, AutomationStep } from '../../../types/marketing';

/**
 * Fetch all automations
 */
export async function fetchAutomations(): Promise<Automation[]> {
    const { data, error } = await supabase
        .from('automations')
        .select(`
            *,
            steps:automation_steps(*, template:email_templates(name, subject))
        `)
        .order('created_at', { ascending: false });

    if (error) {
        throw new Error(`Failed to fetch automations: ${error.message}`);
    }

    return data || [];
}

/**
 * Create or update automation
 */
export async function upsertAutomation(automation: Partial<Automation>): Promise<Automation> {
    const { data, error } = await supabase
        .from('automations')
        .upsert({ ...automation, updated_at: new Date().toISOString() })
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to save automation: ${error.message}`);
    }

    return data;
}

/**
 * Fetch automation steps
 */
export async function fetchAutomationSteps(automationId: string): Promise<AutomationStep[]> {
    const { data, error } = await supabase
        .from('automation_steps')
        .select(`*, template:email_templates(name, subject)`)
        .eq('automation_id', automationId)
        .order('step_order', { ascending: true });

    if (error) {
        throw new Error(`Failed to fetch automation steps: ${error.message}`);
    }

    return data || [];
}

/**
 * Create or update an automation step
 */
export async function upsertAutomationStep(step: Partial<AutomationStep>): Promise<AutomationStep> {
    const { data, error } = await supabase
        .from('automation_steps')
        .upsert({ ...step, updated_at: new Date().toISOString() })
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to save automation step: ${error.message}`);
    }

    return data;
}

/**
 * Delete automation step
 */
export async function deleteAutomationStep(id: string): Promise<void> {
    const { error } = await supabase
        .from('automation_steps')
        .delete()
        .eq('id', id);

    if (error) {
        throw new Error(`Failed to delete automation step: ${error.message}`);
    }
}
