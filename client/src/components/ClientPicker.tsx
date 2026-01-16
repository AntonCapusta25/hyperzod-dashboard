import { useState, useEffect } from 'react';
import { Search, X, Check } from 'lucide-react';
import { fetchClients } from '../modules/marketing/api/clients';
import type { Client } from '../types/marketing';

interface ClientPickerProps {
    selectedClientIds: string[];
    onSelectionChange: (clientIds: string[]) => void;
    onClose: () => void;
}

export default function ClientPicker({ selectedClientIds, onSelectionChange, onClose }: ClientPickerProps) {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [localSelection, setLocalSelection] = useState<Set<string>>(new Set(selectedClientIds));

    useEffect(() => {
        loadClients();
    }, [searchQuery]);

    const loadClients = async () => {
        try {
            setLoading(true);
            const response = await fetchClients(1, 100, { search: searchQuery });
            setClients(response.data);
        } catch (err) {
            console.error('Failed to load clients:', err);
        } finally {
            setLoading(false);
        }
    };

    const toggleClient = (clientId: string) => {
        const newSelection = new Set(localSelection);
        if (newSelection.has(clientId)) {
            newSelection.delete(clientId);
        } else {
            newSelection.add(clientId);
        }
        setLocalSelection(newSelection);
    };

    const handleSave = () => {
        onSelectionChange(Array.from(localSelection));
        onClose();
    };

    const selectAll = () => {
        const allIds = new Set(clients.map(c => c.id));
        setLocalSelection(allIds);
    };

    const clearAll = () => {
        setLocalSelection(new Set());
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Select Clients</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            {localSelection.size} client{localSelection.size !== 1 ? 's' : ''} selected
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Search & Actions */}
                <div className="p-6 border-b border-gray-200 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by name or email..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={selectAll}
                            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                        >
                            Select All
                        </button>
                        <button
                            onClick={clearAll}
                            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                        >
                            Clear All
                        </button>
                    </div>
                </div>

                {/* Client List */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : clients.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            No clients found
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {clients.map(client => (
                                <div
                                    key={client.id}
                                    onClick={() => toggleClient(client.id)}
                                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${localSelection.has(client.id)
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="font-medium text-gray-900">
                                                {client.full_name || `${client.first_name} ${client.last_name}`}
                                            </div>
                                            <div className="text-sm text-gray-500">{client.email}</div>
                                        </div>
                                        {localSelection.has(client.id) && (
                                            <div className="ml-4 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                                                <Check className="w-4 h-4 text-white" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Save Selection
                    </button>
                </div>
            </div>
        </div>
    );
}
