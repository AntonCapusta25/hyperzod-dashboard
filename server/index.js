import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success && data.data && data.data.data) {
                allMerchants = allMerchants.concat(data.data.data);
                lastPage = data.data.last_page;
                currentPage++;
            } else {
                break;
            }
        } while (currentPage <= lastPage);

        console.log(`✅ Successfully fetched ${allMerchants.length} merchants`);
        res.json({ success: true, data: allMerchants });
    } catch (error) {
        console.error('❌ Error fetching merchants:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Sync orders endpoint
app.post('/api/sync-orders', async (req, res) => {
    try {
        console.log('🚀 Starting order sync...');

        // Run the sync script
        const { stdout, stderr } = await execAsync('node scripts/sync-orders.js', {
            cwd: process.cwd(),
            env: { ...process.env }
        });

        console.log('Sync output:', stdout);
        if (stderr) console.error('Sync errors:', stderr);

        res.json({
            success: true,
            message: 'Order sync completed successfully',
            output: stdout
        });
    } catch (error) {
        console.error('❌ Error syncing orders:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            output: error.stdout,
            stderr: error.stderr
        });
    }
});

// Merchant overrides endpoint
app.post('/api/merchant-overrides', async (req, res) => {
    try {
        const { merchantId, status } = req.body;

        if (!merchantId || status === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Missing merchantId or status'
            });
        }

        // Upsert the override
        const { data, error } = await supabase
            .from('merchant_overrides')
            .upsert({
                merchant_id: merchantId,
                is_accepting_orders: status,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'merchant_id'
            })
            .select()
            .single();

        if (error) {
            throw error;
        }

        res.json({ success: true, data });
    } catch (error) {
        console.error('Error creating override:', error);
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

        if (error) {
            throw error;
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting override:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get all merchant overrides
app.get('/api/merchant-overrides', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('merchant_overrides')
            .select('*');

        if (error) {
            throw error;
        }

        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching overrides:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
