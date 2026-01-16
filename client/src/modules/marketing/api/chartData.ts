import { supabase } from '../../../lib/supabase';

export interface TimeSeriesData {
    date: string;
    orders: number;
    completed_orders: number;
    revenue: number;
    new_customers: number;
}

export interface CityData {
    city: string;
    order_count: number;
    revenue: number;
    active_chefs: number;
}

export interface OrderStatusData {
    status: string;
    count: number;
    percentage: number;
    color: string;
}

/**
 * Get daily time series data for charts
 */
export async function getTimeSeriesData(
    startDate: Date,
    endDate: Date,
    city?: string
): Promise<TimeSeriesData[]> {
    const startTs = Math.floor(startDate.getTime() / 1000);
    const endTs = Math.floor(endDate.getTime() / 1000);

    // Get all orders in the date range
    const { data: orders } = await supabase
        .from('orders')
        .select('order_id, user_id, order_status, order_amount, delivery_address_id, created_timestamp')
        .gte('created_timestamp', startTs)
        .lte('created_timestamp', endTs);

    if (!orders) return [];

    // If city filter, get matching addresses
    let filteredOrders = orders;
    if (city) {
        const addressIds = [...new Set(orders.map(o => o.delivery_address_id).filter(Boolean))];
        const batchSize = 100;
        const matchingAddressIds = new Set<string>();

        for (let i = 0; i < addressIds.length; i += batchSize) {
            const batch = addressIds.slice(i, i + batchSize);
            const { data: addresses } = await supabase
                .from('delivery_addresses')
                .select('id')
                .in('id', batch)
                .or(`city.ilike.%${city}%,address.ilike.%${city}%`);

            addresses?.forEach(a => matchingAddressIds.add(a.id));
        }

        filteredOrders = orders.filter(o => matchingAddressIds.has(o.delivery_address_id));
    }

    // Group by date
    const dataByDate = new Map<string, TimeSeriesData>();

    filteredOrders.forEach(order => {
        const date = new Date(order.created_timestamp * 1000).toISOString().split('T')[0];

        if (!dataByDate.has(date)) {
            dataByDate.set(date, {
                date,
                orders: 0,
                completed_orders: 0,
                revenue: 0,
                new_customers: 0,
            });
        }

        const dayData = dataByDate.get(date)!;
        dayData.orders++;

        if (order.order_status === 5) {
            dayData.completed_orders++;
            dayData.revenue += Number(order.order_amount);
        }
    });

    // Fill in missing dates with zeros
    const result: TimeSeriesData[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        result.push(dataByDate.get(dateStr) || {
            date: dateStr,
            orders: 0,
            completed_orders: 0,
            revenue: 0,
            new_customers: 0,
        });
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return result;
}

/**
 * Get orders by city for bar chart
 */
export async function getOrdersByCity(
    startDate: Date,
    endDate: Date,
    limit: number = 10
): Promise<CityData[]> {
    const startTs = Math.floor(startDate.getTime() / 1000);
    const endTs = Math.floor(endDate.getTime() / 1000);

    // Get all completed orders
    const { data: orders } = await supabase
        .from('orders')
        .select('delivery_address_id, order_amount')
        .gte('created_timestamp', startTs)
        .lte('created_timestamp', endTs)
        .eq('order_status', 5);

    if (!orders || orders.length === 0) return [];

    // Get addresses
    const addressIds = [...new Set(orders.map(o => o.delivery_address_id).filter(Boolean))];
    const addressMap = new Map<string, { city: string }>();

    const batchSize = 100;
    for (let i = 0; i < addressIds.length; i += batchSize) {
        const batch = addressIds.slice(i, i + batchSize);
        const { data: addresses } = await supabase
            .from('delivery_addresses')
            .select('id, city')
            .in('id', batch);

        addresses?.forEach(a => {
            if (a.city) addressMap.set(a.id, { city: a.city });
        });
    }

    // Group by city
    const cityStats = new Map<string, { order_count: number; revenue: number }>();

    orders.forEach(order => {
        const address = addressMap.get(order.delivery_address_id);
        if (!address?.city) return;

        if (!cityStats.has(address.city)) {
            cityStats.set(address.city, { order_count: 0, revenue: 0 });
        }

        const stats = cityStats.get(address.city)!;
        stats.order_count++;
        stats.revenue += Number(order.order_amount);
    });

    // Get active chefs per city
    const { data: merchants } = await supabase
        .from('merchants')
        .select('city')
        .eq('status', true)
        .eq('is_accepting_orders', true);

    const chefsByCity = new Map<string, number>();
    merchants?.forEach(m => {
        if (m.city) {
            chefsByCity.set(m.city, (chefsByCity.get(m.city) || 0) + 1);
        }
    });

    // Convert to array and sort
    const result: CityData[] = Array.from(cityStats.entries())
        .map(([city, stats]) => ({
            city,
            order_count: stats.order_count,
            revenue: stats.revenue,
            active_chefs: chefsByCity.get(city) || 0,
        }))
        .sort((a, b) => b.order_count - a.order_count)
        .slice(0, limit);

    return result;
}

/**
 * Get order status distribution
 */
export async function getOrderStatusDistribution(
    startDate: Date,
    endDate: Date,
    city?: string
): Promise<OrderStatusData[]> {
    const startTs = Math.floor(startDate.getTime() / 1000);
    const endTs = Math.floor(endDate.getTime() / 1000);

    const { data: orders } = await supabase
        .from('orders')
        .select('order_status, delivery_address_id')
        .gte('created_timestamp', startTs)
        .lte('created_timestamp', endTs);

    if (!orders) return [];

    // Filter by city if needed
    let filteredOrders = orders;
    if (city) {
        const addressIds = [...new Set(orders.map(o => o.delivery_address_id).filter(Boolean))];
        const batchSize = 100;
        const matchingAddressIds = new Set<string>();

        for (let i = 0; i < addressIds.length; i += batchSize) {
            const batch = addressIds.slice(i, i + batchSize);
            const { data: addresses } = await supabase
                .from('delivery_addresses')
                .select('id')
                .in('id', batch)
                .or(`city.ilike.%${city}%,address.ilike.%${city}%`);

            addresses?.forEach(a => matchingAddressIds.add(a.id));
        }

        filteredOrders = orders.filter(o => matchingAddressIds.has(o.delivery_address_id));
    }

    // Count by status
    const statusCounts = new Map<number, number>();
    filteredOrders.forEach(o => {
        statusCounts.set(o.order_status, (statusCounts.get(o.order_status) || 0) + 1);
    });

    const total = filteredOrders.length;

    // Map status codes to labels and colors
    const statusMap: Record<number, { label: string; color: string }> = {
        1: { label: 'Pending', color: '#F59E0B' },
        2: { label: 'Confirmed', color: '#3B82F6' },
        3: { label: 'Preparing', color: '#8B5CF6' },
        4: { label: 'Out for Delivery', color: '#14B8A6' },
        5: { label: 'Completed', color: '#10B981' },
        6: { label: 'Cancelled', color: '#EF4444' },
    };

    return Array.from(statusCounts.entries())
        .map(([status, count]) => ({
            status: statusMap[status]?.label || `Status ${status}`,
            count,
            percentage: (count / total) * 100,
            color: statusMap[status]?.color || '#6B7280',
        }))
        .sort((a, b) => b.count - a.count);
}
