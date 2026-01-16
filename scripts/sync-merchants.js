import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from scripts directory
dotenv.config({ path: join(__dirname, '.env') });

// Hyperzod API configuration
const HYPERZOD_API_KEY = process.env.HYPERZOD_API_KEY || '';
const HYPERZOD_TENANT_ID = process.env.HYPERZOD_TENANT_ID || '';
const HYPERZOD_BASE_URL = process.env.HYPERZOD_BASE_URL || 'https://api.hyperzod.app';

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Fetch all merchants from Hyperzod API
 */
async function fetchHyperzodMerchants(page = 1) {
    const url = `${HYPERZOD_BASE_URL}/admin/v1/merchant/list?page=${page}`;

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'X-API-KEY': HYPERZOD_API_KEY,
            'X-TENANT': HYPERZOD_TENANT_ID,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Hyperzod API error: ${response.status} ${response.statusText}\n${text}`);
    }

    return await response.json();
}

/**
 * Transform Hyperzod merchant to Supabase merchant format
 */
function transformMerchant(merchant) {
    return {
        hyperzod_merchant_id: merchant._id || merchant.merchant_id || merchant.id,
        tenant_id: merchant.tenant_id,
        merchant_id: merchant.merchant_id,

        // Business info
        name: merchant.name || merchant.business_name,
        slug: merchant.slug,
        email: merchant.email || merchant.owner_email,
        phone: merchant.phone || merchant.owner_phone,
        type: merchant.type,

        // Location
        country: merchant.country,
        country_code: merchant.country_code,
        city: merchant.city,
        state: merchant.state,
        address: merchant.address,
        post_code: merchant.post_code,
        merchant_address_location: merchant.merchant_address_location,
        merchant_location: merchant.merchant_location, // GeoJSON

        // Delivery settings
        delivery_by: merchant.delivery_by,
        delivery_location_type: merchant.delivery_location_type,
        delivery_radius: merchant.delivery_radius,
        delivery_radius_meters: merchant.delivery_radius_meters,
        delivery_radius_unit: merchant.delivery_radius_unit,
        delivery_amount: merchant.delivery_amount,
        min_order_amount: merchant.min_order_amount,
        accepted_order_types: merchant.accepted_order_types,

        // Status
        status: merchant.status === true || merchant.status === 1,
        is_accepting_orders: merchant.is_accepting_orders === true,
        is_open: merchant.is_open === true,
        is_contactable: merchant.is_contactable === true,
        is_pos_managed: merchant.is_pos_managed === true,
        share_customer_details: merchant.share_customer_details === true,

        // Financial
        commission: merchant.commission,
        tax_method: merchant.tax_method,
        currency: merchant.currency,

        // Categories
        merchant_category_ids: merchant.merchant_category_ids || [],
        merchant_categories: merchant.merchant_categories || [],

        // Rating
        average_rating: merchant.average_rating || 0,

        // Images
        images: merchant.images,
        cover_image_url: merchant.images?.cover?.image_url,
        logo_image_url: merchant.images?.logo?.image_url,

        // Settings
        scheduling_setting: merchant.scheduling_setting,
        language_translation: merchant.language_translation,
        language_translate_columns: merchant.language_translate_columns,
        storefront_message: merchant.storefront_message,

        // Timestamps
        hyperzod_created_at: merchant.created_at,
        hyperzod_updated_at: merchant.updated_at,
        synced_at: new Date().toISOString(),
    };
}

/**
 * Sync merchants to Supabase
 */
async function syncMerchants() {
    console.log('🚀 Starting merchants sync...\n');

    try {
        let allMerchants = [];
        let currentPage = 1;
        let lastPage = 1;

        // Fetch all pages
        do {
            console.log(`📡 Fetching page ${currentPage}...`);
            const response = await fetchHyperzodMerchants(currentPage);

            if (response.success && response.data) {
                lastPage = response.data.last_page || 1;
                if (Array.isArray(response.data.data)) {
                    allMerchants = allMerchants.concat(response.data.data);
                    console.log(`   ✓ Got ${response.data.data.length} merchants`);
                }
            }

            currentPage++;
        } while (currentPage <= lastPage);

        console.log(`\n✅ Fetched ${allMerchants.length} total merchants\n`);

        // Debug: Show first merchant structure
        if (allMerchants.length > 0) {
            console.log('📋 Sample merchant object:');
            console.log(JSON.stringify(allMerchants[0], null, 2));
            console.log('\n');
        }

        // Transform and upsert
        console.log('💾 Upserting to Supabase...');
        const transformedMerchants = allMerchants.map(transformMerchant);

        const { data, error } = await supabase
            .from('merchants')
            .upsert(transformedMerchants, {
                onConflict: 'hyperzod_merchant_id',
                ignoreDuplicates: false,
            });

        if (error) {
            throw error;
        }

        console.log(`✅ Successfully synced ${transformedMerchants.length} merchants!`);
        console.log(`\nStats:`);
        console.log(`  - Active: ${transformedMerchants.filter(m => m.status).length}`);
        console.log(`  - Accepting orders: ${transformedMerchants.filter(m => m.is_accepting_orders).length}`);

        const cities = [...new Set(transformedMerchants.map(m => m.city).filter(Boolean))];
        console.log(`  - Cities: ${cities.length} (${cities.slice(0, 5).join(', ')}${cities.length > 5 ? '...' : ''})`);

    } catch (error) {
        console.error('❌ Error syncing merchants:', error);
        throw error;
    }
}

// Run sync
syncMerchants()
    .then(() => {
        console.log('\n✨ Sync complete!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Sync failed:', error);
        process.exit(1);
    });
