import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { StatsCards } from '../../../components/StatsCards';
import { MerchantTable } from '../../../components/MerchantTable';
import { MapView } from '../../../components/MapView';
import { supabase } from '../../../lib/supabase';
import type { MerchantsResponse } from '../../../types';
import { RefreshCw } from 'lucide-react';

export default function ChefsPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const [data, setData] = useState<MerchantsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastSync, setLastSync] = useState<Date | null>(null);

    // Determine active tab from URL
    const activeSubTab = location.pathname.includes('/map') ? 'map' : 'list';

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch merchants from Supabase
            const { data: merchants, error: fetchError } = await supabase
                .from('merchants')
                .select('*')
                .order('name', { ascending: true });

            if (fetchError) throw fetchError;

            setData({
                success: true,
                merchants: merchants || [],
                stats: {
                    total: merchants?.length || 0,
                    published: merchants?.filter(m => m.status === true).length || 0,
                    unpublished: merchants?.filter(m => m.status === false || !m.status).length || 0,
                    online: merchants?.filter(m => m.status === true && m.is_accepting_orders && m.is_open).length || 0
                }
            });
            setLastSync(new Date());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load data');
            console.error('Error loading merchants:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Chefs Management</h1>
                    <p className="text-gray-600 mt-2">
                        Live data from Hyperzod API
                        {lastSync && (
                            <span className="text-sm text-gray-500 ml-2">
                                • Last synced: {lastSync.toLocaleTimeString()}
                            </span>
                        )}
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={async () => {
                            try {
                                setLoading(true);
                                setError(null);

                                console.log('🚀 Calling sync function...');

                                // Use custom fetch with longer timeout (30s) instead of Supabase client
                                const controller = new AbortController();
                                const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

                                const response = await fetch(
                                    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-merchants`,
                                    {
                                        method: 'POST',
                                        headers: {
                                            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                                            'Content-Type': 'application/json',
                                        },
                                        signal: controller.signal,
                                    }
                                );

                                clearTimeout(timeoutId);

                                if (!response.ok) {
                                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                                }

                                const data = await response.json();

                                if (!data?.success) throw new Error(data?.error || 'Sync failed');

                                console.log(`✅ Synced ${data.count} merchants (${data.online} online)`);

                                // Reload data after sync
                                await loadData();
                            } catch (err) {
                                console.error('Sync error:', err);
                                if (err.name === 'AbortError') {
                                    setError('Sync timed out after 30 seconds. Please try again.');
                                } else {
                                    setError(err instanceof Error ? err.message : 'Failed to sync merchants from Hyperzod');
                                }
                            }
                        }}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        {loading ? 'Syncing from Hyperzod...' : 'Sync from Hyperzod'}
                    </button>
                    <button
                        onClick={loadData}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        {loading ? 'Refreshing...' : 'Refresh View'}
                    </button>
                </div>
            </div>

            {/* Sub-tabs */}
            <div className="mb-6 border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => navigate('/dashboard/chefs/list')}
                        className={`${activeSubTab === 'list'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        Chef List
                    </button>
                    <button
                        onClick={() => navigate('/dashboard/chefs/map')}
                        className={`${activeSubTab === 'map'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        Map View
                    </button>
                </nav>
            </div>

            {error ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                    <p className="text-red-800 font-medium mb-2">Error loading data</p>
                    <p className="text-red-600 text-sm mb-4">{error}</p>
                    <button
                        onClick={loadData}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            ) : (
                <>
                    {activeSubTab === 'list' && (
                        <>
                            <StatsCards
                                stats={data?.stats || { total: 0, published: 0, unpublished: 0, online: 0 }}
                                loading={loading}
                            />
                            <MerchantTable
                                merchants={data?.merchants || []}
                                loading={loading}
                                onRefresh={loadData}
                            />
                        </>
                    )}
                    {activeSubTab === 'map' && (
                        <MapView
                            merchants={data?.merchants || []}
                            loading={loading}
                        />
                    )}
                </>
            )}
        </div>
    );
}
