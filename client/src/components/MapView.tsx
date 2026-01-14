import { useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import type { Merchant } from '../types';

interface MapViewProps {
    merchants: Merchant[];
    loading: boolean;
}

interface CityStats {
    name: string;
    total: number;
    online: number;
    published: number;
    lat: number;
    lng: number;
}

// Real coordinates for major Dutch cities
const cityCoordinates: { [key: string]: { lat: number; lng: number } } = {
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
    'Rijswijk': { lat: 52.0533, lng: 4.3197 },
    'Zwolle': { lat: 52.5168, lng: 6.0830 },
    'Leeuwarden': { lat: 53.2012, lng: 5.7999 },
    'Alkmaar': { lat: 52.6324, lng: 4.7482 },
    'Amersfoort': { lat: 52.1561, lng: 5.3878 },
    'Zaanstad': { lat: 52.4389, lng: 4.8258 },
    'Zoetermeer': { lat: 52.0575, lng: 4.4932 },
    'Dordrecht': { lat: 51.8133, lng: 4.6901 },
    'Ede': { lat: 52.0408, lng: 5.6673 },
};

export function MapView({ merchants, loading }: MapViewProps) {
    // Filter only published merchants
    const publishedMerchants = useMemo(() =>
        merchants.filter(m => m.status === 'published'),
        [merchants]
    );

    // Aggregate published merchants by city with real coordinates
    const cityStats = useMemo(() => {
        const stats = new Map<string, CityStats>();

        publishedMerchants.forEach(merchant => {
            if (merchant.city === 'N/A') return;

            // Find matching city in coordinates
            let matchedCity = merchant.city;
            let coords = cityCoordinates[merchant.city];

            if (!coords) {
                // Try to find a partial match
                for (const [city, coord] of Object.entries(cityCoordinates)) {
                    if (merchant.city.toLowerCase().includes(city.toLowerCase()) ||
                        merchant.address.toLowerCase().includes(city.toLowerCase())) {
                        matchedCity = city;
                        coords = coord;
                        break;
                    }
                }
            }

            if (!coords) return; // Skip if no coordinates found

            const existing = stats.get(matchedCity) || {
                name: matchedCity,
                total: 0,
                online: 0,
                published: 0,
                lat: coords.lat,
                lng: coords.lng
            };

            existing.total++;
            if (merchant.isOnline) existing.online++;
            existing.published++;

            stats.set(matchedCity, existing);
        });

        return Array.from(stats.values()).sort((a, b) => b.total - a.total);
    }, [publishedMerchants]);

    if (loading) {
        return (
            <div className="bg-white rounded-xl shadow-md p-6">
                <div className="animate-pulse">
                    <div className="h-96 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Map */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-md p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Netherlands Chef Locations</h2>
                <div className="h-[600px] rounded-lg overflow-hidden border border-gray-200">
                    <MapContainer
                        center={[52.1326, 5.2913]} // Center of Netherlands
                        zoom={7}
                        style={{ height: '100%', width: '100%' }}
                        scrollWheelZoom={true}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        {cityStats.map((city) => {
                            // Calculate radius based on number of chefs (min 8, max 30)
                            const radius = Math.min(8 + (city.total * 2), 30);
                            const color = city.online > 0 ? '#10B981' : '#3B82F6';

                            return (
                                <CircleMarker
                                    key={city.name}
                                    center={[city.lat, city.lng]}
                                    radius={radius}
                                    pathOptions={{
                                        fillColor: color,
                                        fillOpacity: 0.7,
                                        color: '#FFFFFF',
                                        weight: 2
                                    }}
                                >
                                    <Tooltip direction="top" offset={[0, -10]} opacity={0.9}>
                                        <div className="text-sm">
                                            <div className="font-bold">{city.name}</div>
                                            <div>{city.total} published chef{city.total !== 1 ? 's' : ''}</div>
                                            <div className="text-green-600">{city.online} online</div>
                                        </div>
                                    </Tooltip>
                                    <Popup>
                                        <div className="text-sm">
                                            <h3 className="font-bold text-base mb-1">{city.name}</h3>
                                            <p><strong>{city.total}</strong> published chefs</p>
                                            <p className="text-green-600"><strong>{city.online}</strong> currently online</p>
                                        </div>
                                    </Popup>
                                </CircleMarker>
                            );
                        })}
                    </MapContainer>
                </div>
                <div className="mt-4 flex items-center justify-center gap-6 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white"></div>
                        <span>Has online chefs</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white"></div>
                        <span>All offline</span>
                    </div>
                    <span className="text-gray-400">•</span>
                    <span>{publishedMerchants.length} published chefs total</span>
                </div>
            </div>

            {/* City Stats List */}
            <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Top Cities (Published)</h3>
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {cityStats.map((city) => (
                        <div
                            key={city.name}
                            className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                        >
                            <div className="flex justify-between items-start mb-1">
                                <h4 className="font-semibold text-gray-900">{city.name}</h4>
                                <span className="text-sm font-medium text-blue-600">{city.total}</span>
                            </div>
                            <div className="flex gap-4 text-xs text-gray-600">
                                <span className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                    {city.online} online
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
