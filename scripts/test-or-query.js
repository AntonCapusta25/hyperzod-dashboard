import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function testOrQuery() {
    const city = 'Enschede';

    console.log('Testing different query syntaxes:\n');

    // Test 1: Using .or()
    const { data: test1, error: error1 } = await supabase
        .from('delivery_addresses')
        .select('id')
        .or(`city.ilike.%${city}%,address.ilike.%${city}%`);

    console.log(`Test 1 - .or() syntax: ${test1?.length || 0} results`);
    if (error1) console.log('Error:', error1);

    // Test 2: Using .ilike() directly
    const { data: test2 } = await supabase
        .from('delivery_addresses')
        .select('id')
        .ilike('city', `%${city}%`);

    console.log(`Test 2 - .ilike('city') only: ${test2?.length || 0} results`);

    // Test 3: Exact match
    const { data: test3 } = await supabase
        .from('delivery_addresses')
        .select('id')
        .eq('city', city);

    console.log(`Test 3 - .eq('city'): ${test3?.length || 0} results`);
}

testOrQuery().catch(console.error);
