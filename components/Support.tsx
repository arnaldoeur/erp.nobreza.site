import React, { useState, useEffect, useRef } from 'react';
import { Plus, Send, Bot, Phone, ExternalLink, Paperclip, MoreVertical, Search, FileText, Image as ImageIcon, X, Menu as MenuIcon } from 'lucide-react';
import { SupportService, ChatMessage, ChatThread } from '../services/support.service';
import { User, Product, Sale, Customer, DailyClosure } from '../types';
import { Sparkles, TrendingUp, AlertTriangle, HelpCircle } from 'lucide-react'; // Added Icons

interface SupportProps {
    currentUser: User;
    sales: Sale[];
    products: Product[];
    customers: Customer[];
    dailyClosures: DailyClosure[];
}

export const Support: React.FC<SupportProps> = ({ currentUser, sales, products, customers, dailyClosures }) => {
    // Views: THREADS (Mobile list), CHAT (Active conversation)
    const [activeThread, setActiveThread] = useState<ChatThread | null>(null);
    const [threads, setThreads] = useState<ChatThread[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isAiTyping, setIsAiTyping] = useState(false);
    const [isOptionsOpen, setIsOptionsOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Auto-scroll ref
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initial Load
    useEffect(() => {
        loadThreads();
    }, []);

    // Load Messages when thread changes
    useEffect(() => {
        if (activeThread) {
            loadMessages(activeThread.id);
        }
    }, [activeThread]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isAiTyping]);

    const loadThreads = async () => {
        try {
            const data = await SupportService.getThreads(currentUser.companyId, currentUser.id);
            setThreads(data);
            // If threads exist but none selected, select the first one (Desktop behavior)
            if (data.length > 0 && !activeThread) {
                setActiveThread(data[0]);
            }
        } catch (e) {
            console.error("Error loading threads", e);
        }
    };

    const loadMessages = async (chatId: string) => {
        setIsLoading(true);
        try {
            const data = await SupportService.getMessages(chatId);
            setMessages(data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleNewChat = async () => {
        try {
            const newThread = await SupportService.createThread(currentUser.companyId, currentUser.id);
            setThreads([newThread, ...threads]);
            setActiveThread(newThread);

            // Send welcome message from AI automatically
            setIsAiTyping(true);
            setTimeout(async () => {
                await SupportService.sendMessage(newThread.id, 'assistant', `Olá ${currentUser.name}! Sou a IA da Nobreza. Como posso ajudar?`);
                loadMessages(newThread.id);
                setIsAiTyping(false);
            }, 1000);

        } catch (e) {
            alert("Erro ao criar conversa. Verifique se correu o script SQL 41.");
        }
    };

    const handleQuickQuestion = (question: string) => {
        setInput(question);
        // Optional: auto-submit
        // handleSendMessage(new Event('submit') as any); 
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !activeThread) return;

        const content = input;
        setInput('');

        // Optimistic UI for User Message
        const tempId = Date.now().toString();
        const optimisticMsg: ChatMessage = {
            id: tempId,
            role: 'user',
            content,
            created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, optimisticMsg]);
        setIsAiTyping(true);

        try {
            // 1. Save User Message to DB
            await SupportService.sendMessage(activeThread.id, 'user', content);

            // Re-fetch threads to update timestamp/sorting if needed
            loadThreads();

            // 2. Generate AI Response
            await SupportService.generateAIResponse(
                activeThread.id,
                messages.concat(optimisticMsg),
                content,
                {
                    userName: currentUser.name,
                    role: currentUser.role,
                    companyId: currentUser.companyId,
                    sales,
                    products
                }
            );

            // 3. Reload Full History (to get real IDs and AI response)
            loadMessages(activeThread.id);

        } catch (error) {
            console.error(error);
            const errorMsg: ChatMessage = {
                id: 'err',
                role: 'system',
                content: 'Erro ao enviar mensagem. (Verifique conexão/SQL)',
                created_at: new Date().toISOString()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsAiTyping(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length || !activeThread) return;
        alert("Upload de ficheiros será ativado na próxima atualização.");
    };

    return (
        <div className="h-full flex gap-0 bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm animate-in fade-in">

            {/* LEFT SIDEBAR (Threads List) */}
            <div className={`
                ${isSidebarOpen ? 'w-full md:w-80 border-r' : 'w-0 border-r-0'} 
                bg-slate-50 border-slate-200 flex flex-col transition-all duration-300 ease-in-out overflow-hidden
                ${activeThread ? 'hidden md:flex' : 'flex'}
            `}>
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 min-w-[20rem]">
                    <button
                        onClick={handleNewChat}
                        className="w-full bg-emerald-950 text-white p-3 rounded-xl font-bold uppercase text-xs tracking-wider flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-md active:scale-95">
                        <Plus size={16} /> Nova Conversa
                    </button>
                    <div className="mt-4 relative">
                        <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                        <input placeholder="Pesquisar..." className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-emerald-500 transition-all font-medium text-slate-600" />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1 min-w-[20rem]">
                    {threads.length === 0 && (
                        <div className="text-center p-8 text-slate-400 text-xs font-medium">
                            Nenhuma conversa ainda.
                        </div>
                    )}
                    {threads.map(thread => (
                        <div
                            key={thread.id}
                            onClick={() => setActiveThread(thread)}
                            className={`p-3 rounded-xl cursor-pointer transition-all border ${activeThread?.id === thread.id ? 'bg-white border-slate-200 shadow-sm ring-1 ring-slate-100' : 'bg-transparent border-transparent hover:bg-slate-100'}`}>
                            <div className="flex justify-between items-start mb-1">
                                <h4 className="font-bold text-slate-800 text-sm truncate pr-2">{thread.title}</h4>
                                <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap">
                                    {thread.last_message_at ? new Date(thread.last_message_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium truncate">
                                {thread.status === 'CLOSED' ? '🔴 Resolvido' : '🟢 Conversa ativa'}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* RIGHT MAIN AREA (Chat Window) */}
            <div className={`flex-1 flex flex-col bg-[#efeae2] relative ${!activeThread && isSidebarOpen ? 'hidden md:flex' : 'flex'}`}>
                {/* Wallpaper Pattern */}
                <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#4a4a4a 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

                {activeThread ? (
                    <>
                        {/* Chat Header */}
                        <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 shrink-0 z-10 shadow-sm">
                            <div className="flex items-center gap-3">
                                {/* Toggle Sidebar Button */}
                                <button
                                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                    className="p-2 -ml-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                                    title={isSidebarOpen ? "Esconder Barra Lateral" : "Mostrar Barra Lateral"}>
                                    <MenuIcon size={20} />
                                </button>

                                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 border border-emerald-200 overflow-hidden">
                                    <img src="/Nobreza ERP - Logos, Icones, Favicon/NERP ICONE.png" className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 leading-tight text-sm md:text-base">Nobreza AI</h3>
                                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Online
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-1 md:gap-2 relative">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all active:scale-95"
                                    title="Anexar Ficheiro">
                                    <Paperclip size={18} />
                                </button>

                                <button
                                    onClick={() => setIsOptionsOpen(!isOptionsOpen)}
                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all active:scale-95"
                                    title="Opções">
                                    <MoreVertical size={18} />
                                </button>

                                {/* Options Dropdown */}
                                {isOptionsOpen && (
                                    <div className="absolute right-0 top-12 w-48 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in zoom-in-95">
                                        <button
                                            onClick={() => {
                                                alert("Conversa fechada (Simulação).");
                                                setIsOptionsOpen(false);
                                            }}
                                            className="w-full text-left px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-400"></div> Fechar Conversa
                                        </button>
                                        <button
                                            onClick={() => {
                                                alert("Histórico limpo localmente.");
                                                setIsOptionsOpen(false);
                                            }}
                                            className="w-full text-left px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-slate-400"></div> Limpar Histórico
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsSidebarOpen(!isSidebarOpen);
                                                setIsOptionsOpen(false);
                                            }}
                                            className="w-full text-left px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2 md:hidden">
                                            <div className="w-2 h-2 rounded-full bg-blue-400"></div> {isSidebarOpen ? 'Esconder Lista' : 'Ver Lista'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>



                        {/* Suggestion Chips */}
                        {messages.length < 3 && (
                            <div className="px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar mask-gradient">
                                <button onClick={() => handleQuickQuestion("Resumo de Vendas Hoje")} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-slate-600 hover:bg-emerald-50 hover:border-emerald-200 transition-all whitespace-nowrap shadow-sm">
                                    <TrendingUp size={12} className="text-emerald-500" /> Vendas Hoje
                                </button>
                                <button onClick={() => handleQuickQuestion("Produtos com Stock Baixo")} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-slate-600 hover:bg-emerald-50 hover:border-emerald-200 transition-all whitespace-nowrap shadow-sm">
                                    <AlertTriangle size={12} className="text-amber-500" /> Stock Baixo
                                </button>
                                <button onClick={() => handleQuickQuestion("Como emitir fatura?")} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-slate-600 hover:bg-emerald-50 hover:border-emerald-200 transition-all whitespace-nowrap shadow-sm">
                                    <HelpCircle size={12} className="text-blue-500" /> Como Faturar?
                                </button>
                            </div>
                        )}

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 custom-scrollbar z-0 relative">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`
                                        max-w-[85%] md:max-w-[70%] p-3 md:p-4 rounded-2xl shadow-sm relative text-sm leading-relaxed
                                        ${msg.role === 'user' ? 'bg-[#d9fdd3] text-slate-900 rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none'}
                                    `}>
                                        {msg.role === 'assistant' && (
                                            <p className="text-[10px] font-black text-emerald-600 mb-1 uppercase tracking-wider">Nobreza AI</p>
                                        )}
                                        <div className="whitespace-pre-wrap">{msg.content}</div>
                                        <p className="text-[9px] text-right mt-1 opacity-50 font-medium select-none">
                                            {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                                        </p>
                                    </div>
                                </div>
                            ))}

                            {isAiTyping && (
                                <div className="flex justify-start animate-in fade-in slide-in-from-left-2">
                                    <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                                        <div className="flex gap-1">
                                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="bg-[#f0f2f5] p-3 z-10 border-t border-slate-200">
                            <form onSubmit={handleSendMessage} className="flex items-center gap-2 max-w-4xl mx-auto">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-3 text-slate-500 hover:bg-slate-200 rounded-full transition-all"
                                >
                                    <Plus size={20} />
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    onChange={handleFileUpload}
                                />
                                <div className="flex-1 bg-white rounded-xl flex items-center px-4 py-2 border border-slate-200 focus-within:border-emerald-500 transition-all shadow-sm">
                                    <input
                                        value={input}
                                        onChange={e => setInput(e.target.value)}
                                        placeholder="Escreva uma mensagem..."
                                        className="w-full bg-transparent outline-none text-sm font-medium text-slate-700 placeholder:text-slate-400 h-8"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={!input.trim()}
                                    className="p-3 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all active:scale-95 flex items-center justify-center"
                                >
                                    <Send size={18} className={input.trim() ? "translate-x-0.5" : ""} />
                                </button>
                            </form>
                            <div className="text-center mt-2">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                    Powered by <span className="text-emerald-600/80">Zyph Tech, Lda</span>
                                </p>
                            </div>
                        </div>
                    </>
                ) : (
                    /* Check if threads exist to show different 'Empty State' */
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 p-8 text-center bg-slate-50/50">
                        <div className="w-32 h-32 bg-slate-100 rounded-full flex items-center justify-center mb-6 shadow-inner overflow-hidden">
                            <img src="/Nobreza ERP - Logos, Icones, Favicon/NERP ICONE.png" className="w-full h-full object-cover opacity-50 grayscale" />
                        </div>
                        <h3 className="text-xl font-black text-slate-400 uppercase tracking-widest mb-2">Central de Suporte</h3>
                        <p className="max-w-xs text-sm font-medium text-slate-400 mb-8">Selecione uma conversa ou inicie um novo chat para falar com a nossa equipa ou IA.</p>
                        <button onClick={handleNewChat} className="bg-emerald-950 text-white px-8 py-3 rounded-xl font-bold uppercase text-xs tracking-wider shadow-lg hover:scale-105 transition-all">
                            Iniciar Chat
                        </button>
                    </div>
                )}
            </div>
        </div >
    );
};
