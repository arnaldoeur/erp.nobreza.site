import React from 'react';
import { ArrowLeft, Book, Server, Code, Shield, MessageSquare, Database, Cpu } from 'lucide-react';

interface Props {
    onBack: () => void;
}

export const Documentation: React.FC<Props> = ({ onBack }) => {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="w-full max-w-5xl bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col h-[85vh]">

                {/* Header */}
                <div className="bg-slate-900 text-white p-8 shrink-0 flex items-center justify-between">
                    <h1 className="text-2xl font-black uppercase tracking-widest flex items-center gap-3">
                        <Book size={28} className="text-emerald-400" /> Documentação do Sistema
                    </h1>
                    <div className="flex gap-2">
                        <button onClick={() => window.print()} className="text-xs font-bold uppercase tracking-widest bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl transition-all flex items-center gap-2">
                            <ArrowLeft size={16} className="rotate-[-90deg]" /> Baixar PDF
                        </button>
                        <button onClick={onBack} className="text-xs font-bold uppercase tracking-widest bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl transition-all flex items-center gap-2">
                            <ArrowLeft size={16} /> Voltar
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-12 space-y-12 custom-scrollbar text-slate-700 leading-relaxed text-sm">

                    {/* Intro */}
                    <section className="bg-emerald-50 p-8 rounded-3xl border border-emerald-100">
                        <h2 className="text-xl font-black text-emerald-950 uppercase mb-4">Visão Geral</h2>
                        <p className="text-emerald-900 font-medium mb-4">
                            O <strong>Nobreza ERP</strong> é uma plataforma de gestão integrada desenvolvida pela <a href="https://zyph.co.mz" target="_blank" className="underline decoration-emerald-400 decoration-2 underline-offset-2 hover:text-emerald-700">Zyph Tech</a> especificamente para o setor farmacêutico em Moçambique.
                            Nossa missão é unificar vendas, estoque, finanças e inteligência artificial numa única interface intuitiva e moderna.
                        </p>
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 bg-white/50 p-3 rounded-xl border border-emerald-100/50">
                            <Shield size={16} />
                            <span>Privacidade Garantida: Os dados de cada farmácia são armazenados em bancos de dados isolados, garantindo que nenhuma outra empresa tenha acesso às suas informações.</span>
                        </div>
                    </section>

                    {/* Modules Structure */}
                    <section>
                        <h2 className="text-lg font-black text-slate-900 uppercase mb-6 flex items-center gap-2">
                            <Database size={20} className="text-emerald-600" /> Módulos Principais
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-6 rounded-2xl border border-slate-100 hover:shadow-lg transition-all group">
                                <h3 className="font-bold text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors">POS & Vendas</h3>
                                <p className="text-xs text-slate-500">Ponto de venda rápido, emissão de recibos e integração direta com o estoque.</p>
                            </div>
                            <div className="p-6 rounded-2xl border border-slate-100 hover:shadow-lg transition-all group">
                                <h3 className="font-bold text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors">Gestão de Estoque</h3>
                                <p className="text-xs text-slate-500">Controle de lotes, validades e entradas de produtos com dedução automática. (LIFO/FIFO)</p>
                            </div>
                            <div className="p-6 rounded-2xl border border-slate-100 hover:shadow-lg transition-all group">
                                <h3 className="font-bold text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors">Faturação & Finanças</h3>
                                <p className="text-xs text-slate-500">Emissão de faturas proforma/fiscais, contas correntes e fechos de caixa diários.</p>
                            </div>
                            <div className="p-6 rounded-2xl border border-slate-100 hover:shadow-lg transition-all group">
                                <h3 className="font-bold text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors">Nobreza AI</h3>
                                <p className="text-xs text-slate-500">Assistente inteligente para suporte, análise de vendas e previsões de stock.</p>
                            </div>
                        </div>
                    </section>

                    {/* Tech Stack (Dev) */}
                    <section>
                        <h2 className="text-lg font-black text-slate-900 uppercase mb-6 flex items-center gap-2">
                            <Code size={20} className="text-emerald-600" /> Estrutura Técnica (Dev)
                        </h2>
                        <div className="space-y-4">
                            <p>O sistema é construído sobre uma arquitetura moderna e escalável ("Modern Stack"):</p>
                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <li className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm text-blue-500"><Code size={20} /></div>
                                    <div>
                                        <p className="font-bold text-slate-900">Frontend</p>
                                        <p className="text-[10px] text-slate-500 font-mono">React + TypeScript + Vite</p>
                                    </div>
                                </li>
                                <li className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm text-emerald-500"><Database size={20} /></div>
                                    <div>
                                        <p className="font-bold text-slate-900">Backend & DB</p>
                                        <p className="text-[10px] text-slate-500 font-mono">Supabase (PostgreSQL)</p>
                                    </div>
                                </li>
                                <li className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm text-purple-500"><Cpu size={20} /></div>
                                    <div>
                                        <p className="font-bold text-slate-900">Inteligência Artificial</p>
                                        <p className="text-[10px] text-slate-500 font-mono">OpenRouter (LLMs) + Vector DB</p>
                                    </div>
                                </li>
                                <li className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm text-amber-500"><Server size={20} /></div>
                                    <div>
                                        <p className="font-bold text-slate-900">Infraestrutura</p>
                                        <p className="text-[10px] text-slate-500 font-mono">Hostinger (Node.js/Static)</p>
                                    </div>
                                </li>
                            </ul>
                        </div>
                    </section>

                    {/* Support & Release */}
                    <section>
                        <h2 className="text-lg font-black text-slate-900 uppercase mb-4 flex items-center gap-2">
                            <MessageSquare size={20} className="text-emerald-600" /> Suporte & Versão
                        </h2>
                        <div className="flex flex-col md:flex-row gap-8">
                            <div className="flex-1">
                                <p className="mb-2"><strong>Versão Atual:</strong> v2.5.0 (Build 2026)</p>
                                <p className="text-slate-500">Atualizações de segurança e funcionalidades são aplicadas automaticamente (CD/CI).</p>
                            </div>
                            <div className="flex-1 border-l border-slate-100 pl-8">
                                <p className="mb-2"><strong>Canais de Suporte:</strong></p>
                                <ul className="space-y-1 text-slate-500">
                                    <li>• Chat Integrado ("Suporte")</li>
                                    <li>• Email: suporte@nobreza.site</li>
                                    <li>• WhatsApp: Linha Corporativa</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <div className="pt-8 border-t border-slate-100">
                        <p className="text-xs text-slate-400 uppercase font-bold text-center">Zyph Tech, Lda • Engenharia de Software</p>
                    </div>

                </div>
            </div>
        </div>
    );
};
