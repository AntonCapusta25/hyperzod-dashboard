import { supabase } from '../lib/supabase';

const HYPERZOD_API_KEY = import.meta.env.VITE_HYPERZOD_API_KEY || '';
const HYPERZOD_TENANT_ID = import.meta.env.VITE_HYPERZOD_TENANT_ID || '3331';
const HYPERZOD_BASE_URL = import.meta.env.VITE_HYPERZOD_BASE_URL || 'https://api.hyperzod.app';

interface HyperzodMerchant {
    _id?: string;
    merchant_id?: string;
    id?: string;
    tenant_id?: number;
    name?: string;
    business_name?: string;
    slug?: string;
    email?: string;
    owner_email?: string;
    phone?: string;
    owner_phone?: string;
    type?: string;
    country?: string;
    country_code?: string;
    city?: string;
    state?: string;
    address?: string;
    post_code?: string;
    merchant_address_location?: number[];
    merchant_location?: any;
    delivery_by?: string;
    delivery_location_type?: string;
    delivery_radius?: number;
    delivery_radius_meters?: number;
    delivery_radius_unit?: string;
    delivery_amount?: number;
    min_order_amount?: number;
    accepted_order_types?: string[];
    status?: boolean | number;
    is_accepting_orders?: boolean;
    is_open?: boolean;
    is_contactable?: boolean;
    is_pos_managed?: boolean;
    share_customer_details?: boolean;
    commission?: number;
    tax_method?: string;
    currency?: string;
    merchant_category_ids?: string[];
    merchant_categories?: any[];
    average_rating?: number;
    images?: any;
    scheduling_setting?: any;
    language_translation?: any[];
    language_translate_columns?: string[];
    storefront_message?: string;
    created_at?: string;
    updated_at?: string;
}

/**
 * Fetch merchants from Hyperzod API
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
        throw new Error(`Hyperzod API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
}

/**
 * Transform Hyperzod merchant to Supabase format
 */
function transformMerchant(merchant: HyperzodMerchant) {
    return {
        hyperzod_merchant_id: merchant._id || merchant.merchant_id || merchant.id,
        tenant_id: merchant.tenant_id,
        merchant_id: merchant.merchant_id,
        name: merchant.name || merchant.business_name,
        slug: merchant.slug,
        email: merchant.email || merchant.owner_email,
        phone: merchant.phone || merchant.owner_phone,
        type: merchant.type,
        country: merchant.country,
        country_code: merchant.country_code,
        city: merchant.city,
        state: merchant.state,
        address: merchant.address,
        post_code: merchant.post_code,
        merchant_address_location: merchant.merchant_address_location,
        merchant_location: merchant.merchant_location,
        delivery_by: merchant.delivery_by,
        delivery_location_type: merchant.delivery_location_type,
        delivery_radius: merchant.delivery_radius,
        delivery_radius_meters: merchant.delivery_radius_meters,
        delivery_radius_unit: merchant.delivery_radius_unit,
        delivery_amount: merchant.delivery_amount,
        min_order_amount: merchant.min_order_amount,
        accepted_order_types: merchant.accepted_order_types,
        status: merchant.status === true || merchant.status === 1,
        is_accepting_orders: merchant.is_accepting_orders === true,
        is_open: merchant.is_open === true,
        is_contactable: merchant.is_contactable === true,
        is_pos_managed: merchant.is_pos_managed === true,
        share_customer_details: merchant.share_customer_details === true,
        commission: merchant.commission,
        tax_method: merchant.tax_method,
        currency: merchant.currency,
        merchant_category_ids: merchant.merchant_category_ids || [],
        merchant_categories: merchant.merchant_categories || [],
        average_rating: merchant.average_rating || 0,
        images: merchant.images,
        cover_image_url: merchant.images?.cover?.image_url,
        logo_image_url: merchant.images?.logo?.image_url,
        scheduling_setting: merchant.scheduling_setting,
        language_translation: merchant.language_translation,
        language_translate_columns: merchant.language_translate_columns,
        storefront_message: merchant.storefront_message,
        hyperzod_created_at: merchant.created_at,
        hyperzod_updated_at: merchant.updated_at,
        synced_at: new Date().toISOString(),
    };
}

/**
 * Sync merchants from Hyperzod to Supabase (client-side)
 */
export async function syncMerchantsFromClient(
    onProgress?: (message: string) => void
): Promise<{ success: boolean; count: number; error?: string }> {
    try {
        onProgress?.('🚀 Starting merchant sync from Hyperzod...');

        let allMerchants: HyperzodMerchant[] = [];
        let currentPage = 1;
        let lastPage = 1;

        // Fetch all pages
        do {
            onProgress?.(`📡 Fetching page ${currentPage}...`);
            const response = await fetchHyperzodMerchants(currentPage);

            if (response.success && response.data) {
                lastPage = response.data.last_page || 1;
                if (Array.isArray(response.data.data)) {
                    allMerchants = allMerchants.concat(response.data.data);
                    onProgress?.(`   ✓ Got ${response.data.data.length} merchants`);
                }
            }

            currentPage++;
        } while (currentPage <= lastPage);

        onProgress?.(`✅ Fetched ${allMerchants.length} total merchants`);

        // Transform merchants
        const transformedMerchants = allMerchants.map(transformMerchant);

        // Upsert to Supabase
        onProgress?.('💾 Saving to database...');
        const { error } = await supabase
            .from('merchants')
            .upsert(transformedMerchants, {
                onConflict: 'hyperzod_merchant_id',
                ignoreDuplicates: false,
            });

        if (error) {
            throw error;
        }

        onProgress?.(`✅ Successfully synced ${transformedMerchants.length} merchants!`);

        return {
            success: true,
            count: transformedMerchants.length,
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        onProgress?.(`❌ Error: ${errorMessage}`);
        return {
            success: false,
            count: 0,
            error: errorMessage,
        };
    }
}
