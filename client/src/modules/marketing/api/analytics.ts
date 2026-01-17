import { supabase } from '../../../lib/supabase';
import type { WeeklyAnalytics, AnalyticsFilters, AnalyticsConfig } from '../../../types/analytics';
import { getActivationRate } from './activationRate';
import { getRepeatRate } from './repeatRate';
import { calculateNewCustomers } from './newCustomersHelper';

export async function previewSegmentCount(_rules: any): Promise<number> {
    // Placeholder for the function body, as it was not provided in the instruction.
    // Please replace this with the actual implementation.
    return 0;
}

/**
 * Get analytics metrics for a date range - OPTIMIZED VERSION
 */
export async function getWeeklyAnalytics(
    filters?: AnalyticsFilters,
    config?: AnalyticsConfig
): Promise<WeeklyAnalytics> {
    // Support both new (date_from/date_to) and old (week_start/week_end) parameters
    const now = new Date();

    const weekStart = filters?.date_from
        ? new Date(filters.date_from)
        : filters?.week_start
            ? new Date(filters.week_start)
            : new Date(now.setDate(now.getDate() - now.getDay()));

    const weekEnd = filters?.date_to
        ? new Date(filters.date_to)
        : filters?.week_end
            ? new Date(filters.week_end)
            : new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    const weekStartTimestamp = Math.floor(weekStart.getTime() / 1000);
    const weekEndTimestamp = Math.floor(weekEnd.getTime() / 1000);

    // Use fallback function for accurate metrics (RPC doesn't have updated logic)
    return await getWeeklyAnalyticsFallback(weekStartTimestamp, weekEndTimestamp, config, filters?.city);
}


/**
 * Fallback method using simple queries
 */
