import { useState, useEffect } from 'react';
import { fetchTemplates, createTemplate, updateTemplate, deleteTemplate } from '../api/templates';
import type { EmailTemplate } from '../../../types/marketing';

export function useTemplates() {
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const loadTemplates = async () => {
        try {
            setLoading(true);
            const response = await fetchTemplates(1, 100); // Fetch mostly all for now
            setTemplates(response.data);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to load templates'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTemplates();
    }, []);

    const addTemplate = async (template: Partial<EmailTemplate>) => {
        try {
            const newTemplate = await createTemplate(template);
            setTemplates([newTemplate, ...templates]);
            return newTemplate;
        } catch (err) {
            throw err instanceof Error ? err : new Error('Failed to create template');
        }
    };

    const editTemplate = async (id: string, updates: Partial<EmailTemplate>) => {
        try {
            const updated = await updateTemplate(id, updates);
            setTemplates(templates.map(t => t.id === id ? updated : t));
            return updated;
        } catch (err) {
            throw err instanceof Error ? err : new Error('Failed to update template');
        }
    };

    const removeTemplate = async (id: string) => {
        try {
            await deleteTemplate(id);
            setTemplates(templates.filter(t => t.id !== id));
        } catch (err) {
            throw err instanceof Error ? err : new Error('Failed to delete template');
        }
    };

    return {
        templates,
        loading,
        error,
        refresh: loadTemplates,
        addTemplate,
        editTemplate,
        removeTemplate
    };
}
