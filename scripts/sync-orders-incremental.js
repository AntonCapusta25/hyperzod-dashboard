import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './scripts/.env' });

// Configuration
const HYPERZOD_API_KEY = process.env.HYPERZOD_API_KEY;
const HYPERZOD_TENANT_ID = process.env.HYPERZOD_TENANT_ID;
const HYPERZOD_BASE_URL = process.env.HYPERZOD_BASE_URL || 'https://api.hyperzod.app';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Validate environment variables
if (!HYPERZOD_API_KEY || !HYPERZOD_TENANT_ID || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing required environment variables!');
    process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function getLastSyncedOrderId() {
    const { data } = await supabase
        .from('orders')
        .select('order_id')
        .order('order_id', { ascending: false })
        .limit(1);

    return data?.[0]?.order_id || 0;
}

async function fetchNewOrders(lastOrderId) {
    console.log(`🔍 Fetching orders after ID ${lastOrderId}...`);

    const response = await fetch(`${HYPERZOD_BASE_URL}/admin/v1/order/list?page=1`, {
        method: 'POST',
        headers: {
            'X-API-KEY': HYPERZOD_API_KEY,
            'X-TENANT': HYPERZOD_TENANT_ID,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
    });

    if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    const allOrders = result.data?.data || [];

    // Filter orders newer than last synced
    const newOrders = allOrders.filter(order => order.order_id > lastOrderId);

    console.log(`   Found ${newOrders.length} new orders (total in API: ${allOrders.length})`);
    return newOrders;
}

async function syncIncrementalOrders() {
    console.log('\\n🚀 Starting Incremental Order Sync\\n');

    try {
        const lastOrderId = await getLastSyncedOrderId();
        console.log(`📌 Last synced order ID: ${lastOrderId}`);

        const newOrders = await fetchNewOrders(lastOrderId);

        if (newOrders.length === 0) {
            console.log('\\n✅ No new orders to sync!');
            return;
        }

        console.log(`\\n📥 Syncing ${newOrders.length} new orders...`);

        // Transform and insert orders (reusing logic from sync-orders.js)
        for (const order of newOrders) {
            const transformedOrder = {
                order_id: order.order_id,
                order_uuid: order._id,
                tenant_id: order.tenant_id,
                user_id: order.user_id,
                merchant_id: order.merchant_id,
                order_status: order.order_status,
                order_type: order.order_type,
                order_amount: order.order_amount,
                currency_code: order.currency?.code || 'EUR',
                payment_mode_id: order.payment_mode_id,
                created_timestamp: order.created_timestamp_unix,
                synced_at: new Date().toISOString(),
            };

            await supabase
                .from('orders')
                .upsert(transformedOrder, { onConflict: 'order_id' });

            console.log(`   ✅ Synced order #${order.order_id}`);
        }

        console.log(`\\n✅ Successfully synced ${newOrders.length} new orders!`);

    } catch (error) {
        console.error('\\n❌ Error:', error.message);
        process.exit(1);
    }
}

syncIncrementalOrders();
