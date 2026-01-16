import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { OrderStatusData } from '../../api/chartData';

interface OrderStatusChartProps {
    data: OrderStatusData[];
    loading?: boolean;
}

export default function OrderStatusChart({ data, loading }: OrderStatusChartProps) {
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
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Status Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <Pie
                        data={data as any}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(props: any) => {
                            const { status, percentage } = props;
                            return `${status}: ${percentage?.toFixed(1)}%`;
                        }}
                        outerRadius={100}
                        innerRadius={60}
                        fill="#8884d8"
                        dataKey="count"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#FFF',
                            border: '1px solid #E5E7EB',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                        formatter={(_value: number | undefined, _name: string | undefined, _props: any) => [
                            `${_props.payload.count} orders (${_props.payload.percentage.toFixed(1)}%)`,
                            _props.payload.status
                        ]}
                    />
                    <Legend
                        verticalAlign="bottom"
                        height={36}
                        formatter={(_value, entry: any) => entry.payload.status}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}
