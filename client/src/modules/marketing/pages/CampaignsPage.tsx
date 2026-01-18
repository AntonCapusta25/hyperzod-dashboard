import { useState } from 'react';
import { useCampaigns } from '../hooks/useCampaigns';
import { useSegments } from '../hooks/useSegments';
import { useTemplates } from '../hooks/useTemplates';
import type { Campaign } from '../../../types/marketing';
import { Plus, Send, ArrowLeft, ArrowRight, Play, Paperclip, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { uploadCampaignAttachment } from '../../../lib/storage';

const STEPS = ['Details', 'Audience', 'Content', 'Attachments', 'Review'];

export default function CampaignsPage() {
    const { campaigns, loading, error, addCampaign, launchCampaign } = useCampaigns();
    const { segments } = useSegments();
    const { templates } = useTemplates();

    // Wizard State
    const [isCreating, setIsCreating] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [draft, setDraft] = useState<Partial<Campaign>>({
        status: 'draft',
        from_name: 'Hyperzod',
        from_email: 'noreply@hyperzod.com'
    });
    const [sending, setSending] = useState(false);

    // Filter segments/templates for selection
    const activeTemplates = templates.filter(t => t.is_active);

    const handleNext = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleCreate = async () => {
        if (!draft.name || !draft.subject || !draft.segment_id || !draft.template_id) {
            alert('Please fill in all required fields');
            return;
        }

        // Prevent duplicate submissions
        if (sending) {
            console.log('Already creating campaign, ignoring duplicate click');
            return;
        }

        try {
            setSending(true);
            // Create the campaign first
            const created = await addCampaign(draft);

            // If user wants to send immediately
            if (confirm('Campaign created! Do you want to send it now?')) {
                await launchCampaign(created.id);
                alert('Campaign launched successfully!');
            }

            setIsCreating(false);
            setDraft({ status: 'draft', from_name: 'Hyperzod', from_email: 'noreply@hyperzod.com' });
            setCurrentStep(0);
        } catch (err) {
            alert('Failed to create campaign');
            console.error(err);
        } finally {
            setSending(false);
        }
    };

    const handleLaunchExisting = async (id: string, name: string) => {
        if (confirm(`Are you sure you want to send campaign "${name}" now?`)) {
            try {
                await launchCampaign(id);
                alert('Campaign sending started!');
            } catch (err) {
                alert('Failed to launch campaign');
            }
        }
    };

    // Render Wizard Step
    const renderStep = () => {
        switch (currentStep) {
            case 0: // Details
                return (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Name</label>
                                <input
                                    type="text"
                                    value={draft.name || ''}
                                    onChange={e => setDraft(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="e.g. October Newsletter"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Subject Line</label>
                                <input
                                    type="text"
                                    value={draft.subject || ''}
                                    onChange={e => setDraft(prev => ({ ...prev, subject: e.target.value }))}
                                    placeholder="e.g. Special Offer for You!"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">From Name</label>
                                <input
                                    type="text"
                                    value={draft.from_name || ''}
                                    onChange={e => setDraft(prev => ({ ...prev, from_name: e.target.value }))}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">From Email</label>
                                <input
                                    type="email"
                                    value={draft.from_email || ''}
                                    onChange={e => setDraft(prev => ({ ...prev, from_email: e.target.value }))}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>
                );
            case 1: // Audience
                return (
                    <div className="space-y-6">
                        <h3 className="text-lg font-medium text-gray-900">Select Audience Segment</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {segments.map(segment => (
                                <div
                                    key={segment.id}
                                    onClick={() => setDraft(prev => ({ ...prev, segment_id: segment.id }))}
                                    className={`p-4 rounded-xl border cursor-pointer transition-all ${draft.segment_id === segment.id
                                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                                        }`}
                                >
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="font-semibold text-gray-900">{segment.name}</h4>
                                        <span className="bg-white px-2 py-1 rounded text-xs font-medium border border-gray-200 shadow-sm">
                                            {segment.client_count} Clients
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500 line-clamp-2">{segment.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 2: // Content (Template)
                return (
                    <div className="space-y-6">
                        <h3 className="text-lg font-medium text-gray-900">Select Email Template</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {activeTemplates.map(template => (
                                <div
                                    key={template.id}
                                    onClick={() => setDraft(prev => ({ ...prev, template_id: template.id }))}
                                    className={`p-4 rounded-xl border cursor-pointer transition-all group ${draft.template_id === template.id
                                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                                        }`}
                                >
                                    <div className="mb-3 font-semibold text-gray-900">{template.name}</div>
                                    <div className="bg-white border border-gray-100 rounded p-2 h-24 overflow-hidden mb-2 relative">
                                        <div
                                            className="text-[10px] text-gray-500 origin-top transform scale-50"
                                            dangerouslySetInnerHTML={{ __html: template.html_content }}
                                        />
                                        <div className="absolute inset-0 bg-transparent" />
                                    </div>
                                    <div className="text-xs text-gray-500 truncate">
                                        Subject: {template.subject}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 3: // Attachments
                return (
                    <div className="space-y-6">
                        <h3 className="text-lg font-medium text-gray-900">Add Attachments</h3>
                        <p className="text-gray-500 text-sm">Upload files to include with your email (PDF, Images, etc.). Max 5MB per file.</p>

                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 transition-colors">
                            <input
                                type="file"
                                id="file-upload"
                                className="hidden"
                                onChange={async (e) => {
                                    if (e.target.files && e.target.files[0]) {
                                        try {
                                            const file = e.target.files[0];
                                            if (file.size > 5 * 1024 * 1024) {
                                                alert('File too large. Max 5MB.');
                                                return;
                                            }

                                            // Show loading state if needed, or optimistic update
                                            const uploaded = await uploadCampaignAttachment(file);
                                            setDraft(prev => ({
                                                ...prev,
                                                attachments: [...(prev.attachments || []), uploaded]
                                            }));
                                        } catch (err) {
                                            console.error(err);
                                            alert('Failed to upload file');
                                        }
                                    }
                                }}
                            />
                            <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                                <Paperclip className="w-12 h-12 text-gray-400 mb-2" />
                                <span className="text-blue-600 font-medium">Click to upload</span>
                                <span className="text-gray-500 text-sm mt-1">or drag and drop</span>
                            </label>
                        </div>

                        {draft.attachments && draft.attachments.length > 0 && (
                            <div className="bg-gray-50 rounded-xl border border-gray-200 divide-y divide-gray-200">
                                {draft.attachments.map((file, idx) => (
                                    <div key={idx} className="p-4 flex items-center justify-between">
                                        <div className="flex items-center">
                                            <Paperclip className="w-4 h-4 text-gray-400 mr-3" />
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">{file.name}</div>
                                                <div className="text-xs text-gray-500 uppercase">{file.type}</div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setDraft(prev => ({
                                                    ...prev,
                                                    attachments: prev.attachments?.filter((_, i) => i !== idx)
                                                }));
                                            }}
                                            className="text-red-500 hover:text-red-700 p-2"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            case 4: // Review
                const selectedSegment = segments.find(s => s.id === draft.segment_id);
                const selectedTemplate = templates.find(t => t.id === draft.template_id);

                return (
                    <div className="space-y-8">
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-blue-900 mb-4">Campaign Summary</h3>
                            <dl className="grid grid-cols-2 gap-y-4 gap-x-8">
                                <div>
                                    <dt className="text-sm font-medium text-blue-500">Name</dt>
                                    <dd className="mt-1 text-base text-blue-900">{draft.name}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-blue-500">Audience</dt>
                                    <dd className="mt-1 text-base text-blue-900">
                                        {selectedSegment?.name}
                                        <span className="ml-2 text-sm text-blue-600">({selectedSegment?.client_count} recipients)</span>
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-blue-500">Template</dt>
                                    <dd className="mt-1 text-base text-blue-900">{selectedTemplate?.name}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-blue-500">Subject</dt>
                                    <dd className="mt-1 text-base text-blue-900">{draft.subject}</dd>
                                </div>
                                <div className="col-span-2">
                                    <dt className="text-sm font-medium text-blue-500">Attachments</dt>
                                    <dd className="mt-1 text-base text-blue-900">
                                        {draft.attachments?.length || 0} files attached
                                    </dd>
                                </div>
                            </dl>
                        </div>

                        <div className="border border-gray-200 rounded-xl p-6">
                            <h4 className="font-medium text-gray-900 mb-4">Preview content</h4>
                            <div className="prose max-w-none">
                                <iframe
                                    className="w-full h-64 border-0"
                                    srcDoc={selectedTemplate?.html_content}
                                    title="Preview"
                                />
                            </div>
                        </div>
                    </div>
                );
            default: return null;
        }
    };

    if (loading && !isCreating) return <div className="p-12 text-center">Loading campaigns...</div>;
    if (error && !isCreating) return <div className="p-12 text-center text-red-600">{error.message}</div>;

    // WIZARD UI
    if (isCreating) {
        return (
            <div className="p-8 max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <button onClick={() => setIsCreating(false)} className="text-gray-500 hover:text-gray-900 flex items-center mb-4">
                        <ArrowLeft className="w-4 h-4 mr-1" /> Cancel
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900">New Campaign</h1>
                </div>

                {/* Steps Indicator */}
                <div className="mb-8">
                    <div className="flex items-center justify-between relative">
                        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-200 -z-10" />
                        {STEPS.map((step, idx) => (
                            <div key={idx} className={`flex flex-col items-center bg-white px-2`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium mb-2 ${idx <= currentStep ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'
                                    }`}>
                                    {idx + 1}
                                </div>
                                <span className={`text-sm ${idx <= currentStep ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                                    {step}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 min-h-[400px]">
                    {renderStep()}
                </div>

                {/* Footer Navigation */}
                <div className="flex justify-between mt-8">
                    <button
                        onClick={handleBack}
                        disabled={currentStep === 0}
                        className="px-6 py-2 border border-gray-300 rounded-lg disabled:opacity-50 text-gray-700 hover:bg-gray-50"
                    >
                        Back
                    </button>

                    {currentStep === STEPS.length - 1 ? (
                        <button
                            onClick={handleCreate}
                            disabled={sending}
                            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center shadow-sm"
                        >
                            {sending ? 'Processing...' : (
                                <>
                                    <Send className="w-4 h-4 mr-2" /> Launch Campaign
                                </>
                            )}
                        </button>
                    ) : (
                        <button
                            onClick={handleNext}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center shadow-sm"
                        >
                            Next Step <ArrowRight className="w-4 h-4 ml-2" />
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // LIST UI
    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Campaigns</h1>
                    <p className="text-gray-600 mt-2">
                        Manage and track your email marketing campaigns
                    </p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Create Campaign
                </button>
            </div>

            {/* Campaign List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Campaign</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Audience</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Stats</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {campaigns.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                    No campaigns found. click "Create Campaign" to get started.
                                </td>
                            </tr>
                        ) : campaigns.map(campaign => (
                            <tr key={campaign.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-medium text-gray-900">{campaign.name}</div>
                                    <div className="text-sm text-gray-500 truncate max-w-xs">{campaign.subject}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${campaign.status === 'sent' ? 'bg-green-100 text-green-800' :
                                        campaign.status === 'sending' ? 'bg-blue-100 text-blue-800' :
                                            campaign.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                                                'bg-yellow-100 text-yellow-800'
                                        }`}>
                                        {campaign.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                    {campaign.segment?.name || 'Unknown Segment'}
                                </td>
                                <td className="px-6 py-4">
                                    {campaign.status === 'sent' ? (
                                        <div className="flex items-center space-x-4 text-sm">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-900">{campaign.emails_sent}</span>
                                                <span className="text-xs text-gray-400">Sent</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-green-600">{campaign.emails_opened}</span>
                                                <span className="text-xs text-gray-400">Opened</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-sm text-gray-400">-</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {format(new Date(campaign.created_at), 'MMM d, yyyy')}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {campaign.status === 'draft' && (
                                        <button
                                            onClick={() => handleLaunchExisting(campaign.id, campaign.name)}
                                            className="text-blue-600 hover:text-blue-900 font-medium text-sm flex items-center justify-end w-full"
                                        >
                                            <Play className="w-4 h-4 mr-1" /> Send
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
