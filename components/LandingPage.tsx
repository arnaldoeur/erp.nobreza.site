
import React, { useEffect, useState, useRef } from 'react';
import {
    ArrowRight,
    ShieldCheck,
    Activity,
    Zap,
    BarChart3,
    Boxes,
    FlaskConical,
    Factory,
    ChevronRight,
    Database,
    Lock,
    Globe,
    X,
    ChevronLeft,
    Maximize2,
    LayoutDashboard,
    ShoppingCart,
    CheckSquare,
    MessageSquare,
    Calendar,
    Truck,
    Users,
    LineChart,
    Target,
    Quote,
    Star,
    ExternalLink,
    Info
} from 'lucide-react';

interface LandingPageProps {
    onEnter: () => void;
}

const SYSTEM_SCREENS = [
    { id: 'dashboard', img: '/telas nobreza erp/tela 1.png', icon: <LayoutDashboard />, title: 'Dashboard principal', desc: 'A visão de comando da sua farmácia. Tudo sob controle.', longDesc: 'Aceda de imediato aos dados mais importantes. Visualize o total de vendas do dia, o valor em caixa, alertas de stock e o desempenho das suas filiais num relance profissional e intuitivo.' },
    { id: 'performance', img: '/telas nobreza erp/tela 10.png', icon: <Target />, title: 'Análise de performance', desc: 'Dados reais para decisões de crescimento seguro.', longDesc: 'Transforme dados em estratégia. Acompanhe gráficos de rentabilidade, metas mensais e identifique rapidamente quais são os produtos e horários de maior lucro para o seu negócio.' },
    { id: 'sales', img: '/telas nobreza erp/tela 2.png', icon: <ShoppingCart />, title: 'Venda rápida (POS)', desc: 'Atendimento instantâneo que encanta o cliente.', longDesc: 'O nosso Ponto de Venda é ultra-rápido. Com pesquisa inteligente e integração total com leitores de código de barras, garante que nunca perde uma venda por demora no balcão.' },
    { id: 'billing', img: '/telas nobreza erp/tela 11.png', icon: <ShieldCheck />, title: 'Faturação certificada', desc: 'Emissões fiscais em segundos, sem complicações.', longDesc: 'Gere FTs, PCs e guias seguindo todas as normas da Autoridade Tributária de Moçambique. O sistema automatiza o processo de faturação para que se foque no que realmente importa: gerir.' },
    { id: 'tasks', img: '/telas nobreza erp/tela 4.png', icon: <CheckSquare />, title: 'Controle de tarefas', desc: 'Trabalho de equipa organizado e produtivo.', longDesc: 'Distribua responsabilidades e acompanhe o estado de cada tarefa em tempo real. Garanta que a sua equipa administrativa e de balcão está sempre sincronizada e eficiente.' },
    { id: 'calendar', img: '/telas nobreza erp/tela 5.png', icon: <Calendar />, title: 'Agenda & serviços', desc: 'Nunca perca um compromisso com a saúde.', longDesc: 'Organize consultas farmacêuticas, levantamentos programados e rotinas de manutenção. Com notificações automáticas, a sua farmácia torna-se um centro de saúde organizado.' },
    { id: 'chat', img: '/telas nobreza erp/tela 17.png', icon: <MessageSquare />, title: 'Chat de negócio', desc: 'Comunicação segura e privada entre a sua equipa.', longDesc: 'Discuta reposições de stock, trocas de turno ou dúvidas sobre receitas num ambiente seguro. O chat integrado mantém toda a comunicação profissional dentro do ERP.' },
    { id: 'closure', img: '/telas nobreza erp/tela 21.png', icon: <Lock />, title: 'Relatórios de fecho', desc: 'Segurança financeira absoluta ao fim do dia.', longDesc: 'O fecho de caixa é um processo simples e à prova de erro. Receba relatórios automáticos detalhando formas de pagamento, trocos e totais de faturação de cada unidade.' },
    { id: 'team', img: '/telas nobreza erp/tela 14.png', icon: <Users />, title: 'Gestão de capital humano', desc: 'Controle de acessos e produtividade da equipa.', longDesc: 'Gira turnos, faltas e níveis de acesso ao sistema de forma rigorosa. Proteja a informação sensível da sua farmácia garantindo que cada colaborador acede apenas ao necessário.' }
];

