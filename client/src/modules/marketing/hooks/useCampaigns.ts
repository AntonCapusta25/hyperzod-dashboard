import { useState, useEffect } from 'react';
import {
    fetchCampaigns,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    sendCampaign,
    sendPreview
} from '../api/campaigns';
import type { Campaign, CampaignFilters } from '../../../types/marketing';

export function useCampaigns(filters?: CampaignFilters) {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const loadCampaigns = async () => {
        try {
            setLoading(true);
            const response = await fetchCampaigns(1, 50, filters);
            setCampaigns(response.data);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to load campaigns'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCampaigns();
    }, [JSON.stringify(filters)]);

    const addCampaign = async (campaign: Partial<Campaign>) => {
        try {
            const newCampaign = await createCampaign(campaign);
            setCampaigns([newCampaign, ...campaigns]);
            return newCampaign;
        } catch (err) {
            throw err instanceof Error ? err : new Error('Failed to create campaign');
        }
    };

    const editCampaign = async (id: string, updates: Partial<Campaign>) => {
        try {
            const updated = await updateCampaign(id, updates);
            setCampaigns(campaigns.map(c => c.id === id ? updated : c));
            return updated;
        } catch (err) {
            throw err instanceof Error ? err : new Error('Failed to update campaign');
        }
    };

    const removeCampaign = async (id: string) => {
        try {
            await deleteCampaign(id);
            setCampaigns(campaigns.filter(c => c.id !== id));
        } catch (err) {
            throw err instanceof Error ? err : new Error('Failed to delete campaign');
        }
    };

    const launchCampaign = async (id: string) => {
        try {
            const result = await sendCampaign(id);
            // Refresh campaigns to get stats
            await loadCampaigns();
            return result;
        } catch (err) {
            throw err instanceof Error ? err : new Error('Failed to launch campaign');
        }
    };

    const testPreview = async (data: { email: string; subject: string; html_content: string }) => {
        try {
            await sendPreview(data);
        } catch (err) {
            throw err instanceof Error ? err : new Error('Failed to send preview');
        }
    };

    return {
        campaigns,
        loading,
        error,
        refresh: loadCampaigns,
        addCampaign,
        editCampaign,
        removeCampaign,
        launchCampaign,
        testPreview
    };
}
