
import React, { useState, useEffect } from 'react';
import {
    ShieldCheck,
    Building2,
    Users,
    TrendingUp,
    AlertTriangle,
    Trash2,
    Search,
    Plus,
    Lock,
    Activity,
    LogOut,
    X
} from 'lucide-react';
import { SuperAdminService, AuthService } from '../services';
import { CompanyInfo, User } from '../types';

interface SuperAdminProps {
    currentUser: User;
    onLogout: () => void;
}

export const SuperAdmin: React.FC<SuperAdminProps> = ({ currentUser, onLogout }) => {
    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'COMPANIES' | 'USERS'>('OVERVIEW');
    const [stats, setStats] = useState({ companiesCount: 0, usersCount: 0, totalRevenue: 0 });
    const [companies, setCompanies] = useState<CompanyInfo[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        loadData();
    }, [refreshKey]);

    const loadData = async () => {
        setLoading(true);
        try {
            const s = await SuperAdminService.getGlobalStats();
            const c = await SuperAdminService.getAllCompanies();
            const u = await SuperAdminService.getAllUsers();
            setStats(s);
            setCompanies(c);
            setUsers(u);
        } catch (e) {
            console.error(e);
            alert("Erro ao carregar dados do Super Admin.");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCompany = async (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const name = (form.elements.namedItem('name') as HTMLInputElement).value;
        if (!name) return;

        if (confirm(`Criar nova empresa: ${name}?`)) {
            try {
                await SuperAdminService.createCompany({
                    name,
                    active: true,
                    themeColor: '#10b981'
                });
                setRefreshKey(prev => prev + 1);
                form.reset();
            } catch (e) {
                alert("Erro ao criar empresa.");
            }
        }
    };

    const handleDeleteCompany = async (id: string, name: string) => {
        if (confirm(`ATENÇÃO: Apagar a empresa "${name}" removerá TODOS os dados associados (usuários, vendas, produtos). Tem a certeza absoluta?`)) {
            const confirmName = prompt(`Digite "${name}" para confirmar a exclusão:`);
            if (confirmName === name) {
                try {
                    await SuperAdminService.deleteCompany(id);
                    setRefreshKey(prev => prev + 1);
                } catch (e) {
                    alert("Erro ao apagar empresa.");
                }
            }
        }
    };

    const handleDeleteUser = async (id: string, name: string) => {
        if (confirm(`Tem a certeza que deseja remover o utilizador "${name}"?`)) {
            try {
                await SuperAdminService.deleteUser(id);
                setRefreshKey(prev => prev + 1);
            } catch (e) {
                alert("Erro ao apagar utilizador.");
            }
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center text-emerald-950 font-black animate-pulse">CARREGANDO BOSS ADMIN...</div>;

    return (
        <div className="min-h-screen bg-slate-100 font-sans text-slate-900">
            {/* Top Bar */}
            <div className="bg-slate-900 text-white p-4 shadow-lg flex justify-between items-center sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-600 rounded-lg animate-pulse"><ShieldCheck size={24} /></div>
                    <div>
                        <h1 className="text-xl font-black tracking-tighter uppercase">Boss Admin</h1>
                        <p className="text-[10px] text-slate-400 font-mono tracking-widest">CENTRAL DE COMANDO IT - ACESSO RESTRITO</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-xs font-bold bg-slate-800 px-3 py-1 rounded-full">{currentUser.email}</span>
                    <button onClick={onLogout} className="p-2 hover:bg-red-600/20 rounded-lg transition-colors text-red-500 hover:text-red-400">
                        <LogOut size={20} />
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-6 space-y-8">

                {/* Navigation Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                    <Tab active={activeTab === 'OVERVIEW'} onClick={() => setActiveTab('OVERVIEW')} icon={Activity} label="Visão Global" />
                    <Tab active={activeTab === 'COMPANIES'} onClick={() => setActiveTab('COMPANIES')} icon={Building2} label="Empresas Registadas" />
                    <Tab active={activeTab === 'USERS'} onClick={() => setActiveTab('USERS')} icon={Users} label="Gestão de Usuários" />
                </div>

                {/* Content Area */}
                {activeTab === 'OVERVIEW' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
                        <StatCard label="Empresas Ativas" value={stats.companiesCount} icon={Building2} color="blue" />
                        <StatCard label="Usuários no Sistema" value={stats.usersCount} icon={Users} color="indigo" />
                        <StatCard label="Receita Global (Estimada)" value={`MT ${stats.totalRevenue.toLocaleString()}`} icon={TrendingUp} color="emerald" />

                        <div className="md:col-span-3 bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                            <div className="flex items-center gap-3 mb-4 text-slate-400 uppercase tracking-widest text-xs font-black">
                                <AlertTriangle size={16} /> Estado do Sistema
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-ping"></div>
                                <p className="font-bold text-emerald-700">Todos os serviços operacionais. Base de dados sincronizada.</p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'COMPANIES' && (
                    <div className="space-y-6 animate-in fade-in">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                            <h3 className="text-lg font-black uppercase mb-4 flex items-center gap-2"><Plus size={20} /> Registar Nova Empresa</h3>
                            <form onSubmit={handleCreateCompany} className="flex gap-4">
                                <input name="name" placeholder="Nome da Empresa" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-sm focus:outline-none focus:border-red-500 transition-colors" required />
                                <button className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black uppercase text-xs hover:bg-slate-800 transition-colors">Criar</button>
                            </form>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="p-4 text-xs font-black text-slate-400 uppercase">Empresa / ID</th>
                                        <th className="p-4 text-xs font-black text-slate-400 uppercase">Contacto / Email</th>
                                        <th className="p-4 text-xs font-black text-slate-400 uppercase">Status</th>
                                        <th className="p-4 text-xs font-black text-slate-400 uppercase text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {companies.map(c => (
                                        <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-4">
                                                <div className="font-bold text-slate-900">{c.name}</div>
                                                <div className="text-[10px] font-mono text-slate-400">{c.id}</div>
                                            </td>
                                            <td className="p-4 text-sm font-medium text-slate-600">
                                                <div>{c.email || '-'}</div>
                                                <div className="text-xs text-slate-400">{c.phone || '-'}</div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${c.active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                    {c.active ? 'Ativo' : 'Inativo'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <button onClick={() => handleDeleteCompany(c.id, c.name)} className="p-2 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Apagar Empresa">
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'USERS' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in">
                        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="font-black uppercase text-sm text-slate-500">Listagem Global de Utilizadores</h3>
                            <div className="bg-white border border-slate-200 rounded-lg px-3 py-1 flex items-center gap-2">
                                <Search size={14} className="text-slate-400" />
                                <input placeholder="Buscar usuário..." className="text-xs font-bold outline-none" />
                            </div>
                        </div>
                        <table className="w-full text-left">
                            <thead className="border-b border-slate-200">
                                <tr>
                                    <th className="p-4 text-xs font-black text-slate-400 uppercase">Nome / Role</th>
                                    <th className="p-4 text-xs font-black text-slate-400 uppercase">Email</th>
                                    <th className="p-4 text-xs font-black text-slate-400 uppercase">Empresa</th>
                                    <th className="p-4 text-xs font-black text-slate-400 uppercase text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {users.map(u => (
                                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4">
                                            <div className="font-bold text-slate-900">{u.name}</div>
                                            <div className="text-[10px] font-bold text-blue-600 uppercase bg-blue-50 inline-block px-1 rounded">{u.role}</div>
                                        </td>
                                        <td className="p-4 text-sm font-medium text-slate-600">{u.email}</td>
                                        <td className="p-4">
                                            <div className="font-bold text-slate-700 text-xs flex items-center gap-1">
                                                <Building2 size={12} className="text-slate-400" />
                                                {u.companies?.name || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button onClick={() => handleDeleteUser(u.id, u.name)} className="p-2 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

            </div>
        </div>
    );
};

const Tab = ({ active, onClick, icon: Icon, label }: any) => (
    <button onClick={onClick} className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all whitespace-nowrap ${active ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
        <Icon size={18} />
        <span className="font-black text-xs uppercase tracking-wide">{label}</span>
    </button>
);

const StatCard = ({ label, value, icon: Icon, color }: any) => (
    <div className={`bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group`}>
        <div className={`absolute top-0 right-0 p-4 opacity-10 text-${color}-600 group-hover:scale-150 transition-transform duration-500`}><Icon size={64} /></div>
        <div className="relative z-10">
            <div className={`flex items-center gap-2 text-${color}-600 mb-2`}>
                <Icon size={20} />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
            </div>
            <p className="text-3xl font-black text-slate-900">{value}</p>
        </div>
    </div>
);
