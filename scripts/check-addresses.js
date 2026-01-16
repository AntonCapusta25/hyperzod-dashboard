import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from scripts directory
dotenv.config({ path: join(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkAddresses() {
    console.log('🔍 Checking delivery addresses...');

    // Get current week timestamps (Sunday to Sunday)
    const now = new Date();
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    weekStart.setHours(0, 0, 0, 0);
    const weekStartTs = Math.floor(weekStart.getTime() / 1000);

    console.log(`Checking orders since ${weekStart.toISOString()} (Timestamp: ${weekStartTs})`);

    // Get orders for this week
    const { data: orders } = await supabase
        .from('orders')
        .select('order_id, delivery_address_id, order_status')
        .gte('created_timestamp', weekStartTs)
        .eq('order_status', 5); // Completed only

    console.log(`Found ${orders.length} completed orders this week.`);

    const addressIds = orders.map(o => o.delivery_address_id).filter(id => id);

    if (addressIds.length === 0) {
        console.log('No addresses linked to completed orders found in sample.');
        return;
    }

    const { data: addresses } = await supabase
        .from('delivery_addresses')
        .select('id, city, address')
        .in('id', addressIds);

    console.log(`\nFound ${addresses.length} addresses.`);
    console.log('Sample data (first 10):');
    addresses.slice(0, 10).forEach(a => {
        console.log(`- City: "${a.city}", Address: "${a.address}"`);
    });

    // Check how many have "Amsterdam" in city vs address
    const inCity = addresses.filter(a => a.city?.toLowerCase().includes('amsterdam')).length;
    const inAddress = addresses.filter(a => a.address?.toLowerCase().includes('amsterdam')).length;

    console.log(`\nStats:`);
    console.log(`- "Amsterdam" in 'city' column: ${inCity}`);
    console.log(`- "Amsterdam" in 'address' column: ${inAddress}`);
}

checkAddresses().catch(console.error);
