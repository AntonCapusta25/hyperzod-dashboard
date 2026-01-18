import { useState, useEffect } from 'react';
import { getTimeSeriesData, getOrdersByCity } from '../api/chartData';
import { getWeeklyAnalytics } from '../api/analytics';
import type { TimeSeriesData, CityData } from '../api/chartData';
import OrdersOverTimeChart from '../components/charts/OrdersOverTimeChart';
import RevenueTrendChart from '../components/charts/RevenueTrendChart';
import OrdersByCityChart from '../components/charts/OrdersByCityChart';
import { TrendingUp, TrendingDown, Users, ChefHat, Package, DollarSign } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface RecentActivity {
    id: string;
    type: 'order' | 'merchant' | 'client';
    message: string;
    timestamp: Date;
    color: string;
}

export default function OverviewPage() {
    const [loading, setLoading] = useState(true);
    const [chartData, setChartData] = useState<{
        timeSeries: TimeSeriesData[];
        cityData: CityData[];
    }>({ timeSeries: [], cityData: [] });
    const [metrics, setMetrics] = useState({
        totalChefs: 0,
        totalOrders: 0,
        totalClients: 0,
        totalRevenue: 0,
    });
    const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                // Get last 30 days data
                const endDate = new Date();
                const startDate = new Date();
                startDate.setDate(startDate.getDate() - 30);

                const [timeSeries, cityData, analytics] = await Promise.all([
                    getTimeSeriesData(startDate, endDate),
                    getOrdersByCity(startDate, endDate),
                    getWeeklyAnalytics({
                        date_from: startDate.toISOString(),
                        date_to: endDate.toISOString(),
                    }),
                ]);

                setChartData({ timeSeries, cityData });

                // Calculate totals
                const totalOrders = timeSeries.reduce((sum, day) => sum + day.completed_orders, 0);
                const totalRevenue = timeSeries.reduce((sum, day) => sum + day.revenue, 0);

                setMetrics({
                    totalChefs: analytics.active_chefs,
                    totalOrders,
                    totalClients: analytics.new_customers,
                    totalRevenue,
                });

                // Fetch recent activity
                await loadRecentActivity();
            } catch (error) {
                console.error('Error loading overview data:', error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    async function loadRecentActivity() {
        try {
            const activities: RecentActivity[] = [];

            // Get recent orders (last 5)
            const { data: recentOrders } = await supabase
                .from('orders')
                .select('order_id, created_timestamp, order_status, delivery_address_id, merchant_id')
                .order('created_timestamp', { ascending: false })
                .limit(5);

            // Get delivery addresses and merchant cities for orders
            if (recentOrders && recentOrders.length > 0) {
                const addressIds = recentOrders
                    .map(o => o.delivery_address_id)
                    .filter(Boolean);

                const merchantIds = recentOrders
                    .map(o => o.merchant_id)
                    .filter(Boolean);

                // Fetch delivery addresses
                const { data: addresses } = await supabase
                    .from('delivery_addresses')
                    .select('id, city')
                    .in('id', addressIds);

                // Fetch merchant cities as fallback
                const { data: merchants } = await supabase
                    .from('merchants')
                    .select('merchant_id, city, name')
                    .in('merchant_id', merchantIds);

                const addressMap = new Map(addresses?.map(a => [a.id, a.city]) || []);
                const merchantMap = new Map(merchants?.map(m => [m.merchant_id, { city: m.city, name: m.name }]) || []);

                recentOrders.forEach(order => {
                    // Try delivery address first, then merchant city
                    let city = addressMap.get(order.delivery_address_id);
                    let merchantName = '';

                    if (order.merchant_id) {
                        const merchantData = merchantMap.get(order.merchant_id);
                        if (!city && merchantData) {
                            city = merchantData.city;
                        }
                        merchantName = merchantData?.name || '';
                    }

                    city = city || 'Unknown';

                    const timestamp = new Date(order.created_timestamp * 1000);
                    const status = order.order_status === 5 ? 'completed' : 'placed';
                    const merchantInfo = merchantName ? ` (${merchantName})` : '';

                    activities.push({
                        id: `order-${order.order_id}`,
                        type: 'order',
                        message: `Order ${status} in ${city}${merchantInfo}`,
                        timestamp,
                        color: order.order_status === 5 ? 'bg-green-500' : 'bg-blue-500',
                    });
                });
            }

            // Get recent merchants (last 5)
            const { data: recentMerchants } = await supabase
                .from('merchants')
                .select('merchant_id, name, city, created_at')
                .order('created_at', { ascending: false })
                .limit(3);

            recentMerchants?.forEach(merchant => {
                activities.push({
                    id: `merchant-${merchant.merchant_id}`,
                    type: 'merchant',
                    message: `New chef "${merchant.name}" in ${merchant.city}`,
                    timestamp: new Date(merchant.created_at),
                    color: 'bg-purple-500',
                });
            });

            // Get recent clients (last 3)
            const { data: recentClients } = await supabase
                .from('clients')
                .select('hyperzod_id, first_name, last_name, hyperzod_created_at')
                .order('hyperzod_created_at', { ascending: false })
                .limit(2);

            recentClients?.forEach(client => {
                const name = `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'New client';
                activities.push({
                    id: `client-${client.hyperzod_id}`,
                    type: 'client',
                    message: `${name} signed up`,
                    timestamp: new Date(client.hyperzod_created_at),
                    color: 'bg-orange-500',
                });
            });

            // Sort by timestamp and take top 10
            activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
            setRecentActivity(activities.slice(0, 10));
        } catch (error) {
            console.error('Error loading recent activity:', error);
        }
    }

    function getTimeAgo(date: Date): string {
        const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

        if (seconds < 60) return `${seconds}s ago`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    }

    const StatCard = ({
        title,
        value,
        icon: Icon,
        trend,
        color
    }: {
        title: string;
        value: string | number;
        icon: React.ComponentType<{ className?: string }>;
        trend?: number;
        color: string;
    }) => (
        <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-600 mb-1">{title}</p>
                    <p className="text-3xl font-bold text-gray-900">{value}</p>
                    {trend !== undefined && (
                        <div className={`flex items-center mt-2 text-sm ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {trend >= 0 ? (
                                <TrendingUp className="w-4 h-4 mr-1" />
                            ) : (
                                <TrendingDown className="w-4 h-4 mr-1" />
                            )}
                            <span>{Math.abs(trend)}% vs last period</span>
                        </div>
                    )}
                </div>
                <div className={`p-3 rounded-full ${color}`}>
                    <Icon className="w-8 h-8 text-white" />
                </div>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-gray-500">Loading overview...</div>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
                <p className="text-gray-600 mt-2">Welcome back! Here's what's happening with your business.</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                    title="Active Chefs"
                    value={metrics.totalChefs}
                    icon={ChefHat}
                    color="bg-blue-500"
                />
                <StatCard
                    title="Total Orders (30d)"
                    value={metrics.totalOrders}
                    icon={Package}
                    color="bg-green-500"
                />
                <StatCard
                    title="New Clients (30d)"
                    value={metrics.totalClients}
                    icon={Users}
                    color="bg-purple-500"
                />
                <StatCard
                    title="Revenue (30d)"
                    value={`€${metrics.totalRevenue.toFixed(2)}`}
                    icon={DollarSign}
                    color="bg-orange-500"
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <OrdersOverTimeChart data={chartData.timeSeries} loading={false} />
                <RevenueTrendChart data={chartData.timeSeries} loading={false} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <OrdersByCityChart data={chartData.cityData} loading={false} />

                {/* Recent Activity - Now with real data */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                    <div className="space-y-4">
                        {recentActivity.length > 0 ? (
                            recentActivity.map(activity => (
                                <div key={activity.id} className="flex items-center text-sm">
                                    <div className={`w-2 h-2 ${activity.color} rounded-full mr-3`}></div>
                                    <span className="text-gray-600 flex-1">{activity.message}</span>
                                    <span className="ml-auto text-gray-400">{getTimeAgo(activity.timestamp)}</span>
                                </div>
                            ))
                        ) : (
                            <div className="text-gray-400 text-center py-4">No recent activity</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
