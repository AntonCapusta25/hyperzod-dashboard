import React, { useState, useEffect } from 'react';
import {
    ShieldAlert,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Trash2,
    ChefHat,
    User,
    Calendar,
    DollarSign,
    AlertCircle,
    MessageSquare,
    TrendingDown
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

    const formatEvidence = (flag: BypassFlag): React.ReactNode => {
        const data = flag.evidence_data;
        const chefName = flag.chef?.name || `Chef ${flag.merchant_id}`;

        switch (flag.flag_type) {
            case 'poached_customer':
                return (
                    <div className="space-y-1">
                        <p className="text-sm text-gray-700 leading-snug">
                            Customer stopped ordering from <span className="font-bold text-gray-900 border-b border-gray-200">{chefName}</span> {data.days_since_merchant} days ago.
                        </p>
                        <p className="text-xs text-gray-500 flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md w-fit">
                            <AlertCircle className="w-3 h-3 text-amber-500" /> Still ordering from other chefs on the platform.
                        </p>
                    </div>
                );
            case 'contact_leak':
                return (
                    <div className="space-y-1">
                        <p className="text-sm text-gray-700 leading-snug">
                            Potential contact details found in order <span className="font-bold text-blue-600">#{data.p_order_id}</span>.
                        </p>
                        <div className="text-xs bg-amber-50 text-amber-800 p-2 rounded-lg border border-amber-100 italic flex items-start gap-2">
                            <MessageSquare className="w-3 h-3 mt-0.5 opacity-50" />
                            "{data.leaked_note}"
                        </div>
                    </div>
                );
            case 'aov_crash':
                return (
                    <div className="space-y-1">
                        <p className="text-sm text-gray-700 leading-snug">
                            Significant order value drop detected for <span className="font-bold text-gray-900">{chefName}</span>.
                        </p>
                        <div className="flex items-center gap-3 text-xs text-gray-500 bg-red-50 p-1.5 rounded-lg border border-red-100 w-fit">
                            <span className="flex items-center gap-1 font-bold text-red-600">
                                <TrendingDown className="w-3 h-3" /> {data.drop_percentage}% drop
                            </span>
                            <span className="opacity-60">Avg: PKR {Math.round(data.prev_avg_amount).toLocaleString()}</span>
                            <span className="opacity-60">Last: PKR {Math.round(data.last_order_amount).toLocaleString()}</span>
                        </div>
                    </div>
                );
            case 'high_churn_chef':
                return (
                    <div className="space-y-1">
                        <p className="text-sm text-gray-700 leading-snug">
                            High churn rate detected: <span className="font-bold text-red-600">{data.churn_rate}%</span> of customers never return.
                        </p>
                        <p className="text-xs text-gray-500 flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md w-fit">
                            <User className="w-3 h-3 opacity-50" /> {data.one_time_customers} single-order customers out of {data.total_customers}.
                        </p>
                    </div>
                );
            default:
                return (
                    <div className="text-xs text-gray-400 font-mono bg-gray-50 p-2 rounded truncate max-w-[200px]">
                        {JSON.stringify(data)}
                    </div>
                );
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
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">Security & Retention Dashboard</h1>
                    <p className="text-gray-500 mt-0.5 text-sm font-medium">Protect platform revenue and monitor customer health.</p>
                </div>
                <div className="flex gap-1.5 p-1.5 bg-gray-50 rounded-2xl border border-gray-100 self-start">
                    <button
                        onClick={() => setActiveTab('security')}
                        className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'security' ? 'bg-white text-blue-600 shadow-md ring-1 ring-black/5' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                    >
                        Security Alerts
                    </button>
                    <button
                        onClick={() => setActiveTab('retention')}
                        className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'retention' ? 'bg-white text-blue-600 shadow-md ring-1 ring-black/5' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                    >
                        Churn Risk
                    </button>
                    <button
                        onClick={() => setActiveTab('exceptions')}
                        className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'exceptions' ? 'bg-white text-blue-600 shadow-md ring-1 ring-black/5' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                    >
                        Ignore List
                    </button>
                </div>
            </header>

            {error && (
                <div className="bg-red-50 border border-red-100 text-red-800 p-5 rounded-2xl flex items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="p-2 bg-red-100 rounded-full text-red-600"><AlertTriangle className="w-5 h-5" /></div>
                    <p className="text-sm font-semibold">{error}</p>
                </div>
            )}

            {activeTab === 'security' && (
                <section className="bg-white rounded-3xl shadow-xl shadow-gray-100/50 border border-gray-100 overflow-hidden animate-in fade-in duration-500">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-[0.1em]">Detection Event</th>
                                    <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-[0.1em]">Entity under Review</th>
                                    <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-[0.1em]">Analysis Evidence</th>
                                    <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-[0.1em]">Status</th>
                                    <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-[0.1em] text-right">Review Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {loading ? (
                                    <tr><td colSpan={5} className="px-6 py-16 text-center text-gray-400 font-medium">Scanning for threats...</td></tr>
                                ) : flags.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-16 text-center text-gray-400 font-medium italic">No security anomalies detected.</td></tr>
                                ) : flags.map(flag => (
                                    <tr key={flag.id} className="group hover:bg-gray-50/50 transition-all duration-300">
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-2xl shadow-sm ${flag.flag_type === 'contact_leak' || flag.flag_type === 'poached_customer' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                                                    <ShieldAlert className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-black text-gray-900 uppercase tracking-tight leading-none mb-1">{flag.flag_type.replace(/_/g, ' ')}</div>
                                                    <div className="text-[11px] text-gray-400 font-bold flex items-center gap-1.5"><Calendar className="w-3 h-3" /> {new Date(flag.created_at).toLocaleDateString()}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            {flag.client ? (
                                                <div className="flex items-center gap-3 bg-blue-50/50 p-2.5 rounded-2xl border border-blue-100/50">
                                                    <div className="p-2 bg-blue-100/50 text-blue-600 rounded-xl shadow-sm">
                                                        <User className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm text-gray-900 font-extrabold leading-none mb-1">{flag.client.full_name}</div>
                                                        <div className="text-[10px] font-black uppercase text-blue-600/60 tracking-wider">Customer Target</div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-3 bg-purple-50/50 p-2.5 rounded-2xl border border-purple-100/50">
                                                    <div className="p-2 bg-purple-100/50 text-purple-600 rounded-xl shadow-sm">
                                                        <ChefHat className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm text-gray-900 font-extrabold leading-none mb-1">{flag.chef?.name || 'Unknown Chef'}</div>
                                                        <div className="text-[10px] font-black uppercase text-purple-600/60 tracking-wider">Chef Practice Review</div>
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-5 max-w-sm">
                                            {formatEvidence(flag)}
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm ${
                                                flag.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                flag.status === 'confirmed' ? 'bg-red-50 text-red-700 border-red-200' :
                                                flag.status === 'false_positive' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                'bg-green-50 text-green-700 border-green-200'
                                            }`}>
                                                {flag.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-3 translate-x-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                                <button
                                                    onClick={() => handleStatusUpdate(flag.id, 'confirmed')}
                                                    className="p-3 text-red-600 hover:bg-red-50 rounded-2xl transition-all hover:scale-110 shadow-sm border border-red-100 active:scale-95"
                                                    title="Confirm Violation"
                                                >
                                                    <CheckCircle className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleAddException(flag)}
                                                    className="p-3 text-gray-400 hover:bg-gray-100 rounded-2xl transition-all hover:scale-110 shadow-sm border border-gray-100 active:scale-95"
                                                    title="Whitelist / Ignore"
                                                >
                                                    <XCircle className="w-5 h-5" />
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
                <section className="bg-white rounded-3xl shadow-xl shadow-gray-100/50 border border-gray-100 overflow-hidden animate-in fade-in duration-500">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-[0.1em]">Customer Relationship</th>
                                    <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-[0.1em]">Value Metrics</th>
                                    <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-[0.1em]">Risk Assessment</th>
                                    <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-[0.1em]">Last Activity</th>
                                    <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-[0.1em] text-right">Engagement</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {loading ? (
                                    <tr><td colSpan={5} className="px-6 py-16 text-center text-gray-400 font-medium">Gathering retention data...</td></tr>
                                ) : atRisk.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-16 text-center text-gray-400 font-medium italic">All customers appear active and healthy.</td></tr>
                                ) : atRisk.map(item => (
                                    <tr key={item.p_user_id} className="group hover:bg-gray-50/50 transition-all duration-300">
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <div className="text-sm font-black text-gray-900 leading-none mb-1">{item.p_full_name}</div>
                                            <div className="text-xs text-gray-400 font-medium truncate max-w-[200px]">{item.p_email || item.p_mobile}</div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="text-sm text-gray-900 font-black flex items-center gap-1.5 leading-none mb-1">
                                                <DollarSign className="w-4 h-4 text-green-500" />
                                                {item.p_total_spent.toLocaleString()}
                                            </div>
                                            <div className="text-xs font-bold text-gray-400">{item.p_total_orders} total orders</div>
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-3 h-3 rounded-full animate-pulse shadow-sm ${item.p_days_since_last > 60 ? 'bg-red-500 ring-4 ring-red-100' : 'bg-amber-500 ring-4 ring-amber-100'}`} />
                                                <span className="text-sm text-gray-950 font-black">{item.p_days_since_last} days inactive</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap text-xs text-gray-500 font-bold flex items-center gap-2 mt-2">
                                            <Calendar className="w-4 h-4 opacity-40" />
                                            {new Date(item.p_last_order_date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-5 text-right whitespace-nowrap">
                                            <button
                                                className="px-6 py-2.5 bg-gray-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg hover:shadow-blue-500/25 active:scale-95"
                                            >
                                                Trigger Nudge
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
                <section className="bg-white rounded-3xl shadow-xl shadow-gray-100/50 border border-gray-100 overflow-hidden animate-in fade-in duration-500">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-[0.1em]">Whitelisted Entity</th>
                                    <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-[0.1em]">Exclusion Context</th>
                                    <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-[0.1em]">Creation Date</th>
                                    <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-[0.1em] text-right">Access Controls</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {loading ? (
                                    <tr><td colSpan={4} className="px-6 py-16 text-center text-gray-400 font-medium">Recalling exclusions...</td></tr>
                                ) : exceptions.length === 0 ? (
                                    <tr><td colSpan={4} className="px-6 py-16 text-center text-gray-400 font-medium italic">No active exceptions found.</td></tr>
                                ) : exceptions.map(ex => (
                                    <tr key={ex.id} className="group hover:bg-gray-50/50 transition-all duration-300">
                                        <td className="px-6 py-5">
                                            <div className="text-sm font-black text-gray-900 flex items-center gap-3">
                                                {ex.user_id && ex.merchant_id ? (
                                                    <div className="flex -space-x-3">
                                                        <div className="z-10 bg-blue-50 text-blue-600 p-2.5 rounded-2xl border-4 border-white shadow-sm"><User className="w-3.5 h-3.5" /></div>
                                                        <div className="bg-purple-50 text-purple-600 p-2.5 rounded-2xl border-4 border-white shadow-sm"><ChefHat className="w-3.5 h-3.5" /></div>
                                                    </div>
                                                ) : ex.user_id ? (
                                                    <div className="bg-blue-50 text-blue-600 p-2.5 rounded-2xl border-4 border-white shadow-sm"><User className="w-4 h-4" /></div>
                                                ) : (
                                                    <div className="bg-purple-50 text-purple-600 p-2.5 rounded-2xl border-4 border-white shadow-sm"><ChefHat className="w-4 h-4" /></div>
                                                )}
                                                <div>
                                                    <div className="leading-none mb-1">{ex.user_id && ex.merchant_id ? 'Targeted Pair' : ex.user_id ? 'Global Client' : 'Global Chef'}</div>
                                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                                        {ex.user_id && ex.merchant_id ? `Client ${ex.user_id} @ ${ex.merchant_id}` :
                                                            ex.user_id ? `Hyperzod ID: ${ex.user_id}` : `Merchant ID: ${ex.merchant_id}`}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="text-[13px] text-gray-600 font-medium flex items-start gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100 max-w-md">
                                                <MessageSquare className="w-5 h-5 text-gray-300 mt-1 flex-shrink-0" />
                                                <span className="italic">"{ex.reason || 'Protected by administrative whitelist policy.'}"</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-xs text-gray-500 font-bold">
                                            {new Date(ex.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-5 text-right whitespace-nowrap">
                                            <button
                                                onClick={() => handleRemoveException(ex.id)}
                                                className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all shadow-sm border border-transparent hover:border-red-100 active:scale-95"
                                                title="Revoke Exception Access"
                                            >
                                                <Trash2 className="w-5 h-5" />
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
