import { useState, useEffect, useRef } from 'react';
import icd10Data from '../data/icd10.json';

interface ICD10Entry {
    code: string;
    description: string;
}

interface Props {
    value: { code: string; description: string; isPrimary: boolean }[];
    onChange: (diagnoses: { code: string; description: string; isPrimary: boolean }[]) => void;
}

export default function ICD10SearchInput({ value, onChange }: Props) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<ICD10Entry[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

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
        if (query.length < 1) {
            setResults([]);
            return;
        }
        const q = query.toLowerCase();
        const filtered = (icd10Data as ICD10Entry[])
            .filter((d) => d.code.toLowerCase().includes(q) || d.description.toLowerCase().includes(q))
            .slice(0, 10);
        setResults(filtered);
        setIsOpen(filtered.length > 0);
    }, [query]);

    const addDiagnosis = (entry: ICD10Entry) => {
        const isPrimary = value.length === 0;
        onChange([...value, { ...entry, isPrimary }]);
        setQuery('');
        setIsOpen(false);
    };

    const removeDiagnosis = (index: number) => {
        const updated = value.filter((_, i) => i !== index);
        if (updated.length > 0 && updated[0]) {
            updated[0].isPrimary = true;
        }
        onChange(updated);
    };

    const setPrimary = (index: number) => {
        const updated = value.map((d, i) => ({ ...d, isPrimary: i === index }));
        onChange(updated);
    };

    return (
        <div>
            <div ref={wrapperRef} className="relative">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search ICD-10 code or description..."
                        className="input-field flex-1"
                    />
                    {results.length > 0 && (
                        <button
                            type="button"
                            onClick={() => { setIsOpen(!isOpen); }}
                            className="px-3 py-2 text-xs text-slate-400 hover:text-slate-200"
                        >
                            {isOpen ? 'Close' : `${results.length} results`}
                        </button>
                    )}
                </div>
                {isOpen && (
                    <div className="absolute top-full mt-1 w-full bg-surface-elevated border border-slate-700/50 rounded-xl shadow-xl overflow-hidden z-50 max-h-60 overflow-y-auto">
                        {results.map((entry) => (
                            <button
                                key={entry.code}
                                type="button"
                                onClick={() => addDiagnosis(entry)}
                                className="w-full text-left px-4 py-2.5 hover:bg-slate-700/50 transition-colors border-b border-slate-700/30 last:border-b-0 flex items-center gap-3"
                            >
                                <span className="font-mono text-sm text-primary-400 font-medium">{entry.code}</span>
                                <span className="text-sm text-slate-300">{entry.description}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {value.length > 0 && (
                <div className="mt-3 space-y-1.5">
                    {value.map((d, i) => (
                        <div key={i} className="flex items-center justify-between px-3 py-2 bg-slate-800/30 rounded-lg border border-slate-700/30">
                            <div className="flex items-center gap-3">
                                <span className="font-mono text-xs text-primary-400">{d.code}</span>
                                <span className="text-sm text-slate-300">{d.description}</span>
                                {d.isPrimary && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-primary-500/20 text-primary-400 rounded font-medium">PRIMARY</span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {!d.isPrimary && (
                                    <button type="button" onClick={() => setPrimary(i)} className="text-xs text-slate-400 hover:text-primary-400">Set Primary</button>
                                )}
                                <button type="button" onClick={() => removeDiagnosis(i)} className="text-xs text-clinical-danger hover:text-red-400">Remove</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
