import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { action, id, email, subject, html_content, variables } = await req.json()

        // Initialize Supabase Admin Client
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // SendGrid Config
        const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')
        if (!SENDGRID_API_KEY) {
            throw new Error('SENDGRID_API_KEY is missing in Edge Function secrets')
        }

        // Helper to send via SendGrid REST API (avoiding npm dependency issues in some envs)
        const sendEmail = async ({ to, subject, html, from_name = 'Hyperzod', from_email = 'noreply@hyperzod.com', attachments = [] }: { to: string, subject: string, html: string, from_name?: string, from_email?: string, attachments?: any[] }) => {
            const body: any = {
                personalizations: [{ to: [{ email: to }] }],
                from: { email: from_email, name: from_name },
                subject: subject,
                content: [{ type: 'text/html', value: html }]
            }

            if (attachments && attachments.length > 0) {
                body.attachments = attachments
            }

            const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${SENDGRID_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            })

            if (!response.ok) {
                const error = await response.text()
                throw new Error(`SendGrid Error: ${error}`)
            }
        }

        // --- CASE 1: PREVIEW ---
        if (action === 'preview') {
            const mockData = {
                first_name: 'John',
                last_name: 'Doe',
                email: email,
                city: 'Amsterdam',
                total_orders: 5,
                total_spent: 120.50,
                ...variables
            }

            let renderedHtml = html_content
            Object.keys(mockData).forEach(key => {
                const regex = new RegExp(`{{(?:\\s+)?${key}(?:\\s+)?}}`, 'g')
                renderedHtml = renderedHtml.replace(regex, String(mockData[key]))
            })

            await sendEmail({
                to: email,
                subject: `[Test] ${subject}`,
                html: renderedHtml
            })

            return new Response(JSON.stringify({ success: true, message: 'Preview sent' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        // --- CASE 2: SEND CAMPAIGN ---
        if (id) {
            // Fetch Campaign
            const { data: campaign, error: campaignError } = await supabaseAdmin
                .from('campaigns')
                .select(`*, template:email_templates(*), segment:segments(*)`)
                .eq('id', id)
                .single()

            if (campaignError || !campaign) throw new Error('Campaign not found')

            // Process Attachments
            // Campaign attachments from DB are likely { name, url, type }
            // We need to fetch the content and convert to base64
            const dbAttachments = campaign.attachments || []
            const processedAttachments: any[] = []

            for (const att of dbAttachments) {
                if (att.url) {
                    try {
                        const fileRes = await fetch(att.url)
                        if (fileRes.ok) {
                            const buffer = await fileRes.arrayBuffer()
                            // Fix: Use chunked approach to avoid "Maximum call stack size exceeded"
                            const bytes = new Uint8Array(buffer)
                            let binary = ''
                            const len = bytes.byteLength
                            for (let i = 0; i < len; i++) {
                                binary += String.fromCharCode(bytes[i])
                            }
                            const base64 = btoa(binary)
                            processedAttachments.push({
                                content: base64,
                                filename: att.name,
                                type: att.type || 'application/octet-stream',
                                disposition: 'attachment'
                            })
                        }
                    } catch (err) {
                        console.error(`Failed to process attachment ${att.name}:`, err)
                    }
                }
            }

            // Fetch Clients based on segment type
            let recipients = []

            if (campaign.segment.type === 'static') {
                // For static segments, fetch from segment_members
                const { data: members, error: membersError } = await supabaseAdmin
                    .from('segment_members')
                    .select('client_id, clients(*)')
                    .eq('segment_id', campaign.segment.id)

                if (membersError) throw membersError
                recipients = members?.map((m: any) => m.clients) || []
            } else {
                // For dynamic segments, apply filter rules
                let query = supabaseAdmin.from('clients').select('*')

                if (campaign.segment.filter_rules) {
                    const rules = campaign.segment.filter_rules.rules
                    if (rules && Array.isArray(rules)) {
                        rules.forEach((rule: any) => {
                            const { field, operator, value } = rule
                            if (!value) return

                            switch (operator) {
                                case 'equals': query = query.eq(field, value); break;
                                case 'greater_than': query = query.gt(field, value); break;
                                case 'less_than': query = query.lt(field, value); break;
                                case 'contains': query = query.ilike(field, `%${value}%`); break;
                            }
                        })
                    }
                }

                const { data: clients, error: clientsError } = await query
                if (clientsError) throw clientsError
                recipients = clients || []
            }

            // Update Status
            await supabaseAdmin.from('campaigns').update({
                status: 'sending',
                total_recipients: recipients.length,
                emails_sent: 0
            }).eq('id', id)

            // Send Emails (Limit to 50 for demo/safety to avoid timeout)
            let sentCount = 0
            const errors = []

            // We'll process first 50 immediately. For massive lists, we should use background workers or recursion.
            const batch = recipients.slice(0, 50)

            for (const client of batch) {
                try {
                    let html = campaign.template.html_content
                    let subject = campaign.subject

                    const vars: any = {
                        first_name: client.first_name || '',
                        last_name: client.last_name || '',
                        email: client.email || '',
                        city: client.city || '',
                        total_orders: client.total_orders || 0,
                        total_spent: client.total_spent || 0
                    }

                    Object.keys(vars).forEach(key => {
                        const regex = new RegExp(`{{(?:\\s+)?${key}(?:\\s+)?}}`, 'g')
                        html = html.replace(regex, String(vars[key]))
                        subject = subject.replace(regex, String(vars[key]))
                    })

                    await sendEmail({
                        to: client.email,
                        subject,
                        html,
                        from_name: campaign.from_name,
                        from_email: campaign.from_email,
                        attachments: processedAttachments
                    })
                    sentCount++
                } catch (err) {
                    errors.push({ email: client.email, error: err.message })
                }
            }

            // Update Final Status
            await supabaseAdmin.from('campaigns').update({
                status: 'sent',
                emails_sent: sentCount,
                sent_at: new Date().toISOString()
            }).eq('id', id)

            return new Response(JSON.stringify({
                success: true,
                sent: sentCount,
                total: recipients.length,
                note: recipients.length > 50 ? 'Limited to 50 sends per execution' : undefined
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        throw new Error('Invalid request parameters')

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
