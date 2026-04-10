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
                <div className="mb-16">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest mb-6">
                        <Activity className="w-3 h-3" />
                        Live Platform Growth
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter leading-none">
                        Scaling the <br />
                        <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">Homemade Ecosystem.</span>
                    </h1>
                    <p className="text-xl text-gray-400 max-w-2xl leading-relaxed">
                        A transparent look at our cumulative trajectory across revenue, customer adoption, and chef partnership growth.
                    </p>
                </div>

                {/* KPI Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                    <div className="bg-white/5 border border-white/10 p-8 rounded-3xl hover:bg-white/10 transition-colors group">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                            <ArrowUpRight className="w-5 h-5 text-emerald-400 opacity-0 group-hover:opacity-100 transition-all" />
                        </div>
                        <div className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-1">Total Revenue</div>
                        <div className="text-3xl font-black">€{data.totals.revenue.toLocaleString()}</div>
                    </div>

                    <div className="bg-white/5 border border-white/10 p-8 rounded-3xl hover:bg-white/10 transition-colors group">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl">
                                <Users className="w-6 h-6" />
                            </div>
                            <ArrowUpRight className="w-5 h-5 text-blue-400 opacity-0 group-hover:opacity-100 transition-all" />
                        </div>
                        <div className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-1">Total Customers</div>
                        <div className="text-3xl font-black">{data.totals.customers.toLocaleString()}</div>
                    </div>

                    <div className="bg-white/5 border border-white/10 p-8 rounded-3xl hover:bg-white/10 transition-colors group">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-purple-500/10 text-purple-400 rounded-2xl">
                                <ChefHat className="w-6 h-6" />
                            </div>
                            <ArrowUpRight className="w-5 h-5 text-purple-400 opacity-0 group-hover:opacity-100 transition-all" />
                        </div>
                        <div className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-1">Active Chefs</div>
                        <div className="text-3xl font-black">{data.totals.chefs.toLocaleString()}</div>
                    </div>

                    <div className="bg-white/5 border border-white/10 p-8 rounded-3xl hover:bg-white/10 transition-colors group">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-orange-500/10 text-orange-400 rounded-2xl">
                                <Layout className="w-6 h-6" />
                            </div>
                            <ArrowUpRight className="w-5 h-5 text-orange-400 opacity-0 group-hover:opacity-100 transition-all" />
                        </div>
                        <div className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-1">Pipeline Chefs</div>
                        <div className="text-3xl font-black">{data.totals.pipeline.toLocaleString()}</div>
                    </div>
                </div>

                {/* Main Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Monthly Revenue Chart */}
                    <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] overflow-hidden">
                        <h3 className="text-xl font-bold mb-8 flex items-center gap-3">
                            <Calendar className="w-5 h-5 text-emerald-400" />
                            Monthly Revenue (Orders)
                        </h3>
                        <div className="h-[400px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
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
                                        radius={[6, 6, 0, 0]}
                                        animationDuration={2000}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Revenue Growth Chart */}
                    <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] overflow-hidden">
                        <h3 className="text-xl font-bold mb-8 flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            Cumulative Revenue
                        </h3>
                        <div className="h-[400px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data.revenueData}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
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
                                    <Tooltip content={<CustomTooltip prefix="€" />} />
                                    <Area 
                                        type="monotone" 
                                        dataKey="total" 
                                        stroke="#10B981" 
                                        strokeWidth={3}
                                        fillOpacity={1} 
                                        fill="url(#colorRevenue)" 
                                        animationDuration={2000}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Customer Growth Chart */}
                    <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] overflow-hidden">
                        <h3 className="text-xl font-bold mb-8 flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            Customer Base Expansion
                        </h3>
                        <div className="h-[400px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data.customerData}>
                                    <defs>
                                        <linearGradient id="colorCustomers" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
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
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area 
                                        type="monotone" 
                                        dataKey="total" 
                                        stroke="#3B82F6" 
                                        strokeWidth={3}
                                        fillOpacity={1} 
                                        fill="url(#colorCustomers)" 
                                        animationDuration={2000}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Active Chefs Growth Chart */}
                    <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] overflow-hidden">
                        <h3 className="text-xl font-bold mb-8 flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                            Curated Chef Partnerships
                        </h3>
                        <div className="h-[400px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data.chefData}>
                                    <defs>
                                        <linearGradient id="colorChefs" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
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
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area 
                                        type="monotone" 
                                        dataKey="total" 
                                        stroke="#8B5CF6" 
                                        strokeWidth={3}
                                        fillOpacity={1} 
                                        fill="url(#colorChefs)" 
                                        animationDuration={2000}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Pipeline Chefs Growth Chart */}
                    <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] overflow-hidden">
                        <h3 className="text-xl font-bold mb-8 flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                            Onboarding Pipeline
                        </h3>
                        <div className="h-[400px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data.pipelineData}>
                                    <defs>
                                        <linearGradient id="colorPipeline" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
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
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area 
                                        type="monotone" 
                                        dataKey="total" 
                                        stroke="#F59E0B" 
                                        strokeWidth={3}
                                        fillOpacity={1} 
                                        fill="url(#colorPipeline)" 
                                        animationDuration={2000}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
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