const TESTIMONIALS = [
    { name: 'Dr. Eugénio Daqui', role: 'Diretor Técnico, Farmácia Nobreza', text: 'O Nobreza ERP transformou a nossa operação. O controlo de stock e a facilidade de faturação são impressionantes. Recomendo vivamente.', rating: 5 },
    { name: 'Dra. Maria Sambo', role: 'Proprietária, Farmácia Central', text: 'Finalmente um sistema que entende o mercado moçambicano. A Assistência da Zyph Tech é de excelência.', rating: 5 },
    { name: 'Dr. Ricardo Matsinhe', role: 'Gestor, Farmácia Saúde Viva', text: 'A análise de performance ajudou-nos a identificar produtos com baixa rotação e otimizar o nosso capital.', rating: 5 },
    { name: 'Dra. Ana Paula', role: 'Farmacêutica, Farmácia Moderna', text: 'O POS é muito intuitivo. A minha equipa adaptou-se em menos de um dia. É uma ferramenta de trabalho indispensável.', rating: 5 },
    { name: 'Dr. Carlos Moiane', role: 'Administrador, Grupo Bio-Saúde', text: 'Gerir várias unidades com o Nobreza ERP tornou-se simples. A visão consolidada do negócio é vital.', rating: 5 },
    { name: 'Dra. Sofia Tembe', role: 'Diretora, Farmácia Vida', text: 'A integração com a AT e a geração de guias automatizada poupam-nos horas de trabalho administrativo todas as semanas.', rating: 5 }
];

