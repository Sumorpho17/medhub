import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api, ApiError } from '../../lib/api.js';
import { motion } from 'framer-motion';

interface Patient {
    _id: string;
    _rev: string;
    firstName: string;
    lastName: string;
    patientId: string;
    dateOfBirth: string;
    gender: string;
    phone: string;
    email?: string;
    address?: string;
    bloodGroup?: string | null;
    genotype?: string | null;
    allergies?: string;
    chronicConditions?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    createdAt: string;
}

interface TimelineEvent {
    type: 'consultation' | 'vitals' | 'prescription' | 'discharge' | 'invoice' | 'registration';
    title: string;
    subtitle: string;
    date: string;
    icon: React.ReactNode;
    color: string;
    id?: string;
}

const TIMELINE_ICONS = {
    consultation: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    vitals: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
    prescription: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>,
    discharge: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    invoice: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>,
    registration: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>,
};

const TIMELINE_COLORS = {
    consultation: 'border-blue-500 bg-blue-500/20 text-blue-400',
    vitals: 'border-emerald-500 bg-emerald-500/20 text-emerald-400',
    prescription: 'border-purple-500 bg-purple-500/20 text-purple-400',
    discharge: 'border-amber-500 bg-amber-500/20 text-amber-400',
    invoice: 'border-green-500 bg-green-500/20 text-green-400',
    registration: 'border-sky-500 bg-sky-500/20 text-sky-400',
};

