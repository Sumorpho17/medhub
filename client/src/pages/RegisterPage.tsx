// ═══════════════════════════════════════════════════════════
// MEDHUB — Register Page
// Handles clinic registration and initial admin user creation.
// Uses React Hook Form + Zod for validation.
// Redirects to Login on success.
// ═══════════════════════════════════════════════════════════

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RegisterClinicSchema, type RegisterClinicInput } from '@medhub/shared';
import { api, ApiError } from '../lib/api.js';

export default function RegisterPage() {
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<RegisterClinicInput>({
        resolver: zodResolver(RegisterClinicSchema),
        defaultValues: {
            clinicName: '',
            clinicAddress: '',
            clinicPhone: '',
            clinicRegistrationNumber: '',
            email: '',
            firstName: '',
            lastName: '',
            password: '',
        },
    });

    const onSubmit = async (data: RegisterClinicInput) => {
        try {
            setError(null);
            await api.post('/auth/register', data, true);
            setSuccess(true);

            // Auto-redirect to login after short delay
            setTimeout(() => {
                navigate('/login', { replace: true });
            }, 3000);
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.message);
            } else {
                setError('An unexpected error occurred during registration.');
            }
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="w-full max-w-md card text-center">
                    <div className="w-16 h-16 bg-clinical-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-clinical-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-slate-100 mb-2">Registration Complete</h2>
                    <p className="text-slate-400 mb-6">Your clinic has been successfully registered. You are being redirected to login.</p>
                    <button onClick={() => navigate('/login')} className="btn-primary w-full">
                        Go to Login Now
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 py-12">
            <div className="w-full max-w-xl card">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-primary-400 tracking-tight">MEDHUB</h1>
                    <p className="text-slate-400 mt-2">Register your clinic to get started</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-clinical-danger/10 border border-clinical-danger/20 text-clinical-danger text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider border-b border-slate-700 pb-2">Clinic Details</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="clinicName">Clinic Name</label>
                                <input id="clinicName" type="text" className="input-field" {...register('clinicName')} />
                                {errors.clinicName && <p className="mt-1 text-sm text-clinical-danger">{errors.clinicName.message}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="clinicRegistrationNumber">Reg. Number (Optional)</label>
                                <input id="clinicRegistrationNumber" type="text" className="input-field" {...register('clinicRegistrationNumber')} />
                                {errors.clinicRegistrationNumber && <p className="mt-1 text-sm text-clinical-danger">{errors.clinicRegistrationNumber.message}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="clinicPhone">Phone Number</label>
                                <input id="clinicPhone" type="text" className="input-field" {...register('clinicPhone')} />
                                {errors.clinicPhone && <p className="mt-1 text-sm text-clinical-danger">{errors.clinicPhone.message}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="clinicAddress">Full Address</label>
                                <input id="clinicAddress" type="text" className="input-field" {...register('clinicAddress')} />
                                {errors.clinicAddress && <p className="mt-1 text-sm text-clinical-danger">{errors.clinicAddress.message}</p>}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 pt-4">
                        <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider border-b border-slate-700 pb-2">Administrator Account</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="firstName">First Name</label>
                                <input id="firstName" type="text" className="input-field" {...register('firstName')} />
                                {errors.firstName && <p className="mt-1 text-sm text-clinical-danger">{errors.firstName.message}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="lastName">Last Name</label>
                                <input id="lastName" type="text" className="input-field" {...register('lastName')} />
                                {errors.lastName && <p className="mt-1 text-sm text-clinical-danger">{errors.lastName.message}</p>}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="email">Email Address</label>
                            <input id="email" type="email" className="input-field" {...register('email')} />
                            {errors.email && <p className="mt-1 text-sm text-clinical-danger">{errors.email.message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="password">Password (minimum 12 chars)</label>
                            <input id="password" type="password" className="input-field" {...register('password')} />
                            {errors.password && <p className="mt-1 text-sm text-clinical-danger">{errors.password.message}</p>}
                        </div>
                    </div>

                    <div className="pt-2">
                        <button type="submit" disabled={isSubmitting} className="btn-primary w-full shadow-lg shadow-primary-500/20">
                            {isSubmitting ? 'Registering Clinic...' : 'Register Clinic'}
                        </button>
                    </div>

                    <p className="text-center text-sm text-slate-400 mt-6 pt-4 border-t border-slate-700/50">
                        Already registered?{' '}
                        <button type="button" onClick={() => navigate('/login')} className="text-primary-400 font-medium hover:underline">
                            Sign in to your clinic
                        </button>
                    </p>
                </form>
            </div>
        </div>
    );
}
