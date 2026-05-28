import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface Appointment {
    id: string;
    patientName: string;
    patientId: string;
    phone: string;
    date: string;
    time: string;
    reason: string;
    status: 'scheduled' | 'checked_in' | 'in_progress' | 'completed' | 'no_show' | 'cancelled';
    notes?: string;
    createdAt: string;
}

const STATUS_CONFIG = {
    scheduled: { label: 'Scheduled', color: 'bg-slate-500/20 text-slate-400', dot: 'bg-slate-400' },
    checked_in: { label: 'Checked In', color: 'bg-blue-500/20 text-blue-400', dot: 'bg-blue-400' },
    in_progress: { label: 'In Progress', color: 'bg-amber-500/20 text-amber-400', dot: 'bg-amber-400' },
    completed: { label: 'Completed', color: 'bg-green-500/20 text-green-400', dot: 'bg-green-400' },
    no_show: { label: 'No Show', color: 'bg-red-500/20 text-red-400', dot: 'bg-red-400' },
    cancelled: { label: 'Cancelled', color: 'bg-slate-600/20 text-slate-500', dot: 'bg-slate-500' },
};

function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function loadAppointments(): Appointment[] {
    try {
        const data = localStorage.getItem('medhub-appointments');
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

function saveAppointments(appts: Appointment[]) {
    localStorage.setItem('medhub-appointments', JSON.stringify(appts));
}

function getTodayDateStr(): string {
    return new Date().toISOString().slice(0, 10);
}

function formatTime(timeStr: string): string {
    const [h, m] = timeStr.split(':').map(Number);
    if (h === undefined || m === undefined) return timeStr;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export default function AppointmentsPage() {
    const navigate = useNavigate();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(getTodayDateStr());
    const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
    const [showNew, setShowNew] = useState(false);

    const [formName, setFormName] = useState('');
    const [formPhone, setFormPhone] = useState('');
    const [formTime, setFormTime] = useState('09:00');
    const [formReason, setFormReason] = useState('');
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => {
        setAppointments(loadAppointments());
        setIsLoading(false);
    }, []);

    function getWeekRange(): Date[] {
        const today = new Date(selectedDate);
        const start = new Date(today);
        start.setDate(start.getDate() - start.getDay());
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(start);
            d.setDate(d.getDate() + i);
            return d;
        });
    }

    const filteredAppts = appointments.filter((a) => a.date === selectedDate);
    const orderedStatus: Appointment['status'][] = ['scheduled', 'checked_in', 'in_progress', 'completed', 'no_show', 'cancelled'];
    filteredAppts.sort((a, b) => {
        const si = orderedStatus.indexOf(a.status);
        const sj = orderedStatus.indexOf(b.status);
        if (si !== sj) return si - sj;
        return a.time.localeCompare(b.time);
    });

    const dayAppts = appointments.filter((a) => a.date === selectedDate);

    function handleCreateAppointment(e: React.FormEvent) {
        e.preventDefault();
        setFormError(null);
        if (!formName || !formPhone || !formTime) {
            setFormError('Please fill in all required fields');
            return;
        }
        const newAppt: Appointment = {
            id: generateId(),
            patientName: formName,
            patientId: '',
            phone: formPhone,
            date: selectedDate,
            time: formTime,
            reason: formReason || 'General consultation',
            status: 'scheduled',
            createdAt: new Date().toISOString(),
        };
        const updated = [...appointments, newAppt];
        setAppointments(updated);
        saveAppointments(updated);
        setShowNew(false);
        setFormName('');
        setFormPhone('');
        setFormTime('09:00');
        setFormReason('');
    }

    function handleStatusChange(id: string, newStatus: Appointment['status']) {
        const updated = appointments.map((a) => (a.id === id ? { ...a, status: newStatus } : a));
        setAppointments(updated);
        saveAppointments(updated);
    }

    function handleDelete(id: string) {
        const updated = appointments.filter((a) => a.id !== id);
        setAppointments(updated);
        saveAppointments(updated);
    }

    const today = getTodayDateStr();
    const weekDates = viewMode === 'week' ? getWeekRange() : [];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100">Appointments</h1>
                    <p className="text-sm text-slate-400 mt-1">Manage patient appointments and check-ins</p>
                </div>
                <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    New Appointment
                </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 mb-6">
                <div className="flex items-center gap-1 bg-slate-800/50 rounded-xl p-1 border border-slate-700/50">
                    <button onClick={() => setViewMode('day')} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${viewMode === 'day' ? 'bg-primary-500/20 text-primary-400' : 'text-slate-400 hover:text-slate-200'}`}>Day</button>
                    <button onClick={() => setViewMode('week')} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${viewMode === 'week' ? 'bg-primary-500/20 text-primary-400' : 'text-slate-400 hover:text-slate-200'}`}>Week</button>
                </div>
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="input-field w-auto" />
                <button onClick={() => setSelectedDate(today)} className="text-xs text-primary-400 hover:text-primary-300 transition-colors">Today</button>
            </div>

            {viewMode === 'week' && (
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    {weekDates.map((d) => {
                        const dateStr = d.toISOString().slice(0, 10);
                        const isToday = dateStr === today;
                        const isSelected = dateStr === selectedDate;
                        const dayCount = appointments.filter((a) => a.date === dateStr).length;
                        return (
                            <button
                                key={dateStr}
                                onClick={() => setSelectedDate(dateStr)}
                                className={`flex flex-col items-center p-3 min-w-[72px] rounded-xl transition-all border ${isSelected ? 'border-primary-500/50 bg-primary-500/10' : 'border-slate-700/50 bg-slate-800/30 hover:border-slate-600'}`}
                            >
                                <span className="text-[10px] text-slate-500 uppercase">{d.toLocaleDateString('en', { weekday: 'short' })}</span>
                                <span className={`text-lg font-bold mt-0.5 ${isToday ? 'text-primary-400' : 'text-slate-200'}`}>{d.getDate()}</span>
                                {dayCount > 0 && <span className="text-[10px] mt-1 px-1.5 py-0.5 rounded-full bg-primary-500/20 text-primary-400">{dayCount}</span>}
                            </button>
                        );
                    })}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <div className="card">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-slate-200">
                                {new Date(selectedDate).toLocaleDateString('en-NG', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                            </h3>
                            <span className="text-xs text-slate-400">{dayAppts.length} appointment{dayAppts.length !== 1 ? 's' : ''}</span>
                        </div>

                        {dayAppts.length === 0 ? (
                            <div className="text-center py-12">
                                <svg className="w-12 h-12 mx-auto text-slate-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <p className="text-slate-400 mb-1">No appointments for this day</p>
                                <button onClick={() => setShowNew(true)} className="text-primary-400 hover:underline text-sm">Schedule an appointment</button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {dayAppts.map((appt) => {
                                    const cfg = STATUS_CONFIG[appt.status];
                                    return (
                                        <motion.div key={appt.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/30 border border-slate-700/30 hover:border-slate-600/50 transition-all group">
                                            <div className="flex flex-col items-center min-w-[48px]">
                                                <span className="text-sm font-bold text-slate-200">{formatTime(appt.time)}</span>
                                            </div>
                                            <div className={`w-0.5 h-10 rounded-full ${cfg.dot}`} />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-medium text-slate-200">{appt.patientName}</p>
                                                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                                                </div>
                                                <p className="text-xs text-slate-400 mt-0.5 truncate">{appt.reason}{appt.phone ? ` · ${appt.phone}` : ''}</p>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {appt.status === 'scheduled' && (
                                                    <button onClick={() => handleStatusChange(appt.id, 'checked_in')} className="text-[10px] px-2 py-1 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors" title="Check in">Check In</button>
                                                )}
                                                {appt.status === 'checked_in' && (
                                                    <button onClick={() => handleStatusChange(appt.id, 'in_progress')} className="text-[10px] px-2 py-1 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors" title="Start">Start</button>
                                                )}
                                                {appt.status === 'in_progress' && (
                                                    <button onClick={() => handleStatusChange(appt.id, 'completed')} className="text-[10px] px-2 py-1 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors" title="Complete">Complete</button>
                                                )}
                                                {(appt.status === 'scheduled' || appt.status === 'checked_in') && (
                                                    <button onClick={() => handleStatusChange(appt.id, 'cancelled')} className="text-[10px] px-2 py-1 rounded-lg text-slate-400 hover:text-clinical-danger transition-colors" title="Cancel">Cancel</button>
                                                )}
                                                {appt.status !== 'completed' && appt.status !== 'cancelled' && (
                                                    <button onClick={() => handleStatusChange(appt.id, 'no_show')} className="text-[10px] px-2 py-1 rounded-lg text-slate-400 hover:text-clinical-warning transition-colors" title="No Show">No Show</button>
                                                )}
                                                <button onClick={() => handleDelete(appt.id)} className="text-[10px] px-2 py-1 rounded-lg text-slate-400 hover:text-clinical-danger transition-colors" title="Delete">Delete</button>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="card">
                        <h3 className="text-sm font-semibold text-slate-200 mb-3">Status Summary</h3>
                        <div className="space-y-2">
                            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                                const count = dayAppts.filter((a) => a.status === key).length;
                                return (
                                    <div key={key} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                                            <span className="text-slate-400">{cfg.label}</span>
                                        </div>
                                        <span className="text-slate-200 font-medium">{count}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {showNew && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowNew(false)}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-surface-elevated border border-slate-700/50 rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-slate-100">New Appointment</h2>
                                <button onClick={() => setShowNew(false)} className="text-slate-400 hover:text-slate-200 transition-colors">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <form onSubmit={handleCreateAppointment} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Patient Name *</label>
                                    <input value={formName} onChange={(e) => setFormName(e.target.value)} className="input-field" placeholder="Full name" required />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">Phone *</label>
                                        <input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} className="input-field" placeholder="Phone number" required />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">Time *</label>
                                        <input type="time" value={formTime} onChange={(e) => setFormTime(e.target.value)} className="input-field" required />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Reason for Visit</label>
                                    <input value={formReason} onChange={(e) => setFormReason(e.target.value)} className="input-field" placeholder="e.g., Routine checkup" />
                                </div>
                                {formError && (
                                    <div className="p-3 rounded-xl bg-clinical-danger/10 border border-clinical-danger/20 text-clinical-danger text-xs">{formError}</div>
                                )}
                                <div className="flex justify-end gap-3 pt-2">
                                    <button type="button" onClick={() => setShowNew(false)} className="px-4 py-2 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700/50 transition-colors text-sm">Cancel</button>
                                    <button type="submit" className="btn-primary">Schedule</button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
