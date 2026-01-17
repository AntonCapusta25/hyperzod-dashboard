import { useState } from 'react';
import { useOrders, useOrderStats } from '../hooks/useOrders';
import { OrderStatus, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '../../../types/orders';
import type { OrderFilters } from '../../../types/orders';

export default function OrdersPage() {
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState<OrderFilters>({});
    const pageSize = 20;

    const { orders, loading, error, totalCount } = useOrders(page, pageSize, filters);
    const { stats, loading: statsLoading } = useOrderStats(filters);

    const totalPages = Math.ceil(totalCount / pageSize);

    // Format currency
    const formatCurrency = (amount: number, currency: string = 'INR') => {
        const symbols: Record<string, string> = {
            INR: '₹',
            USD: '$',
            EUR: '€',
            GBP: '£',
            CLP: 'CL$',
        };
        return `${symbols[currency] || currency} ${amount.toFixed(2)}`;
    };

    // Format timestamp
    const formatDate = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleString();
    };

    return (
        <div className="p-6">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
                    <p className="text-gray-600 mt-1">Manage and track all customer orders</p>
                </div>
                <button
                    onClick={async () => {
                        try {
                            const controller = new AbortController();
                            const timeoutId = setTimeout(() => controller.abort(), 30000);
                            const response = await fetch(
                                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-orders`,
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
                                alert(`✅ Synced ${data.count} orders`);
                                window.location.reload();
                            } else {
                                alert(`❌ Sync failed: ${data.error}`);
                            }
                        } catch (err) {
                            alert(`❌ Error: ${err instanceof Error ? err.message : 'Sync failed'}`);
                        }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                    🔄 Sync from Hyperzod
                </button>
            </div>

            {/* Stats Cards */}
            {!statsLoading && stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-lg shadow">
                        <div className="text-sm text-gray-600">Total Orders</div>
                        <div className="text-2xl font-bold text-gray-900">{stats.total_orders.toLocaleString()}</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow">
                        <div className="text-sm text-gray-600">Total Revenue</div>
                        <div className="text-2xl font-bold text-gray-900">₹{stats.total_revenue.toLocaleString()}</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow">
                        <div className="text-sm text-gray-600">Average Order Value</div>
                        <div className="text-2xl font-bold text-gray-900">₹{stats.average_order_value.toFixed(2)}</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow">
                        <div className="text-sm text-gray-600">Delivered</div>
                        <div className="text-2xl font-bold text-green-600">{stats.orders_by_status.delivered}</div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Status Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            onChange={(e) => {
                                const value = e.target.value;
                                setFilters(prev => ({
                                    ...prev,
                                    order_status: value ? [parseInt(value)] : undefined,
                                }));
                                setPage(1);
                            }}
                        >
                            <option value="">All Statuses</option>
                            <option value="0">Pending</option>
                            <option value="1">Confirmed</option>
                            <option value="2">Preparing</option>
                            <option value="3">Ready</option>
                            <option value="4">Out for Delivery</option>
                            <option value="5">Delivered</option>
                            <option value="6">Cancelled</option>
                        </select>
                    </div>

                    {/* Order Type Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Order Type</label>
                        <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            onChange={(e) => {
                                const value = e.target.value;
                                setFilters(prev => ({
                                    ...prev,
                                    order_type: value ? [value] : undefined,
                                }));
                                setPage(1);
                            }}
                        >
                            <option value="">All Types</option>
                            <option value="delivery">Delivery</option>
                            <option value="pickup">Pickup</option>
                            <option value="custom_1">Custom</option>
                        </select>
                    </div>

                    {/* Search */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                        <input
                            type="text"
                            placeholder="Order ID..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            onChange={(e) => {
                                const value = e.target.value;
                                setFilters(prev => ({
                                    ...prev,
                                    search: value || undefined,
                                }));
                                setPage(1);
                            }}
                        />
                    </div>

                    {/* Clear Filters */}
                    <div className="flex items-end">
                        <button
                            onClick={() => {
                                setFilters({});
                                setPage(1);
                            }}
                            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                        >
                            Clear Filters
                        </button>
                    </div>
                </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading orders...</div>
                ) : error ? (
                    <div className="p-8 text-center text-red-600">{error}</div>
                ) : orders.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No orders found</div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Order ID
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Customer
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Amount
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Type
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Payment
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Created
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {orders.map((order) => (
                                        <tr key={order.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                #{order.order_id}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                User #{order.user_id}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                                {formatCurrency(order.order_amount, order.currency_code)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${ORDER_STATUS_COLORS[order.order_status as OrderStatus]}`}>
                                                    {ORDER_STATUS_LABELS[order.order_status as OrderStatus]}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                                                {order.order_type}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                                                {order.payment_mode_name || 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {formatDate(order.created_timestamp)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                            <div className="flex-1 flex justify-between sm:hidden">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm text-gray-700">
                                        Showing <span className="font-medium">{(page - 1) * pageSize + 1}</span> to{' '}
                                        <span className="font-medium">{Math.min(page * pageSize, totalCount)}</span> of{' '}
                                        <span className="font-medium">{totalCount}</span> results
                                    </p>
                                </div>
                                <div>
                                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                                        <button
                                            onClick={() => setPage(p => Math.max(1, p - 1))}
                                            disabled={page === 1}
                                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                        >
                                            Previous
                                        </button>
                                        <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                                            Page {page} of {totalPages}
                                        </span>
                                        <button
                                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                            disabled={page === totalPages}
                                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                        >
                                            Next
                                        </button>
                                    </nav>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