async function getWeeklyAnalyticsFallback(
    weekStartTimestamp: number,
    weekEndTimestamp: number,
    config?: AnalyticsConfig,
    city?: string
): Promise<WeeklyAnalytics> {
    console.log(`[Analytics] Fetching analytics for timestamps ${weekStartTimestamp} - ${weekEndTimestamp}`);

    // Get all orders for the time period first
    const { data: allOrders } = await supabase
        .from('orders')
        .select('order_id, user_id, order_status, order_amount, delivery_address_id, merchant_id')
        .gte('created_timestamp', weekStartTimestamp)
        .lte('created_timestamp', weekEndTimestamp);

    let orders = allOrders || [];

    // If city filter is provided, filter by matching addresses
    if (city && orders.length > 0) {
        console.log(`[Analytics] Filtering ${orders.length} orders by city: "${city}"`);

        // Get all unique address IDs from orders
        const allAddressIds = [...new Set(orders.map(o => o.delivery_address_id).filter(Boolean))];
        console.log(`[Analytics] Found ${allAddressIds.length} unique addresses`);

        // Batch the address lookups to avoid URL length limits (max 100 per batch)
        const batchSize = 100;
        const matchingAddressIds = new Set<string>();

        for (let i = 0; i < allAddressIds.length; i += batchSize) {
            const batch = allAddressIds.slice(i, i + batchSize);
            const { data: addresses } = await supabase
                .from('delivery_addresses')
                .select('id')
                .in('id', batch)
                .or(`city.ilike.%${city}%,address.ilike.%${city}%`);

            addresses?.forEach(a => matchingAddressIds.add(a.id));
        }

        console.log(`[Analytics] Found ${matchingAddressIds.size} addresses matching "${city}"`);

        // Filter orders to only those with matching addresses
        orders = orders.filter(o => matchingAddressIds.has(o.delivery_address_id));
        console.log(`[Analytics] Filtered to ${orders.length} orders`);
    }

    const ordersList = orders;
    // Include Confirmed(1), Preparing(2), Ready(3), Out for delivery(4), Delivered(5)
    const completedOrders = ordersList.filter(o => o.order_status >= 1 && o.order_status <= 5);

    // Get unique customer IDs from this period
    const customerIds = [...new Set(ordersList.map(o => o.user_id).filter(id => id))];

    // Calculate new customers (first-time buyers)
    const uniqueCustomers = await calculateNewCustomers(customerIds, weekStartTimestamp, weekEndTimestamp);

    const ordersRevenue = completedOrders.reduce((sum, o) => sum + Number(o.order_amount), 0);

    // Get manual revenue
    const weekStartDate = new Date(weekStartTimestamp * 1000).toISOString().split('T')[0];
    const weekEndDate = new Date(weekEndTimestamp * 1000).toISOString().split('T')[0];

    const { data: manualRevenue } = await supabase
        .from('manual_revenue_entries')
        .select('amount')
        .gte('entry_date', weekStartDate)
        .lte('entry_date', weekEndDate);

    const manualRevenueTotal = manualRevenue?.reduce((sum, entry) => sum + Number(entry.amount || 0), 0) || 0;
    const totalRevenue = ordersRevenue + manualRevenueTotal;

    // Calculate Amsterdam count
    let amsterdamCount = 0;
    const addressIds = completedOrders
        .map(o => o.delivery_address_id)
        .filter(id => id);

    if (addressIds.length > 0) {
        // Batch address lookups
        const batchSize = 100;
        const amsterdamAddressIds = new Set<string>();

        for (let i = 0; i < addressIds.length; i += batchSize) {
            const batch = addressIds.slice(i, i + batchSize);
            const { data: addresses } = await supabase
                .from('delivery_addresses')
                .select('id')
                .in('id', batch)
                .or(`city.ilike.%amsterdam%,address.ilike.%amsterdam%`);

            addresses?.forEach(a => amsterdamAddressIds.add(a.id));
        }

        amsterdamCount = completedOrders.filter(o => amsterdamAddressIds.has(o.delivery_address_id)).length;
    }

    // Get active chefs count from actual orders
    const uniqueMerchantIds = [...new Set(completedOrders.map(o => o.merchant_id).filter(Boolean))];

    // Let's use the safer query that matches TopChefs logic: query against merchant_id

    const { data: merchantDetailsSafe } = await supabase
        .from('merchants')
        .select('id, city')
        .in('merchant_id', uniqueMerchantIds);

    let activeChefs = merchantDetailsSafe?.length || 0;
    if (city) {
        activeChefs = merchantDetailsSafe?.filter(m => m.city?.toLowerCase().includes(city.toLowerCase())).length || 0;
    }

    const activeChefsAmsterdam = merchantDetailsSafe?.filter(
        m => m.city?.toLowerCase().includes('amsterdam')
    ).length || 0;

    const cacPerCustomer = config?.weekly_marketing_spend && uniqueCustomers > 0
        ? config.weekly_marketing_spend / uniqueCustomers
        : undefined;

    // Calculate contribution margin per order
    // Platform takes 12% commission on total revenue
    const contributionMarginPerOrder = completedOrders.length > 0
        ? (totalRevenue * 0.12) / completedOrders.length
        : undefined;

    // Calculate activation rate (only if there are orders)
    let activationRate = 0;
    if (completedOrders.length > 0) {
        try {
            const weekStart = new Date(weekStartTimestamp * 1000);
            const weekEnd = new Date(weekEndTimestamp * 1000);
            const activationData = await getActivationRate(weekStart, weekEnd);
            activationRate = activationData.activationRate;
        } catch (err) {
            console.error('Error calculating activation rate:', err);
        }
    }

    // Calculate 30-day repeat rate (only if there are orders)
    let repeatRate = 0;
    if (completedOrders.length > 0) {
        try {
            const weekStart = new Date(weekStartTimestamp * 1000);
            const weekEnd = new Date(weekEndTimestamp * 1000);
            const repeatData = await getRepeatRate(weekStart, weekEnd);
            repeatRate = repeatData.repeatRate;
        } catch (err) {
            console.error('Error calculating repeat rate:', err);
        }
    }

    return {
        new_customers: uniqueCustomers,
        activation_rate: activationRate,
        completed_orders: completedOrders.length,
        completed_orders_amsterdam: amsterdamCount,
        repeat_rate_30d: repeatRate,
        active_chefs: activeChefs,
        active_chefs_amsterdam: activeChefsAmsterdam,
        cac_per_customer: cacPerCustomer,
        contribution_margin_per_order: contributionMarginPerOrder,
    };
}
