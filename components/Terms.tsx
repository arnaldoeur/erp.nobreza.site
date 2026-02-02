
import React from 'react';
import { ArrowLeft, FileText, CheckCircle2, AlertCircle, Gavel, Scale, ShieldCheck, Globe } from 'lucide-react';

interface Props {
    onBack: () => void;
}

export const Terms: React.FC<Props> = ({ onBack }) => {
    return (
        <div className="min-h-screen bg-slate-950 text-white selection:bg-emerald-500/30 font-['Inter',sans-serif] flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
            <div className="w-full max-w-4xl bg-slate-900 rounded-[3rem] shadow-2xl border border-white/5 overflow-hidden flex flex-col h-[85vh] relative">

                {/* Header */}
                <div className="bg-slate-950 p-10 shrink-0 flex items-center justify-between border-b border-white/5 relative z-10">
                    <h1 className="text-2xl font-black tracking-tighter flex items-center gap-4 italic uppercase">
                        <Gavel size={28} className="text-emerald-500" /> Termos de Serviço
                    </h1>
                    <button onClick={onBack} className="text-[10px] font-black uppercase tracking-widest bg-white/5 hover:bg-white/10 border border-white/10 px-8 py-4 rounded-2xl transition-all flex items-center gap-3">
                        <ArrowLeft size={16} /> Voltar
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-12 md:p-16 space-y-12 custom-scrollbar text-white/60 leading-relaxed">
                    <section>
                        <h2 className="text-white font-black uppercase text-xs tracking-[0.4em] mb-6 flex items-center gap-3">
                            <Scale size={18} className="text-emerald-500" /> Acordo de Utilização
                        </h2>
                        <p className="text-sm leading-relaxed mb-6">
                            Ao aceder e utilizar o Nobreza ERP, a sua farmácia ("Utilizador") concorda em ficar vinculada aos termos e condições estabelecidos pelo desenvolvedor legal, **Zyph Tech, Lda**, com sede em Moçambique.
                        </p>
                    </section>

                    <div className="space-y-12">
                        {[
                            {
                                icon: ShieldCheck,
                                title: 'Licenciamento e Acesso',
                                text: 'O Nobreza ERP é licenciado sob o modelo de subscrição Software as a Service (SaaS). O acesso é concedido exclusivamente a farmácias e entidades de saúde autorizadas pela Direção de Saúde.'
                            },
                            {
                                icon: Globe,
                                title: 'Responsabilidade Fiscal',
                                text: 'O Utilizador é o único responsável pela veracidade dos dados inseridos e emitidos através do módulo de faturação certificada perante a Autoridade Tributária.'
                            },
                            {
                                icon: FileText,
                                title: 'Propriedade Intelectual',
                                text: 'Todo o código, design industrial e algoritmos de inteligência artificial são propriedade exclusiva da Zyph Tech. É proibida qualquer tentativa de engenharia reversa.'
                            }
                        ].map((item, i) => (
                            <div key={i} className="flex gap-8 group">
                                <div className="shrink-0 w-12 h-12 bg-white/5 border border-white/10 flex items-center justify-center rounded-2xl text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                                    <item.icon size={24} />
                                </div>
                                <div>
                                    <h3 className="text-white font-black uppercase text-[10px] tracking-widest mb-2">{item.title}</h3>
                                    <p className="text-sm">{item.text}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <section className="bg-amber-500/5 border border-amber-500/10 p-10 rounded-[2.5rem] flex items-start gap-6">
                        <AlertCircle size={24} className="text-amber-500 shrink-0 mt-1" />
                        <div>
                            <h4 className="text-white font-black uppercase text-xs tracking-widest mb-3">Interrupções de Serviço</h4>
                            <p className="text-sm text-white/50 leading-relaxed">
                                Reservamos o direito de realizar manutenções programadas com aviso prévio de 24 horas. Interrupções imprevistas serão resolvidas num SLA prioritário de acordo com o plano contratado.
                            </p>
                        </div>
                    </section>

                    <section className="text-center pt-10">
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em]">Foro Competente: Tribunal Judicial da Província de Maputo • Moçambique</p>
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
