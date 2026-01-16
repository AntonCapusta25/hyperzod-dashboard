import { useState } from 'react';
import { useClients } from '../hooks/useClients';
import type { ClientFilters } from '../../../types/marketing';

export default function ClientsPage() {
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState<ClientFilters>({});
    const [searchTerm, setSearchTerm] = useState('');

    const { data, loading, error } = useClients(page, 50, filters);


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
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
                <p className="text-gray-600 mt-2">
                    Manage your customer database and email preferences
                </p>
            </div>

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
        </div>
    );
}
