import { useState, useEffect } from 'react';
import { getRocketData, type RocketData } from '../api/chartData';
import { getDateRangeForPreset } from '../utils/dateRangeUtils';
import type { DateRange, DateRangePreset } from '../../../types/analytics';
import { Rocket, TrendingUp, Users, ChefHat, Layout, ArrowUpRight, Activity, Calendar, ChevronDown } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function PublicRocketGraphsPage() {
    const [data, setData] = useState<RocketData | null>(null);
    const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset | string>('last_year');
    const [dateRange, setDateRange] = useState<DateRange>(() => getDateRangeForPreset('last_year'));
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'revenue' | 'monthly' | 'customers' | 'chefs' | 'pipeline'>('revenue');

    const loadData = async (range: DateRange) => {
        setLoading(true);
        try {
            const rocketData = await getRocketData(range.from, range.to);
            setData(rocketData);
        } catch (error) {
            console.error('Error loading rocket data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData(dateRange);
    }, []);

    const handlePresetChange = (preset: DateRangePreset) => {
        setDateRangePreset(preset);
        if (preset !== 'custom') {
            const newRange = getDateRangeForPreset(preset);
            setDateRange(newRange);
            loadData(newRange);
        }
    };

    const handleDateChange = (field: 'from' | 'to', value: string) => {
        const newDate = new Date(value);
        if (isNaN(newDate.getTime())) return;
        
        const newRange = { ...dateRange, [field]: newDate, preset: 'custom' as const };
        setDateRange(newRange);
        setDateRangePreset('custom');
        loadData(newRange);
    };

    const CustomTooltip = ({ active, payload, label, prefix = '' }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-4 rounded-xl shadow-2xl border border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
                    <p className="text-lg font-extrabold text-gray-900">
                        {prefix}{payload[0].value.toLocaleString()}
                    </p>
                </div>
            );
        }
        return null;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6">
                <div className="w-16 h-16 relative">
                    <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <Rocket className="absolute inset-0 m-auto w-6 h-6 text-blue-500 animate-pulse" />
                </div>
                <p className="text-blue-200/50 font-medium tracking-widest uppercase text-xs">Igniting Engines...</p>
            </div>
        );
    }

    if (!data) return null;

    const tabs = [
        { id: 'revenue', label: 'Cumulative Revenue', icon: TrendingUp, color: 'emerald' },
        { id: 'monthly', label: 'Monthly Performance', icon: Calendar, color: 'emerald' },
        { id: 'customers', label: 'Customer Growth', icon: Users, color: 'blue' },
        { id: 'chefs', label: 'Active Chefs', icon: ChefHat, color: 'purple' },
        { id: 'pipeline', label: 'Chef Pipeline', icon: Layout, color: 'orange' },
    ];

    return (
        <div className="min-h-screen bg-[#050510] text-white selection:bg-blue-500/30">
            {/* Nav */}
            <nav className="border-b border-white/5 bg-black/50 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex flex-col md:flex-row items-center gap-4">
                        {/* Period Selector */}
                        <div className="flex flex-wrap items-center gap-3 bg-white/5 border border-white/10 rounded-[1.5rem] px-6 py-3 hover:bg-white/10 transition-all shadow-xl backdrop-blur-xl">
                            <div className="flex items-center gap-3 pr-4 border-r border-white/10">
                                <Calendar className="w-4 h-4 text-blue-400" />
                                <select
                                    value={dateRangePreset as string}
                                    onChange={(e) => handlePresetChange(e.target.value as DateRangePreset)}
                                    className="bg-transparent border-none font-bold text-xs uppercase tracking-widest text-white/70 focus:ring-0 cursor-pointer p-0 pr-8 appearance-none"
                                    style={{ WebkitAppearance: 'none' }}
                                >
                                    <option value="this_week" className="bg-[#0a0a1a]">This Week</option>
                                    <option value="last_week" className="bg-[#0a0a1a]">Last Week</option>
                                    <option value="last_month" className="bg-[#0a0a1a]">Last Month</option>
                                    <option value="last_3_months" className="bg-[#0a0a1a]">Last 3 Months</option>
                                    <option value="last_year" className="bg-[#0a0a1a]">Last Year</option>
                                    <option value="all_time" className="bg-[#0a0a1a]">All Time</option>
                                    <option value="custom" className="bg-[#0a0a1a]">Custom Range</option>
                                </select>
                                <ChevronDown className="w-4 h-4 text-white/30 -ml-6 pointer-events-none" />
                            </div>

                            <div className="flex items-center gap-4 pl-2 font-mono text-[10px] text-white/40 uppercase tracking-tighter">
                                <div className="flex flex-col gap-0.5">
                                    <span className="opacity-50">From</span>
                                    <input 
                                        type="date" 
                                        value={dateRange.from.toISOString().split('T')[0]}
                                        onChange={(e) => handleDateChange('from', e.target.value)}
                                        className="bg-transparent border-none p-0 text-white/80 font-bold focus:ring-0 cursor-pointer [color-scheme:dark]"
                                    />
                                </div>
                                <div className="w-4 h-[1px] bg-white/10"></div>
                                <div className="flex flex-col gap-0.5">
                                    <span className="opacity-50">To</span>
                                    <input 
                                        type="date" 
                                        value={dateRange.to.toISOString().split('T')[0]}
                                        onChange={(e) => handleDateChange('to', e.target.value)}
                                        className="bg-transparent border-none p-0 text-white/80 font-bold focus:ring-0 cursor-pointer [color-scheme:dark]"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="hidden sm:block w-px h-10 bg-white/10 mx-2"></div>
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <Rocket className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-black tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                                ROCKET<span className="text-blue-500">GRAPHS</span>
                            </span>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-6 py-16">
                {/* Header Section */}
                <div className="mb-12">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest mb-6">
                        <Activity className="w-3 h-3" />
                        Live Platform Growth
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter leading-none">
                        Scaling the <br />
                        <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">Homemade Ecosystem.</span>
                    </h1>
                </div>

                {/* KPI Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    <div 
                        onClick={() => setActiveTab('revenue')}
                        className={`cursor-pointer transition-all duration-300 p-8 rounded-3xl border ${activeTab === 'revenue' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-3 rounded-2xl ${activeTab === 'revenue' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                <TrendingUp className="w-6 h-6" />
                            </div>
                            <ArrowUpRight className={`w-5 h-5 text-emerald-400 transition-opacity ${activeTab === 'revenue' ? 'opacity-100' : 'opacity-0'}`} />
                        </div>
                        <div className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1 opacity-50">Total Revenue</div>
                        <div className="text-3xl font-black">€{data.totals.revenue.toLocaleString()}</div>
                    </div>

                    <div 
                        onClick={() => setActiveTab('customers')}
                        className={`cursor-pointer transition-all duration-300 p-8 rounded-3xl border ${activeTab === 'customers' ? 'bg-blue-500/10 border-blue-500/30' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-3 rounded-2xl ${activeTab === 'customers' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                <Users className="w-6 h-6" />
                            </div>
                            <ArrowUpRight className={`w-5 h-5 text-blue-400 transition-opacity ${activeTab === 'customers' ? 'opacity-100' : 'opacity-0'}`} />
                        </div>
                        <div className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1 opacity-50">Total Customers</div>
                        <div className="text-3xl font-black">{data.totals.customers.toLocaleString()}</div>
                    </div>

                    <div 
                        onClick={() => setActiveTab('chefs')}
                        className={`cursor-pointer transition-all duration-300 p-8 rounded-3xl border ${activeTab === 'chefs' ? 'bg-purple-500/10 border-purple-500/30' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-3 rounded-2xl ${activeTab === 'chefs' ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-500/10 text-purple-400'}`}>
                                <ChefHat className="w-6 h-6" />
                            </div>
                            <ArrowUpRight className={`w-5 h-5 text-purple-400 transition-opacity ${activeTab === 'chefs' ? 'opacity-100' : 'opacity-0'}`} />
                        </div>
                        <div className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1 opacity-50">Active Chefs</div>
                        <div className="text-3xl font-black">{data.totals.chefs.toLocaleString()}</div>
                    </div>

                    <div 
                        onClick={() => setActiveTab('pipeline')}
                        className={`cursor-pointer transition-all duration-300 p-8 rounded-3xl border ${activeTab === 'pipeline' ? 'bg-orange-500/10 border-orange-500/30' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-3 rounded-2xl ${activeTab === 'pipeline' ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-500/10 text-orange-400'}`}>
                                <Layout className="w-6 h-6" />
                            </div>
                            <ArrowUpRight className={`w-5 h-5 text-orange-400 transition-opacity ${activeTab === 'pipeline' ? 'opacity-100' : 'opacity-0'}`} />
                        </div>
                        <div className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1 opacity-50">Pipeline Chefs</div>
                        <div className="text-3xl font-black">{data.totals.pipeline.toLocaleString()}</div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex flex-wrap gap-2 mb-8 bg-white/5 p-1.5 rounded-2xl border border-white/5 w-fit">
                    {tabs.map((tab: any) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-widest transition-all ${
                                activeTab === tab.id 
                                    ? 'bg-white text-black shadow-xl scale-[1.02]' 
                                    : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                            }`}
                        >
                            <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-blue-600' : ''}`} />
                            {tab.id}
                        </button>
                    ))}
                </div>

                {/* Active Chart Display */}
                <div className="bg-white/5 border border-white/10 p-10 rounded-[2.5rem] min-h-[600px] shadow-2xl backdrop-blur-3xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 blur-[100px] -mr-48 -mt-48 transition-all group-hover:bg-blue-600/20"></div>
                    
                    <header className="mb-12">
                        <h3 className="text-3xl font-black tracking-tight flex items-center gap-4">
                            {tabs.find(t => t.id === activeTab)?.label}
                        </h3>
                        <p className="text-white/40 mt-2 font-medium">Historical performance and trends</p>
                    </header>

                    <div className="h-[500px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            {activeTab === 'monthly' ? (
                                <BarChart data={data.monthlyRevenueData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <XAxis 
                                        dataKey="date" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} 
                                    />
                                    <YAxis hide domain={['auto', 'auto']} />
                                    <Tooltip content={<CustomTooltip prefix="€" />} />
                                    <Bar 
                                        dataKey="total" 
                                        fill="#10B981" 
                                        radius={[8, 8, 0, 0]}
                                        animationDuration={2500}
                                    />
                                </BarChart>
                            ) : (
                                <AreaChart data={
                                    activeTab === 'revenue' ? data.revenueData :
                                    activeTab === 'customers' ? data.customerData :
                                    activeTab === 'chefs' ? data.chefData :
                                    data.pipelineData
                                }>
                                    <defs>
                                        <linearGradient id="activeGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={
                                                activeTab === 'revenue' ? '#10B981' :
                                                activeTab === 'customers' ? '#3B82F6' :
                                                activeTab === 'chefs' ? '#8B5CF6' :
                                                '#F59E0B'
                                            } stopOpacity={0.4} />
                                            <stop offset="95%" stopColor={
                                                activeTab === 'revenue' ? '#10B981' :
                                                activeTab === 'customers' ? '#3B82F6' :
                                                activeTab === 'chefs' ? '#8B5CF6' :
                                                '#F59E0B'
                                            } stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <XAxis 
                                        dataKey="date" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} 
                                        minTickGap={50}
                                    />
                                    <YAxis hide domain={['auto', 'auto']} />
                                    <Tooltip content={<CustomTooltip prefix={activeTab === 'revenue' ? '€' : ''} />} />
                                    <Area 
                                        type="monotone" 
                                        dataKey="total" 
                                        stroke={
                                            activeTab === 'revenue' ? '#10B981' :
                                            activeTab === 'customers' ? '#3B82F6' :
                                            activeTab === 'chefs' ? '#8B5CF6' :
                                            '#F59E0B'
                                        }
                                        strokeWidth={4}
                                        fillOpacity={1} 
                                        fill="url(#activeGradient)" 
                                        animationDuration={2500}
                                    />
                                </AreaChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                </div>
            </main>

            <footer className="py-20 border-t border-white/5 bg-black/50 text-center">
                <p className="text-gray-500 text-sm font-medium tracking-widest uppercase">
                    &copy; {new Date().getFullYear()} Homemade Platform. Built for the community.
                </p>
            </footer>
        </div>
    );
}
