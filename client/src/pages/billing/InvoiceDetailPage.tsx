import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RecordPaymentSchema, type RecordPaymentInput } from '@medhub/shared';
import { api, ApiError } from '../../lib/api.js';

export default function InvoiceDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [invoice, setInvoice] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [paySuccess, setPaySuccess] = useState(false);

    useEffect(() => {
        if (!id) return;
        api.get<{ invoices: any[] }>(`/billing/invoices?patientId=${id}`).then((res) => {
            const inv = (res.invoices ?? []).find((i: any) => i._id === id);
            if (inv) setInvoice(inv);
        }).catch(() => setError('Failed to load invoice')).finally(() => setLoading(false));
    }, [id]);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<RecordPaymentInput>({
        resolver: zodResolver(RecordPaymentSchema),
        defaultValues: { invoiceId: id ?? '', amount: 0, paymentMethod: 'cash', reference: '', notes: '' },
    });

    const onPayment = async (data: RecordPaymentInput) => {
        try {
            setError(null);
            await api.post('/billing/payments', data);
            setPaySuccess(true);
            reset();
            if (invoice) {
                const res = await api.get<{ invoices: any[] }>(`/billing/invoices?patientId=${invoice.patientId}`);
                const inv = (res.invoices ?? []).find((i: any) => i._id === id);
                if (inv) setInvoice(inv);
            }
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Payment failed');
        }
    };

    const statusColor = (status: string) => {
        switch (status) {
            case 'paid': return 'text-clinical-success bg-clinical-success/10';
            case 'partial': return 'text-clinical-warning bg-clinical-warning/10';
            case 'pending': return 'text-slate-400 bg-slate-700/30';
            case 'cancelled': return 'text-slate-500 bg-slate-700/20';
            case 'refunded': return 'text-red-400 bg-red-400/10';
            default: return 'text-slate-400 bg-slate-700/30';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!invoice) {
        return (
            <div className="text-center py-20">
                <p className="text-slate-400">Invoice not found</p>
                <button onClick={() => navigate('/dashboard/invoices')} className="mt-4 text-sm text-primary-400 hover:underline">
                    Back to Invoices
                </button>
            </div>
        );
    }

    const canRecordPayment = invoice.status === 'pending' || invoice.status === 'partial';

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-2xl font-bold text-slate-100">{invoice.invoiceNumber}</h1>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${statusColor(invoice.status)}`}>
                            {invoice.status}
                        </span>
                    </div>
                    <p className="text-sm text-slate-400">{invoice.patientName} &middot; {invoice.encounterDate}</p>
                </div>
                <button onClick={() => navigate('/dashboard/invoices')} className="text-sm text-slate-400 hover:text-slate-200 transition-colors">
                    Back to Invoices
                </button>
            </div>

            {error && (
                <div className="mb-6 p-4 rounded-xl bg-clinical-danger/10 border border-clinical-danger/20 text-clinical-danger text-sm">{error}</div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="card">
                        <h3 className="text-lg font-semibold text-slate-200 mb-4">Line Items</h3>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-xs text-slate-500 uppercase border-b border-slate-700/30">
                                    <th className="text-left pb-2 font-medium">Description</th>
                                    <th className="text-right pb-2 font-medium">Qty</th>
                                    <th className="text-right pb-2 font-medium">Unit Price</th>
                                    <th className="text-right pb-2 font-medium">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/20">
                                {invoice.lineItems?.map((item: any, i: number) => (
                                    <tr key={i}>
                                        <td className="py-2 text-slate-200">{item.description}</td>
                                        <td className="py-2 text-right text-slate-400">{item.quantity}</td>
                                        <td className="py-2 text-right text-slate-400">₦{item.unitPrice?.toLocaleString()}</td>
                                        <td className="py-2 text-right text-slate-200 font-medium">₦{item.total?.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="card">
                        <h3 className="text-lg font-semibold text-slate-200 mb-4">Payment History</h3>
                        <p className="text-sm text-slate-400">Payment history coming soon (fetched from CouchDB).</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="card">
                        <h3 className="text-lg font-semibold text-slate-200 mb-4">Summary</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-400">Subtotal</span>
                                <span className="text-slate-200">₦{invoice.subtotal?.toLocaleString()}</span>
                            </div>
                            {invoice.discount > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Discount</span>
                                    <span className="text-clinical-danger">-₦{invoice.discount?.toLocaleString()}</span>
                                </div>
                            )}
                            {invoice.tax > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Tax</span>
                                    <span className="text-slate-200">+₦{invoice.tax?.toLocaleString()}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-lg font-bold pt-2 border-t border-slate-700/30">
                                <span className="text-slate-100">Total</span>
                                <span className="text-primary-400">₦{invoice.total?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between pt-1">
                                <span className="text-slate-400">Paid</span>
                                <span className="text-clinical-success">₦{invoice.amountPaid?.toLocaleString()}</span>
                            </div>
                            {invoice.balance > 0 && (
                                <div className="flex justify-between pt-1">
                                    <span className="text-slate-400">Balance</span>
                                    <span className="text-clinical-warning">₦{invoice.balance?.toLocaleString()}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {canRecordPayment && (
                        <div className="card">
                            <h3 className="text-lg font-semibold text-slate-200 mb-4">Record Payment</h3>
                            {paySuccess && (
                                <p className="text-sm text-clinical-success mb-3">Payment recorded successfully!</p>
                            )}
                            <form onSubmit={handleSubmit(onPayment)} className="space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Amount (₦) *</label>
                                    <input type="number" step="0.01" {...register('amount', { valueAsNumber: true })} className="input-field" placeholder="0" max={invoice.balance} />
                                    {errors.amount && <p className="mt-0.5 text-xs text-clinical-danger">{errors.amount.message}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Method *</label>
                                    <select {...register('paymentMethod')} className="input-field">
                                        <option value="cash">Cash</option>
                                        <option value="bank_transfer">Bank Transfer</option>
                                        <option value="pos">POS</option>
                                        <option value="hmo">HMO</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Reference</label>
                                    <input {...register('reference')} className="input-field" placeholder="Payment reference" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Notes</label>
                                    <input {...register('notes')} className="input-field" placeholder="Optional notes" />
                                </div>
                                <button type="submit" disabled={isSubmitting} className="btn-primary w-full justify-center">
                                    {isSubmitting ? 'Processing...' : 'Record Payment'}
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
