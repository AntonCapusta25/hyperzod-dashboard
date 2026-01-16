import { supabase } from '../../../lib/supabase';

/**
 * Calculate activation rate: percentage of users who made their first order within 7 days of signup
 * @param dateRange Optional date range to filter users by signup date
 */
export async function getActivationRate(from?: Date, to?: Date): Promise<{
    totalUsers: number;
    activatedUsers: number;
    activationRate: number;
    avgDaysToFirstOrder: number;
}> {
    try {
        // Build query for users in the date range
        let usersQuery = supabase
            .from('clients')
            .select('hyperzod_id, hyperzod_created_at')
            .not('hyperzod_created_at', 'is', null);

        if (from) {
            usersQuery = usersQuery.gte('hyperzod_created_at', from.toISOString());
        }
        if (to) {
            usersQuery = usersQuery.lte('hyperzod_created_at', to.toISOString());
        }

        const { data: users, error: usersError } = await usersQuery;
        if (usersError) throw usersError;

        const totalUsers = users?.length || 0;
        if (totalUsers === 0) {
            return { totalUsers: 0, activatedUsers: 0, activationRate: 0, avgDaysToFirstOrder: 0 };
        }

        // Get all first orders for these users
        const userIds = users.map(u => u.hyperzod_id);

        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select('user_id, created_timestamp')
            .in('user_id', userIds)
            .eq('is_user_first_order', true);

        if (ordersError) throw ordersError;

        // Calculate activation metrics
        let activatedUsers = 0;
        let totalDaysToFirstOrder = 0;

        users.forEach(user => {
            const firstOrder = orders?.find(o => o.user_id === user.hyperzod_id);
            if (firstOrder && user.hyperzod_created_at) {
                const signupDate = new Date(user.hyperzod_created_at);
                const orderDate = new Date(firstOrder.created_timestamp * 1000); // Convert from Unix timestamp
                const daysDiff = (orderDate.getTime() - signupDate.getTime()) / (1000 * 60 * 60 * 24);

                if (daysDiff <= 7 && daysDiff >= 0) {
                    activatedUsers++;
                    totalDaysToFirstOrder += daysDiff;
                }
            }
        });

        const activationRate = totalUsers > 0 ? (activatedUsers / totalUsers) * 100 : 0;
        const avgDaysToFirstOrder = activatedUsers > 0 ? totalDaysToFirstOrder / activatedUsers : 0;

        return {
            totalUsers,
            activatedUsers,
            activationRate: Math.round(activationRate * 10) / 10, // Round to 1 decimal
            avgDaysToFirstOrder: Math.round(avgDaysToFirstOrder * 10) / 10
        };
    } catch (error) {
        console.error('Error calculating activation rate:', error);
        throw error;
    }
}

/**
 * Get activation rate trend over time (by week or month)
 */
export async function getActivationRateTrend(
    from: Date,
    to: Date,
    _interval: 'week' | 'month' = 'week'
): Promise<Array<{
    period: string;
    totalUsers: number;
    activatedUsers: number;
    activationRate: number;
}>> {
    // This would require more complex date bucketing
    // For now, return overall rate
    // TODO: Implement time-series bucketing
    const overall = await getActivationRate(from, to);
    return [{
        period: `${from.toLocaleDateString()} - ${to.toLocaleDateString()}`,
        ...overall
    }];
}
