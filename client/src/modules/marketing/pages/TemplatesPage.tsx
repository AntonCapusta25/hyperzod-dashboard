import { useState } from 'react';
import Editor from '../../../components/Editor';
import { useTemplates } from '../hooks/useTemplates';
import type { EmailTemplate } from '../../../types/marketing';
import { Plus, Edit2, Trash2, ArrowLeft, Save } from 'lucide-react';

const VARIABLES = [
    { label: 'First Name', value: '{{first_name}}' },
    { label: 'Last Name', value: '{{last_name}}' },
    { label: 'Email', value: '{{email}}' },
    { label: 'City', value: '{{city}}' },
    { label: 'Total Orders', value: '{{total_orders}}' },
    { label: 'Total Spent', value: '{{total_spent}}' },
];

export default function TemplatesPage() {
    const { templates, loading, error, addTemplate, editTemplate, removeTemplate } = useTemplates();
    const [isEditing, setIsEditing] = useState(false);
    const [currentTemplate, setCurrentTemplate] = useState<Partial<EmailTemplate>>({});
    const [saving, setSaving] = useState(false);

    const handleCreate = () => {
        setCurrentTemplate({
            name: '',
            subject: '',
            html_content: '',
            variables: [],
            is_active: true
        });
        setIsEditing(true);
    };

    const handleEdit = (template: EmailTemplate) => {
        setCurrentTemplate({ ...template });
        setIsEditing(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this template?')) {
            await removeTemplate(id);
        }
    };

    const handleSave = async () => {
        if (!currentTemplate.name || !currentTemplate.subject || !currentTemplate.html_content) {
            alert('Please fill in all required fields');
            return;
        }

        setSaving(true);
        try {
            if (currentTemplate.id) {
                await editTemplate(currentTemplate.id, currentTemplate);
            } else {
                await addTemplate(currentTemplate);
            }
            setIsEditing(false);
            setCurrentTemplate({});
        } catch (err) {
            console.error(err);
            alert('Failed to save template');
        } finally {
            setSaving(false);
        }
    };

    const insertVariable = (variable: string) => {
        // Appends variable to the end. Cursor position insertion requires accessing Editor API which we don't expose yet.
        setCurrentTemplate(prev => ({
            ...prev,
            html_content: (prev.html_content || '') + ` ${variable} `
        }));
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
                Error loading templates: {error.message}
            </div>
        );
    }

    // EDITOR VIEW
    if (isEditing) {
        return (
            <div className="p-6 max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <button
                        onClick={() => setIsEditing(false)}
                        className="flex items-center text-gray-500 hover:text-gray-900"
                    >
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        Back to Templates
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
                            {saving ? 'Saving...' : 'Save Template'}
                        </button>
                    </div>
                </div>

                {/* Form */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Template Name
                            </label>
                            <input
                                type="text"
                                value={currentTemplate.name || ''}
                                onChange={e => setCurrentTemplate(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="e.g., Welcome Email"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Email Subject
                            </label>
                            <input
                                type="text"
                                value={currentTemplate.subject || ''}
                                onChange={e => setCurrentTemplate(prev => ({ ...prev, subject: e.target.value }))}
                                placeholder="e.g., Welcome to Hyperzod, {{first_name}}!"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Email Content
                            </label>
                            <div className="flex gap-2">
                                {VARIABLES.map(v => (
                                    <button
                                        key={v.value}
                                        onClick={() => insertVariable(v.value)}
                                        className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded"
                                        title={`Insert ${v.label}`}
                                    >
                                        {v.value}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="mb-12">
                            <Editor
                                value={currentTemplate.html_content || ''}
                                onChange={(content) => setCurrentTemplate(prev => ({ ...prev, html_content: content }))}
                                className="h-full"
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // LIST VIEW
    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Email Templates</h1>
                    <p className="text-gray-600 mt-2">
                        Create and manage reusable email templates
                    </p>
                </div>
                <button
                    onClick={handleCreate}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    New Template
                </button>
            </div>

            {templates.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Edit2 className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No templates yet</h3>
                    <p className="text-gray-500 mb-6 max-w-md mx-auto">
                        Create your first email template to start sending campaigns to your customers.
                    </p>
                    <button
                        onClick={handleCreate}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Create Template
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {templates.map(template => (
                        <div key={template.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow p-6 group">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-semibold text-gray-900 text-lg mb-1 line-clamp-1">
                                        {template.name}
                                    </h3>
                                    <p className="text-sm text-gray-500 line-clamp-1">
                                        Subject: {template.subject}
                                    </p>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleEdit(template)}
                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(template.id)}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Preview Window */}
                            <div className="bg-gray-50 rounded-lg p-3 h-32 overflow-hidden mb-4 border border-gray-100">
                                <div
                                    className="text-[10px] text-gray-600 origin-top transform scale-75 line-clamp-6"
                                    dangerouslySetInnerHTML={{ __html: template.html_content }}
                                />
                            </div>

                            <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-gray-100">
                                <span>Updated {new Date(template.updated_at).toLocaleDateString()}</span>
                                <span className="flex items-center text-blue-600 cursor-pointer hover:underline" onClick={() => handleEdit(template)}>
                                    Edit Template
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
