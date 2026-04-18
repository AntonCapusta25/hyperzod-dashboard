import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: any) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        console.log('Starting process-automations job...')

        // Initialize Supabase Admin Client
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        const supabaseAdmin = createClient(supabaseUrl, supabaseKey)

        // SendGrid Config
        const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')
        if (!SENDGRID_API_KEY) {
            throw new Error('SENDGRID_API_KEY is missing in Edge Function secrets')
        }

        // Helper to send via SendGrid REST API
        const sendEmail = async ({ to, subject, html, from_name = 'Homemade', from_email = 'Chefs@homemademeals.net' }: { to: string, subject: string, html: string, from_name?: string, from_email?: string }) => {
            const body: any = {
                personalizations: [{ to: [{ email: to }] }],
                from: { email: from_email, name: from_name },
                subject: subject,
                content: [{ type: 'text/html', value: html }]
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

        // 1. Fetch pending enrollments
        // We need: enrollments matching (status='active' and next_execution_at <= now)
        const { data: pendingEnrollments, error: enrollmentsError } = await supabaseAdmin
            .from('automation_enrollments')
            .select(`
                id,
                client_id,
                automation_id,
                current_step_order,
                clients (*),
                automations (name, description)
            `)
            .eq('status', 'active')
            .lte('next_execution_at', new Date().toISOString())
            .limit(50) // process in batches to avoid timeout

        if (enrollmentsError) throw enrollmentsError

        if (!pendingEnrollments || pendingEnrollments.length === 0) {
            console.log('No pending automations to process.')
            return new Response(JSON.stringify({ success: true, message: 'No pending automations' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        console.log(`Processing ${pendingEnrollments.length} enrollments...`)
        let sentCount = 0

        // Process each enrollment
        for (const enrollment of pendingEnrollments) {
            const client = enrollment.clients
            if (!client || !client.email || client.email_unsubscribed) {
                // If no email or unsubscribed, cancel enrollment.
                await supabaseAdmin
                    .from('automation_enrollments')
                    .update({ status: 'cancelled' })
                    .eq('id', enrollment.id)
                continue
            }

            try {
                // Get the current step details (Template, etc)
                const { data: currentStep, error: stepError } = await supabaseAdmin
                    .from('automation_steps')
                    .select('*, email_templates(html_content, subject)')
                    .eq('automation_id', enrollment.automation_id)
                    .eq('step_order', enrollment.current_step_order)
                    .single()

                if (stepError || !currentStep || !currentStep.email_templates) {
                    throw new Error('Current step or template not found')
                }

                const template = currentStep.email_templates
                let html = template.html_content
                let subject = currentStep.subject_override || template.subject

                // Variables Replacement
                const vars: any = {
                    first_name: client.first_name || '',
                    last_name: client.last_name || '',
                    email: client.email || '',
                    city: client.country_code || '', // quick fallback
                }

                Object.keys(vars).forEach(key => {
                    const regex = new RegExp(`{{(?:\\s+)?${key}(?:\\s+)?}}`, 'g')
                    html = html.replace(regex, String(vars[key]))
                    subject = subject.replace(regex, String(vars[key]))
                })

                // Send the email
                await sendEmail({
                    to: client.email,
                    subject,
                    html,
                    from_name: 'Homemade', // can be customized in automation table later
                    from_email: 'Chefs@homemademeals.net'
                })

                sentCount++

                // Figure out next step
                const nextStepOrder = enrollment.current_step_order + 1
                const { data: nextStep, error: nextStepError } = await supabaseAdmin
                    .from('automation_steps')
                    .select('delay_value, delay_unit')
                    .eq('automation_id', enrollment.automation_id)
                    .eq('step_order', nextStepOrder)
                    .single()

                let updatePayload: any = {}

                if (!nextStep || nextStepError) {
                    // No next step -> Complete
                    updatePayload = { status: 'completed' }
                } else {
                    // Calculate next execution time
                    const now = new Date()
                    if (nextStep.delay_unit === 'hours') {
                        now.setHours(now.getHours() + nextStep.delay_value)
                    } else { // days
                        now.setDate(now.getDate() + nextStep.delay_value)
                    }

                    updatePayload = {
                        current_step_order: nextStepOrder,
                        next_execution_at: now.toISOString()
                    }
                }

                await supabaseAdmin
                    .from('automation_enrollments')
                    .update(updatePayload)
                    .eq('id', enrollment.id)

            } catch (err: any) {
                console.error(`Error processing enrollment ${enrollment.id}:`, err.message)
                // We'll leave it pending for now, or you could implement retry limits.
            }
        }

        return new Response(JSON.stringify({ success: true, processed: pendingEnrollments.length, sent: sentCount }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error: any) {
        console.error('Fatal Edge Function Error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
