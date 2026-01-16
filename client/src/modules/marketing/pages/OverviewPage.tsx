import { useState, useEffect } from 'react';
import { getTimeSeriesData, getOrdersByCity } from '../api/chartData';
import { getWeeklyAnalytics } from '../api/analytics';
import type { TimeSeriesData, CityData } from '../api/chartData';
import OrdersOverTimeChart from '../components/charts/OrdersOverTimeChart';
import RevenueTrendChart from '../components/charts/RevenueTrendChart';
import OrdersByCityChart from '../components/charts/OrdersByCityChart';
import { TrendingUp, TrendingDown, Users, ChefHat, Package, DollarSign } from 'lucide-react';

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
            } catch (error) {
                console.error('Error loading overview data:', error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

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

                {/* Recent Activity Placeholder */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                    <div className="space-y-4">
                        <div className="flex items-center text-sm">
                            <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                            <span className="text-gray-600">New order from Amsterdam</span>
                            <span className="ml-auto text-gray-400">2m ago</span>
                        </div>
                        <div className="flex items-center text-sm">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                            <span className="text-gray-600">New chef registered in Enschede</span>
                            <span className="ml-auto text-gray-400">15m ago</span>
                        </div>
                        <div className="flex items-center text-sm">
                            <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                            <span className="text-gray-600">Email campaign sent to 1,234 clients</span>
                            <span className="ml-auto text-gray-400">1h ago</span>
                        </div>
                        <div className="flex items-center text-sm">
                            <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                            <span className="text-gray-600">Order completed in Utrecht</span>
                            <span className="ml-auto text-gray-400">2h ago</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
