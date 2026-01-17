import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, DollarSign } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface ManualRevenueEntry {
    id: string;
    entry_date: string;
    entry_type: 'catering' | 'revolut';
    amount: number;
    description: string | null;
    created_at: string;
}

export default function ManualRevenueManager() {
    const [entries, setEntries] = useState<ManualRevenueEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingEntry, setEditingEntry] = useState<ManualRevenueEntry | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        entry_date: new Date().toISOString().split('T')[0],
        entry_type: 'catering' as 'catering' | 'revolut',
        amount: '',
        description: ''
    });

    useEffect(() => {
        loadEntries();
    }, []);

    const loadEntries = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('manual_revenue_entries')
                .select('*')
                .order('entry_date', { ascending: false });

            if (error) throw error;
            setEntries(data || []);
        } catch (error) {
            console.error('Error loading manual revenue entries:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const entryData = {
                entry_date: formData.entry_date,
                entry_type: formData.entry_type,
                amount: parseFloat(formData.amount),
                description: formData.description || null
            };

            if (editingEntry) {
                const { error } = await supabase
                    .from('manual_revenue_entries')
                    .update(entryData)
                    .eq('id', editingEntry.id);

                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('manual_revenue_entries')
                    .insert([entryData]);

                if (error) throw error;
            }

            // Reset form
            setFormData({
                entry_date: new Date().toISOString().split('T')[0],
                entry_type: 'catering',
                amount: '',
                description: ''
            });
            setShowForm(false);
            setEditingEntry(null);
            loadEntries();
        } catch (error) {
            console.error('Error saving entry:', error);
            alert('Failed to save entry');
        }
    };

    const handleEdit = (entry: ManualRevenueEntry) => {
        setEditingEntry(entry);
        setFormData({
            entry_date: entry.entry_date,
            entry_type: entry.entry_type,
            amount: entry.amount.toString(),
            description: entry.description || ''
        });
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this entry?')) return;

        try {
            const { error } = await supabase
                .from('manual_revenue_entries')
                .delete()
                .eq('id', id);

            if (error) throw error;
            loadEntries();
        } catch (error) {
            console.error('Error deleting entry:', error);
            alert('Failed to delete entry');
        }
    };

    const cancelEdit = () => {
        setShowForm(false);
        setEditingEntry(null);
        setFormData({
            entry_date: new Date().toISOString().split('T')[0],
            entry_type: 'catering',
            amount: '',
            description: ''
        });
    };

    // Calculate totals
    const cateringTotal = entries
        .filter(e => e.entry_type === 'catering')
        .reduce((sum, e) => sum + e.amount, 0);

    const revolutTotal = entries
        .filter(e => e.entry_type === 'revolut')
        .reduce((sum, e) => sum + e.amount, 0);

    return (
        <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Manual Revenue Entries</h2>
                    <p className="text-sm text-gray-600 mt-1">Track catering orders and Revolut sales</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Add Entry
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                    <div className="flex items-center gap-2 text-purple-700 mb-2">
                        <DollarSign className="w-5 h-5" />
                        <span className="text-sm font-medium">Catering Revenue</span>
                    </div>
                    <p className="text-2xl font-bold text-purple-900">€{cateringTotal.toFixed(2)}</p>
                    <p className="text-xs text-purple-600 mt-1">Our cut: €{(cateringTotal * 0.20).toFixed(2)} (20%)</p>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center gap-2 text-blue-700 mb-2">
                        <DollarSign className="w-5 h-5" />
                        <span className="text-sm font-medium">Revolut Sales</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-900">€{revolutTotal.toFixed(2)}</p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                    <div className="flex items-center gap-2 text-green-700 mb-2">
                        <DollarSign className="w-5 h-5" />
                        <span className="text-sm font-medium">Total Manual Revenue</span>
                    </div>
                    <p className="text-2xl font-bold text-green-900">€{(cateringTotal + revolutTotal).toFixed(2)}</p>
                </div>
            </div>

            {/* Add/Edit Form */}
            {showForm && (
                <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-6 mb-6 border border-gray-200">
                    <h3 className="text-lg font-semibold mb-4">
                        {editingEntry ? 'Edit Entry' : 'Add New Entry'}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Date <span className="text-xs text-gray-500">(YYYY-MM-DD format)</span>
                            </label>
                            <input
                                type="date"
                                value={formData.entry_date}
                                onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                                placeholder="2024-12-16"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Example: 2024-12-16 for December 16, 2024
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Type
                            </label>
                            <select
                                value={formData.entry_type}
                                onChange={(e) => setFormData({ ...formData, entry_type: e.target.value as 'catering' | 'revolut' })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            >
                                <option value="catering">Catering</option>
                                <option value="revolut">Revolut</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Amount (€)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="0.00"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Description (optional)
                            </label>
                            <input
                                type="text"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="e.g., Corporate event"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 mt-4">
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            {editingEntry ? 'Update Entry' : 'Add Entry'}
                        </button>
                        <button
                            type="button"
                            onClick={cancelEdit}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {/* Entries Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                    Loading...
                                </td>
                            </tr>
                        ) : entries.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                    No entries yet. Click "Add Entry" to get started.
                                </td>
                            </tr>
                        ) : (
                            entries.map((entry) => (
                                <tr key={entry.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm text-gray-900">
                                        {new Date(entry.entry_date).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${entry.entry_type === 'catering'
                                            ? 'bg-purple-100 text-purple-800'
                                            : 'bg-blue-100 text-blue-800'
                                            }`}>
                                            {entry.entry_type.charAt(0).toUpperCase() + entry.entry_type.slice(1)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                                        €{entry.amount.toFixed(2)}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600">
                                        {entry.description || '-'}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleEdit(entry)}
                                                className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                title="Edit"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(entry.id)}
                                                className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
