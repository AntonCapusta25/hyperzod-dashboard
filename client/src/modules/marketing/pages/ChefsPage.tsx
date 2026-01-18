import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { StatsCards } from '../../../components/StatsCards';
import { MerchantTable } from '../../../components/MerchantTable';
import { MapView } from '../../../components/MapView';
import { supabase } from '../../../lib/supabase';
import { type MerchantsResponse } from '../../../types';
import { RefreshCw, Trophy, Award } from 'lucide-react';

interface TopChef {
    merchant_id: string;
    name: string;
    city: string;
    total_revenue: number;
    order_count: number;
    avg_order_value: number;
}

export default function ChefsPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const [data, setData] = useState<MerchantsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastSync, setLastSync] = useState<Date | null>(null);
    const [activeTab, setActiveTab] = useState<'list' | 'map' | 'top'>('list');
    const [topChefs, setTopChefs] = useState<TopChef[]>([]);
    const [loadingTop, setLoadingTop] = useState(false);

    // Determine active tab from URL or state
    const activeSubTab = location.pathname.includes('/map') ? 'map' : activeTab;

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

    async function loadTopChefs() {
        setLoadingTop(true);
        try {
            const { data: topPerformers, error } = await supabase
                .rpc('get_top_performing_chefs', { limit_count: 10 });

            if (error) throw error;
            setTopChefs(topPerformers || []);
        } catch (err) {
            console.error('Error loading top chefs:', err);
        } finally {
            setLoadingTop(false);
        }
    }

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (activeTab === 'top') {
            loadTopChefs();
        }
    }, [activeTab]);

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
                                if ((err as any).name === 'AbortError') {
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
                        onClick={() => {
                            setActiveTab('list');
                            navigate('/dashboard/chefs/list');
                        }}
                        className={`${activeSubTab === 'list'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        Chef List
                    </button>
                    <button
                        onClick={() => {
                            setActiveTab('map');
                            navigate('/dashboard/chefs/map');
                        }}
                        className={`${activeSubTab === 'map'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        Map View
                    </button>
                    <button
                        onClick={() => setActiveTab('top')}
                        className={`${activeTab === 'top'
                            ? 'border-yellow-500 text-yellow-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                    >
                        <Trophy className="w-4 h-4" />
                        Top Performers
                    </button>
                </nav>
            </div>

            {
                error ? (
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
                        {activeTab === 'top' && (
                            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg shadow-sm border-2 border-yellow-200 overflow-hidden">
                                <div className="p-6 bg-gradient-to-r from-yellow-400 to-orange-400">
                                    <div className="flex items-center gap-3">
                                        <Trophy className="w-8 h-8 text-white" />
                                        <div>
                                            <h2 className="text-2xl font-bold text-white">Top Performers</h2>
                                            <p className="text-yellow-100">Top 10 chefs by revenue and orders</p>
                                        </div>
                                    </div>
                                </div>

                                {loadingTop ? (
                                    <div className="p-8 text-center text-gray-500">Loading top performers...</div>
                                ) : topChefs.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500">No top performers found</div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-yellow-100 border-b border-yellow-200">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-yellow-900 uppercase tracking-wider">
                                                        Rank
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-yellow-900 uppercase tracking-wider">
                                                        Chef Name
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-yellow-900 uppercase tracking-wider">
                                                        City
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-yellow-900 uppercase tracking-wider">
                                                        Total Revenue
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-yellow-900 uppercase tracking-wider">
                                                        Orders
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-yellow-900 uppercase tracking-wider">
                                                        Avg Order Value
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-yellow-100">
                                                {topChefs.map((chef, index) => (
                                                    <tr key={chef.merchant_id} className="hover:bg-yellow-50">
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex items-center">
                                                                {index < 3 && (
                                                                    <Award className={`w-5 h-5 mr-2 ${index === 0 ? 'text-yellow-500' :
                                                                        index === 1 ? 'text-gray-400' :
                                                                            'text-orange-600'
                                                                        }`} />
                                                                )}
                                                                <span className="text-sm font-bold text-gray-900">#{index + 1}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm font-medium text-gray-900">{chef.name}</div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm text-gray-900">{chef.city}</div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm font-bold text-green-600">
                                                                €{chef.total_revenue.toFixed(2)}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                                                {chef.order_count} orders
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm text-gray-900">
                                                                €{chef.avg_order_value.toFixed(2)}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )
            }
        </div >
    );
}
