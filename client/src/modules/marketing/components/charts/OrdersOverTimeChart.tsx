import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { TimeSeriesData } from '../../api/chartData';

interface OrdersOverTimeChartProps {
    data: TimeSeriesData[];
    loading?: boolean;
}

export default function OrdersOverTimeChart({ data, loading }: OrdersOverTimeChartProps) {
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

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Orders Over Time</h3>
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
                    <YAxis stroke="#6B7280" tick={{ fontSize: 12 }} />
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
                    />
                    <Legend
                        wrapperStyle={{ paddingTop: '20px' }}
                        iconType="line"
                    />
                    <Line
                        type="monotone"
                        dataKey="orders"
                        stroke="#3B82F6"
                        strokeWidth={2}
                        name="Total Orders"
                        dot={{ fill: '#3B82F6', r: 4 }}
                        activeDot={{ r: 6 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="completed_orders"
                        stroke="#10B981"
                        strokeWidth={2}
                        name="Completed Orders"
                        dot={{ fill: '#10B981', r: 4 }}
                        activeDot={{ r: 6 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
