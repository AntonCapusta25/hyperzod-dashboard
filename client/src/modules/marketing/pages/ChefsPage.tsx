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
                    published: merchants?.filter(m => m.status).length || 0,
                    unpublished: merchants?.filter(m => !m.status).length || 0,
                    online: merchants?.filter(m => m.is_accepting_orders).length || 0
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
                <button
                    onClick={loadData}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    {loading ? 'Syncing...' : 'Sync Now'}
                </button>
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
