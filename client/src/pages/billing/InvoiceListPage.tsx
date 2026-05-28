import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api.js';

const STATUS_OPTIONS = ['all', 'pending', 'partial', 'paid', 'cancelled', 'refunded'] as const;

export default function InvoiceListPage() {
    const navigate = useNavigate();
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');
    const [patientFilter, setPatientFilter] = useState('');

    const fetchInvoices = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (statusFilter !== 'all') params.set('status', statusFilter);
            if (patientFilter) params.set('patientId', patientFilter);
            const res = await api.get<{ invoices: any[] }>(`/billing/invoices?${params}`);
            setInvoices(res.invoices ?? []);
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchInvoices(); }, [statusFilter, patientFilter]);

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

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100">Invoices</h1>
                    <p className="text-sm text-slate-400 mt-1">Manage patient billing</p>
                </div>
                <button onClick={() => navigate('/dashboard/invoices/new')} className="btn-primary">
                    New Invoice
                </button>
            </div>

            <div className="card mb-6">
                <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex gap-2">
                        {STATUS_OPTIONS.map((s) => (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors ${
                                    statusFilter === s
                                        ? 'bg-primary-500/20 text-primary-400'
                                        : 'text-slate-400 hover:text-slate-200 bg-slate-800/50'
                                }`}
                            >
                                {s === 'all' ? 'All' : s}
                            </button>
                        ))}
                    </div>
                    <input
                        value={patientFilter}
                        onChange={(e) => setPatientFilter(e.target.value)}
                        placeholder="Filter by Patient ID..."
                        className="input-field max-w-xs ml-auto"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : invoices.length === 0 ? (
                <div className="card text-center py-12">
                    <p className="text-slate-400">No invoices found</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {invoices.map((inv: any) => (
                        <div
                            key={inv._id}
                            onClick={() => navigate(`/dashboard/invoices/${inv._id}`)}
                            className="card cursor-pointer hover:border-slate-600 transition-colors"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className="font-mono text-sm text-primary-400">{inv.invoiceNumber}</span>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${statusColor(inv.status)}`}>
                                            {inv.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-300">{inv.patientName}</p>
                                    <p className="text-xs text-slate-500">{inv.encounterDate}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-bold text-slate-100">₦{inv.total?.toLocaleString()}</p>
                                    {inv.balance > 0 && (
                                        <p className="text-xs text-clinical-warning">Balance: ₦{inv.balance?.toLocaleString()}</p>
                                    )}
                                </div>
                            </div>
                            {inv.lineItems && (
                                <div className="mt-3 pt-3 border-t border-slate-700/30">
                                    <p className="text-xs text-slate-500">{inv.lineItems.length} item(s)</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
