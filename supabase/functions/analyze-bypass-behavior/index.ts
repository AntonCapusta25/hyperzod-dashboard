import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Violation {
    type: string;
    chef_id: string;
    chef_name: string;
    user_id: number | null;
    evidence: any;
    event_at: string;
    severity: 'high' | 'medium' | 'low';
}

serve(async (req: any) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        console.log('Starting Phase 2 Security Analysis...')

        // Initialize Supabase Admin Client
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        const supabaseAdmin = createClient(supabaseUrl, supabaseKey)

        // SendGrid Config
        const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')
        if (!SENDGRID_API_KEY) throw new Error('SENDGRID_API_KEY is missing')

        const violations: Violation[] = []

        // ============================================
        // 1. Run All Detection RPCs
        // ============================================
        
        // A. Poached Customers
        const { data: poached } = await supabaseAdmin.rpc('detect_poached_customers')
        poached?.forEach((p: any) => violations.push({
            type: 'POACHED_CUSTOMER',
            chef_id: p.p_merchant_id,
            chef_name: p.p_merchant_name,
            user_id: p.p_user_id,
            event_at: p.last_pair_order,
            severity: 'high',
            evidence: {
                total_orders: p.pair_orders,
                days_since_chef: p.days_since_merchant,
                days_since_platform: p.days_since_platform
            }
        }))

        // B. High Churn Chefs
        const { data: churners } = await supabaseAdmin.rpc('detect_high_churn_chefs')
        churners?.forEach((c: any) => violations.push({
            type: 'HIGH_CHURN_CHEF',
            chef_id: c.p_merchant_id,
            chef_name: c.p_merchant_name,
            user_id: null,
            event_at: c.last_order_at,
            severity: 'medium',
            evidence: {
                total_customers: c.total_customers,
                churn_rate: `${c.churn_rate}%`
            }
        }))

        // C. Contact Leaks
        const { data: leaks } = await supabaseAdmin.rpc('detect_contact_leaks')
        leaks?.forEach((l: any) => violations.push({
            type: 'CONTACT_LEAK',
            chef_id: l.p_merchant_id,
            chef_name: l.p_merchant_name,
            user_id: l.p_user_id,
            event_at: l.event_at,
            severity: 'high',
            evidence: {
                note: l.leaked_note,
                order_id: l.p_order_id
            }
        }))

        // D. AOV Crash (Pivot to Micro-Orders)
        const { data: crashes } = await supabaseAdmin.rpc('detect_aov_crash')
        crashes?.forEach((cr: any) => violations.push({
            type: 'AOV_CRASH',
            chef_id: cr.p_merchant_id,
            chef_name: cr.p_merchant_name,
            user_id: cr.p_user_id,
            event_at: cr.event_at,
            severity: 'medium',
            evidence: {
                previous_avg: cr.prev_avg_amount,
                last_spent: cr.last_order_amount,
                drop: `${cr.drop_percentage}%`
            }
        }))

        // ============================================
        // 1.5 Filter Violations against Security Exceptions
        // ============================================
        const { data: exceptions } = await supabaseAdmin.from('security_exceptions').select('user_id, merchant_id')
        
        const filteredViolations = violations.filter(v => {
            if (!exceptions || exceptions.length === 0) return true;
            
            return !exceptions.some((ex: any) => {
                const userMatch = ex.user_id === v.user_id;
                const merchantMatch = ex.merchant_id === v.chef_id;
                
                // If it's a global user exception
                if (ex.user_id && !ex.merchant_id) return userMatch;
                
                // If it's a global merchant exception
                if (ex.merchant_id && !ex.user_id) return merchantMatch;
                
                // If it's a specific pair exception
                if (ex.user_id && ex.merchant_id) return userMatch && merchantMatch;
                
                return false;
            });
        });

        // ============================================
        // 2. Sorting & Identity Resolution
        // ============================================
        
        // Sort by event date descending (most recent first)
        violations.sort((a, b) => new Date(b.event_at).getTime() - new Date(a.event_at).getTime())

        // Resolve User Details
        const uniqueUserIds = [...new Set(violations.map(v => v.user_id).filter(Boolean))] as number[]
        let userMapping: any = {}
        if (uniqueUserIds.length > 0) {
            const { data: uData } = await supabaseAdmin.from('clients').select('hyperzod_id, full_name, email, mobile').in('hyperzod_id', uniqueUserIds)
            uData?.forEach((u: any) => userMapping[u.hyperzod_id] = u)
        }

        // Resolve Merchant Details (as a secondary failsafe if SQL join missed them)
        const uniqueMerchantIds = [...new Set(violations.filter(v => v.chef_name === v.chef_id).map(v => v.chef_id))]
        if (uniqueMerchantIds.length > 0) {
            const { data: mData } = await supabaseAdmin.from('merchants')
                .select('hyperzod_merchant_id, merchant_id, name')
                .or(`hyperzod_merchant_id.in.(${uniqueMerchantIds.join(',')}),merchant_id.in.(${uniqueMerchantIds.join(',')})`)
            
            mData?.forEach((m: any) => {
                violations.forEach(v => {
                    if (v.chef_id === m.hyperzod_merchant_id || v.chef_id === m.merchant_id) {
                        v.chef_name = m.name;
                    }
                });
            });
        }

        // ============================================
        // 3. Persist to DB (bypass_flags table)
        // ============================================
        for (const v of filteredViolations) {
            await supabaseAdmin.from('bypass_flags').upsert({
                flag_type: v.type.toLowerCase(),
                user_id: v.user_id,
                merchant_id: v.chef_id,
                evidence_data: v.evidence
            }, { onConflict: 'flag_type, merchant_id, user_id' })
        }

        // ============================================
        // 4. Construct Sorted HTML Email
        // ============================================
        if (filteredViolations.length === 0) {
            return new Response(JSON.stringify({ success: true, message: 'Clean. No anomalies.' }), { headers: corsHeaders })
        }

        let html = `
        <div style="font-family: sans-serif; color: #1f2937; max-width: 700px; margin: 0 auto; line-height: 1.5;">
            <div style="background-color: #111827; color: #ffffff; padding: 24px; text-align: center; border-radius: 12px 12px 0 0;">
                <h1 style="margin: 0; font-size: 24px; letter-spacing: -0.025em;">Security Audit Report</h1>
                <p style="margin: 4px 0 0 0; opacity: 0.7; font-size: 14px;">Chronological Platform Integrity Analysis</p>
            </div>
            <div style="padding: 24px; background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                <p style="margin-top: 0;">Hello Admin,</p>
                <p>We've detected <strong>${filteredViolations.length}</strong> suspicious events. They are listed below in order of recency (most recent first).</p>
        `

        for (const v of filteredViolations) {
            const user = v.user_id ? userMapping[v.user_id] : null
            const dateStr = new Date(v.event_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
            const severityColor = v.severity === 'high' ? '#ef4444' : '#f59e0b'
            
            html += `
            <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-left: 6px solid ${severityColor}; padding: 16px; margin-bottom: 16px; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="background: ${severityColor}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; text-transform: uppercase;">${v.type}</span>
                    <span style="font-size: 11px; color: #6b7280;">${dateStr}</span>
                </div>
                <div style="margin-left: 4px;">
                    <div style="font-size: 16px; font-weight: 600; color: #111827; margin-bottom: 4px;">Chef: ${v.chef_name} <span style="font-size: 12px; color: #9ca3af; font-weight: normal;">(ID: ${v.chef_id})</span></div>
                    ${user ? `<div style="font-size: 14px; color: #4b5563;">Customer: <strong>${user.full_name}</strong> <span style="opacity: 0.7;">(${user.mobile || user.email})</span></div>` : ''}
                    
                    <div style="margin-top: 12px; padding: 12px; background: #f3f4f6; border-radius: 6px; font-size: 13px; color: #374151;">
                        <div style="font-weight: 600; text-transform: uppercase; font-size: 10px; color: #6b7280; border-bottom: 1px solid #e5e7eb; margin-bottom: 4px; padding-bottom: 2px;">Behavior Evidence</div>
                        ${Object.entries(v.evidence).map(([key, value]) => `<div><span style="text-transform: capitalize;">${key.replace(/_/g, ' ')}:</span> <strong>${value}</strong></div>`).join('')}
                    </div>
                </div>
            </div>`
        }

        html += `
                <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af;">
                    This report was generated automatically. To adjust detection sensitivity, contact technical support.
                </div>
            </div>
        </div>
        `

        // Send Email via SendGrid
        const SENDGRID_BODY = {
            personalizations: [{ to: [{ email: 'bangalexf@gmail.com' }, { email: 'mahmoudelwakil22@gmail.com' }] }],
            from: { email: 'Chefs@homemademeals.net', name: 'Homemade Security' },
            subject: `🚨 [ALERT] ${violations.length} Security Violations Detected`,
            content: [{ type: 'text/html', value: html }]
        }

        await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${SENDGRID_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(SENDGRID_BODY)
        })

        return new Response(JSON.stringify({ success: true, count: filteredViolations.length }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
        })
    }
})
