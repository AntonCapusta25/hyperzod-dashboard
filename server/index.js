import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_ANON_KEY || ''
);

// Hyperzod configuration
const HYPERZOD_API_KEY = process.env.HYPERZOD_API_KEY || '';
const TENANT_ID = process.env.HYPERZOD_TENANT_ID || '3331';
const BASE_URL = process.env.HYPERZOD_BASE_URL || 'https://api.hyperzod.app';

// Get all merchants with pagination
app.get('/api/merchants', async (req, res) => {
    try {
        const requestTime = new Date().toISOString();
        console.log(`📡 [${requestTime}] Fetching merchants from Hyperzod API...`);

        let allMerchants = [];
        let currentPage = 1;
        let lastPage = 1;

        do {
            const url = `${BASE_URL}/admin/v1/merchant/list?page=${currentPage}&_t=${Date.now()}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-TENANT': TENANT_ID,
                    'X-API-KEY': HYPERZOD_API_KEY,
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                },
            });

            if (!response.ok) {
                const text = await response.text();
                console.error(`❌ Hyperzod API error: ${response.status}`, text.substring(0, 200));
                throw new Error(`Hyperzod API error: ${response.status}`);
            }

            const responseData = await response.json();

            if (responseData.success && responseData.data) {
                lastPage = responseData.data.last_page || 1;
                if (Array.isArray(responseData.data.data)) {
                    allMerchants = allMerchants.concat(responseData.data.data);
                }
            }

            currentPage++;
        } while (currentPage <= lastPage);

        console.log(`✅ Total merchants fetched: ${allMerchants.length}`);

        // Fetch overrides from Supabase
        const { data: overrides, error: overridesError } = await supabase
            .from('merchant_overrides')
            .select('*');

        if (overridesError) {
            console.error('⚠️  Error fetching overrides:', overridesError.message);
        }

        // Create override map for quick lookup
        const overrideMap = new Map();
        if (overrides) {
            overrides.forEach(override => {
                overrideMap.set(override.merchant_id, override);
            });
            console.log(`📝 Loaded ${overrides.length} merchant overrides`);
        }

        // Map merchants and apply overrides
        const mappedMerchants = allMerchants.map(m => {
            const merchantId = String(m._id || m.merchant_id || m.id);
            const override = overrideMap.get(merchantId);

            // Calculate base online status from Hyperzod
            // A merchant is truly "online" if they are published AND accepting orders AND open
            const hyperzodOnline = (m.status === true || m.status === 1) &&
                m.is_accepting_orders === true &&
                m.is_open === true;

            // Apply override if exists
            const finalOnlineStatus = override?.override_online_status !== undefined
                ? override.override_online_status
                : hyperzodOnline;

            return {
                id: merchantId,
                name: m.name || m.business_name || 'Unknown',
                status: m.status === true || m.status === 1 ? 'published' : 'unpublished',
                isOnline: finalOnlineStatus,
                isOverridden: override !== undefined,
                overrideReason: override?.override_reason || null,
                city: m.city || 'N/A',
                address: m.address || 'N/A',
                phone: m.phone || m.owner_phone || 'N/A',
                category: m.category_name || 'N/A',
                rating: m.average_rating || 0,
                createdAt: m.created_at || null,
            };
        });

        // Recalculate stats with overrides applied
        const stats = {
            total: mappedMerchants.length,
            published: mappedMerchants.filter(m => m.status === 'published').length,
            unpublished: mappedMerchants.filter(m => m.status === 'unpublished').length,
            online: mappedMerchants.filter(m => m.isOnline).length,
        };

        // Log specific merchant for debugging
        const rissa = mappedMerchants.find(m => m.name?.toLowerCase().includes('rissa'));
        if (rissa) {
            console.log('🔍 Kitchen of Rissa final status:', {
                name: rissa.name,
                isOnline: rissa.isOnline,
                isOverridden: rissa.isOverridden,
                overrideReason: rissa.overrideReason
            });
        }

        // Set no-cache headers on response
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });

        res.json({
            success: true,
            stats,
            fetchedAt: new Date().toISOString(),
            merchants: mappedMerchants,
        });
    } catch (error) {
        console.error('❌ Error fetching merchants:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch merchants',
        });
    }
});

// Create or update merchant override
app.post('/api/merchant-overrides', async (req, res) => {
    try {
        const { merchantId, merchantName, overrideOnlineStatus, overrideReason } = req.body;

        if (!merchantId) {
            return res.status(400).json({ success: false, error: 'merchantId is required' });
        }

        const { data, error } = await supabase
            .from('merchant_overrides')
            .upsert({
                merchant_id: merchantId,
                merchant_name: merchantName,
                override_online_status: overrideOnlineStatus,
                override_reason: overrideReason,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'merchant_id'
            })
            .select()
            .single();

        if (error) throw error;

        console.log(`✅ Override created/updated for merchant: ${merchantId}`);
        res.json({ success: true, data });
    } catch (error) {
        console.error('❌ Error creating override:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete merchant override
app.delete('/api/merchant-overrides/:merchantId', async (req, res) => {
    try {
        const { merchantId } = req.params;

        const { error } = await supabase
            .from('merchant_overrides')
            .delete()
            .eq('merchant_id', merchantId);

        if (error) throw error;

        console.log(`✅ Override deleted for merchant: ${merchantId}`);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error deleting override:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get all overrides
app.get('/api/merchant-overrides', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('merchant_overrides')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({ success: true, data });
    } catch (error) {
        console.error('❌ Error fetching overrides:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
