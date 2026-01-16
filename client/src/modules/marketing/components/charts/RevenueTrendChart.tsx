import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { TimeSeriesData } from '../../api/chartData';

interface RevenueTrendChartProps {
    data: TimeSeriesData[];
    loading?: boolean;
}

export default function RevenueTrendChart({ data, loading }: RevenueTrendChartProps) {
    if (loading) {
        return (
            <div className="flex items-center justify-center h-80 bg-white rounded-lg shadow p-6">
                <div className="text-gray-500">Loading chart...</div>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-80 bg-white rounded-lg shadow p-6">
                <div className="text-gray-500">No data available</div>
            </div>
        );
    }

    // Calculate cumulative revenue
    const cumulativeData = data.reduce((acc, curr, index) => {
        const prevRevenue = index > 0 ? acc[index - 1].cumulative_revenue : 0;
        acc.push({
            ...curr,
            cumulative_revenue: prevRevenue + curr.revenue,
        });
        return acc;
    }, [] as (TimeSeriesData & { cumulative_revenue: number })[]);

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={cumulativeData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                        dataKey="date"
                        stroke="#6B7280"
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => {
                            const date = new Date(value);
                            return `${date.getMonth() + 1}/${date.getDate()}`;
                        }}
                    />
                    <YAxis
                        stroke="#6B7280"
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => `€${(value / 1000).toFixed(1)}k`}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#FFF',
                            border: '1px solid #E5E7EB',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                        labelFormatter={(value) => {
                            const date = new Date(value);
                            return date.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                            });
                        }}
                        formatter={(value: number | undefined) => value !== undefined ? [`€${value.toFixed(2)}`, 'Cumulative Revenue'] : ['€0.00', 'Cumulative Revenue']}
                    />
                    <Area
                        type="monotone"
                        dataKey="cumulative_revenue"
                        stroke="#3B82F6"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorRevenue)"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
