import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreatePrescriptionSchema, type CreatePrescriptionInput } from '@medhub/shared';
import { api, ApiError } from '../../lib/api.js';
import DrugSearchInput from '../../components/DrugSearchInput.js';

export default function PrescriptionPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<CreatePrescriptionInput>({
        resolver: zodResolver(CreatePrescriptionSchema),
        defaultValues: {
            patientId: searchParams.get('patientId') || '',
            consultationId: '',
            encounterDate: new Date().toISOString().slice(0, 10),
            items: [],
            notes: '',
        },
    });

    useKeyboardShortcut('s', true, () => handleSubmit(onSubmit)());
    useKeyboardShortcut('Escape', false, () => navigate('/dashboard/patients'));

    const items = watch('items') || [];

    const onSubmit = async (data: CreatePrescriptionInput) => {
        try {
            setError(null);
            await api.post('/prescriptions', data);
            setSuccess(true);
            setTimeout(() => navigate('/dashboard/patients'), 2000);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Failed to save prescription');
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
                    <h2 className="text-xl font-bold text-slate-100">Prescription Saved</h2>
                    <p className="text-slate-400 mt-2">Redirecting to patient directory...</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100">New Prescription</h1>
                    <p className="text-sm text-slate-400 mt-1">Create a prescription for a patient</p>
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
                    <h3 className="text-lg font-semibold text-slate-200 mb-4">Prescription Info</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Patient ID *</label>
                            <input {...register('patientId')} className="input-field" placeholder="Patient ID or _id" />
                            {errors.patientId && <p className="mt-1 text-sm text-clinical-danger">{errors.patientId.message}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Encounter Date *</label>
                            <input type="date" {...register('encounterDate')} className="input-field" />
                            {errors.encounterDate && <p className="mt-1 text-sm text-clinical-danger">{errors.encounterDate.message}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Consultation ID</label>
                            <input {...register('consultationId')} className="input-field" placeholder="Optional" />
                        </div>
                    </div>
                </div>

                <div className="card">
                    <h3 className="text-lg font-semibold text-slate-200 mb-4">Medications</h3>
                    <DrugSearchInput
                        items={items || []}
                        onChange={(newItems) => setValue('items', newItems)}
                    />
                    {errors.items && <p className="mt-1 text-sm text-clinical-danger">{errors.items.message}</p>}
                </div>

                <div className="card">
                    <h3 className="text-lg font-semibold text-slate-200 mb-4">Notes</h3>
                    <textarea {...register('notes')} className="input-field" rows={2} placeholder="Additional prescription notes" />
                </div>

                <div className="flex justify-end gap-3">
                    <button type="button" onClick={() => navigate('/dashboard/patients')} className="px-6 py-2.5 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700/50 transition-colors text-sm font-medium">
                        Cancel <span className="text-slate-600 ml-1">⎋</span>
                    </button>
                    <button type="submit" disabled={isSubmitting} className="btn-primary">
                        {isSubmitting ? 'Saving...' : 'Save Prescription'} <span className="text-primary-300 ml-1">⌘S</span>
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
