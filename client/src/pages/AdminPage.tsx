import { useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api.js';
import { motion, AnimatePresence } from 'framer-motion';

interface StaffMember {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isActive: boolean;
    createdAt: string;
}

const ROLES = ['DOCTOR', 'NURSE', 'RECEPTIONIST', 'BILLING_OFFICER', 'PHARMACIST', 'LAB_TECH'] as const;

const ROLE_COLORS: Record<string, string> = {
    DOCTOR: 'bg-blue-500/20 text-blue-400',
    NURSE: 'bg-green-500/20 text-green-400',
    RECEPTIONIST: 'bg-purple-500/20 text-purple-400',
    BILLING_OFFICER: 'bg-amber-500/20 text-amber-400',
    PHARMACIST: 'bg-pink-500/20 text-pink-400',
    LAB_TECH: 'bg-cyan-500/20 text-cyan-400',
    CLINIC_ADMIN: 'bg-red-500/20 text-red-400',
};

function StaffRoleBadge({ role }: { role: string }) {
    const colorClass = ROLE_COLORS[role] || 'bg-slate-500/20 text-slate-400';
    return (
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colorClass}`}>
            {role.replace('_', ' ')}
        </span>
    );
}

export default function AdminPage() {
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showInvite, setShowInvite] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteFirstName, setInviteFirstName] = useState('');
    const [inviteLastName, setInviteLastName] = useState('');
    const [inviteRole, setInviteRole] = useState('DOCTOR');
    const [inviteError, setInviteError] = useState<string | null>(null);
    const [inviteSuccess, setInviteSuccess] = useState(false);
    const [isInviting, setIsInviting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadStaff();
    }, []);

    async function loadStaff() {
        setIsLoading(true);
        try {
            const res = await api.get<{ staff: StaffMember[]; total: number }>('/staff');
            setStaff(res.staff ?? []);
        } catch {
            setStaff([]);
        } finally {
            setIsLoading(false);
        }
    }

    async function handleInvite(e: React.FormEvent) {
        e.preventDefault();
        setInviteError(null);
        setIsInviting(true);
        try {
            await api.post('/staff/invite', {
                email: inviteEmail,
                firstName: inviteFirstName,
                lastName: inviteLastName,
                role: inviteRole,
                sendEmail: false,
            });
            setInviteSuccess(true);
            setInviteEmail('');
            setInviteFirstName('');
            setInviteLastName('');
            setInviteRole('DOCTOR');
            setTimeout(() => {
                setShowInvite(false);
                setInviteSuccess(false);
                loadStaff();
            }, 2000);
        } catch (err) {
            setInviteError(err instanceof ApiError ? err.message : 'Failed to send invite');
        } finally {
            setIsInviting(false);
        }
    }

    async function handleToggleActive(staffId: string, currentActive: boolean) {
        try {
            await api.patch(`/staff/${staffId}`, { isActive: !currentActive });
            loadStaff();
        } catch {
        }
    }

    async function handleChangeRole(staffId: string, newRole: string) {
        try {
            await api.patch(`/staff/${staffId}`, { role: newRole });
            loadStaff();
        } catch {
        }
    }

    const filteredStaff = staff.filter((s) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return s.firstName.toLowerCase().includes(q) || s.lastName.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || s.role.toLowerCase().includes(q);
    });

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100">Staff Management</h1>
                    <p className="text-sm text-slate-400 mt-1">Invite and manage clinic staff</p>
                </div>
                <button onClick={() => { setShowInvite(true); setInviteError(null); setInviteSuccess(false); }} className="btn-primary flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    Invite Staff
                </button>
            </div>

            <div className="mb-6">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search staff by name, email, or role..."
                    className="input-field max-w-md"
                />
            </div>

            {/* Invite Modal */}
            <AnimatePresence>
                {showInvite && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowInvite(false)}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-surface-elevated border border-slate-700/50 rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-slate-100">Invite Staff Member</h2>
                                <button onClick={() => setShowInvite(false)} className="text-slate-400 hover:text-slate-200 transition-colors">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {inviteSuccess ? (
                                <div className="text-center py-8">
                                    <div className="w-14 h-14 rounded-full bg-clinical-success/20 flex items-center justify-center mx-auto mb-3">
                                        <svg className="w-7 h-7 text-clinical-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-semibold text-slate-100">Invite Sent!</h3>
                                    <p className="text-sm text-slate-400 mt-1">Staff member has been invited.</p>
                                </div>
                            ) : (
                                <form onSubmit={handleInvite} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 mb-1">First Name *</label>
                                            <input value={inviteFirstName} onChange={(e) => setInviteFirstName(e.target.value)} className="input-field" placeholder="First name" required />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 mb-1">Last Name *</label>
                                            <input value={inviteLastName} onChange={(e) => setInviteLastName(e.target.value)} className="input-field" placeholder="Last name" required />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">Email *</label>
                                        <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="input-field" placeholder="staff@clinic.com" required />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">Role *</label>
                                        <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="input-field">
                                            {ROLES.map((r) => (
                                                <option key={r} value={r}>{r.replace('_', ' ')}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {inviteError && (
                                        <div className="p-3 rounded-xl bg-clinical-danger/10 border border-clinical-danger/20 text-clinical-danger text-xs">{inviteError}</div>
                                    )}
                                    <div className="flex justify-end gap-3 pt-2">
                                        <button type="button" onClick={() => setShowInvite(false)} className="px-4 py-2 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700/50 transition-colors text-sm">Cancel</button>
                                        <button type="submit" disabled={isInviting} className="btn-primary">
                                            {isInviting ? 'Sending...' : 'Send Invite'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Staff List */}
            {isLoading ? (
                <div className="card">
                    <div className="flex items-center justify-center py-12">
                        <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                        <span className="ml-3 text-slate-400 text-sm">Loading staff...</span>
                    </div>
                </div>
            ) : filteredStaff.length === 0 ? (
                <div className="card text-center py-12">
                    <svg className="w-12 h-12 mx-auto text-slate-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-slate-400 mb-1">{searchQuery ? 'No staff match your search' : 'No staff members yet'}</p>
                    {!searchQuery && (
                        <button onClick={() => { setShowInvite(true); }} className="text-primary-400 hover:underline text-sm mt-2">Invite your first staff member</button>
                    )}
                </div>
            ) : (
                <div className="card overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-700/50">
                                <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Name</th>
                                <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Email</th>
                                <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Role</th>
                                <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                                <th className="text-right py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStaff.map((s) => (
                                <tr key={s.id} className="border-b border-slate-700/30 hover:bg-slate-700/30 transition-colors">
                                    <td className="py-3 px-4">
                                        <p className="text-sm font-medium text-slate-200">{s.firstName} {s.lastName}</p>
                                    </td>
                                    <td className="py-3 px-4 text-sm text-slate-400">{s.email}</td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-2">
                                            <StaffRoleBadge role={s.role} />
                                            <select
                                                value={s.role}
                                                onChange={(e) => handleChangeRole(s.id, e.target.value)}
                                                className="text-[10px] bg-slate-800/50 border border-slate-700/30 rounded px-1.5 py-0.5 text-slate-400 hover:border-slate-500 transition-colors cursor-pointer"
                                                title="Change role"
                                            >
                                                {ROLES.map((r) => (
                                                    <option key={r} value={r}>{r.replace('_', ' ')}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.isActive ? 'bg-clinical-success/20 text-clinical-success' : 'bg-slate-600/20 text-slate-400'}`}>
                                            {s.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                        <button
                                            onClick={() => handleToggleActive(s.id, s.isActive)}
                                            className={`text-xs font-medium px-2 py-1 rounded-lg transition-colors ${s.isActive ? 'text-clinical-danger hover:bg-clinical-danger/10' : 'text-clinical-success hover:bg-clinical-success/10'}`}
                                        >
                                            {s.isActive ? 'Deactivate' : 'Activate'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </motion.div>
    );
}
