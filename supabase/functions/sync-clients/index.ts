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

        console.log('🚀 Starting incremental clients sync...')

        // Get the last synced client
        const { data: lastClient } = await supabase
            .from('clients')
            .select('created_at')
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        // Fetch clients from last 30 days or since last sync
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        const startDate = lastClient?.created_at
            ? new Date(new Date(lastClient.created_at).getTime() - 24 * 60 * 60 * 1000).toISOString() // 1 day overlap
            : thirtyDaysAgo

        console.log(`📅 Fetching clients since: ${startDate}`)

        let allClients = []
        let currentPage = 1
        const MAX_PAGES = 10

        while (currentPage <= MAX_PAGES) {
            console.log(`📡 Fetching clients page ${currentPage}...`)
            const url = `${HYPERZOD_BASE_URL}/admin/v1/auth/user/all?page=${currentPage}`

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
                // Filter clients created after startDate
                const recentClients = data.data.data.filter(client =>
                    client.created_at && new Date(client.created_at) >= new Date(startDate)
                )

                allClients = allClients.concat(recentClients)
                console.log(`   ✓ Got ${recentClients.length} recent clients (${data.data.data.length} total on page)`)

                // If we got fewer recent clients than total, we've gone back far enough
                if (recentClients.length < data.data.data.length || currentPage >= (data.data.last_page || 1)) {
                    break
                }
            } else {
                break
            }

            currentPage++
        }

        console.log(`✅ Fetched ${allClients.length} clients`)

        if (allClients.length === 0) {
            return new Response(
                JSON.stringify({
                    success: true,
                    count: 0,
                    message: 'No new clients to sync',
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Transform clients
        const transformedClients = allClients.map((client) => ({
            hyperzod_id: client.id,
            tenant_id: client.tenant_id,
            first_name: client.first_name || null,
            last_name: client.last_name || null,
            mobile: client.mobile || null,
            mobile_verified_at: client.mobile_verified_at || null,
            email: client.email || null,
            email_verified_at: client.email_verified_at || null,
            country_code: client.country_code || 'NL',
            is_new_user: client.is_new_user || false,
            status: client.status || 1,
            tenants_limit: client.tenants_limit || 3,
            utm_data: client.utm_data || null,
            referer: client.referer || null,
            import_id: client.import_id || null,
            meta: client.meta || null,
            status_name: client.status_name || 'active',
            hyperzod_created_at: client.created_at || null,
            hyperzod_updated_at: client.updated_at || null,
            hyperzod_deleted_at: client.deleted_at || null,
            synced_at: new Date().toISOString(),
        }))

        // Upsert in batches
        const BATCH_SIZE = 100
        let synced = 0

        for (let i = 0; i < transformedClients.length; i += BATCH_SIZE) {
            const batch = transformedClients.slice(i, i + BATCH_SIZE)
            const { error } = await supabase
                .from('clients')
                .upsert(batch, {
                    onConflict: 'hyperzod_id',
                    ignoreDuplicates: false,
                })

            if (error) throw error

            synced += batch.length
            console.log(`   ✓ Synced ${synced}/${transformedClients.length}`)
        }

        return new Response(
            JSON.stringify({
                success: true,
                count: transformedClients.length,
                message: `Successfully synced ${transformedClients.length} clients`,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        console.error('❌ Error syncing clients:', error)
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