export const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
    const [scrolled, setScrolled] = useState(false);
    const [activeScreenIndex, setActiveScreenIndex] = useState<number | null>(null);
    const [detailModule, setDetailModule] = useState<typeof SYSTEM_SCREENS[0] | null>(null);
    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const openLightbox = (index: number) => setActiveScreenIndex(index);
    const closeLightbox = () => setActiveScreenIndex(null);
    const nextScreen = () => setActiveScreenIndex((prev) => (prev === null ? null : (prev + 1) % SYSTEM_SCREENS.length));
    const prevScreen = () => setActiveScreenIndex((prev) => (prev === null ? null : (prev - 1 + SYSTEM_SCREENS.length) % SYSTEM_SCREENS.length));

    return (
        <div className="min-h-screen bg-slate-950 text-white selection:bg-emerald-500/30 selection:text-emerald-400 font-['Inter',sans-serif] overflow-x-hidden antialiased scroll-smooth">
            {/* Lightbox Section */}
            {activeScreenIndex !== null && (
                <div className="fixed inset-0 z-[1000] bg-black/98 backdrop-blur-2xl flex flex-col items-center justify-center p-4 md:p-12 animate-in fade-in duration-300">
                    <button onClick={closeLightbox} className="absolute top-8 right-8 text-white/40 hover:text-white transition-all transform hover:rotate-90 z-[1001]">
                        <X size={36} />
                    </button>

                    <button onClick={prevScreen} className="absolute left-8 top-1/2 -translate-y-1/2 text-white/20 hover:text-emerald-500 transition-all z-[1001]">
                        <ChevronLeft size={64} strokeWidth={1} />
                    </button>

                    <button onClick={nextScreen} className="absolute right-8 top-1/2 -translate-y-1/2 text-white/20 hover:text-emerald-500 transition-all z-[1001]">
                        <ChevronRight size={64} strokeWidth={1} />
                    </button>

                    <div className="max-w-6xl w-full flex flex-col items-center">
                        <div className="relative group w-full aspect-video md:aspect-[16/10] bg-slate-900/50 rounded-2xl overflow-hidden border border-white/5 shadow-[0_0_100px_rgba(16,185,129,0.1)]">
                            <img
                                src={SYSTEM_SCREENS[activeScreenIndex].img}
                                alt={SYSTEM_SCREENS[activeScreenIndex].title}
                                className="w-full h-full object-contain"
                            />
                        </div>
                        <div className="mt-12 text-center max-w-4xl animate-slide-up">
                            <div className="flex items-center justify-center gap-3 mb-4">
                                {React.cloneElement(SYSTEM_SCREENS[activeScreenIndex].icon as React.ReactElement, { size: 40 })}
                                <h4 className="text-3xl md:text-4xl font-black text-emerald-400 tracking-tighter italic">{SYSTEM_SCREENS[activeScreenIndex].title}</h4>
                            </div>
                            <p className="text-white/60 text-lg md:text-xl font-medium leading-relaxed tracking-tight">{SYSTEM_SCREENS[activeScreenIndex].longDesc}</p>
                        </div>
                        <div className="mt-10 flex gap-4">
                            {SYSTEM_SCREENS.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setActiveScreenIndex(i)}
                                    className={`h-1.5 rounded-full transition-all duration-500 ${i === activeScreenIndex ? 'bg-emerald-500 w-12' : 'bg-white/10 w-3 hover:bg-white/30'}`}
                                ></button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Module Detail Modal */}
            {detailModule && (
                <div className="fixed inset-0 z-[1100] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-6 animate-in zoom-in duration-300">
                    <div className="max-w-4xl w-full bg-slate-900 border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl overflow-y-auto max-h-[90vh]">
                        <div className="relative h-64 bg-slate-800">
                            <img src={detailModule.img} alt={detailModule.title} className="w-full h-full object-cover opacity-40" />
                            <button onClick={() => setDetailModule(null)} className="absolute top-6 right-6 p-3 bg-black/40 hover:bg-black/60 rounded-full text-white transition-all backdrop-blur-md">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-12">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-emerald-500/30">
                                    {React.cloneElement(detailModule.icon as React.ReactElement, { size: 32 })}
                                </div>
                                <div>
                                    <h2 className="text-[12px] font-black text-emerald-500 uppercase tracking-[0.4em] mb-1">Módulo do Sistema</h2>
                                    <h3 className="text-4xl font-black tracking-tighter italic">{detailModule.title}</h3>
                                </div>
                            </div>
                            <div className="prose prose-invert max-w-none">
                                <p className="text-xl text-white/70 font-medium leading-relaxed mb-8">{detailModule.longDesc}</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
                                    <div className="bg-white/5 p-8 rounded-3xl border border-white/10">
                                        <h4 className="flex items-center gap-3 text-emerald-400 font-black uppercase text-xs tracking-widest mb-4"><Zap size={18} /> Benefício Principal</h4>
                                        <p className="text-sm text-white/50">{detailModule.desc}</p>
                                    </div>
                                    <div className="bg-white/5 p-8 rounded-3xl border border-white/10">
                                        <h4 className="flex items-center gap-3 text-emerald-400 font-black uppercase text-xs tracking-widest mb-4"><ShieldCheck size={18} /> Segurança de Dados</h4>
                                        <p className="text-sm text-white/50">Todos os dados deste módulo são encriptados e isolados por empresa.</p>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={onEnter}
                                className="mt-12 w-full py-6 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-4"
                            >
                                Experimentar Agora <ArrowRight size={24} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Technical Grid Overlay */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.05] z-[1]">
                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#10b981 1px, transparent 1px)', backgroundSize: '60px 60px' }}></div>
            </div>

            {/* Navigation */}
            <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-700 ${scrolled ? 'bg-slate-950/95 shadow-2xl backdrop-blur-2xl border-b border-white/5 py-3' : 'py-8'}`}>
                <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                    <div className="flex items-center gap-3 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                        <img src="/logo-sidebar.png" alt="Nobreza ERP" className="h-10 md:h-14 w-auto group-hover:scale-105 transition-transform duration-700" />
                    </div>

                    <div className="hidden md:flex items-center gap-12">
                        {[
                            { label: 'Início', href: '#início' },
                            { label: 'Tour', href: '#tour' },
                            { label: 'Testemunhos', href: '#testemunhos' },
                            { label: 'Benefícios', href: '#benefícios' },
                            { label: 'Contacto', href: '#contacto' }
                        ].map((item) => (
                            <a key={item.label} href={item.href} className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-emerald-400 transition-all">
                                {item.label}
                            </a>
                        ))}
                    </div>

                    <button
                        onClick={onEnter}
                        className="group relative flex items-center gap-3 bg-gradient-to-br from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 px-8 py-3 rounded-xl transition-all duration-500 shadow-2xl shadow-emerald-500/20 active:scale-95"
                    >
                        <span className="text-[11px] font-black uppercase tracking-widest">Aceder ao Portal</span>
                        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <section id="início" className="relative min-h-screen pt-40 pb-20 flex flex-col items-center justify-center overflow-hidden bg-slate-950">
                <div className="absolute inset-0 z-0 opacity-20">
                    <img
                        src="/nobreza_industrial_pharmacy_hero_1769986940114.png"
                        alt="Hero Background"
                        className="w-full h-full object-cover scale-110 animate-slow-zoom"
                    />
                    <div className="absolute inset-0 bg-slate-950/90 shadow-[inset_0_0_150px_rgba(0,0,0,1)]"></div>
                </div>

                <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
                    <div className="inline-flex items-center gap-2 px-6 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-10 animate-fade-in shadow-2xl">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                        <span className="text-[11px] font-black uppercase tracking-[0.25em] text-emerald-400">Eficiência Farmacêutica Definitiva em Moçambique</span>
                    </div>

                    <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-[0.85] mb-8 animate-slide-up italic">
                        CONTROLO TOTAL, <br />
                        <span className="text-emerald-500 text-6xl md:text-9xl">LUCRO REAL.</span>
                    </h1>

                    <p className="max-w-3xl mx-auto text-white/50 text-lg md:text-xl font-black uppercase tracking-widest mb-16 animate-slide-up animation-delay-200">
                        Gestão Inteligente de Farmácias
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-8 animate-slide-up animation-delay-400">
                        <button
                            onClick={onEnter}
                            className="w-full sm:w-auto px-12 py-6 bg-gradient-to-br from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black uppercase tracking-widest rounded-xl transition-all duration-500 shadow-2xl shadow-emerald-500/30 hover:scale-[1.05] flex items-center justify-center gap-4 active:scale-95"
                        >
                            <span className="text-lg">Começar Agora</span>
                            <ArrowRight size={24} />
                        </button>
                        <a
                            href="#tour"
                            className="w-full sm:w-auto px-12 py-6 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black uppercase tracking-widest rounded-xl transition-all duration-500 backdrop-blur-2xl text-center active:scale-95 flex items-center gap-3 justify-center"
                        >
                            <span>Tour Virtual</span>
                            <ChevronRight size={20} />
                        </a>
                    </div>
                </div>
            </section>

            {/* Feature Tour with Dynamic Timeline Scroll */}
            <section id="tour" className="py-40 bg-white text-slate-900 border-t border-slate-100 overflow-hidden font-['Inter',sans-serif] relative">

                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-32 relative">
                        <h2 className="text-xs font-black text-emerald-600 uppercase tracking-[0.4em] mb-6">Explore as Funcionalidades</h2>
                        <h3 className="text-4xl md:text-6xl font-black tracking-tighter mb-8 italic uppercase">Imerse no sistema</h3>
                    </div>

                    <div className="space-y-48 md:space-y-64 relative">
                        {SYSTEM_SCREENS.map((item, i) => (
                            <div key={i} className={`flex flex-col ${i % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} items-center gap-16 md:gap-24 group relative scroll-mt-32`}>

                                <div className="w-full lg:w-3/5 relative">
                                    {/* Browser Mockup Simulation */}
                                    <div className="relative rounded-[2.5rem] overflow-hidden bg-slate-900 border border-slate-200 shadow-[0_60px_120px_rgba(0,0,0,0.15)] group/browser hover:shadow-[0_60px_140px_rgba(16,185,129,0.15)] transition-all duration-1000">
                                        <div className="h-12 bg-slate-50 border-b border-slate-200 flex items-center px-8 gap-4">
                                            <div className="flex gap-2.5">
                                                <div className="w-3.5 h-3.5 rounded-full bg-red-400/80"></div>
                                                <div className="w-3.5 h-3.5 rounded-full bg-amber-400/80"></div>
                                                <div className="w-3.5 h-3.5 rounded-full bg-emerald-400/80"></div>
                                            </div>
                                            <div className="mx-auto w-1/2 h-6 bg-slate-100 rounded-full flex items-center px-4 border border-slate-200/50">
                                                <div className="w-2.5 h-2.5 rounded-full bg-slate-300 mr-2.5"></div>
                                                <div className="w-32 h-1.5 bg-slate-200 rounded-full"></div>
                                            </div>
                                        </div>
                                        <div
                                            onClick={() => openLightbox(i)}
                                            className="relative cursor-pointer overflow-hidden aspect-[16/10] bg-white"
                                        >
                                            <img
                                                src={item.img}
                                                alt={item.title}
                                                className="w-full h-full object-cover object-left-top transition-all duration-[2s] group-hover/browser:scale-[1.08]"
                                            />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/browser:opacity-100 transition-all duration-700 flex items-center justify-center backdrop-blur-[3px]">
                                                <div className="bg-white text-slate-950 p-8 rounded-full shadow-3xl transform scale-0 group-hover/browser:scale-100 transition-transform duration-700 rotate-12 group-hover:rotate-0">
                                                    <Maximize2 size={40} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="w-full lg:w-2/5 flex flex-col items-start translate-y-0 group-hover:-translate-y-6 transition-all duration-1000 pr-4">
                                    <div className="w-20 h-20 bg-emerald-500 rounded-[1.5rem] flex items-center justify-center text-white font-black text-2xl mb-10 shadow-3xl shadow-emerald-500/40 transform group-hover:rotate-12 transition-transform duration-700">
                                        {React.cloneElement(item.icon as React.ReactElement, { size: 40 })}
                                    </div>
                                    <h4 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-950 italic tracking-tight leading-none mb-6">{item.title}</h4>
                                    <h5 className="text-2xl font-bold text-emerald-600 mb-8 tracking-tight leading-snug">{item.desc}</h5>
                                    <p className="text-xl text-slate-500 leading-relaxed font-medium tracking-tight">
                                        {item.longDesc}
                                    </p>
                                    <button
                                        onClick={() => setDetailModule(item)}
                                        className="mt-12 flex items-center gap-4 text-sm font-black uppercase tracking-[0.4em] text-slate-950 hover:text-emerald-600 transition-all group-hover:gap-8"
                                    >
                                        Explorar engenharia do módulo <ChevronRight size={20} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-56 text-center">
                        <button
                            onClick={() => openLightbox(0)}
                            className="px-14 py-7 bg-slate-950 text-white font-black uppercase tracking-[0.4em] rounded-2xl hover:bg-emerald-600 transition-all shadow-[0_30px_60px_rgba(0,0,0,0.2)] flex items-center gap-4 mx-auto active:scale-95 group"
                        >
                            Ver galeria de telas <Boxes size={24} className="group-hover:rotate-12 transition-transform" />
                        </button>
                    </div>
                </div>
            </section>

            {/* Testimonials Section */}
            <section id="testemunhos" className="py-40 bg-slate-950 relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-24">
                        <h2 className="text-xs font-black text-emerald-500 uppercase tracking-[0.4em] mb-6">Confiança de quem usa</h2>
                        <h3 className="text-4xl md:text-6xl font-black tracking-tighter mb-8 italic uppercase text-white">O que dizem os nossos parceiros</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {TESTIMONIALS.map((t, i) => (
                            <div key={i} className="group bg-white/5 border border-white/10 p-10 rounded-[2.5rem] hover:bg-white/10 hover:border-emerald-500/30 transition-all duration-700 relative">
                                <Quote className="absolute top-8 right-8 text-white/5 group-hover:text-emerald-500/20 transition-colors" size={64} strokeWidth={1} />
                                <div className="flex gap-1 mb-6">
                                    {[...Array(t.rating)].map((_, j) => <Star key={j} size={16} className="fill-emerald-500 text-emerald-500" />)}
                                </div>
                                <p className="text-lg text-white/70 italic font-medium leading-relaxed mb-8 relative z-10">"{t.text}"</p>
                                <div className="mt-auto">
                                    <h4 className="font-black text-white text-lg tracking-tight uppercase leading-none mb-1">{t.name}</h4>
                                    <span className="text-emerald-500 text-[10px] font-black uppercase tracking-widest">{t.role}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Target Audience Section */}
            <section id="benefícios" className="py-40 relative bg-emerald-950 border-t border-emerald-900 overflow-hidden">
                <div className="max-w-7xl mx-auto px-6 text-center mb-24">
                    <h2 className="text-[14px] font-black text-emerald-400 uppercase tracking-[0.5em] mb-6">Eficiência de alto nível</h2>
                    <h3 className="text-4xl md:text-6xl font-black leading-tight tracking-tighter uppercase italic">
                        A mudança que a sua <br />
                        <span className="text-emerald-500 underline decoration-emerald-500/30 underline-offset-8">gestão pede.</span>
                    </h3>
                </div>

                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-32 items-center">
                        <div className="space-y-12">
                            {[
                                { icon: <Activity />, title: 'Para donos e sócios', desc: 'Controle de lucros, previsões de stock e performance financeira total.' },
                                { icon: <Factory />, title: 'Diretores técnicos', desc: 'Gestão hospitalar completa, de inventários a turnos de equipa especializada.' },
                                { icon: <FlaskConical />, title: 'Gestores operacionais', desc: 'Saiba exatamente o que comprar e quando comprar com previsão inteligente.' }
                            ].map((box, i) => {
                                const id = box.title.toLowerCase().replace(/ /g, '-');
                                return (
                                    <div key={i} className="flex gap-8 group cursor-default">
                                        <div className="shrink-0 w-16 h-16 bg-white/5 border border-white/10 flex items-center justify-center rounded-[2rem] text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-700 shadow-2xl">
                                            {React.cloneElement(box.icon as React.ReactElement, { size: 32 })}
                                        </div>
                                        <div>
                                            <h4 className="font-black text-2xl mb-2 uppercase tracking-tight italic">{box.title}</h4>
                                            <p className="text-white/30 text-lg leading-relaxed font-medium tracking-tight">{box.desc}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="relative">
                            <div className="aspect-square bg-white/5 border border-white/10 rounded-[4rem] relative overflow-hidden group shadow-[0_0_150px_rgba(16,185,129,0.1)]">
                                <img
                                    src="/telas nobreza erp/tela 13.png"
                                    alt="Feature Preview"
                                    className="w-full h-full object-cover grayscale opacity-20 group-hover:grayscale-0 group-hover:opacity-60 transition-all duration-1000 scale-110 group-hover:scale-100"
                                />
                                <div className="absolute inset-x-12 bottom-12 p-12 bg-slate-950/95 backdrop-blur-3xl border border-white/5 rounded-3xl shadow-3xl">
                                    <div className="text-[12px] font-black text-emerald-500 uppercase tracking-[0.4em] mb-4">Módulo de gestão</div>
                                    <div className="text-3xl font-black mb-8 tracking-tighter uppercase italic leading-tight">Domine cada detalhe do seu negócio agora.</div>
                                    <button onClick={onEnter} className="flex items-center gap-4 text-emerald-400 font-black text-sm uppercase tracking-[0.3em] group/btn">
                                        Entrar no sistema <ArrowRight size={20} className="group-hover/btn:translate-x-2 transition-transform" />
                                    </button>
                                </div>
                            </div>
                            <div className="absolute -top-16 -right-16 w-64 h-64 border-r-4 border-t-4 border-emerald-500/10 rounded-tr-[5rem]"></div>
                            <div className="absolute -bottom-16 -left-16 w-64 h-64 border-l-4 border-b-4 border-emerald-500/10 rounded-bl-[5rem]"></div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Metrics Section */}
            <section className="py-32 border-t border-b border-white/5 bg-slate-950">
                <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 lg:grid-cols-4 gap-20 text-center">
                    {[
                        { label: 'Farmácias ativas', value: '50+' },
                        { label: 'Utilizadores ativos', value: '150+' },
                        { label: 'Taxa de satisfação', value: '98%' },
                        { label: 'Cobertura nacional', value: '100%' }
                    ].map((stat, i) => (
                        <div key={i} className="group">
                            <div className="text-[12px] font-black text-white/20 uppercase tracking-[0.5em] mb-6">{stat.label}</div>
                            <div className="text-4xl md:text-7xl font-black text-white group-hover:text-emerald-500 transition-colors duration-700 tracking-tighter italic">{stat.value}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Contact Section */}
            <section id="contacto" className="py-40 relative bg-white text-slate-900 overflow-hidden font-['Inter',sans-serif]">
                <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-50">
                    <div className="absolute -top-40 -right-40 w-[800px] h-[800px] bg-emerald-50 rounded-full blur-[150px]"></div>
                    <div className="absolute -bottom-40 -left-40 w-[800px] h-[800px] bg-teal-50 rounded-full blur-[150px]"></div>
                </div>

                <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
                    <h2 className="text-sm font-black text-emerald-600 uppercase tracking-[0.4em] mb-8">O futuro começa aqui</h2>
                    <h3 className="text-4xl md:text-7xl font-black tracking-tighter mb-16 text-slate-950 uppercase italic leading-[0.85]">VAMOS MODERNIZAR A <br /><span className="text-emerald-600">SUA FARMÁCIA?</span></h3>

                    <div className="bg-slate-950 border border-slate-900 p-10 md:p-16 rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.3)] relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12 relative z-10">
                            <div className="space-y-4 text-left">
                                <label className="text-[12px] font-black text-emerald-500 uppercase tracking-[0.3em] ml-2">E-mail de trabalho</label>
                                <input type="email" placeholder="nome@farmacia.co.mz" className="w-full bg-white/5 border border-white/10 px-8 py-5 rounded-2xl text-white focus:outline-none focus:border-emerald-500 transition-all font-bold text-lg placeholder:text-white/10" />
                            </div>
                            <div className="space-y-4 text-left">
                                <label className="text-[12px] font-black text-emerald-500 uppercase tracking-[0.3em] ml-2">WhatsApp / telemóvel</label>
                                <input type="text" placeholder="+258 8X XXX XXXX" className="w-full bg-white/5 border border-white/10 px-8 py-5 rounded-2xl text-white focus:outline-none focus:border-emerald-500 transition-all font-bold text-lg placeholder:text-white/10" />
                            </div>
                        </div>
                        <button className="w-full py-7 bg-gradient-to-br from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black uppercase tracking-[0.3em] rounded-2xl transition-all duration-500 shadow-2xl shadow-emerald-500/30 text-xl relative z-10 italic active:scale-95">
                            Solicitar demonstração grátis
                        </button>
                        <div className="mt-12 flex flex-col md:flex-row items-center justify-center gap-10 text-[11px] font-black text-white/20 uppercase tracking-[0.4em] relative z-10">
                            <span className="flex items-center gap-3"><ShieldCheck size={20} className="text-emerald-500" /> Resposta em 2h</span>
                            <span className="hidden md:block opacity-20">|</span>
                            <span className="flex items-center gap-3"><Globe size={20} className="text-emerald-500" /> Cobertura em todo o país</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-24 bg-slate-950 border-t border-white/5 font-['Inter',sans-serif]">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-16 mb-20">
                        <div className="flex flex-col items-center md:items-start text-center md:text-left">
                            <img src="/logo-sidebar.png" alt="Logo" className="h-12 w-auto mb-8" />
                            <p className="text-white/30 text-lg font-medium max-w-sm leading-relaxed tracking-tight">
                                O parceiro tecnológico de elite para o setor farmacêutico moçambicano. Eficiência comprovada que gera resultados reais.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-16 text-center md:text-left">
                            <div className="flex flex-col gap-6">
                                <span className="text-[12px] font-black text-white/10 uppercase tracking-[0.5em] mb-2">Sistema</span>
                                {SYSTEM_SCREENS.slice(0, 4).map(k => (
                                    <button key={k.id} onClick={() => setDetailModule(k)} className="text-sm font-bold text-white/40 hover:text-emerald-500 transition-all text-left">
                                        {k.title}
                                    </button>
                                ))}
                            </div>
                            <div className="flex flex-col gap-6">
                                <span className="text-[12px] font-black text-white/10 uppercase tracking-[0.5em] mb-2">Empresa</span>
                                {[
                                    { label: 'A Nossa Visão', id: 'vision' },
                                    { label: 'Contacto Comercial', id: 'contact' },
                                    { label: 'Termos Oficiais', id: 'terms' },
                                    { label: 'Privacidade', id: 'privacy' }
                                ].map(k => (
                                    <button key={k.id} className="text-sm font-bold text-white/40 hover:text-emerald-400 transition-all text-left">{k.label}</button>
                                ))}
                            </div>
                            <div className="hidden md:flex flex-col gap-4">
                                <span className="text-[12px] font-black text-white/10 uppercase tracking-[0.5em] mb-2">Suporte</span>
                                <button className="text-sm font-bold text-white/40 hover:text-emerald-500 transition-all text-left">Support Center</button>
                                <p className="text-sm font-black text-white/30 tracking-widest">+258 82 052 7954</p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-16 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-10">
                        <span className="text-[11px] font-black text-white/10 uppercase tracking-[0.6em]">© 2026 NOBREZA ERP. TODOS OS DIREITOS RESERVADOS.</span>
                        <div className="flex items-center gap-6">
                            <span className="text-[11px] font-black text-white/10 uppercase tracking-widest">Tecnologia por</span>
                            <a href="https://zyph.co.in" target="_blank" rel="noreferrer" className="text-[13px] font-black text-emerald-500 uppercase tracking-[0.3em] italic hover:text-emerald-400 transition-colors">Zyph Tech</a>
                            <Info size={16} className="text-white/10 hover:text-emerald-500 cursor-pointer" onClick={() => {
                                const win = window.open('', '_blank');
                                win?.document.write('<h1>Nobreza ERP Documentation Coming Soon</h1>');
                            }} />
                        </div>
                    </div>
                </div>
            </footer>

            {/* Custom Styles for Animations */}
            <style dangerouslySetInnerHTML={{
                __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');
        
        @keyframes slow-zoom {
          0% { transform: scale(1.1); }
          100% { transform: scale(1.2); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(50px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes zoom-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-slow-zoom { animation: slow-zoom 30s linear infinite alternate; }
        .animate-slide-up { animation: slide-up 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-fade-in { animation: fade-in 2.5s ease-out forwards; }
        .animation-delay-200 { animation-delay: 300ms; }
        .animation-delay-400 { animation-delay: 600ms; }
        html { scroll-behavior: smooth; }
        
        body { font-family: 'Inter', sans-serif; }
        
        /* Hide scrollbar for Chrome, Safari and Opera */
        .custom-scrollbar::-webkit-scrollbar {
          display: none;
        }

        /* Hide scrollbar for IE, Edge and Firefox */
        .custom-scrollbar {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
      ` }} />
        </div>
    );
};
