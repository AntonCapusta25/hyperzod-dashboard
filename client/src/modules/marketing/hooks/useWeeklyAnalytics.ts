import { useState, useEffect } from 'react';
import { getWeeklyAnalytics } from '../api/analytics';
import type { WeeklyAnalytics, AnalyticsFilters, AnalyticsConfig } from '../../../types/analytics';

export function useWeeklyAnalytics(filters?: AnalyticsFilters, config?: AnalyticsConfig) {
    const [analytics, setAnalytics] = useState<WeeklyAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadAnalytics() {
            try {
                setLoading(true);
                setError(null);
                const data = await getWeeklyAnalytics(filters, config);
                setAnalytics(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load analytics');
            } finally {
                setLoading(false);
            }
        }

        loadAnalytics();
    }, [
        filters?.week_start,
        filters?.week_end,
        filters?.date_from,
        filters?.date_to,
        filters?.city,
        config?.weekly_marketing_spend,
        config?.default_cogs_percentage,
        config?.default_commission_percentage
    ]);

    return { analytics, loading, error };
}
