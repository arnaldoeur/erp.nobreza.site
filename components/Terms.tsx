import React from 'react';
import { ArrowLeft, ShieldCheck, Scale, FileText } from 'lucide-react';

interface Props {
    onBack: () => void;
}

export const Terms: React.FC<Props> = ({ onBack }) => {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col h-[85vh]">

                {/* Header */}
                <div className="bg-slate-900 text-white p-8 shrink-0 flex items-center justify-between">
                    <h1 className="text-2xl font-black uppercase tracking-widest flex items-center gap-3">
                        <Scale size={28} className="text-emerald-400" /> Termos de Serviço
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
                <div className="flex-1 overflow-y-auto p-12 space-y-8 custom-scrollbar text-slate-700 leading-relaxed text-sm">
                    <section>
                        <h2 className="text-lg font-black text-slate-900 uppercase mb-4">1. Aceitação dos Termos</h2>
                        <p>Ao acessar e utilizar o sistema <strong>Nobreza ERP</strong>, licenciado pela <strong>Zyph Tech, Lda</strong>, o utilizador concorda com estes termos. Este sistema destina-se exclusivamente à gestão empresarial (farmacêutica e comercial).</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-black text-slate-900 uppercase mb-4">2. Uso do Sistema e Inteligência Artificial</h2>
                        <p>O sistema integra módulos de Inteligência Artificial (Nobreza Intelligence Hub) para análise de dados e reconhecimento de imagem.</p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li>A IA serve como <strong>ferramenta de suporte</strong> e não substitui o julgamento profissional farmacêutico ou financeiro.</li>
                            <li>A Zyph Tech não se responsabiliza por decisões tomadas exclusivamente com base em sugestões da IA (ex: Business Intelligence).</li>
                            <li>O utilizador reconhece que os textos e imagens enviados à IA são processados por modelos de terceiros (via OpenRouter) sob protocolos de segurança.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-black text-slate-900 uppercase mb-4">3. Pagamentos e Transações</h2>
                        <p>O ERP facilita o registo de pagamentos (M-Pesa, E-Mola, POS, Numerário).</p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li>O ERP regista as transações, mas o processamento financeiro real ocorre nas respectivas plataformas (Vodacom, Movitel, Bancos).</li>
                            <li>A responsabilidade pela conferência de valores e fecho de caixa é inteiramente do utilizador.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-black text-slate-900 uppercase mb-4">4. Responsabilidade e Dados</h2>
                        <p>O utilizador é responsável pela confidencialidade das suas credenciais de acesso (Email e Senha).</p>
                        <p className="mt-2">A Zyph Tech garante a integridade do software, mas não se responsabiliza por perdas decorrentes de mau uso, vírus no dispositivo do utilizador ou falhas de internet.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-black text-slate-900 uppercase mb-4">5. Suporte Técnico</h2>
                        <p>O suporte é fornecido pela equipe de IT da Zyph Tech conforme o contrato de serviço (SLA), através dos canais oficiais (Email, WhatsApp Corporativo).</p>
                    </section>

                    <div className="pt-8 border-t border-slate-100">
                        <p className="text-xs text-slate-400 uppercase font-bold text-center">Última atualização: Janeiro 2026</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
