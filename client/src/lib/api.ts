// ═══════════════════════════════════════════════════════════
// MEDHUB — API Client
// Thin wrapper around fetch that handles auth headers,
// 401 refresh token rotation, and typed error handling.
// ═══════════════════════════════════════════════════════════

import { useAuthStore } from '../stores/authStore.js';

const API_BASE = '/api/v1';

export class ApiError extends Error {
    constructor(
        public readonly status: number,
        public readonly code: string,
        message: string,
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

async function request<T>(
    method: string,
    path: string,
    body?: unknown,
    skipAuth = false,
): Promise<T> {
    const { accessToken } = useAuthStore.getState();

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    if (!skipAuth && accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const options: RequestInit = {
        method,
        headers,
        credentials: 'include', // Include cookies (refresh token)
    };

    if (body !== undefined) {
        options.body = JSON.stringify(body);
    }

    const res = await fetch(`${API_BASE}${path}`, options);

    if (res.status === 401 && !skipAuth) {
        // Attempt token refresh
        const { clinicId } = useAuthStore.getState();
        const fingerprint = await getDeviceFingerprint();

        const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ deviceFingerprint: fingerprint, clinicId }),
        });

        if (refreshRes.ok) {
            const { accessToken: newToken, lsk } = await refreshRes.json();
            useAuthStore.getState().setAccessToken(newToken, lsk);
            // Retry original request with new token
            return request<T>(method, path, body, skipAuth);
        } else {
            // Refresh failed — force logout
            await useAuthStore.getState().logout();
            window.location.href = '/login?reason=session_expired';
            throw new ApiError(401, 'SESSION_EXPIRED', 'Session expired. Please log in again.');
        }
    }

    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new ApiError(
            res.status,
            (data as any).code ?? 'UNKNOWN_ERROR',
            (data as any).error ?? `HTTP ${res.status}`,
        );
    }

    return res.json() as Promise<T>;
}

// Cached fingerprint — computed once per session
let _fingerprint: string | null = null;

export async function getDeviceFingerprint(): Promise<string> {
    if (_fingerprint) return _fingerprint;
    const FingerprintJS = await import('@fingerprintjs/fingerprintjs');
    const fp = await FingerprintJS.load();
    const result = await fp.get();
    _fingerprint = result.visitorId;
    return _fingerprint;
}

export const api = {
    get: <T>(path: string) => request<T>('GET', path),
    post: <T>(path: string, body: unknown, skipAuth = false) =>
        request<T>('POST', path, body, skipAuth),
    put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
    patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
    delete: <T>(path: string) => request<T>('DELETE', path),
};
