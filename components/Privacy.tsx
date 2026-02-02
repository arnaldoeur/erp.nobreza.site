
import React from 'react';
import { ArrowLeft, Shield, Lock, Eye, Database, Globe, FileText, CheckCircle } from 'lucide-react';

interface Props {
    onBack: () => void;
}

export const Privacy: React.FC<Props> = ({ onBack }) => {
    return (
        <div className="min-h-screen bg-slate-950 text-white selection:bg-emerald-500/30 font-['Inter',sans-serif] flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
            <div className="w-full max-w-4xl bg-slate-900 rounded-[3rem] shadow-2xl border border-white/5 overflow-hidden flex flex-col h-[85vh] relative">

                {/* Header */}
                <div className="bg-slate-950 p-10 shrink-0 flex items-center justify-between border-b border-white/5 relative z-10">
                    <h1 className="text-2xl font-black tracking-tighter flex items-center gap-4 italic uppercase">
                        <Shield size={28} className="text-emerald-500" /> Política de Privacidade
                    </h1>
                    <button onClick={onBack} className="text-[10px] font-black uppercase tracking-widest bg-white/5 hover:bg-white/10 border border-white/10 px-8 py-4 rounded-2xl transition-all flex items-center gap-3">
                        <ArrowLeft size={16} /> Voltar
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-12 md:p-16 space-y-12 custom-scrollbar text-white/60 leading-relaxed">
                    <section>
                        <h2 className="text-white font-black uppercase text-xs tracking-[0.4em] mb-6 flex items-center gap-3">
                            <Lock size={18} className="text-emerald-500" /> Compromisso de Confidencialidade
                        </h2>
                        <p className="text-lg font-medium leading-relaxed italic border-l-4 border-emerald-500/20 pl-8 mb-8">
                            Na Nobreza ERP (desenvolvido pela Zyph Tech), tratamos a privacidade dos seus dados farmacêuticos como a nossa prioridade absoluta. O nosso sistema foi desenhado para garantir que a sua farmácia opere num ambiente digital impenetrável.
                        </p>
                    </section>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div className="space-y-6">
                            <h3 className="text-white font-bold uppercase text-[10px] tracking-widest flex items-center gap-2">
                                <Database size={16} className="text-emerald-500" /> Isolamento de Dados
                            </h3>
                            <p className="text-sm">Cada cliente possui uma instância de base de dados isolada. Nunca misturamos informações de diferentes farmácias, garantindo que os seus preços e estratégias sejam apenas seus.</p>
                        </div>
                        <div className="space-y-6">
                            <h3 className="text-white font-bold uppercase text-[10px] tracking-widest flex items-center gap-2">
                                <Eye size={16} className="text-emerald-500" /> Transparência de Uso
                            </h3>
                            <p className="text-sm">Recolhemos apenas os dados necessários para o funcionamento do ERP: credenciais de acesso, registos de vendas e inventário para gestão operativa.</p>
                        </div>
                    </div>

                    <section className="bg-white/5 p-10 rounded-[2.5rem] border border-white/10 relative overflow-hidden">
                        <div className="relative z-10">
                            <h2 className="text-white font-black uppercase text-xs tracking-widest mb-6 italic">Segurança Operacional</h2>
                            <ul className="space-y-4">
                                {[
                                    'Backups diários encriptados off-site.',
                                    'Acesso restrito por níveis de utilizador (RBAC).',
                                    'Protocolos SSL de alta segurança em todas as comunicações.',
                                    'Auditoria de acessos (Logs de sistema) permanente.'
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start gap-4 text-sm">
                                        <CheckCircle size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </section>

                    <section className="text-center pt-10">
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em]">Última Atualização: Janeiro 2026 • Moçambique</p>
                    </section>
                </div>
            </div>
            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(16, 185, 129, 0.2); border-radius: 10px; }
            ` }} />
        </div>
    );
};
