import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import { getBegeleiderChefs } from '../api/begeleiders';
import type { BegeleiderChef } from '../api/begeleiders';
import { Building2, Wifi, WifiOff, TrendingUp, Euro, Calendar, ChefHat } from 'lucide-react';

type Preset = 'this_week' | 'last_month' | 'all_time';

function getRange(preset: Preset): { from: Date; to: Date } {
    const to = new Date();
    to.setHours(23, 59, 59, 999);
    const from = new Date();
    if (preset === 'this_week') {
        from.setDate(from.getDate() - from.getDay());
        from.setHours(0, 0, 0, 0);
    } else if (preset === 'last_month') {
        from.setDate(from.getDate() - 30);
        from.setHours(0, 0, 0, 0);
    } else {
        // All time — go back 3 years
        from.setFullYear(from.getFullYear() - 3);
        from.setHours(0, 0, 0, 0);
    }
    return { from, to };
}

function initials(name: string): string {
    return name
        .split(/\s+/)
        .slice(0, 2)
        .map(w => w[0]?.toUpperCase() ?? '')
        .join('');
}

function fmt(n: number) {
    return n.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─────────────────────────────────────────────
// Chef Card  (right panel)
// ─────────────────────────────────────────────
function ChefCard({ chef, selected, onClick }: { chef: BegeleiderChef; selected: boolean; onClick: () => void }) {
    const avatarColors = [
        'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500',
        'bg-pink-500', 'bg-teal-500', 'bg-indigo-500', 'bg-red-500',
    ];
    const colorIdx = chef.name.charCodeAt(0) % avatarColors.length;

    return (
        <div
            onClick={onClick}
            className={`rounded-xl p-4 cursor-pointer transition-all border ${
                selected
                    ? 'border-blue-500 shadow-md bg-blue-50'
                    : 'border-gray-100 hover:border-gray-300 bg-white hover:shadow-sm'
            }`}
        >
            <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className={`w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-sm ${avatarColors[colorIdx]}`}>
                    {initials(chef.name)}
                </div>

                <div className="flex-1 min-w-0">
                    {/* Name + status */}
                    <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-gray-900 text-sm truncate">{chef.name}</span>
                        {chef.is_online ? (
                            <span className="flex items-center gap-1 text-xs text-green-600 font-medium shrink-0">
                                <Wifi className="w-3 h-3" /> Online
                            </span>
                        ) : (
                            <span className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
                                <WifiOff className="w-3 h-3" /> Offline
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{chef.city}</p>

                    {/* Stats row */}
                    <div className="mt-3 grid grid-cols-3 gap-2">
                        <div className="text-center">
                            <div className="text-xs text-gray-500 mb-0.5">Turnover</div>
                            <div className="text-sm font-bold text-gray-900">€{fmt(chef.total_turnover)}</div>
                        </div>
                        <div className="text-center border-x border-gray-100">
                            <div className="text-xs text-gray-500 mb-0.5">Payout</div>
                            <div className="text-sm font-bold text-green-600">€{fmt(chef.total_payout)}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xs text-gray-500 mb-0.5">Orders</div>
                            <div className="text-sm font-bold text-blue-600">{chef.total_orders}</div>
                        </div>
                    </div>

                    {/* Days active */}
                    <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                        <Calendar className="w-3 h-3" />
                        <span>{chef.days_active} active day{chef.days_active !== 1 ? 's' : ''} in period</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────
// Summary bar
// ─────────────────────────────────────────────
function SummaryBar({ chefs }: { chefs: BegeleiderChef[] }) {
    const totalTurnover = chefs.reduce((s, c) => s + c.total_turnover, 0);
    const totalPayout = chefs.reduce((s, c) => s + c.total_payout, 0);
    const totalOrders = chefs.reduce((s, c) => s + c.total_orders, 0);
    const onlineCount = chefs.filter(c => c.is_online).length;

    const tiles = [
        { label: 'Total Chefs', value: chefs.length, icon: ChefHat, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Online Now', value: onlineCount, icon: Wifi, color: 'text-green-600', bg: 'bg-green-50' },
        { label: 'Total Turnover', value: `€${fmt(totalTurnover)}`, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
        { label: 'Total Payout', value: `€${fmt(totalPayout)}`, icon: Euro, color: 'text-orange-600', bg: 'bg-orange-50' },
        { label: 'Total Orders', value: totalOrders, icon: Building2, color: 'text-gray-700', bg: 'bg-gray-50' },
    ];

    return (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
            {tiles.map(t => (
                <div key={t.label} className={`${t.bg} rounded-xl p-4 flex items-center gap-3`}>
                    <t.icon className={`w-5 h-5 ${t.color} shrink-0`} />
                    <div>
                        <div className="text-xs text-gray-500">{t.label}</div>
                        <div className={`text-lg font-bold ${t.color}`}>{t.value}</div>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────
export default function BegeleidersDashboard() {
    const [preset, setPreset] = useState<Preset>('last_month');
    const [chefs, setChefs] = useState<BegeleiderChef[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    useEffect(() => {
        setLoading(true);
        const { from, to } = getRange(preset);
        getBegeleiderChefs(from, to)
            .then(setChefs)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [preset]);

    const filteredChefs = useMemo(() =>
        chefs.filter(c =>
            c.name.toLowerCase().includes(search.toLowerCase()) ||
            c.city.toLowerCase().includes(search.toLowerCase())
        ),
        [chefs, search]
    );

    const mappableChefs = useMemo(() =>
        filteredChefs.filter(c => c.lat !== null && c.lng !== null),
        [filteredChefs]
    );

    const presets: { key: Preset; label: string }[] = [
        { key: 'this_week', label: 'This Week' },
        { key: 'last_month', label: 'Last 30 Days' },
        { key: 'all_time', label: 'All Time' },
    ];

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-xl">
                            <Building2 className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Begeleiders Dashboard</h1>
                            <p className="text-gray-500 text-sm mt-0.5">Chef performance for Gemeente &amp; COA partners</p>
                        </div>
                    </div>
                </div>

                {/* Period selector */}
                <div className="flex gap-2">
                    {presets.map(p => (
                        <button
                            key={p.key}
                            onClick={() => setPreset(p.key)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                preset === p.key
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary bar */}
            {!loading && <SummaryBar chefs={filteredChefs} />}

            {/* Main content: map + cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* ── Map ─────────────────────────────── */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Chef Locations</h2>

                    {loading ? (
                        <div className="h-[560px] bg-gray-100 rounded-xl animate-pulse flex items-center justify-center">
                            <span className="text-gray-400 text-sm">Loading map…</span>
                        </div>
                    ) : (
                        <div className="h-[560px] rounded-xl overflow-hidden border border-gray-200">
                            <MapContainer
                                center={[52.2, 5.3]}
                                zoom={7}
                                style={{ height: '100%', width: '100%' }}
                                scrollWheelZoom
                            >
                                <TileLayer
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />

                                {mappableChefs.map(chef => (
                                    <CircleMarker
                                        key={chef.merchant_id}
                                        center={[chef.lat!, chef.lng!]}
                                        radius={chef.is_online ? 12 : 9}
                                        pathOptions={{
                                            fillColor: chef.is_online ? '#10B981' : '#9CA3AF',
                                            fillOpacity: selectedId === chef.merchant_id ? 1 : 0.75,
                                            color: selectedId === chef.merchant_id ? '#1D4ED8' : '#FFFFFF',
                                            weight: selectedId === chef.merchant_id ? 3 : 2,
                                        }}
                                        eventHandlers={{
                                            click: () => setSelectedId(
                                                id => id === chef.merchant_id ? null : chef.merchant_id
                                            ),
                                        }}
                                    >
                                        <Tooltip direction="top" offset={[0, -10]} opacity={0.95} permanent={false}>
                                            <div className="text-sm min-w-[180px]">
                                                <div className="font-bold text-gray-900 mb-1">{chef.name}</div>
                                                <div className="text-xs text-gray-500 mb-2">{chef.city}</div>
                                                <div className={`inline-flex items-center gap-1 text-xs font-medium mb-2 ${chef.is_online ? 'text-green-600' : 'text-gray-400'}`}>
                                                    {chef.is_online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                                                    {chef.is_online ? 'Online' : 'Offline'}
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 text-center border-t border-gray-100 pt-2">
                                                    <div>
                                                        <div className="text-xs text-gray-400">Turnover</div>
                                                        <div className="font-bold text-gray-800">€{fmt(chef.total_turnover)}</div>
                                                    </div>
                                                    <div className="border-x border-gray-100">
                                                        <div className="text-xs text-gray-400">Payout</div>
                                                        <div className="font-bold text-green-600">€{fmt(chef.total_payout)}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-gray-400">Orders</div>
                                                        <div className="font-bold text-blue-600">{chef.total_orders}</div>
                                                    </div>
                                                </div>
                                                <div className="text-xs text-gray-400 mt-2 text-center">
                                                    {chef.days_active} active day{chef.days_active !== 1 ? 's' : ''}
                                                </div>
                                            </div>
                                        </Tooltip>
                                    </CircleMarker>
                                ))}
                            </MapContainer>
                        </div>
                    )}

                    {/* Legend */}
                    <div className="mt-3 flex items-center gap-5 text-xs text-gray-500">
                        <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-full bg-green-500 border border-white shadow" />
                            Online chef
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-full bg-gray-400 border border-white shadow" />
                            Offline chef
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-full border-2 border-blue-600 bg-green-500" />
                            Selected
                        </span>
                        <span className="ml-auto">{mappableChefs.length} of {filteredChefs.length} plotted on map</span>
                    </div>
                </div>

                {/* ── Cards panel ─────────────────────── */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col">
                    <h2 className="text-lg font-semibold text-gray-900 mb-3">Chef Cards</h2>

                    {/* Search */}
                    <input
                        type="text"
                        placeholder="Search chef or city…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="mb-3 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />

                    <div className="text-xs text-gray-400 mb-3">
                        {filteredChefs.length} chef{filteredChefs.length !== 1 ? 's' : ''}
                        {' '}·{' '}
                        {filteredChefs.filter(c => c.is_online).length} online
                    </div>

                    {loading ? (
                        <div className="space-y-3 flex-1">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
                            ))}
                        </div>
                    ) : filteredChefs.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                            No chefs found
                        </div>
                    ) : (
                        <div className="flex-1 space-y-3 overflow-y-auto pr-1" style={{ maxHeight: '560px' }}>
                            {filteredChefs.map(chef => (
                                <ChefCard
                                    key={chef.merchant_id}
                                    chef={chef}
                                    selected={selectedId === chef.merchant_id}
                                    onClick={() => setSelectedId(
                                        id => id === chef.merchant_id ? null : chef.merchant_id
                                    )}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
