import React from 'react';
import { ArrowLeft, ShieldCheck, Lock, Eye, Database, Server } from 'lucide-react';

interface Props {
    onBack: () => void;
}

export const Privacy: React.FC<Props> = ({ onBack }) => {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col h-[85vh]">

                {/* Header */}
                <div className="bg-emerald-950 text-white p-8 shrink-0 flex items-center justify-between">
                    <h1 className="text-2xl font-black uppercase tracking-widest flex items-center gap-3">
                        <ShieldCheck size={28} className="text-emerald-400" /> Política de Privacidade
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
                        <h2 className="text-lg font-black text-emerald-950 uppercase mb-4 flex items-center gap-2">
                            <Database size={20} className="text-emerald-600" /> 1. Coleta de Dados
                        </h2>
                        <p>O <strong>Nobreza ERP</strong> coleta e processa os seguintes dados para o funcionamento do sistema:</p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li><strong>Dados da Empresa:</strong> Nome, NUIT, Endereço, Logotipos.</li>
                            <li><strong>Dados Comerciais:</strong> Histórico de Vendas, Produtos, Preços, Fornecedores.</li>
                            <li><strong>Dados de Clientes:</strong> Nome, Contacto, NUIT (para fins de faturação).</li>
                            <li><strong>Dados de Usuários:</strong> Nome, Email, Senha (criptografada), Registos de Ações (Logs).</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-black text-emerald-950 uppercase mb-4 flex items-center gap-2">
                            <Server size={20} className="text-emerald-600" /> 2. Armazenamento e Segurança
                        </h2>
                        <p>Todos os dados são armazenados na infraestrutura segura do <strong>Supabase</strong> (PostgreSQL), com criptografia em trânsito e em repouso. A Zyph Tech, Lda aplica medidas rigorosas para proteger contra acesso não autorizado, alteração ou destruição de dados.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-black text-emerald-950 uppercase mb-4 flex items-center gap-2">
                            <Eye size={20} className="text-emerald-600" /> 3. Inteligência Artificial (Nobreza Intel)
                        </h2>
                        <p>Para fornecer funcionalidades de IA (Business Intelligence, Visão Computacional, Suporte Dev), certos dados (contexto de vendas, imagens enviadas) são partilhados com provedores de modelos de IA via <strong>OpenRouter</strong>.</p>
                        <p className="mt-2 text-xs font-bold bg-emerald-50 p-3 rounded-lg border border-emerald-100 text-emerald-800">
                            Nota: Os dados enviados são anonimizados onde possível e usados apenas para gerar a resposta solicitada na sessão atual.
                        </p>
                        <p>Apenas utilizadores autorizados da sua empresa têm acesso aos dados operacionais. A equipa de suporte da Zyph Tech, Lda apenas acederá aos dados mediante solicitação expressa para resolução de problemas técnicos.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-black text-emerald-950 uppercase mb-4 flex items-center gap-2">
                            <Lock size={20} className="text-emerald-600" /> 4. Compartilhamento
                        </h2>
                        <p>Os dados da sua farmácia <strong>nunca</strong> são vendidos a terceiros. O compartilhamento ocorre apenas:</p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li>Com provedores de serviço essenciais (Hospedagem, Banco de Dados, IA).</li>
                            <li>Se exigido por lei ou autoridades competentes.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-black text-emerald-950 uppercase mb-4">5. Seus Direitos</h2>
                        <p>Como titular dos dados, você tem direito a acessar, corrigir ou solicitar a exclusão de seus dados pessoais. Para exercer estes direitos, contacte a equipe de suporte.</p>
                    </section>

                    <div className="pt-8 border-t border-slate-100">
                        <p className="text-xs text-slate-400 uppercase font-bold text-center">Zyph Tech, Lda • Maputo, Moçambique</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
