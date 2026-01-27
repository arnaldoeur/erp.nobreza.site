import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { ResendDomain } from '../types';
import { Globe, Plus, Trash2, CheckCircle2, AlertCircle, Copy, Loader, RefreshCw, X, Database } from 'lucide-react';

interface DomainManagerProps {
    companyId: string;
}

export const DomainManager: React.FC<DomainManagerProps> = ({ companyId }) => {
    const [domains, setDomains] = useState<ResendDomain[]>([]);
    const [loading, setLoading] = useState(false);
    const [newDomain, setNewDomain] = useState('');
    const [adding, setAdding] = useState(false);
    const [selectedDomain, setSelectedDomain] = useState<ResendDomain | null>(null);

    const fetchDomains = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('erp_domains')
                .select('*')
                .eq('company_id', companyId);
            if (error) throw error;
            setDomains(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDomains();
    }, [companyId]);

    const addDomain = async () => {
        if (!newDomain.includes('.')) return alert("Domínio inválido");
        setAdding(true);
        try {
            // 1. Call Edge Function to Add to Resend
            const { data: resendData, error: funcError } = await supabase.functions.invoke('resend-domains', {
                body: { action: 'ADD_DOMAIN', domain: newDomain }
            });

            if (funcError || !resendData) throw new Error(funcError?.message || "Erro ao contactar Resend");

            // 2. Save to DB
            const { error: dbError } = await supabase.from('erp_domains').insert({
                company_id: Number(companyId), // Changed to Number as per updated schema
                domain: newDomain,
                status: 'pending',
                resend_id: resendData.id,
                dns_records: resendData.records
            });

            if (dbError) throw dbError;

            setNewDomain('');
            fetchDomains();
        } catch (e: any) {
            alert("Erro: " + e.message);
        } finally {
            setAdding(false);
        }
    };

    const verifyDomain = async (domain: ResendDomain) => {
        if (!domain.resend_id) return;
        try {
            const { data, error } = await supabase.functions.invoke('resend-domains', {
                body: { action: 'VERIFY_DOMAIN', id: domain.resend_id }
            });
            if (error) throw error;

            // Update DB status and records
            await supabase.from('erp_domains').update({
                status: data.status,
                dns_records: data.records // Sync fresh records status
            }).eq('id', domain.id);

            alert(`Status atual: ${data.status}`);
            fetchDomains();
        } catch (e: any) {
            alert("Erro ao verificar: " + e.message);
        }
    };

    const deleteDomain = async (id: string, resendId?: string) => {
        if (!confirm("Remover este domínio?")) return;
        try {
            if (resendId) {
                await supabase.functions.invoke('resend-domains', {
                    body: { action: 'DELETE_DOMAIN', id: resendId }
                });
            }
            await supabase.from('erp_domains').delete().eq('id', id);
            fetchDomains();
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                <div>
                    <h3 className="text-sm font-black text-emerald-950 uppercase">Configuração de Domínios</h3>
                    <p className="text-xs text-emerald-800/70">Adicione o seu domínio para melhorar a entregabilidade dos e-mails.</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <input
                        className="flex-1 md:w-64 px-4 py-2 rounded-xl border border-emerald-200 text-xs font-bold focus:outline-none focus:border-emerald-500"
                        placeholder="ex: minhaempresa.com"
                        value={newDomain}
                        onChange={e => setNewDomain(e.target.value)}
                    />
                    <button
                        onClick={addDomain}
                        disabled={adding}
                        className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        {adding ? <Loader size={14} className="animate-spin" /> : <Plus size={14} />} Adicionar
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {domains.map(d => (
                    <div key={d.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                {d.status === 'verified' ? <CheckCircle2 className="text-emerald-500" size={20} /> : <AlertCircle className="text-amber-500" size={20} />}
                                <div>
                                    <h4 className="font-bold text-gray-900">{d.domain}</h4>
                                    <p className={`text-[10px] font-black uppercase tracking-widest ${d.status === 'verified' ? 'text-emerald-500' : 'text-amber-500'}`}>
                                        {d.status === 'verified' ? 'Verificado' : 'Pendente / Aguardando Propagação DNS'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => verifyDomain(d)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg flex items-center gap-2 text-[10px] font-bold uppercase">
                                    <RefreshCw size={14} /> Verificar
                                </button>
                                <button onClick={() => setSelectedDomain(selectedDomain?.id === d.id ? null : d)} className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg text-[10px] font-bold uppercase">
                                    DNS Info
                                </button>
                                <button onClick={() => deleteDomain(d.id, d.resend_id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>

                        {(selectedDomain?.id === d.id || d.status !== 'verified') && Array.isArray(d.dns_records) && (
                            <div className="bg-slate-900 rounded-xl p-6 overflow-hidden border border-slate-700 shadow-2xl">
                                <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
                                    <div className="flex items-center gap-2">
                                        <Database className="text-emerald-500" size={16} />
                                        <span className="text-slate-200 text-xs font-black uppercase tracking-widest">Configuração DNS Requerida</span>
                                    </div>
                                    <button onClick={() => setSelectedDomain(null)} className="text-slate-500 hover:text-white transition-colors"><X size={18} /></button>
                                </div>

                                <div className="space-y-3">
                                    {d.dns_records.map((rec: any, idx: number) => (
                                        <div key={idx} className="flex flex-col gap-2 bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 hover:bg-slate-800 transition-all group">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 font-mono font-black text-[10px] rounded border border-emerald-500/20">{rec.type}</span>
                                                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-tight">Nome / Host:</span>
                                                    <span className="text-white font-mono text-xs font-bold">{rec.name === '@' ? d.domain : `${rec.name}.${d.domain}`}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${rec.status === 'verified' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                                        {rec.status === 'verified' ? 'Verificado' : 'Pendente'}
                                                    </span>
                                                    <button
                                                        onClick={() => { navigator.clipboard.writeText(rec.value); alert("Valor copiado!") }}
                                                        className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
                                                        title="Copiar Valor"
                                                    >
                                                        <Copy size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="bg-black/30 p-2 rounded font-mono text-[11px] text-emerald-300 break-all border border-black/20">
                                                {rec.value}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-6 flex items-start gap-4 p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                                    <AlertCircle className="text-emerald-500 shrink-0" size={20} />
                                    <div>
                                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1 italic">Dica Importante para Hostinger / DNS</p>
                                        <p className="text-[11px] text-slate-300 leading-relaxed">
                                            Ao adicionar os registos no seu provedor (ex: Hostinger), use apenas o prefixo no campo de host.
                                            Por exemplo, para o registo <span className="text-emerald-400 font-bold">resend._domainkey</span>,
                                            introduza apenas <span className="text-white underline">resend._domainkey</span>.
                                            Se o nome for <span className="text-emerald-400 font-bold">send</span>, introduza apenas <span className="text-white underline">send</span>.
                                            Se deixar o campo vazio ou usar <span className="text-white">@</span>, o registo será para o domínio raiz.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
