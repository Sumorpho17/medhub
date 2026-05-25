// ═══════════════════════════════════════════════════════════
// MEDHUB — Auth Helper
// Server-side auth request handlers
// ═══════════════════════════════════════════════════════════

import { api } from '../lib/api.js';

export async function logout(): Promise<void> {
    await api.post('/auth/logout', {});
}
