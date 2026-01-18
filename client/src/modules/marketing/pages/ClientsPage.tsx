import { useState, useEffect } from 'react';
import { useClients } from '../hooks/useClients';
import type { ClientFilters } from '../../../types/marketing';
import { supabase } from '../../../lib/supabase';
import { Crown } from 'lucide-react';

interface VIPClient {
    hyperzod_id: number;
    first_name: string;
    last_name: string;
    email: string;
    mobile: string;
    total_spent: number;
    order_count: number;
}

export default function ClientsPage() {
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState<ClientFilters>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'vip'>('all');
    const [vipClients, setVipClients] = useState<VIPClient[]>([]);
    const [loadingVIP, setLoadingVIP] = useState(false);

    const { data, loading, error } = useClients(page, 50, filters);

    // Load VIP clients when tab is switched
    useEffect(() => {
        if (activeTab === 'vip') {
            loadVIPClients();
        }
    }, [activeTab]);

    async function loadVIPClients() {
        setLoadingVIP(true);
        try {
            // Get top 50 clients by total spending
            const { data: topSpenders, error } = await supabase
                .rpc('get_top_spending_clients', { limit_count: 50 });

            if (error) throw error;
            setVipClients(topSpenders || []);
        } catch (err) {
            console.error('Error loading VIP clients:', err);
        } finally {
            setLoadingVIP(false);
        }
    }

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setFilters({ ...filters, search: searchTerm });
        setPage(1);
    };

    const handleFilterChange = (key: keyof ClientFilters, value: any) => {
        setFilters({ ...filters, [key]: value });
        setPage(1);
    };

    if (error) {
        return (
            <div className="p-8">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h3 className="text-red-800 font-semibold">Error loading clients</h3>
                    <p className="text-red-600 text-sm mt-1">{error.message}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
                    <p className="text-gray-600 mt-2">
                        Manage your customer database and email preferences
                    </p>
                </div>
                <button
                    onClick={async () => {
                        try {
                            const controller = new AbortController();
                            const timeoutId = setTimeout(() => controller.abort(), 30000);
                            const response = await fetch(
                                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-clients`,
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
                            const data = await response.json();
                            if (data.success) {
                                alert(`✅ Synced ${data.count} clients`);
                                window.location.reload();
                            } else {
                                alert(`❌ Sync failed: ${data.error}`);
                            }
                        } catch (err) {
                            alert(`❌ Error: ${err instanceof Error ? err.message : 'Sync failed'}`);
                        }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                    🔄 Sync from Hyperzod
                </button>
            </div>

            {/* Tabs */}
            <div className="mb-6 border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'all'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        All Clients
                    </button>
                    <button
                        onClick={() => setActiveTab('vip')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${activeTab === 'vip'
                            ? 'border-yellow-500 text-yellow-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        <Crown className="w-4 h-4" />
                        VIP Club
                    </button>
                </nav>
            </div>

            {activeTab === 'all' ? (
                <>
                    {/* Search and Filters */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                        <form onSubmit={handleSearch} className="flex gap-4 mb-4">
                            <input
                                type="text"
                                placeholder="Search by name or email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                type="submit"
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Search
                            </button>
                        </form>

                        {/* Filter Options */}
                        <div className="flex gap-4 flex-wrap">
                            <select
                                value={filters.status ?? ''}
                                onChange={(e) => handleFilterChange('status', e.target.value ? parseInt(e.target.value) : undefined)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All Status</option>
                                <option value="1">Active</option>
                                <option value="0">Inactive</option>
                            </select>

                            <select
                                value={filters.email_verified === undefined ? '' : filters.email_verified ? 'true' : 'false'}
                                onChange={(e) => handleFilterChange('email_verified', e.target.value === '' ? undefined : e.target.value === 'true')}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Email Verification</option>
                                <option value="true">Verified</option>
                                <option value="false">Not Verified</option>
                            </select>

                            <select
                                value={filters.email_unsubscribed === undefined ? '' : filters.email_unsubscribed ? 'true' : 'false'}
                                onChange={(e) => handleFilterChange('email_unsubscribed', e.target.value === '' ? undefined : e.target.value === 'true')}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Subscription Status</option>
                                <option value="false">Subscribed</option>
                                <option value="true">Unsubscribed</option>
                            </select>

                            {Object.keys(filters).length > 0 && (
                                <button
                                    onClick={() => {
                                        setFilters({});
                                        setSearchTerm('');
                                    }}
                                    className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                                >
                                    Clear Filters
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Stats */}
                    {data && (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Total Clients</p>
                                    <p className="text-2xl font-bold text-gray-900">{data.total.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Showing</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {data.data.length} of {data.total}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Client Table */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        {loading ? (
                            <div className="p-12 text-center">
                                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                <p className="text-gray-600 mt-4">Loading clients...</p>
                            </div>
                        ) : data && data.data.length > 0 ? (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 border-b border-gray-200">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Name
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Email
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Mobile
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Orders
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Total Spent
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Status
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {data.data.map((client) => (
                                                <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {client.full_name || 'N/A'}
                                                        </div>
                                                        {client.is_email_verified && (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 mt-1">
                                                                ✓ Email Verified
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-900">{client.email || 'N/A'}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-900">{client.mobile || 'N/A'}</div>
                                                        {client.is_mobile_verified && (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 mt-1">
                                                                ✓ Mobile Verified
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {client.total_orders}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        €{client.total_spent.toFixed(2)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {client.email_unsubscribed ? (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                                Unsubscribed
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                                Subscribed
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination */}
                                {data.total_pages > 1 && (
                                    <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                                        <div className="text-sm text-gray-600">
                                            Page {page} of {data.total_pages}
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                                disabled={page === 1}
                                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            >
                                                Previous
                                            </button>
                                            <button
                                                onClick={() => setPage(p => Math.min(data.total_pages, p + 1))}
                                                disabled={page === data.total_pages}
                                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="p-12 text-center">
                                <p className="text-gray-600">No clients found</p>
                                <p className="text-sm text-gray-500 mt-2">Try adjusting your filters</p>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                /* VIP Club Tab */
                <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg shadow-sm border-2 border-yellow-200 overflow-hidden">
                    <div className="p-6 bg-gradient-to-r from-yellow-400 to-orange-400">
                        <div className="flex items-center gap-3">
                            <Crown className="w-8 h-8 text-white" />
                            <div>
                                <h2 className="text-2xl font-bold text-white">VIP Club</h2>
                                <p className="text-yellow-100">Top 50 spending customers</p>
                            </div>
                        </div>
                    </div>

                    {loadingVIP ? (
                        <div className="p-8 text-center text-gray-500">Loading VIP clients...</div>
                    ) : vipClients.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">No VIP clients found</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-yellow-100 border-b border-yellow-200">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-yellow-900 uppercase tracking-wider">
                                            Rank
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-yellow-900 uppercase tracking-wider">
                                            Name
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-yellow-900 uppercase tracking-wider">
                                            Email
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-yellow-900 uppercase tracking-wider">
                                            Mobile
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-yellow-900 uppercase tracking-wider">
                                            Total Spent
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-yellow-900 uppercase tracking-wider">
                                            Orders
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-yellow-100">
                                    {vipClients.map((client, index) => (
                                        <tr key={client.hyperzod_id} className="hover:bg-yellow-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    {index < 3 && (
                                                        <Crown className={`w-5 h-5 mr-2 ${index === 0 ? 'text-yellow-500' :
                                                            index === 1 ? 'text-gray-400' :
                                                                'text-orange-600'
                                                            }`} />
                                                    )}
                                                    <span className="text-sm font-bold text-gray-900">#{index + 1}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {client.first_name} {client.last_name}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">{client.email}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">{client.mobile || '-'}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-bold text-green-600">
                                                    €{client.total_spent.toFixed(2)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                                    {client.order_count} orders
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
