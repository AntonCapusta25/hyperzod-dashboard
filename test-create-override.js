/**
 * Test script to create an override for Kitchen of Rissa
 * Run with: node test-create-override.js
 */

const API_URL = 'http://localhost:3001';

async function createRissaOverride() {
    console.log('🧪 Creating Override for Kitchen of Rissa\n');
    console.log('='.repeat(60));

    try {
        // Step 1: Create override to set Rissa as offline
        console.log('📝 Creating override...');
        const overrideResponse = await fetch(`${API_URL}/api/merchant-overrides`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                merchantId: '6774a8e9a2c8a8c9c1e2f3e4', // You'll need to get the actual ID
                merchantName: 'Kitchen of Rissa',
                overrideOnlineStatus: false,
                overrideReason: 'Manually set offline - Hyperzod API showing stale data'
            })
        });

        if (!overrideResponse.ok) {
            throw new Error(`Failed to create override: ${overrideResponse.statusText}`);
        }

        const overrideData = await overrideResponse.json();
        console.log('✅ Override created:', overrideData);

        // Step 2: Fetch merchants to verify override is applied
        console.log('\n📡 Fetching merchants to verify override...');
        const merchantsResponse = await fetch(`${API_URL}/api/merchants`);

        if (!merchantsResponse.ok) {
            throw new Error(`Failed to fetch merchants: ${merchantsResponse.statusText}`);
        }

        const merchantsData = await merchantsResponse.json();

        // Find Rissa
        const rissa = merchantsData.merchants.find(m =>
            m.name.toLowerCase().includes('rissa')
        );

        if (rissa) {
            console.log('\n🔍 Kitchen of Rissa Status After Override:');
            console.log('='.repeat(60));
            console.log(`Name: ${rissa.name}`);
            console.log(`Is Online: ${rissa.isOnline}`);
            console.log(`Is Overridden: ${rissa.isOverridden}`);
            console.log(`Override Reason: ${rissa.overrideReason}`);

            if (rissa.isOnline === false && rissa.isOverridden) {
                console.log('\n✅ SUCCESS! Kitchen of Rissa is now showing as OFFLINE with override applied!');
            } else {
                console.log('\n⚠️  Override may not have been applied correctly');
            }
        } else {
            console.log('\n❌ Kitchen of Rissa not found in merchants list');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// First, let's get Rissa's actual merchant ID
async function getRissaId() {
    console.log('🔍 Finding Kitchen of Rissa ID...\n');

    const response = await fetch(`${API_URL}/api/merchants`);
    const data = await response.json();

    const rissa = data.merchants.find(m => m.name.toLowerCase().includes('rissa'));

    if (rissa) {
        console.log(`Found: ${rissa.name}`);
        console.log(`ID: ${rissa.id}`);
        console.log(`Current Status: ${rissa.isOnline ? 'Online' : 'Offline'}\n`);
        return rissa.id;
    }

    throw new Error('Kitchen of Rissa not found');
}

// Run the test
(async () => {
    const rissaId = await getRissaId();

    // Now create override with the actual ID
    const overrideResponse = await fetch(`${API_URL}/api/merchant-overrides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            merchantId: rissaId,
            merchantName: 'Kitchen of Rissa',
            overrideOnlineStatus: false,
            overrideReason: 'Manually set offline - Hyperzod API showing stale data'
        })
    });

    const result = await overrideResponse.json();
    console.log('✅ Override created:', result);

    // Verify
    console.log('\n📡 Verifying override...');
    const merchantsResponse = await fetch(`${API_URL}/api/merchants`);
    const merchantsData = await merchantsResponse.json();
    const rissa = merchantsData.merchants.find(m => m.id === rissaId);

    console.log('\n🔍 Kitchen of Rissa After Override:');
    console.log('='.repeat(60));
    console.log(`Is Online: ${rissa.isOnline}`);
    console.log(`Is Overridden: ${rissa.isOverridden}`);
    console.log(`Override Reason: ${rissa.overrideReason}`);

    if (!rissa.isOnline && rissa.isOverridden) {
        console.log('\n✅ SUCCESS! Override working correctly!');
    }
})();
