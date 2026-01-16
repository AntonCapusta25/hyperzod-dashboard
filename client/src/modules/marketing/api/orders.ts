import { supabase } from '../../../lib/supabase';
import type { OrderFilters, OrdersResponse, OrderStats } from '../../../types/orders';

/**
 * Fetch orders with pagination and filters
 */
export async function fetchOrders(
    page: number = 1,
    pageSize: number = 20,
    filters?: OrderFilters
): Promise<OrdersResponse> {
    let query = supabase
        .from('orders')
        .select('*', { count: 'exact' })
        .order('created_timestamp', { ascending: false });

    // Apply filters
    if (filters) {
        if (filters.order_status && filters.order_status.length > 0) {
            query = query.in('order_status', filters.order_status);
        }

        if (filters.order_type && filters.order_type.length > 0) {
            query = query.in('order_type', filters.order_type);
        }

        if (filters.payment_mode && filters.payment_mode.length > 0) {
            query = query.in('payment_mode_name', filters.payment_mode);
        }

        if (filters.date_from) {
            const timestamp = new Date(filters.date_from).getTime() / 1000;
            query = query.gte('created_timestamp', timestamp);
        }

        if (filters.date_to) {
            const timestamp = new Date(filters.date_to).getTime() / 1000;
            query = query.lte('created_timestamp', timestamp);
        }

        if (filters.min_amount !== undefined) {
            query = query.gte('order_amount', filters.min_amount);
        }

        if (filters.max_amount !== undefined) {
            query = query.lte('order_amount', filters.max_amount);
        }

        if (filters.search) {
            query = query.or(`order_id.eq.${filters.search},order_uuid.ilike.%${filters.search}%`);
        }

        if (filters.user_id) {
            query = query.eq('user_id', filters.user_id);
        }

        if (filters.merchant_id) {
            query = query.eq('merchant_id', filters.merchant_id);
        }
    }

    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
        throw new Error(`Failed to fetch orders: ${error.message}`);
    }

    return {
        data: data || [],
        count: count || 0,
    };
}

/**
 * Fetch single order by ID with related data
 */
export async function fetchOrderById(orderId: number) {
    const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('order_id', orderId)
        .single();

    if (orderError) {
        throw new Error(`Failed to fetch order: ${orderError.message}`);
    }

    // Fetch related data
    const [itemsResult, historyResult, addressResult] = await Promise.all([
        supabase.from('order_items').select('*').eq('order_id', orderId),
        supabase.from('order_status_history').select('*').eq('order_id', orderId).order('timestamp', { ascending: true }),
        order.delivery_address_id
            ? supabase.from('delivery_addresses').select('*').eq('id', order.delivery_address_id).single()
            : Promise.resolve({ data: null, error: null }),
    ]);

    return {
        ...order,
        items: itemsResult.data || [],
        status_history: historyResult.data || [],
        delivery_address: addressResult.data,
    };
}

/**
 * Get order count with filters
 */
export async function getOrderCount(filters?: OrderFilters): Promise<number> {
    let query = supabase
        .from('orders')
        .select('*', { count: 'exact', head: true });

    // Apply same filters as fetchOrders
    if (filters) {
        if (filters.order_status && filters.order_status.length > 0) {
            query = query.in('order_status', filters.order_status);
        }
        if (filters.order_type && filters.order_type.length > 0) {
            query = query.in('order_type', filters.order_type);
        }
        if (filters.date_from) {
            const timestamp = new Date(filters.date_from).getTime() / 1000;
            query = query.gte('created_timestamp', timestamp);
        }
        if (filters.date_to) {
            const timestamp = new Date(filters.date_to).getTime() / 1000;
            query = query.lte('created_timestamp', timestamp);
        }
        if (filters.min_amount !== undefined) {
            query = query.gte('order_amount', filters.min_amount);
        }
        if (filters.max_amount !== undefined) {
            query = query.lte('order_amount', filters.max_amount);
        }
    }

    const { count, error } = await query;

    if (error) {
        throw new Error(`Failed to get order count: ${error.message}`);
    }

    return count || 0;
}

/**
 * Get order statistics - FETCH IN BATCHES TO AVOID 1000 ROW LIMIT
 */
export async function getOrderStats(filters?: OrderFilters): Promise<OrderStats> {
    // Fetch ALL orders in batches
    const batchSize = 1000;
    let allOrders: any[] = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
        let query = supabase
            .from('orders')
            .select('order_status, order_type, order_amount, payment_mode_name')
            .range(page * batchSize, (page + 1) * batchSize - 1);

        if (filters) {
            if (filters.date_from) {
                const timestamp = new Date(filters.date_from).getTime() / 1000;
                query = query.gte('created_timestamp', timestamp);
            }
            if (filters.date_to) {
                const timestamp = new Date(filters.date_to).getTime() / 1000;
                query = query.lte('created_timestamp', timestamp);
            }
        }

        const { data, error } = await query;

        if (error) {
            throw new Error(`Failed to fetch order stats: ${error.message}`);
        }

        if (!data || data.length === 0) {
            hasMore = false;
        } else {
            allOrders = allOrders.concat(data);
            if (data.length < batchSize) {
                hasMore = false;
            }
            page++;
        }
    }

    const orders = allOrders;

    // Calculate statistics
    const total_orders = orders.length;
    const total_revenue = orders.reduce((sum, order) => sum + Number(order.order_amount), 0);
    const average_order_value = total_orders > 0 ? total_revenue / total_orders : 0;

    // Orders by status
    const orders_by_status = {
        pending: orders.filter(o => o.order_status === 0).length,
        confirmed: orders.filter(o => o.order_status === 1).length,
        preparing: orders.filter(o => o.order_status === 2).length,
        ready: orders.filter(o => o.order_status === 3).length,
        out_for_delivery: orders.filter(o => o.order_status === 4).length,
        delivered: orders.filter(o => o.order_status === 5).length,
        cancelled: orders.filter(o => o.order_status === 6).length,
    };

    // Orders by type
    const typeCount: Record<string, number> = {};
    orders.forEach(order => {
        typeCount[order.order_type] = (typeCount[order.order_type] || 0) + 1;
    });

    const orders_by_type = {
        delivery: typeCount['delivery'] || 0,
        pickup: typeCount['pickup'] || 0,
        custom_1: typeCount['custom_1'] || 0,
    };

    // Orders by payment
    const orders_by_payment: Record<string, number> = {};
    orders.forEach(order => {
        if (order.payment_mode_name) {
            orders_by_payment[order.payment_mode_name] = (orders_by_payment[order.payment_mode_name] || 0) + 1;
        }
    });

    return {
        total_orders,
        total_revenue,
        average_order_value,
        orders_by_status,
        orders_by_type,
        orders_by_payment,
    };
}
