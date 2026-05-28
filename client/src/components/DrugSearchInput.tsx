import { useState, useEffect, useRef } from 'react';
import type { PrescriptionItem } from '@medhub/shared';

const COMMON_DRUGS = [
    { name: 'Paracetamol', strength: '500mg', form: 'Tablet' },
    { name: 'Paracetamol', strength: '120mg/5ml', form: 'Syrup' },
    { name: 'Ibuprofen', strength: '400mg', form: 'Tablet' },
    { name: 'Ibuprofen', strength: '200mg', form: 'Tablet' },
    { name: 'Amoxicillin', strength: '500mg', form: 'Capsule' },
    { name: 'Amoxicillin', strength: '250mg/5ml', form: 'Suspension' },
    { name: 'Amoxicillin-Clavulanate', strength: '625mg', form: 'Tablet' },
    { name: 'Ciprofloxacin', strength: '500mg', form: 'Tablet' },
    { name: 'Metronidazole', strength: '400mg', form: 'Tablet' },
    { name: 'Metronidazole', strength: '200mg/5ml', form: 'Suspension' },
    { name: 'Artemether-Lumefantrine', strength: '20/120mg', form: 'Tablet' },
    { name: 'Artemether-Lumefantrine', strength: '40/240mg', form: 'Tablet' },
    { name: 'Dihydroartemisinin-Piperaquine', strength: '40/320mg', form: 'Tablet' },
    { name: 'Omeprazole', strength: '20mg', form: 'Capsule' },
    { name: 'Lisinopril', strength: '10mg', form: 'Tablet' },
    { name: 'Amlodipine', strength: '5mg', form: 'Tablet' },
    { name: 'Metformin', strength: '500mg', form: 'Tablet' },
    { name: 'Metformin', strength: '850mg', form: 'Tablet' },
    { name: 'Glibenclamide', strength: '5mg', form: 'Tablet' },
    { name: 'Salbutamol', strength: '100mcg', form: 'Inhaler' },
    { name: 'Prednisolone', strength: '5mg', form: 'Tablet' },
    { name: 'Diclofenac', strength: '50mg', form: 'Tablet' },
    { name: 'Diclofenac', strength: '75mg/3ml', form: 'Injection' },
    { name: 'Cetirizine', strength: '10mg', form: 'Tablet' },
    { name: 'Chlorpheniramine', strength: '4mg', form: 'Tablet' },
    { name: 'Diazepam', strength: '5mg', form: 'Tablet' },
    { name: 'Vitamin C', strength: '100mg', form: 'Tablet' },
    { name: 'Ferrous Sulfate', strength: '200mg', form: 'Tablet' },
    { name: 'Folic Acid', strength: '5mg', form: 'Tablet' },
    { name: 'ORS', strength: '20.5g', form: 'Powder' },
];

interface Props {
    items: PrescriptionItem[];
    onChange: (items: PrescriptionItem[]) => void;
}

const emptyItem = (): PrescriptionItem => ({
    drugName: '',
    strength: '',
    form: '',
    dose: '',
    frequency: '',
    duration: '',
    route: 'Oral',
    instructions: '',
    quantity: 1,
    refillCount: 0,
});

