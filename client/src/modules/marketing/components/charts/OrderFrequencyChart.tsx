import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface OrderFrequencyChartProps {
    data: Record<string, number>;
    loading?: boolean;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444'];

export default function OrderFrequencyChart({ data, loading }: OrderFrequencyChartProps) {
    if (loading) {
        return (
            <div className="flex items-center justify-center h-80 bg-white rounded-lg shadow p-6">
                <div className="text-gray-500">Loading chart...</div>
            </div>
        );
    }

    const chartData = Object.entries(data)
        .map(([label, value]) => ({
            name: label === '1' ? '1 Order' : label === '5+' ? '5+ Orders' : `${label} Orders`,
            value,
        }))
        .filter(d => d.value > 0);

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Segment Distribution (By Order Count)</h3>
            <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent = 0 }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                        {chartData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}
