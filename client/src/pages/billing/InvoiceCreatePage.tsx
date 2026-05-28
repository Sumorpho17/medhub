import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateInvoiceSchema, type CreateInvoiceInput } from '@medhub/shared';
import { api, ApiError } from '../../lib/api.js';

export default function InvoiceCreatePage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const {
        register,
        handleSubmit,
        control,
        watch,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<CreateInvoiceInput>({
        resolver: zodResolver(CreateInvoiceSchema),
        defaultValues: {
            patientId: searchParams.get('patientId') || '',
            patientName: '',
            visitId: '',
            encounterDate: new Date().toISOString().slice(0, 10),
            dueDate: '',
            lineItems: [{ description: '', quantity: 1, unitPrice: 0, total: 0 }],
            discount: 0,
            tax: 0,
            paymentMethod: null,
            hmoProvider: '',
            hmoAuthorizationNumber: '',
            notes: '',
        },
    });

    const { fields, append, remove } = useFieldArray({ control, name: 'lineItems' });

    const lineItems = watch('lineItems');
    const discount = watch('discount') || 0;
    const tax = watch('tax') || 0;

    const subtotal = lineItems.reduce((sum, item) => sum + (item.unitPrice || 0) * (item.quantity || 0), 0);
    const total = subtotal - discount + tax;

    const onSubmit = async (data: CreateInvoiceInput) => {
        try {
            setError(null);
            const lineItemsWithTotal = data.lineItems.map((item) => ({
                ...item,
                quantity: Number(item.quantity) || 1,
                unitPrice: Number(item.unitPrice) || 0,
                total: (Number(item.unitPrice) || 0) * (Number(item.quantity) || 1),
            }));
            await api.post('/billing/invoices', {
                ...data,
                discount: Number(data.discount) || 0,
                tax: Number(data.tax) || 0,
                lineItems: lineItemsWithTotal,
            });
            setSuccess(true);
            setTimeout(() => navigate('/dashboard/invoices'), 2000);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Failed to create invoice');
        }
    };

    if (success) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-clinical-success/20 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-clinical-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-slate-100">Invoice Created</h2>
                    <p className="text-slate-400 mt-2">Redirecting to invoice list...</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100">New Invoice</h1>
                    <p className="text-sm text-slate-400 mt-1">Create a patient invoice</p>
                </div>
                <button onClick={() => navigate('/dashboard/invoices')} className="text-sm text-slate-400 hover:text-slate-200 transition-colors">
                    Back to Invoices
                </button>
            </div>

            {error && (
                <div className="mb-6 p-4 rounded-xl bg-clinical-danger/10 border border-clinical-danger/20 text-clinical-danger text-sm">{error}</div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="max-w-4xl space-y-8">
                <div className="card">
                    <h3 className="text-lg font-semibold text-slate-200 mb-4">Patient & Visit</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Patient ID *</label>
                            <input {...register('patientId')} className="input-field" placeholder="Patient ID" />
                            {errors.patientId && <p className="mt-1 text-sm text-clinical-danger">{errors.patientId.message}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Patient Name *</label>
                            <input {...register('patientName')} className="input-field" placeholder="Patient full name" />
                            {errors.patientName && <p className="mt-1 text-sm text-clinical-danger">{errors.patientName.message}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Encounter Date *</label>
                            <input type="date" {...register('encounterDate')} className="input-field" />
                            {errors.encounterDate && <p className="mt-1 text-sm text-clinical-danger">{errors.encounterDate.message}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Due Date</label>
                            <input type="date" {...register('dueDate')} className="input-field" />
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-slate-200">Line Items</h3>
                        <button
                            type="button"
                            onClick={() => append({ description: '', quantity: 1, unitPrice: 0, total: 0 })}
                            className="text-xs px-3 py-1.5 rounded-lg bg-primary-500/20 text-primary-400 hover:bg-primary-500/30 transition-colors"
                        >
                            + Add Item
                        </button>
                    </div>
                    <div className="space-y-3">
                        {fields.map((field, i) => (
                            <div key={field.id} className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/30">
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                                    <div className="md:col-span-2">
                                        <label className="text-[10px] text-slate-500 uppercase">Description</label>
                                        <input {...register(`lineItems.${i}.description`)} className="mt-0.5 w-full bg-slate-900/50 border border-slate-700/30 rounded-lg px-2 py-1.5 text-xs text-slate-200" placeholder="Item/service description" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-slate-500 uppercase">Qty</label>
                                        <input type="number" {...register(`lineItems.${i}.quantity`, { valueAsNumber: true })} className="mt-0.5 w-full bg-slate-900/50 border border-slate-700/30 rounded-lg px-2 py-1.5 text-xs text-slate-200" min={1} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-slate-500 uppercase">Unit Price (₦)</label>
                                        <input type="number" step="0.01" {...register(`lineItems.${i}.unitPrice`, { valueAsNumber: true })} className="mt-0.5 w-full bg-slate-900/50 border border-slate-700/30 rounded-lg px-2 py-1.5 text-xs text-slate-200" min={0} />
                                    </div>
                                    <div className="flex items-end gap-1">
                                        <div className="flex-1">
                                            <label className="text-[10px] text-slate-500 uppercase">Total</label>
                                            <div className="mt-0.5 w-full bg-slate-900/50 border border-slate-700/30 rounded-lg px-2 py-1.5 text-xs text-slate-400">
                                                ₦{((lineItems[i]?.unitPrice || 0) * (lineItems[i]?.quantity || 1)).toLocaleString()}
                                            </div>
                                        </div>
                                        {fields.length > 1 && (
                                            <button type="button" onClick={() => remove(i)} className="p-1.5 text-clinical-danger hover:text-red-400">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="card">
                    <h3 className="text-lg font-semibold text-slate-200 mb-4">Summary</h3>
                    <div className="space-y-2">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Discount (₦)</label>
                                <input type="number" step="0.01" {...register('discount', { valueAsNumber: true })} className="input-field" min={0} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Tax (₦)</label>
                                <input type="number" step="0.01" {...register('tax', { valueAsNumber: true })} className="input-field" min={0} />
                            </div>
                        </div>
                        <div className="pt-3 border-t border-slate-700/30 space-y-1">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Subtotal</span>
                                <span className="text-slate-200">₦{subtotal.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Discount</span>
                                <span className="text-clinical-danger">-₦{(discount || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Tax</span>
                                <span className="text-slate-200">+₦{(tax || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-lg font-bold pt-2 border-t border-slate-700/30">
                                <span className="text-slate-100">Total</span>
                                <span className="text-primary-400">₦{total.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <h3 className="text-lg font-semibold text-slate-200 mb-4">Payment & HMO</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Payment Method</label>
                            <select {...register('paymentMethod')} className="input-field">
                                <option value="">Select method</option>
                                <option value="cash">Cash</option>
                                <option value="bank_transfer">Bank Transfer</option>
                                <option value="pos">POS</option>
                                <option value="hmo">HMO</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">HMO Provider</label>
                            <input {...register('hmoProvider')} className="input-field" placeholder="If HMO" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Auth Number</label>
                            <input {...register('hmoAuthorizationNumber')} className="input-field" placeholder="Authorization #" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Notes</label>
                        <textarea {...register('notes')} className="input-field" rows={2} placeholder="Invoice notes" />
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <button type="button" onClick={() => navigate('/dashboard/invoices')} className="px-6 py-2.5 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700/50 transition-colors text-sm font-medium">
                        Cancel <span className="text-slate-600 ml-1">⎋</span>
                    </button>
                    <button type="submit" disabled={isSubmitting} className="btn-primary">
                        {isSubmitting ? 'Creating...' : 'Create Invoice'} <span className="text-primary-300 ml-1">⌘S</span>
                    </button>
                </div>
                <p className="text-[10px] text-slate-600 text-right -mt-4">Keyboard shortcuts: ⌘S to save · ⎋ to cancel</p>
            </form>
        </div>
    );
}

function useKeyboardShortcut(key: string, ctrl: boolean, handler: () => void) {
    useEffect(() => {
        const listener = (e: KeyboardEvent) => {
            if ((ctrl ? e.ctrlKey || e.metaKey : true) && e.key === key && !e.repeat) {
                const target = e.target as HTMLElement;
                if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;
                e.preventDefault();
                handler();
            }
        };
        window.addEventListener('keydown', listener);
        return () => window.removeEventListener('keydown', listener);
    }, [key, ctrl, handler]);
}
