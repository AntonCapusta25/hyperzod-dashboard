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

// Initialize Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Fetch customers from Hyperzod API with pagination
 */
async function fetchHyperzodCustomers(page = 1) {
    const url = `${HYPERZOD_BASE_URL}/admin/v1/auth/user/all?page=${page}`;

    const response = await fetch(url, {
        headers: {
            'X-API-KEY': HYPERZOD_API_KEY,
            'X-TENANT': HYPERZOD_TENANT_ID,
        },
    });

    if (!response.ok) {
        throw new Error(`Hyperzod API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
}

/**
 * Transform Hyperzod customer to Supabase schema
 */
function transformCustomer(customer) {
    return {
        hyperzod_id: customer.id,
        tenant_id: customer.tenant_id,
        first_name: customer.first_name || null,
        last_name: customer.last_name || null,
        mobile: customer.mobile || null,
        mobile_verified_at: customer.mobile_verified_at || null,
        email: customer.email || null,
        email_verified_at: customer.email_verified_at || null,
        country_code: customer.country_code || 'NL',
        is_new_user: customer.is_new_user || false,
        status: customer.status || 1,
        tenants_limit: customer.tenants_limit || 3,
        utm_data: customer.utm_data || null,
        referer: customer.referer || null,
        import_id: customer.import_id || null,
        meta: customer.meta || null,
        status_name: customer.status_name || 'active',
        hyperzod_created_at: customer.created_at || null,
        hyperzod_updated_at: customer.updated_at || null,
        hyperzod_deleted_at: customer.deleted_at || null,
        synced_at: new Date().toISOString(),
    };
}

/**
 * Batch upsert customers to Supabase
 */
async function upsertCustomers(customers) {
    if (isDryRun) {
        console.log(`  [DRY RUN] Would upsert ${customers.length} customers`);
        return { success: true, count: customers.length };
    }

    const { data, error } = await supabase
        .from('clients')
        .upsert(customers, {
            onConflict: 'hyperzod_id',
            ignoreDuplicates: false,
        });

    if (error) {
        throw error;
    }

    return { success: true, count: customers.length };
}

/**
 * Main sync function
 */
async function syncCustomers() {
    console.log('\n🚀 Starting Hyperzod Customer Sync\n');
    console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`);
    console.log(`Limit: ${limit ? `${limit} customers` : 'All customers'}\n`);

    let page = 1;
    let totalProcessed = 0;
    let totalErrors = 0;
    const BATCH_SIZE = 100;

    try {
        while (true) {
            console.log(`📥 Fetching page ${page}...`);

            const response = await fetchHyperzodCustomers(page);

            if (!response.success || !response.data || !response.data.data) {
                console.error('❌ Invalid API response');
                break;
            }

            const customers = response.data.data;
            const pagination = response.data;

            console.log(`   Found ${customers.length} customers on this page`);
            console.log(`   Total in system: ${pagination.total}`);
            console.log(`   Page ${pagination.current_page} of ${pagination.last_page}`);

            if (customers.length === 0) {
                break;
            }

            // Transform customers
            const transformedCustomers = customers.map(transformCustomer);

            // Batch upsert
            for (let i = 0; i < transformedCustomers.length; i += BATCH_SIZE) {
                const batch = transformedCustomers.slice(i, i + BATCH_SIZE);

                try {
                    await upsertCustomers(batch);
                    totalProcessed += batch.length;
                    console.log(`   ✅ Processed ${totalProcessed} / ${pagination.total} customers`);
                } catch (error) {
                    console.error(`   ❌ Error upserting batch: ${error.message}`);
                    totalErrors += batch.length;
                }
            }

            // Check if we've reached the limit
            if (limit && totalProcessed >= limit) {
                console.log(`\n⚠️  Reached limit of ${limit} customers`);
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
syncCustomers();
