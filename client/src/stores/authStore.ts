// ═══════════════════════════════════════════════════════════
// MEDHUB — Auth Store (Zustand)
// LSK is kept IN MEMORY ONLY — never persisted to localStorage.
// On logout, LSK is zeroed and the DB is closed.
// ═══════════════════════════════════════════════════════════

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { initDb, closeDb } from '../lib/db.js';
import type { AuthUser } from '@medhub/shared';
import { SESSION_MAX_OFFLINE_MS } from '@medhub/shared';

interface AuthState {
    // Persisted (localStorage — safe fields only, no secrets)
    user: AuthUser | null;
    permissions: string[];
    accessToken: string | null;
    clinicId: string | null;
    lastOnlineAt: number | null;

    // In-memory only (never persisted)
    lsk: string | null;

    // Actions
    login: (
        user: AuthUser,
        permissions: string[],
        accessToken: string,
        lsk: string,
        couchDbUrl: string,
        couchDbUser: string,
        couchDbPassword: string,
    ) => Promise<void>;
    logout: () => Promise<void>;
    setAccessToken: (token: string, lsk: string) => void;
    markOnline: () => void;
    checkOfflineSessionExpiry: () => boolean;
    hasPermission: (permission: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            // Initial state
            user: null,
            permissions: [],
            accessToken: null,
            clinicId: null,
            lastOnlineAt: null,
            lsk: null,

            login: async (user, permissions, accessToken, lsk, couchDbUrl, couchDbUser, couchDbPassword) => {
                // Open encrypted local DB — must happen before setting state
                await initDb(user.clinicId, lsk, couchDbUrl, couchDbUser, couchDbPassword);

                set({
                    user,
                    permissions,
                    accessToken,
                    clinicId: user.clinicId,
                    lsk, // In-memory only — persist: false excludes this
                    lastOnlineAt: Date.now(),
                });
            },

            logout: async () => {
                // Close DB and zero LSK before clearing state
                await closeDb();
                set({
                    user: null,
                    permissions: [],
                    accessToken: null,
                    clinicId: null,
                    lsk: null,
                    lastOnlineAt: null,
                });
            },

            setAccessToken: (token, lsk) => {
                set({ accessToken: token, lsk, lastOnlineAt: Date.now() });
            },

            markOnline: () => {
                set({ lastOnlineAt: Date.now() });
            },

            /**
             * Returns true if the offline session has expired (>72 hours since last online).
             * Call this on app resume, page focus, and at 30-min intervals.
             */
            checkOfflineSessionExpiry: (): boolean => {
                const { lastOnlineAt } = get();
                if (!lastOnlineAt) return true;
                return Date.now() - lastOnlineAt > SESSION_MAX_OFFLINE_MS;
            },

            hasPermission: (permission: string): boolean => {
                return get().permissions.includes(permission);
            },
        }),

        {
            name: 'medhub-auth',
            partialize: (state) => ({
                // NEVER persist LSK or accessToken to localStorage
                user: state.user,
                permissions: state.permissions,
                clinicId: state.clinicId,
                lastOnlineAt: state.lastOnlineAt,
                // accessToken and lsk are intentionally excluded
            }),
        },
    ),
);
