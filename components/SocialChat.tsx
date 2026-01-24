import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Smile, Paperclip, MoreVertical, Search, AtSign, Plus, X, Trash2, FolderCheck, Users, Camera, UserPlus, UserMinus, CheckSquare, Info } from 'lucide-react';
import { createPortal } from 'react-dom';
import { CollabService, CollabMessage } from '../services/collab.service';
import { User } from '../types';
import { supabase } from '../services/supabase';

interface SocialChatProps {
    currentUser: User;
    team: User[];
}

export const SocialChat: React.FC<SocialChatProps> = ({ currentUser, team }) => {
    const [groups, setGroups] = useState<any[]>([]);
    const [activeGroup, setActiveGroup] = useState<any>(null);
    const [showGroupsMobile, setShowGroupsMobile] = useState(false);
    const [messages, setMessages] = useState<CollabMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [showMentions, setShowMentions] = useState(false);
    const [mentionFilter, setMentionFilter] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Group Form State
    const [newGroupName, setNewGroupName] = useState('');

    // Settings & Members State
    const [showGroupSettings, setShowGroupSettings] = useState(false);
    const [groupMembers, setGroupMembers] = useState<any[]>([]);
    const [editingName, setEditingName] = useState('');
    const [editingDescription, setEditingDescription] = useState('');
    const [isMemberLoading, setIsMemberLoading] = useState(false);

    // Search and File Preview
    const [searchTerm, setSearchTerm] = useState('');
    const [filePreview, setFilePreview] = useState<{ file: File; url: string } | null>(null);

    const [isLoading, setIsLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Initial Load
    useEffect(() => {
        const loadGroups = async () => {
            try {
                const data = await CollabService.getGroups();
                setGroups(data);
                if (data.length > 0 && !activeGroup) {
                    setActiveGroup(data[0]);
                }
            } finally {
                setIsLoading(false);
            }
        };
        loadGroups();
    }, []);

    // Active Group Change
    useEffect(() => {
        if (!activeGroup) return;

        setEditingName(activeGroup.name);
        setEditingDescription(activeGroup.description || '');

        const loadData = async () => {
            const msgs = await CollabService.getMessages(activeGroup.id);
            setMessages(msgs);

            // Load members
            setIsMemberLoading(true);
            try {
                const members = await CollabService.getGroupMembers(activeGroup.id);
                setGroupMembers(members || []);
            } catch (e) {
                console.error("Error loading members", e);
            } finally {
                setIsMemberLoading(false);
            }
        };
        loadData();

        // Real-time subscription
        const channel = supabase.channel(`group-${activeGroup.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'erp_chat_messages',
                filter: `grupo_id=eq.${activeGroup.id}`
            }, (payload) => {
                setMessages(prev => [...prev, payload.new as CollabMessage]);
            })
            .subscribe();

        return () => { channel.unsubscribe(); };
    }, [activeGroup]);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Helper to get initials (First letter of First + Last name)
    const getInitials = (name: string) => {
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    const handleSend = async () => {
        if (!newMessage.trim() || !activeGroup) return;

        // Simple mention parsing for id
        const mentionIds = team
            .filter(u => newMessage.includes(`@${u.name}`))
            .map(u => u.id);

        const msg: CollabMessage = {
            company_id: currentUser.companyId,
            user_id: currentUser.id,
            user_name: currentUser.name,
            group_id: activeGroup.id,
            content: newMessage,
            mentions: mentionIds
        };

        try {
            const sentMsg = await CollabService.sendMessage(msg);
            // Optimistic / Immediate Update
            setMessages(prev => {
                if (sentMsg && sentMsg.id && prev.some(m => m.id === sentMsg.id)) return prev;
                return [...prev, sentMsg || msg];
            });
            setNewMessage('');
            setShowMentions(false);
        } catch (e) {
            console.error("Error sending message:", e);
        }
    };

    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) return;
        try {
            const { data, error } = await supabase.from('erp_chat_groups').insert([{
                name: newGroupName,
                company_id: currentUser.companyId,
                created_by: currentUser.id
            }]).select().single();

            if (error) throw error;

            // Auto add creator
            await CollabService.addGroupMember(data.id, currentUser.id, 'ADMIN');

            setGroups([...groups, data]);
            setActiveGroup(data);
            setIsCreateModalOpen(false);
            setNewGroupName('');
        } catch (e: any) {
            alert(`Erro ao criar grupo: ${e.message}`);
        }
    };

    const handleUpdateGroup = async () => {
        if (!activeGroup) return;
        try {
            const updated = await CollabService.updateGroup(activeGroup.id, {
                name: editingName,
                description: editingDescription
            });
            setGroups(groups.map(g => g.id === updated.id ? updated : g));
            setActiveGroup(updated);
            alert("Grupo atualizado com sucesso!");
        } catch (e: any) {
            console.error(e);
            alert("Erro ao atualizar grupo. Verifique as permissões.");
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length || !activeGroup) return;
        try {
            const file = e.target.files[0];
            const url = await CollabService.uploadFile(file, 'documents');

            const updated = await CollabService.updateGroup(activeGroup.id, { image_url: url });
            setGroups(groups.map(g => g.id === updated.id ? updated : g));
            setActiveGroup(updated);
            alert("Imagem do grupo atualizada!");
        } catch (e) {
            alert("Erro ao carregar imagem");
            console.error(e);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length || !activeGroup) return;
        const file = e.target.files[0];
        const url = URL.createObjectURL(file); // Temporary preview
        setFilePreview({ file, url });
    };

    const confirmFileSend = async () => {
        if (!filePreview || !activeGroup) return;
        try {
            // Upload
            const url = await CollabService.uploadFile(filePreview.file, 'documents');

            const msg: CollabMessage = {
                company_id: currentUser.companyId,
                user_id: currentUser.id,
                user_name: currentUser.name,
                group_id: activeGroup.id,
                content: `📎 Arquivo: ${filePreview.file.name} (${url})`,
                mentions: []
            };
            await CollabService.sendMessage(msg);
            setFilePreview(null);
        } catch (e) {
            alert("Erro ao enviar arquivo");
            console.error(e);
        }
    };

    const handleCreateTask = async (content: string) => {
        // Suppressed alert, just log for now until feature is ready
        console.log(`Criar tarefa solicitado: "${content}"`);
    };

    const handleAddMember = async (userId: string) => {
        if (!activeGroup) return;
        try {
            await CollabService.addGroupMember(activeGroup.id, userId, 'MEMBER');
            const members = await CollabService.getGroupMembers(activeGroup.id);
            setGroupMembers(members || []);
            alert("Membro adicionado!");
        } catch (e: any) {
            console.error(e);
            alert(`Erro ao adicionar membro: ${e.message || 'Desconhecido'}`);
        }
    };

    const handleRemoveMember = async (userId: string) => {
        if (!activeGroup) return;
        try {
            await CollabService.removeGroupMember(activeGroup.id, userId);
            setGroupMembers(prev => prev.filter(m => m.user_id !== userId));
        } catch (e) {
            console.error(e);
        }
    };

    const renderMessageContent = (content: string) => {
        // Check for file attachment pattern
        const fileMatch = content.match(/^📎 Arquivo: (.+) \((.+)\)$/);

        if (fileMatch) {
            const [_, name, url] = fileMatch;
            const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(name) || name.match(/\.(jpg|jpeg|png|gif|webp)\?/) || url.includes('image');

            if (isImage) {
                return (
                    <div className="flex flex-col gap-2 mt-1">
                        <div className="relative group/img overflow-hidden rounded-lg max-w-xs border border-emerald-900/10">
                            <img
                                src={url}
                                alt={name}
                                className="w-full h-auto object-cover max-h-64"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                            <a href={url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs uppercase tracking-wider backdrop-blur-sm">
                                <Paperclip size={14} className="mr-2" /> Abrir Original
                            </a>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider opacity-80 flex items-center gap-1">
                            <Camera size={10} /> {name}
                        </span>
                    </div>
                );
            }

            return (
                <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition-colors group/file mt-1">
                    <div className="p-2 bg-white rounded-lg text-emerald-600 shadow-sm">
                        <FolderCheck size={18} />
                    </div>
                    <div className="overflow-hidden">
                        <p className="font-bold text-xs text-emerald-900 truncate group-hover/file:text-emerald-700">{name}</p>
                        <p className="text-[9px] font-bold text-emerald-600/60 uppercase tracking-wider">Anexo</p>
                    </div>
                </a>
            );
        }

        return <p className="whitespace-pre-wrap">{content}</p>;
    };



    return (
        <div className="h-full flex gap-0 animate-in fade-in duration-500 overflow-hidden bg-slate-50/50 relative">
            {/* File Preview Modal */}
            {filePreview && (
                <div className="absolute inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in zoom-in-95">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
                        <h3 className="text-lg font-black text-slate-800 mb-4">Enviar Arquivo?</h3>
                        <div className="bg-slate-50 rounded-xl p-4 mb-4 flex items-center gap-3 border border-slate-100">
                            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600">
                                <Paperclip size={20} />
                            </div>
                            <div className="overflow-hidden">
                                <p className="font-bold text-sm text-slate-700 truncate">{filePreview.file.name}</p>
                                <p className="text-xs text-slate-400">{(filePreview.file.size / 1024).toFixed(1)} KB</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setFilePreview(null)} className="flex-1 py-3 text-slate-500 font-bold text-xs uppercase tracking-wider hover:bg-slate-50 rounded-xl transition-colors">Cancelar</button>
                            <button onClick={confirmFileSend} className="flex-1 py-3 bg-emerald-950 text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-emerald-900 transition-colors shadow-lg">Enviar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sidebar - Group List */}
            <div className={`fixed inset-0 z-40 lg:relative lg:inset-auto lg:z-0 lg:w-72 bg-white flex flex-col shrink-0 border-r border-slate-100 transition-transform duration-300 ${showGroupsMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                <div className="p-5 border-b border-slate-50 flex justify-between items-center bg-white">
                    <h2 className="text-lg font-black text-slate-950 uppercase tracking-tight">Canais</h2>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsCreateModalOpen(true)} className="p-2 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 transition-colors">
                            <Plus size={18} />
                        </button>
                        <button onClick={() => setShowGroupsMobile(false)} className="lg:hidden p-2 text-slate-400 hover:text-red-500">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                    {groups.map(g => (
                        <div
                            key={g.id}
                            onClick={() => { setActiveGroup(g); setShowGroupSettings(false); setShowGroupsMobile(false); }}
                            className={`p-3 rounded-xl flex items-center gap-3 cursor-pointer transition-all ${activeGroup?.id === g.id ? 'bg-emerald-950 text-white shadow-lg shadow-emerald-900/10' : 'hover:bg-slate-50 text-slate-600'}`}
                        >
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-xs uppercase shrink-0 ${activeGroup?.id === g.id ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-500'}`}
                                style={{ backgroundImage: g.image_url ? `url(${g.image_url})` : 'none', backgroundSize: 'cover' }}>
                                {!g.image_url && getInitials(g.name)}
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm font-bold truncate">{g.name}</p>
                                <p className={`text-[10px] font-bold truncate ${activeGroup?.id === g.id ? 'text-emerald-400' : 'text-slate-400'}`}>
                                    {g.description || 'Sem descrição'}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col bg-white/50 relative">
                {activeGroup ? (
                    <>
                        {/* Chat Header */}
                        <div className="h-16 border-b border-slate-100 bg-white flex justify-between items-center px-4 md:px-6">
                            <div className="flex items-center gap-2 md:gap-3">
                                <button onClick={() => setShowGroupsMobile(true)} className="lg:hidden p-2 text-slate-400 hover:text-emerald-700">
                                    <Users size={20} />
                                </button>
                                <div className="flex items-center gap-2 md:gap-3 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setShowGroupSettings(!showGroupSettings)}>
                                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-emerald-100 flex items-center justify-center font-black text-emerald-800 text-xs md:text-base shrink-0"
                                        style={{ backgroundImage: activeGroup.image_url ? `url(${activeGroup.image_url})` : 'none', backgroundSize: 'cover' }}>
                                        {!activeGroup.image_url && getInitials(activeGroup.name)}
                                    </div>
                                    <div className="overflow-hidden">
                                        <h3 className="text-xs md:text-sm font-black text-slate-950 uppercase truncate">{activeGroup.name}</h3>
                                        <p className="text-[9px] md:text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                            <Users size={10} /> {groupMembers.length} membros
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-1 md:gap-2">
                                <button onClick={() => setShowGroupSettings(!showGroupSettings)} className={`p-2 rounded-lg transition-colors ${showGroupSettings ? 'bg-emerald-50 text-emerald-700' : 'text-slate-400 hover:bg-slate-50'}`}>
                                    <Info size={18} md:size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
                            {messages.map((m, idx) => {
                                const isMine = m.user_id === currentUser.id;
                                return (
                                    <div key={m.id || idx} className={`flex gap-3 group ${isMine ? 'flex-row-reverse' : ''}`}>
                                        <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center text-[10px] font-black text-slate-500 uppercase shrink-0">
                                            {getInitials(m.user_name)}
                                        </div>
                                        <div className={`flex flex-col max-w-[85%] md:max-w-[65%] ${isMine ? 'items-end' : 'items-start'}`}>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[10px] font-black text-slate-900 uppercase">{m.user_name}</span>
                                                <span className="text-[9px] font-bold text-slate-400">{m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Agora'}</span>
                                            </div>
                                            <div className={`px-5 py-3 rounded-2xl text-sm font-medium shadow-sm leading-relaxed relative group-hover:shadow-md transition-shadow ${isMine ? 'bg-emerald-950 text-white rounded-tr-none' : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'}`}>
                                                {renderMessageContent(m.content)}

                                                {/* Task Conversion Action */}
                                                <button
                                                    className={`absolute ${isMine ? '-left-8' : '-right-8'} top-1/2 -translate-y-1/2 p-2 bg-white text-emerald-600 rounded-full shadow-md border border-slate-100 opacity-0 group-hover:opacity-100 transition-all hover:bg-emerald-50 transform hover:scale-110`}
                                                    title="Criar Tarefa"
                                                    onClick={() => handleCreateTask(m.content)}
                                                >
                                                    <CheckSquare size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={scrollRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-6 bg-white border-t border-slate-100">
                            <div className="bg-slate-50 p-2 rounded-2xl border border-slate-200 focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all flex items-end gap-2">
                                <label className="p-3 text-slate-400 hover:text-emerald-700 transition-colors cursor-pointer">
                                    <Paperclip size={20} />
                                    <input type="file" className="hidden" onChange={handleFileUpload} />
                                </label>
                                <textarea
                                    className="flex-1 bg-transparent border-none outline-none text-sm font-medium p-3 max-h-32 resize-none placeholder:text-slate-400"
                                    placeholder="Escreva uma mensagem..."
                                    rows={1}
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSend();
                                        }
                                    }}
                                />
                                <button onClick={handleSend} className="p-3 bg-emerald-950 text-white rounded-xl shadow-lg hover:bg-emerald-900 active:scale-95 transition-all mb-1">
                                    <Send size={18} />
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
                        <MessageSquare size={48} className="mb-4 opacity-50" />
                        <p className="font-bold uppercase tracking-widest text-xs">Selecione um canal para começar</p>
                    </div>
                )}

                {/* Right Sidebar: Settings */}
                {showGroupSettings && activeGroup && (
                    <div className="w-80 bg-white border-l border-slate-100 h-full overflow-y-auto animate-in slide-in-from-right-10 duration-300 absolute right-0 top-0 z-20 shadow-[-10px_0_30px_rgba(0,0,0,0.02)]">
                        <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-black text-slate-950 uppercase tracking-tight text-sm">Detalhes do Grupo</h3>
                            <button onClick={() => setShowGroupSettings(false)} className="text-slate-400 hover:text-emerald-700"><X size={18} /></button>
                        </div>

                        <div className="p-6 space-y-8">
                            {/* Group Header Edit */}
                            <div className="text-center">
                                <div className="w-24 h-24 rounded-2xl bg-slate-100 mx-auto mb-4 relative group overflow-hidden flex items-center justify-center font-black text-3xl text-slate-300 uppercase"
                                    style={{ backgroundImage: activeGroup.image_url ? `url(${activeGroup.image_url})` : 'none', backgroundSize: 'cover' }}>
                                    {!activeGroup.image_url && getInitials(activeGroup.name)}

                                    <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity text-white">
                                        <Camera size={24} />
                                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                    </label>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 text-left">Nome</label>
                                        <input
                                            className="w-full text-center font-black text-lg uppercase text-slate-950 bg-slate-50 rounded-xl px-4 py-2 outline-none border-2 border-transparent focus:border-emerald-500 transition-colors"
                                            value={editingName}
                                            onChange={e => setEditingName(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 text-left">Descrição</label>
                                        <textarea
                                            className="w-full text-center text-xs font-bold text-slate-500 bg-slate-50 rounded-xl px-4 py-2 outline-none border-2 border-transparent focus:border-emerald-500 transition-colors h-20 resize-none"
                                            value={editingDescription}
                                            placeholder="Sem descrição"
                                            onChange={e => setEditingDescription(e.target.value)}
                                        />
                                    </div>
                                    <button
                                        onClick={handleUpdateGroup}
                                        className="w-full py-3 bg-emerald-950 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-900 transition-colors shadow-lg active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        <FolderCheck size={14} /> Salvar Detalhes
                                    </button>
                                </div>
                            </div>

                            {/* Members Section */}
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Membros ({groupMembers.length})</h4>
                                </div>

                                {/* Add Member Dropdown */}
                                <div className="mb-4 relative">
                                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200 focus-within:border-emerald-500 focus-within:bg-white transition-all">
                                        <Search size={14} className="text-slate-400" />
                                        <input
                                            className="bg-transparent text-xs font-bold outline-none w-full placeholder:text-slate-400"
                                            placeholder="Adicionar pessoa..."
                                            value={searchTerm || ''}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>

                                    {searchTerm && (
                                        <div className="absolute top-full left-0 w-full bg-white shadow-2xl rounded-2xl border border-gray-100 mt-2 p-1 z-30 max-h-56 overflow-y-auto animate-in fade-in slide-in-from-top-2 custom-scrollbar">
                                            <div className="p-2 text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 mb-1">Resultados da Pesquisa</div>
                                            {team
                                                .filter(u =>
                                                    !groupMembers.find(m => m.user?.id === u.id) &&
                                                    u.name.toLowerCase().includes(searchTerm.toLowerCase())
                                                )
                                                .map(u => (
                                                    <div key={u.id} onClick={() => { handleAddMember(u.id); setSearchTerm(''); }} className="p-2 hover:bg-emerald-50 rounded-lg flex items-center gap-2 cursor-pointer transition-colors">
                                                        <div className="w-6 h-6 rounded bg-emerald-900 text-white flex items-center justify-center text-[10px] font-black">{getInitials(u.name)}</div>
                                                        <span className="text-xs font-bold text-slate-700">{u.name}</span>
                                                        <Plus size={12} className="ml-auto text-emerald-600" />
                                                    </div>
                                                ))}
                                            {team.filter(u => !groupMembers.find(m => m.user?.id === u.id) && u.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                                                <div className="p-4 text-center">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Ninguém encontrado</p>
                                                    <p className="text-[9px] text-slate-300">Tente um nome diferente ou o utilizador já está no grupo.</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                    {groupMembers.map(m => (
                                        <div key={m.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl group transition-colors">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-[9px] font-black text-emerald-800 shrink-0"
                                                style={{ backgroundImage: m.user.photo ? `url(${m.user.photo})` : 'none', backgroundSize: 'cover' }}>
                                                {!m.user.photo && getInitials(m.user.name)}
                                            </div>
                                            <div className="overflow-hidden flex-1">
                                                <p className="text-xs font-bold text-slate-700 truncate">{m.user.name}</p>
                                                <p className="text-[9px] font-black text-slate-400 uppercase">{m.role}</p>
                                            </div>
                                            {(m.user.id !== currentUser.id) && (
                                                <button onClick={() => handleRemoveMember(m.user.id)} className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:bg-red-50 rounded transition-all">
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Danger Zone */}
                            <div className="pt-8 border-t border-slate-50">
                                <button className="w-full py-3 border-2 border-red-50 text-red-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-50 transition-colors flex items-center justify-center gap-2">
                                    <Trash2 size={14} /> Sair do Grupo
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Create Group Modal */}
            {isCreateModalOpen && createPortal(
                <div className="fixed inset-0 bg-emerald-950/90 backdrop-blur-2xl z-[99999] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-500">
                    <div className="bg-white w-full max-w-sm rounded-[3rem] p-8 md:p-12 shadow-[0_32px_80px_rgba(0,0,0,0.5)] relative animate-in zoom-in-95 duration-500">
                        <button onClick={() => setIsCreateModalOpen(false)} className="absolute top-6 right-6 md:top-10 md:right-10 p-3 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-400 hover:text-emerald-700 transition-all z-10"><X size={24} /></button>
                        <div className="mb-10">
                            <h3 className="text-3xl font-black text-emerald-950 uppercase tracking-tight">Criar Canal</h3>
                            <p className="text-xs text-emerald-600 font-bold uppercase tracking-widest mt-2">Dê um nome ao novo espaço</p>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Nome</label>
                                <input
                                    className="w-full px-6 py-4 bg-slate-50 rounded-2xl text-sm font-bold border-2 border-transparent focus:border-emerald-500 outline-none transition-all"
                                    placeholder="# Geral, # Marketing..."
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
                                />
                            </div>
                            <button
                                onClick={handleCreateGroup}
                                className="w-full bg-emerald-950 text-white py-4 rounded-xl font-black uppercase text-xs tracking-[0.2em] shadow-xl active:scale-95 transition-all"
                            >
                                Criar
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
