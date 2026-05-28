import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

interface PatientResult {
    _id: string;
    firstName: string;
    lastName: string;
    patientId: string;
    phone?: string;
    dateOfBirth?: string;
}

export default function PatientSearchBar() {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<PatientResult[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>();

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (query.length < 2) {
            setResults([]);
            setIsOpen(false);
            return;
        }
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            setIsLoading(true);
            try {
                const { api } = await import('../lib/api.js');
                const res = await api.get<{ patients: PatientResult[] }>(`/patients/search?q=${encodeURIComponent(query)}&limit=10`);
                setResults(res.patients);
                setIsOpen(true);
            } catch {
                setResults([]);
            } finally {
                setIsLoading(false);
            }
        }, 300);
        return () => clearTimeout(debounceRef.current);
    }, [query]);

    const handleSelect = (patient: PatientResult) => {
        setIsOpen(false);
        setQuery('');
        navigate(`/dashboard/patients/${patient._id}`);
    };

    return (
        <div ref={wrapperRef} className="relative w-full max-w-md">
            <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search patients by name, phone, or ID..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/30 transition-colors"
                />
                {isLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                )}
            </div>
            {isOpen && results.length > 0 && (
                <div className="absolute top-full mt-1 w-full bg-surface-elevated border border-slate-700/50 rounded-xl shadow-xl overflow-hidden z-50">
                    {results.map((p) => (
                        <button
                            key={p._id}
                            onClick={() => handleSelect(p)}
                            className="w-full text-left px-4 py-3 hover:bg-slate-700/50 transition-colors border-b border-slate-700/30 last:border-b-0"
                        >
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-sm font-medium text-slate-200">
                                        {p.firstName} {p.lastName}
                                    </p>
                                    <p className="text-xs text-slate-400">
                                        {p.patientId} {p.phone ? `· ${p.phone}` : ''}
                                    </p>
                                </div>
                                <span className="text-xs text-slate-500">{p.dateOfBirth}</span>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
