import { supabase } from '../../../lib/supabase';

/**
 * Calculate 30-day repeat rate: % of customers who placed 2+ orders in the period
 */
export async function getRepeatRate(from: Date, to: Date): Promise<{
    totalFirstTimeBuyers: number;
    repeatCustomers: number;
    repeatRate: number;
}> {
    try {
        const startTimestamp = Math.floor(from.getTime() / 1000);
        const endTimestamp = Math.floor(to.getTime() / 1000);

        // Get all completed orders in the period (statuses 1-5)
        const { data: orders, error } = await supabase
            .from('orders')
            .select('user_id, created_timestamp')
            .gte('created_timestamp', startTimestamp)
            .lte('created_timestamp', endTimestamp)
            .gte('order_status', 1)
            .lte('order_status', 5);

        if (error) throw error;

        if (!orders || orders.length === 0) {
            return { totalFirstTimeBuyers: 0, repeatCustomers: 0, repeatRate: 0 };
        }

        // Count orders per user
        const orderCountByUser = new Map<number, number>();
        orders.forEach(order => {
            if (order.user_id) {
                const count = orderCountByUser.get(order.user_id) || 0;
                orderCountByUser.set(order.user_id, count + 1);
            }
        });

        const totalCustomers = orderCountByUser.size;
        const repeatCustomers = Array.from(orderCountByUser.values()).filter(count => count > 1).length;
        const repeatRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;

        return {
            totalFirstTimeBuyers: totalCustomers,
            repeatCustomers,
            repeatRate: Math.round(repeatRate * 10) / 10 // Round to 1 decimal
        };
    } catch (error) {
        console.error('Error calculating repeat rate:', error);
        throw error;
    }
}

/**
 * Get chefs with highest repeat order percentages
 */
export async function getTopRepeatChefs(from: Date, to: Date, limit: number = 10): Promise<Array<{
    merchantId: string;
    merchantName: string;
    totalOrders: number;
    repeatOrders: number;
    repeatRate: number;
}>> {
    try {
        const startTimestamp = Math.floor(from.getTime() / 1000);
        const endTimestamp = Math.floor(to.getTime() / 1000);

        // Get all orders in the period with merchant info
        const { data: orders, error } = await supabase
            .from('orders')
            .select('merchant_id, user_id, is_user_first_order')
            .gte('created_timestamp', startTimestamp)
            .lte('created_timestamp', endTimestamp);

        if (error) throw error;

        // Group orders by merchant
        const merchantStats = new Map<string, {
            totalOrders: number;
            repeatOrders: number;
            userOrders: Map<number, number>;
        }>();

        orders?.forEach(order => {
            if (!merchantStats.has(order.merchant_id)) {
                merchantStats.set(order.merchant_id, {
                    totalOrders: 0,
                    repeatOrders: 0,
                    userOrders: new Map()
                });
            }

            const stats = merchantStats.get(order.merchant_id)!;
            stats.totalOrders++;

            // Track orders per user for this merchant
            const userOrderCount = stats.userOrders.get(order.user_id) || 0;
            stats.userOrders.set(order.user_id, userOrderCount + 1);

            // If this user has ordered more than once from this merchant, it's a repeat order
            if (userOrderCount > 0) {
                stats.repeatOrders++;
            }
        });

        // Calculate repeat rates and sort
        const chefStats = Array.from(merchantStats.entries())
            .map(([merchantId, stats]) => ({
                merchantId,
                merchantName: '', // Will be filled from merchants table
                totalOrders: stats.totalOrders,
                repeatOrders: stats.repeatOrders,
                repeatRate: stats.totalOrders > 0 ? (stats.repeatOrders / stats.totalOrders) * 100 : 0
            }))
            .filter(chef => chef.totalOrders >= 5) // Only include chefs with at least 5 orders
            .sort((a, b) => b.repeatRate - a.repeatRate)
            .slice(0, limit);

        // Fetch merchant names
        if (chefStats.length > 0) {
            const merchantIds = chefStats.map(c => c.merchantId);
            const { data: merchants } = await supabase
                .from('merchants')
                .select('merchant_id, name')
                .in('merchant_id', merchantIds);

            const merchantNameMap = new Map(
                merchants?.map(m => [m.merchant_id, m.name]) || []
            );

            chefStats.forEach(chef => {
                chef.merchantName = merchantNameMap.get(chef.merchantId) || 'Unknown';
            });
        }

        return chefStats;
    } catch (error) {
        console.error('Error getting top repeat chefs:', error);
        throw error;
    }
}
