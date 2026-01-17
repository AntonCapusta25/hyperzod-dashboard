import { supabase } from '../../../lib/supabase';

export interface TopChef {
    merchant_id: string;
    merchant_name: string;
    city: string;
    total_orders: number;
    completed_orders: number;
    total_revenue: number;
    average_order_value: number;
}

/**
 * Get top performing chefs for a date range
 */
export async function getTopChefs(
    startTimestamp: number,
    endTimestamp: number,
    city?: string,
    limit: number = 10
): Promise<TopChef[]> {
    // Get all orders in the date range
    let ordersQuery = supabase
        .from('orders')
        .select('merchant_id, order_status, order_amount, delivery_address_id')
        .gte('created_timestamp', startTimestamp)
        .lte('created_timestamp', endTimestamp);

    const { data: orders } = await ordersQuery;

    if (!orders || orders.length === 0) {
        return [];
    }

    // Filter by city if provided
    let filteredOrders = orders;
    if (city) {
        const addressIds = [...new Set(orders.map(o => o.delivery_address_id).filter(Boolean))];

        if (addressIds.length > 0) {
            const { data: cityAddresses } = await supabase
                .from('delivery_addresses')
                .select('id')
                .in('id', addressIds)
                .or(`city.ilike.%${city}%,address.ilike.%${city}%`);

            const cityAddressSet = new Set(cityAddresses?.map(a => a.id) || []);
            filteredOrders = orders.filter(o => cityAddressSet.has(o.delivery_address_id));
        } else {
            filteredOrders = [];
        }
    }

    // Group by merchant
    const merchantStats = new Map<string, {
        total_orders: number;
        completed_orders: number;
        total_revenue: number;
    }>();

    filteredOrders.forEach(order => {
        if (!order.merchant_id) return;

        const stats = merchantStats.get(order.merchant_id) || {
            total_orders: 0,
            completed_orders: 0,
            total_revenue: 0
        };

        stats.total_orders++;

        // Count completed orders (status 1-5)
        if (order.order_status >= 1 && order.order_status <= 5) {
            stats.completed_orders++;
            stats.total_revenue += Number(order.order_amount || 0);
        }

        merchantStats.set(order.merchant_id, stats);
    });

    // Get merchant details
    const merchantIds = Array.from(merchantStats.keys());

    // We need to query by merchant_id (text) not id (uuid)
    const { data: merchants } = await supabase
        .from('merchants')
        .select('id, merchant_id, name, city')
        .in('merchant_id', merchantIds);

    // Combine stats with merchant info
    const topChefs: TopChef[] = [];

    merchants?.forEach(merchant => {
        // Use merchant_id to look up stats since that's what we grouped by
        const stats = merchantStats.get(merchant.merchant_id);
        if (stats) {
            topChefs.push({
                merchant_id: merchant.merchant_id, // Use the string ID
                merchant_name: merchant.name,
                city: merchant.city || 'Unknown',
                total_orders: stats.total_orders,
                completed_orders: stats.completed_orders,
                total_revenue: stats.total_revenue,
                average_order_value: stats.completed_orders > 0
                    ? stats.total_revenue / stats.completed_orders
                    : 0
            });
        }
    });

    // Sort by total revenue (descending) and limit
    return topChefs
        .sort((a, b) => b.total_revenue - a.total_revenue)
        .slice(0, limit);
}
