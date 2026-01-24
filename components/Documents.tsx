import React, { useState, useEffect } from 'react';
import { FolderCheck, FileText, Download, Share2, Search, Filter, Plus, X, Trash2, Globe } from 'lucide-react';
import { CollabService, CollabDoc } from '../services/collab.service';
import { User } from '../types';

interface DocumentsProps {
    currentUser: User;
}

export const Documents: React.FC<DocumentsProps> = ({ currentUser }) => {
    const [docs, setDocs] = useState<CollabDoc[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        loadDocs();
    }, []);

    const loadDocs = async () => {
        try {
            const data = await CollabService.getDocs();
            setDocs(data || []);
        } catch (e: any) {
            console.error(e);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Excluir este registo de documento?")) return;
        await CollabService.deleteDoc(id);
        loadDocs();
    };

    const filteredDocs = docs.filter(d =>
        (d.name && d.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (d.category && d.category.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            if (file.type.startsWith('image/')) {
                const url = URL.createObjectURL(file);
                setPreviewUrl(url);
            } else {
                setPreviewUrl(null);
            }
        }
    };

    const handleAddDoc = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        // Ensure we explicitly use the file from state or input (formData gets it automatically from input name="file")
        const file = formData.get('file') as File;

        if (!file || file.size === 0) {
            alert("Por favor, selecione um ficheiro.");
            return;
        }

        try {
            const file_url = await CollabService.uploadFile(file);

            const doc: CollabDoc = {
                company_id: currentUser.companyId,
                user_id: currentUser.id,
                name: formData.get('name') as string || file.name,
                category: formData.get('category') as string,
                file_url: file_url,
                file_type: file.type || 'unknown'
            };

            await CollabService.saveDoc(doc);
            setIsModalOpen(false);
            setPreviewUrl(null);
            setSelectedFile(null);
            loadDocs();
        } catch (e: any) {
            console.error(e);
            alert("Erro detalhado: " + (e.message || JSON.stringify(e)));
        }
    };

    const [viewDoc, setViewDoc] = useState<CollabDoc | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editName, setEditName] = useState('');

    const handleOpenPreview = (doc: CollabDoc) => {
        setViewDoc(doc);
        setIsEditMode(false);
        setEditName(doc.name);
    };

    const handleUpdateDoc = async () => {
        if (!viewDoc || !viewDoc.id) return;
        try {
            await CollabService.saveDoc({
                ...viewDoc,
                name: editName
            });
            setIsEditMode(false);
            setViewDoc(prev => prev ? { ...prev, name: editName } : null);
            loadDocs();
        } catch (e: any) {
            alert("Erro ao atualizar: " + e.message);
        }
    };

    const handleShare = async () => {
        if (!viewDoc) return;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: viewDoc.name,
                    text: `Documento: ${viewDoc.name}`,
                    url: viewDoc.file_url
                });
            } catch (error) {
                console.log('Error sharing:', error);
            }
        } else {
            // Fallback
            navigator.clipboard.writeText(viewDoc.file_url);
            alert("Link copiado para a área de transferência!");
        }
    };

    const handlePrint = () => {
        if (!viewDoc) return;
        const printWindow = window.open(viewDoc.file_url, '_blank');
        printWindow?.print();
    };

    return (
        <div className="h-full flex flex-col gap-6 animate-in fade-in duration-500 overflow-hidden">
            <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-100 shrink-0">
                <div>
                    <h2 className="text-2xl font-black text-slate-950 tracking-tight uppercase">Repositório de Documentos</h2>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Armazenamento organizado de arquivos da empresa</p>
                </div>
                <div className="flex gap-3">
                    {/* DEBUG INFO */}
                    <div className="hidden lg:flex items-center px-4 py-2 bg-slate-50 rounded-xl text-[10px] font-bold text-slate-400">
                        DEBUG: {docs.length} docs loaded
                    </div>
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-11 pr-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none font-bold text-xs w-64 transition-all"
                            placeholder="Pesquisar arquivos..."
                        />
                    </div>
                    <button
                        onClick={() => { setIsModalOpen(true); setPreviewUrl(null); setSelectedFile(null); }}
                        className="bg-emerald-950 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-3 text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-900/20 active:scale-95 transition-all"
                    >
                        <Plus size={18} /> Carregar Arquivo
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-left min-w-[800px]">
                        <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                            <tr>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome do Arquivo</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoria</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Enviado Por</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                                <th className="px-8 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredDocs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3 text-slate-300">
                                            <FolderCheck size={48} strokeWidth={1} />
                                            <p className="text-sm font-bold uppercase tracking-widest">Nenhum documento encontrado</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredDocs.map(doc => (
                                    <tr key={doc.id} onClick={() => handleOpenPreview(doc)} className="hover:bg-slate-50/50 transition-colors group cursor-pointer">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                                    <FileText size={20} />
                                                </div>
                                                <span className="text-sm font-bold text-slate-700">{doc.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="text-[10px] font-black uppercase text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{doc.category}</span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="text-[10px] font-bold text-slate-500">{doc.users?.name || 'Sistema'}</span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                                {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : '-'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex justify-center gap-2" onClick={e => e.stopPropagation()}>
                                                <button
                                                    onClick={() => handleOpenPreview(doc)}
                                                    className="p-2 text-slate-300 hover:text-emerald-500 transition-colors"
                                                    title="Editar Detalhes"
                                                >
                                                    <FileText size={18} />
                                                </button>
                                                <a
                                                    href={doc.file_url}
                                                    download
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2 text-slate-300 hover:text-blue-500 transition-colors"
                                                    title="Baixar"
                                                >
                                                    <Download size={18} />
                                                </a>
                                                <button
                                                    onClick={() => handleDelete(doc.id!)}
                                                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                                    title="Excluir"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* PREVIEW MODAL */}
            {viewDoc && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-5xl h-[85vh] rounded-[2.5rem] p-0 shadow-2xl relative animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col">

                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                            <div>
                                {isEditMode ? (
                                    <div className="flex gap-2">
                                        <input
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="text-xl font-black text-slate-950 uppercase tracking-tight bg-slate-50 px-2 py-1 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 w-full"
                                        />
                                        <select
                                            value={viewDoc.category}
                                            onChange={(e) => setViewDoc({ ...viewDoc, category: e.target.value })}
                                            className="text-sm font-bold bg-slate-50 px-2 py-1 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                                        >
                                            <option value="Legal">Legal</option>
                                            <option value="Financeiro">Financeiro</option>
                                            <option value="Contratos">Contratos</option>
                                            <option value="Políticas">Políticas</option>
                                            <option value="Outros">Outros</option>
                                        </select>
                                    </div>
                                ) : (
                                    <h3 className="text-xl font-black text-slate-950 uppercase tracking-tight">{viewDoc.name}</h3>
                                )}
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                                    Enviado por {viewDoc.users?.name || 'Sistema'} • {viewDoc.category}
                                    {viewDoc.last_modified_at && (
                                        <span className="ml-2 pl-2 border-l border-slate-200">
                                            Atualizado em {new Date(viewDoc.last_modified_at).toLocaleDateString()}
                                        </span>
                                    )}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {isEditMode ? (
                                    <button onClick={handleUpdateDoc} className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-600 transition-colors">
                                        Salvar
                                    </button>
                                ) : (
                                    <button onClick={() => setIsEditMode(true)} className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-colors">
                                        Editar
                                    </button>
                                )}

                                <div className="h-8 w-px bg-slate-200 mx-2"></div>

                                <button onClick={handleShare} className="p-2 text-slate-400 hover:text-blue-500 transition-colors" title="Partilhar">
                                    <Share2 size={20} />
                                </button>
                                <button onClick={handlePrint} className="p-2 text-slate-400 hover:text-slate-700 transition-colors" title="Imprimir">
                                    <FileText size={20} />
                                </button>
                                <a href={viewDoc.file_url} download target="_blank" rel="noopener noreferrer" className="p-2 text-slate-400 hover:text-emerald-500 transition-colors" title="Baixar">
                                    <Download size={20} />
                                </a>
                                <button onClick={() => setViewDoc(null)} className="ml-4 p-2 bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-all"><X size={20} /></button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 bg-slate-50 relative overflow-hidden">
                            {viewDoc.file_type.startsWith('image/') ? (
                                <div className="w-full h-full flex items-center justify-center p-8">
                                    <img src={viewDoc.file_url} className="max-w-full max-h-full object-contain rounded-lg shadow-lg" alt="Preview" />
                                </div>
                            ) : (
                                <iframe src={viewDoc.file_url} className="w-full h-full border-none" title="Document Preview"></iframe>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition-all"><X size={20} /></button>

                        <div className="mb-8">
                            <h3 className="text-2xl font-black text-slate-950 uppercase tracking-tight">Novo Documento</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Carregue um ficheiro para o servidor</p>
                        </div>

                        <form onSubmit={handleAddDoc} className="space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Nome do Arquivo</label>
                                    <input name="name" required placeholder="Ex: Alvará_2026.pdf" className="w-full px-6 py-3.5 bg-slate-50 rounded-2xl text-sm font-bold border-2 border-transparent focus:border-emerald-500 outline-none transition-all" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Categoria</label>
                                    <select name="category" className="w-full px-6 py-3.5 bg-slate-50 rounded-2xl text-sm font-bold border-2 border-transparent focus:border-emerald-500 outline-none transition-all appearance-none cursor-pointer">
                                        <option value="Legal">Legal</option>
                                        <option value="Financeiro">Financeiro</option>
                                        <option value="Contratos">Contratos</option>
                                        <option value="Políticas">Políticas</option>
                                        <option value="Outros">Outros</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Upload de Ficheiro</label>
                                    <div className="relative group">
                                        <input
                                            name="file"
                                            type="file"
                                            required
                                            onChange={handleFileChange}
                                            className="w-full px-6 py-10 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-xs font-bold text-slate-400 file:hidden cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/30 transition-all text-center"
                                        />
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none group-hover:text-emerald-600">
                                            {previewUrl ? (
                                                <div className="w-full h-full p-2">
                                                    <img src={previewUrl} alt="Preview" className="w-full h-full object-contain rounded-xl" />
                                                </div>
                                            ) : selectedFile ? (
                                                <div className="flex flex-col items-center">
                                                    <FileText size={32} className="mb-2 text-emerald-600" />
                                                    <span className="text-emerald-700">{selectedFile.name}</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <Download size={24} className="mb-2 opacity-50" />
                                                    <span>Clique ou arraste um arquivo</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button type="submit" className="w-full bg-emerald-950 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-lg shadow-emerald-950/20 active:scale-95 transition-all">
                                Adicionar Documento
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

