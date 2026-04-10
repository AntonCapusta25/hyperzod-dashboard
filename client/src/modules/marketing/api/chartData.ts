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

    // Get manual revenue entries for the date range
    const { data: manualRevenue } = await supabase
        .from('manual_revenue_entries')
        .select('entry_date, amount')
        .gte('entry_date', startDate.toISOString().split('T')[0])
        .lte('entry_date', endDate.toISOString().split('T')[0]);

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

        // Count completed orders (statuses 1-5: Confirmed through Delivered)
        if (order.order_status >= 1 && order.order_status <= 5) {
            dayData.completed_orders++;
            dayData.revenue += Number(order.order_amount || 0);
        }
    });

    // Add manual revenue to the corresponding dates
    console.log('[ChartData] Manual revenue entries:', manualRevenue?.length || 0);
    manualRevenue?.forEach(entry => {
        const date = entry.entry_date;
        console.log('[ChartData] Adding manual revenue:', date, '€' + entry.amount);

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
        const oldRevenue = dayData.revenue;
        dayData.revenue += Number(entry.amount || 0);
        console.log('[ChartData] Updated revenue for', date, 'from €' + oldRevenue.toFixed(2), 'to €' + dayData.revenue.toFixed(2));
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

    console.log('[ChartData] Total data points:', result.length);
    console.log('[ChartData] Total revenue:', result.reduce((sum, d) => sum + d.revenue, 0).toFixed(2));

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

    // Get all completed orders with merchant info
    const { data: orders } = await supabase
        .from('orders')
        .select('delivery_address_id, order_amount, merchant_id')
        .gte('created_timestamp', startTs)
        .lte('created_timestamp', endTs)
        .eq('order_status', 5);

    if (!orders || orders.length === 0) return [];

    // Get delivery addresses
    const addressIds = [...new Set(orders.map(o => o.delivery_address_id).filter(Boolean))];
    const addressMap = new Map<string, { city: string }>();

    if (addressIds.length > 0) {
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
    }

    // Get merchant cities as fallback
    const merchantIds = [...new Set(orders.map(o => o.merchant_id).filter(Boolean))];
    const merchantCityMap = new Map<string, string>();

    if (merchantIds.length > 0) {
        const batchSize = 100;
        for (let i = 0; i < merchantIds.length; i += batchSize) {
            const batch = merchantIds.slice(i, i + batchSize);
            const { data: merchants } = await supabase
                .from('merchants')
                .select('merchant_id, city')
                .in('merchant_id', batch);

            merchants?.forEach(m => {
                if (m.city) merchantCityMap.set(m.merchant_id, m.city);
            });
        }
    }

    // Group by city
    const cityStats = new Map<string, { order_count: number; revenue: number }>();

    orders.forEach(order => {
        // Try delivery address city first, then merchant city
        let city = addressMap.get(order.delivery_address_id)?.city;
        if (!city && order.merchant_id) {
            city = merchantCityMap.get(order.merchant_id);
        }

        if (!city) return; // Skip if no city found

        if (!cityStats.has(city)) {
            cityStats.set(city, { order_count: 0, revenue: 0 });
        }

        const stats = cityStats.get(city)!;
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

/**
 * Get orders by hour of day for peak hour analysis
 */
export async function getOrdersByHour(
    startDate: Date,
    endDate: Date,
    city?: string
): Promise<Record<number, number>> {
    const startTs = Math.floor(startDate.getTime() / 1000);
    const endTs = Math.floor(endDate.getTime() / 1000);

    const { data: orders } = await supabase
        .from('orders')
        .select('created_timestamp, delivery_address_id')
        .gte('created_timestamp', startTs)
        .lte('created_timestamp', endTs)
        .gte('order_status', 1)
        .lte('order_status', 5);

    if (!orders) return {};

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

    const hourCounts: Record<number, number> = {};
    for (let i = 0; i < 24; i++) hourCounts[i] = 0;

    filteredOrders.forEach(o => {
        if (o.created_timestamp) {
            const date = new Date(o.created_timestamp * 1000);
            const hour = date.getHours();
            hourCounts[hour]++;
        }
    });

    return hourCounts;
}

/**
 * Get orders by day of week for weekly performance analysis
 */
export async function getOrdersByDayOfWeek(
    startDate: Date,
    endDate: Date,
    city?: string
): Promise<Record<number, number>> {
    const startTs = Math.floor(startDate.getTime() / 1000);
    const endTs = Math.floor(endDate.getTime() / 1000);

    const { data: orders } = await supabase
        .from('orders')
        .select('created_timestamp, delivery_address_id')
        .gte('created_timestamp', startTs)
        .lte('created_timestamp', endTs)
        .gte('order_status', 1)
        .lte('order_status', 5);

    if (!orders) return {};

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

    const dayCounts: Record<number, number> = {};
    for (let i = 0; i < 7; i++) dayCounts[i] = 0;

    filteredOrders.forEach(o => {
        if (o.created_timestamp) {
            const date = new Date(o.created_timestamp * 1000);
            const day = date.getDay(); // 0 is Sunday, 1 is Monday, etc.
            dayCounts[day]++;
        }
    });

    return dayCounts;
}

export interface RocketChartData {
    date: string;
    total: number;
}

export interface RocketData {
    revenueData: RocketChartData[];
    monthlyRevenueData: RocketChartData[];
    customerData: RocketChartData[];
    chefData: RocketChartData[];
    pipelineData: RocketChartData[];
    totals: {
        revenue: number;
        customers: number;
        chefs: number;
        pipeline: number;
    }
}

/**
 * Get growth data for Rocket Graphs with date filtering
 */
export async function getRocketData(startDate?: Date, endDate?: Date): Promise<RocketData> {
    const startTs = startDate ? Math.floor(startDate.getTime() / 1000) : 0;
    const endTs = endDate ? Math.floor(endDate.getTime() / 1000) : Math.floor(Date.now() / 1000);
    const startDateStr = startDate ? startDate.toISOString().split('T')[0] : '0000-00-00';
    const endDateStr = endDate ? endDate.toISOString().split('T')[0] : '9999-12-31';

    // 1. Get initial totals (before startDate)
    const [{ data: initialOrders }, { data: initialMerchants }, { data: initialManual }] = await Promise.all([
        supabase.from('orders').select('order_amount, user_id').eq('order_status', 5).lt('created_timestamp', startTs),
        supabase.from('merchants').select('status').lt('created_at', startDate ? startDate.toISOString() : '0000-00-00'),
        supabase.from('manual_revenue_entries').select('amount').lt('entry_date', startDateStr)
    ]);

    const initialRevenue = (initialOrders?.reduce((sum, o) => sum + Number(o.order_amount || 0), 0) || 0) +
                           (initialManual?.reduce((sum, m) => sum + Number(m.amount || 0), 0) || 0);
    const initialCustomers = new Set(initialOrders?.map(o => o.user_id)).size;
    const initialActiveChefs = initialMerchants?.filter(m => m.status === true).length || 0;
    const initialPipeline = initialMerchants?.filter(m => m.status !== true).length || 0;

    // 2. Fetch data WITHIN range
    const [{ data: orders }, { data: manualRevenue }, { data: merchants }] = await Promise.all([
        supabase.from('orders').select('user_id, order_amount, created_timestamp').eq('order_status', 5).gte('created_timestamp', startTs).lte('created_timestamp', endTs).order('created_timestamp', { ascending: true }),
        supabase.from('manual_revenue_entries').select('entry_date, amount').gte('entry_date', startDateStr).lte('entry_date', endDateStr).order('entry_date', { ascending: true }),
        supabase.from('merchants').select('status, created_at').gte('created_at', startDate ? startDate.toISOString() : '0000-00-00').lte('created_at', endDate ? endDate.toISOString() : new Date().toISOString()).order('created_at', { ascending: true })
    ]);

    // Group daily deltas
    const revenueByDate = new Map<string, number>();
    const newCustomersByDate = new Map<string, number>();
    const activeChefsByDate = new Map<string, number>();
    const pipelineByDate = new Map<string, number>();
    
    // Track unique customers seen before
    const existingCustomers = new Set(initialOrders?.map(o => o.user_id));

    orders?.forEach(o => {
        const date = new Date(o.created_timestamp * 1000).toISOString().split('T')[0];
        revenueByDate.set(date, (revenueByDate.get(date) || 0) + Number(o.order_amount || 0));
        
        if (!existingCustomers.has(o.user_id)) {
            newCustomersByDate.set(date, (newCustomersByDate.get(date) || 0) + 1);
            existingCustomers.add(o.user_id);
        }
    });

    manualRevenue?.forEach(entry => {
        const date = entry.entry_date;
        revenueByDate.set(date, (revenueByDate.get(date) || 0) + Number(entry.amount || 0));
    });

    merchants?.forEach(m => {
        const date = new Date(m.created_at).toISOString().split('T')[0];
        if (m.status === true) activeChefsByDate.set(date, (activeChefsByDate.get(date) || 0) + 1);
        else pipelineByDate.set(date, (pipelineByDate.get(date) || 0) + 1);
    });

    // Helper to build cumulative data
    const buildCumulative = (dataMap: Map<string, number>, baseValue: number) => {
        const dates = [];
        let curr = new Date(startDate || new Date(2022, 0, 1));
        const end = endDate || new Date();
        while (curr <= end) {
            dates.push(curr.toISOString().split('T')[0]);
            curr.setDate(curr.getDate() + 1);
        }

        let running = baseValue;
        return dates.map(date => {
            running += (dataMap.get(date) || 0);
            return { date, total: running };
        });
    };

    const revenueData = buildCumulative(revenueByDate, initialRevenue);
    const customerData = buildCumulative(newCustomersByDate, initialCustomers);
    const chefData = buildCumulative(activeChefsByDate, initialActiveChefs);
    const pipelineData = buildCumulative(pipelineByDate, initialPipeline);

    // Monthly Revenue (Non-cumulative, fill gaps)
    const monthlyRevenueMap = new Map<string, number>();
    let mCurr = new Date(startDate || new Date(2022, 0, 1));
    const mEnd = endDate || new Date();
    while (mCurr <= mEnd) {
        monthlyRevenueMap.set(`${mCurr.getFullYear()}-${String(mCurr.getMonth() + 1).padStart(2, '0')}`, 0);
        mCurr.setMonth(mCurr.getMonth() + 1);
    }

    orders?.forEach(o => {
        const date = new Date(o.created_timestamp * 1000);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (monthlyRevenueMap.has(key)) {
            monthlyRevenueMap.set(key, monthlyRevenueMap.get(key)! + Number(o.order_amount || 0));
        }
    });

    const monthlyRevenueData = Array.from(monthlyRevenueMap.entries())
        .map(([date, total]) => ({ date, total }))
        .sort((a, b) => a.date.localeCompare(b.date));

    return {
        revenueData,
        monthlyRevenueData,
        customerData,
        chefData,
        pipelineData,
        totals: {
            revenue: revenueData[revenueData.length - 1]?.total || initialRevenue,
            customers: customerData[customerData.length - 1]?.total || initialCustomers,
            chefs: chefData[chefData.length - 1]?.total || initialActiveChefs,
            pipeline: pipelineData[pipelineData.length - 1]?.total || initialPipeline
        }
    };
}
