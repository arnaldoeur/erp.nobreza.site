import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    Plus,
    Trash2,
    DollarSign,
    Briefcase,
    Wrench,
    FileText,
    Calendar,
    AlertCircle,
    X
} from 'lucide-react';
import { Expense, ExpenseService } from '../services/expense.service';

const EXPENSE_TYPES = [
    { id: 'Operational', label: 'Operacional', icon: Briefcase, color: 'text-blue-600' },
    { id: 'Salary', label: 'Salários', icon: DollarSign, color: 'text-emerald-600' },
    { id: 'Maintenance', label: 'Manutenção', icon: Wrench, color: 'text-amber-600' },
    { id: 'Technical', label: 'Suporte Técnico', icon: FileText, color: 'text-indigo-600' },
    { id: 'Tax', label: 'Impostos', icon: AlertCircle, color: 'text-red-600' },
    { id: 'Other', label: 'Outros', icon: Plus, color: 'text-slate-600' },
];

export const Expenses: React.FC = () => {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [formData, setFormData] = useState<Partial<Expense>>({
        type: 'Operational',
        amount: 0,
        description: '',
        date: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        loadExpenses();
    }, []);

    const loadExpenses = async () => {
        setLoading(true);
        const data = await ExpenseService.getAll();
        setExpenses(data);
        setLoading(false);
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await ExpenseService.add(formData);
            setShowAddModal(false);
            setFormData({ type: 'Operational', amount: 0, description: '', date: new Date().toISOString().split('T')[0] });
            loadExpenses();
        } catch (error) {
            console.error(error);
            alert("Erro ao adicionar despesa.");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Remover esta despesa?")) return;
        await ExpenseService.delete(id);
        loadExpenses();
    };

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    return (
        <div className="h-full flex flex-col gap-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div>
                    <h2 className="text-2xl font-black text-slate-950 tracking-tight uppercase">Gestão de Despesas</h2>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Controlo financeiro das operações</p>
                </div>
                <div className="flex gap-4 items-center">
                    <div className="text-right mr-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Acumulado</p>
                        <p className="text-2xl font-black text-red-600">MT {totalExpenses.toLocaleString()}</p>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="bg-emerald-950 hover:bg-emerald-900 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-emerald-900/20 uppercase tracking-widest text-[10px]"
                    >
                        <Plus size={18} /> Nova Despesa
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Montante</th>
                                <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan={5} className="px-6 py-20 text-center text-slate-400 font-bold">Carregando despesas...</td></tr>
                            ) : expenses.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-20 text-center text-slate-400 font-bold">Nenhuma despesa registada.</td></tr>
                            ) : expenses.map(e => {
                                const typeInfo = EXPENSE_TYPES.find(t => t.id === e.type) || EXPENSE_TYPES[0];
                                return (
                                    <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={14} className="text-slate-300" />
                                                <span className="text-xs font-bold text-slate-600">{new Date(e.date).toLocaleDateString()}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className={`flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 w-fit`}>
                                                <typeInfo.icon size={12} className={typeInfo.color} />
                                                <span className="text-[10px] font-black uppercase text-slate-600">{typeInfo.label}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-bold text-slate-700">{e.description}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-black text-red-600">MT {e.amount.toLocaleString()}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => handleDelete(e.id)}
                                                className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Modal */}
            {showAddModal && createPortal(
                <div className="fixed inset-0 bg-emerald-950/95 backdrop-blur-2xl z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-500">
                    <div className="bg-white w-full max-w-xl rounded-[3.5rem] p-10 md:p-14 shadow-[0_40px_100px_rgba(0,0,0,0.6)] animate-in zoom-in-95 duration-500 overflow-y-auto max-h-[95vh] border border-white/20 relative">
                        <button onClick={() => setShowAddModal(false)} className="absolute top-8 right-8 md:top-12 md:right-12 p-3 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-400 hover:text-emerald-700 transition-all z-10"><X size={26} /></button>
                        <div className="mb-10">
                            <h3 className="text-3xl font-black text-emerald-950 tracking-tight uppercase">Registar Despesa</h3>
                            <p className="text-xs text-emerald-600 font-bold uppercase tracking-widest mt-2">Informe os detalhes do gasto</p>
                        </div>

                        <form onSubmit={handleAdd} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tipo de Despesa</label>
                                <select
                                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 outline-none focus:border-emerald-500 font-bold text-slate-700"
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                                >
                                    {EXPENSE_TYPES.map(t => (
                                        <option key={t.id} value={t.id}>{t.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Montante (MT)</label>
                                <input
                                    type="number"
                                    required
                                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 outline-none focus:border-emerald-500 font-bold text-slate-700"
                                    value={formData.amount}
                                    onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Descrição / Justificação</label>
                                <textarea
                                    required
                                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 outline-none focus:border-emerald-500 font-bold text-slate-700 h-24"
                                    placeholder="Ex: Pagamento de eletricidade Jan/2026"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Data</label>
                                <input
                                    type="date"
                                    required
                                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 outline-none focus:border-emerald-500 font-bold text-slate-700"
                                    value={formData.date}
                                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-4 pt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 px-8 py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs text-slate-400 hover:bg-slate-50 transition-all border-2 border-transparent hover:border-slate-100"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-emerald-950 text-white px-8 py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-emerald-900/40 active:scale-[0.95] transition-all hover:bg-emerald-900"
                                >
                                    Confirmar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
