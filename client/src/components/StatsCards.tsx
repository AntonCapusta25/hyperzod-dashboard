import type { MerchantStats } from '../types';
import { Users, CheckCircle, XCircle, Wifi } from 'lucide-react';

interface StatsCardsProps {
    stats: MerchantStats;
    loading: boolean;
}

export function StatsCards({ stats, loading }: StatsCardsProps) {
    const cards = [
        {
            title: 'Total Chefs',
            value: stats.total,
            icon: Users,
            color: 'bg-gradient-to-br from-blue-500 to-blue-600',
            textColor: 'text-blue-600',
        },
        {
            title: 'Published',
            value: stats.published,
            icon: CheckCircle,
            color: 'bg-gradient-to-br from-green-500 to-green-600',
            textColor: 'text-green-600',
        },
        {
            title: 'Unpublished',
            value: stats.unpublished,
            icon: XCircle,
            color: 'bg-gradient-to-br from-orange-500 to-orange-600',
            textColor: 'text-orange-600',
        },
        {
            title: 'Online Now',
            value: stats.online,
            icon: Wifi,
            color: 'bg-gradient-to-br from-purple-500 to-purple-600',
            textColor: 'text-purple-600',
        },
    ];

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white rounded-xl shadow-md p-6 animate-pulse">
                        <div className="h-12 bg-gray-200 rounded mb-4"></div>
                        <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {cards.map((card) => {
                const Icon = card.icon;
                return (
                    <div
                        key={card.title}
                        className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border border-gray-100"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-3 rounded-lg ${card.color} bg-opacity-10`}>
                                <Icon className={`w-6 h-6 ${card.textColor}`} />
                            </div>
                        </div>
                        <h3 className="text-gray-600 text-sm font-medium mb-1">{card.title}</h3>
                        <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                    </div>
                );
            })}
        </div>
    );
}