export default function PatientDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [patient, setPatient] = useState<Patient | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
    const [timelineLoading, setTimelineLoading] = useState(true);

    useEffect(() => {
        if (id) {
            loadPatient(id);
            loadTimeline(id);
        }
    }, [id]);

    async function loadPatient(patientId: string) {
        setIsLoading(true);
        try {
            const p = await api.get<Patient>(`/patients/${patientId}`);
            setPatient(p);
        } catch (err) {
            if (err instanceof ApiError && err.status === 404) {
                navigate('/dashboard/patients', { replace: true });
            }
        } finally {
            setIsLoading(false);
        }
    }

    async function loadTimeline(patientId: string) {
        setTimelineLoading(true);
        const events: TimelineEvent[] = [];
        try {
            const consultations = await api.get<{ consultations: any[] }>(`/patients/${patientId}/consultations`);
            if (consultations.consultations) {
                consultations.consultations.forEach((c: any) => {
                    events.push({
                        type: 'consultation',
                        title: 'Consultation',
                        subtitle: c.chiefComplaint || 'No chief complaint recorded',
                        date: c.createdAt || c.encounterDate,
                        icon: TIMELINE_ICONS.consultation,
                        color: TIMELINE_COLORS.consultation,
                        id: c._id,
                    });
                });
            }
        } catch {}

        try {
            const vitalsList = await api.get<{ vitals: any[] }>(`/patients/${patientId}/vitals`);
            if (vitalsList.vitals) {
                vitalsList.vitals.forEach((v: any) => {
                    const bp = v.bloodPressureSystolic && v.bloodPressureDiastolic ? `BP ${v.bloodPressureSystolic}/${v.bloodPressureDiastolic}` : '';
                    events.push({
                        type: 'vitals',
                        title: 'Vitals Recorded',
                        subtitle: bp || v.notes || 'Vitals check',
                        date: v.createdAt || v.recordedAt,
                        icon: TIMELINE_ICONS.vitals,
                        color: TIMELINE_COLORS.vitals,
                        id: v._id,
                    });
                });
            }
        } catch {}

        try {
            const invoices = await api.get<{ invoices: any[] }>(`/billing/invoices?patientId=${patientId}`);
            if (invoices.invoices) {
                invoices.invoices.forEach((inv: any) => {
                    events.push({
                        type: 'invoice',
                        title: `Invoice ${inv.invoiceNumber || ''}`,
                        subtitle: `₦${inv.total?.toLocaleString() || '0'} · ${inv.status}`,
                        date: inv.createdAt,
                        icon: TIMELINE_ICONS.invoice,
                        color: TIMELINE_COLORS.invoice,
                        id: inv._id,
                    });
                });
            }
        } catch {}

        events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setTimeline(events);
        setTimelineLoading(false);
    }

    function getAge(dob: string): string {
        const birth = new Date(dob);
        const today = new Date();
        const age = today.getFullYear() - birth.getFullYear();
        return `${age} years`;
    }

    function getInitials(firstName: string, lastName: string): string {
        return `${firstName.charAt(0)}${lastName.charAt(0)}`;
    }

    function formatDate(dateStr: string): string {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                <span className="ml-3 text-slate-400 text-sm">Loading patient record...</span>
            </div>
        );
    }

    if (!patient) return null;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-center justify-between mb-6">
                <button
                    onClick={() => navigate('/dashboard/patients')}
                    className="text-sm text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Directory
                </button>
            </div>

            <div className="card mb-6">
                <div className="flex items-start gap-5">
                    <div className="w-16 h-16 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-xl font-bold text-primary-400">{getInitials(patient.firstName, patient.lastName)}</span>
                    </div>
                    <div className="flex-1">
                        <div className="flex items-start justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-100">{patient.firstName} {patient.lastName}</h1>
                                <p className="text-sm text-slate-400 mt-1 font-mono">{patient.patientId}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {(patient.allergies && patient.allergies.trim()) ? (
                                    <span className="badge-danger">Allergies: {patient.allergies}</span>
                                ) : null}
                                <button className="text-sm text-primary-400 hover:text-primary-300">Edit Record</button>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-4 text-sm">
                            <span className="text-slate-400"><span className="text-slate-500">DOB:</span> {patient.dateOfBirth} ({getAge(patient.dateOfBirth)})</span>
                            <span className="text-slate-400"><span className="text-slate-500">Gender:</span> {patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)}</span>
                            <span className="text-slate-400"><span className="text-slate-500">Phone:</span> {patient.phone}</span>
                            {patient.email && <span className="text-slate-400"><span className="text-slate-500">Email:</span> {patient.email}</span>}
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-700/30">
                    <Link to={`/dashboard/consultations/new?patientId=${patient._id}`} className="text-xs px-3 py-1.5 rounded-lg bg-primary-500/20 text-primary-400 hover:bg-primary-500/30 transition-colors">New Consultation</Link>
                    <Link to={`/dashboard/vitals/new?patientId=${patient._id}`} className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors">Record Vitals</Link>
                    <Link to={`/dashboard/prescriptions/new?patientId=${patient._id}`} className="text-xs px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors">Prescribe</Link>
                    <Link to={`/dashboard/invoices/new?patientId=${patient._id}`} className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors">Create Invoice</Link>
                    <Link to={`/dashboard/discharge-summaries/new?patientId=${patient._id}`} className="text-xs px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-colors">Discharge</Link>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="card">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-slate-200">Patient Timeline</h3>
                            <span className="text-xs text-slate-400">{timeline.length} event{timeline.length !== 1 ? 's' : ''}</span>
                        </div>
                        {timelineLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : timeline.length === 0 ? (
                            <div className="text-center py-10">
                                <svg className="w-10 h-10 mx-auto text-slate-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <p className="text-slate-500 mb-1">No visit records yet</p>
                                <p className="text-slate-500 text-xs">Timeline will populate after the first encounter</p>
                            </div>
                        ) : (
                            <div className="relative">
                                <div className="absolute left-4 top-2 bottom-2 w-px bg-slate-700" />
                                <div className="space-y-0">
                                    {timeline.map((event, i) => (
                                        <motion.div
                                            key={`${event.type}-${i}`}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.03 }}
                                            className="relative flex items-start gap-4 pb-6 last:pb-0"
                                        >
                                            <div className={`relative z-10 w-8 h-8 rounded-full ${event.color} flex items-center justify-center flex-shrink-0 border-2 border-[#1e293b]`}>
                                                {event.icon}
                                            </div>
                                            <div className="flex-1 min-w-0 pt-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-medium text-slate-200">{event.title}</p>
                                                    <span className="text-[10px] text-slate-500">{formatDate(event.date)}</span>
                                                </div>
                                                <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{event.subtitle}</p>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="card">
                        <h3 className="text-lg font-semibold text-slate-200 mb-4">Clinical Details</h3>
                        <div className="space-y-3">
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Blood Group</p>
                                <p className="text-sm text-slate-200 mt-0.5 font-medium">{patient.bloodGroup ?? <span className="text-slate-500">Not recorded</span>}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Genotype</p>
                                <p className="text-sm text-slate-200 mt-0.5 font-medium">{patient.genotype ?? <span className="text-slate-500">Not recorded</span>}</p>
                            </div>
                            <div className="pt-2 border-t border-slate-700/30">
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Allergies</p>
                                <p className={`text-sm mt-0.5 ${patient.allergies ? 'text-clinical-danger font-medium' : 'text-slate-500'}`}>{patient.allergies || 'None recorded'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Chronic Conditions</p>
                                <p className={`text-sm mt-0.5 ${patient.chronicConditions ? 'text-clinical-warning' : 'text-slate-500'}`}>{patient.chronicConditions || 'None recorded'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <h3 className="text-lg font-semibold text-slate-200 mb-4">Emergency Contact</h3>
                        <div className="space-y-3">
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Name</p>
                                <p className="text-sm text-slate-200 mt-0.5">{patient.emergencyContactName || <span className="text-slate-500">Not recorded</span>}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Phone</p>
                                <p className="text-sm text-slate-200 mt-0.5">{patient.emergencyContactPhone || <span className="text-slate-500">Not recorded</span>}</p>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <h3 className="text-sm font-semibold text-slate-200 mb-3">Quick Stats</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-400">Total visits</span>
                                <span className="text-slate-200 font-medium">{timeline.length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Consultations</span>
                                <span className="text-slate-200 font-medium">{timeline.filter((t) => t.type === 'consultation').length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Invoices</span>
                                <span className="text-slate-200 font-medium">{timeline.filter((t) => t.type === 'invoice').length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Registered</span>
                                <span className="text-slate-200 font-medium">{formatDate(patient.createdAt)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
