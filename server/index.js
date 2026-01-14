import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Hyperzod configuration
const HYPERZOD_API_KEY = process.env.HYPERZOD_API_KEY || '';
const TENANT_ID = process.env.HYPERZOD_TENANT_ID || '3331';
const BASE_URL = process.env.HYPERZOD_BASE_URL || 'https://api.hyperzod.app';

// Get all merchants with pagination
app.get('/api/merchants', async (req, res) => {
    try {
        console.log('📡 Fetching merchants from Hyperzod...');

        let allMerchants = [];
        let currentPage = 1;
        let lastPage = 1;

        do {
            const url = `${BASE_URL}/admin/v1/merchant/list?page=${currentPage}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-TENANT': TENANT_ID,
                    'X-API-KEY': HYPERZOD_API_KEY,
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

        console.log(`✅ Total merchants: ${allMerchants.length}`);

        // Calculate stats
        const stats = {
            total: allMerchants.length,
            published: allMerchants.filter(m => m.status === true || m.status === 1).length,
            unpublished: allMerchants.filter(m => m.status === false || m.status === 0).length,
            online: allMerchants.filter(m => (m.status === true || m.status === 1) && m.is_open === true).length,
        };

        res.json({
            success: true,
            stats,
            merchants: allMerchants.map(m => ({
                id: m._id || m.merchant_id || m.id,
                name: m.name || m.business_name || 'Unknown',
                status: m.status === true || m.status === 1 ? 'published' : 'unpublished',
                isOnline: (m.status === true || m.status === 1) && m.is_open === true,
                city: m.city || 'N/A',
                address: m.address || 'N/A',
                phone: m.phone || m.owner_phone || 'N/A',
                category: m.category_name || 'N/A',
                rating: m.average_rating || 0,
                createdAt: m.created_at || null,
            })),
        });
    } catch (error) {
        console.error('❌ Error fetching merchants:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch merchants',
        });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
