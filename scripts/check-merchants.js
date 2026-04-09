import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from scripts directory
dotenv.config({ path: join(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkMerchantData() {
    console.log('🔍 Checking merchant data...');

    const { data: merchants, error } = await supabase
        .from('merchants')
        .select('name, city, country, country_code, merchant_categories, cover_image_url, logo_image_url, average_rating, storefront_message')
        .eq('status', true)
        .limit(20);

    if (error) {
        console.error('Error fetching merchants:', error);
        return;
    }

    if (!merchants || merchants.length === 0) {
        console.log('No merchants found.');
        return;
    }

    console.log(`Found ${merchants.length} merchants. Sample data:`);
    merchants.forEach((m, i) => {
        console.log(`\n--- Merchant ${i + 1}: ${m.name} ---`);
        console.log(`City: ${m.city}`);
        console.log(`Country: ${m.country} (${m.country_code})`);
        console.log(`Rating: ${m.average_rating}`);
        console.log(`Categories: ${JSON.stringify(m.merchant_categories)}`);
        console.log(`Logo: ${m.logo_image_url}`);
        console.log(`Cover: ${m.cover_image_url}`);
        console.log(`Message: ${m.storefront_message?.substring(0, 100)}...`);
    });
}

checkMerchantData().catch(console.error);
