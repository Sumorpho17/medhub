import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateVitalsSchema, type CreateVitalsInput } from '@medhub/shared';
import { api, ApiError } from '../../lib/api.js';

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

export default function VitalsPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [bmi, setBmi] = useState<number | null>(null);
    const [lastVitals, setLastVitals] = useState<CreateVitalsInput | null>(null);
    const [loadingLast, setLoadingLast] = useState(false);

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<CreateVitalsInput>({
        resolver: zodResolver(CreateVitalsSchema),
        defaultValues: {
            patientId: searchParams.get('patientId') || '',
            recordedAt: new Date().toISOString().slice(0, 16),
            bloodPressureSystolic: null,
            bloodPressureDiastolic: null,
            temperature: null,
            pulseRate: null,
            respiratoryRate: null,
            weight: null,
            height: null,
            notes: '',
        },
    });

    const weightVal = watch('weight');
    const heightVal = watch('height');
    const patientIdVal = watch('patientId');

    useEffect(() => {
        if (weightVal && heightVal && heightVal > 0) {
            const bmiCalc = weightVal / ((heightVal / 100) * (heightVal / 100));
            setBmi(Math.round(bmiCalc * 10) / 10);
        } else {
            setBmi(null);
        }
    }, [weightVal, heightVal]);

    const loadLastVitals = useCallback(async (pid: string) => {
        if (!pid) return;
        setLoadingLast(true);
        try {
            const res = await api.get<{ vitals: CreateVitalsInput[] }>(`/patients/${pid}/vitals?limit=1`);
            if (res.vitals && res.vitals.length > 0) {
                setLastVitals(res.vitals[0]!);
            }
        } catch {
        } finally {
            setLoadingLast(false);
        }
    }, []);

    useEffect(() => {
        if (patientIdVal && patientIdVal.length > 5) {
            loadLastVitals(patientIdVal);
        }
    }, [patientIdVal, loadLastVitals]);

    const handleAutofill = () => {
        if (!lastVitals) return;
        if (lastVitals.bloodPressureSystolic) setValue('bloodPressureSystolic', lastVitals.bloodPressureSystolic);
        if (lastVitals.bloodPressureDiastolic) setValue('bloodPressureDiastolic', lastVitals.bloodPressureDiastolic);
        if (lastVitals.temperature) setValue('temperature', lastVitals.temperature);
        if (lastVitals.pulseRate) setValue('pulseRate', lastVitals.pulseRate);
        if (lastVitals.respiratoryRate) setValue('respiratoryRate', lastVitals.respiratoryRate);
        if (lastVitals.weight) setValue('weight', lastVitals.weight);
        if (lastVitals.height) setValue('height', lastVitals.height);
    };

    const handleSaveAndNew = useCallback(async () => {
        const data = watch();
        try {
            setError(null);
            await api.post('/vitals', data);
            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                setValue('recordedAt', new Date().toISOString().slice(0, 16));
                setValue('bloodPressureSystolic', null);
                setValue('bloodPressureDiastolic', null);
                setValue('temperature', null);
                setValue('pulseRate', null);
                setValue('respiratoryRate', null);
                setValue('notes', '');
                setBmi(null);
            }, 1000);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Failed to record vitals');
        }
    }, [watch, setValue]);

    useKeyboardShortcut('s', true, () => handleSubmit(onSubmit)());
    useKeyboardShortcut('Escape', false, () => navigate('/dashboard/patients'));

    const onSubmit = async (data: CreateVitalsInput) => {
        try {
            setError(null);
            await api.post('/vitals', data);
            setSuccess(true);
            setTimeout(() => navigate('/dashboard/patients'), 2000);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Failed to record vitals');
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
                    <h2 className="text-xl font-bold text-slate-100">Vitals Recorded</h2>
                    <p className="text-slate-400 mt-2">Redirecting to patient directory...</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100">Record Vitals</h1>
                    <p className="text-sm text-slate-400 mt-1">Patient vitals and anthropometry</p>
                </div>
                <button onClick={() => navigate('/dashboard/patients')} className="text-sm text-slate-400 hover:text-slate-200 transition-colors">
                    Back to Directory
                </button>
            </div>

            {error && (
                <div className="mb-6 p-4 rounded-xl bg-clinical-danger/10 border border-clinical-danger/20 text-clinical-danger text-sm">{error}</div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl space-y-8">
                <div className="card">
                    <h3 className="text-lg font-semibold text-slate-200 mb-4">Patient & Time</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Patient ID *</label>
                            <input {...register('patientId')} className="input-field" placeholder="Patient ID or _id" />
                            {errors.patientId && <p className="mt-1 text-sm text-clinical-danger">{errors.patientId.message}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Date & Time *</label>
                            <input type="datetime-local" {...register('recordedAt')} className="input-field" />
                            {errors.recordedAt && <p className="mt-1 text-sm text-clinical-danger">{errors.recordedAt.message}</p>}
                        </div>
                    </div>
                </div>

                {loadingLast && (
                    <div className="text-xs text-slate-500 flex items-center gap-2 px-1">
                        <div className="w-3 h-3 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                        Loading previous vitals...
                    </div>
                )}

                {lastVitals && !loadingLast && (
                    <div className="flex items-center justify-between px-4 py-2 rounded-xl bg-clinical-info/10 border border-clinical-info/20">
                        <p className="text-xs text-clinical-info">Previous vitals found for this patient</p>
                        <button type="button" onClick={handleAutofill} className="text-xs px-3 py-1 rounded-lg bg-clinical-info/20 text-clinical-info hover:bg-clinical-info/30 transition-colors">
                            Autofill from previous
                        </button>
                    </div>
                )}

                <div className="card">
                    <h3 className="text-lg font-semibold text-slate-200 mb-4">Vital Signs</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">BP Systolic (mmHg)</label>
                            <input type="number" {...register('bloodPressureSystolic', { valueAsNumber: true })} className="input-field" placeholder="120" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">BP Diastolic (mmHg)</label>
                            <input type="number" {...register('bloodPressureDiastolic', { valueAsNumber: true })} className="input-field" placeholder="80" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Temperature (°C)</label>
                            <input type="number" step="0.1" {...register('temperature', { valueAsNumber: true })} className="input-field" placeholder="36.6" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Pulse Rate (/min)</label>
                            <input type="number" {...register('pulseRate', { valueAsNumber: true })} className="input-field" placeholder="72" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Respiratory Rate (/min)</label>
                            <input type="number" {...register('respiratoryRate', { valueAsNumber: true })} className="input-field" placeholder="16" />
                        </div>
                    </div>
                </div>

                <div className="card">
                    <h3 className="text-lg font-semibold text-slate-200 mb-4">Anthropometry</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Weight (kg)</label>
                            <input type="number" step="0.1" {...register('weight', { valueAsNumber: true })} className="input-field" placeholder="70" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Height (cm)</label>
                            <input type="number" step="0.1" {...register('height', { valueAsNumber: true })} className="input-field" placeholder="170" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">BMI (auto-calculated)</label>
                            <div className="input-field bg-slate-800/50 flex items-center text-slate-400">
                                {bmi ? `${bmi} kg/m²` : '—'}
                            </div>
                        </div>
                    </div>
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Notes</label>
                        <textarea {...register('notes')} className="input-field" rows={2} placeholder="Any additional observations" />
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <button type="button" onClick={() => navigate('/dashboard/patients')} className="px-6 py-2.5 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700/50 transition-colors text-sm font-medium">
                        Cancel <span className="text-slate-600 ml-1">⎋</span>
                    </button>
                    <button type="button" onClick={handleSaveAndNew} disabled={isSubmitting} className="px-6 py-2.5 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700/50 transition-colors text-sm font-medium">
                        Save &amp; New
                    </button>
                    <button type="submit" disabled={isSubmitting} className="btn-primary">
                        {isSubmitting ? 'Saving...' : 'Record Vitals'} <span className="text-primary-300 ml-1">⌘S</span>
                    </button>
                </div>
                <p className="text-[10px] text-slate-600 text-right mt-2">Keyboard shortcuts: ⌘S to save · ⎋ to cancel</p>
            </form>
        </div>
    );
}
