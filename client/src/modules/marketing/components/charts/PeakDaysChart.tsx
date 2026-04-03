import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface PeakDaysChartProps {
    data: Record<number, number>;
    loading?: boolean;
    hideNumbers?: boolean;
}

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function PeakDaysChart({ data, loading, hideNumbers = false }: PeakDaysChartProps) {
    if (loading) {
        return (
            <div className="flex items-center justify-center h-80 bg-white rounded-lg shadow p-6">
                <div className="text-gray-500">Loading chart...</div>
            </div>
        );
    }

    // Convert from Record<number, number> to array for Recharts
    // Reorder array so week starts on Monday instead of Sunday
    const rawData = [1, 2, 3, 4, 5, 6, 0].map(dayIndex => ({
        day: dayNames[dayIndex],
        orders: data[dayIndex] || 0,
    }));

    const maxOrders = Math.max(...rawData.map(d => d.orders));

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Orders by Day of Week</h3>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={rawData} margin={{ top: 5, right: hideNumbers ? 5 : 20, left: hideNumbers ? -20 : 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                    <XAxis 
                        dataKey="day" 
                        stroke="#6B7280" 
                        tick={{ fontSize: 12 }}
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
                        {rawData.map((entry, index) => (
                            <Cell 
                                key={`cell-${index}`} 
                                fill={entry.orders === maxOrders ? '#8B5CF6' : '#C4B5FD'} 
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
