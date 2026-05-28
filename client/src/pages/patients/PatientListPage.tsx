import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api.js';
import PatientSearchBar from '../../components/PatientSearchBar.js';

interface Patient {
    _id: string;
    firstName: string;
    lastName: string;
    patientId: string;
    phone?: string;
    gender?: string;
    dateOfBirth?: string;
    createdAt: string;
}

export default function PatientListPage() {
    const navigate = useNavigate();
    const [patients, setPatients] = useState<Patient[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadPatients();
    }, []);

    async function loadPatients() {
        setIsLoading(true);
        try {
            const res = await api.get<{ patients: Patient[] }>('/patients/search?q=a&limit=50');
            setPatients(res.patients ?? []);
        } catch {
            setPatients([]);
        } finally {
            setIsLoading(false);
        }
    }

    function getAge(dob?: string): string {
        if (!dob) return '';
        const birth = new Date(dob);
        const today = new Date();
        const age = today.getFullYear() - birth.getFullYear();
        return `${age}y`;
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100">Patient Directory</h1>
                    <p className="text-sm text-slate-400 mt-1">Search, view, and manage patient records</p>
                </div>
                <button
                    onClick={() => navigate('/dashboard/patients/new')}
                    className="btn-primary"
                >
                    Register Patient
                </button>
            </div>

            <div className="mb-6">
                <PatientSearchBar />
            </div>

            {isLoading ? (
                <div className="card">
                    <div className="flex items-center justify-center py-12">
                        <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                        <span className="ml-3 text-slate-400 text-sm">Loading patients...</span>
                    </div>
                </div>
            ) : patients.length === 0 ? (
                <div className="card text-center py-12">
                    <p className="text-slate-400 mb-2">No patients registered yet</p>
                    <button
                        onClick={() => navigate('/dashboard/patients/new')}
                        className="text-primary-400 hover:underline text-sm"
                    >
                        Register your first patient
                    </button>
                </div>
            ) : (
                <div className="card overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-700/50">
                                <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Patient ID</th>
                                <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Name</th>
                                <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Phone</th>
                                <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Gender</th>
                                <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Age</th>
                                <th className="text-right py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {patients.map((p) => (
                                <tr
                                    key={p._id}
                                    onClick={() => navigate(`/dashboard/patients/${p._id}`)}
                                    className="border-b border-slate-700/30 hover:bg-slate-700/30 cursor-pointer transition-colors"
                                >
                                    <td className="py-3 px-4 text-sm text-slate-400 font-mono">{p.patientId}</td>
                                    <td className="py-3 px-4 text-sm text-slate-200 font-medium">{p.firstName} {p.lastName}</td>
                                    <td className="py-3 px-4 text-sm text-slate-400">{p.phone ?? '—'}</td>
                                    <td className="py-3 px-4 text-sm text-slate-400">{p.gender ? p.gender.charAt(0).toUpperCase() + p.gender.slice(1) : '—'}</td>
                                    <td className="py-3 px-4 text-sm text-slate-400">{getAge(p.dateOfBirth)}</td>
                                    <td className="py-3 px-4 text-right">
                                        <button className="text-primary-400 hover:text-primary-300 text-sm">View</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
