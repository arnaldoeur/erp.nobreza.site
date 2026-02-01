
import React, { useState } from 'react';
import { AuthService } from '../services/auth.service';
import { supabase } from '../services/supabase';
import { User } from '../types';
import { Lock, Mail, Loader2, AlertCircle, ArrowRight, ShieldCheck, UserPlus, HelpCircle, ArrowLeft, Building2, Phone, MapPin, FileText, User as UserIcon } from 'lucide-react';
import { Privacy } from './Privacy';
import { Terms } from './Terms';
import { Documentation } from './Documentation';

interface LoginProps {
    onLoginSuccess: (user: User) => void;
}

type ViewState = 'LOGIN' | 'REGISTER' | 'RECOVERY' | 'SUPPORT' | 'ACTIVATE' | 'PRIVACY' | 'TERMS' | 'DOCS';

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
    const [view, setView] = useState<ViewState>('LOGIN');
    const [registerStep, setRegisterStep] = useState(1);

    // Form States
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [activateName, setActivateName] = useState('');

    // Register States
    const [regName, setRegName] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPassword, setRegPassword] = useState('');

    const [companyName, setCompanyName] = useState('');
    const [companyNuit, setCompanyNuit] = useState('');
    const [companyPhone, setCompanyPhone] = useState('');
    const [companyAddress, setCompanyAddress] = useState('');

    // Support State
    const [supportName, setSupportName] = useState('');
    const [supportEmail, setSupportEmail] = useState(''); // Could reuse but kept separate for clarity logic
    const [supportMessage, setSupportMessage] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const resetForm = () => {
        setError(null);
        setSuccess(null);
        setLoading(false);
        setRegisterStep(1);
        // Optional: clear fields? standard practice usually keeps them for UX unless confirmed success
    };

    if (view === 'PRIVACY') return <Privacy onBack={() => setView('LOGIN')} />;
    if (view === 'TERMS') return <Terms onBack={() => setView('LOGIN')} />;
    if (view === 'DOCS') return <Documentation onBack={() => setView('LOGIN')} />;

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const user = await AuthService.login(email, password);
            onLoginSuccess(user);
        } catch (err: any) {
            setError(err.message || 'Falha ao iniciar sessão.');
        } finally {
            setLoading(false);
        }
    };

    const handleRegisterNext = (e: React.FormEvent) => {
        e.preventDefault();
        // Basic validation for Step 1
        if (!regName || !regEmail || !regPassword) {
            setError("Preencha todos os campos do utilizador.");
            return;
        }
        setError(null);
        setRegisterStep(2);
    };

    const handleRegisterSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            if (!companyName) throw new Error("Nome da Farmácia é obrigatório.");

            const userData = { name: regName, email: regEmail };
            const companyData = {
                name: companyName,
                nuit: companyNuit,
                phone: companyPhone,
                address: companyAddress
            };

            const user = await AuthService.register(userData, regPassword, companyData);
            onLoginSuccess(user);
        } catch (err: any) {
            setError(err.message || 'Erro ao criar conta.');
        } finally {
            setLoading(false);
        }
    };

    const handleRecovery = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await AuthService.resetPassword(email);
            setSuccess(`Email de recuperação enviado para ${email}! Verifique a sua caixa de entrada.`);
        } catch (err: any) {
            setError(err.message || 'Erro ao enviar email de recuperação.');
        } finally {
            setLoading(false);
        }
    };

    const handleActivate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await AuthService.activateAccount(email, password, activateName);
            setSuccess('Conta ativada com sucesso! Agora pode fazer o seu primeiro acesso.');
            setView('LOGIN');
        } catch (err: any) {
            setError(err.message || 'Erro ao ativar conta.');
        } finally {
            setLoading(false);
        }
    };

    const handleSupport = (e: React.FormEvent) => {
        e.preventDefault();
        const subject = encodeURIComponent("Suporte Nobreza ERP - Ajuda");
        const body = encodeURIComponent(`Nome: ${supportName}\nEmail: ${supportEmail}\n\nMensagem:\n${supportMessage}`);
        window.location.href = `mailto:suporte@nobreza.site?subject=${subject}&body=${body}`;
        setSuccess('Cliente de email aberto.');
    };

    return (
        <div className="min-h-screen relative flex items-center justify-center overflow-hidden">
            {/* Background with Image and Overlay */}
            <div
                className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-transform duration-[20s] hover:scale-105"
                style={{ backgroundImage: 'url("/login-bg.png")' }}
            >
                <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-[2px]"></div>
                <div className="absolute inset-0 bg-gradient-to-tr from-emerald-950 via-emerald-900/50 to-teal-900/50"></div>
            </div>

            {/* Main Card */}
            <div className="relative z-10 w-full max-w-lg px-4 perspective-1000">
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-emerald-500/20">

                    {/* Header Area */}
                    <div className="relative pt-12 pb-6 px-8 text-center">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-50"></div>

                        <div className="mb-6 cursor-pointer hover:scale-105 transition-transform" onClick={() => { setView('LOGIN'); resetForm(); }}>
                            <img
                                src="/nobreza_erp_logo_white_horizontal.png"
                                alt="Nobreza"
                                className="h-24 w-auto mx-auto object-contain"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.parentElement!.innerHTML = '<span class="text-3xl">💊</span>';
                                }}
                            />
                        </div>

                        <h1 className="text-3xl font-black text-white tracking-tight mb-2">
                            {view === 'LOGIN' && 'Bem-vindo'}
                            {view === 'REGISTER' && (registerStep === 1 ? 'Criar Conta' : 'Dados da Farmácia')}
                            {view === 'RECOVERY' && 'Recuperar Acesso'}
                            {view === 'SUPPORT' && 'Suporte Técnico'}
                        </h1>
                        <p className="text-emerald-100/70 text-sm font-medium tracking-wide">NOBREZA ERP • GESTÃO INTELIGENTE</p>
                    </div>

                    {/* Form Area */}
                    <div className="p-8 pt-2">

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-4 rounded-xl flex items-center gap-3 text-sm animate-in slide-in-from-top-2 backdrop-blur-md mb-6">
                                <AlertCircle size={18} className="shrink-0 text-red-400" />
                                <span>{error}</span>
                            </div>
                        )}
                        {success && (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 p-4 rounded-xl flex items-center gap-3 text-sm animate-in slide-in-from-top-2 backdrop-blur-md mb-6">
                                <ShieldCheck size={18} className="shrink-0 text-emerald-400" />
                                <span>{success}</span>
                            </div>
                        )}

                        {/* LOGIN FORM */}
                        {view === 'LOGIN' && (
                            <form onSubmit={handleLogin} className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="space-y-1.5 group">
                                    <label className="text-[10px] font-black text-emerald-300 uppercase tracking-widest ml-1">Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-3.5 h-5 w-5 text-emerald-400/60" />
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="block w-full pl-11 pr-4 py-3.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-medium"
                                            placeholder="exemplo@nobreza.site"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5 group">
                                    <label className="text-[10px] font-black text-emerald-300 uppercase tracking-widest ml-1">Palavra-passe</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-3.5 h-5 w-5 text-emerald-400/60" />
                                        <input
                                            type="password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="block w-full pl-11 pr-4 py-3.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-medium"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                                <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mt-4 hover:scale-[1.02]">
                                    {loading ? <Loader2 className="animate-spin" /> : <><span>Entrar</span><ArrowRight size={18} /></>}
                                </button>
                            </form>
                        )}

                        {/* REGISTER FORM */}
                        {view === 'REGISTER' && (
                            <form onSubmit={registerStep === 1 ? handleRegisterNext : handleRegisterSubmit} className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                                {registerStep === 1 ? (
                                    <>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-emerald-300 uppercase tracking-widest ml-1">Seu Nome Completo</label>
                                            <div className="relative">
                                                <UserIcon className="absolute left-4 top-3.5 h-5 w-5 text-emerald-400/60" />
                                                <input type="text" required value={regName} onChange={(e) => setRegName(e.target.value)} className="block w-full pl-11 pr-4 py-3.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-medium" placeholder="João da Silva" />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-emerald-300 uppercase tracking-widest ml-1">Email de Acesso</label>
                                            <div className="relative">
                                                <Mail className="absolute left-4 top-3.5 h-5 w-5 text-emerald-400/60" />
                                                <input type="email" required value={regEmail} onChange={(e) => setRegEmail(e.target.value)} className="block w-full pl-11 pr-4 py-3.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-medium" placeholder="admin@farmacia.com" />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-emerald-300 uppercase tracking-widest ml-1">Definir Palavra-passe</label>
                                            <div className="relative">
                                                <Lock className="absolute left-4 top-3.5 h-5 w-5 text-emerald-400/60" />
                                                <input type="password" required value={regPassword} onChange={(e) => setRegPassword(e.target.value)} className="block w-full pl-11 pr-4 py-3.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-medium" placeholder="••••••••" />
                                            </div>
                                        </div>
                                        <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mt-4 hover:scale-[1.02]">
                                            <span>Continuar</span><ArrowRight size={18} />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-emerald-300 uppercase tracking-widest ml-1">Nome da Farmácia</label>
                                            <div className="relative">
                                                <Building2 className="absolute left-4 top-3.5 h-5 w-5 text-emerald-400/60" />
                                                <input type="text" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="block w-full pl-11 pr-4 py-3.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-medium" placeholder="Farmácia Central" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-emerald-300 uppercase tracking-widest ml-1">NUIT</label>
                                                <div className="relative">
                                                    <FileText className="absolute left-4 top-3.5 h-5 w-5 text-emerald-400/60" />
                                                    <input type="text" value={companyNuit} onChange={(e) => setCompanyNuit(e.target.value)} className="block w-full pl-11 pr-4 py-3.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-medium" placeholder="123456789" />
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-emerald-300 uppercase tracking-widest ml-1">Telefone</label>
                                                <div className="relative">
                                                    <Phone className="absolute left-4 top-3.5 h-5 w-5 text-emerald-400/60" />
                                                    <input type="text" value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} className="block w-full pl-11 pr-4 py-3.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-medium" placeholder="+258 84..." />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-emerald-300 uppercase tracking-widest ml-1">Endereço (Sede)</label>
                                            <div className="relative">
                                                <MapPin className="absolute left-4 top-3.5 h-5 w-5 text-emerald-400/60" />
                                                <input type="text" value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} className="block w-full pl-11 pr-4 py-3.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-medium" placeholder="Av. Eduardo Mondlane..." />
                                            </div>
                                        </div>
                                        <div className="flex gap-3 mt-4">
                                            <button type="button" onClick={() => setRegisterStep(1)} className="w-1/3 bg-white/10 hover:bg-white/20 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2">
                                                <ArrowLeft size={18} />
                                            </button>
                                            <button type="submit" disabled={loading} className="w-2/3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 hover:scale-[1.02]">
                                                {loading ? <Loader2 className="animate-spin" /> : <><span>Finalizar Registo</span><UserPlus size={18} /></>}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </form>
                        )}

                        {/* RECOVERY FORM */}
                        {view === 'RECOVERY' && (
                            <form onSubmit={handleRecovery} className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                                <p className="text-sm text-emerald-100/80 text-center mb-4">Insira o seu email para receber um link de redefinição de palavra-passe.</p>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-emerald-300 uppercase tracking-widest ml-1">Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-3.5 h-5 w-5 text-emerald-400/60" />
                                        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="block w-full pl-11 pr-4 py-3.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-medium" placeholder="exemplo@nobreza.site" />
                                    </div>
                                </div>
                                <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mt-4 hover:scale-[1.02]">
                                    {loading ? <Loader2 className="animate-spin" /> : <><span>Recuperar</span><Mail size={18} /></>}
                                </button>
                            </form>
                        )}

                        {/* ACTIVATE FORM */}
                        {view === 'ACTIVATE' && (
                            <form onSubmit={handleActivate} className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300 text-left">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-emerald-300 uppercase tracking-widest ml-1">Seu Nome Completo</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors">
                                            <UserIcon size={18} className="text-white/20 group-focus-within:text-emerald-400" />
                                        </div>
                                        <input type="text" required value={activateName} onChange={(e) => setActivateName(e.target.value)} className="block w-full pl-11 pr-4 py-3.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-medium" placeholder="Ex: Eugénio Daqui" />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-emerald-300 uppercase tracking-widest ml-1">E-mail Corporativo</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors">
                                            <Mail size={18} className="text-white/20 group-focus-within:text-emerald-400" />
                                        </div>
                                        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="block w-full pl-11 pr-4 py-3.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-medium" placeholder="nome@farmacianobreza.com" />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-emerald-300 uppercase tracking-widest ml-1">Escolher Palavra-passe</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors">
                                            <Lock size={18} className="text-white/20 group-focus-within:text-emerald-400" />
                                        </div>
                                        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="block w-full pl-11 pr-4 py-3.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-medium" placeholder="••••••••" />
                                    </div>
                                </div>
                                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mt-4 hover:scale-[1.02]">
                                    {loading ? <Loader2 className="animate-spin" /> : <><span>Ativar Conta</span><ShieldCheck size={18} /></>}
                                </button>
                                <p className="text-[11px] text-white/40 text-center px-4 leading-relaxed">
                                    Ao ativar, confirmamos que é um colaborador autorizado da Farmácia Nobreza.
                                </p>
                            </form>
                        )}

                        {/* SUPPORT FORM */}
                        {view === 'SUPPORT' && (
                            <form onSubmit={handleSupport} className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-emerald-300 uppercase tracking-widest ml-1">Seu Nome</label>
                                    <input type="text" required value={supportName} onChange={(e) => setSupportName(e.target.value)} className="block w-full px-4 py-3.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-medium" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-emerald-300 uppercase tracking-widest ml-1">Seu Email</label>
                                    <input type="email" required value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} className="block w-full px-4 py-3.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-medium" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-emerald-300 uppercase tracking-widest ml-1">Mensagem</label>
                                    <textarea required value={supportMessage} onChange={(e) => setSupportMessage(e.target.value)} className="block w-full px-4 py-3.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-medium h-24" placeholder="Descreva o problema..." />
                                </div>
                                <button type="submit" className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mt-4 hover:scale-[1.02]">
                                    <span>Enviar Email</span><HelpCircle size={18} />
                                </button>
                            </form>
                        )}

                        {/* Navigation Buttons */}
                        <div className="grid grid-cols-3 gap-2 mt-6 border-t border-white/10 pt-6">
                            {view !== 'REGISTER' && (
                                <button type="button" onClick={() => { setView('REGISTER'); resetForm(); }} className="px-2 py-2 text-[10px] uppercase font-bold text-emerald-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors truncate">
                                    Criar conta
                                </button>
                            )}
                            {view !== 'ACTIVATE' && (
                                <button type="button" onClick={() => { setView('ACTIVATE'); resetForm(); }} className="px-2 py-2 text-[10px] uppercase font-bold text-emerald-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors truncate">
                                    Primeiro acesso
                                </button>
                            )}
                            {view !== 'SUPPORT' && (
                                <button type="button" onClick={() => { setView('SUPPORT'); resetForm(); }} className="px-2 py-2 text-[10px] uppercase font-bold text-emerald-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors truncate">
                                    Contactar suporte
                                </button>
                            )}
                            {view !== 'LOGIN' && (
                                <button type="button" onClick={() => { setView('LOGIN'); resetForm(); }} className="px-2 py-2 text-[10px] uppercase font-bold text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors truncate col-span-3 flex items-center justify-center gap-2">
                                    <ArrowLeft size={12} /> Voltar ao Login
                                </button>
                            )}
                        </div>

                    </div>
                </div>

                {/* Footer */}
                <div className="mt-8 text-center space-y-2">
                    <p className="text-emerald-100/40 text-xs font-medium">
                        Desenvolvido por <a href="https://zyph.tech" target="_blank" rel="noreferrer" className="text-white font-bold hover:text-emerald-300 transition-colors cursor-pointer">Zyph Tech</a>
                    </p>
                    <div className="flex items-center justify-center gap-4 text-[10px] text-emerald-100/30 uppercase font-bold tracking-widest">
                        <span onClick={() => setView('PRIVACY')} className="hover:text-white cursor-pointer transition-colors">Privacidade</span>
                        <span>•</span>
                        <span onClick={() => setView('TERMS')} className="hover:text-white cursor-pointer transition-colors">Termos</span>
                        <span>•</span>
                        <span onClick={() => setView('DOCS')} className="hover:text-white cursor-pointer transition-colors">Docs & Sistema</span>
                    </div>
                    <p className="text-emerald-100/20 text-[10px] mt-2">v2.5.0 (Build 2026)</p>
                </div>
            </div>
        </div>
    );
};
