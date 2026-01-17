import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Get env vars
        const HYPERZOD_API_KEY = Deno.env.get('HYPERZOD_API_KEY') || ''
        const HYPERZOD_TENANT_ID = Deno.env.get('HYPERZOD_TENANT_ID') || '3331'
        const HYPERZOD_BASE_URL = Deno.env.get('HYPERZOD_BASE_URL') || 'https://api.hyperzod.app'

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

        // Create Supabase client with service role
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        console.log('� Starting efficient merchant sync from Hyperzod...')

        // Only fetch first 3 pages to keep it fast (usually ~90 merchants)
        const MAX_PAGES = 3
        let allMerchants = []
        let currentPage = 1

        // Fetch limited pages from Hyperzod
        while (currentPage <= MAX_PAGES) {
            console.log(`📡 Fetching page ${currentPage}/${MAX_PAGES}...`)
            const url = `${HYPERZOD_BASE_URL}/admin/v1/merchant/list?page=${currentPage}`

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'X-API-KEY': HYPERZOD_API_KEY,
                    'X-TENANT': HYPERZOD_TENANT_ID,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
            })

            if (!response.ok) {
                throw new Error(`Hyperzod API error: ${response.status}`)
            }

            const data = await response.json()

            if (data.success && data.data && Array.isArray(data.data.data)) {
                allMerchants = allMerchants.concat(data.data.data)
                console.log(`   ✓ Got ${data.data.data.length} merchants`)

                // Stop if we've reached the last page
                if (currentPage >= (data.data.last_page || 1)) {
                    break
                }
            }

            currentPage++
        }

        console.log(`✅ Fetched ${allMerchants.length} total merchants`)

        // Transform merchants
        const transformedMerchants = allMerchants.map((merchant) => ({
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
        }))

        // Upsert to Supabase in batches of 100
        console.log('💾 Upserting to Supabase...')
        const BATCH_SIZE = 100
        let synced = 0

        for (let i = 0; i < transformedMerchants.length; i += BATCH_SIZE) {
            const batch = transformedMerchants.slice(i, i + BATCH_SIZE)
            const { error } = await supabase
                .from('merchants')
                .upsert(batch, {
                    onConflict: 'hyperzod_merchant_id',
                    ignoreDuplicates: false,
                })

            if (error) {
                throw error
            }

            synced += batch.length
            console.log(`   ✓ Synced ${synced}/${transformedMerchants.length}`)
        }

        console.log(`✅ Successfully synced ${transformedMerchants.length} merchants!`)

        // Count online merchants for response
        const onlineCount = transformedMerchants.filter(m => m.is_accepting_orders && m.is_open).length

        return new Response(
            JSON.stringify({
                success: true,
                count: transformedMerchants.length,
                online: onlineCount,
                message: `Successfully synced ${transformedMerchants.length} merchants (${onlineCount} online)`,
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )
    } catch (error) {
        console.error('❌ Error syncing merchants:', error)
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message,
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            }
        )
    }
})
