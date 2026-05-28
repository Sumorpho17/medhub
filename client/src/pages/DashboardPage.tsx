import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuthStore } from '../stores/authStore.js';
import { motion } from 'framer-motion';

interface DashboardStats {
    totalPatients: number;
    visitsToday: number;
    revenueToday: number;
    outstandingBalance: number;
    staffCount: number;
    activeDevices: number;
}

interface RecentPatient {
    _id: string;
    firstName: string;
    lastName: string;
    patientId: string;
    phone?: string;
    gender?: string;
    createdAt: string;
}

function KpiCard({ title, value, subtitle, icon, color }: { title: string; value: string | number; subtitle?: string; icon: React.ReactNode; color: string }) {
    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card relative overflow-hidden group hover:border-primary-500/30 transition-all duration-300">
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <p className="text-xs text-slate-500 uppercase tracking-wider">{title}</p>
                    <p className="text-3xl font-bold text-slate-100">{typeof value === 'number' ? value.toLocaleString() : value}</p>
                    {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
                </div>
                <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>{icon}</div>
            </div>
        </motion.div>
    );
}

const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

export default function DashboardPage() {
    const navigate = useNavigate();
    const { user, permissions } = useAuthStore();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [recentPatients, setRecentPatients] = useState<RecentPatient[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const role = user?.role || '';
    const isDoctor = role === 'DOCTOR';
    const isReceptionist = role === 'RECEPTIONIST';
    const isBilling = role === 'BILLING_OFFICER';
    const isNurse = role === 'NURSE';
    const isAdmin = role === 'CLINIC_ADMIN';

    useEffect(() => {
        loadDashboard();
    }, []);

    async function loadDashboard() {
        setIsLoading(true);
        try {
            const dashboardStats = await api.get<DashboardStats>('/clinic/dashboard');
            setStats(dashboardStats);
        } catch {
        }
        try {
            const res = await api.get<{ patients: RecentPatient[] }>('/patients/search?q=a&limit=8');
            setRecentPatients(res.patients ?? []);
        } catch {
        } finally {
            setIsLoading(false);
        }
    }

    function getTimeBasedGreeting(): string {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    }

    function getTodayDate(): string {
        return new Date().toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }

    const quickActions = [
        ...(isReceptionist || isDoctor ? [{ label: 'New Patient', path: '/dashboard/patients/new', icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z' }] : []),
        ...(isDoctor ? [{ label: 'New Consultation', path: '/dashboard/consultations/new', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' }] : []),
        ...(isNurse ? [{ label: 'Record Vitals', path: '/dashboard/vitals/new', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' }] : []),
        ...(isReceptionist || isBilling ? [{ label: 'New Invoice', path: '/dashboard/invoices/new', icon: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z' }] : []),
        ...(isAdmin ? [{ label: 'Manage Staff', path: '/dashboard/admin', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' }] : []),
    ];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                <span className="ml-3 text-slate-400 text-sm">Loading dashboard...</span>
            </div>
        );
    }

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="show">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-100">
                    {getTimeBasedGreeting()}, {user?.firstName}
                </h1>
                <p className="text-sm text-slate-400 mt-1">{getTodayDate()}</p>
            </div>

            {stats && (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
                    <KpiCard title="Total Patients" value={stats.totalPatients} icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} color="bg-primary-500/30" />
                    <KpiCard title="Today's Visits" value={stats.visitsToday} icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} color="bg-clinical-info/30" />
                    <KpiCard title="Revenue Today" value={`₦${stats.revenueToday?.toLocaleString()}`} icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} color="bg-clinical-success/30" />
                    <KpiCard title="Outstanding" value={`₦${stats.outstandingBalance?.toLocaleString()}`} subtitle="Pending payments" icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} color="bg-clinical-warning/30" />
                    <KpiCard title="Staff" value={stats.staffCount} icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} color="bg-indigo-500/30" />
                    <KpiCard title="Active Devices" value={stats.activeDevices} icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>} color="bg-purple-500/30" />
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
                <div className="xl:col-span-2">
                    <motion.div variants={containerVariants} className="card h-full">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-slate-200">Quick Actions</h3>
                            <p className="text-xs text-slate-500">Role-based shortcuts</p>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {quickActions.map((action) => (
                                <button
                                    key={action.path}
                                    onClick={() => navigate(action.path)}
                                    className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/30 hover:border-primary-500/40 hover:bg-slate-800/60 transition-all duration-200 text-left group"
                                >
                                    <div className="w-9 h-9 rounded-lg bg-primary-500/20 flex items-center justify-center mb-2 group-hover:bg-primary-500/30 transition-colors">
                                        <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={action.icon} />
                                        </svg>
                                    </div>
                                    <p className="text-sm font-medium text-slate-200">{action.label}</p>
                                </button>
                            ))}
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-700/30">
                            <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-3">Quick Links</h4>
                            <div className="flex flex-wrap gap-2">
                                <Link to="/dashboard/patients" className="text-xs px-3 py-1.5 rounded-lg bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 transition-colors">Patient Directory</Link>
                                <Link to="/dashboard/invoices" className="text-xs px-3 py-1.5 rounded-lg bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 transition-colors">Invoices</Link>
                                <Link to="/dashboard/reports/revenue" className="text-xs px-3 py-1.5 rounded-lg bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 transition-colors">Revenue Reports</Link>
                                <Link to="/dashboard/appointments" className="text-xs px-3 py-1.5 rounded-lg bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 transition-colors">Appointments</Link>
                            </div>
                        </div>
                    </motion.div>
                </div>

                <div>
                    <motion.div variants={containerVariants} className="card">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-slate-200">Recent Patients</h3>
                            <Link to="/dashboard/patients" className="text-xs text-primary-400 hover:text-primary-300 transition-colors">View all</Link>
                        </div>
                        {recentPatients.length === 0 ? (
                            <div className="text-center py-8">
                                <svg className="w-10 h-10 mx-auto text-slate-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <p className="text-slate-500 text-sm mb-2">No patients yet</p>
                                <button onClick={() => navigate('/dashboard/patients/new')} className="text-primary-400 hover:underline text-xs">Register your first patient</button>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {recentPatients.map((p, i) => (
                                    <Link
                                        key={p._id}
                                        to={`/dashboard/patients/${p._id}`}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-700/40 transition-colors group"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                                            <span className="text-xs font-bold text-primary-400">{p.firstName[0]}{p.lastName[0]}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-200 truncate group-hover:text-primary-300 transition-colors">{p.firstName} {p.lastName}</p>
                                            <p className="text-xs text-slate-500 font-mono">{p.patientId}</p>
                                        </div>
                                        <span className="text-xs text-slate-500">{p.gender?.charAt(0).toUpperCase()}</span>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
}
