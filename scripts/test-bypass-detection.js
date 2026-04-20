const URL = 'https://oyeqtiovqtkwduzkvomr.supabase.co/functions/v1/analyze-bypass-behavior';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95ZXF0aW92cXRrd2R1emt2b21yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMTkyNzIsImV4cCI6MjA4Mzg5NTI3Mn0.4Zg0uepRg_rJC_hfojG2-NkJ5Xf_RiugZ6_By2r-Noc';

async function test() {
    console.log('Invoking Edge Function: analyze-bypass-behavior...');
    try {
        const result = await fetch(URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });
        
        if (result.ok) {
            const json = await result.json();
            console.log('============================');
            console.log('✅ Edge Function Success!');
            console.log(json);
            console.log('============================');
            if (json.poached_count > 0 || json.churn_count > 0) {
                console.log('An alert email should have been sent to bangalexf@gmail.com and mahmoudelwakil22@gmail.com!');
            }
        } else {
            const text = await result.text();
            console.error('❌ Failed:', result.status, text);
            if (result.status === 404) {
                 console.log('\nMake sure you deployed the function using: npx supabase functions deploy analyze-bypass-behavior');
            }
        }
    } catch(e) {
        console.error('Error invoking function:', e.message);
    }
}

test();
