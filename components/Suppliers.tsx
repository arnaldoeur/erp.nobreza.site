
import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Search,
  Star,
  Mail,
  Phone,
  MapPin,
  Edit2,
  Trash2,
  X,
  Save,
  ShoppingCart,
  ChevronRight,
  Fingerprint
} from 'lucide-react';
import { Supplier, Product, BillingDocument } from '../types';
import { MOCK_USER } from '../constants';
import { SupplierService } from '../services';

interface SuppliersProps {
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  products: Product[];
  onGenerateOrder: (doc: BillingDocument) => void;
  initialModalOpen?: boolean;
  onModalHandled?: () => void;
  currentUser: any; // Using any to avoid importing User type if not already there, but better to import
}

export const Suppliers: React.FC<SuppliersProps> = ({ suppliers, setSuppliers, products, onGenerateOrder, initialModalOpen, onModalHandled, currentUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isOrderView, setIsOrderView] = useState(false);
  const [selectedSupplierForOrder, setSelectedSupplierForOrder] = useState<Supplier | null>(null);
  const [cart, setCart] = useState<{ productId: string, qty: number }[]>([]);

  useEffect(() => {
    if (initialModalOpen) {
      setIsModalOpen(true);
      setEditingSupplier(null);
      onModalHandled?.();
    }
  }, [initialModalOpen, onModalHandled]);

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newSupplier: Supplier = {
      id: editingSupplier?.id || Date.now().toString(36) + Math.random().toString(36).substr(2),
      name: formData.get('name') as string,
      nuit: formData.get('nuit') as string,
      location: formData.get('location') as string,
      contact: formData.get('contact') as string,
      email: formData.get('email') as string,
      conditions: formData.get('conditions') as string,
      estimated_delivery: formData.get('estimated_delivery') as string, // New field
      isPreferred: editingSupplier?.isPreferred || false,
      logo: editingSupplier?.logo,
      companyId: editingSupplier?.companyId || '' // Add missing companyId
    };

    try {
      if (editingSupplier && editingSupplier.id) {
        await SupplierService.update(newSupplier);
        setSuppliers(prev => prev.map(s => s.id === newSupplier.id ? newSupplier : s));
      } else {
        await SupplierService.add(newSupplier);
        setSuppliers(prev => [newSupplier, ...prev]);
      }
      setIsModalOpen(false);
      setEditingSupplier(null);
    } catch (error) {
      alert("Erro ao salvar fornecedor.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover este fornecedor?")) return;
    try {
      await SupplierService.delete(id);
      setSuppliers(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      alert("Erro ao remover fornecedor.");
    }
  };

  const togglePreferred = (id: string) => {
    setSuppliers(prev => prev.map(s => s.id === id ? { ...s, isPreferred: !s.isPreferred } : s));
  };

  const startOrder = (supplier: Supplier) => {
    setSelectedSupplierForOrder(supplier);
    setIsOrderView(true);
    setCart([]);
  };

  const addToCart = (productId: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.productId === productId);
      if (existing) return prev.map(i => i.productId === productId ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { productId, qty: 1 }];
    });
  };

  const finalizeOrder = () => {
    if (!selectedSupplierForOrder || cart.length === 0) return;

    const orderItems = cart.map(item => {
      const product = products.find(p => p.id === item.productId)!;
      return {
        productId: product.id,
        productName: product.name,
        quantity: item.qty,
        unitPrice: product.purchasePrice,
        total: item.qty * product.purchasePrice
      };
    });

    const newDoc: BillingDocument = {
      id: `PC-${Date.now().toString().slice(-6)}`,
      type: 'PURCHASE_ORDER',
      timestamp: new Date(),
      items: orderItems,
      total: orderItems.reduce((sum, i) => sum + i.total, 0),
      targetName: selectedSupplierForOrder.name,
      targetDetails: {
        nuit: selectedSupplierForOrder.nuit,
        address: selectedSupplierForOrder.location,
        email: selectedSupplierForOrder.email,
        contact: selectedSupplierForOrder.contact
      },
      status: 'SENT',
      performedBy: currentUser.name, // Use actual current user
      companyId: selectedSupplierForOrder.companyId || currentUser.companyId
    };

    onGenerateOrder(newDoc);
    setIsOrderView(false);
    alert(`Pedido de compra gerado com sucesso para ${selectedSupplierForOrder.name}!\nVocê será redirecionado para a área de Documentos.`);
  };

  if (isOrderView && selectedSupplierForOrder) {
    return (
      <div className="animate-in slide-in-from-right duration-300 h-full flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsOrderView(false)} className="p-3 bg-white rounded-2xl shadow-sm border hover:bg-gray-50"><X size={20} /></button>
            <div>
              <h3 className="text-2xl font-black text-emerald-950">Solicitar Mercadoria</h3>
              <p className="text-gray-500 font-medium">Destinatário: <span className="font-bold text-emerald-700">{selectedSupplierForOrder.name}</span></p>
            </div>
          </div>
          <button
            disabled={cart.length === 0}
            onClick={finalizeOrder}
            className="bg-emerald-700 hover:bg-emerald-800 disabled:bg-gray-200 text-white px-10 py-4 rounded-2xl font-black flex items-center gap-2 shadow-xl transition-all"
          >
            <ShoppingCart size={20} /> FINALIZAR PEDIDO
          </button>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 overflow-hidden">
          <div className="bg-white rounded-[2.5rem] shadow-sm border p-8 flex flex-col overflow-hidden">
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type="text" placeholder="Filtrar catálogo de produtos..." className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-emerald-500 outline-none font-bold" />
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {products.map(p => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p.id)}
                  className="w-full p-4 border-2 border-gray-50 rounded-2xl hover:border-emerald-200 hover:bg-emerald-50 text-left transition-all flex justify-between items-center group active:scale-[0.98]"
                >
                  <div>
                    <div className="font-black text-gray-800">{p.name}</div>
                    <div className="text-[10px] text-gray-400 font-bold uppercase">Cód: {p.code} • Preço Compra: MT {p.purchasePrice}</div>
                  </div>
                  <Plus size={20} className="text-emerald-300 group-hover:text-emerald-600" />
                </button>
              ))}
            </div>
          </div>

          <div className="bg-emerald-950 rounded-[2.5rem] shadow-2xl p-8 flex flex-col overflow-hidden text-white">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-xl font-black">Lista de Pedido</h4>
              <span className="bg-emerald-600 px-3 py-1 rounded-full text-xs font-black">{cart.length} ITENS</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {cart.map(item => {
                const p = products.find(prod => prod.id === item.productId)!;
                return (
                  <div key={item.productId} className="flex justify-between items-center group">
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="font-bold truncate">{p.name}</div>
                      <div className="text-xs text-emerald-500 font-black">Qtd Solicitada: {item.qty}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="font-black">MT {(item.qty * p.purchasePrice).toFixed(2)}</div>
                      <button onClick={() => setCart(prev => prev.filter(i => i.productId !== item.productId))} className="text-emerald-800 hover:text-red-400"><Trash2 size={18} /></button>
                    </div>
                  </div>
                );
              })}
              {cart.length === 0 && <p className="text-center text-emerald-800 font-bold py-20 italic">Selecione produtos à esquerda para o pedido.</p>}
            </div>
            <div className="pt-6 border-t border-emerald-900 mt-6">
              <div className="flex justify-between items-end">
                <span className="text-xs font-black uppercase tracking-widest text-emerald-500">Valor Estimado</span>
                <span className="text-3xl font-black">MT {cart.reduce((sum, item) => sum + (item.qty * products.find(p => p.id === item.productId)!.purchasePrice), 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-[rgb(var(--bg-surface))] dark:bg-white/5 p-8 rounded-[2.5rem] shadow-sm">
          <div className="flex-1 w-full max-w-xl relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Pesquisar fornecedores por nome, email ou contacto..."
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 dark:bg-white/5 border-2 border-transparent focus:border-emerald-500 focus:bg-white dark:focus:bg-white/10 transition-all outline-none font-bold text-[rgb(var(--text-main))] dark:text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => { setEditingSupplier(null); setIsModalOpen(true); }}
            className="w-full lg:w-auto px-10 py-4 bg-emerald-700 text-white rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 hover:bg-emerald-800 transition-all hover:-translate-y-1"
          >
            <Plus size={24} /> NOVO FORNECEDOR
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredSuppliers.map(supplier => (
            <div key={supplier.id} className="bg-[rgb(var(--bg-surface))] dark:bg-white/5 rounded-[2rem] border-2 border-transparent hover:border-emerald-500 shadow-sm hover:shadow-xl transition-all p-8 flex flex-col group relative">
              <button
                onClick={() => togglePreferred(supplier.id)}
                className={`absolute top-6 right-6 p-3 rounded-xl transition-all ${supplier.isPreferred ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-300 hover:text-amber-400'}`}
              >
                <Star size={20} fill={supplier.isPreferred ? "currentColor" : "none"} />
              </button>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-2xl flex items-center justify-center overflow-hidden border border-emerald-200/50">
                  {supplier.logo ? <img src={supplier.logo} className="w-full h-full object-contain p-2 hover:scale-110 transition-transform" /> : <Truck size={32} />}
                </div>
                <div>
                  <h4 className="text-xl font-black text-[rgb(var(--text-main))] dark:text-white leading-tight">{supplier.name}</h4>
                  <div className="flex items-center gap-1 text-[10px] font-black uppercase text-emerald-600 tracking-wider">
                    <Fingerprint size={12} />
                    NUIT: {supplier.nuit || '---'}
                  </div>
                </div>
              </div>

              <div className="space-y-4 flex-1">
                <div className="flex items-start gap-3 text-sm text-gray-600">
                  <MapPin size={18} className="text-gray-400 shrink-0 mt-0.5" />
                  <span className="leading-tight font-medium">{supplier.location}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Phone size={18} className="text-gray-400 shrink-0" />
                  <span className="font-medium">{supplier.contact}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Mail size={18} className="text-gray-400 shrink-0" />
                  <span className="font-medium truncate">{supplier.email}</span>
                </div>
                <div className="pt-2 border-t border-gray-50 flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-gray-400">
                  <span>Entrega Est.: <span className="text-emerald-600">{(supplier as any).estimated_delivery || '---'}</span></span>
                </div>
              </div>

              <div className="mt-8 flex gap-2">
                <button
                  onClick={() => startOrder(supplier)}
                  className="flex-1 bg-emerald-700 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-800 transition-all shadow-lg shadow-emerald-900/10"
                >
                  <ShoppingCart size={16} /> SOLICITAR
                </button>
                <button
                  onClick={() => { setEditingSupplier(supplier); setIsModalOpen(true); }}
                  className="p-4 bg-gray-50 dark:bg-white/5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all border border-transparent hover:border-blue-200"
                >
                  <Edit2 size={20} />
                </button>
                <button onClick={() => handleDelete(supplier.id)} className="p-4 bg-gray-50 dark:bg-white/5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all border border-transparent hover:border-red-200">
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-8 border-b bg-gray-50 flex justify-between items-center">
              <h3 className="text-2xl font-black text-emerald-950 uppercase tracking-tight">
                {editingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-2"><X size={24} /></button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-5">
              <div className="flex justify-center -mt-2 mb-6">
                <div onClick={() => document.getElementById('supplier-logo-input')?.click()} className="w-24 h-24 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer overflow-hidden relative group">
                  {editingSupplier?.logo ? <img src={editingSupplier.logo} className="w-full h-full object-contain p-2" /> : <Truck size={24} className="text-gray-300" />}
                  <div className="absolute inset-0 bg-black/30 hidden group-hover:flex items-center justify-center text-white text-[10px] font-bold uppercase transition-all">Logo</div>
                </div>
                <input
                  id="supplier-logo-input"
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      const r = new FileReader();
                      r.onloadend = () => setEditingSupplier(prev => prev ? { ...prev, logo: r.result as string } : {
                        // Create temp object if new (needs reasonable defaults or existing state logic to handle 'new' vs 'edit' properly)
                        // Actually if editingSupplier is null (New), we should probably initialize it or handle it.
                        // But wait, if new, editingSupplier is null. 
                        // I need to setEditingSupplier to a temp object to show the preview.
                        id: '', name: '', nuit: '', location: '', contact: '', email: '', conditions: '', isPreferred: false, logo: r.result as string
                      });
                      r.readAsDataURL(f);
                    }
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div className="col-span-2">
                  <label className="block text-xs font-black text-gray-500 uppercase mb-1">Razão Social / Nome</label>
                  <input name="name" required defaultValue={editingSupplier?.name} className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase mb-1">NUIT</label>
                  <input name="nuit" required defaultValue={editingSupplier?.nuit} className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase mb-1">Contacto Telefónico</label>
                  <input name="contact" required defaultValue={editingSupplier?.contact} className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none font-bold" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-black text-gray-500 uppercase mb-1">Endereço / Localização</label>
                  <input name="location" required defaultValue={editingSupplier?.location} className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none font-bold" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-black text-gray-500 uppercase mb-1">Email de Vendas</label>
                  <input name="email" type="email" required defaultValue={editingSupplier?.email} className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase mb-1">Condições de Pagamento</label>
                  <input name="conditions" placeholder="Ex: 30 dias" defaultValue={editingSupplier?.conditions} className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase mb-1">Prazo de Entrega</label>
                  <input name="estimated_delivery" placeholder="Ex: 24h, 3 dias" defaultValue={(editingSupplier as any)?.estimated_delivery} className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none font-bold" />
                </div>
              </div>
              <div className="pt-6 flex gap-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-5 bg-gray-100 text-gray-600 rounded-2xl font-black uppercase tracking-widest transition-all">Cancelar</button>
                <button type="submit" className="flex-1 py-5 bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all">Guardar Fornecedor</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
