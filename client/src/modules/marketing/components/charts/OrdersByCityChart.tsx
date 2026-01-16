import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { CityData } from '../../api/chartData';

interface OrdersByCityChartProps {
    data: CityData[];
    loading?: boolean;
    selectedCity?: string;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#14B8A6', '#F97316', '#EC4899', '#6366F1', '#84CC16'];

export default function OrdersByCityChart({ data, loading, selectedCity }: OrdersByCityChartProps) {
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
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Orders by City (Top 10)</h3>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart
                    data={data}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis type="number" stroke="#6B7280" tick={{ fontSize: 12 }} />
                    <YAxis
                        type="category"
                        dataKey="city"
                        stroke="#6B7280"
                        tick={{ fontSize: 12 }}
                        width={90}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#FFF',
                            border: '1px solid #E5E7EB',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                        formatter={(_value: number | undefined, _name: string | undefined, _props: any) => {
                            const value = _value;
                            const name = _name;
                            return [value, name];
                        }}
                    />
                    <Bar dataKey="order_count" radius={[0, 8, 8, 0]}>
                        {data.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={entry.city === selectedCity ? '#EF4444' : COLORS[index % COLORS.length]}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
