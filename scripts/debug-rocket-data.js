import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') }); // Try root .env if it exists

const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_KEY || '');

async function debugData() {
    console.log('📡 Checking Supabase Connectivity...');
    
    const { count: orderCount, error: orderError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true });
    
    if (orderError) console.error('❌ Order fetch error:', orderError);
    else console.log('✅ Total Orders:', orderCount);

    const { count: completedCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('order_status', 5);
    console.log('✅ Completed Orders Status 5:', completedCount);

    const { data: firstOrder } = await supabase
        .from('orders')
        .select('created_timestamp')
        .order('created_timestamp', { ascending: false })
        .limit(1);
    
    if (firstOrder && firstOrder[0]) {
        console.log('✅ Most recent order TS:', firstOrder[0].created_timestamp);
        console.log('✅ As Date:', new Date(firstOrder[0].created_timestamp * 1000).toISOString());
    }

    const { count: merchantCount } = await supabase
        .from('merchants')
        .select('*', { count: 'exact', head: true });
    console.log('✅ Total Merchants:', merchantCount);

    const now = new Date();
    const endTs = Math.floor(now.getTime() / 1000);
    const { count: testFilter } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .lte('created_timestamp', endTs);
    console.log('✅ Filter LTE Now Test:', testFilter);
}

debugData().catch(console.error);
