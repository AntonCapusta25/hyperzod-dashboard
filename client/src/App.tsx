import { useEffect, useState } from 'react';
import { StatsCards } from './components/StatsCards';
import { MerchantTable } from './components/MerchantTable';
import { MapView } from './components/MapView';
import { fetchMerchants } from './api';
import type { MerchantsResponse } from './types';
import { RefreshCw, ChefHat, LayoutDashboard, Map } from 'lucide-react';

type Tab = 'overview' | 'map';

function App() {
  const [data, setData] = useState<MerchantsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchMerchants();
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      console.error('Error loading merchants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg">
                <ChefHat className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Hyperzod Dashboard</h1>
                <p className="text-sm text-gray-600 mt-1">Chef Management & Analytics</p>
              </div>
            </div>
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="mt-6 flex gap-2 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors border-b-2 ${activeTab === 'overview'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Overview
            </button>
            <button
              onClick={() => setActiveTab('map')}
              className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors border-b-2 ${activeTab === 'map'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
            >
              <Map className="w-4 h-4" />
              Map
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800 font-medium mb-2">Error loading data</p>
            <p className="text-red-600 text-sm mb-4">{error}</p>
            <button
              onClick={loadData}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <>
                <StatsCards
                  stats={data?.stats || { total: 0, published: 0, unpublished: 0, online: 0 }}
                  loading={loading}
                />
                <MerchantTable
                  merchants={data?.merchants || []}
                  loading={loading}
                />
              </>
            )}
            {activeTab === 'map' && (
              <MapView
                merchants={data?.merchants || []}
                loading={loading}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 py-6 text-center text-gray-600 text-sm">
        <p>Hyperzod Chef Dashboard © 2026</p>
      </footer>
    </div>
  );
}

export default App;
