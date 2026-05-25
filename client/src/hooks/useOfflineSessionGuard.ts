// ═══════════════════════════════════════════════════════════
// MEDHUB — Offline Session Expiry Guard Hook
// Enforces the 72-hour offline session limit.
// Checks on mount, on page focus, and every 30 minutes.
// On expiry: closes DB, clears auth state, redirects to login.
// ═══════════════════════════════════════════════════════════

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore.js';
import { OFFLINE_EXPIRY_CHECK_INTERVAL_MS } from '@medhub/shared';

export function useOfflineSessionGuard(): void {
    const { user, checkOfflineSessionExpiry, logout } = useAuthStore();
    const navigate = useNavigate();
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const handleExpiry = async () => {
        await logout();
        navigate('/login?reason=offline_session_expired', { replace: true });
    };

    const check = () => {
        if (!user) return; // Not logged in — nothing to check
        if (checkOfflineSessionExpiry()) {
            void handleExpiry();
        }
    };

    useEffect(() => {
        if (!user) return;

        // Check immediately on mount
        check();

        // Check on window focus (user returns to tab/device)
        const onFocus = () => check();
        window.addEventListener('focus', onFocus);

        // Check on interval
        intervalRef.current = setInterval(check, OFFLINE_EXPIRY_CHECK_INTERVAL_MS);

        return () => {
            window.removeEventListener('focus', onFocus);
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [user]);
}
