import React, { useState, useEffect } from 'react';
import {
    ShieldAlert,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Trash2
} from 'lucide-react';
import {
    fetchBypassFlags,
    updateBypassFlagStatus,
    fetchAtRiskCustomers,
    fetchSecurityExceptions,
    addSecurityException,
    removeSecurityException
} from '../api/security';
import type {
    BypassFlag,
    ChurnAnalysisItem,
    BypassFlagStatus,
    SecurityException
} from '../../../types/marketing';

const SecurityDashboardPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'security' | 'retention' | 'exceptions'>('security');
    const [flags, setFlags] = useState<BypassFlag[]>([]);
    const [atRisk, setAtRisk] = useState<ChurnAnalysisItem[]>([]);
    const [exceptions, setExceptions] = useState<SecurityException[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            if (activeTab === 'security') {
                const data = await fetchBypassFlags();
                setFlags(data);
            } else if (activeTab === 'retention') {
                const data = await fetchAtRiskCustomers(30);
                setAtRisk(data);
            } else if (activeTab === 'exceptions') {
                const data = await fetchSecurityExceptions();
                setExceptions(data);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (id: string, status: BypassFlagStatus) => {
        try {
            await updateBypassFlagStatus(id, status);
            setFlags(prev => prev.map(f => f.id === id ? { ...f, status } : f));
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        }
    };

    const handleAddException = async (flag: BypassFlag) => {
        if (!window.confirm(`Are you sure you want to permanently ignore security events for this customer/chef pair?`)) return;

        try {
            await addSecurityException({
                user_id: flag.user_id,
                merchant_id: flag.merchant_id,
                reason: `Marked as False Positive on ${new Date().toLocaleDateString()}`
            });
            // Mark as false positive automatically
            await handleStatusUpdate(flag.id, 'false_positive');
            alert('Added to ignore list.');
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        }
    };

    const handleRemoveException = async (id: string) => {
        if (!window.confirm('Remove this exception?')) return;
        try {
            await removeSecurityException(id);
            setExceptions(prev => prev.filter(e => e.id !== id));
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        }
    };

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Security & Retention</h1>
                    <p className="text-gray-500 mt-1">Manage platform integrity and customer churn risk.</p>
                </div>
                <div className="flex gap-2 p-1 bg-gray-100 rounded-xl self-start">
                    <button
                        onClick={() => setActiveTab('security')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'security' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Security Alerts
                    </button>
                    <button
                        onClick={() => setActiveTab('retention')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'retention' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Churn Risk
                    </button>
                    <button
                        onClick={() => setActiveTab('exceptions')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'exceptions' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Ignore List
                    </button>
                </div>
            </header>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm">{error}</p>
                </div>
            )}

            {activeTab === 'security' && (
                <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Detection Details</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Entity</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Evidence</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">Loading alerts...</td></tr>
                                ) : flags.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">No security alerts found.</td></tr>
                                ) : flags.map(flag => (
                                    <tr key={flag.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${flag.flag_type === 'contact_leak' || flag.flag_type === 'poached_customer' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                                                    <ShieldAlert className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-gray-900 uppercase">{flag.flag_type.replace('_', ' ')}</div>
                                                    <div className="text-xs text-gray-500">{new Date(flag.created_at).toLocaleDateString()}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900 font-medium">{flag.client?.full_name || 'Chef-level Flag'}</div>
                                            <div className="text-xs text-gray-500">Merchant ID: {flag.merchant_id}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs text-gray-600 bg-gray-100 p-2 rounded-lg max-w-xs truncate">
                                                {JSON.stringify(flag.evidence_data)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium uppercase ${flag.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                                                    flag.status === 'confirmed' ? 'bg-red-50 text-red-700' :
                                                        flag.status === 'false_positive' ? 'bg-blue-50 text-blue-700' :
                                                            'bg-green-50 text-green-700'
                                                }`}>
                                                {flag.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleStatusUpdate(flag.id, 'confirmed')}
                                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Mark as Confirmed"
                                                >
                                                    <CheckCircle className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleAddException(flag)}
                                                    className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                                                    title="Add to Ignore List"
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {activeTab === 'retention' && (
                <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">History</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Churn Risk</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Order</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">Analyzing churn...</td></tr>
                                ) : atRisk.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">No at-risk customers found.</td></tr>
                                ) : atRisk.map(item => (
                                    <tr key={item.p_user_id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-semibold text-gray-900">{item.p_full_name}</div>
                                            <div className="text-xs text-gray-500">{item.p_email || item.p_mobile}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900 font-medium">PKR {item.p_total_spent.toLocaleString()}</div>
                                            <div className="text-xs text-gray-500">{item.p_total_orders} total orders</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${item.p_days_since_last > 60 ? 'bg-red-500' : 'bg-amber-500'}`} />
                                                <span className="text-sm text-gray-900 font-medium">{item.p_days_since_last} days inactive</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(item.p_last_order_date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right whitespace-nowrap">
                                            <button
                                                className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                                            >
                                                Nudge
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {activeTab === 'exceptions' && (
                <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Entity</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Reason</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Added On</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-500">Loading list...</td></tr>
                                ) : exceptions.length === 0 ? (
                                    <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-500">The ignore list is empty.</td></tr>
                                ) : exceptions.map(ex => (
                                    <tr key={ex.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-semibold text-gray-900">
                                                {ex.user_id && ex.merchant_id ? `Pair: User ${ex.user_id} @ ${ex.merchant_id}` :
                                                    ex.user_id ? `Global User: ${ex.user_id}` :
                                                        `Global Merchant: ${ex.merchant_id}`}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 italic">
                                            {ex.reason || 'No reason provided'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {new Date(ex.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleRemoveException(ex.id)}
                                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}
        </div>
    );
};

export default SecurityDashboardPage;
