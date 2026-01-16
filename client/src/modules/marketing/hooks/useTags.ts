import { useState, useEffect } from 'react';
import { fetchTags } from '../api/tags';
import type { ClientTag } from '../../../types/marketing';

export function useTags() {
    const [tags, setTags] = useState<ClientTag[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function loadTags() {
            try {
                setLoading(true);
                setError(null);
                const result = await fetchTags();
                if (!cancelled) {
                    setTags(result);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err as Error);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadTags();

        return () => {
            cancelled = true;
        };
    }, []);

    const refetch = async () => {
        try {
            setLoading(true);
            const result = await fetchTags();
            setTags(result);
        } catch (err) {
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    };

    return { tags, loading, error, refetch };
}
