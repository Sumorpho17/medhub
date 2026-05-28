import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateConsultationSchema, type CreateConsultationInput } from '@medhub/shared';
import { api, ApiError } from '../../lib/api.js';
import ICD10SearchInput from '../../components/ICD10SearchInput.js';

export default function ConsultationPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [diagnoses, setDiagnoses] = useState<{ code: string; description: string; isPrimary: boolean }[]>([]);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<CreateConsultationInput>({
        resolver: zodResolver(CreateConsultationSchema),
        defaultValues: {
            patientId: searchParams.get('patientId') || '',
            encounterDate: new Date().toISOString().slice(0, 10),
            chiefComplaint: '',
            historyOfPresentingIllness: '',
            examinationFindings: '',
            managementPlan: '',
            followUpInstructions: '',
        },
    });

    useKeyboardShortcut('s', true, () => handleSubmit(onSubmit)());
    useKeyboardShortcut('Escape', false, () => navigate('/dashboard/patients'));

    const onSubmit = async (data: CreateConsultationInput) => {
        try {
            setError(null);
            await api.post('/consultations', {
                ...data,
                diagnosis: diagnoses,
            });
            setSuccess(true);
            setTimeout(() => navigate('/dashboard/patients'), 2000);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Failed to save consultation');
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
                    <h2 className="text-xl font-bold text-slate-100">Consultation Saved</h2>
                    <p className="text-slate-400 mt-2">Redirecting to patient directory...</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100">New Consultation</h1>
                    <p className="text-sm text-slate-400 mt-1">Record a patient consultation</p>
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
                    <h3 className="text-lg font-semibold text-slate-200 mb-4">Encounter</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    </div>
                </div>

                <div className="card">
                    <h3 className="text-lg font-semibold text-slate-200 mb-4">Clinical Notes</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Chief Complaint *</label>
                            <textarea {...register('chiefComplaint')} className="input-field" rows={2} placeholder="Patient's main reason for visit" />
                            {errors.chiefComplaint && <p className="mt-1 text-sm text-clinical-danger">{errors.chiefComplaint.message}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">History of Presenting Illness</label>
                            <textarea {...register('historyOfPresentingIllness')} className="input-field" rows={3} placeholder="Detailed history of the presenting complaint" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Examination Findings</label>
                            <textarea {...register('examinationFindings')} className="input-field" rows={3} placeholder="Physical examination findings" />
                        </div>
                    </div>
                </div>

                <div className="card">
                    <h3 className="text-lg font-semibold text-slate-200 mb-4">Diagnosis (ICD-10)</h3>
                    <ICD10SearchInput value={diagnoses} onChange={setDiagnoses} />
                </div>

                <div className="card">
                    <h3 className="text-lg font-semibold text-slate-200 mb-4">Management Plan</h3>
                    <div className="space-y-4">
                        <div>
                            <textarea {...register('managementPlan')} className="input-field" rows={3} placeholder="Treatment plan, investigations, referrals" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Follow-up Instructions</label>
                            <input {...register('followUpInstructions')} className="input-field" placeholder="Follow-up instructions for patient" />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <button type="button" onClick={() => navigate('/dashboard/patients')} className="px-6 py-2.5 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700/50 transition-colors text-sm font-medium">
                        Cancel <span className="text-slate-600 ml-1">⎋</span>
                    </button>
                    <button type="submit" disabled={isSubmitting} className="btn-primary">
                        {isSubmitting ? 'Saving...' : 'Save Consultation'} <span className="text-primary-300 ml-1">⌘S</span>
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
