import { useState, useEffect, useCallback } from 'react';
import { isDbOpen } from '../lib/db.js';

interface SyncState {
    isOnline: boolean;
    isSyncing: boolean;
    lastSyncedAt: Date | null;
    pendingChanges: number;
}

export function useSyncStatus() {
    const [state, setState] = useState<SyncState>({
        isOnline: navigator.onLine,
        isSyncing: isDbOpen(),
        lastSyncedAt: null,
        pendingChanges: 0,
    });

    const handleOnline = useCallback(() => {
        setState((s) => ({ ...s, isOnline: true }));
    }, []);

    const handleOffline = useCallback(() => {
        setState((s) => ({ ...s, isOnline: false, isSyncing: false }));
    }, []);

    const checkPendingChanges = useCallback(async () => {
        try {
            const { getDb } = await import('../lib/db.js');
            if (!isDbOpen()) {
                setState((s) => ({ ...s, pendingChanges: 0 }));
                return;
            }
            const db = getDb();
            const info = await db.info();
            const localDocs = info.doc_count;
            const pending = (info as any).update_seq || 0;
            setState((s) => ({ ...s, pendingChanges: pending > 0 ? Math.min(Math.round(pending / 100), 99) : 0 }));
        } catch {
        }
    }, []);

    useEffect(() => {
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        setState((s) => ({ ...s, isSyncing: isDbOpen() }));

        const interval = setInterval(() => {
            checkPendingChanges();
        }, 30000);

        checkPendingChanges();

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(interval);
        };
    }, [handleOnline, handleOffline, checkPendingChanges]);

    const triggerSync = useCallback(() => {
        setState((s) => ({ ...s, isSyncing: true, lastSyncedAt: new Date() }));
        setTimeout(() => {
            setState((s) => ({ ...s, isSyncing: false }));
            checkPendingChanges();
        }, 2000);
    }, [checkPendingChanges]);

    return { ...state, triggerSync };
}
