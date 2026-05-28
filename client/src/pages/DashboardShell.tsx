import { useEffect, useState, lazy, Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore.js';
import { logout as apiLogout } from '../services/authHelper.js';
import { useSyncStatus } from '../hooks/useSyncStatus.js';
import { motion, AnimatePresence } from 'framer-motion';

const PatientListPage = lazy(() => import('./patients/PatientListPage.js'));
const PatientRegistrationPage = lazy(() => import('./patients/PatientRegistrationPage.js'));
const PatientDetailPage = lazy(() => import('./patients/PatientDetailPage.js'));
const ConsultationPage = lazy(() => import('./clinical/ConsultationPage.js'));
const VitalsPage = lazy(() => import('./clinical/VitalsPage.js'));
const PrescriptionPage = lazy(() => import('./clinical/PrescriptionPage.js'));
const DischargeSummaryPage = lazy(() => import('./clinical/DischargeSummaryPage.js'));
const InvoiceListPage = lazy(() => import('./billing/InvoiceListPage.js'));
const InvoiceCreatePage = lazy(() => import('./billing/InvoiceCreatePage.js'));
const InvoiceDetailPage = lazy(() => import('./billing/InvoiceDetailPage.js'));
const RevenueReportPage = lazy(() => import('./billing/RevenueReportPage.js'));
const DashboardPage = lazy(() => import('./DashboardPage.js'));
const AppointmentsPage = lazy(() => import('./AppointmentsPage.js'));
const AdminPage = lazy(() => import('./AdminPage.js'));

function LoadingFallback() {
    return (
        <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );
}

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
    return <Suspense fallback={<LoadingFallback />}>{children}</Suspense>;
}

const ROLE_ACCENT: Record<string, string> = {
    DOCTOR: 'primary',
    NURSE: 'emerald',
    RECEPTIONIST: 'purple',
    BILLING_OFFICER: 'amber',
    PHARMACIST: 'pink',
    LAB_TECH: 'cyan',
    CLINIC_ADMIN: 'rose',
};

