import React, { useState } from 'react';
import { CompanyInfo } from '../types';
import { ChevronRight, Building2, MapPin, Phone, Mail, Check, Globe, Sparkles } from 'lucide-react';

interface OnboardingProps {
    onComplete: (info: CompanyInfo) => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState<CompanyInfo>({
        name: '',
        slogan: '',
        nuit: '',
        address: '',
        email: '',
        phone: '',
        website: '',
        logo: ''
    });

    const handleChange = (field: keyof CompanyInfo, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleNext = () => {
        if (step < 3) setStep(step + 1);
        else onComplete(formData);
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,_#064e3b_0%,_#020617_60%)] opacity-80" />
            <div className="absolute w-[800px] h-[800px] bg-emerald-500/10 rounded-full blur-[120px] -top-40 -left-20 animate-pulse duration-10000" />
            <div className="absolute w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[100px] bottom-0 right-0" />

            <div className="w-full max-w-5xl min-h-[700px] h-auto bg-white rounded-[2.5rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col md:flex-row relative z-10 animate-in zoom-in-95 duration-500">

                {/* Left Panel - Premium Sidebar */}
                <div className="w-full md:w-[400px] bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-white p-12 flex flex-col relative overflow-hidden shrink-0">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay"></div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

                    <div className="relative z-10 mb-12">
                        <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 border border-white/10 shadow-lg">
                            <Sparkles className="text-emerald-400" size={24} />
                        </div>
                        <h1 className="text-3xl font-black tracking-tighter leading-tight mb-4">
                            Vamos configurar <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-200">o seu ambiente</span>
                        </h1>
                        <p className="text-emerald-200/60 font-medium text-sm leading-relaxed">
                            Personalize o Nobreza ERP para refletir a identidade única do seu negócio em segundos.
                        </p>

                        <div className="mt-8 pt-8 border-t border-white/10">
                            <button
                                onClick={() => window.location.reload()}
                                className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2 hover:text-white transition-colors"
                            >
                                <Sparkles size={14} /> Já tem uma empresa? Reconectar
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 relative z-10 space-y-8">
                        <StepIndicator current={step} number={1} label="Identidade Visual" icon={Building2} />
                        <StepIndicator current={step} number={2} label="Localização & Contactos" icon={MapPin} />
                        <StepIndicator current={step} number={3} label="Revisão Final" icon={Check} />

                        {/* Connecting Line */}
                        <div className="absolute left-[19px] top-10 bottom-10 w-0.5 bg-emerald-800/50 -z-10 rounded-full" />
                    </div>

                    <div className="relative z-10 pt-8 border-t border-white/5">
                        <div className="bg-emerald-900/50 backdrop-blur-sm p-4 rounded-xl border border-emerald-500/10">
                            <p className="text-emerald-100/90 text-sm font-medium italic leading-relaxed">"Gerir com eficiência não é apenas cortar custos, é investir na inteligência do crescimento."</p>
                            <p className="text-emerald-400 text-[10px] font-black mt-3 uppercase tracking-widest">- Peter Drucker</p>
                        </div>
                    </div>
                </div>

                {/* Right Panel - Form Area */}
                <div className="flex-1 bg-white p-12 md:p-16 flex flex-col relative">
                    <div className="absolute top-0 right-0 w-full h-2 bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500" />

                    <div className="flex-1 flex flex-col justify-center max-w-lg mx-auto w-full">
                        {step === 1 && (
                            <div className="space-y-8 animate-in slide-in-from-right-8 fade-in duration-500">
                                <div>
                                    <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Quem é a sua empresa?</h2>
                                    <p className="text-slate-400 font-medium">Defina o nome e os dados fiscais.</p>
                                </div>
                                <div className="space-y-5">
                                    <InputGroup label="Nome Oficial da Empresa" value={formData.name} onChange={(e: any) => handleChange('name', e.target.value)} placeholder="Ex: Farmácia Central Lda." autoFocus />
                                    <InputGroup label="Slogan Comercial (Opcional)" value={formData.slogan} onChange={(e: any) => handleChange('slogan', e.target.value)} placeholder="Ex: Cuidando de ti..." />
                                    <InputGroup label="NUIT / Identificação Fiscal" value={formData.nuit} onChange={(e: any) => handleChange('nuit', e.target.value)} placeholder="000 000 000" icon={Check} />
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-8 animate-in slide-in-from-right-8 fade-in duration-500">
                                <div>
                                    <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Onde podemos encontrar?</h2>
                                    <p className="text-slate-400 font-medium">Canais de comunicação para os documentos.</p>
                                </div>
                                <div className="space-y-5">
                                    <InputGroup label="Endereço Físico Principal" value={formData.address} onChange={(e: any) => handleChange('address', e.target.value)} placeholder="Av. 24 de Julho, Maputo" icon={MapPin} autoFocus />
                                    <div className="grid grid-cols-2 gap-5">
                                        <InputGroup label="Email Corporativo" value={formData.email} onChange={(e: any) => handleChange('email', e.target.value)} placeholder="contato@empresa.co.mz" icon={Mail} />
                                        <InputGroup label="Telefone / Celular" value={formData.phone} onChange={(e: any) => handleChange('phone', e.target.value)} placeholder="+258 84 000 0000" icon={Phone} />
                                    </div>
                                    <InputGroup label="Website (Opcional)" value={formData.website} onChange={(e: any) => handleChange('website', e.target.value)} placeholder="www.suaempresa.co.mz" icon={Globe} />
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-8 animate-in slide-in-from-right-8 fade-in duration-500">
                                <div>
                                    <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Tudo parece correcto?</h2>
                                    <p className="text-slate-400 font-medium">Revise as informações antes de finalizar.</p>
                                </div>

                                <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 relative group overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-400 to-teal-500"></div>
                                    <div className="space-y-6 relative z-10">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Empresa</p>
                                            <p className="text-2xl font-black text-emerald-950">{formData.name || 'Nome não definido'}</p>
                                            <p className="text-sm font-medium text-emerald-600/60 italic">{formData.slogan}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-8">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fiscal (NUIT)</p>
                                                <p className="text-sm font-bold text-slate-700">{formData.nuit || '---'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Localização</p>
                                                <p className="text-sm font-bold text-slate-700">{formData.address || '---'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Email</p>
                                                <p className="text-sm font-bold text-slate-700">{formData.email || '---'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Telefone</p>
                                                <p className="text-sm font-bold text-slate-700">{formData.phone || '---'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-xs text-center text-slate-400 font-medium">Ao concluir, você concorda com os termos de uso do software.</p>
                            </div>
                        )}
                    </div>

                    <div className="mt-8 flex justify-between items-center pt-8 border-t border-dashed border-slate-200">
                        {step > 1 ? (
                            <button onClick={() => setStep(step - 1)} className="text-slate-400 hover:text-emerald-600 font-black text-xs uppercase tracking-widest transition-colors px-6 py-4 rounded-xl hover:bg-emerald-50">
                                Voltar
                            </button>
                        ) : <div></div>}

                        <button
                            onClick={handleNext}
                            disabled={step === 1 && !formData.name}
                            className="bg-emerald-950 text-white pl-8 pr-6 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-emerald-900 active:scale-95 transition-all shadow-xl shadow-emerald-900/20 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed flex items-center gap-3 group relative overflow-hidden"
                        >
                            <span className="relative z-10">{step === 3 ? 'Finalizar Configuração' : 'Próximo Passo'}</span>
                            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors relative z-10">
                                <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                            </div>
                            {/* Button Shine */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                        </button>
                    </div>
                </div>
            </div>

            {/* Background Texture Overlay */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none mix-blend-overlay"></div>

            <div className="absolute bottom-6 left-0 w-full text-center z-20 opacity-60 hover:opacity-100 transition-opacity">
                <p className="text-emerald-200/50 text-[10px] font-bold tracking-widest uppercase">
                    Desenvolvido e licenciado por <a href="https://zyph.co.in" target="_blank" rel="noopener noreferrer" className="text-emerald-200 hover:text-white transition-colors underline-offset-4 decoration-emerald-500/50">Zyph Tech, Lda</a>
                </p>
            </div>
        </div>
    );
};

const StepIndicator = ({ current, number, label, icon: Icon }: any) => {
    const active = current >= number;
    const isCurrent = current === number;
    return (
        <div className={`flex items-center gap-5 transition-all duration-500 group cursor-default`}>
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 shadow-lg ${isCurrent ? 'bg-emerald-400 border-emerald-400 text-emerald-950 scale-110 shadow-emerald-400/20' : active ? 'bg-emerald-800 border-emerald-800 text-emerald-400' : 'border-emerald-800/30 text-emerald-800/50 bg-emerald-950/50'}`}>
                {active && !isCurrent ? <Check size={18} strokeWidth={3} /> : <span className="font-black text-sm">{number}</span>}
            </div>
            <div>
                <p className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors duration-300 ${isCurrent ? 'text-white' : active ? 'text-emerald-200' : 'text-emerald-800/50'}`}>{label}</p>
                {isCurrent && <p className="text-[9px] font-medium text-emerald-400/80 animate-pulse">Em progresso...</p>}
            </div>
        </div>
    );
};

const InputGroup = ({ label, icon: Icon, ...props }: any) => (
    <div className="space-y-2 group">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1 group-focus-within:text-emerald-600 transition-colors">{label}</label>
        <div className="relative">
            {Icon && <Icon className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors duration-300" size={20} />}
            <input
                className={`w-full ${Icon ? 'pl-14' : 'pl-6'} pr-6 py-4 bg-slate-50 border-2 border-slate-100 focus:border-emerald-500 focus:bg-white rounded-2xl outline-none font-bold text-slate-700 transition-all duration-300 placeholder-slate-300 shadow-sm focus:shadow-xl focus:shadow-emerald-500/10 text-sm`}
                {...props}
            />
        </div>
    </div>
);
