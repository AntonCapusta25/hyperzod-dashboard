import { useState, useEffect } from 'react';
import { fetchOrders, getOrderCount, getOrderStats } from '../api/orders';
import type { Order, OrderFilters, OrderStats } from '../../../types/orders';

/**
 * Hook to fetch orders with pagination and filters
 */
export function useOrders(page: number = 1, pageSize: number = 20, filters?: OrderFilters) {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [totalCount, setTotalCount] = useState(0);

    useEffect(() => {
        async function loadOrders() {
            try {
                setLoading(true);
                setError(null);
                const response = await fetchOrders(page, pageSize, filters);
                setOrders(response.data);
                setTotalCount(response.count);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load orders');
                setOrders([]);
            } finally {
                setLoading(false);
            }
        }

        loadOrders();
    }, [page, pageSize, JSON.stringify(filters)]);

    return { orders, loading, error, totalCount };
}

/**
 * Hook to get order count
 */
export function useOrderCount(filters?: OrderFilters) {
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadCount() {
            try {
                setLoading(true);
                setError(null);
                const total = await getOrderCount(filters);
                setCount(total);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load order count');
                setCount(0);
            } finally {
                setLoading(false);
            }
        }

        loadCount();
    }, [JSON.stringify(filters)]);

    return { count, loading, error };
}

/**
 * Hook to get order statistics
 */
export function useOrderStats(filters?: OrderFilters) {
    const [stats, setStats] = useState<OrderStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadStats() {
            try {
                setLoading(true);
                setError(null);
                const data = await getOrderStats(filters);
                setStats(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load order stats');
                setStats(null);
            } finally {
                setLoading(false);
            }
        }

        loadStats();
    }, [JSON.stringify(filters)]);

    return { stats, loading, error };
}
