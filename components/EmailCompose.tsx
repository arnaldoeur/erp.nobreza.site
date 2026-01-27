import React, { useState } from 'react';
import { X, Send, Paperclip, Type, Image as ImageIcon, Sparkles, Loader2, PenSquare, Bold, Italic, List, AlignLeft, Info } from 'lucide-react';
import { EmailAccount, CompanyInfo, User } from '../types';
import { EmailClientService } from '../services/email-client.service';

interface EmailComposeProps {
    account: EmailAccount;
    companyInfo: CompanyInfo;
    onClose: () => void;
    onSent: () => void;
    initialRecipient?: string;
    initialSubject?: string;
    initialBody?: string;
    currentUser: User;
}

export const EmailCompose: React.FC<EmailComposeProps> = ({
    account, companyInfo, onClose, onSent, currentUser,
    initialRecipient = '', initialSubject = '', initialBody = ''
}) => {
    const [loading, setLoading] = useState(false);
    const [to, setTo] = useState(initialRecipient);
    const [subject, setSubject] = useState(initialSubject);
    const [body, setBody] = useState(initialBody);
    const [showPreview, setShowPreview] = useState(false);
    const [attachments, setAttachments] = useState<File[]>([]);

    const ensureAbsoluteUrl = (url: string) => {
        if (!url) return '';
        const trimmed = url.trim();
        if (trimmed.startsWith('http') || trimmed.startsWith('data:')) return trimmed;
        // If it's a local path, we attempt to use current origin. 
        // Note: For production, this will work. For localhost, it won't be visible to others.
        return `${window.location.protocol}//${window.location.host}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
    };

    const logoUrl = ensureAbsoluteUrl(companyInfo.logoHorizontal || companyInfo.logo || '');

    const signatureHtml = `
<div style="font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif; border-top: 2px solid #10b981; padding-top: 24px; margin-top: 40px; max-width: 500px;">
    <table border="0" cellpadding="0" cellspacing="0" style="width: 100%;">
        <tr>
            ${logoUrl ? `<td style="vertical-align: top; padding-bottom: 20px;" colspan="2">
                <img src="${logoUrl}" alt="Logotipo" style="max-height: 80px; max-width: 250px; width: auto; height: auto; display: block; filter: saturate(1.1) brightness(1.05);" />
            </td>` : ''}
        </tr>
        <tr>
            <td style="vertical-align: top;">
                <div style="font-weight: 800; color: #064e3b; text-transform: uppercase; font-size: 15px; letter-spacing: 0.05em; margin-bottom: 2px; line-height: 1.2;">${companyInfo.name}</div>
                <div style="color: #10b981; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px; line-height: 1;">${companyInfo.slogan || 'Gestão Inteligente de Farmácias'}</div>
                
                <div style="margin-bottom: 16px;">
                    <div style="font-size: 13px; font-weight: 800; color: #1e293b; line-height: 1;">${currentUser.name}</div>
                    <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px;">${currentUser.responsibility || 'Equipa Nobreza'}</div>
                </div>

                <div style="margin-bottom: 12px; display: flex; align-items: center; gap: 15px;">
                    ${companyInfo.phone ? `<span style="font-size: 11px; color: #475569; font-weight: 600; display: inline-flex; align-items: center;">
                        <span style="margin-right: 4px; opacity: 0.8;">📞</span> <a href="tel:${companyInfo.phone}" style="color: #475569; text-decoration: none;">${companyInfo.phone}</a>
                    </span>` : ''}
                    ${companyInfo.website ? `<span style="font-size: 11px; color: #475569; font-weight: 600; display: inline-flex; align-items: center; margin-left: 10px;">
                        <span style="margin-right: 4px; opacity: 0.8;">🌐</span> <a href="${companyInfo.website.startsWith('http') ? companyInfo.website : 'https://' + companyInfo.website}" style="color: #475569; text-decoration: none;">${companyInfo.website}</a>
                    </span>` : ''}
                </div>

                <div style="background-color: #f8fafc; border-radius: 8px; padding: 10px 15px; display: inline-block;">
                    <div style="font-size: 9px; color: #94a3b8; font-weight: 600; letter-spacing: 0.025em; text-transform: uppercase;">
                        Eco-friendly ERP • <span style="color: #059669;">Nobreza ERP</span> by <span style="color: #064e3b; font-weight: 800;">Zyph Tech, Lda</span>
                    </div>
                </div>
            </td>
        </tr>
    </table>
</div>
    `;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setAttachments(prev => [...prev, ...newFiles]);
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const base64 = (reader.result as string).split(',')[1];
                resolve(base64);
            };
            reader.onerror = error => reject(error);
        });
    };

    const execCmd = (cmd: string, value?: string) => {
        document.execCommand(cmd, false, value || '');
    };

    const handleSend = async () => {
        const editor = document.getElementById('email-editor');
        const contentHtml = editor?.innerHTML || '';

        if (!to || !subject) return alert("Por favor, preencha o destinatário e o assunto.");
        setLoading(true);
        try {
            // Process attachments
            const processedAttachments = await Promise.all(
                attachments.map(async file => ({
                    filename: file.name,
                    content: await fileToBase64(file)
                }))
            );

            // Combine body and signature for the final HTML
            const finalHtml = `
                <div style="font-family: 'Inter', sans-serif; color: #1e293b; line-height: 1.6; font-size: 14px;">
                    ${contentHtml}
                    ${signatureHtml}
                </div>
            `;

            await EmailClientService.sendEmailViaResend(
                `${account.display_name} <${account.email.toLowerCase()}>`,
                [to],
                subject,
                finalHtml,
                processedAttachments.length > 0 ? processedAttachments : undefined
            );

            // Log if it's a system account or just general
            if (account.account_type === 'SYSTEM' || account.id.startsWith('virtual-')) {
                await EmailClientService.logSystemEmail({
                    company_id: companyInfo.id,
                    to_addr: [to],
                    subject,
                    body_html: finalHtml
                });
            }

            alert("E-mail enviado com sucesso!");
            onSent();
        } catch (e: any) {
            alert("Erro ao enviar: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col bg-white h-full animate-in slide-in-from-right-4 duration-500">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-600 rounded-lg text-white shadow-lg shadow-emerald-100">
                        <PenSquare size={18} />
                    </div>
                    <div>
                        <h2 className="text-sm font-black uppercase tracking-tight text-emerald-950">Nova Mensagem</h2>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Enviando via {account.display_name} &lt;{account.email}&gt;</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
                    <X size={20} />
                </button>
            </div>

            {/* Form */}
            <div className="flex-1 p-8 space-y-6 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="group transition-all">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block group-focus-within:text-emerald-600">Para</label>
                        <input
                            value={to}
                            onChange={e => setTo(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold focus:bg-white focus:border-emerald-500 outline-none transition-all shadow-sm"
                            placeholder="ex: cliente@email.com"
                        />
                    </div>
                    <div className="group transition-all">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block group-focus-within:text-emerald-600">Assunto</label>
                        <input
                            value={subject}
                            onChange={e => setSubject(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold focus:bg-white focus:border-emerald-500 outline-none transition-all shadow-sm"
                            placeholder="Qual o motivo deste e-mail?"
                        />
                    </div>
                </div>

                <div className="relative group flex-1">
                    <div className="flex justify-between items-center mb-1 ml-1">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block group-focus-within:text-emerald-600">Mensagem</label>
                    </div>

                    <div className="flex flex-col border border-gray-100 rounded-2xl bg-gray-50/50 shadow-inner overflow-hidden focus-within:border-emerald-500 focus-within:bg-white transition-all ring-emerald-50 focus-within:ring-4">
                        {/* Toolbar */}
                        <div className="flex items-center gap-1 p-3 bg-gray-100/80 border-b border-gray-100 backdrop-blur-sm sticky top-0 z-10">
                            <button onClick={() => execCmd('bold')} className="p-2 hover:bg-white rounded-lg transition-all text-gray-600 hover:text-emerald-600 hover:shadow-sm active:scale-95" title="Negrito"><Bold size={16} /></button>
                            <button onClick={() => execCmd('italic')} className="p-2 hover:bg-white rounded-lg transition-all text-gray-600 hover:text-emerald-600 hover:shadow-sm active:scale-95" title="Itálico"><Italic size={16} /></button>
                            <div className="w-px h-6 bg-gray-200 mx-2" />
                            <button onClick={() => execCmd('insertUnorderedList')} className="p-2 hover:bg-white rounded-lg transition-all text-gray-600 hover:text-emerald-600 hover:shadow-sm active:scale-95" title="Lista"><List size={16} /></button>
                            <button onClick={() => execCmd('justifyLeft')} className="p-2 hover:bg-white rounded-lg transition-all text-gray-600 hover:text-emerald-600 hover:shadow-sm active:scale-95" title="Alinhar Esquerda"><AlignLeft size={16} /></button>
                        </div>

                        {/* Rich Editor */}
                        <div
                            id="email-editor"
                            contentEditable
                            className="w-full p-8 text-sm font-medium outline-none min-h-[300px] max-h-[500px] overflow-y-auto leading-relaxed text-gray-700"
                            dangerouslySetInnerHTML={{ __html: initialBody.replace(/\n/g, '<br/>') }}
                        />
                    </div>

                    {/* Attachment List */}
                    {attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {attachments.map((file, idx) => (
                                <div key={idx} className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg">
                                    <Paperclip size={12} className="text-emerald-600" />
                                    <span className="text-[10px] font-bold text-emerald-950 truncate max-w-[150px]">{file.name}</span>
                                    <button
                                        onClick={() => removeAttachment(idx)}
                                        className="hover:text-red-500 transition-colors"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {showPreview && (
                        <div className="mt-4 w-full bg-emerald-50/30 border border-emerald-100 rounded-2xl p-6 animate-in fade-in zoom-in-95 duration-300">
                            <h3 className="text-[9px] font-black uppercase text-emerald-600 mb-4 tracking-widest">Sua Assinatura Premium</h3>
                            <div dangerouslySetInnerHTML={{ __html: signatureHtml }} />
                        </div>
                    )}

                    <div className="mt-6 flex flex-col md:flex-row justify-between items-center gap-4">
                        <button
                            onClick={() => setShowPreview(!showPreview)}
                            className="group flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 px-4 py-2 rounded-xl transition-all"
                        >
                            <Sparkles size={14} className="text-emerald-600" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
                                {showPreview ? 'Ocultar Assinatura' : 'Ver Assinatura Premium'}
                            </span>
                        </button>

                        <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl flex items-center gap-3">
                            <Info size={14} className="text-gray-400" />
                            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-tight">E-mail formatado profissionalmente.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-white border-t border-gray-100 flex justify-between items-center">
                <div className="flex gap-2">
                    <button
                        onClick={() => document.getElementById('email-attach')?.click()}
                        className="p-3 text-gray-400 hover:bg-gray-100 hover:text-emerald-600 rounded-xl transition-colors relative"
                    >
                        <Paperclip size={20} />
                        {attachments.length > 0 && (
                            <span className="absolute top-2 right-2 w-4 h-4 bg-emerald-600 text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-white">
                                {attachments.length}
                            </span>
                        )}
                        <input type="file" id="email-attach" className="hidden" multiple onChange={handleFileChange} />
                    </button>
                    <button className="p-3 text-gray-400 hover:bg-gray-100 rounded-xl transition-colors"><Type size={20} /></button>
                    <button
                        onClick={() => document.getElementById('email-photo')?.click()}
                        className="p-3 text-gray-400 hover:bg-gray-100 hover:text-emerald-600 rounded-xl transition-colors"
                    >
                        <ImageIcon size={20} />
                        <input type="file" id="email-photo" className="hidden" accept="image/*" onChange={handleFileChange} />
                    </button>
                </div>
                <button
                    onClick={handleSend}
                    disabled={loading}
                    className="bg-emerald-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200 flex items-center gap-3 disabled:opacity-50 active:scale-95"
                >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                    {loading ? 'A enviar...' : 'Enviar Mensagem'}
                </button>
            </div>
        </div>
    );
};
