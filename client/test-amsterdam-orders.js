/**
 * Test script to verify Amsterdam orders for this week
 * Run with: node test-amsterdam-orders.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAmsterdamOrders() {
    console.log('🔍 Testing Amsterdam Orders for This Week\n');
    console.log('='.repeat(60));

    // Calculate this week's date range (Monday to Sunday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const startTimestamp = Math.floor(monday.getTime() / 1000);
    const endTimestamp = Math.floor(sunday.getTime() / 1000);

    console.log(`📅 Date Range: ${monday.toLocaleDateString()} - ${sunday.toLocaleDateString()}`);
    console.log(`⏰ Timestamps: ${startTimestamp} - ${endTimestamp}\n`);

    try {
        // Step 1: Get all orders for this week
        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select('order_id, user_id, order_status, order_amount, delivery_address_id')
            .gte('created_timestamp', startTimestamp)
            .lte('created_timestamp', endTimestamp);

        if (ordersError) throw ordersError;

        console.log(`📦 Total Orders This Week: ${orders?.length || 0}`);

        if (!orders || orders.length === 0) {
            console.log('⚠️  No orders found for this week');
            return;
        }

        // Step 2: Get delivery addresses for these orders
        const addressIds = [...new Set(orders.map(o => o.delivery_address_id).filter(Boolean))];

        const { data: addresses, error: addressError } = await supabase
            .from('delivery_addresses')
            .select('id, city')
            .in('id', addressIds);

        if (addressError) throw addressError;

        console.log(`📍 Unique Addresses: ${addresses?.length || 0}\n`);

        // Step 3: Filter Amsterdam orders
        const amsterdamAddressIds = new Set(
            addresses?.filter(a => a.city?.toLowerCase().includes('amsterdam')).map(a => a.id) || []
        );

        const amsterdamOrders = orders.filter(o => amsterdamAddressIds.has(o.delivery_address_id));

        console.log('🏙️  AMSTERDAM ORDERS');
        console.log('='.repeat(60));
        console.log(`Total Orders: ${amsterdamOrders.length}`);
        console.log(`Unique Customers: ${new Set(amsterdamOrders.map(o => o.user_id)).size}`);

        const totalRevenue = amsterdamOrders.reduce((sum, o) => sum + parseFloat(o.order_amount || 0), 0);
        console.log(`Total Revenue: €${totalRevenue.toFixed(2)}`);
        console.log(`Average Order Value: €${(totalRevenue / amsterdamOrders.length).toFixed(2)}\n`);

        // Step 4: Breakdown by status
        const statusCounts = {};
        const statusNames = {
            0: 'Pending',
            1: 'Confirmed',
            2: 'Preparing',
            3: 'Ready',
            4: 'Out for Delivery',
            5: 'Delivered',
            6: 'Cancelled'
        };

        amsterdamOrders.forEach(order => {
            const status = order.order_status;
            statusCounts[status] = (statusCounts[status] || 0) + 1;
        });

        console.log('📊 Breakdown by Status:');
        console.log('-'.repeat(60));
        Object.entries(statusCounts).forEach(([status, count]) => {
            const statusName = statusNames[status] || 'Unknown';
            const percentage = ((count / amsterdamOrders.length) * 100).toFixed(1);
            console.log(`${statusName.padEnd(20)} ${count.toString().padStart(4)} (${percentage}%)`);
        });

        console.log('\n✅ Test completed successfully!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

testAmsterdamOrders();
