import { supabase } from '../../../lib/supabase';

// Real coordinates for major Dutch cities — same as MapView
const cityCoordinates: Record<string, { lat: number; lng: number }> = {
    'Amsterdam': { lat: 52.3676, lng: 4.9041 },
    'Rotterdam': { lat: 51.9225, lng: 4.4792 },
    'Den Haag': { lat: 52.0705, lng: 4.3007 },
    'Utrecht': { lat: 52.0907, lng: 5.1214 },
    'Eindhoven': { lat: 51.4416, lng: 5.4697 },
    'Groningen': { lat: 53.2194, lng: 6.5665 },
    'Tilburg': { lat: 51.5555, lng: 5.0913 },
    'Almere': { lat: 52.3508, lng: 5.2647 },
    'Breda': { lat: 51.5719, lng: 4.7683 },
    'Nijmegen': { lat: 51.8126, lng: 5.8372 },
    'Enschede': { lat: 52.2215, lng: 6.8937 },
    'Apeldoorn': { lat: 52.2112, lng: 5.9699 },
    'Haarlem': { lat: 52.3874, lng: 4.6462 },
    'Arnhem': { lat: 51.9851, lng: 5.8987 },
    'Leiden': { lat: 52.1601, lng: 4.4970 },
    'Maastricht': { lat: 50.8514, lng: 5.6909 },
    'Delft': { lat: 52.0116, lng: 4.3571 },
    'Zwolle': { lat: 52.5168, lng: 6.0830 },
    'Amersfoort': { lat: 52.1561, lng: 5.3878 },
    'Zaanstad': { lat: 52.4389, lng: 4.8258 },
    'Dordrecht': { lat: 51.8133, lng: 4.6901 },
    'Alkmaar': { lat: 52.6324, lng: 4.7482 },
};

export interface BegeleiderChef {
    merchant_id: string;
    name: string;
    city: string;
    lat: number | null;
    lng: number | null;
    is_online: boolean;
    total_orders: number;
    total_turnover: number;   // sum of order_amount in period
    total_payout: number;     // chef keeps 88%
    days_active: number;      // distinct days with at least 1 order
}

function resolveCoords(city: string, address?: string): { lat: number; lng: number } | null {
    if (cityCoordinates[city]) return cityCoordinates[city];
    for (const [key, coord] of Object.entries(cityCoordinates)) {
        const search = `${city} ${address || ''}`.toLowerCase();
        if (search.includes(key.toLowerCase())) return coord;
    }
    return null;
}

// Add slight jitter so overlapping city markers don't stack exactly
function jitter(val: number, range = 0.05): number {
    return val + (Math.random() - 0.5) * range;
}

export async function getBegeleiderChefs(
    from: Date,
    to: Date,
): Promise<BegeleiderChef[]> {
    const startTs = Math.floor(from.getTime() / 1000);
    const endTs = Math.floor(to.getTime() / 1000);

    // 1 – Fetch all (published) merchants
    const { data: merchants, error: mErr } = await supabase
        .from('merchants')
        .select('merchant_id, name, city, address, is_accepting_orders, is_open, status')
        .eq('status', true);

    if (mErr || !merchants) return [];

    // 2 – Fetch orders in period grouped by merchant
    const merchantIds = merchants.map(m => m.merchant_id);

    const { data: orders } = merchantIds.length > 0
        ? await supabase
            .from('orders')
            .select('merchant_id, order_amount, created_timestamp, order_status')
            .in('merchant_id', merchantIds)
            .gte('created_timestamp', startTs)
            .lte('created_timestamp', endTs)
            .gte('order_status', 1)
            .lte('order_status', 5)
        : { data: [] };

    // Build stats map: merchant_id → { turnover, orders, days }
    const statsMap = new Map<string, { turnover: number; orderCount: number; days: Set<string> }>();
    (orders || []).forEach(o => {
        if (!o.merchant_id) return;
        if (!statsMap.has(o.merchant_id)) {
            statsMap.set(o.merchant_id, { turnover: 0, orderCount: 0, days: new Set() });
        }
        const s = statsMap.get(o.merchant_id)!;
        s.turnover += Number(o.order_amount || 0);
        s.orderCount += 1;
        const day = new Date(o.created_timestamp * 1000).toISOString().split('T')[0];
        s.days.add(day);
    });

    // 3 – Assemble result
    const chefs: BegeleiderChef[] = merchants.map(m => {
        const coords = resolveCoords(m.city || '', m.address || '');
        const stats = statsMap.get(m.merchant_id) || { turnover: 0, orderCount: 0, days: new Set() };
        const turnover = stats.turnover;
        return {
            merchant_id: m.merchant_id,
            name: m.name || `Chef ${m.merchant_id}`,
            city: m.city || 'Unknown',
            lat: coords ? jitter(coords.lat) : null,
            lng: coords ? jitter(coords.lng) : null,
            is_online: Boolean(m.is_accepting_orders && m.is_open),
            total_orders: stats.orderCount,
            total_turnover: turnover,
            total_payout: turnover * 0.88,
            days_active: stats.days.size,
        };
    });

    // Sort: online first, then by turnover desc
    return chefs.sort((a, b) => {
        if (a.is_online !== b.is_online) return a.is_online ? -1 : 1;
        return b.total_turnover - a.total_turnover;
    });
}
