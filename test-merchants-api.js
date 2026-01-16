/**
 * Direct test of the merchants API endpoint
 * Run with: node test-merchants-api.js
 */

const API_URL = 'http://localhost:3001/api/merchants';

async function testMerchantsAPI() {
    console.log('🧪 Testing Merchants API Endpoint\n');
    console.log('='.repeat(60));
    console.log(`📡 Calling: ${API_URL}\n`);

    try {
        const response = await fetch(API_URL, {
            headers: {
                'Cache-Control': 'no-cache'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        console.log('✅ Response received');
        console.log(`📊 Stats:`, data.stats);
        console.log(`⏰ Fetched at: ${data.fetchedAt}\n`);

        // Find Kitchen of Rissa
        const rissa = data.merchants.find(m =>
            m.name.toLowerCase().includes('rissa')
        );

        if (rissa) {
            console.log('🔍 Kitchen of Rissa Details:');
            console.log('='.repeat(60));
            console.log(`Name: ${rissa.name}`);
            console.log(`Status: ${rissa.status}`);
            console.log(`Is Online: ${rissa.isOnline}`);
            console.log(`City: ${rissa.city}`);
            console.log(`Category: ${rissa.category}`);
            console.log(`Rating: ${rissa.rating}`);
            console.log('\n✅ Kitchen of Rissa found in response');
        } else {
            console.log('❌ Kitchen of Rissa NOT found in merchants list');
        }

        console.log(`\n📦 Total merchants in response: ${data.merchants.length}`);

        // Show online merchants
        const onlineMerchants = data.merchants.filter(m => m.isOnline);
        console.log(`🟢 Online merchants: ${onlineMerchants.length}`);
        console.log('\nOnline merchants list:');
        onlineMerchants.forEach(m => {
            console.log(`  - ${m.name} (${m.city})`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

testMerchantsAPI();
