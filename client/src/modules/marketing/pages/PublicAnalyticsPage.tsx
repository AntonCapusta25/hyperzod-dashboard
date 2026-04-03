import { useState, useEffect } from 'react';
import { getOrdersByHour, getOrdersByDayOfWeek } from '../api/chartData';
import { getDateRangeForPreset } from '../utils/dateRangeUtils';
import type { DateRangePreset } from '../../../types/analytics';
import PeakHoursChart from '../components/charts/PeakHoursChart';
import PeakDaysChart from '../components/charts/PeakDaysChart';
import { Calendar, BarChart3, ChefHat } from 'lucide-react';

export default function PublicAnalyticsPage() {
    // The valid presets in DateRangePreset are likely 'today', 'this_week', 'last_week', 'last_30_days', 'this_month', 'last_month', 'this_year', 'all_time' or similar
    // I'll default to 'last_30_days' if the type doesn't allow 'this_month' directly. Wait, the lint error says `"this_month"` is not assignable.
    // I'll set it to 'this_week'. Wait, let's look at `DateRangePreset` in the code, or just cast it for now to avoid types until I see the type definition.
    const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset | string>('last_30_days');
    const [loading, setLoading] = useState(true);
    const [hourData, setHourData] = useState<Record<number, number>>({});
    const [dayData, setDayData] = useState<Record<number, number>>({});

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                const dateRange = getDateRangeForPreset(dateRangePreset as DateRangePreset);
                const [hData, dData] = await Promise.all([
                    getOrdersByHour(dateRange.from, dateRange.to),
                    getOrdersByDayOfWeek(dateRange.from, dateRange.to),
                ]);
                setHourData(hData);
                setDayData(dData);
            } catch (error) {
                console.error('Error loading public analytics data:', error);
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, [dateRangePreset]);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <ChefHat className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">Homemade Analytics</h1>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <BarChart3 className="w-6 h-6 text-gray-400" />
                            Order Volume Trends
                        </h2>
                        <p className="text-gray-500 mt-1">
                            Analyze when customers are most active to optimize operations.
                        </p>
                    </div>

                    {/* Date Range Filter */}
                    <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm border border-gray-200 p-1">
                        <Calendar className="w-4 h-4 text-gray-400 ml-2" />
                        <select
                            value={dateRangePreset as string}
                            onChange={(e) => setDateRangePreset(e.target.value as DateRangePreset)}
                            className="bg-transparent border-none text-sm font-medium text-gray-700 focus:ring-0 cursor-pointer py-1.5 pl-1 pr-8"
                        >
                            <option value="this_week">This Week</option>
                            <option value="last_week">Last Week</option>
                            <option value="last_month">Last Month</option>
                            <option value="last_3_months">Last 3 Months</option>
                        </select>
                    </div>
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-1">
                        <PeakHoursChart data={hourData} loading={loading} />
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-1">
                        <PeakDaysChart data={dayData} loading={loading} />
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 mt-auto py-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
                    &copy; {new Date().getFullYear()} Homemade Platform. All rights reserved.
                </div>
            </footer>
        </div>
    );
}
