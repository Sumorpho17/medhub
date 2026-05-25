// ═══════════════════════════════════════════════════════════
// MEDHUB — Login Page
// Handles email/password login and MFA TOTP verification.
// Uses React Hook Form + Zod for validation.
// Redirects to Dashboard on success.
// ═══════════════════════════════════════════════════════════

import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoginSchema, MfaVerifySchema, type LoginInput, type MfaVerifyInput, type AuthUser } from '@medhub/shared';
import { api, getDeviceFingerprint, ApiError } from '../lib/api.js';
import { useAuthStore } from '../stores/authStore.js';

export default function LoginPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const loginReason = searchParams.get('reason');

    const { login } = useAuthStore();
    const [error, setError] = useState<string | null>(null);

    // MFA state
    const [requiresMfa, setRequiresMfa] = useState(false);
    const [pendingUser, setPendingUser] = useState<AuthUser | null>(null);

    const {
        register: registerLogin,
        handleSubmit: handleLoginSubmit,
        formState: { errors: loginErrors, isSubmitting: isLoggingIn },
    } = useForm<LoginInput>({
        resolver: zodResolver(LoginSchema),
        defaultValues: {
            email: '',
            password: '',
            deviceFingerprint: 'placeholder',
        },
    });

    const {
        register: registerMfa,
        handleSubmit: handleMfaSubmit,
        formState: { errors: mfaErrors, isSubmitting: isVerifyingMfa },
    } = useForm<MfaVerifyInput>({
        resolver: zodResolver(MfaVerifySchema),
    });

    const onLogin = async (data: LoginInput) => {
        try {
            setError(null);
            data.deviceFingerprint = await getDeviceFingerprint();

            const res = await api.post<{
                requiresMfa?: boolean;
                accessToken?: string;
                user: AuthUser;
                permissions?: string[];
                lsk?: string;
            }>('/auth/login', data, true);

            if (res.requiresMfa) {
                setRequiresMfa(true);
                setPendingUser(res.user);
                return;
            }

            // Successful login without MFA
            await login(
                res.user!,
                res.permissions!,
                res.accessToken!,
                res.lsk!,
                'http://localhost:5984', // Dev couch url (would be via env in prod)
                'org.couchdb.user:clinic_' + res.user!.clinicId,
                'dev-password' // Should be fetched from server securely — but for Phase 0 we stub this
            );

            navigate('/dashboard', { replace: true });
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.message);
            } else {
                setError('An unexpected error occurred. Please try again.');
            }
        }
    };

    const onMfaVerify = async (data: MfaVerifyInput) => {
        // In Phase 0, MFA logic is stubbed out for the second step of login.
        // In a real app we'd have an endpoint POST /auth/login/mfa.
        // For now we'll display an error that it's incomplete.
        setError('MFA verification endpoint is not fully wired in Phase 0.');
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md card">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-primary-400 tracking-tight">MEDHUB</h1>
                    <p className="text-slate-400 mt-2">Sign in to your clinic</p>
                </div>

                {loginReason === 'offline_session_expired' && (
                    <div className="mb-6 p-4 rounded-xl bg-clinical-warning/10 border border-clinical-warning/20 text-clinical-warning text-sm text-center">
                        Your 72-hour offline session expired. For security, please log in again.
                    </div>
                )}

                {loginReason === 'session_expired' && (
                    <div className="mb-6 p-4 rounded-xl bg-clinical-warning/10 border border-clinical-warning/20 text-clinical-warning text-sm text-center">
                        Your session expired. Please log in again.
                    </div>
                )}

                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-clinical-danger/10 border border-clinical-danger/20 text-clinical-danger text-sm text-center">
                        {error}
                    </div>
                )}

                {!requiresMfa ? (
                    <form onSubmit={handleLoginSubmit(onLogin)} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="email">
                                Email Address
                            </label>
                            <input
                                id="email"
                                type="email"
                                className="input-field"
                                placeholder="doctor@clinic.com"
                                {...registerLogin('email')}
                            />
                            {loginErrors.email && (
                                <p className="mt-1 text-sm text-clinical-danger">{loginErrors.email.message}</p>
                            )}
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-1.5">
                                <label className="block text-sm font-medium text-slate-300" htmlFor="password">
                                    Password
                                </label>
                                <a href="#" className="text-xs text-primary-400 hover:text-primary-300">
                                    Forgot?
                                </a>
                            </div>
                            <input
                                id="password"
                                type="password"
                                className="input-field"
                                placeholder="••••••••"
                                {...registerLogin('password')}
                            />
                            {loginErrors.password && (
                                <p className="mt-1 text-sm text-clinical-danger">{loginErrors.password.message}</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isLoggingIn}
                            className="btn-primary w-full mt-2"
                        >
                            {isLoggingIn ? 'Authenticating...' : 'Sign In'}
                        </button>

                        <p className="text-center text-sm text-slate-400 mt-6 border-t border-slate-700/50 pt-6">
                            Don't have an account?{' '}
                            <button
                                type="button"
                                onClick={() => navigate('/register')}
                                className="text-primary-400 font-medium hover:underline"
                            >
                                Register your clinic
                            </button>
                        </p>
                    </form>
                ) : (
                    <form onSubmit={handleMfaSubmit(onMfaVerify)} className="space-y-5">
                        <p className="text-sm text-slate-300 text-center mb-4">
                            Enter the 6-digit code from your authenticator app to continue.
                        </p>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="token">
                                Authenticator Code
                            </label>
                            <input
                                id="token"
                                type="text"
                                maxLength={6}
                                className="input-field text-center tracking-[0.25em] text-lg"
                                placeholder="000000"
                                {...registerMfa('token')}
                            />
                            {mfaErrors.token && (
                                <p className="mt-1 text-sm text-clinical-danger">{mfaErrors.token.message}</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isVerifyingMfa}
                            className="btn-primary w-full mt-2"
                        >
                            {isVerifyingMfa ? 'Verifying...' : 'Verify Code'}
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setRequiresMfa(false);
                                setPendingUser(null);
                                setError(null);
                            }}
                            className="w-full text-slate-400 hover:text-slate-300 text-sm mt-4"
                        >
                            Cancel
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
