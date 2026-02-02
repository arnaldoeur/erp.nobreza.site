
import React from 'react';
import { ArrowLeft, Book, Server, Code, Shield, MessageSquare, Database, Cpu, Globe, Zap, Smartphone, Layers } from 'lucide-react';

interface Props {
    onBack: () => void;
}

export const Documentation: React.FC<Props> = ({ onBack }) => {
    return (
        <div className="min-h-screen bg-slate-950 text-white selection:bg-emerald-500/30 font-['Inter',sans-serif] flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
            <div className="w-full max-w-6xl bg-slate-900 rounded-[3rem] shadow-2xl border border-white/5 overflow-hidden flex flex-col h-[90vh] relative">

                {/* Technical Grid Overlay */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-0">
                    <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#10b981 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
                </div>

                {/* Header */}
                <div className="bg-slate-950 p-10 md:p-12 shrink-0 flex items-center justify-between border-b border-white/5 relative z-10">
                    <div>
                        <h2 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.5em] mb-3">Engenharia Nobreza ERP</h2>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tighter flex items-center gap-4 italic uppercase">
                            <Book size={32} className="text-emerald-500" /> Documentação Técnica
                        </h1>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={() => window.print()} className="hidden md:flex text-[10px] font-black uppercase tracking-widest bg-white/5 hover:bg-white/10 border border-white/10 px-8 py-4 rounded-2xl transition-all items-center gap-3">
                            <ArrowLeft size={16} className="rotate-[90deg]" /> Descarregar PDF
                        </button>
                        <button onClick={onBack} className="text-[10px] font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-500 px-8 py-4 rounded-2xl transition-all flex items-center gap-3 shadow-lg shadow-emerald-500/20">
                            <ArrowLeft size={16} /> Voltar ao Portal
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-10 md:p-16 space-y-20 custom-scrollbar relative z-10 bg-slate-900/50 backdrop-blur-3xl">

                    {/* Intro / Vision */}
                    <section className="relative">
                        <div className="absolute -left-10 top-0 w-1 h-full bg-emerald-500 rounded-full opacity-20"></div>
                        <h2 className="text-[12px] font-black text-emerald-500 uppercase tracking-[0.4em] mb-6">A Nossa Visão</h2>
                        <div className="max-w-4xl">
                            <p className="text-2xl font-medium text-white/80 leading-relaxed tracking-tight italic">
                                O <span className="text-white font-black underline decoration-emerald-500/30 underline-offset-8">Nobreza ERP</span> não é apenas um software de vendas. É um ecossistema de alta precisão desenhado para unificar a inteligência de negócios com a operação farmacêutica moçambicana. Desenvolvido pela <a href="https://zyph.co.in" target="_blank" rel="noreferrer" className="text-emerald-400 hover:text-emerald-300 transition-colors">Zyph Tech</a>, o sistema garante produtividade, segurança fiscal e lucro real.
                            </p>
                        </div>
                    </section>

                    {/* Architecture / Tech Stack */}
                    <section>
                        <div className="flex items-center justify-between mb-12">
                            <h2 className="text-[12px] font-black text-emerald-500 uppercase tracking-[0.4em]">Arquitetura & Stack</h2>
                            <span className="text-[10px] uppercase font-black text-white/20 tracking-widest bg-white/5 px-4 py-2 rounded-full border border-white/10">Build 2026.02</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                { icon: Code, title: 'Frontend Engine', desc: 'Interface ultra-rápida construída com React 18, TypeScript e Vite para carregamento instantâneo.' },
                                { icon: Database, title: 'Data Layer', desc: 'Base de dados PostgreSQL dedicada e isolada para cada farmácia, garantindo privacidade absoluta.' },
                                { icon: Cpu, title: 'Híbrido AI', desc: 'Núcleo de Inteligência Artificial integrado para análises preditivas de stock e suporte em tempo real.' },
                                { icon: Layers, title: 'Infraestrutura', desc: 'Deploy escalável com proteção DDOS e backups redundantes a cada 24 horas.' }
                            ].map((tech, i) => (
                                <div key={i} className="bg-white/5 border border-white/10 p-8 rounded-[2rem] hover:bg-white/10 hover:border-emerald-500/30 transition-all group">
                                    <tech.icon size={32} className="text-emerald-500 mb-6 group-hover:scale-110 transition-transform" />
                                    <h4 className="text-lg font-black uppercase tracking-tight italic mb-3">{tech.title}</h4>
                                    <p className="text-sm text-white/40 leading-relaxed font-medium">{tech.desc}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Integrations */}
                    <section>
                        <h2 className="text-[12px] font-black text-emerald-500 uppercase tracking-[0.4em] mb-12">Ecossistema de Integrações</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                            <div className="space-y-6">
                                <div className="flex items-center gap-4 text-white font-black uppercase text-xs tracking-widest"><Globe size={18} className="text-emerald-500" /> Autoridade Tributária</div>
                                <p className="text-sm text-white/40 leading-relaxed">Certificação total para emissão de faturas e documentos fiscais seguindo as normas vigentes em Moçambique.</p>
                            </div>
                            <div className="space-y-6">
                                <div className="flex items-center gap-4 text-white font-black uppercase text-xs tracking-widest"><Smartphone size={18} className="text-emerald-500" /> Gateway de Pagamentos</div>
                                <p className="text-sm text-white/40 leading-relaxed">Suporte direto para M-Pesa, e-Mola e pagamentos móveis integrados diretamente no Ponto de Venda (POS).</p>
                            </div>
                            <div className="space-y-6">
                                <div className="flex items-center gap-4 text-white font-black uppercase text-xs tracking-widest"><MessageSquare size={18} className="text-emerald-500" /> Notificações SMS</div>
                                <p className="text-sm text-white/40 leading-relaxed">Envio automático de alertas de stock baixo e confirmações de consultas para os seus clientes finais.</p>
                            </div>
                        </div>
                    </section>

                    {/* Operational Compliance */}
                    <section className="bg-emerald-500/5 border border-emerald-500/10 p-12 rounded-[2.5rem] relative overflow-hidden">
                        <Zap className="absolute -right-10 -bottom-10 text-emerald-500/5 rotate-12" size={300} />
                        <div className="relative z-10 max-w-3xl">
                            <h2 className="text-2xl font-black uppercase tracking-tight mb-4 italic">Conformidade Operacional (SNAF)</h2>
                            <p className="text-white/60 text-lg leading-relaxed mb-8">
                                O sistema está totalmente alinhado com o Sistema Nacional de Administração Farmacêutica, permitindo a gestão correta de substâncias controladas e o reporte técnico obrigatório.
                            </p>
                            <div className="flex gap-4">
                                <div className="bg-emerald-500 text-slate-950 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">Controlo de Lotes</div>
                                <div className="bg-emerald-500 text-slate-950 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">Alertas de Validade</div>
                                <div className="bg-emerald-500 text-slate-950 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">Mapa Mensal Automático</div>
                            </div>
                        </div>
                    </section>

                    {/* Footer / Support */}
                    <section className="pt-20 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-10">
                        <div className="text-center md:text-left">
                            <h4 className="text-[12px] font-black text-white/20 uppercase tracking-[0.5em] mb-4">Parceiro Tecnológico</h4>
                            <a href="https://zyph.co.in" target="_blank" rel="noreferrer" className="text-2xl font-black text-emerald-500 italic hover:text-emerald-400 transition-colors uppercase tracking-widest">Zyph Tech, Lda</a>
                        </div>
                        <div className="flex flex-col items-center md:items-end text-center md:text-right gap-4">
                            <div className="flex items-center gap-3 text-white/40 text-xs font-bold">
                                <MessageSquare size={16} className="text-emerald-500" /> 24/7 Monitoring & Support
                            </div>
                            <p className="text-[10px] font-black text-white/10 uppercase tracking-[0.4em]">Build v2.5.0 • Nobreza Pharma Systems © 2026</p>
                        </div>
                    </section>

                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    .min-h-screen { background: white !important; color: black !important; }
                    .bg-slate-900, .bg-slate-950 { background: white !important; color: black !important; border: none !important; }
                    .text-emerald-500, .text-emerald-400 { color: #059669 !important; }
                    button { display: none !important; }
                    .overflow-y-auto { overflow: visible !important; height: auto !important; }
                    .shadow-2xl { shadow: none !important; }
                    .border-white\\/5 { border: 1px solid #eee !important; }
                }
                .custom-scrollbar::-webkit-scrollbar {
                  width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                  background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                  background: rgba(16, 185, 129, 0.2);
                  border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                  background: rgba(16, 185, 129, 0.4);
                }
            ` }} />
        </div>
    );
};
