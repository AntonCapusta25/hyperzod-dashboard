import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from scripts directory
dotenv.config({ path: join(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function findLastAmsterdamOrder() {
    console.log('🔍 Searching for most recent Amsterdam order...');

    // 1. Get all delivery addresses with Amsterdam
    const { data: addresses } = await supabase
        .from('delivery_addresses')
        .select('id, city, address')
        .or('city.ilike.%amsterdam%,address.ilike.%amsterdam%');

    if (!addresses || addresses.length === 0) {
        console.log('No Amsterdam addresses found at all.');
        return;
    }

    const addressIds = addresses.map(a => a.id);
    console.log(`Found ${addressIds.length} Amsterdam addresses.`);

    // 2. Find orders with these addresses
    const { data: orders } = await supabase
        .from('orders')
        .select('order_id, created_timestamp, delivery_address_id')
        .in('delivery_address_id', addressIds)
        .eq('order_status', 5) // Completed
        .order('created_timestamp', { ascending: false })
        .limit(5);

    if (orders && orders.length > 0) {
        console.log('\n✅ Most recent Amsterdam orders:');
        orders.forEach(o => {
            const date = new Date(o.created_timestamp * 1000);
            console.log(`- Order #${o.order_id}: ${date.toLocaleString()} (${date.toISOString()})`);
        });
    } else {
        console.log('\n❌ No completed orders found for Amsterdam addresses.');
    }
}

findLastAmsterdamOrder().catch(console.error);