const NAV_ITEMS = [
    { section: 'Main', items: [
        { path: '/dashboard', label: 'Overview', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
        { path: '/dashboard/patients', label: 'Patients', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
        { path: '/dashboard/appointments', label: 'Appointments', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    ]},
    { section: 'Clinical', items: [
        { path: '/dashboard/consultations/new', label: 'Consultation', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
        { path: '/dashboard/vitals/new', label: 'Vitals', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
        { path: '/dashboard/prescriptions/new', label: 'Prescription', icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z' },
        { path: '/dashboard/discharge-summaries/new', label: 'Discharge', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    ]},
    { section: 'Billing', items: [
        { path: '/dashboard/invoices', label: 'Invoices', icon: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z' },
        { path: '/dashboard/reports/revenue', label: 'Revenue Report', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    ]},
    { section: 'Admin', items: [
        { path: '/dashboard/admin', label: 'Administration', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
    ]},
];

function NavLink({ path, label, icon, isCollapsed, onClick }: { path: string; label: string; icon: string; isCollapsed: boolean; onClick?: () => void }) {
    const location = useLocation();
    const isActive = location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path));
    return (
        <Link
            to={path}
            onClick={onClick}
            className={`group flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-4'} py-2.5 text-sm font-medium rounded-xl transition-all duration-150 ${isActive ? 'bg-primary-500/10 text-primary-400 shadow-sm' : 'text-slate-400 hover:bg-slate-700/30 hover:text-slate-200'}`}
            title={isCollapsed ? label : undefined}
        >
            <div className={`flex items-center ${isCollapsed ? '' : 'gap-3'}`}>
                <svg className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-primary-400' : 'text-slate-500 group-hover:text-slate-300'} transition-colors`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                </svg>
                {!isCollapsed && <span>{label}</span>}
            </div>
        </Link>
    );
}

export default function DashboardShell() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout, markOnline } = useAuthStore();
    const { isOnline, isSyncing, lastSyncedAt, pendingChanges, triggerSync } = useSyncStatus();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searchOpen, setSearchOpen] = useState(false);

    useEffect(() => {
        const handleOnline = () => markOnline();
        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, [markOnline]);

    const handleLogout = async () => {
        try {
            await apiLogout();
            await logout();
            navigate('/login', { replace: true });
        } catch (err) {
            console.error('Logout failed', err);
        }
    };

    useEffect(() => {
        setMobileMenuOpen(false);
    }, [location]);

    let searchDebounce: ReturnType<typeof setTimeout>;
    const handleSearch = (q: string) => {
        setSearchQuery(q);
        clearTimeout(searchDebounce);
        if (q.length < 2) {
            setSearchResults([]);
            setSearchOpen(false);
            return;
        }
        searchDebounce = setTimeout(async () => {
            try {
                const { api } = await import('../lib/api.js');
                const res = await api.get<{ patients: any[] }>(`/patients/search?q=${encodeURIComponent(q)}&limit=8`);
                setSearchResults(res.patients ?? []);
                setSearchOpen(true);
            } catch {
                setSearchResults([]);
            }
        }, 300);
    };

    const role = user?.role || '';
    const roleColor = ROLE_ACCENT[role] || 'primary';

    return (
        <div className="flex h-screen bg-[#0f172a] overflow-hidden">
            <aside className={`bg-surface-elevated border-r border-slate-700/50 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-64'} hidden md:flex flex-shrink-0`}>
                <div className={`p-5 border-b border-slate-700/50 flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
                    {!sidebarCollapsed && (
                        <div>
                            <h1 className="text-xl font-bold text-primary-400 tracking-tight">MEDHUB</h1>
                            <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wider">{role.replace('_', ' ')}</p>
                        </div>
                    )}
                    <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="text-slate-500 hover:text-slate-300 transition-colors p-1">
                        <svg className={`w-4 h-4 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                        </svg>
                    </button>
                </div>

                <nav className="flex-1 p-3 space-y-3 overflow-y-auto">
                    {NAV_ITEMS.map((group) => {
                        if (group.section === 'Admin' && role !== 'CLINIC_ADMIN') return null;
                        return (
                            <div key={group.section}>
                                {!sidebarCollapsed && (
                                    <p className="px-4 mb-1 text-[10px] text-slate-600 uppercase tracking-widest font-medium">{group.section}</p>
                                )}
                                <div className="space-y-0.5">
                                    {group.items.map((item) => (
                                        <NavLink key={item.path} {...item} isCollapsed={sidebarCollapsed} />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </nav>

                <div className={`p-3 border-t border-slate-700/50 ${sidebarCollapsed ? 'text-center' : ''}`}>
                    <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center' : 'px-3'} py-2`}>
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-medium flex-shrink-0">
                            {user?.firstName?.[0] || ''}{user?.lastName?.[0] || ''}
                        </div>
                        {!sidebarCollapsed && (
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-200 truncate">{user?.firstName} {user?.lastName}</p>
                                <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={handleLogout}
                        className={`w-full mt-2 text-left ${sidebarCollapsed ? 'px-0 text-center' : 'px-3'} py-2 text-sm text-slate-500 hover:text-clinical-danger hover:bg-clinical-danger/10 rounded-xl transition-colors flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}
                        title="Sign Out"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        {!sidebarCollapsed && <span>Sign Out</span>}
                    </button>
                </div>
            </aside>

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="h-16 bg-surface-elevated/80 backdrop-blur-md border-b border-slate-700/50 flex items-center justify-between px-4 lg:px-6 z-20 gap-4">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setMobileMenuOpen(true)} className="md:hidden text-slate-400 hover:text-slate-200 transition-colors p-1">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                        <div className="relative hidden sm:block">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                                onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
                                placeholder="Search patients..."
                                className="pl-9 pr-4 py-2 w-56 lg:w-72 bg-slate-800/50 border border-slate-700/50 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/30 transition-colors"
                            />
                            {searchOpen && searchResults.length > 0 && (
                                <div className="absolute top-full mt-1 left-0 w-full bg-surface-elevated border border-slate-700/50 rounded-xl shadow-xl overflow-hidden z-50">
                                    {searchResults.map((p: any) => (
                                        <button
                                            key={p._id}
                                            onClick={() => { setSearchOpen(false); setSearchQuery(''); navigate(`/dashboard/patients/${p._id}`); }}
                                            className="w-full text-left px-4 py-2.5 hover:bg-slate-700/50 transition-colors border-b border-slate-700/30 last:border-b-0"
                                        >
                                            <p className="text-sm text-slate-200">{p.firstName} {p.lastName}</p>
                                            <p className="text-xs text-slate-500 font-mono">{p.patientId}</p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={triggerSync}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700/50 transition-colors group"
                            title={lastSyncedAt ? `Last synced: ${lastSyncedAt.toLocaleTimeString()}` : 'Sync status'}
                        >
                            <div className={`relative w-2 h-2 ${isOnline ? (isSyncing ? 'bg-clinical-warning' : 'bg-clinical-success') : 'bg-clinical-danger'} rounded-full ${isSyncing ? 'animate-pulse' : ''}`}>
                                {isSyncing && <div className="absolute inset-0 rounded-full bg-clinical-warning animate-ping opacity-30" />}
                            </div>
                            <span className="text-xs text-slate-400 hidden sm:inline group-hover:text-slate-200 transition-colors">
                                {!isOnline ? 'Offline' : isSyncing ? 'Syncing...' : 'Online'}
                            </span>
                            {pendingChanges > 0 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-medium">{pendingChanges}</span>
                            )}
                        </button>

                        <div className="relative">
                            <button className="text-slate-400 hover:text-slate-200 transition-colors p-1.5 relative">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-clinical-danger rounded-full" />
                            </button>
                        </div>
                    </div>
                </header>

                {!isOnline && (
                    <div className="bg-clinical-warning/10 border-b border-clinical-warning/20 px-4 lg:px-6 py-2">
                        <div className="flex items-center gap-2 max-w-6xl mx-auto">
                            <svg className="w-4 h-4 text-clinical-warning flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            <p className="text-xs text-clinical-warning">You are working offline. Changes will sync automatically when connectivity is restored.</p>
                        </div>
                    </div>
                )}

                {pendingChanges > 0 && isOnline && (
                    <div className="bg-primary-500/5 border-b border-primary-500/20 px-4 lg:px-6 py-1.5">
                        <div className="flex items-center gap-2 max-w-6xl mx-auto">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse" />
                            <p className="text-[11px] text-primary-400">{pendingChanges} pending change{pendingChanges !== 1 ? 's' : ''} — will sync shortly</p>
                        </div>
                    </div>
                )}

                <main className="flex-1 overflow-y-auto p-4 lg:p-8">
                    <div className="max-w-6xl mx-auto">
                        <Routes>
                            <Route path="/" element={<SuspenseWrapper><DashboardPage /></SuspenseWrapper>} />
                            <Route path="/patients" element={<SuspenseWrapper><PatientListPage /></SuspenseWrapper>} />
                            <Route path="/patients/new" element={<SuspenseWrapper><PatientRegistrationPage /></SuspenseWrapper>} />
                            <Route path="/patients/:id" element={<SuspenseWrapper><PatientDetailPage /></SuspenseWrapper>} />
                            <Route path="/consultations/new" element={<SuspenseWrapper><ConsultationPage /></SuspenseWrapper>} />
                            <Route path="/vitals/new" element={<SuspenseWrapper><VitalsPage /></SuspenseWrapper>} />
                            <Route path="/prescriptions/new" element={<SuspenseWrapper><PrescriptionPage /></SuspenseWrapper>} />
                            <Route path="/discharge-summaries/new" element={<SuspenseWrapper><DischargeSummaryPage /></SuspenseWrapper>} />
                            <Route path="/invoices" element={<SuspenseWrapper><InvoiceListPage /></SuspenseWrapper>} />
                            <Route path="/invoices/new" element={<SuspenseWrapper><InvoiceCreatePage /></SuspenseWrapper>} />
                            <Route path="/invoices/:id" element={<SuspenseWrapper><InvoiceDetailPage /></SuspenseWrapper>} />
                            <Route path="/reports/revenue" element={<SuspenseWrapper><RevenueReportPage /></SuspenseWrapper>} />
                            <Route path="/appointments" element={<SuspenseWrapper><AppointmentsPage /></SuspenseWrapper>} />
                            {role === 'CLINIC_ADMIN' && <Route path="/admin" element={<SuspenseWrapper><AdminPage /></SuspenseWrapper>} />}
                        </Routes>
                    </div>
                </main>
            </div>

            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-50 md:hidden" onClick={() => setMobileMenuOpen(false)}>
                        <motion.div initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} transition={{ type: 'spring', damping: 25 }} className="w-72 bg-surface-elevated border-r border-slate-700/50 h-full p-4 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-6">
                                <h1 className="text-xl font-bold text-primary-400">MEDHUB</h1>
                                <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400 hover:text-slate-200">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-4">{role.replace('_', ' ')}</p>
                            <div className="space-y-3">
                                {NAV_ITEMS.map((group) => {
                                    if (group.section === 'Admin' && role !== 'CLINIC_ADMIN') return null;
                                    return (
                                        <div key={group.section}>
                                            <p className="px-4 mb-1 text-[10px] text-slate-600 uppercase tracking-widest font-medium">{group.section}</p>
                                            {group.items.map((item) => (
                                                <NavLink key={item.path} {...item} isCollapsed={false} onClick={() => setMobileMenuOpen(false)} />
                                            ))}
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

