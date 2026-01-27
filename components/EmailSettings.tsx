import React, { useState, useEffect } from 'react';
import {
    Mail, Key, ShieldCheck, CheckCircle2, XCircle, Trash2, Plus,
    RefreshCw, AlertCircle, Database, Server, ArrowLeft, Globe
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { EmailAccountService } from '../services/email-accounts.service'; // Ensure local interface is removed if conflict
import { CompanyService } from '../services/company.service';
import { EmailAccount } from '../types';
import { User } from '../types';

interface EmailSettingsProps {
    companyId: string;
    currentUser: User;
    onBack?: () => void;
}

export const EmailSettings: React.FC<EmailSettingsProps> = ({ companyId, currentUser, onBack }) => {
    const [accounts, setAccounts] = useState<EmailAccount[]>([]);
    const [loading, setLoading] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [testingId, setTestingId] = useState<string | null>(null);

    const [domain, setDomain] = useState('');
    const [savingDomain, setSavingDomain] = useState(false);

    useEffect(() => {
        CompanyService.get().then(info => {
            if (info.emailDomain) setDomain(info.emailDomain);
        });
    }, [companyId]);

    const saveDomain = async () => {
        if (!domain) return alert("Insira um domínio válido");
        setSavingDomain(true);
        try {
            const current = await CompanyService.get();
            await CompanyService.update({ ...current, emailDomain: domain });
            alert("Domínio definido com sucesso!");
        } catch (e) {
            alert("Erro ao salvar domínio.");
        } finally {
            setSavingDomain(false);
        }
    };

    const [form, setForm] = useState<Partial<EmailAccount>>({
        account_type: 'COMPANY',
        // SMTP
        smtp_port: 587,
        smtp_secure: true,
        smtp_host: '',
        smtp_user: '',
        smtp_pass: '',
        // IMAP (Defaults)
        imap_port: 993,
        imap_secure: true,
        imap_host: '',
        imap_user: '',
        imap_pass: '',

        display_name: '',
        email: '',
    });

    const [verifiedDomains, setVerifiedDomains] = useState<string[]>([]);

    const fetchAccounts = async () => {
        setLoading(true);
        try {
            const data = await EmailAccountService.getAccounts(companyId);
            setAccounts(data);

            // Fetch verified domains
            const { data: domains } = await supabase
                .from('erp_domains')
                .select('domain')
                .eq('company_id', companyId)
                .eq('status', 'verified');

            if (domains) {
                setVerifiedDomains(domains.map(d => d.domain));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, [companyId]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Auto-fill IMAP user/pass if empty (assume same as SMTP/Email)
            const payload = { ...form };
            if (!payload.imap_user) payload.imap_user = payload.email;
            if (!payload.imap_pass) payload.imap_pass = payload.smtp_pass;
            if (!payload.smtp_user) payload.smtp_user = payload.email;

            await EmailAccountService.saveAccount({
                ...payload,
                company_id: companyId,
                user_id: form.account_type === 'PERSONAL' ? currentUser.id : undefined,
                is_active: true
            });
            setIsAdding(false);
            fetchAccounts();
        } catch (e) {
            alert('Falha ao guardar configuração. Verifique os dados.');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Eliminar esta conta?')) return;
        try {
            await EmailAccountService.deleteAccount(id);
            fetchAccounts();
        } catch (e) {
            console.error(e);
        }
    };

    const handleTest = async (id: string) => {
        setTestingId(id);
        try {
            const result = await EmailAccountService.testConnection(id);
            if (result.success) {
                alert('Conexão SMTP efetuada! (IMAP será testado ao sincronizar)');
            } else {
                alert(`Erro: ${result.error || result.message}`);
            }
        } catch (e: any) {
            alert(`Erro: ${e.message}`);
        } finally {
            setTestingId(null);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                    {onBack && (
                        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <ArrowLeft size={20} className="text-gray-500" />
                        </button>
                    )}
                    <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                        <Server size={24} />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">Definições de E-mail</h2>
                        <p className="text-xs font-bold text-gray-400">Gerir servidores SMTP e IMAP</p>
                    </div>
                </div>
                {!isAdding && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-emerald-950 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all shadow-md"
                    >
                        <Plus size={14} />
                        Nova Conta
                    </button>
                )}
            </div>

            {/* Company Domain Config */}
            <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Globe size={18} className="text-emerald-700" />
                        <h3 className="text-sm font-black text-emerald-950 uppercase tracking-tight">Domínio Empresarial</h3>
                    </div>
                    <p className="text-xs text-emerald-800/70 font-medium">Define o domínio oficial (ex: @nobreza.site) para permitir o uso do e-mail.</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <input
                        className="flex-1 md:w-64 px-4 py-2 rounded-xl border border-emerald-200 text-xs font-bold text-emerald-950 placeholder:text-emerald-900/30 focus:outline-none focus:border-emerald-500"
                        placeholder="ex: nobreza.site"
                        value={domain}
                        onChange={e => setDomain(e.target.value)}
                    />
                    <button
                        onClick={saveDomain}
                        disabled={savingDomain}
                        className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 disabled:opacity-50"
                    >
                        {savingDomain ? '...' : 'Definir'}
                    </button>
                </div>
            </div>

            {isAdding && (
                <form onSubmit={handleSave} className="bg-white p-8 rounded-2xl shadow-xl border border-emerald-100 space-y-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-black text-emerald-900 uppercase text-xs tracking-widest">Configuração do Servidor</h3>
                        <button type="button" onClick={() => setIsAdding(false)}><XCircle size={20} className="text-gray-400 hover:text-red-500" /></button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Domain Selection for Resend */}
                        <div className="md:col-span-2 bg-blue-50 p-4 rounded-xl border border-blue-100 mb-2">
                            <div className="flex items-center gap-2 mb-2">
                                <Globe size={16} className="text-blue-600" />
                                <span className="text-xs font-black text-blue-950 uppercase">Usar Domínio Verificado (Resend)</span>
                            </div>
                            <select
                                className="w-full px-4 py-2 rounded-xl border border-blue-200 text-xs font-bold text-blue-900 focus:outline-none"
                                onChange={e => {
                                    const d = e.target.value;
                                    if (d) {
                                        setForm({
                                            ...form,
                                            smtp_host: 'api.resend.com',
                                            smtp_user: 'resend',
                                            smtp_pass: 'resend_key_managed_by_system',
                                            imap_host: '', // User still needs to provide IMAP for receiving if they want Inbox
                                            email: `@${d}`
                                        });
                                    }
                                }}
                            >
                                <option value="">-- Selecionar Domínio Verificado --</option>
                                {(verifiedDomains || []).map(d => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
                            <p className="text-[10px] text-blue-800/60 mt-2">* Ao selecionar, o envio será feito pela infraestrutura da Resend.</p>
                        </div>

                        {/* Basic Info */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase">Nome a Exibir</label>
                            <input required value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border rounded-xl text-xs font-bold" placeholder="Ex: Vendas" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase">E-mail</label>
                            <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border rounded-xl text-xs font-bold" placeholder="email@dominio.com" />
                        </div>

                        {/* SMTP Section */}
                        <div className="md:col-span-2 border-t pt-4"><span className="text-xs font-black text-emerald-600">SMTP (Envio)</span></div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase">Host SMTP</label>
                            <input required value={form.smtp_host} onChange={e => setForm({ ...form, smtp_host: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border rounded-xl text-xs font-bold" placeholder="smtp.gmail.com" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase">Porta</label>
                                <input type="number" required value={form.smtp_port} onChange={e => setForm({ ...form, smtp_port: parseInt(e.target.value) })} className="w-full px-4 py-3 bg-gray-50 border rounded-xl text-xs font-bold" />
                            </div>
                            <div className="flex items-center gap-2 pt-6">
                                <input type="checkbox" checked={form.smtp_secure} onChange={e => setForm({ ...form, smtp_secure: e.target.checked })} />
                                <label className="text-[10px] font-black text-gray-500 uppercase">Seguro (SSL)</label>
                            </div>
                        </div>

                        {/* IMAP Section */}
                        <div className="md:col-span-2 border-t pt-4"><span className="text-xs font-black text-blue-600">IMAP (Receção)</span></div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase">Host IMAP</label>
                            <input value={form.imap_host} onChange={e => setForm({ ...form, imap_host: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border rounded-xl text-xs font-bold" placeholder="imap.gmail.com" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase">Porta</label>
                                <input type="number" value={form.imap_port} onChange={e => setForm({ ...form, imap_port: parseInt(e.target.value) })} className="w-full px-4 py-3 bg-gray-50 border rounded-xl text-xs font-bold" />
                            </div>
                            <div className="flex items-center gap-2 pt-6">
                                <input type="checkbox" checked={form.imap_secure} onChange={e => setForm({ ...form, imap_secure: e.target.checked })} />
                                <label className="text-[10px] font-black text-gray-500 uppercase">Seguro (SSL)</label>
                            </div>
                        </div>

                        {/* Auth */}
                        <div className="md:col-span-2 border-t pt-4">
                            <label className="text-[10px] font-black text-gray-400 uppercase">Password / App Password</label>
                            <input required type="password" value={form.smtp_pass} onChange={e => setForm({ ...form, smtp_pass: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border rounded-xl text-xs font-bold" />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={() => setIsAdding(false)} className="px-6 py-3 text-gray-400 font-bold text-xs uppercase">Cancelar</button>
                        <button type="submit" className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold text-xs uppercase shadow-lg">Guardar</button>
                    </div>
                </form>
            )}

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {accounts.map(acc => (
                    <div key={acc.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h4 className="font-bold text-gray-900">{acc.display_name}</h4>
                                <p className="text-xs text-gray-400">{acc.email}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleTest(acc.id)} className="p-2 text-gray-400 hover:text-blue-500"><RefreshCw size={16} /></button>
                                <button onClick={() => handleDelete(acc.id)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                            </div>
                        </div>
                        <div className="text-[10px] text-gray-400 space-y-1 bg-gray-50 p-3 rounded-lg">
                            <p>SMTP: {acc.smtp_host}:{acc.smtp_port}</p>
                            <p>IMAP: {acc.imap_host || 'N/A'}:{acc.imap_port || 'N/A'}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