export default function DrugSearchInput({ items, onChange }: Props) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<typeof COMMON_DRUGS>([]);
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
        const filtered = COMMON_DRUGS.filter(
            (d) => d.name.toLowerCase().includes(q) || d.form.toLowerCase().includes(q),
        ).slice(0, 6);
        setResults(filtered);
        setIsOpen(filtered.length > 0);
    }, [query]);

    const addDrug = (drug: typeof COMMON_DRUGS[0]) => {
        const newItem: PrescriptionItem = {
            drugName: drug.name,
            strength: drug.strength,
            form: drug.form,
            dose: '',
            frequency: '',
            duration: '',
            route: 'Oral',
            instructions: '',
            quantity: 1,
            refillCount: 0,
        };
        onChange([...items, newItem]);
        setQuery('');
        setIsOpen(false);
    };

    const updateItem = (index: number, field: keyof PrescriptionItem, value: string | number) => {
        const updated = items.map((item, i) => (i === index ? { ...item, [field]: value } : item));
        onChange(updated);
    };

    const removeItem = (index: number) => {
        onChange(items.filter((_, i) => i !== index));
    };

    return (
        <div>
            <div ref={wrapperRef} className="relative">
                <div className="flex gap-2 items-center">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search drug name..."
                        className="input-field flex-1"
                    />
                </div>
                {isOpen && (
                    <div className="absolute top-full mt-1 w-full bg-surface-elevated border border-slate-700/50 rounded-xl shadow-xl overflow-hidden z-50 max-h-48 overflow-y-auto">
                        {results.map((drug, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => addDrug(drug)}
                                className="w-full text-left px-4 py-2.5 hover:bg-slate-700/50 transition-colors border-b border-slate-700/30 last:border-b-0"
                            >
                                <span className="text-sm text-slate-200">{drug.name}</span>
                                <span className="text-xs text-slate-400 ml-2">{drug.strength} · {drug.form}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {items.length > 0 && (
                <div className="mt-4 space-y-3">
                    {items.map((item, i) => (
                        <div key={i} className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/30">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-slate-200">
                                    {item.drugName} {item.strength} ({item.form})
                                </span>
                                <button type="button" onClick={() => removeItem(i)} className="text-xs text-clinical-danger hover:text-red-400">Remove</button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                <div>
                                    <label className="text-[10px] text-slate-500 uppercase">Dose</label>
                                    <input value={item.dose} onChange={(e) => updateItem(i, 'dose', e.target.value)} className="mt-0.5 w-full bg-slate-900/50 border border-slate-700/30 rounded-lg px-2 py-1.5 text-xs text-slate-200" placeholder="e.g., 1 tablet" />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 uppercase">Frequency</label>
                                    <input value={item.frequency} onChange={(e) => updateItem(i, 'frequency', e.target.value)} className="mt-0.5 w-full bg-slate-900/50 border border-slate-700/30 rounded-lg px-2 py-1.5 text-xs text-slate-200" placeholder="e.g., 12 hourly" />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 uppercase">Duration</label>
                                    <input value={item.duration} onChange={(e) => updateItem(i, 'duration', e.target.value)} className="mt-0.5 w-full bg-slate-900/50 border border-slate-700/30 rounded-lg px-2 py-1.5 text-xs text-slate-200" placeholder="e.g., 7 days" />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 uppercase">Route</label>
                                    <select value={item.route} onChange={(e) => updateItem(i, 'route', e.target.value)} className="mt-0.5 w-full bg-slate-900/50 border border-slate-700/30 rounded-lg px-2 py-1.5 text-xs text-slate-200">
                                        <option>Oral</option>
                                        <option>IV</option>
                                        <option>IM</option>
                                        <option>SC</option>
                                        <option>Topical</option>
                                        <option>Inhalation</option>
                                        <option>Sublingual</option>
                                        <option>Rectal</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 uppercase">Quantity</label>
                                    <input type="number" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', parseInt(e.target.value) || 1)} className="mt-0.5 w-full bg-slate-900/50 border border-slate-700/30 rounded-lg px-2 py-1.5 text-xs text-slate-200" min={1} />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 uppercase">Refills</label>
                                    <input type="number" value={item.refillCount} onChange={(e) => updateItem(i, 'refillCount', parseInt(e.target.value) || 0)} className="mt-0.5 w-full bg-slate-900/50 border border-slate-700/30 rounded-lg px-2 py-1.5 text-xs text-slate-200" min={0} />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-[10px] text-slate-500 uppercase">Instructions</label>
                                    <input value={item.instructions} onChange={(e) => updateItem(i, 'instructions', e.target.value)} className="mt-0.5 w-full bg-slate-900/50 border border-slate-700/30 rounded-lg px-2 py-1.5 text-xs text-slate-200" placeholder="Optional instructions" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
