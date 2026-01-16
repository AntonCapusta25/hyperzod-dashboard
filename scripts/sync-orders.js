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

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const limitArg = args.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null;

// Validate environment variables
if (!HYPERZOD_API_KEY || !HYPERZOD_TENANT_ID || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing required environment variables!');
    console.error('Required: HYPERZOD_API_KEY, HYPERZOD_TENANT_ID, SUPABASE_URL, SUPABASE_SERVICE_KEY');
    process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Fetch orders from Hyperzod API with pagination
 */
async function fetchHyperzodOrders(page = 1) {
    const url = `${HYPERZOD_BASE_URL}/admin/v1/order/list?page=${page}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'X-API-KEY': HYPERZOD_API_KEY,
            'X-TENANT': HYPERZOD_TENANT_ID,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({}), // Empty body for POST request
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`Hyperzod API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
}

/**
 * Transform delivery address
 */
function transformDeliveryAddress(address, userId, tenantId) {
    if (!address) return null;

    return {
        hyperzod_address_id: address._id,
        user_id: userId,
        tenant_id: tenantId,
        address_type: address.address_type || 'home',
        address: address.address,
        building: address.building,
        area: address.area,
        landmark: address.landmark,
        city: address.city,
        region: address.region,
        zip_code: address.zip_code,
        country: address.country,
        country_code: address.country_code || 'IN',
        location_lat: address.location_lat_lon ? address.location_lat_lon[0] : null,
        location_lon: address.location_lat_lon ? address.location_lat_lon[1] : null,
    };
}

/**
 * Transform order from Hyperzod to Supabase schema
 */
function transformOrder(order) {
    return {
        order_id: order.order_id,
        order_uuid: order._id,
        tenant_id: order.tenant_id,
        user_id: order.user_id,
        merchant_id: order.merchant_id,
        order_status: order.order_status,
        order_type: order.order_type,
        order_amount: order.order_amount,
        currency_code: order.currency?.code || 'INR',
        payment_mode_id: order.payment_mode_id,
        payment_mode_name: order.payment_mode?.alias || order.payment_mode?.payment_mode?.alias,
        online_payment_status: order.online_payment_status,
        online_payment_label: order.online_payment_label,
        is_scheduled: order.is_scheduled || false,
        is_user_first_order: order.is_user_first_order || false,
        delivery_timestamp: order.delivery_timestamp_unix,
        created_timestamp: order.created_timestamp_unix,
        hyperzod_updated_at: order.updated_at,
        locale: order.locale || 'en',
        timezone: order.timezone,
        device: order.device,
        ip: order.ip,
        meta: order.meta || null,
        order_note: order.order_note,
        synced_at: new Date().toISOString(),
    };
}

/**
 * Transform order items from cart
 */
function transformOrderItems(orderId, cart) {
    if (!cart || !cart.cart_items) return [];

    return cart.cart_items.map(item => ({
        order_id: orderId,
        merchant_id: item.merchant_id,
        product_id: item.product_id,
        product_name: item.product_name,
        item_image_url: item.item_image_url,
        quantity: item.quantity,
        product_price: item.product_price,
        sub_total_amount: item.sub_total_amount,
        tax_percent: item.tax_percent || 0,
        discount_percent: item.discount_percent || 0,
        tax: item.tax || 0,
        taxable_amount: item.taxable_amount,
        product_options: item.product_options || null,
        product_cost_price: item.product_cost_price,
        sub_total_cost_amount: item.sub_total_cost_amount,
    }));
}

/**
 * Transform order status history
 */
function transformOrderStatusHistory(orderId, statusHistory) {
    if (!statusHistory) return [];

    return statusHistory.map(history => ({
        order_id: orderId,
        order_status: history.order_status,
        timestamp: history.timestamp,
        local_timestamp: history.local_timestamp,
        client_medium: history.client_medium,
        referer: history.referer,
        user_info: history.user || null,
    }));
}

/**
 * Upsert delivery address and return ID
 */
async function upsertDeliveryAddress(address) {
    if (!address || isDryRun) return null;

    const { data, error } = await supabase
        .from('delivery_addresses')
        .upsert(address, {
            onConflict: 'hyperzod_address_id',
            ignoreDuplicates: false,
        })
        .select('id')
        .single();

    if (error) {
        console.error(`   ⚠️  Error upserting delivery address: ${error.message}`);
        return null;
    }

    return data?.id;
}

/**
 * Batch upsert orders to Supabase
 */
async function upsertOrders(orders) {
    if (isDryRun) {
        console.log(`  [DRY RUN] Would upsert ${orders.length} orders`);
        return { success: true, count: orders.length };
    }

    const { data, error } = await supabase
        .from('orders')
        .upsert(orders, {
            onConflict: 'order_id',
            ignoreDuplicates: false,
        });

    if (error) {
        throw error;
    }

    return { success: true, count: orders.length };
}

/**
 * Batch insert order items
 */
async function insertOrderItems(orderItems) {
    if (isDryRun || orderItems.length === 0) return { success: true };

    // Delete existing items first
    const orderIds = [...new Set(orderItems.map(item => item.order_id))];
    await supabase
        .from('order_items')
        .delete()
        .in('order_id', orderIds);

    // Insert new items
    const { error } = await supabase
        .from('order_items')
        .insert(orderItems);

    if (error) {
        throw error;
    }

    return { success: true };
}

/**
 * Batch insert order status history
 */
async function insertOrderStatusHistory(statusHistory) {
    if (isDryRun || statusHistory.length === 0) return { success: true };

    // Delete existing history first
    const orderIds = [...new Set(statusHistory.map(h => h.order_id))];
    await supabase
        .from('order_status_history')
        .delete()
        .in('order_id', orderIds);

    // Insert new history
    const { error } = await supabase
        .from('order_status_history')
        .insert(statusHistory);

    if (error) {
        throw error;
    }

    return { success: true };
}

/**
 * Main sync function
 */
async function syncOrders() {
    console.log('\n🚀 Starting Hyperzod Orders Sync\n');
    console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`);
    console.log(`Limit: ${limit ? `${limit} orders` : 'All orders'}\n`);

    let page = 1;
    let totalProcessed = 0;
    let totalErrors = 0;
    const BATCH_SIZE = 50;

    try {
        while (true) {
            console.log(`📥 Fetching page ${page}...`);

            const response = await fetchHyperzodOrders(page);

            if (!response.success || !response.data || !response.data.data) {
                console.error('❌ Invalid API response');
                break;
            }

            const orders = response.data.data;
            const pagination = response.data;

            console.log(`   Found ${orders.length} orders on this page`);
            console.log(`   Total in system: ${pagination.total}`);
            console.log(`   Page ${pagination.current_page} of ${pagination.last_page}`);

            if (orders.length === 0) {
                break;
            }

            // Process orders in batches
            for (let i = 0; i < orders.length; i += BATCH_SIZE) {
                const batch = orders.slice(i, i + BATCH_SIZE);

                try {
                    // Transform orders
                    const transformedOrders = [];
                    const allOrderItems = [];
                    const allStatusHistory = [];

                    for (const order of batch) {
                        // Handle delivery address
                        let deliveryAddressId = null;
                        if (order.delivery_address) {
                            const addressData = transformDeliveryAddress(
                                order.delivery_address,
                                order.user_id,
                                order.tenant_id
                            );
                            deliveryAddressId = await upsertDeliveryAddress(addressData);
                        }

                        // Transform order
                        const transformedOrder = transformOrder(order);
                        transformedOrder.delivery_address_id = deliveryAddressId;
                        transformedOrders.push(transformedOrder);

                        // Transform order items
                        const orderItems = transformOrderItems(order.order_id, order.cart);
                        allOrderItems.push(...orderItems);

                        // Transform status history
                        const statusHistory = transformOrderStatusHistory(
                            order.order_id,
                            order.order_status_history
                        );
                        allStatusHistory.push(...statusHistory);
                    }

                    // Upsert orders
                    await upsertOrders(transformedOrders);

                    // Insert order items
                    await insertOrderItems(allOrderItems);

                    // Insert status history
                    await insertOrderStatusHistory(allStatusHistory);

                    totalProcessed += batch.length;
                    console.log(`   ✅ Processed ${totalProcessed} / ${pagination.total} orders`);
                } catch (error) {
                    console.error(`   ❌ Error processing batch: ${error.message}`);
                    totalErrors += batch.length;
                }
            }

            // Check if we've reached the limit
            if (limit && totalProcessed >= limit) {
                console.log(`\n⚠️  Reached limit of ${limit} orders`);
                break;
            }

            // Check if there are more pages
            if (!pagination.next_page_url) {
                console.log('\n✅ Reached last page');
                break;
            }

            page++;

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Summary
        console.log('\n' + '='.repeat(50));
        console.log('📊 Sync Summary');
        console.log('='.repeat(50));
        console.log(`Total processed: ${totalProcessed}`);
        console.log(`Total errors: ${totalErrors}`);
        console.log(`Success rate: ${((totalProcessed / (totalProcessed + totalErrors)) * 100).toFixed(2)}%`);

        if (isDryRun) {
            console.log('\n⚠️  This was a DRY RUN - no data was written to the database');
            console.log('Run without --dry-run to actually sync the data');
        } else {
            console.log('\n✅ Sync completed successfully!');
        }

    } catch (error) {
        console.error('\n❌ Fatal error during sync:', error.message);
        process.exit(1);
    }
}

// Run the sync
syncOrders();
