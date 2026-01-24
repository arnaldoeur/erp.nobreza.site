
import React, { useState, useMemo, useEffect } from 'react';
import {
   FilePlus,
   FileText,
   Search,
   Printer,
   X,
   Truck,
   Users,
   Plus,
   Trash2,
   ChevronRight,
   TrendingUp,
   Clock,
   FileCheck,
   Fingerprint,
   Edit2,
   MapPin,
   Mail,
   Phone,
   Coffee,
   Download,
   ShieldCheck,
   ChevronLeft
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Product, BillingDocument, DocumentType, CompanyInfo, SaleItem, Supplier, Customer, User } from '../types';
import { MOCK_SUPPLIERS, MOCK_CUSTOMERS, MOCK_USER } from '../constants';
import { LogService } from '../services/log.service';

interface BillingProps {
   products: Product[];
   companyInfo: CompanyInfo;
   documents: BillingDocument[];
   onAddDocument: (doc: BillingDocument) => void;
   onDeleteDocument: (id: string) => void;
   initialCreateMode?: boolean;
   initialType?: DocumentType;
   onModeHandled?: () => void;
   suppliers: Supplier[];
   customers: Customer[];
   currentUser: User;
}

export const Billing: React.FC<BillingProps> = ({ products, companyInfo, documents, onAddDocument, onDeleteDocument, initialCreateMode, initialType, onModeHandled, suppliers, customers, currentUser }) => {
   const [view, setView] = useState<'DASHBOARD' | 'CREATE' | 'PREVIEW'>('DASHBOARD');
   const [selectedDoc, setSelectedDoc] = useState<BillingDocument | null>(null);
   const [docType, setDocType] = useState<DocumentType>('INVOICE');
   const [targetName, setTargetName] = useState('');
   const [items, setItems] = useState<SaleItem[]>([]);
   const [searchTerm, setSearchTerm] = useState('');

   useEffect(() => {
      if (initialCreateMode) {
         setView('CREATE');
         if (initialType) setDocType(initialType);
         onModeHandled?.();
      }
   }, [initialCreateMode, initialType, onModeHandled]);

   const handleDownloadPDF = async () => {
      const element = document.getElementById('invoice-preview');
      if (!element) return;

      try {
         const canvas = await html2canvas(element, { scale: 2 });
         const imgData = canvas.toDataURL('image/png');
         const pdf = new jsPDF('p', 'mm', 'a4');
         const pdfWidth = pdf.internal.pageSize.getWidth();
         const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

         pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
         pdf.save(`documento_${selectedDoc?.id || 'preview'}.pdf`);
      } catch (error) {
         console.error("Error generating PDF:", error);
         alert("Erro ao gerar PDF.");
      }
   };

   const handleCreate = () => {
      const newDoc: BillingDocument = {
         id: `${docType === 'INVOICE' ? 'FT' : 'PC'}-${Date.now().toString().slice(-6)}`,
         companyId: currentUser.companyId,
         type: docType,
         timestamp: new Date(),
         items: [...items],
         total: items.reduce((sum, i) => sum + i.total, 0),
         targetName,
         status: 'SENT',
         performedBy: currentUser.name
      };
      onAddDocument(newDoc);
      setSelectedDoc(newDoc);
      setView('PREVIEW');
      setItems([]);
      setTargetName('');

      LogService.add({
         action: docType === 'INVOICE' ? 'Emissão de Fatura' : 'Emissão de Pedido',
         details: `${docType === 'INVOICE' ? 'Fatura' : 'Pedido'} #${newDoc.id} para ${targetName} - Total: MT ${newDoc.total.toLocaleString()}`,
         companyId: currentUser.companyId
      });
   };

   const filteredProducts = products.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.code.toLowerCase().includes(searchTerm.toLowerCase())
   );

   const addItem = (p: Product) => {
      setItems(prev => {
         const existing = prev.find(i => i.productId === p.id);
         const unit = docType === 'PURCHASE_ORDER' ? p.purchasePrice : p.salePrice;
         if (existing) return prev.map(i => i.productId === p.id ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.unitPrice } : i);
         return [...prev, { productId: p.id, productName: p.name, quantity: 1, unitPrice: unit, total: unit }];
      });
   };

   const handleEdit = () => {
      if (!selectedDoc) return;
      setDocType(selectedDoc.type);
      setTargetName(selectedDoc.targetName);
      setItems([...selectedDoc.items]);
      setView('CREATE');
   };

   if (view === 'PREVIEW' && selectedDoc) {
      return (
         <div className="fixed inset-0 z-[200] bg-white flex flex-col animate-in slide-in-from-bottom-4 duration-300">
            <div className="h-16 border-b flex items-center justify-between px-6 shrink-0 bg-gray-50 print:hidden">
               <button onClick={() => setView('DASHBOARD')} className="p-2 -ml-2"><ChevronLeft size={32} /></button>
               <h3 className="font-black text-xs uppercase tracking-widest">Visualizar Documento</h3>
               <div className="flex gap-2">
                  <button className="p-2 text-emerald-700 hover:bg-emerald-50 rounded-lg" onClick={handleDownloadPDF}><Download size={24} /></button>
                  <button className="p-2 text-emerald-700 hover:bg-emerald-50 rounded-lg" onClick={() => window.print()}><Printer size={24} /></button>
               </div>
            </div>

            <DocumentPreview
               doc={selectedDoc}
               companyInfo={companyInfo}
               onEdit={handleEdit}
               onDelete={() => {
                  if (confirm("Apagar este documento?")) {
                     onDeleteDocument(selectedDoc.id);
                     setView('DASHBOARD');
                     setSelectedDoc(null);
                  }
               }}
            />
         </div>
      );
   }

   if (view === 'CREATE') {
      return (
         <div className="flex flex-col h-full gap-4 pb-32">
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col gap-6">
               <div className="flex items-center justify-between">
                  <button onClick={() => setView('DASHBOARD')} className="p-2 -ml-2 text-emerald-900"><ChevronLeft size={32} /></button>
                  <h3 className="text-lg font-black uppercase text-emerald-950">Emissão</h3>
                  <div className="w-10"></div>
               </div>

               <div className="flex gap-2">
                  <button onClick={() => setDocType('INVOICE')} className={`flex-1 py-4 rounded-xl font-black text-[10px] uppercase border-2 transition-all ${docType === 'INVOICE' ? 'bg-emerald-950 text-white border-emerald-950 shadow-lg' : 'text-gray-400'}`}>Fatura</button>
                  <button onClick={() => setDocType('PURCHASE_ORDER')} className={`flex-1 py-4 rounded-xl font-black text-[10px] uppercase border-2 transition-all ${docType === 'PURCHASE_ORDER' ? 'bg-blue-950 text-white border-blue-950 shadow-lg' : 'text-gray-400'}`}>Pedido</button>
               </div>

               <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase px-1">Destinatário</label>
                  <select className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none" value={targetName} onChange={e => setTargetName(e.target.value)}>
                     <option value="">Selecione...</option>
                     {(docType === 'INVOICE' ? customers : suppliers).map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
                  </select>
               </div>
            </div>

            <div className="bg-white flex-1 p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col overflow-hidden">
               <div className="relative mb-4 shrink-0">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input className="w-full pl-11 pr-4 py-4 bg-gray-50 rounded-2xl text-sm font-bold" placeholder="Pesquisar catálogo..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
               </div>
               <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {filteredProducts.map(p => (
                     <button key={p.id} onClick={() => addItem(p)} className="w-full p-4 bg-white border border-gray-50 rounded-2xl flex justify-between items-center active:bg-emerald-50 transition-all shadow-sm">
                        <div className="text-left min-w-0 flex-1 pr-4">
                           <p className="font-black text-emerald-950 text-[11px] uppercase truncate">{p.name}</p>
                           <p className="text-[9px] text-gray-400 font-bold">MT {docType === 'PURCHASE_ORDER' ? p.purchasePrice : p.salePrice}</p>
                        </div>
                        <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center text-emerald-600"><Plus size={18} /></div>
                     </button>
                  ))}
               </div>
            </div>

            {items.length > 0 && (
               <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 p-6 z-[160] flex flex-col md:flex-row items-center gap-6 animate-in slide-in-from-bottom-8 md:pl-80">
                  <div className="flex-1 flex justify-between items-center w-full">
                     <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Estimado</p>
                        <p className="text-3xl font-black text-emerald-950">MT {items.reduce((a, b) => a + b.total, 0).toLocaleString()}</p>
                     </div>
                     <div className="text-right">
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{items.length} ITENS</p>
                     </div>
                  </div>
                  <button
                     disabled={!targetName}
                     onClick={handleCreate}
                     className="w-full md:w-auto px-12 py-4 bg-emerald-950 text-white rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 disabled:bg-gray-200 disabled:text-gray-400 hover:bg-emerald-900 transition-all"
                  >
                     {docType === 'INVOICE' ? 'EMITIR FATURA' : 'GERAR PEDIDO'}
                  </button>
               </div>
            )}
         </div>
      );
   }

   return (
      <div className="space-y-6 animate-in fade-in">
         <div className="bg-white p-6 rounded-[2rem] shadow-sm border flex justify-between items-center">
            <div>
               <h3 className="text-xl font-black text-emerald-950 uppercase leading-none">Documentos</h3>
               <p className="text-[9px] text-gray-400 font-bold uppercase mt-2">Histórico de Faturamento</p>
            </div>
            <button onClick={() => setView('CREATE')} className="p-4 bg-emerald-700 text-white rounded-2xl shadow-xl"><Plus size={24} /></button>
         </div>

         <div className="space-y-3">
            {documents.length === 0 ? (
               <div className="py-20 text-center opacity-10 flex flex-col items-center gap-4"><FileText size={80} /><p className="font-black text-xs uppercase tracking-widest">Sem Documentos</p></div>
            ) : (
               documents.map(doc => (
                  <div key={doc.id} onClick={() => { setSelectedDoc(doc); setView('PREVIEW'); }} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 active:bg-gray-50 transition-all">
                     <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${doc.type === 'INVOICE' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                        <FileText size={24} />
                     </div>
                     <div className="flex-1 min-w-0">
                        <p className="font-black text-emerald-950 text-xs uppercase">#{doc.id}</p>
                        <p className="text-[10px] text-gray-400 font-black uppercase truncate mt-0.5">{doc.targetName}</p>
                     </div>
                     <div className="text-right">
                        <p className="text-sm font-black text-emerald-950">MT {doc.total.toFixed(0)}</p>
                        <p className="text-[9px] text-gray-400 font-bold uppercase">{new Date(doc.timestamp).toLocaleDateString()}</p>
                     </div>
                     <ChevronRight size={16} className="text-gray-200" />
                  </div>
               ))
            )}
         </div>
      </div>
   );
};

const DocumentPreview = ({ doc, companyInfo, onEdit, onDelete }: { doc: BillingDocument, companyInfo: CompanyInfo, onEdit: () => void, onDelete: () => void }) => (
   <div className="flex-1 overflow-auto p-4 md:p-8 bg-gray-100/50 dark:bg-slate-900/50">
      <div id="invoice-preview" className="bg-white mx-auto max-w-4xl min-h-[297mm] shadow-2xl relative overflow-hidden flex flex-col text-slate-900">
         {/* ... (Existing Content) ... */}
         {/* Modern Header with Pattern */}
         <div className="absolute top-0 left-0 right-0 h-4 bg-emerald-950"></div>
         <div className="p-12 md:p-16 flex justify-between items-start pb-8">
            <div>
               {/* Logo: Prioritize Horizontal for Docs */}
               {(companyInfo.logoHorizontal || companyInfo.logo) && (
                  <img src={companyInfo.logoHorizontal || companyInfo.logo} className="h-24 mb-6 object-contain" alt="Logo" />
               )}
               <h1 className="text-4xl font-black text-emerald-950 uppercase tracking-tighter mb-2">{companyInfo.name}</h1>
               <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{companyInfo.slogan}</p>
            </div>
            <div className="text-right">
               <h2 className="text-5xl font-black text-gray-100 uppercase tracking-tighter">Fatura</h2>
               <div className="mt-4 space-y-1 text-[10px] uppercase font-bold text-gray-500">
                  <p>Data: <span className="text-emerald-950">{new Date(doc.timestamp).toLocaleDateString()}</span></p>
                  <p>Documento: <span className="text-emerald-950">#{doc.id}</span></p>
                  <p>Emitido Por: <span className="text-emerald-950">{doc.performedBy}</span></p>
               </div>
            </div>
         </div>

         {/* Info Grid */}
         <div className="px-12 md:px-16 grid grid-cols-2 gap-12 mb-12">
            <div>
               <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-100 pb-2">De:</p>
               <p className="font-bold text-sm text-gray-800">{companyInfo.name}</p>
               <p className="text-xs text-gray-500 mt-1">{companyInfo.address}</p>
               <p className="text-xs text-gray-500 mt-1 font-mono">NUIT: {companyInfo.nuit}</p>
               <p className="text-xs text-gray-500">{companyInfo.email}</p>
            </div>
            <div>
               <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-100 pb-2">Para:</p>
               <p className="font-bold text-sm text-emerald-950 uppercase">{doc.targetName}</p>
               <p className="text-xs text-gray-500 mt-1">Cliente / Fornecedor</p>
            </div>
         </div>

         {/* Table */}
         <div className="flex-1 px-12 md:px-16">
            <table className="w-full text-left">
               <thead>
                  <tr className="border-b-2 border-emerald-950">
                     <th className="py-4 text-[10px] font-black uppercase text-emerald-950 tracking-wider">Descrição do Item</th>
                     <th className="py-4 text-center text-[10px] font-black uppercase text-emerald-950 tracking-wider w-24">Qtd</th>
                     <th className="py-4 text-right text-[10px] font-black uppercase text-emerald-950 tracking-wider w-32">Preço Unit.</th>
                     <th className="py-4 text-right text-[10px] font-black uppercase text-emerald-950 tracking-wider w-32">Total</th>
                  </tr>
               </thead>
               <tbody className="text-xs">
                  {doc.items.map((item, i) => (
                     <tr key={i} className="border-b border-gray-100">
                        <td className="py-4 font-bold text-gray-700 uppercase">{item.productName}</td>
                        <td className="py-4 text-center font-medium text-gray-500">{item.quantity}</td>
                        <td className="py-4 text-right font-medium text-gray-500">{item.unitPrice.toLocaleString()}</td>
                        <td className="py-4 text-right font-black text-emerald-950">{item.total.toLocaleString()}</td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>

         {/* Total & Footer */}
         <div className="px-12 md:px-16 pb-12 md:pb-16 mt-8">
            <div className="flex justify-end mb-12">
               <div className="w-64">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                     <span className="text-[10px] font-bold text-gray-400 uppercase">Subtotal</span>
                     <span className="text-sm font-bold text-gray-700">MT {doc.total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-4">
                     <span className="text-xs font-black text-emerald-950 uppercase">Total Geral</span>
                     <span className="text-2xl font-black text-emerald-600">MT {doc.total.toLocaleString()}</span>
                  </div>
               </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[9px] uppercase font-bold text-gray-400">
               <p>Documento processado por computador.</p>
               <div className="flex gap-4">
                  <span>{companyInfo.website || 'nobreza.co.mz'}</span>
                  <span>•</span>
                  <span>Gerado em {new Date().toLocaleDateString()}</span>
               </div>
            </div>
         </div>
      </div>

      {/* Action Buttons */}
      <div className="fixed bottom-8 right-8 print:hidden flex items-center gap-4">
         <button onClick={onDelete} className="bg-white text-red-600 p-4 rounded-full shadow-xl hover:bg-red-50 transition-all flex items-center gap-2 border border-red-100">
            <Trash2 size={20} /> <span className="font-black text-xs uppercase pr-2">Apagar</span>
         </button>
         <button onClick={onEdit} className="bg-emerald-950 text-white p-4 rounded-full shadow-2xl hover:bg-emerald-900 transition-all flex items-center gap-2">
            <Edit2 size={20} /> <span className="font-black text-xs uppercase pr-2">Editar</span>
         </button>
      </div>
   </div>
);
