import { useState, useEffect } from 'react';
import { fetchClients, getClientCount } from '../api/clients';
import type { Client, ClientFilters, PaginatedResponse } from '../../../types/marketing';

export function useClients(page: number = 1, perPage: number = 50, filters?: ClientFilters) {
    const [data, setData] = useState<PaginatedResponse<Client> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function loadClients() {
            try {
                setLoading(true);
                setError(null);
                const result = await fetchClients(page, perPage, filters);
                if (!cancelled) {
                    setData(result);
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

        loadClients();

        return () => {
            cancelled = true;
        };
    }, [page, perPage, JSON.stringify(filters)]);

    return { data, loading, error };
}

export function useClientCount(filters?: ClientFilters) {
    const [count, setCount] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function loadCount() {
            try {
                setLoading(true);
                setError(null);
                const result = await getClientCount(filters);
                if (!cancelled) {
                    setCount(result);
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

        loadCount();

        return () => {
            cancelled = true;
        };
    }, [JSON.stringify(filters)]);

    return { count, loading, error };
}
