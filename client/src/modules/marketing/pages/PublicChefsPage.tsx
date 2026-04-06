import { useState, useEffect, useMemo } from 'react';
import { getPublicChefs, type PublicChef } from '../api/chefs';
import { ChefHat, MapPin, Star, Utensils, Users, Globe, Heart, ShieldCheck, PieChart as PieIcon, BarChart3 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Legend } from 'recharts';

export default function PublicChefsPage() {
    const [chefs, setChefs] = useState<PublicChef[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        async function loadChefs() {
            setLoading(true);
            try {
                const data = await getPublicChefs();
                setChefs(data);
            } catch (error) {
                console.error('Error loading public chefs:', error);
            } finally {
                setLoading(false);
            }
        }
        loadChefs();
    }, []);

    const filteredChefs = useMemo(() => {
        return chefs.filter(chef => 
            chef.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            chef.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
            chef.cuisine.some(c => c.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [chefs, searchTerm]);

    const stats = useMemo(() => {
        const uniqueCuisines = new Set(chefs.flatMap(c => c.cuisine));
        const uniqueCities = new Set(chefs.map(c => c.city));
        
        // Data for Cuisine Chart
        const cuisineMap: Record<string, number> = {};
        chefs.flatMap(c => c.cuisine).forEach(cuisine => {
            cuisineMap[cuisine] = (cuisineMap[cuisine] || 0) + 1;
        });
        const cuisineData = Object.entries(cuisineMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8);

        // Data for Cities Chart
        const cityMap: Record<string, number> = {};
        chefs.forEach(c => {
            cityMap[c.city] = (cityMap[c.city] || 0) + 1;
        });
        const cityData = Object.entries(cityMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8);

        return {
            chefCount: chefs.length,
            cuisineCount: uniqueCuisines.size,
            cityCount: uniqueCities.size,
            cuisineData,
            cityData
        };
    }, [chefs]);

    const generateChefStory = (chef: PublicChef) => {
        const primaryCuisine = chef.cuisine[0] || 'International';
        const city = chef.city;
        const hasCity = city && city !== 'Unknown';
        const name = chef.name.split("'")[0].split(" ")[0];

        const intros = [
            `${name} is a cornerstone of the culinary scene${hasCity ? ` in ${city}` : ''}.`,
            `${hasCity ? `Hailing from ${city}, ` : ''}${name} possesses a deep passion for authentic flavors.`,
            `${hasCity ? `In the heart of ${city}, ` : 'With a focus on local quality, '}${name} is reimagining home-cooked traditions.`,
            `${name} brings the vibrant culture of their heritage to the kitchens${hasCity ? ` of ${city}` : ''}.`
        ];

        const niches = [
            `Specializing in ${primaryCuisine} cuisine, they take pride in using traditional spices and heirloom recipes.`,
            `Their mastery of ${primaryCuisine} cooking is reflected in every balanced, aromatic plate they prepare.`,
            `Focused on the art of ${primaryCuisine} food, they offer a niche experience that bridges cultures through taste.`,
            `By blending quality ingredients with ${primaryCuisine} techniques, they create something truly unique for their customers.`
        ];

        const opportunities = [
            `This is a golden opportunity to experience restaurant-quality ${primaryCuisine} food in a more personal, home-style setting.`,
            `Whether for a quiet dinner or a special gathering, ${name} provides a level of authenticity and care that is rare to find.`,
            `Supporting ${name} means investing in local talent while treating yourself to the best ${primaryCuisine} dishes.`,
            `Their kitchen serves as a bridge, connecting customers to the rich history and soul of ${primaryCuisine} culture.`
        ];

        const hash = chef.merchant_id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        
        const i1 = (hash * 7) % intros.length;
        const i2 = (hash * 13) % niches.length;
        const i3 = (hash * 17) % opportunities.length;

        return `${intros[i1]} ${niches[i2]} ${opportunities[i3]}`;
    };

    const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4', '#F472B6', '#6366F1'];

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Hero Section */}
            <section className="relative py-20 bg-blue-900 text-white overflow-hidden">
                <div className="absolute inset-0 opacity-20">
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=2070')] bg-cover bg-center"></div>
                    <div className="absolute inset-0 bg-gradient-to-b from-blue-900/80 to-blue-900"></div>
                </div>
                <div className="relative max-w-7xl mx-auto px-4 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-sm font-medium mb-6">
                        <Users className="w-4 h-4" />
                        Community of {stats.chefCount}+ Talented Home Chefs
                    </div>
                    <h1 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight">
                        Authentic Flavors, <span className="text-blue-400">Straight from the Heart.</span>
                    </h1>
                    <p className="text-xl text-blue-100/90 max-w-2xl mx-auto mb-10 leading-relaxed">
                        Discover the hidden culinary gems of the Netherlands. Our chefs bring centuries of tradition and local passion directly to your table.
                    </p>
                    
                    {/* Search Bar */}
                    <div className="max-w-xl mx-auto relative">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                            <Utensils className="w-5 h-5 text-gray-400" />
                        </div>
                        <input 
                            type="text" 
                            placeholder="Search by cuisine, chef name, or city..."
                            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white text-gray-900 shadow-2xl focus:ring-4 focus:ring-blue-500/20 border-none transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </section>

            {/* Stats Bar */}
            <div className="relative -mt-12 z-10 max-w-5xl mx-auto w-full px-4">
                <div className="grid grid-cols-3 bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-8 divide-x divide-gray-100">
                    <div className="text-center px-2">
                        <div className="text-2xl md:text-4xl font-bold text-blue-600">{stats.chefCount}</div>
                        <div className="text-xs md:text-sm text-gray-500 font-medium uppercase tracking-wider mt-1">Active Chefs</div>
                    </div>
                    <div className="text-center px-2">
                        <div className="text-2xl md:text-4xl font-bold text-blue-600">{stats.cuisineCount}</div>
                        <div className="text-xs md:text-sm text-gray-500 font-medium uppercase tracking-wider mt-1">Cuisines</div>
                    </div>
                    <div className="text-center px-2">
                        <div className="text-2xl md:text-4xl font-bold text-blue-600">{stats.cityCount}</div>
                        <div className="text-xs md:text-sm text-gray-500 font-medium uppercase tracking-wider mt-1">Cities</div>
                    </div>
                </div>
            </div>

            {/* Community Insights */}
            {!loading && chefs.length > 0 && (
                <section className="max-w-7xl mx-auto w-full px-4 pt-20">
                    <div className="flex flex-col md:flex-row items-center gap-4 mb-10">
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
                            <BarChart3 className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-extrabold text-gray-900">Community Insights</h2>
                            <p className="text-gray-500 font-medium">Visualizing our culinary diversity and reach</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Cuisine Distribution Chart */}
                        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="p-2 bg-indigo-50 text-indigo-500 rounded-lg">
                                    <PieIcon className="w-5 h-5" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">Cuisine Distribution</h3>
                            </div>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={stats.cuisineData}
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {stats.cuisineData.map((_entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip 
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* City Density Chart */}
                        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="p-2 bg-emerald-50 text-emerald-500 rounded-lg">
                                    <MapPin className="w-5 h-5" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">Top Cities by Chef Count</h3>
                            </div>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.cityData} layout="vertical" margin={{ left: 20 }}>
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} fontSize={12} width={80} />
                                        <RechartsTooltip 
                                            cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* Chef Grid */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-20">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-gray-500 font-medium">Coming soon from the kitchen...</p>
                    </div>
                ) : filteredChefs.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredChefs.map(chef => (
                            <div key={chef.merchant_id} className="group bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
                                {/* Cover Image */}
                                <div className="h-48 relative overflow-hidden">
                                    <img 
                                        src={chef.cover_url || 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?q=80&w=2070'} 
                                        alt={chef.name}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                                    
                                    {/* Rating badge */}
                                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm">
                                        <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                                        <span className="text-xs font-bold text-gray-900">{chef.rating > 0 ? chef.rating.toFixed(1) : 'New'}</span>
                                    </div>
                                </div>

                                {/* content */}
                                <div className="p-6 pt-12 relative">
                                    {/* Logo */}
                                    <div className="absolute -top-10 left-6 w-20 h-20 rounded-2xl border-4 border-white bg-white shadow-lg overflow-hidden">
                                        <img 
                                            src={chef.logo_url || 'https://api.dicebear.com/7.x/initials/svg?seed=' + chef.name} 
                                            alt={chef.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>

                                    <div className="mb-4">
                                        <h3 className="text-xl font-bold text-gray-900 line-clamp-1 mb-1">{chef.name}</h3>
                                        <div className="flex items-center gap-1.5 text-gray-500 text-sm">
                                            <MapPin className="w-3.5 h-3.5" />
                                            {chef.city}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2 mb-6">
                                        {chef.cuisine.slice(0, 3).map(c => (
                                            <span key={c} className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold">
                                                {c}
                                            </span>
                                        ))}
                                    </div>

                                    <div className="space-y-4">
                                        <p className="text-gray-600 text-sm leading-relaxed">
                                            {generateChefStory(chef)}
                                        </p>
                                        
                                        <div className="pt-4 border-t border-gray-50 flex items-center justify-between text-[10px] uppercase tracking-widest font-bold text-gray-400">
                                            <span>Niche: {chef.cuisine[0] || 'Artisan'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20">
                        <div className="inline-flex p-6 rounded-full bg-gray-100 text-gray-400 mb-6">
                            <ChefHat className="w-12 h-12" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">No chefs found</h3>
                        <p className="text-gray-500 max-w-sm mx-auto">Try searching for a different cuisine or city.</p>
                    </div>
                )}
            </main>

            {/* Impact Section */}
            <section className="bg-white border-y border-gray-100 py-24">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-6">Beyond the Kitchen</h2>
                        <p className="text-xl text-gray-500 max-w-2xl mx-auto">
                            We're building more than a food platform. We're creating opportunities for local talent to shine and for communities to connect.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <div className="p-8 rounded-3xl bg-gray-50 border border-gray-100 hover:border-blue-500 hover:shadow-lg transition-all text-center group">
                            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                                <Globe className="w-8 h-8" />
                            </div>
                            <h4 className="text-lg font-bold text-gray-900 mb-3">Cultural Diversification</h4>
                            <p className="text-gray-500 text-sm leading-relaxed">Showcasing the rich tapestry of global cuisines preserved by local families.</p>
                        </div>
                        <div className="p-8 rounded-3xl bg-gray-50 border border-gray-100 hover:border-blue-500 hover:shadow-lg transition-all text-center group">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                                <Heart className="w-8 h-8" />
                            </div>
                            <h4 className="text-lg font-bold text-gray-900 mb-3">Sustainable Choices</h4>
                            <p className="text-gray-500 text-sm leading-relaxed">Fewer food miles and authentic home-style portions minimize waste.</p>
                        </div>
                        <div className="p-8 rounded-3xl bg-gray-50 border border-gray-100 hover:border-blue-500 hover:shadow-lg transition-all text-center group">
                            <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                                <Users className="w-8 h-8" />
                            </div>
                            <h4 className="text-lg font-bold text-gray-900 mb-3">Empowering Talent</h4>
                            <p className="text-gray-500 text-sm leading-relaxed">Providing a digital presence for home cooks to build their personal brand.</p>
                        </div>
                        <div className="p-8 rounded-3xl bg-gray-50 border border-gray-100 hover:border-blue-500 hover:shadow-lg transition-all text-center group">
                            <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                                <ShieldCheck className="w-8 h-8" />
                            </div>
                            <h4 className="text-lg font-bold text-gray-900 mb-3">Community Link</h4>
                            <p className="text-gray-500 text-sm leading-relaxed">Connecting neighbors through the universal language of good food.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-24 bg-gray-50">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <h3 className="text-3xl font-extrabold text-gray-900 mb-6">Ready to taste something authentic?</h3>
                    <p className="text-lg text-gray-600 mb-10">Join thousands of customers who support local home chefs every single day.</p>
                    <a 
                        href="https://apps.apple.com/app/homemade/id6475653457" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-full font-bold shadow-xl hover:bg-blue-700 transition-all active:scale-95"
                    >
                        Download the Homemade App
                    </a>
                </div>
            </section>

            <footer className="bg-white border-t border-gray-100 py-10 mt-auto">
                <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-400">
                    &copy; {new Date().getFullYear()} Homemade Platform. Rooted in community.
                </div>
            </footer>
        </div>
    );
}
