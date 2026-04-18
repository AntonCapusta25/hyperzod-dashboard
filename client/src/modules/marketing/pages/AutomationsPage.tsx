import { useState, useEffect } from 'react';
import { fetchAutomations, upsertAutomation, upsertAutomationStep, deleteAutomationStep } from '../api/automations';
import { fetchTemplates } from '../api/templates';
import type { Automation, AutomationStep, EmailTemplate } from '../../../types/marketing';
import { Plus, Edit2, Trash2, Clock, Mail, CheckCircle, XCircle } from 'lucide-react';

export default function AutomationsPage() {
    const [automations, setAutomations] = useState<Automation[]>([]);
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedAutomation, setSelectedAutomation] = useState<Automation | null>(null);
    const [isEditingStep, setIsEditingStep] = useState(false);
    const [currentStep, setCurrentStep] = useState<Partial<AutomationStep>>({});

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [data, tpls] = await Promise.all([
                fetchAutomations(),
                fetchTemplates()
            ]);
            setAutomations(data);
            setTemplates(tpls.data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const toggleAutomationActive = async (automation: Automation) => {
        try {
            await upsertAutomation({ id: automation.id, is_active: !automation.is_active } as any);
            loadData();
        } catch (err) {
            console.error(err);
        }
    };

    const handleSaveStep = async () => {
        if (!selectedAutomation || !currentStep.template_id || currentStep.delay_value === undefined) return;

        try {
            await upsertAutomationStep({
                ...currentStep,
                automation_id: selectedAutomation!.id,
                delay_unit: currentStep.delay_unit || 'hours'
            });
            setIsEditingStep(false);
            loadData();
            // refresh selected
            const updated = await fetchAutomations();
            setSelectedAutomation(updated.find(a => a.id === selectedAutomation.id) || null);
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteStep = async (stepId: string) => {
        if (!selectedAutomation) return;
        if (!confirm('Are you sure you want to delete this step?')) return;
        try {
            await deleteAutomationStep(stepId);
            loadData();
            const updated = await fetchAutomations();
            setSelectedAutomation(updated.find(a => a.id === selectedAutomation.id) || null);
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading automations...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Drip Automations</h2>
                {/* Note: In a complete implementation, we'd add "Create New Automation" */}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Automations List */}
                <div className="col-span-1 space-y-4">
                    {automations.map(auto => (
                        <div
                            key={auto.id}
                            onClick={() => setSelectedAutomation(auto)}
                            className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedAutomation?.id === auto.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-300'}`}
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-semibold text-gray-900">{auto.name}</h3>
                                    <p className="text-sm text-gray-500">{auto.description}</p>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); toggleAutomationActive(auto); }}
                                    className={`p-1 rounded-full ${auto.is_active ? 'text-green-500 bg-green-50' : 'text-gray-400 bg-gray-100'}`}
                                    title={auto.is_active ? 'Active' : 'Inactive'}
                                >
                                    {auto.is_active ? <CheckCircle size={20} /> : <XCircle size={20} />}
                                </button>
                            </div>
                            <div className="mt-4 text-xs text-gray-500 font-medium">
                                {auto.steps?.length || 0} Steps Configured
                            </div>
                        </div>
                    ))}
                </div>

                {/* Automation Steps Canvas */}
                <div className="col-span-1 md:col-span-2">
                    {selectedAutomation ? (
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold text-gray-900">Configure: {selectedAutomation.name}</h3>
                                <button
                                    onClick={() => {
                                        setIsEditingStep(true);
                                        setCurrentStep({ step_order: (selectedAutomation.steps?.length || 0) + 1, delay_value: 0, delay_unit: 'hours' });
                                    }}
                                    className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                                >
                                    <Plus size={16} />
                                    <span>Add Step</span>
                                </button>
                            </div>

                            <div className="space-y-4">
                                {selectedAutomation.steps?.sort((a, b) => a.step_order - b.step_order).map((step, index) => (
                                    <div key={step.id} className="relative pl-8 py-2">
                                        {/* Connecting Line */}
                                        {index !== (selectedAutomation.steps?.length || 0) - 1 && (
                                            <div className="absolute left-3 top-8 bottom-[-24px] w-0.5 bg-blue-200"></div>
                                        )}
                                        {/* Node Marker */}
                                        <div className="absolute left-1 top-4 w-4 h-4 rounded-full bg-blue-500 border-4 border-white shadow"></div>
                                        
                                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 flex justify-between items-center">
                                            <div>
                                                <div className="flex items-center space-x-2 mb-1">
                                                    <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded uppercase">Step {step.step_order}</span>
                                                    <span className="text-sm font-medium text-gray-500 flex items-center">
                                                        <Clock size={14} className="mr-1" /> Wait {step.delay_value} {step.delay_unit}
                                                    </span>
                                                </div>
                                                <div className="font-semibold text-gray-900 flex items-center">
                                                    <Mail size={16} className="mr-2 text-gray-400" />
                                                    {step.template?.name || 'Unknown Template'}
                                                </div>
                                            </div>
                                            <div className="flex space-x-2">
                                                <button onClick={() => { setIsEditingStep(true); setCurrentStep(step); }} className="text-gray-400 hover:text-blue-500">
                                                    <Edit2 size={16} />
                                                </button>
                                                <button onClick={() => handleDeleteStep(step.id)} className="text-gray-400 hover:text-red-500">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {!selectedAutomation.steps?.length && (
                                    <div className="text-center py-10 text-gray-500">
                                        No steps configured yet. Add your first step to start the sequence.
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl h-full flex items-center justify-center text-gray-400">
                            Select an automation to configure its steps
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Step Modal */}
            {isEditingStep && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-bold mb-4">{currentStep.id ? 'Edit Step' : 'Add Step'}</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Step Order</label>
                                <input type="number" className="w-full border rounded-lg p-2" value={currentStep.step_order || 1} onChange={e => setCurrentStep({...currentStep, step_order: parseInt(e.target.value)})} />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Delay Value</label>
                                    <input type="number" className="w-full border rounded-lg p-2" value={currentStep.delay_value || 0} onChange={e => setCurrentStep({...currentStep, delay_value: parseInt(e.target.value)})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Delay Unit</label>
                                    <select className="w-full border rounded-lg p-2" value={currentStep.delay_unit || 'hours'} onChange={e => setCurrentStep({...currentStep, delay_unit: e.target.value as any})}>
                                        <option value="hours">Hours</option>
                                        <option value="days">Days</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium mb-1">Email Template</label>
                                <select className="w-full border rounded-lg p-2" value={currentStep.template_id || ''} onChange={e => setCurrentStep({...currentStep, template_id: e.target.value})}>
                                    <option value="">Select a template...</option>
                                    {templates.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end space-x-3">
                            <button onClick={() => setIsEditingStep(false)} className="px-4 py-2 text-gray-500 hover:text-gray-700">Cancel</button>
                            <button onClick={handleSaveStep} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Step</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
