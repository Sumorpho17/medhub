// ═══════════════════════════════════════════════════════════
// MEDHUB — Dashboard Shell
// The main layout wrapping all protected pages. Includes:
// - Sidebar navigation (role-based)
// - Top header with sync status indicator
// - Logout handling
// ═══════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore.js';
import { logout as apiLogout } from '../services/authHelper.js';
import { isDbOpen } from '../lib/db.js';

// Simple placeholder page for routing testing
function PlaceholderPage({ title }: { title: string }) {
    return (
        <div>
            <h1 className="text-2xl font-bold text-slate-100 mb-4">{title}</h1>
            <div className="card">
                <p className="text-slate-400">Content for {title} will go here.</p>
            </div>
        </div>
    );
}

export default function DashboardShell() {
    const navigate = useNavigate();
    const { user, logout, markOnline } = useAuthStore();
    const [isSyncing, setIsSyncing] = useState(true);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            markOnline(); // Update lastOnlineAt timestamp
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Initial check for DB open status (indicates PouchDB is initialized via useAuthStore)
        setIsSyncing(isDbOpen());

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [markOnline]);

    const handleLogout = async () => {
        try {
            await apiLogout();
            await logout(); // Clear zustand and IndexedDB key
            navigate('/login', { replace: true });
        } catch (err) {
            console.error('Logout failed', err);
        }
    };

    return (
        <div className="flex h-screen bg-[#0f172a] overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 bg-surface-elevated border-r border-slate-700/50 flex flex-col hidden md:flex">
                <div className="p-6 border-b border-slate-700/50">
                    <h1 className="text-xl font-bold text-primary-400 tracking-tight">MEDHUB</h1>
                    <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">{user?.role?.replace('_', ' ')}</p>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    <Link to="/dashboard" className="flex items-center px-4 py-3 text-sm font-medium rounded-xl bg-primary-500/10 text-primary-400">
                        Overview
                    </Link>
                    <Link to="/dashboard/patients" className="flex items-center px-4 py-3 text-sm font-medium rounded-xl text-slate-300 hover:bg-slate-700/50 hover:text-slate-100 transition-colors">
                        Patients
                    </Link>
                    <Link to="/dashboard/appointments" className="flex items-center px-4 py-3 text-sm font-medium rounded-xl text-slate-300 hover:bg-slate-700/50 hover:text-slate-100 transition-colors">
                        Appointments
                    </Link>
                    {user?.role === 'CLINIC_ADMIN' && (
                        <Link to="/dashboard/admin" className="flex items-center px-4 py-3 text-sm font-medium rounded-xl text-slate-300 hover:bg-slate-700/50 hover:text-slate-100 transition-colors">
                            Administration
                        </Link>
                    )}
                </nav>

                <div className="p-4 border-t border-slate-700/50">
                    <div className="flex items-center gap-3 px-4 py-2">
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-medium">
                            {user?.firstName?.[0] || ''}{user?.lastName?.[0] || ''}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-200 truncate">{user?.firstName} {user?.lastName}</p>
                            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full mt-4 text-left px-4 py-2 text-sm text-clinical-danger hover:bg-clinical-danger/10 rounded-xl transition-colors"
                    >
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Top Header */}
                <header className="h-16 bg-surface-elevated/50 backdrop-blur-md border-b border-slate-700/50 flex items-center justify-between px-6 z-10">
                    <div className="flex items-center">
                        {/* Mobile menu button would go here */}
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Sync Status Indicator */}
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/50 border border-slate-700/50">
                            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-clinical-success' : 'bg-clinical-warning animate-pulse'}`}></div>
                            <span className="text-xs font-medium text-slate-300">
                                {isOnline ? (isSyncing ? 'Syncing Active' : 'Online') : 'Offline Mode'}
                            </span>
                        </div>
                    </div>
                </header>

                {/* Page Content Viewport */}
                <main className="flex-1 overflow-y-auto p-6 md:p-8">
                    <div className="max-w-6xl mx-auto">
                        <Routes>
                            <Route path="/" element={<PlaceholderPage title="Dashboard Overview" />} />
                            <Route path="/patients" element={<PlaceholderPage title="Patient Directory" />} />
                            <Route path="/appointments" element={<PlaceholderPage title="Appointments" />} />
                            <Route path="/admin" element={<PlaceholderPage title="Clinic Administration" />} />
                        </Routes>
                    </div>
                </main>
            </div>
        </div>
    );
}
