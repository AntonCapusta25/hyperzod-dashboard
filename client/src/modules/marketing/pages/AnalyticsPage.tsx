import { useState, useEffect, useMemo } from 'react';
import { useWeeklyAnalytics } from '../hooks/useWeeklyAnalytics';
import type { AnalyticsConfig, DateRange, DateRangePreset } from '../../../types/analytics';
import { getDateRangeForPreset, formatDateRange, getPresetLabel } from '../utils/dateRangeUtils';
import { getCities } from '../utils/cityUtils';
import { getTimeSeriesData, getOrdersByCity, getOrderStatusDistribution } from '../api/chartData';
import type { TimeSeriesData, CityData, OrderStatusData } from '../api/chartData';
import OrdersOverTimeChart from '../components/charts/OrdersOverTimeChart';
import RevenueTrendChart from '../components/charts/RevenueTrendChart';
import OrdersByCityChart from '../components/charts/OrdersByCityChart';
import OrderStatusChart from '../components/charts/OrderStatusChart';

export default function AnalyticsPage() {
    const [activeTab, setActiveTab] = useState<'analytics' | 'config'>('analytics');
    const [config, setConfig] = useState<AnalyticsConfig>({}); // Applied config
    const [draftConfig, setDraftConfig] = useState<AnalyticsConfig>({}); // Draft config being edited
    const [selectedPreset, setSelectedPreset] = useState<DateRangePreset>('this_week');
    const [dateRange, setDateRange] = useState<DateRange>(() => getDateRangeForPreset('this_week'));
    const [selectedCity, setSelectedCity] = useState<string>('');
    const [cities, setCities] = useState<string[]>([]);
    const [chartData, setChartData] = useState<{
        timeSeries: TimeSeriesData[];
        cityData: CityData[];
        statusData: OrderStatusData[];
    }>({ timeSeries: [], cityData: [], statusData: [] });
    const [chartsLoading, setChartsLoading] = useState(false);
    const [configSaved, setConfigSaved] = useState(false);

    // Load cities on mount
    useEffect(() => {
        getCities().then(setCities);
    }, []);

    // Load chart data when date range or city changes
    useEffect(() => {
        async function loadChartData() {
            setChartsLoading(true);
            try {
                const [timeSeries, cityData, statusData] = await Promise.all([
                    getTimeSeriesData(dateRange.from, dateRange.to, selectedCity || undefined),
                    getOrdersByCity(dateRange.from, dateRange.to),
                    getOrderStatusDistribution(dateRange.from, dateRange.to, selectedCity || undefined),
                ]);
                setChartData({ timeSeries, cityData, statusData });
            } catch (error) {
                console.error('Error loading chart data:', error);
            } finally {
                setChartsLoading(false);
            }
        }
        loadChartData();
    }, [dateRange.from, dateRange.to, selectedCity]);

    // Use date range and city for analytics query
    const filters = useMemo(() => ({
        date_from: dateRange.from.toISOString(),
        date_to: dateRange.to.toISOString(),
        city: selectedCity || undefined,
    }), [dateRange.from, dateRange.to, selectedCity]);

    const { analytics, loading, error } = useWeeklyAnalytics(filters, config);

    // Handle preset selection
    const handlePresetChange = (preset: DateRangePreset) => {
        setSelectedPreset(preset);
        const newRange = getDateRangeForPreset(preset);
        setDateRange(newRange);
    };

    // Handle config save
    const handleSaveConfig = () => {
        setConfig(draftConfig);
        setConfigSaved(true);
        // Hide success message after 3 seconds
        setTimeout(() => setConfigSaved(false), 3000);
    };

    // Sync draft config when switching to config tab
    useEffect(() => {
        if (activeTab === 'config') {
            setDraftConfig(config);
        }
    }, [activeTab, config]);

    const formatCurrency = (amount?: number) => {
        if (amount === undefined) return 'N/A';
        return `€${amount.toFixed(2)}`;
    };

    const formatPercentage = (value: number) => {
        return `${value.toFixed(1)}%`;
    };

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
                <p className="text-gray-600 mt-1">
                    {formatDateRange(dateRange)}
                </p>
            </div>

            {/* Date Range Selector */}
            <div className="bg-white p-4 rounded-lg shadow mb-6">
                <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-sm font-medium text-gray-700 mr-2">Date Range:</span>
                    {(['this_week', 'last_week', 'last_month', 'last_3_months'] as DateRangePreset[]).map((preset) => (
                        <button
                            key={preset}
                            onClick={() => handlePresetChange(preset)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${selectedPreset === preset
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            {getPresetLabel(preset)}
                        </button>
                    ))}
                    <div className="ml-auto flex gap-2 items-center">
                        <label className="text-sm text-gray-600">From:</label>
                        <input
                            type="date"
                            value={dateRange.from.toISOString().split('T')[0]}
                            onChange={(e) => {
                                const newFrom = new Date(e.target.value);
                                setDateRange({ ...dateRange, from: newFrom, preset: 'custom' });
                                setSelectedPreset('custom');
                            }}
                            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                        />
                        <label className="text-sm text-gray-600">To:</label>
                        <input
                            type="date"
                            value={dateRange.to.toISOString().split('T')[0]}
                            onChange={(e) => {
                                const newTo = new Date(e.target.value);
                                newTo.setHours(23, 59, 59, 999);
                                setDateRange({ ...dateRange, to: newTo, preset: 'custom' });
                                setSelectedPreset('custom');
                            }}
                            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                        />
                    </div>
                </div>

                {/* City Filter */}
                <div className="flex gap-2 items-center mt-4 pt-4 border-t border-gray-200">
                    <span className="text-sm font-medium text-gray-700 mr-2">Filter by City:</span>
                    <select
                        value={selectedCity}
                        onChange={(e) => setSelectedCity(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">All Cities</option>
                        {cities.map((city) => (
                            <option key={city} value={city}>
                                {city}
                            </option>
                        ))}
                    </select>
                    {selectedCity && (
                        <button
                            onClick={() => setSelectedCity('')}
                            className="text-sm text-blue-600 hover:text-blue-800"
                        >
                            Clear filter
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('analytics')}
                        className={`${activeTab === 'analytics'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        Analytics
                    </button>
                    <button
                        onClick={() => setActiveTab('config')}
                        className={`${activeTab === 'config'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        Configuration
                    </button>
                </nav>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Loading analytics...</div>
            ) : error ? (
                <div className="text-center py-12 text-red-600">{error}</div>
            ) : (
                <>
                    {/* Analytics Tab */}
                    {activeTab === 'analytics' && analytics && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* New Customers */}
                            <div className="bg-white p-6 rounded-lg shadow">
                                <div className="text-sm text-gray-600 mb-1">New Customers</div>
                                <div className="text-3xl font-bold text-gray-900">{analytics.new_customers}</div>
                                <div className="text-xs text-gray-500 mt-1">First-time buyers this week</div>
                            </div>

                            {/* Activation Rate */}
                            <div className="bg-white p-6 rounded-lg shadow">
                                <div className="text-sm text-gray-600 mb-1">Activation Rate</div>
                                <div className="text-3xl font-bold text-gray-900">
                                    {formatPercentage(analytics.activation_rate)}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">Signups → 1st order within 7d</div>
                            </div>

                            {/* Completed Orders */}
                            <div className="bg-white p-6 rounded-lg shadow">
                                <div className="text-sm text-gray-600 mb-1">Completed Orders</div>
                                <div className="text-3xl font-bold text-gray-900">{analytics.completed_orders}</div>
                                <div className="text-xs text-gray-500 mt-1">All delivered orders</div>
                            </div>

                            {/* Completed Orders Amsterdam */}
                            <div className="bg-white p-6 rounded-lg shadow">
                                <div className="text-sm text-gray-600 mb-1">Orders (Amsterdam)</div>
                                <div className="text-3xl font-bold text-blue-600">{analytics.completed_orders_amsterdam}</div>
                                <div className="text-xs text-gray-500 mt-1">Delivered in Amsterdam</div>
                            </div>

                            {/* 30d Repeat Rate */}
                            <div className="bg-white p-6 rounded-lg shadow">
                                <div className="text-sm text-gray-600 mb-1">30d Repeat Rate</div>
                                <div className="text-3xl font-bold text-gray-900">
                                    {formatPercentage(analytics.repeat_rate_30d)}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">Customers who reordered</div>
                            </div>

                            {/* Active Chefs */}
                            <div className="bg-white p-6 rounded-lg shadow">
                                <div className="text-sm text-gray-600 mb-1">Active Chefs</div>
                                <div className="text-3xl font-bold text-gray-900">{analytics.active_chefs}</div>
                                <div className="text-xs text-gray-500 mt-1">
                                    {analytics.active_chefs_amsterdam} in Amsterdam
                                </div>
                            </div>

                            {/* CAC per Customer */}
                            <div className="bg-white p-6 rounded-lg shadow border-2 border-dashed border-gray-300">
                                <div className="text-sm text-gray-600 mb-1">CAC per Customer</div>
                                <div className="text-3xl font-bold text-gray-900">
                                    {formatCurrency(analytics.cac_per_customer)}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    {analytics.cac_per_customer ? 'Customer acquisition cost' : 'Configure marketing spend →'}
                                </div>
                            </div>

                            {/* Contribution Margin */}
                            <div className="bg-white p-6 rounded-lg shadow border-2 border-dashed border-gray-300">
                                <div className="text-sm text-gray-600 mb-1">Contribution Margin</div>
                                <div className="text-3xl font-bold text-gray-900">
                                    {formatCurrency(analytics.contribution_margin_per_order)}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    {analytics.contribution_margin_per_order ? 'Per order' : 'Configure COGS & commission →'}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Charts Section */}
                    {activeTab === 'analytics' && (
                        <div className="mt-8">
                            <h2 className="text-xl font-semibold text-gray-900 mb-6">Data Visualizations</h2>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <OrdersOverTimeChart data={chartData.timeSeries} loading={chartsLoading} />
                                <RevenueTrendChart data={chartData.timeSeries} loading={chartsLoading} />
                                <OrdersByCityChart
                                    data={chartData.cityData}
                                    loading={chartsLoading}
                                    selectedCity={selectedCity}
                                />
                                <OrderStatusChart data={chartData.statusData} loading={chartsLoading} />
                            </div>
                        </div>
                    )}

                    {/* Configuration Tab */}
                    {activeTab === 'config' && (
                        <div className="max-w-2xl">
                            {/* Success Message */}
                            {configSaved && (
                                <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
                                    <div className="flex">
                                        <div className="flex-shrink-0">
                                            <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div className="ml-3">
                                            <p className="text-sm font-medium text-green-800">
                                                Configuration saved successfully! Analytics will update with the new values.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="bg-white p-6 rounded-lg shadow">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Analytics Configuration</h2>
                                <p className="text-sm text-gray-600 mb-6">
                                    Configure the data needed to calculate CAC and Contribution Margin metrics.
                                </p>

                                <div className="space-y-6">
                                    {/* Marketing Spend */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Weekly Marketing Spend (€)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={draftConfig.weekly_marketing_spend || ''}
                                            onChange={(e) =>
                                                setDraftConfig({
                                                    ...draftConfig,
                                                    weekly_marketing_spend: parseFloat(e.target.value) || undefined,
                                                })
                                            }
                                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="e.g., 5000.00"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            Total marketing spend for this week (used to calculate CAC)
                                        </p>
                                    </div>

                                    {/* COGS Percentage */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Default COGS Percentage (%)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={draftConfig.default_cogs_percentage || ''}
                                            onChange={(e) =>
                                                setDraftConfig({
                                                    ...draftConfig,
                                                    default_cogs_percentage: parseFloat(e.target.value) || undefined,
                                                })
                                            }
                                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="e.g., 35"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            Cost of Goods Sold as a percentage of order amount
                                        </p>
                                    </div>

                                    {/* Commission Percentage */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Default Commission Percentage (%)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={draftConfig.default_commission_percentage || ''}
                                            onChange={(e) =>
                                                setDraftConfig({
                                                    ...draftConfig,
                                                    default_commission_percentage: parseFloat(e.target.value) || undefined,
                                                })
                                            }
                                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="e.g., 15"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            Platform commission as a percentage of order amount
                                        </p>
                                    </div>

                                    {/* Info Box */}
                                    <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                                        <div className="flex">
                                            <div className="flex-shrink-0">
                                                <svg
                                                    className="h-5 w-5 text-blue-400"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 20 20"
                                                    fill="currentColor"
                                                >
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                            </div>
                                            <div className="ml-3">
                                                <h3 className="text-sm font-medium text-blue-800">How it works</h3>
                                                <div className="mt-2 text-sm text-blue-700">
                                                    <ul className="list-disc pl-5 space-y-1">
                                                        <li>
                                                            <strong>CAC</strong> = Marketing Spend ÷ New Customers
                                                        </li>
                                                        <li>
                                                            <strong>Contribution Margin</strong> = Order Amount - COGS - Commission - Delivery Fee
                                                        </li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Save Button */}
                                    <div className="flex justify-end pt-6 border-t border-gray-200">
                                        <button
                                            onClick={handleSaveConfig}
                                            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                                        >
                                            Save Configuration
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
