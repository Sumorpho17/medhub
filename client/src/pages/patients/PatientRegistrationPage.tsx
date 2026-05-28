import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreatePatientSchema, type CreatePatientInput } from '@medhub/shared';
import { api, ApiError } from '../../lib/api.js';
import { motion } from 'framer-motion';

const SECTIONS = [
    { key: 'demographics', label: 'Demographics', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    { key: 'contact', label: 'Contact', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    { key: 'emergency', label: 'Emergency', icon: 'M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { key: 'clinical', label: 'Clinical', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
];

export default function PatientRegistrationPage() {
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [activeTab, setActiveTab] = useState(0);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        trigger,
    } = useForm<CreatePatientInput>({
        resolver: zodResolver(CreatePatientSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
            dateOfBirth: '',
            gender: 'male',
            phone: '',
            email: '',
            address: '',
            emergencyContactName: '',
            emergencyContactPhone: '',
            bloodGroup: null,
            genotype: null,
            allergies: '',
            chronicConditions: '',
        },
    });

    const onSubmit = async (data: CreatePatientInput) => {
        try {
            setError(null);
            const patient = await api.post('/patients', {
                ...data,
                bloodGroup: data.bloodGroup || null,
                genotype: data.genotype || null,
            });
            setSuccess(true);
            setTimeout(() => {
                navigate(`/dashboard/patients/${(patient as any)._id}`, { replace: true });
            }, 1500);
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.message);
            } else {
                setError('Failed to register patient. Please try again.');
            }
        }
    };

    const handleTabNext = async () => {
        if (activeTab < SECTIONS.length - 1) {
            setActiveTab(activeTab + 1);
        }
    };

    const handleTabPrev = () => {
        if (activeTab > 0) {
            setActiveTab(activeTab - 1);
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
                    <h2 className="text-xl font-bold text-slate-100">Patient Registered</h2>
                    <p className="text-slate-400 mt-2">Redirecting to patient record...</p>
                </div>
            </div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100">Register Patient</h1>
                    <p className="text-sm text-slate-400 mt-1">Create a new patient record</p>
                </div>
                <button onClick={() => navigate('/dashboard/patients')} className="text-sm text-slate-400 hover:text-slate-200 transition-colors">
                    Back to Directory
                </button>
            </div>

            {error && (
                <div className="mb-6 p-4 rounded-xl bg-clinical-danger/10 border border-clinical-danger/20 text-clinical-danger text-sm">{error}</div>
            )}

            <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
                {SECTIONS.map((section, i) => (
                    <button
                        key={section.key}
                        onClick={() => setActiveTab(i)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                            i === activeTab
                                ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                                : i < activeTab
                                    ? 'bg-clinical-success/10 text-clinical-success border border-clinical-success/20'
                                    : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:border-slate-600'
                        }`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {i < activeTab ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={section.icon} />
                            )}
                        </svg>
                        <span>{i < activeTab ? 'Done' : section.label}</span>
                    </button>
                ))}
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl space-y-6">
                {activeTab === 0 && (
                    <motion.div key="demographics" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="card">
                        <h3 className="text-lg font-semibold text-slate-200 mb-4">Demographics</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">First Name *</label>
                                <input {...register('firstName')} className="input-field" placeholder="Patient's first name" autoFocus />
                                {errors.firstName && <p className="mt-1 text-sm text-clinical-danger">{errors.firstName.message}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Last Name *</label>
                                <input {...register('lastName')} className="input-field" placeholder="Patient's last name" />
                                {errors.lastName && <p className="mt-1 text-sm text-clinical-danger">{errors.lastName.message}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Date of Birth *</label>
                                <input type="date" {...register('dateOfBirth')} className="input-field" />
                                {errors.dateOfBirth && <p className="mt-1 text-sm text-clinical-danger">{errors.dateOfBirth.message}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Gender *</label>
                                <select {...register('gender')} className="input-field">
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                                {errors.gender && <p className="mt-1 text-sm text-clinical-danger">{errors.gender.message}</p>}
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 1 && (
                    <motion.div key="contact" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="card">
                        <h3 className="text-lg font-semibold text-slate-200 mb-4">Contact Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Phone *</label>
                                <input {...register('phone')} className="input-field" placeholder="+234 800 000 0000" autoFocus />
                                {errors.phone && <p className="mt-1 text-sm text-clinical-danger">{errors.phone.message}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
                                <input type="email" {...register('email')} className="input-field" placeholder="patient@example.com" />
                                {errors.email && <p className="mt-1 text-sm text-clinical-danger">{errors.email.message}</p>}
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Address</label>
                                <input {...register('address')} className="input-field" placeholder="Residential address" />
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 2 && (
                    <motion.div key="emergency" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="card">
                        <h3 className="text-lg font-semibold text-slate-200 mb-4">Emergency Contact</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Contact Name</label>
                                <input {...register('emergencyContactName')} className="input-field" placeholder="Next of kin name" autoFocus />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Contact Phone</label>
                                <input {...register('emergencyContactPhone')} className="input-field" placeholder="+234 800 000 0000" />
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 3 && (
                    <motion.div key="clinical" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="card">
                        <h3 className="text-lg font-semibold text-slate-200 mb-4">Clinical Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Blood Group</label>
                                <select {...register('bloodGroup')} className="input-field" autoFocus>
                                    <option value="">Not specified</option>
                                    <option value="A+">A+</option>
                                    <option value="A-">A-</option>
                                    <option value="B+">B+</option>
                                    <option value="B-">B-</option>
                                    <option value="AB+">AB+</option>
                                    <option value="AB-">AB-</option>
                                    <option value="O+">O+</option>
                                    <option value="O-">O-</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Genotype</label>
                                <select {...register('genotype')} className="input-field">
                                    <option value="">Not specified</option>
                                    <option value="AA">AA</option>
                                    <option value="AS">AS</option>
                                    <option value="SS">SS</option>
                                    <option value="AC">AC</option>
                                    <option value="SC">SC</option>
                                    <option value="CC">CC</option>
                                </select>
                            </div>
                        </div>
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Allergies</label>
                            <textarea {...register('allergies')} className="input-field" rows={2} placeholder="List known allergies, separated by commas" />
                        </div>
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Chronic Conditions</label>
                            <textarea {...register('chronicConditions')} className="input-field" rows={2} placeholder="List chronic conditions, separated by commas" />
                        </div>
                    </motion.div>
                )}

                <div className="flex items-center justify-between">
                    <div>
                        {activeTab > 0 && (
                            <button type="button" onClick={handleTabPrev} className="px-4 py-2 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700/50 transition-colors text-sm font-medium">
                                Previous
                            </button>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button type="button" onClick={() => navigate('/dashboard/patients')} className="px-6 py-2.5 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700/50 transition-colors text-sm font-medium">
                            Cancel
                        </button>
                        {activeTab < SECTIONS.length - 1 ? (
                            <button type="button" onClick={handleTabNext} className="btn-primary">
                                Next
                            </button>
                        ) : (
                            <button type="submit" disabled={isSubmitting} className="btn-primary">
                                {isSubmitting ? 'Registering...' : 'Register Patient'}
                            </button>
                        )}
                    </div>
                </div>
            </form>
        </motion.div>
    );
}
