import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const HYPERZOD_API_KEY = Deno.env.get('HYPERZOD_API_KEY') || ''
        const HYPERZOD_TENANT_ID = Deno.env.get('HYPERZOD_TENANT_ID') || '3331'
        const HYPERZOD_BASE_URL = Deno.env.get('HYPERZOD_BASE_URL') || 'https://api.hyperzod.app'

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        console.log('🚀 Starting incremental orders sync...')

        // Get the last synced timestamp from Supabase
        const { data: lastOrder } = await supabase
            .from('orders')
            .select('created_timestamp')
            .order('created_timestamp', { ascending: false })
            .limit(1)
            .single()

        // Fetch orders from last 7 days or since last sync
        const sevenDaysAgo = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000)
        const startTimestamp = lastOrder?.created_timestamp
            ? Math.max(lastOrder.created_timestamp - 3600, sevenDaysAgo) // 1 hour overlap to catch updates
            : sevenDaysAgo

        console.log(`📅 Fetching orders since: ${new Date(startTimestamp * 1000).toISOString()}`)

        let allOrders = []
        let currentPage = 1
        const MAX_PAGES = 10 // Limit to prevent infinite loops

        while (currentPage <= MAX_PAGES) {
            console.log(`📡 Fetching orders page ${currentPage}...`)
            const url = `${HYPERZOD_BASE_URL}/admin/v1/order/list?page=${currentPage}&start_date=${startTimestamp}`

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'X-API-KEY': HYPERZOD_API_KEY,
                    'X-TENANT': HYPERZOD_TENANT_ID,
                    'Accept': 'application/json',
                },
            })

            if (!response.ok) {
                throw new Error(`Hyperzod API error: ${response.status}`)
            }

            const data = await response.json()

            if (data.success && data.data && Array.isArray(data.data.data)) {
                const orders = data.data.data
                allOrders = allOrders.concat(orders)
                console.log(`   ✓ Got ${orders.length} orders`)

                if (orders.length === 0 || currentPage >= (data.data.last_page || 1)) {
                    break
                }
            } else {
                break
            }

            currentPage++
        }

        console.log(`✅ Fetched ${allOrders.length} orders`)

        if (allOrders.length === 0) {
            return new Response(
                JSON.stringify({
                    success: true,
                    count: 0,
                    message: 'No new orders to sync',
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Transform orders
        const transformedOrders = allOrders.map((order) => ({
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
        }))

        // Upsert in batches
        const BATCH_SIZE = 100
        let synced = 0

        for (let i = 0; i < transformedOrders.length; i += BATCH_SIZE) {
            const batch = transformedOrders.slice(i, i + BATCH_SIZE)
            const { error } = await supabase
                .from('orders')
                .upsert(batch, {
                    onConflict: 'order_id',
                    ignoreDuplicates: false,
                })

            if (error) throw error

            synced += batch.length
            console.log(`   ✓ Synced ${synced}/${transformedOrders.length}`)
        }

        return new Response(
            JSON.stringify({
                success: true,
                count: transformedOrders.length,
                message: `Successfully synced ${transformedOrders.length} orders`,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        console.error('❌ Error syncing orders:', error)
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
