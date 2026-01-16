import { useLocation, useNavigate } from 'react-router-dom';
import CampaignsPage from './CampaignsPage';
import TemplatesPage from './TemplatesPage';
import SegmentsPage from './SegmentsPage';

export default function EmailCampaignsPage() {
    const location = useLocation();
    const navigate = useNavigate();

    // Determine active tab from URL
    const activeSubTab = location.pathname.includes('/templates')
        ? 'templates'
        : location.pathname.includes('/segments')
            ? 'segments'
            : 'campaigns';

    return (
        <div>
            {/* Sub-tabs */}
            <div className="mb-6 border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => navigate('/dashboard/campaigns/list')}
                        className={`${activeSubTab === 'campaigns'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        Campaigns
                    </button>
                    <button
                        onClick={() => navigate('/dashboard/campaigns/templates')}
                        className={`${activeSubTab === 'templates'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        Templates
                    </button>
                    <button
                        onClick={() => navigate('/dashboard/campaigns/segments')}
                        className={`${activeSubTab === 'segments'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        Segments
                    </button>
                </nav>
            </div>

            {/* Content */}
            {activeSubTab === 'campaigns' && <CampaignsPage />}
            {activeSubTab === 'templates' && <TemplatesPage />}
            {activeSubTab === 'segments' && <SegmentsPage />}
        </div>
    );
}
