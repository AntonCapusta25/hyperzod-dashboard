import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface PeakHoursChartProps {
    data: Record<number, number>;
    loading?: boolean;
    hideNumbers?: boolean;
}

export default function PeakHoursChart({ data, loading, hideNumbers = false }: PeakHoursChartProps) {
    if (loading) {
        return (
            <div className="flex items-center justify-center h-80 bg-white rounded-lg shadow p-6">
                <div className="text-gray-500">Loading chart...</div>
            </div>
        );
    }

    const chartData = Array.from({ length: 24 }, (_, i) => ({
        hour: `${i}:00`,
        orders: data[i] || 0,
    }));

    const maxOrders = Math.max(...chartData.map(d => d.orders));

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Orders by Hour of Day</h3>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} margin={{ top: 5, right: hideNumbers ? 5 : 20, left: hideNumbers ? -20 : 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                    <XAxis 
                        dataKey="hour" 
                        stroke="#6B7280" 
                        tick={{ fontSize: 10 }}
                        interval={3}
                    />
                    <YAxis 
                        stroke="#6B7280" 
                        tick={hideNumbers ? false : { fontSize: 12 }} 
                        axisLine={!hideNumbers}
                    />
                    <Tooltip
                        formatter={(value: any) => hideNumbers ? ['Volume', 'Orders'] : [value, 'Orders']}
                        contentStyle={{
                            backgroundColor: '#FFF',
                            border: '1px solid #E5E7EB',
                            borderRadius: '8px',
                        }}
                    />
                    <Bar dataKey="orders" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                            <Cell 
                                key={`cell-${index}`} 
                                fill={entry.orders === maxOrders ? '#3B82F6' : '#93C5FD'} 
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
