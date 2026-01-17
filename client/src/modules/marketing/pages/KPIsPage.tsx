import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useWeeklyAnalytics } from '../hooks/useWeeklyAnalytics';
import type { AnalyticsConfig, DateRange, DateRangePreset } from '../../../types/analytics';
import { getDateRangeForPreset, formatDateRange, getPresetLabel } from '../utils/dateRangeUtils';
import { getTimeSeriesData, getOrdersByCity, getOrderStatusDistribution } from '../api/chartData';
import type { TimeSeriesData, CityData, OrderStatusData } from '../api/chartData';
import OrdersOverTimeChart from '../components/charts/OrdersOverTimeChart';
import RevenueTrendChart from '../components/charts/RevenueTrendChart';
import OrdersByCityChart from '../components/charts/OrdersByCityChart';
import OrderStatusChart from '../components/charts/OrderStatusChart';
import { supabase } from '../../../lib/supabase';

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { Download, FileText } from 'lucide-react';
import ManualRevenueManager from '../components/ManualRevenueManager';
import SyncOrdersButton from '../../../components/SyncOrdersButton';
import TopChefsWidget from '../components/TopChefsWidget';

type CityTab = 'all' | 'amsterdam' | 'enschede' | 'utrecht';

export default function KPIsPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'analytics' | 'config'>('analytics');

    // Determine active city tab from URL
    const activeCityTab: CityTab = location.pathname.includes('/amsterdam')
        ? 'amsterdam'
        : location.pathname.includes('/enschede')
            ? 'enschede'
            : location.pathname.includes('/utrecht')
                ? 'utrecht'
                : 'all';
    const [config, setConfig] = useState<AnalyticsConfig>({});
    const [draftConfig, setDraftConfig] = useState<AnalyticsConfig>({});
    const [selectedPreset, setSelectedPreset] = useState<DateRangePreset>('this_week');
    const [dateRange, setDateRange] = useState<DateRange>(() => getDateRangeForPreset('this_week'));
    const [chartData, setChartData] = useState<{
        timeSeries: TimeSeriesData[];
        cityData: CityData[];
        statusData: OrderStatusData[];
    }>({ timeSeries: [], cityData: [], statusData: [] });
    const [chartsLoading, setChartsLoading] = useState(false);
    const [configSaved, setConfigSaved] = useState(false);

    // Load chart data when date range or city changes
    useEffect(() => {
        async function loadChartData() {
            setChartsLoading(true);
            try {
                const city = activeCityTab === 'all' ? undefined : activeCityTab.charAt(0).toUpperCase() + activeCityTab.slice(1);
                const [timeSeries, cityData, statusData] = await Promise.all([
                    getTimeSeriesData(dateRange.from, dateRange.to, city),
                    getOrdersByCity(dateRange.from, dateRange.to),
                    getOrderStatusDistribution(dateRange.from, dateRange.to, city),
                ]);
                setChartData({ timeSeries, cityData, statusData });
            } catch (error) {
                console.error('Error loading chart data:', error);
            } finally {
                setChartsLoading(false);
            }
        }
        loadChartData();
    }, [dateRange.from, dateRange.to, activeCityTab]);

    // Use date range and city for analytics query
    const filters = useMemo(() => ({
        date_from: dateRange.from.toISOString(),
        date_to: dateRange.to.toISOString(),
        city: activeCityTab === 'all' ? undefined : activeCityTab.charAt(0).toUpperCase() + activeCityTab.slice(1),
    }), [dateRange.from, dateRange.to, activeCityTab]);

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

    const handleExportCSV = async () => {
        if (!analytics) return;
        setChartsLoading(true);

        try {
            const startTs = Math.floor(dateRange.from.getTime() / 1000);
            const endTs = Math.floor(dateRange.to.getTime() / 1000);

            // Get orders
            const { data: orders } = await supabase
                .from('orders')
                .select('*')
                .gte('created_timestamp', startTs)
                .lte('created_timestamp', endTs)
                .order('created_timestamp', { ascending: false });

            // Get clients
            const userIds = [...new Set(orders?.map(o => o.user_id).filter(Boolean))];
            const { data: clients } = userIds.length > 0
                ? await supabase.from('clients').select('*').in('hyperzod_id', userIds)
                : { data: null };

            // Get merchants - query by merchant_id (text field), not id (uuid)
            const merchantIds = [...new Set(orders?.map(o => o.merchant_id).filter(Boolean))];
            const { data: merchants } = merchantIds.length > 0
                ? await supabase.from('merchants').select('merchant_id, name').in('merchant_id', merchantIds)
                : { data: null };

            // Create merchant lookup map (merchant_id -> name)
            const merchantMap = new Map(merchants?.map(m => [m.merchant_id, m.name]) || []);

            // Calculate merchant distribution
            const merchantStats = new Map<string, { name: string; orders: number; revenue: number }>();
            orders?.forEach(order => {
                if (order.merchant_id && order.order_status >= 1 && order.order_status <= 5) {
                    const merchantName = merchantMap.get(order.merchant_id) || `Merchant ${order.merchant_id}`;
                    const existing = merchantStats.get(order.merchant_id) || { name: merchantName, orders: 0, revenue: 0 };
                    existing.orders += 1;
                    existing.revenue += Number(order.order_amount);
                    merchantStats.set(order.merchant_id, existing);
                }
            });

            // Calculate client order statistics
            const clientOrderStats = new Map<number, { orderCount: number; totalSpent: number; orders: string[] }>();
            orders?.forEach(order => {
                if (order.user_id && order.order_status >= 1 && order.order_status <= 5) {
                    const existing = clientOrderStats.get(order.user_id) || { orderCount: 0, totalSpent: 0, orders: [] };
                    existing.orderCount += 1;
                    existing.totalSpent += Number(order.order_amount);
                    existing.orders.push(`#${order.order_id} (€${Number(order.order_amount).toFixed(2)})`);
                    clientOrderStats.set(order.user_id, existing);
                }
            });

            // Create Excel workbook
            const wb = XLSX.utils.book_new();

            // Sheet 1: Summary Statistics
            const summaryData = [
                ['KPI Dashboard Summary'],
                [`Period: ${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`],
                [],
                ['Metric', 'Value'],
                ['New Customers', analytics.new_customers],
                ['Activation Rate', `${analytics.activation_rate.toFixed(1)}%`],
                ['Completed Orders', analytics.completed_orders],
                ['Completed Orders (Amsterdam)', analytics.completed_orders_amsterdam],
                ['30-Day Repeat Rate', `${analytics.repeat_rate_30d.toFixed(1)}%`],
                ['Active Chefs', analytics.active_chefs],
                ['Active Chefs (Amsterdam)', analytics.active_chefs_amsterdam],
                ['CAC per Customer', analytics.cac_per_customer ? `€${analytics.cac_per_customer.toFixed(2)}` : 'N/A'],
                ['Contribution Margin per Order', analytics.contribution_margin_per_order ? `€${analytics.contribution_margin_per_order.toFixed(2)}` : 'N/A']
            ];
            const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
            ws1['!cols'] = [{ wch: 30 }, { wch: 20 }];
            XLSX.utils.book_append_sheet(wb, ws1, 'Summary');

            // Sheet 2: Orders
            const statusMap: Record<number, string> = {
                0: 'Pending', 1: 'Confirmed', 2: 'Preparing', 3: 'Ready',
                4: 'Out for Delivery', 5: 'Delivered', 6: 'Cancelled'
            };
            const ordersData = [
                ['Order ID', 'Date', 'Status', 'Amount (EUR)', 'User ID', 'Chef Name', 'Type'],
                ...(orders?.map(order => [
                    order.order_id,
                    new Date(order.created_timestamp * 1000).toLocaleString(),
                    statusMap[order.order_status] || order.order_status,
                    Number(order.order_amount).toFixed(2),
                    order.user_id || 'N/A',
                    merchantMap.get(order.merchant_id) || 'N/A',
                    order.order_type || 'N/A'
                ]) || [])
            ];
            const ws2 = XLSX.utils.aoa_to_sheet(ordersData);
            ws2['!cols'] = [{ wch: 12 }, { wch: 20 }, { wch: 18 }, { wch: 15 }, { wch: 12 }, { wch: 25 }, { wch: 12 }];
            XLSX.utils.book_append_sheet(wb, ws2, 'Orders');

            // Sheet 3: Clients with Order Details
            const clientsData = [
                ['User ID', 'Name', 'Email', 'Phone', 'Created Date', 'Orders in Period', 'Total Spent (EUR)', 'Order Details'],
                ...(clients?.map(client => {
                    const stats = clientOrderStats.get(client.hyperzod_id) || { orderCount: 0, totalSpent: 0, orders: [] };
                    return [
                        client.hyperzod_id,
                        client.full_name || `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'N/A',
                        client.email || 'N/A',
                        client.mobile || 'N/A',
                        client.hyperzod_created_at ? new Date(client.hyperzod_created_at).toLocaleDateString() : 'N/A',
                        stats.orderCount,
                        stats.totalSpent.toFixed(2),
                        stats.orders.join(', ') || 'No orders in period'
                    ];
                }) || [])
            ];
            const ws3 = XLSX.utils.aoa_to_sheet(clientsData);
            ws3['!cols'] = [{ wch: 12 }, { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 50 }];
            XLSX.utils.book_append_sheet(wb, ws3, 'Clients');

            // Sheet 4: Chef Distribution (renamed from Merchant Distribution)
            const sortedMerchants = Array.from(merchantStats.values()).sort((a, b) => b.revenue - a.revenue);
            const merchantData = [
                ['Chef ID', 'Chef Name', 'Orders', 'Revenue (EUR)', 'Avg Order Value (EUR)'],
                ...sortedMerchants.map(stat => {
                    // Find the merchant ID for this name
                    const merchantId = Array.from(merchantMap.entries()).find(([_, name]) => name === stat.name)?.[0] || 'N/A';
                    return [
                        merchantId,
                        stat.name,
                        stat.orders,
                        stat.revenue.toFixed(2),
                        (stat.orders > 0 ? stat.revenue / stat.orders : 0).toFixed(2)
                    ];
                })
            ];
            const ws4 = XLSX.utils.aoa_to_sheet(merchantData);
            ws4['!cols'] = [{ wch: 12 }, { wch: 35 }, { wch: 12 }, { wch: 18 }, { wch: 22 }];
            XLSX.utils.book_append_sheet(wb, ws4, 'Chef Distribution');

            // Generate and download Excel file
            XLSX.writeFile(wb, `KPI_Report_${dateRange.from.toISOString().split('T')[0]}_to_${dateRange.to.toISOString().split('T')[0]}.xlsx`);
        } catch (error) {
            console.error('Failed to export Excel:', error);
            alert('Export failed. Please try again.');
        } finally {
            setChartsLoading(false);
        }
    };

    const handleExportPDF = async () => {
        const element = document.getElementById('kpi-dashboard-content');
        if (!element) return;

        setChartsLoading(true);
        try {
            // Simplified approach - just capture with basic settings
            const canvas = await html2canvas(element, {
                scale: 1.5,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
            const imgX = (pdfWidth - imgWidth * ratio) / 2;
            const imgY = 0;

            pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
            pdf.save(`kpis_${dateRange.from.toISOString().split('T')[0]}_to_${dateRange.to.toISOString().split('T')[0]}.pdf`);
        } catch (error) {
            console.error('Failed to export PDF:', error);
            alert('PDF export failed. This might be due to browser compatibility. Please try the CSV export instead.');
        } finally {
            setChartsLoading(false);
        }
    };

    return (
        <div>
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">KPIs & Deep Analytics</h1>
                    <p className="text-gray-600 mt-2">
                        {formatDateRange(dateRange)}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleExportCSV}
                        disabled={!analytics || chartsLoading}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                        <FileText className="w-4 h-4 mr-2" />
                        Export Excel
                    </button>
                    <button
                        onClick={handleExportPDF}
                        disabled={!analytics || chartsLoading}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Export PDF
                    </button>
                </div>
            </div>

            {/* City Tabs */}
            <div className="mb-6 border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    {(['all', 'amsterdam', 'enschede', 'utrecht'] as CityTab[]).map((city) => (
                        <button
                            key={city}
                            onClick={() => navigate(`/dashboard/kpis/${city}`)}
                            className={`${activeCityTab === city
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize`}
                        >
                            {city}
                        </button>
                    ))}
                </nav>
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
            </div>

            {/* Analytics/Config Tabs */}
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
                        <div id="kpi-dashboard-content">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                                {/* Metrics cards - keeping existing structure */}
                                <div className="bg-white p-6 rounded-lg shadow">
                                    <div className="text-sm text-gray-600 mb-1">New Customers</div>
                                    <div className="text-3xl font-bold text-gray-900">{analytics.new_customers}</div>
                                </div>
                                <div className="bg-white p-6 rounded-lg shadow">
                                    <div className="text-sm text-gray-600 mb-1">Activation Rate</div>
                                    <div className="text-3xl font-bold text-gray-900">{formatPercentage(analytics.activation_rate)}</div>
                                </div>
                                <div className="bg-white p-6 rounded-lg shadow">
                                    <div className="text-sm text-gray-600 mb-1">Completed Orders</div>
                                    <div className="text-3xl font-bold text-gray-900">{analytics.completed_orders}</div>
                                </div>
                                <div className="bg-white p-6 rounded-lg shadow">
                                    <div className="text-sm text-gray-600 mb-1">Orders (Amsterdam)</div>
                                    <div className="text-3xl font-bold text-blue-600">{analytics.completed_orders_amsterdam}</div>
                                </div>
                                <div className="bg-white p-6 rounded-lg shadow">
                                    <div className="text-sm text-gray-600 mb-1">30d Repeat Rate</div>
                                    <div className="text-3xl font-bold text-gray-900">{formatPercentage(analytics.repeat_rate_30d)}</div>
                                </div>
                                <div className="bg-white p-6 rounded-lg shadow">
                                    <div className="text-sm text-gray-600 mb-1">Active Chefs</div>
                                    <div className="text-3xl font-bold text-gray-900">{analytics.active_chefs}</div>
                                    <div className="text-xs text-gray-500 mt-1">{analytics.active_chefs_amsterdam} in Amsterdam</div>
                                </div>
                                <div className="bg-white p-6 rounded-lg shadow border-2 border-dashed border-gray-300">
                                    <div className="text-sm text-gray-600 mb-1">CAC per Customer</div>
                                    <div className="text-3xl font-bold text-gray-900">{formatCurrency(analytics.cac_per_customer)}</div>
                                </div>
                                <div className="bg-white p-6 rounded-lg shadow border-2 border-dashed border-gray-300">
                                    <div className="text-sm text-gray-600 mb-1">Contribution Margin</div>
                                    <div className="text-3xl font-bold text-gray-900">{formatCurrency(analytics.contribution_margin_per_order)}</div>
                                </div>
                            </div>

                            {/* Charts Section */}
                            <div className="mt-8">
                                <h2 className="text-xl font-semibold text-gray-900 mb-6">Data Visualizations</h2>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <OrdersOverTimeChart data={chartData.timeSeries} loading={chartsLoading} />
                                    <RevenueTrendChart data={chartData.timeSeries} loading={chartsLoading} />
                                    <OrdersByCityChart data={chartData.cityData} loading={chartsLoading} />
                                    <OrderStatusChart data={chartData.statusData} loading={chartsLoading} />
                                </div>
                            </div>

                            {/* Top Performing Chefs */}
                            <div className="mt-8">
                                <TopChefsWidget
                                    startDate={dateRange.from}
                                    endDate={dateRange.to}
                                    city={activeCityTab === 'all' ? undefined : activeCityTab.charAt(0).toUpperCase() + activeCityTab.slice(1)}
                                />
                            </div>
                        </div>
                    )}

                    {/* Configuration Tab */}
                    {activeTab === 'config' && (
                        <div className="max-w-2xl">
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
                                                Configuration saved successfully!
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
                                    </div>

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
                                    </div>

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
                                    </div>

                                    <div className="flex justify-end pt-6 border-t border-gray-200">
                                        <button
                                            onClick={handleSaveConfig}
                                            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                                        >
                                            Save Configuration
                                        </button>
                                    </div>
                                </div>

                                {/* Manual Revenue Manager */}
                                <div className="mt-8">
                                    <ManualRevenueManager />
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
