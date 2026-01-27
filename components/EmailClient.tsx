import React, { useState, useEffect } from 'react';
import {
    Mail, Inbox, Send, File, Trash2, RefreshCw, PenSquare, Search,
    ChevronLeft, MoreVertical, Paperclip, Star, Truck, Calendar, Settings, ShieldAlert
} from 'lucide-react';
import { EmailClientService } from '../services/email-client.service';
import { EmailAccountService } from '../services/email-accounts.service';
import { EmailAccount, EmailFolder, EmailMessage, CompanyInfo } from '../types';
import { User } from '../types';
import { EmailCompose } from './EmailCompose';
import { CompanyService } from '../services/company.service';

interface EmailClientProps {
    companyId: string;
    currentUser: User;
    onSettingsClick: () => void;
}

export const EmailClient: React.FC<EmailClientProps> = ({ companyId, currentUser, onSettingsClick }) => {
    const [accounts, setAccounts] = useState<EmailAccount[]>([]);
    const [selectedAccount, setSelectedAccount] = useState<EmailAccount | null>(null);
    const [folders, setFolders] = useState<EmailFolder[]>([]);
    const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
    const [messages, setMessages] = useState<EmailMessage[]>([]);
    const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(null);
    const [isComposing, setIsComposing] = useState(false);
    const [composeData, setComposeData] = useState<{ to?: string; subject?: string; body?: string }>({});
    const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);

    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);

    // Initial Load: Accounts and Company Info
    useEffect(() => {
        const init = async () => {
            setLoading(true);
            try {
                // Load Company Info for Signatures
                const info = await CompanyService.get();
                setCompanyInfo(info);

                // Load Accounts
                const accs = await EmailAccountService.getAccounts(companyId);
                setAccounts(accs);

                // Auto-select first account (Personal)
                if (accs.length > 0 && !selectedAccount) {
                    setSelectedAccount(accs[0]);
                }
            } catch (e) {
                console.error('Failed to load email accounts:', e);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [companyId]);

    const handleReply = () => {
        if (!selectedMessage) return;
        setComposeData({
            to: selectedMessage.from_addr,
            subject: `Re: ${selectedMessage.subject || ''}`,
            body: `\n\n--- On ${new Date(selectedMessage.date || '').toLocaleString()}, ${selectedMessage.from_name || selectedMessage.from_addr} wrote:\n\n${selectedMessage.snippet || ''}`
        });
        setIsComposing(true);
    };

    const handleForward = () => {
        if (!selectedMessage) return;
        setComposeData({
            subject: `Fwd: ${selectedMessage.subject || ''}`,
            body: `\n\n--- Forwarded message ---\nFrom: ${selectedMessage.from_name} <${selectedMessage.from_addr}>\nDate: ${new Date(selectedMessage.date || '').toLocaleString()}\nSubject: ${selectedMessage.subject}\n\n${selectedMessage.snippet || ''}`
        });
        setIsComposing(true);
    };

    const handleNewEmail = () => {
        setComposeData({});
        setIsComposing(true);
    };

    // Folders when Account Changes
    useEffect(() => {
        if (!selectedAccount) return;
        const loadFolders = async () => {
            const f = await EmailClientService.getFolders(selectedAccount.id);
            setFolders(f);
            const inbox = f.find(x => x.type === 'INBOX');
            if (inbox) setSelectedFolder(inbox.id);
            else if (f.length > 0) setSelectedFolder(f[0].id);
        };
        loadFolders();
    }, [selectedAccount]);

    const loadMsgs = async (folderId: string) => {
        setLoading(true);
        try {
            const isSystemFolder = selectedAccount?.account_type === 'SYSTEM';
            const { data } = await EmailClientService.getMessages(
                folderId,
                1,
                20,
                isSystemFolder ? currentUser.email : undefined
            );
            setMessages(data);
            setSelectedMessage(null);
        } finally {
            setLoading(false);
        }
    };

    // Load Messages when Folder Changes
    useEffect(() => {
        if (!selectedFolder) return;
        loadMsgs(selectedFolder);
    }, [selectedFolder]);

    const handleSync = async () => {
        if (!selectedAccount) return;
        setSyncing(true);
        try {
            await EmailClientService.syncAccount(selectedAccount.id);
            if (selectedFolder) {
                // If folder has path, sync messages too
                const f = folders.find(x => x.id === selectedFolder);
                if (f) await EmailClientService.syncFolder(selectedAccount.id, f.path);
            }
            // Refresh
            const msgs = await EmailClientService.getMessages(
                selectedFolder || '',
                1,
                20,
                selectedAccount.account_type === 'SYSTEM' ? currentUser.email : undefined
            );
            setMessages(msgs.data);
            alert('Sincronização concluída!');
        } catch (e: any) {
            alert('Falha na sincronização: ' + e.message);
        } finally {
            setSyncing(false);
        }
    };

    if (accounts.length === 0 && !loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[600px] text-center p-8 bg-white rounded-2xl shadow-sm border border-gray-100">
                <Mail size={64} className="text-emerald-100 mb-4" />
                <h3 className="text-xl font-black text-emerald-900 mb-2">Bem-vindo ao E-mail Nobreza</h3>
                <p className="text-gray-400 max-w-md mb-8">Gerencie suas caixas de correio diretamente no ERP. Configure sua primeira conta para começar.</p>
                <button
                    onClick={onSettingsClick}
                    className="bg-emerald-600 text-white px-8 py-4 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200"
                >
                    Configurar Agora
                </button>
            </div>
        );
    }

    return (
        <div className="flex bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden h-[80vh]">
            {/* 1. Sidebar (Folders) */}
            <div className="w-64 bg-gray-50/50 border-r border-gray-100 flex flex-col">
                <div className="p-4 border-b border-gray-100">
                    <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-tight">Caixa de Correio</label>
                        <select
                            className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs font-bold"
                            value={selectedAccount?.id}
                            onChange={e => {
                                const acc = accounts.find(a => a.id === e.target.value);
                                if (acc) setSelectedAccount(acc);
                            }}
                        >
                            {accounts.map(a => (
                                <option key={a.id} value={a.id}>
                                    {a.account_type === 'SYSTEM' ? '🛡️ ' : ''}
                                    {a.display_name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    <button onClick={handleNewEmail} className="w-full bg-emerald-600 text-white p-3 rounded-xl flex items-center justify-center gap-2 font-black text-xs uppercase mb-4 shadow-lg shadow-emerald-100 hover:bg-emerald-700">
                        <PenSquare size={16} /> Escrever
                    </button>

                    {folders.map(folder => (
                        <button
                            key={folder.id}
                            onClick={() => setSelectedFolder(folder.id)}
                            className={`w-full flex items-center justify-between p-3 rounded-lg text-xs font-bold transition-all ${selectedFolder === folder.id ? 'bg-white shadow text-emerald-700' : 'text-gray-500 hover:bg-gray-100'}`}
                        >
                            <div className="flex items-center gap-3">
                                {folder.type === 'INBOX' && <Inbox size={16} />}
                                {folder.type === 'SENT' && <Send size={16} />}
                                {folder.type === 'DRAFT' && <File size={16} />}
                                {folder.type === 'TRASH' && <Trash2 size={16} />}
                                {folder.type === 'CUSTOM' && <Mail size={16} />}
                                {selectedAccount?.account_type === 'SYSTEM' && <ShieldAlert size={16} className="text-emerald-600" />}
                                <span>{folder.name}</span>
                            </div>
                            {folder.unseen_count > 0 && <span className="bg-emerald-500 text-white px-1.5 py-0.5 rounded-full text-[9px]">{folder.unseen_count}</span>}
                        </button>
                    ))}
                </div>

                <div className="p-4 border-t border-gray-100 flex gap-2">
                    {selectedAccount?.account_type !== 'SYSTEM' && (
                        <button onClick={handleSync} disabled={syncing} className={`flex-1 p-2 rounded-lg bg-white border flex items-center justify-center text-gray-500 hover:text-emerald-600 ${syncing ? 'animate-spin' : ''}`}>
                            <RefreshCw size={16} />
                        </button>
                    )}
                    <button onClick={onSettingsClick} className="flex-1 p-2 rounded-lg bg-white border flex items-center justify-center text-gray-500 hover:text-blue-600">
                        <Settings size={16} />
                    </button>
                </div>
            </div>

            {/* 2. Message List */}
            <div className={`w-80 border-r border-gray-100 flex flex-col bg-white ${selectedMessage ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b border-gray-100">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input className="w-full bg-gray-50 border border-gray-100 rounded-lg pl-9 pr-4 py-2 text-xs" placeholder="Pesquisar..." />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="p-8 text-center text-gray-400 text-xs">A carregar...</div>
                    ) : messages.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 text-xs">Pasta vazia</div>
                    ) : (
                        messages.map(msg => (
                            <button
                                key={msg.id}
                                onClick={() => setSelectedMessage(msg)}
                                className={`w-full text-left p-4 border-b border-gray-50 hover:bg-gray-50 transition-all ${selectedMessage?.id === msg.id ? 'bg-emerald-50/50 border-l-4 border-l-emerald-500' : ''}`}
                            >
                                <div className="flex justify-between mb-1">
                                    <span className={`text-xs ${msg.flags?.includes('SEEN') ? 'font-medium text-gray-600' : 'font-black text-gray-900'}`}>{msg.from_name || msg.from_addr}</span>
                                    <span className="text-[10px] text-gray-400">{msg.date ? new Date(msg.date).toLocaleDateString() : ''}</span>
                                </div>
                                <h4 className={`text-xs mb-1 truncate ${msg.flags?.includes('SEEN') ? 'text-gray-500' : 'text-gray-900 font-bold'}`}>{msg.subject || '(Sem Assunto)'}</h4>
                                <p className="text-[10px] text-gray-400 line-clamp-2">{msg.snippet || '...'}</p>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* 3. Message View / Compose View */}
            <div className={`flex-1 flex flex-col bg-white ${!selectedMessage && !isComposing ? 'hidden md:flex items-center justify-center bg-gray-50/30' : 'flex'}`}>
                {isComposing && selectedAccount && companyInfo ? (
                    <EmailCompose
                        account={selectedAccount}
                        companyInfo={companyInfo}
                        currentUser={currentUser}
                        onClose={() => {
                            setIsComposing(false);
                            setComposeData({});
                        }}
                        onSent={() => {
                            setIsComposing(false);
                            setComposeData({});
                            if (selectedFolder) loadMsgs(selectedFolder);
                        }}
                        initialRecipient={composeData.to}
                        initialSubject={composeData.subject}
                        initialBody={composeData.body}
                    />
                ) : !selectedMessage ? (
                    <div className="text-center text-gray-300">
                        <Mail size={48} className="mx-auto mb-4 opacity-20" />
                        <p className="font-medium">Selecione uma mensagem para ler</p>
                        <button
                            onClick={handleNewEmail}
                            className="mt-4 text-[10px] font-black uppercase text-emerald-600 hover:underline"
                        >
                            Ou clique aqui para escrever
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col h-full animate-in fade-in">
                        {/* Header */}
                        <div className="p-6 border-b border-gray-100 text-emerald-950">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h2 className="text-xl font-bold mb-2">{selectedMessage.subject}</h2>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold uppercase">
                                            {selectedMessage.from_name?.[0] || selectedMessage.from_addr?.[0] || '?'}
                                        </div>
                                        <div>
                                            <div className="font-bold text-sm">{selectedMessage.from_name} <span className="text-gray-400 font-normal">&lt;{selectedMessage.from_addr}&gt;</span></div>
                                            <div className="text-xs text-gray-400">Para: {selectedMessage.to_addr?.join(', ')}</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-xs text-gray-400 font-medium">
                                    {selectedMessage.date ? new Date(selectedMessage.date).toLocaleString() : ''}
                                </div>
                            </div>

                            {/* Actions toolbar */}
                            <div className="flex gap-2">
                                <button
                                    onClick={handleReply}
                                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black uppercase tracking-widest transition-all shadow-md shadow-emerald-100"
                                >
                                    Responder
                                </button>
                                <button
                                    onClick={handleForward}
                                    className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-black uppercase tracking-widest transition-all"
                                >
                                    Encaminhar
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-8">
                            <div className="prose prose-sm max-w-none text-gray-600">
                                {selectedMessage.body_structure?.html ? (
                                    <div dangerouslySetInnerHTML={{ __html: selectedMessage.body_structure.html }} />
                                ) : (
                                    <div dangerouslySetInnerHTML={{ __html: (selectedMessage.snippet || '<i>Conteúdo indisponível</i>').replace(/\n/g, '<br/>') }} />
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
