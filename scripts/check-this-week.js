import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkThisWeekOrders() {
    // Get current week timestamps (Sunday to Saturday)
    const now = new Date();
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    weekStart.setHours(0, 0, 0, 0);
    const weekStartTs = Math.floor(weekStart.getTime() / 1000);

    console.log(`This week starts: ${weekStart.toISOString()} (${weekStartTs})\n`);

    // Get completed orders this week
    const { data: orders } = await supabase
        .from('orders')
        .select('order_id, order_status, delivery_address_id, created_timestamp')
        .gte('created_timestamp', weekStartTs)
        .eq('order_status', 5);

    console.log(`Found ${orders?.length || 0} completed orders this week`);

    if (!orders || orders.length === 0) return;

    // Get the delivery addresses for these orders
    const addressIds = orders.map(o => o.delivery_address_id).filter(id => id);

    const { data: addresses } = await supabase
        .from('delivery_addresses')
        .select('id, city, address')
        .in('id', addressIds);

    console.log('\nOrders by city:');
    const addressMap = new Map(addresses?.map(a => [a.id, a]) || []);

    orders.forEach(order => {
        const addr = addressMap.get(order.delivery_address_id);
        const date = new Date(order.created_timestamp * 1000);
        console.log(`- Order #${order.order_id}: ${addr?.city || 'Unknown'} (${date.toLocaleString()})`);
    });
}

checkThisWeekOrders().catch(console.error);
