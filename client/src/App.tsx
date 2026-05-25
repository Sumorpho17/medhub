// ═══════════════════════════════════════════════════════════
// MEDHUB — App Router
// Routes: login, register, dashboard shell
// ProtectedRoute guards all authenticated areas.
// Offline session guard is mounted at app level.
// ═══════════════════════════════════════════════════════════

import { Routes, Route, Navigate } from 'react-router-dom';
import { useOfflineSessionGuard } from './hooks/useOfflineSessionGuard.js';
import { useAuthStore } from './stores/authStore.js';
import LoginPage from './pages/LoginPage.js';
import RegisterPage from './pages/RegisterPage.js';
import DashboardShell from './pages/DashboardShell.js';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const user = useAuthStore((s) => s.user);
    if (!user) return <Navigate to="/login" replace />;
    return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
    const user = useAuthStore((s) => s.user);
    if (user) return <Navigate to="/dashboard" replace />;
    return <>{children}</>;
}

export default function App() {
    // Enforce 72-hour offline session expiry at app level
    useOfflineSessionGuard();

    return (
        <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route
                path="/login"
                element={
                    <PublicRoute>
                        <LoginPage />
                    </PublicRoute>
                }
            />
            <Route
                path="/register"
                element={
                    <PublicRoute>
                        <RegisterPage />
                    </PublicRoute>
                }
            />
            <Route
                path="/dashboard/*"
                element={
                    <ProtectedRoute>
                        <DashboardShell />
                    </ProtectedRoute>
                }
            />
            <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
    );
}
