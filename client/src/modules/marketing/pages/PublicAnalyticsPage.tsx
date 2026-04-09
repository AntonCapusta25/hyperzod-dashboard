import { useState, useEffect } from 'react';
import { getOrdersByHour, getOrdersByDayOfWeek } from '../api/chartData';
import { getDateRangeForPreset } from '../utils/dateRangeUtils';
import type { DateRangePreset } from '../../../types/analytics';
import PeakHoursChart from '../components/charts/PeakHoursChart';
import PeakDaysChart from '../components/charts/PeakDaysChart';
import { Calendar, BarChart3, ChefHat } from 'lucide-react';
import type { DateRange } from '../../../types/analytics';

export default function PublicAnalyticsPage() {
    const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset | string>('last_year');
    const [dateRange, setDateRange] = useState<DateRange>(() => getDateRangeForPreset('last_year'));
    const [loading, setLoading] = useState(true);
    const [hourData, setHourData] = useState<Record<number, number>>({});
    const [dayData, setDayData] = useState<Record<number, number>>({});

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
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
    }, [dateRange.from, dateRange.to]);

    const handlePresetChange = (preset: DateRangePreset) => {
        setDateRangePreset(preset);
        const newRange = getDateRangeForPreset(preset);
        setDateRange(newRange);
    };

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
                    <div className="flex flex-col sm:flex-row gap-4 bg-white rounded-lg shadow-sm border border-gray-200 p-2 text-sm">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <select
                                value={dateRangePreset as string}
                                onChange={(e) => handlePresetChange(e.target.value as DateRangePreset)}
                                className="bg-transparent border-none font-medium text-gray-700 focus:ring-0 cursor-pointer py-1 block w-full"
                            >
                                <option value="this_week">This Week</option>
                                <option value="last_week">Last Week</option>
                                <option value="last_month">Last Month</option>
                                <option value="last_3_months">Last 3 Months</option>
                                <option value="last_year">Last Year</option>
                                <option value="custom">Custom Range</option>
                            </select>
                        </div>
                        <div className="hidden sm:block w-px bg-gray-200"></div>
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={dateRange.from.toISOString().split('T')[0]}
                                onChange={(e) => {
                                    const newFrom = new Date(e.target.value);
                                    setDateRange({ ...dateRange, from: newFrom, preset: 'custom' });
                                    setDateRangePreset('custom');
                                }}
                                className="px-2 py-1 border border-gray-200 rounded text-gray-700 bg-gray-50 focus:bg-white focus:ring-blue-500 focus:border-blue-500"
                            />
                            <span className="text-gray-400">-</span>
                            <input
                                type="date"
                                value={dateRange.to.toISOString().split('T')[0]}
                                onChange={(e) => {
                                    const newTo = new Date(e.target.value);
                                    newTo.setHours(23, 59, 59, 999);
                                    setDateRange({ ...dateRange, to: newTo, preset: 'custom' });
                                    setDateRangePreset('custom');
                                }}
                                className="px-2 py-1 border border-gray-200 rounded text-gray-700 bg-gray-50 focus:bg-white focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-1">
                        <PeakHoursChart data={hourData} loading={loading} hideNumbers={true} />
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-1">
                        <PeakDaysChart data={dayData} loading={loading} hideNumbers={true} />
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
