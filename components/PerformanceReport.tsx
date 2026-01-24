import React, { useState, useMemo, useEffect } from 'react';
import { User, Sale, BillingDocument } from '../types';
import { WorkShift, TimeTrackingService } from '../services/time-tracking.service';
import { BillingService } from '../services/billing.service';
import {
    BarChart3,
    Clock,
    DollarSign,
    TrendingUp,
    Calendar,
    User as UserIcon,
    Download,
    Trophy,
    Star,
    Zap,
    Search,
    History,
    X,
    FileText,
    ShoppingCart,
    Package
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { LogService } from '../services/log.service';
import { SystemLog } from '../types';

interface PerformanceReportProps {
    team: User[];
    sales: Sale[];
}

export const PerformanceReport: React.FC<PerformanceReportProps> = ({ team, sales }) => {
    const [filter, setFilter] = useState({
        userId: 'ALL',
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });

    const [shifts, setShifts] = useState<WorkShift[]>([]);
    const [userLogs, setUserLogs] = useState<SystemLog[]>([]);
    const [userDocs, setUserDocs] = useState<BillingDocument[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState<any | null>(null);

    useEffect(() => {
        loadShifts();
    }, [filter.userId, filter.startDate, filter.endDate]);

    const loadShifts = async () => {
        setLoading(true);
        try {
            const data = await TimeTrackingService.getShifts(
                filter.userId === 'ALL' ? undefined : filter.userId,
                filter.startDate,
                filter.endDate
            );
            setShifts(data);

            if (filter.userId !== 'ALL') {
                const logs = await LogService.getByUser(filter.userId);
                setUserLogs(logs);
                const docs = await BillingService.getAll();
                const u = team.find(t => t.id === filter.userId);
                setUserDocs(docs.filter(d => d.performedBy === u?.name));
            } else {
                setUserLogs([]);
                setUserDocs([]);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleUserClick = async (userStats: any) => {
        setLoading(true);
        try {
            const u = team.find(t => t.name === userStats.name);
            if (!u) return;

            const logs = await LogService.getByUser(u.id);
            const userShifts = await TimeTrackingService.getShifts(u.id, filter.startDate, filter.endDate);
            const docs = await BillingService.getAll();
            const userPurchaseOrders = docs.filter(d => d.performedBy === u.name);

            setSelectedUser({
                ...userStats,
                id: u.id,
                logs,
                shifts: userShifts,
                docs: userPurchaseOrders
            });
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const analytics = useMemo(() => {
        const userStats: Record<string, { totalSales: number; totalHours: number; salesCount: number; name: string; photo?: string; baseSalary: number; baseHours: number }> = {};

        const normalize = (s: string) => s ? s.trim().toLowerCase() : '';
        const userMap: Record<string, string> = {};

        team.forEach(user => {
            userStats[user.name] = {
                totalSales: 0,
                totalHours: 0,
                salesCount: 0,
                name: user.name,
                photo: user.photo,
                baseSalary: user.baseSalary || 0,
                baseHours: user.baseHours || 160
            };
            userMap[normalize(user.name)] = user.name;
        });

        // Filter sales by date range
        const start = new Date(filter.startDate);
        const end = new Date(filter.endDate);
        end.setHours(23, 59, 59);

        sales.forEach(sale => {
            const d = new Date(sale.timestamp);
            if (d >= start && d <= end) {
                // Try exact match first, then normalized
                let targetParams = userStats[sale.performedBy];
                if (!targetParams) {
                    const normalizedName = normalize(sale.performedBy);
                    const realName = userMap[normalizedName];
                    if (realName) targetParams = userStats[realName];
                }

                if (targetParams) {
                    targetParams.totalSales += sale.total;
                    targetParams.salesCount += 1;
                }
            }
        });

        shifts.forEach(shift => {
            const user = team.find(u => u.id === shift.user_id);
            if (user && userStats[user.name]) {
                const shiftStart = new Date(shift.start_time);
                const shiftEnd = shift.end_time ? new Date(shift.end_time) : new Date();
                const duration = (shiftEnd.getTime() - shiftStart.getTime()) / (1000 * 60 * 60);
                userStats[user.name].totalHours += duration;
            }
        });

        const stats = Object.values(userStats).map(s => {
            const efficiency = s.totalHours > 0 ? s.totalSales / s.totalHours : 0;
            const hourlyRate = s.baseSalary > 0 ? s.baseSalary / (s.baseHours || 160) : 0;
            return {
                ...s,
                efficiency,
                hourlyRate
            };
        }).sort((a, b) => b.efficiency - a.efficiency);

        const bestEmployee = [...stats].sort((a, b) => b.totalSales - a.totalSales)[0];

        return { stats, bestEmployee };
    }, [sales, team, shifts, filter]);

    const handleExport = () => {
        const headers = ["Colaborador", "Vendas Totais", "Horas Trabalhadas", "Vendas/Hora", "Qtd Vendas"];
        const csvContent = [
            headers.join(','),
            ...analytics.stats.map(s => [
                s.name,
                s.totalSales.toFixed(2),
                s.totalHours.toFixed(2),
                s.efficiency.toFixed(2),
                s.salesCount
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `performance_equipa_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            {/* Filters & Export */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-wrap justify-between items-end gap-4">
                <div className="flex flex-wrap gap-4 items-end">
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2 mb-1 block">Colaborador</label>
                        <div className="relative">
                            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500" size={16} />
                            <select
                                className="pl-9 pr-4 py-3 bg-gray-50 border-none rounded-xl text-xs font-bold text-emerald-950 uppercase outline-none focus:ring-2 focus:ring-emerald-500/20"
                                value={filter.userId}
                                onChange={e => setFilter({ ...filter, userId: e.target.value })}
                            >
                                <option value="ALL">Todos os Colaboradores</option>
                                {team.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2 mb-1 block">Período</label>
                        <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
                            <Calendar size={16} className="text-emerald-600 ml-2" />
                            <input type="date" className="bg-transparent text-xs font-bold text-emerald-950 outline-none uppercase" value={filter.startDate} onChange={e => setFilter({ ...filter, startDate: e.target.value })} />
                            <span className="text-gray-300 font-black">-</span>
                            <input type="date" className="bg-transparent text-xs font-bold text-emerald-950 outline-none uppercase" value={filter.endDate} onChange={e => setFilter({ ...filter, endDate: e.target.value })} />
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-950 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all shadow-lg active:scale-95"
                >
                    <Download size={16} /> Exportar CSV
                </button>
            </div>

            {loading && (
                <div className="fixed inset-0 bg-white/60 backdrop-blur-md z-[10000] flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-emerald-950 border-t-emerald-400 rounded-full animate-spin"></div>
                        <p className="text-[10px] font-black text-emerald-950 uppercase tracking-[0.2em] animate-pulse">A carregar dados...</p>
                    </div>
                </div>
            )}

            {selectedUser && (
                <UserDetailModal
                    user={selectedUser}
                    onClose={() => setSelectedUser(null)}
                    filterSales={sales.filter(s => {
                        const d = new Date(s.timestamp);
                        const start = new Date(filter.startDate);
                        const end = new Date(filter.endDate);
                        end.setHours(23, 59, 59);
                        return d >= start && d <= end;
                    })}
                />
            )}

            {/* Employee of the Month */}
            {analytics.bestEmployee && analytics.bestEmployee.totalSales > 0 && filter.userId === 'ALL' && (
                <div className="bg-gradient-to-br from-emerald-900 to-emerald-950 p-1 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                    <div className="bg-emerald-950 rounded-[2.4rem] p-8 flex flex-col md:flex-row items-center gap-8 relative z-10">
                        <div className="relative">
                            <div className="w-32 h-32 rounded-[2.5rem] bg-emerald-500 overflow-hidden border-4 border-emerald-500/20 shadow-2xl group-hover:scale-105 transition-transform duration-500">
                                {analytics.bestEmployee.photo ? (
                                    <img src={analytics.bestEmployee.photo} alt={analytics.bestEmployee.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-white text-5xl font-black italic">
                                        {analytics.bestEmployee.name.charAt(0)}
                                    </div>
                                )}
                            </div>
                            <div className="absolute -bottom-2 -right-2 bg-amber-400 text-emerald-950 p-3 rounded-2xl shadow-xl animate-bounce">
                                <Trophy size={20} />
                            </div>
                        </div>

                        <div className="flex-1 text-center md:text-left space-y-4">
                            <div>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400/20 text-amber-400 rounded-full text-[9px] font-black uppercase tracking-widest mb-3">
                                    <Star size={12} /> Colaborador Líder em Vendas
                                </div>
                                <h3 className="text-4xl font-black text-white italic tracking-tight">{analytics.bestEmployee.name}</h3>
                                <p className="text-emerald-400/60 text-xs font-black uppercase tracking-[0.2em] mt-1">Excelência no Período</p>
                            </div>

                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <MetricBox icon={TrendingUp} label="Vendas" value={`MT ${analytics.bestEmployee.totalSales.toLocaleString()}`} color="text-amber-400" />
                                <MetricBox icon={Clock} label="Horas" value={`${analytics.bestEmployee.totalHours.toFixed(1)}h`} color="text-blue-400" />
                                <MetricBox icon={Zap} label="Vendas/Hora" value={`MT ${analytics.bestEmployee.efficiency.toFixed(0)}`} color="text-emerald-400" />
                                <MetricBox icon={Search} label="Qtd Vendas" value={analytics.bestEmployee.salesCount} color="text-purple-400" />
                            </div>
                        </div>
                    </div>
                    {/* Animated Background */}
                    <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                </div>
            )}

            {/* Ranking Dashboard */}
            <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-8 pb-4 flex items-center gap-2">
                    <BarChart3 size={18} className="text-emerald-600" />
                    <h3 className="text-sm font-black text-emerald-950 uppercase tracking-widest">Ranking de Produtividade</h3>
                </div>

                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {analytics.stats.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map((s, idx) => (
                        <div
                            key={idx}
                            onClick={() => handleUserClick(s)}
                            className="bg-gray-50/50 p-6 rounded-[2rem] border border-gray-50 hover:border-emerald-200 transition-all group cursor-pointer active:scale-95"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden shrink-0">
                                    {s.photo ? (
                                        <img src={s.photo} alt={s.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-emerald-950 font-black italic">
                                            {s.name.charAt(0)}
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-black text-emerald-950 uppercase text-xs truncate mb-1">{s.name}</h4>
                                    <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest italic">MT {Math.round(s.efficiency).toLocaleString()}/h</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
                                <div className="bg-white p-3 rounded-2xl shadow-sm">
                                    <span className="text-[8px] font-black text-gray-400 uppercase block mb-1">Vendas</span>
                                    <span className="text-xs font-black text-emerald-950">MT {Math.round(s.totalSales).toLocaleString()}</span>
                                </div>
                                <div className="bg-white p-3 rounded-2xl shadow-sm">
                                    <span className="text-[8px] font-black text-gray-400 uppercase block mb-1">Qtd.</span>
                                    <span className="text-xs font-black text-blue-600">{s.salesCount}</span>
                                </div>
                                <div className="bg-white p-3 rounded-2xl shadow-sm">
                                    <span className="text-[8px] font-black text-gray-400 uppercase block mb-1">Horas</span>
                                    <span className="text-xs font-black text-emerald-950">{s.totalHours.toFixed(1)}h</span>
                                </div>
                                <div className="bg-white p-3 rounded-2xl shadow-sm">
                                    <span className="text-[8px] font-black text-gray-400 uppercase block mb-1">Custo/h</span>
                                    <span className="text-xs font-black text-emerald-600">MT {Math.round(s.hourlyRate || 0).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Shift List Table */}
            <div className="bg-white rounded-[3rem] shadow-xl border border-gray-100 p-8">
                <h3 className="text-lg font-black text-emerald-950 uppercase tracking-tight mb-6 flex items-center gap-2 italic">
                    <Clock size={20} className="text-emerald-600" /> Histórico de Presenças
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="p-4 text-[9px] font-black text-gray-400 uppercase tracking-widest rounded-l-2xl">Data</th>
                                <th className="p-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Colaborador</th>
                                <th className="p-4 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Entrada / Saída</th>
                                <th className="p-4 text-[9px] font-black text-gray-400 uppercase tracking-widest rounded-r-2xl text-right pr-8">Duração</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {shifts.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-12 text-center">
                                        <Clock size={40} className="mx-auto text-gray-200 mb-3 opacity-20" />
                                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">Sem registos de ponto para este período</p>
                                    </td>
                                </tr>
                            ) : shifts.map(shift => {
                                const start = new Date(shift.start_time);
                                const end = shift.end_time ? new Date(shift.end_time) : null;
                                const duration = end ? (end.getTime() - start.getTime()) / (1000 * 60 * 60) : (new Date().getTime() - start.getTime()) / (1000 * 60 * 60);
                                const user = team.find(u => u.id === shift.user_id);

                                return (
                                    <tr key={shift.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-emerald-950 text-xs">{start.toLocaleDateString()}</span>
                                                <span className="text-[9px] text-gray-400 font-bold uppercase">{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-black shadow-sm overflow-hidden shrink-0">
                                                    {user?.photo ? <img src={user.photo} className="w-full h-full object-cover" /> : user?.name.charAt(0)}
                                                </div>
                                                <span className="font-bold text-emerald-950 text-xs uppercase truncate">{user?.name}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <span className="text-xs font-mono text-gray-500">{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                <span className="text-gray-300">→</span>
                                                {end ? (
                                                    <span className="text-xs font-mono text-gray-500">{end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                ) : (
                                                    <span className="text-emerald-500 font-black text-[9px] uppercase px-2 py-0.5 bg-emerald-50 rounded italic border border-emerald-100">Ativo agora</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4 text-right pr-8">
                                            <span className={`font-black text-sm ${end ? 'text-emerald-950' : 'text-amber-600'}`}>
                                                {duration.toFixed(1)}h
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* Activity Logs (When user is selected) */}
            {filter.userId !== 'ALL' && (
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl"><Clock size={20} /></div>
                        <div>
                            <h3 className="text-lg font-black text-emerald-950 uppercase tracking-tight">Actividade Recente</h3>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Logs de auditoria do sistema</p>
                        </div>
                    </div>

                    <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                        {userLogs.length === 0 ? (
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center py-10 italic">
                                Nenhuma actividade registada para este período.
                            </p>
                        ) : (
                            userLogs.map(log => (
                                <div key={log.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-emerald-600 shrink-0">
                                        <History size={16} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="text-[11px] font-black text-emerald-950 uppercase">{log.action}</p>
                                            <span className="text-[9px] text-gray-400 font-bold">{new Date(log.timestamp!).toLocaleString()}</span>
                                        </div>
                                        <p className="text-[10px] text-gray-500 font-medium leading-relaxed">{log.details}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const UserDetailModal = ({ user, onClose, filterSales }: { user: any, onClose: () => void, filterSales: Sale[] }) => {
    const [activeTab, setActiveTab] = useState<'SALES' | 'LOGS' | 'SHIFTS' | 'ORDERS'>('SALES');
    const mySales = filterSales.filter(s => s.performedBy === user.name);

    return createPortal(
        <div className="fixed inset-0 bg-emerald-950/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-emerald-500 overflow-hidden shadow-lg border-2 border-white">
                            {user.photo ? <img src={user.photo} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white text-2xl font-black">{user.name.charAt(0)}</div>}
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-emerald-950 uppercase tracking-tight">{user.name}</h3>
                            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Performance Detalhada</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-gray-200 rounded-full text-gray-400 transition-colors"><X size={24} /></button>
                </div>

                {/* Sub-nav */}
                <div className="flex p-2 bg-gray-50 mx-8 mt-6 rounded-2xl gap-2">
                    <button onClick={() => setActiveTab('SALES')} className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'SALES' ? 'bg-emerald-950 text-white shadow-lg' : 'text-gray-400 hover:text-emerald-700'}`}>
                        Vendas ({mySales.length})
                    </button>
                    <button onClick={() => setActiveTab('ORDERS')} className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'ORDERS' ? 'bg-emerald-950 text-white shadow-lg' : 'text-gray-400 hover:text-emerald-700'}`}>
                        Pedidos Fornecedor ({user.docs?.length || 0})
                    </button>
                    <button onClick={() => setActiveTab('SHIFTS')} className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'SHIFTS' ? 'bg-emerald-950 text-white shadow-lg' : 'text-gray-400 hover:text-emerald-700'}`}>
                        Presenças ({user.shifts?.length || 0})
                    </button>
                    <button onClick={() => setActiveTab('LOGS')} className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'LOGS' ? 'bg-emerald-950 text-white shadow-lg' : 'text-gray-400 hover:text-emerald-700'}`}>
                        Auditoria ({user.logs?.length || 0})
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar min-h-[400px]">
                    {activeTab === 'SALES' && (
                        <div className="space-y-3">
                            {mySales.length === 0 ? <EmptyState icon={ShoppingCart} label="Sem vendas no período" /> :
                                mySales.map((s, i) => (
                                    <div key={i} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex justify-between items-center">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">{new Date(s.timestamp).toLocaleDateString()} {new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            <span className="font-bold text-emerald-950 text-xs uppercase">{s.customerName || 'Consumidor Final'}</span>
                                        </div>
                                        <span className="font-black text-emerald-950">MT {s.total.toLocaleString()}</span>
                                    </div>
                                ))}
                        </div>
                    )}

                    {activeTab === 'ORDERS' && (
                        <div className="space-y-3">
                            {user.docs.length === 0 ? <EmptyState icon={Package} label="Sem pedidos no período" /> :
                                user.docs.map((d: any, i: number) => (
                                    <div key={i} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex justify-between items-center">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">{new Date(d.timestamp).toLocaleDateString()}</span>
                                            <span className="font-bold text-emerald-950 text-xs uppercase">{d.type} - {d.targetName}</span>
                                        </div>
                                        <span className="font-black text-emerald-950">MT {d.total.toLocaleString()}</span>
                                    </div>
                                ))}
                        </div>
                    )}

                    {activeTab === 'SHIFTS' && (
                        <div className="space-y-3">
                            {user.shifts.length === 0 ? <EmptyState icon={Clock} label="Sem registos de presença" /> :
                                user.shifts.map((sh: any, i: number) => {
                                    const start = new Date(sh.start_time);
                                    const end = sh.end_time ? new Date(sh.end_time) : null;
                                    const dur = end ? (end.getTime() - start.getTime()) / (1000 * 60 * 60) : 0;
                                    return (
                                        <div key={i} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex justify-between items-center">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase">{start.toLocaleDateString()}</span>
                                                <span className="font-bold text-emerald-950 text-xs">{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} → {end ? end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Ativo'}</span>
                                            </div>
                                            {dur > 0 && <span className="text-[10px] font-black text-emerald-600 bg-emerald-100 px-3 py-1 rounded-lg uppercase">{dur.toFixed(1)}h</span>}
                                        </div>
                                    );
                                })}
                        </div>
                    )}

                    {activeTab === 'LOGS' && (
                        <div className="space-y-3">
                            {user.logs.length === 0 ? <EmptyState icon={History} label="Sem logs de auditoria" /> :
                                user.logs.map((l: any, i: number) => (
                                    <div key={i} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col gap-1">
                                        <div className="flex justify-between items-start">
                                            <span className="text-[9px] font-black text-emerald-600 uppercase px-2 py-0.5 bg-white rounded-md border border-gray-100">{l.action}</span>
                                            <span className="text-[9px] font-bold text-gray-400">{new Date(l.timestamp).toLocaleString()}</span>
                                        </div>
                                        <p className="text-[10px] text-gray-600 font-medium leading-tight">{l.details}</p>
                                    </div>
                                ))}
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

const EmptyState = ({ icon: Icon, label }: { icon: any, label: string }) => (
    <div className="py-20 flex flex-col items-center justify-center gap-4 text-gray-300">
        <Icon size={48} strokeWidth={1} />
        <p className="text-[10px] font-black uppercase tracking-widest">{label}</p>
    </div>
);

const MetricBox = ({ icon: Icon, label, value, color }: any) => (
    <div className="bg-white/5 p-4 rounded-3xl border border-white/5 hover:bg-white/10 transition-colors shadow-inner">
        <div className="flex items-center gap-2 mb-1.5 opacity-60">
            <Icon size={14} className={color} />
            <span className="text-[9px] font-black uppercase text-white tracking-widest">{label}</span>
        </div>
        <p className="text-lg font-black text-white">{value}</p>
    </div>
);
