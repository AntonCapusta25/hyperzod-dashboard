import { useState, useEffect } from 'react';
import { useSegments } from '../hooks/useSegments';
import type { Segment, SegmentRule } from '../../../types/marketing';
import { Plus, Edit2, Trash2, Users, ArrowLeft, Save, RefreshCw, X, UserPlus } from 'lucide-react';
import ClientPicker from '../../../components/ClientPicker';
import { getSegmentMembers, bulkAddClientsToSegment, removeClientFromSegment } from '../api/segments';

const AVAILABLE_FIELDS = [
    { label: 'Total Orders', value: 'total_orders', type: 'number' },
    { label: 'Total Spent', value: 'total_spent', type: 'number' },
    { label: 'City', value: 'city', type: 'text' },
    { label: 'Last Order Date', value: 'last_order_date', type: 'date' },
];

const OPERATORS = [
    { label: 'Equals', value: 'equals' },
    { label: 'Greater Than', value: 'greater_than' },
    { label: 'Less Than', value: 'less_than' },
    { label: 'Contains', value: 'contains' },
];

export default function SegmentsPage() {
    const { segments, loading, error, addSegment, editSegment, removeSegment, getPreviewCount } = useSegments();
    const [isEditing, setIsEditing] = useState(false);
    const [currentSegment, setCurrentSegment] = useState<Partial<Segment>>({});
    const [previewCount, setPreviewCount] = useState<number | null>(null);
    const [calculating, setCalculating] = useState(false);
    const [saving, setSaving] = useState(false);

    // Static segment state
    const [showClientPicker, setShowClientPicker] = useState(false);
    const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
    const [segmentMembers, setSegmentMembers] = useState<any[]>([]);
    const [loadingMembers, setLoadingMembers] = useState(false);

    // Load segment members when editing a static segment
    useEffect(() => {
        if (isEditing && currentSegment.id && currentSegment.type === 'static') {
            loadSegmentMembers();
        }
    }, [isEditing, currentSegment.id, currentSegment.type]);

    const loadSegmentMembers = async () => {
        if (!currentSegment.id) return;

        setLoadingMembers(true);
        try {
            const members = await getSegmentMembers(currentSegment.id);
            setSegmentMembers(members);
            setSelectedClientIds(members.map((m: any) => m.client_id));
        } catch (err) {
            console.error('Failed to load segment members:', err);
        } finally {
            setLoadingMembers(false);
        }
    };

    const handleCreate = () => {
        setCurrentSegment({
            name: '',
            description: '',
            type: 'dynamic',
            filter_rules: {
                operator: 'AND',
                rules: []
            }
        });
        setPreviewCount(null);
        setSelectedClientIds([]);
        setSegmentMembers([]);
        setIsEditing(true);
    };

    const handleEdit = (segment: Segment) => {
        setCurrentSegment(JSON.parse(JSON.stringify(segment))); // Deep copy
        setPreviewCount(segment.client_count);
        setIsEditing(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this segment?')) {
            await removeSegment(id);
        }
    };

    const handleSave = async () => {
        if (!currentSegment.name) {
            alert('Please enter a segment name');
            return;
        }

        setSaving(true);
        try {
            let count = 0;

            if (currentSegment.type === 'static') {
                // For static segments, count is based on selected clients
                count = selectedClientIds.length;
            } else {
                // For dynamic segments, calculate based on rules
                count = await getPreviewCount(currentSegment.filter_rules);
            }

            const segmentToSave = { ...currentSegment, client_count: count };

            let savedSegment;
            if (currentSegment.id) {
                savedSegment = await editSegment(currentSegment.id, segmentToSave);
            } else {
                savedSegment = await addSegment(segmentToSave);
            }

            // For static segments, save the client selections
            if (currentSegment.type === 'static' && savedSegment.id) {
                await bulkAddClientsToSegment(savedSegment.id, selectedClientIds);
            }

            setIsEditing(false);
            setCurrentSegment({});
            setSelectedClientIds([]);
            setSegmentMembers([]);
        } catch (err) {
            console.error(err);
            alert('Failed to save segment');
        } finally {
            setSaving(false);
        }
    };

    const handleClientSelectionChange = (clientIds: string[]) => {
        setSelectedClientIds(clientIds);
        setPreviewCount(clientIds.length);
    };

    const handleRemoveClient = async (clientId: string) => {
        if (currentSegment.id) {
            try {
                await removeClientFromSegment(currentSegment.id, clientId);
                await loadSegmentMembers();
                setSelectedClientIds(prev => prev.filter(id => id !== clientId));
            } catch (err) {
                console.error('Failed to remove client:', err);
            }
        } else {
            setSelectedClientIds(prev => prev.filter(id => id !== clientId));
        }
    };

    const addRule = () => {
        setCurrentSegment(prev => ({
            ...prev,
            filter_rules: {
                ...prev.filter_rules!,
                rules: [
                    ...(prev.filter_rules?.rules || []),
                    { field: 'total_orders', operator: 'greater_than', value: '' }
                ]
            }
        }));
    };

    const removeRule = (index: number) => {
        setCurrentSegment(prev => ({
            ...prev,
            filter_rules: {
                ...prev.filter_rules!,
                rules: prev.filter_rules!.rules.filter((_, i) => i !== index)
            }
        }));
    };

    const updateRule = (index: number, field: keyof SegmentRule, value: any) => {
        const newRules = [...(currentSegment.filter_rules?.rules || [])];
        newRules[index] = { ...newRules[index], [field]: value };

        setCurrentSegment(prev => ({
            ...prev,
            filter_rules: {
                ...prev.filter_rules!,
                rules: newRules
            }
        }));
    };

    const handleCalculatePreview = async () => {
        setCalculating(true);
        try {
            const count = await getPreviewCount(currentSegment.filter_rules);
            setPreviewCount(count);
        } catch (err) {
            console.error(err);
        } finally {
            setCalculating(false);
        }
    };

    if (loading && !isEditing) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error && !isEditing) {
        return (
            <div className="p-8 text-center text-red-600">
                Error loading segments: {error.message}
            </div>
        );
    }

    // BUILDER VIEW
    if (isEditing) {
        return (
            <div className="p-6 max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <button
                        onClick={() => setIsEditing(false)}
                        className="flex items-center text-gray-500 hover:text-gray-900"
                    >
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        Back to Segments
                    </button>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setIsEditing(false)}
                            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {saving ? 'Saving...' : 'Save Segment'}
                        </button>
                    </div>
                </div>

                {/* Main Form */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Segment Name
                                </label>
                                <input
                                    type="text"
                                    value={currentSegment.name || ''}
                                    onChange={e => setCurrentSegment(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="e.g., High Value Customers in Amsterdam"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Description (Optional)
                                </label>
                                <textarea
                                    value={currentSegment.description || ''}
                                    onChange={e => setCurrentSegment(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="What defines this segment?"
                                    rows={2}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            {/* Segment Type Selector */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Segment Type
                                </label>
                                <div className="flex gap-4">
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            value="dynamic"
                                            checked={currentSegment.type === 'dynamic'}
                                            onChange={() => setCurrentSegment(prev => ({ ...prev, type: 'dynamic' }))}
                                            className="mr-2"
                                        />
                                        <span className="text-sm text-gray-700">Dynamic (Rule-based)</span>
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            value="static"
                                            checked={currentSegment.type === 'static'}
                                            onChange={() => setCurrentSegment(prev => ({ ...prev, type: 'static' }))}
                                            className="mr-2"
                                        />
                                        <span className="text-sm text-gray-700">Static (Manual selection)</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Dynamic Rules Builder */}
                    {currentSegment.type === 'dynamic' && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Filter Rules</h3>
                                <button
                                    onClick={addRule}
                                    className="flex items-center px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    <Plus className="w-4 h-4 mr-1" />
                                    Add Rule
                                </button>
                            </div>

                            {currentSegment.filter_rules?.rules.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    No rules yet. Click "Add Rule" to get started.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {currentSegment.filter_rules?.rules.map((rule, index) => (
                                        <div key={index} className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                                            <select
                                                value={rule.field}
                                                onChange={e => updateRule(index, 'field', e.target.value)}
                                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            >
                                                {AVAILABLE_FIELDS.map(field => (
                                                    <option key={field.value} value={field.value}>
                                                        {field.label}
                                                    </option>
                                                ))}
                                            </select>

                                            <select
                                                value={rule.operator}
                                                onChange={e => updateRule(index, 'operator', e.target.value)}
                                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            >
                                                {OPERATORS.map(op => (
                                                    <option key={op.value} value={op.value}>
                                                        {op.label}
                                                    </option>
                                                ))}
                                            </select>

                                            <input
                                                type="text"
                                                value={rule.value}
                                                onChange={e => updateRule(index, 'value', e.target.value)}
                                                placeholder="Value"
                                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            />

                                            <button
                                                onClick={() => removeRule(index)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Preview Count */}
                            <div className="mt-6 pt-6 border-t border-gray-200">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm text-gray-500">Estimated Matches</div>
                                        <div className="text-2xl font-bold text-gray-900">
                                            {previewCount !== null ? previewCount : '—'}
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleCalculatePreview}
                                        disabled={calculating}
                                        className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50"
                                    >
                                        <RefreshCw className={`w-4 h-4 mr-2 ${calculating ? 'animate-spin' : ''}`} />
                                        {calculating ? 'Calculating...' : 'Calculate'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Static Client Selection */}
                    {currentSegment.type === 'static' && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Selected Clients</h3>
                                <button
                                    onClick={() => setShowClientPicker(true)}
                                    className="flex items-center px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    <UserPlus className="w-4 h-4 mr-1" />
                                    Add Clients
                                </button>
                            </div>

                            {loadingMembers ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                </div>
                            ) : selectedClientIds.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    No clients selected. Click "Add Clients" to get started.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {segmentMembers.map((member: any) => (
                                        <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div>
                                                <div className="font-medium text-gray-900">
                                                    {member.clients?.full_name || `${member.clients?.first_name} ${member.clients?.last_name}`}
                                                </div>
                                                <div className="text-sm text-gray-500">{member.clients?.email}</div>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveClient(member.client_id)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Client Count */}
                            <div className="mt-6 pt-6 border-t border-gray-200">
                                <div className="text-sm text-gray-500">Total Clients</div>
                                <div className="text-2xl font-bold text-gray-900">{selectedClientIds.length}</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Client Picker Modal */}
                {showClientPicker && (
                    <ClientPicker
                        selectedClientIds={selectedClientIds}
                        onSelectionChange={handleClientSelectionChange}
                        onClose={() => setShowClientPicker(false)}
                    />
                )}
            </div>
        );
    }

    // LIST VIEW
    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Segments</h1>
                    <p className="text-gray-600 mt-2">
                        Create customer segments for targeted campaigns
                    </p>
                </div>
                <button
                    onClick={handleCreate}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    New Segment
                </button>
            </div>

            {segments.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No segments yet</h3>
                    <p className="text-gray-500 mb-6 max-w-md mx-auto">
                        Create your first segment to organize and target specific groups of customers.
                    </p>
                    <button
                        onClick={handleCreate}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Create Segment
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {segments.map(segment => (
                        <div key={segment.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow p-6 group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="font-semibold text-gray-900 text-lg">
                                            {segment.name}
                                        </h3>
                                        <span className={`px-2 py-0.5 text-xs rounded-full ${segment.type === 'static'
                                            ? 'bg-purple-100 text-purple-700'
                                            : 'bg-blue-100 text-blue-700'
                                            }`}>
                                            {segment.type}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500 line-clamp-2">
                                        {segment.description || 'No description'}
                                    </p>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleEdit(segment)}
                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(segment.id)}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                <div className="flex items-center text-gray-600">
                                    <Users className="w-4 h-4 mr-1" />
                                    <span className="text-sm font-medium">{segment.client_count || 0} clients</span>
                                </div>
                                <span className="text-xs text-gray-400">
                                    {new Date(segment.updated_at).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
