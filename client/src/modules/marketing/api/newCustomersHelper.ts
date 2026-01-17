import { supabase } from '../../../lib/supabase';

/**
 * Calculate new customers - customers whose FIRST ORDER EVER was in the date range
 */
async function calculateNewCustomers(
    customerIds: string[],
    weekStartTimestamp: number,
    weekEndTimestamp: number,
    city?: string
): Promise<number> {
    let newCustomersCount = 0;

    // For each customer, check if their FIRST ORDER EVER was in this date range
    for (const customerId of customerIds) {
        const { data: customerOrders } = await supabase
            .from('orders')
            .select('created_timestamp')
            .eq('user_id', customerId)
            .order('created_timestamp', { ascending: true })
            .limit(1);

        if (customerOrders && customerOrders.length > 0) {
            const firstOrderTime = customerOrders[0].created_timestamp;
            // Count as new customer if their very first order was in this date range
            if (firstOrderTime >= weekStartTimestamp && firstOrderTime <= weekEndTimestamp) {
                newCustomersCount++;
            }
        }
    }

    return newCustomersCount;
}

// Export the helper function
export { calculateNewCustomers };
