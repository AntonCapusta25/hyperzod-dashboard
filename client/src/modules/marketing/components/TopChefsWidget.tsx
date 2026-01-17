import { useState, useEffect } from 'react';
import { getTopChefs, type TopChef } from '../api/topChefs';
import { TrendingUp, Award, Euro } from 'lucide-react';

interface TopChefsProps {
    startDate: Date;
    endDate: Date;
    city?: string;
}

export default function TopChefsWidget({ startDate, endDate, city }: TopChefsProps) {
    const [topChefs, setTopChefs] = useState<TopChef[]>([]);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState<'revenue' | 'orders'>('revenue');

    useEffect(() => {
        async function loadTopChefs() {
            setLoading(true);
            try {
                const startTs = Math.floor(startDate.getTime() / 1000);
                const endTs = Math.floor(endDate.getTime() / 1000);
                const chefs = await getTopChefs(startTs, endTs, city, 10);
                setTopChefs(chefs);
            } catch (error) {
                console.error('Error loading top chefs:', error);
            } finally {
                setLoading(false);
            }
        }

        loadTopChefs();
    }, [startDate, endDate, city]);

    const sortedChefs = [...topChefs].sort((a, b) => {
        if (sortBy === 'revenue') {
            return b.total_revenue - a.total_revenue;
        } else {
            return b.completed_orders - a.completed_orders;
        }
    });

    if (loading) {
        return (
            <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">Top Performing Chefs</h3>
                <div className="animate-pulse space-y-3">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-16 bg-gray-200 rounded"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (topChefs.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">Top Performing Chefs</h3>
                <p className="text-gray-500 text-center py-8">No data available for this period</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Award className="w-5 h-5 text-yellow-500" />
                    Top Performing Chefs
                </h3>
                <div className="flex gap-2">
                    <button
                        onClick={() => setSortBy('revenue')}
                        className={`px-3 py-1 text-sm rounded ${sortBy === 'revenue'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        By Revenue
                    </button>
                    <button
                        onClick={() => setSortBy('orders')}
                        className={`px-3 py-1 text-sm rounded ${sortBy === 'orders'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        By Orders
                    </button>
                </div>
            </div>

            <div className="space-y-3">
                {sortedChefs.map((chef, index) => (
                    <div
                        key={chef.merchant_id}
                        className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
                    >
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                            {index + 1}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 truncate">
                                {chef.merchant_name}
                            </div>
                            <div className="text-sm text-gray-500">
                                {chef.city}
                            </div>
                        </div>

                        <div className="flex gap-6 text-right">
                            <div>
                                <div className="flex items-center gap-1 text-sm font-semibold text-green-600">
                                    <Euro className="w-4 h-4" />
                                    €{chef.total_revenue.toFixed(0)}
                                </div>
                                <div className="text-xs text-gray-500">
                                    €{chef.average_order_value.toFixed(2)} avg
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center gap-1 text-sm font-semibold text-blue-600">
                                    <TrendingUp className="w-4 h-4" />
                                    {chef.completed_orders}
                                </div>
                                <div className="text-xs text-gray-500">
                                    orders
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
