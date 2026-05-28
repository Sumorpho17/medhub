import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RevenueReportSchema, type RevenueReportInput } from '@medhub/shared';
import { api } from '../../lib/api.js';
import { motion } from 'framer-motion';

export default function RevenueReportPage() {
    const [report, setReport] = useState<{ totalRevenue: number; byMethod: Record<string, number>; invoiceCount: number } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { register, handleSubmit, formState: { errors } } = useForm<RevenueReportInput>({
        resolver: zodResolver(RevenueReportSchema),
        defaultValues: {
            startDate: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
            endDate: new Date().toISOString().slice(0, 10),
            groupBy: 'day',
        },
    });

    const onSubmit = async (data: RevenueReportInput) => {
        try {
            setLoading(true);
            setError(null);
            const params = new URLSearchParams({ startDate: data.startDate, endDate: data.endDate });
            const res = await api.get<{ totalRevenue: number; byMethod: Record<string, number>; invoiceCount: number }>(`/billing/reports/revenue?${params}`);
            setReport(res);
        } catch {
            setError('Failed to load report');
        } finally {
            setLoading(false);
        }
    };

    const methodLabels: Record<string, string> = {
        cash: 'Cash',
        bank_transfer: 'Bank Transfer',
        pos: 'POS',
        hmo: 'HMO',
        other: 'Other',
    };

    const methodColors: Record<string, string> = {
        cash: 'bg-emerald-500',
        bank_transfer: 'bg-blue-500',
        pos: 'bg-purple-500',
        hmo: 'bg-amber-500',
        other: 'bg-slate-500',
    };

    const maxMethodAmount = report ? Math.max(...Object.values(report.byMethod), 1) : 1;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-100">Revenue Report</h1>
                <p className="text-sm text-slate-400 mt-1">View revenue by date range</p>
            </div>

            <div className="card mb-6">
                <form onSubmit={handleSubmit(onSubmit)} className="flex flex-wrap gap-4 items-end">
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Start Date *</label>
                        <input type="date" {...register('startDate')} className="input-field" />
                        {errors.startDate && <p className="mt-0.5 text-xs text-clinical-danger">{errors.startDate.message}</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">End Date *</label>
                        <input type="date" {...register('endDate')} className="input-field" />
                        {errors.endDate && <p className="mt-0.5 text-xs text-clinical-danger">{errors.endDate.message}</p>}
                    </div>
                    <button type="submit" disabled={loading} className="btn-primary">
                        {loading ? 'Generating...' : 'Generate Report'}
                    </button>
                </form>
            </div>

            {error && (
                <div className="mb-6 p-4 rounded-xl bg-clinical-danger/10 border border-clinical-danger/20 text-clinical-danger text-sm">{error}</div>
            )}

            {report && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="card">
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Revenue</p>
                        <p className="text-3xl font-bold text-primary-400">₦{report.totalRevenue?.toLocaleString()}</p>
                    </div>
                    <div className="card">
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Transactions</p>
                        <p className="text-3xl font-bold text-slate-100">{report.invoiceCount}</p>
                    </div>
                    <div className="card">
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Avg per Transaction</p>
                        <p className="text-3xl font-bold text-slate-100">
                            ₦{report.invoiceCount > 0 ? Math.round(report.totalRevenue / report.invoiceCount).toLocaleString() : '0'}
                        </p>
                    </div>

                    <div className="md:col-span-3 card">
                        <h3 className="text-lg font-semibold text-slate-200 mb-6">Payment Method Breakdown</h3>
                        {Object.keys(report.byMethod).length === 0 ? (
                            <p className="text-sm text-slate-400">No data for this period</p>
                        ) : (
                            <div className="space-y-5">
                                {Object.entries(report.byMethod).map(([method, amount], i) => {
                                    const pct = report.totalRevenue > 0 ? ((amount / report.totalRevenue) * 100) : 0;
                                    return (
                                        <motion.div key={method} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-3 h-3 rounded-full ${methodColors[method] || 'bg-slate-500'}`} />
                                                    <span className="text-sm text-slate-300">{methodLabels[method] || method}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-sm text-slate-200 font-medium">₦{amount.toLocaleString()}</span>
                                                    <span className="text-xs text-slate-500 ml-2">({pct.toFixed(1)}%)</span>
                                                </div>
                                            </div>
                                            <div className="w-full bg-slate-700/30 rounded-full h-3 overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${pct}%` }}
                                                    transition={{ duration: 0.8, delay: i * 0.1, ease: 'easeOut' }}
                                                    className={`h-3 rounded-full ${methodColors[method] || 'bg-primary-500'} relative`}
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent" />
                                                </motion.div>
                                            </div>
                                        </motion.div>
                                    );
                                })}

                                <div className="pt-4 mt-4 border-t border-slate-700/30">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-300 font-medium">Total</span>
                                        <span className="text-slate-100 font-bold">₦{report.totalRevenue?.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}

            <style>{`
                @media print {
                    body { background: white !important; color: black !important; }
                    .card { border: 1px solid #ccc !important; box-shadow: none !important; background: white !important; }
                    button, nav, header, input, select { display: none !important; }
                    .text-slate-100, .text-slate-200, .text-slate-300 { color: #1e293b !important; }
                    .text-slate-400, .text-slate-500 { color: #64748b !important; }
                    .text-primary-400 { color: #0284c7 !important; }
                }
            `}</style>
        </motion.div>
    );
}
