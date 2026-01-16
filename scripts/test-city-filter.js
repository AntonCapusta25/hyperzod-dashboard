import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function testCityFilter() {
    const city = 'Enschede';

    // Get current week timestamps
    const now = new Date();
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    weekStart.setHours(0, 0, 0, 0);
    const weekStartTs = Math.floor(weekStart.getTime() / 1000);

    console.log(`Testing city filter for: ${city}`);
    console.log(`Week start: ${weekStart.toISOString()} (${weekStartTs})\n`);

    // Step 1: Get addresses matching the city
    const { data: cityAddresses } = await supabase
        .from('delivery_addresses')
        .select('id, city, address')
        .or(`city.ilike.%${city}%,address.ilike.%${city}%`);

    console.log(`Found ${cityAddresses?.length || 0} addresses matching "${city}"`);
    if (cityAddresses && cityAddresses.length > 0) {
        console.log('Sample addresses:', cityAddresses.slice(0, 3));
    }

    const cityAddressIds = cityAddresses?.map(a => a.id) || [];

    // Step 2: Get orders with those addresses
    const { data: orders } = await supabase
        .from('orders')
        .select('order_id, order_status, delivery_address_id, created_timestamp')
        .gte('created_timestamp', weekStartTs)
        .in('delivery_address_id', cityAddressIds);

    console.log(`\nFound ${orders?.length || 0} orders this week with ${city} addresses`);
    if (orders) {
        const completed = orders.filter(o => o.order_status === 5);
        console.log(`  - ${completed.length} completed (status=5)`);
        console.log(`  - ${orders.length - completed.length} other statuses`);
    }
}

testCityFilter().catch(console.error);
