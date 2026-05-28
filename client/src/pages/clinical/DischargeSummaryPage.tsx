import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateDischargeSummarySchema, type CreateDischargeSummaryInput } from '@medhub/shared';
import { api, ApiError } from '../../lib/api.js';

const DISCHARGE_CONDITIONS = [
    { value: 'recovered', label: 'Recovered' },
    { value: 'improved', label: 'Improved' },
    { value: 'unchanged', label: 'Unchanged' },
    { value: 'referred', label: 'Referred' },
    { value: 'dama', label: 'DAMA (Left Against Advice)' },
    { value: 'deceased', label: 'Deceased' },
] as const;

export default function DischargeSummaryPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<CreateDischargeSummaryInput>({
        resolver: zodResolver(CreateDischargeSummarySchema),
        defaultValues: {
            patientId: searchParams.get('patientId') || '',
            admissionDate: '',
            dischargeDate: new Date().toISOString().slice(0, 10),
            diagnosis: '',
            treatmentGiven: '',
            dischargeMedications: '',
            followUpPlan: '',
            dischargeCondition: 'improved',
        },
    });

    useKeyboardShortcut('s', true, () => handleSubmit(onSubmit)());
    useKeyboardShortcut('Escape', false, () => navigate('/dashboard/patients'));

    const onSubmit = async (data: CreateDischargeSummaryInput) => {
        try {
            setError(null);
            await api.post('/discharge-summaries', data);
            setSuccess(true);
            setTimeout(() => navigate('/dashboard/patients'), 2000);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Failed to save discharge summary');
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
                    <h2 className="text-xl font-bold text-slate-100">Discharge Summary Saved</h2>
                    <p className="text-slate-400 mt-2">Redirecting to patient directory...</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100">Discharge Summary</h1>
                    <p className="text-sm text-slate-400 mt-1">Finalize patient discharge documentation</p>
                </div>
                <button onClick={() => navigate('/dashboard/patients')} className="text-sm text-slate-400 hover:text-slate-200 transition-colors">
                    Back to Directory
                </button>
            </div>

            {error && (
                <div className="mb-6 p-4 rounded-xl bg-clinical-danger/10 border border-clinical-danger/20 text-clinical-danger text-sm">{error}</div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="max-w-4xl space-y-8">
                <div className="card">
                    <h3 className="text-lg font-semibold text-slate-200 mb-4">Patient & Dates</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Patient ID *</label>
                            <input {...register('patientId')} className="input-field" placeholder="Patient ID or _id" />
                            {errors.patientId && <p className="mt-1 text-sm text-clinical-danger">{errors.patientId.message}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Admission Date *</label>
                            <input type="date" {...register('admissionDate')} className="input-field" />
                            {errors.admissionDate && <p className="mt-1 text-sm text-clinical-danger">{errors.admissionDate.message}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Discharge Date *</label>
                            <input type="date" {...register('dischargeDate')} className="input-field" />
                            {errors.dischargeDate && <p className="mt-1 text-sm text-clinical-danger">{errors.dischargeDate.message}</p>}
                        </div>
                    </div>
                </div>

                <div className="card">
                    <h3 className="text-lg font-semibold text-slate-200 mb-4">Clinical Summary</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Diagnosis *</label>
                            <textarea {...register('diagnosis')} className="input-field" rows={3} placeholder="Final diagnosis at discharge" />
                            {errors.diagnosis && <p className="mt-1 text-sm text-clinical-danger">{errors.diagnosis.message}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Treatment Given</label>
                            <textarea {...register('treatmentGiven')} className="input-field" rows={3} placeholder="Summary of treatment during admission" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Discharge Medications</label>
                            <textarea {...register('dischargeMedications')} className="input-field" rows={2} placeholder="Medications prescribed at discharge" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Follow-up Plan</label>
                            <textarea {...register('followUpPlan')} className="input-field" rows={2} placeholder="Follow-up appointment and instructions" />
                        </div>
                    </div>
                </div>

                <div className="card">
                    <h3 className="text-lg font-semibold text-slate-200 mb-4">Disposition</h3>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Condition at Discharge *</label>
                        <select {...register('dischargeCondition')} className="input-field">
                            {DISCHARGE_CONDITIONS.map((c) => (
                                <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                        </select>
                        {errors.dischargeCondition && <p className="mt-1 text-sm text-clinical-danger">{errors.dischargeCondition.message}</p>}
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <button type="button" onClick={() => navigate('/dashboard/patients')} className="px-6 py-2.5 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700/50 transition-colors text-sm font-medium">
                        Cancel <span className="text-slate-600 ml-1">⎋</span>
                    </button>
                    <button type="submit" disabled={isSubmitting} className="btn-primary">
                        {isSubmitting ? 'Saving...' : 'Save Discharge Summary'} <span className="text-primary-300 ml-1">⌘S</span>
                    </button>
                </div>
                <p className="text-[10px] text-slate-600 text-right -mt-4">Keyboard shortcuts: ⌘S to save · ⎋ to cancel</p>
            </form>

            <style>{`
                @media print {
                    body { background: white; color: black; }
                    .card { border: 1px solid #ccc; box-shadow: none; }
                    button, nav, header { display: none !important; }
                }
            `}</style>
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
