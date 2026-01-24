import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Filter,
  Plus,
  Edit2,
  Package,
  ChevronRight,
  X,
  Save,
  ArrowRightLeft,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  LayoutGrid,
  List,
  Trash2,
  Download,
  Upload,
  ShieldCheck,
  CheckSquare,
  Square,
  MoreHorizontal
} from 'lucide-react';
import { Product, Supplier, HealthPlan } from '../types';
import { ProductService, HealthPlanService, AuthService } from '../services';

interface ProductFormProps {
  product?: Product | null;
  suppliers: Supplier[];
  onClose: () => void;
  onSave: (product: Product) => void;
  onDelete: (id: string) => void;
}

const ProductForm: React.FC<ProductFormProps> = ({ product, suppliers, onClose, onSave, onDelete }) => {
  const [formData, setFormData] = useState<Partial<Product>>(
    product || {
      name: '',
      category: 'Medicamento',
      code: '',
      purchasePrice: 0,
      salePrice: 0,
      quantity: 0,
      minStock: 10,
      supplierId: '',
      unit: 'Unidade' // Default
    }
  );
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ ...formData, id: product?.id || Date.now().toString(36) + Math.random().toString(36).substr(2) } as Product);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[200] p-4 flex items-center justify-center backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] p-8 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh] custom-scrollbar" onClick={e => e.stopPropagation()}>
        {/* ... (Keep existing Header) */}
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-black text-emerald-950 uppercase">{product ? 'Editar Produto' : 'Novo Produto'}</h3>
          <button type="button" onClick={onClose} className="p-2 text-gray-300 hover:text-emerald-700 transition-colors"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 pb-4">
          <div className="space-y-4">
            {/* ... (Keep Basic Identity) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* ... Name ... */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Nome Comercial</label>
                <input required className="w-full p-4 bg-gray-50 rounded-2xl font-bold border-2 border-transparent focus:bg-white focus:border-emerald-500 outline-none" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>
              {/* ... Category ... */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Categoria</label>
                <select className="w-full p-4 bg-gray-50 rounded-2xl font-bold border-transparent focus:border-emerald-500 outline-none" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                  <option>Medicamento</option><option>Antibiótico</option><option>Higiene</option><option>Suplemento</option><option>Equipamento</option><option>Geral</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* ... Code ... */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Código / Ref</label>
                <input required className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} />
              </div>
              {/* ... Supplier ... */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Fornecedor Habitual</label>
                <select className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none" value={formData.supplierId || ''} onChange={e => setFormData({ ...formData, supplierId: e.target.value })}>
                  <option value="">Selecione...</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            {/* Pricing Section */}
            <div className="bg-emerald-50/50 p-6 rounded-3xl space-y-4 border border-emerald-100/50">
              {/* ... Keep Pricing Fields ... */}
              <h4 className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">Informações Financeiras</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest px-1">Preço de Compra</label>
                  <input type="number" required min="0" step="0.01" className="w-full p-4 bg-white rounded-2xl font-black text-emerald-950 outline-none border border-emerald-100 focus:border-emerald-500" value={formData.purchasePrice} onChange={e => setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest px-1">Preço de Venda</label>
                  <input type="number" required min="0" step="0.01" className="w-full p-4 bg-white rounded-2xl font-black text-emerald-700 outline-none border border-emerald-100 focus:border-emerald-500" value={formData.salePrice} onChange={e => setFormData({ ...formData, salePrice: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
            </div>

            {/* Stock Management */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{product ? 'Stock Atual' : 'Stock Inicial'}</label>
                <input
                  type="number"
                  disabled={!!product}
                  required
                  className={`w-full p-4 bg-gray-50 rounded-2xl font-bold ${product ? 'text-gray-400 bg-gray-100 cursor-not-allowed' : ''}`}
                  value={formData.quantity}
                  onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Unidade</label>
                <select className="w-full p-4 bg-gray-50 rounded-2xl font-bold border-transparent focus:border-emerald-500 outline-none" value={formData.unit || 'Unidade'} onChange={e => setFormData({ ...formData, unit: e.target.value })}>
                  <option>Unidade</option><option>Caixa</option><option>Pacote</option><option>Frasco</option><option>Kg</option><option>Litro</option><option>Cartela</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Minimo</label>
                <input type="number" required min="0" className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none" value={formData.minStock} onChange={e => setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
          </div>
          {/* ... (Keep Footer Buttons) */}
          <div className="flex gap-4 mt-4">
            {product && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Tem certeza que deseja apagar este produto? Esta ação não pode ser desfeita.')) {
                    onDelete(product.id);
                  }
                }}
                className="bg-red-50 text-red-600 px-6 rounded-2xl font-black uppercase text-xs hover:bg-red-100 transition-colors"
                title="Apagar Produto"
              >
                <Trash2 size={20} />
              </button>
            )}
            <button type="submit" disabled={saving} className="flex-1 bg-emerald-700 text-white py-6 rounded-2xl font-black uppercase text-xs shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 hover:bg-emerald-800">
              <Save size={20} /> {saving ? 'GUARDANDO...' : (product ? 'ATUALIZAR DADOS' : 'REGISTAR PRODUTO')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ... (StockAdjustmentModal, HealthPlanForm, FilterBtn, BulkImportModal - Keep them or standard references)

interface BulkEditModalProps {
  selectedIds: string[];
  products: Product[];
  suppliers: Supplier[];
  onClose: () => void;
  onSave: (field: string, value: any) => Promise<void>;
}

const BulkEditModal: React.FC<BulkEditModalProps> = ({ selectedIds, products, suppliers, onClose, onSave }) => {
  const [field, setField] = useState('purchasePrice');
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let finalValue: any = value;
      if (field === 'purchasePrice' || field === 'salePrice' || field === 'minStock') {
        finalValue = parseFloat(value);
        if (isNaN(finalValue)) throw new Error("Valor inválido");
      }
      await onSave(field, finalValue);
      onClose();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[300] p-4 flex items-center justify-center backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl">
        <h3 className="text-xl font-black text-emerald-950 uppercase mb-4">Edição em Massa</h3>
        <p className="text-sm text-gray-500 mb-6 font-medium">A editar <b>{selectedIds.length}</b> produtos selecionados.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Campo a Editar</label>
            <select className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm outline-none" value={field} onChange={e => setField(e.target.value)}>
              <option value="purchasePrice">Preço de Compra</option>
              <option value="salePrice">Preço de Venda</option>
              <option value="supplierId">Fornecedor</option>
              <option value="minStock">Stock Mínimo</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Novo Valor</label>
            {field === 'supplierId' ? (
              <select className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm outline-none" value={value} onChange={e => setValue(e.target.value)} required>
                <option value="">Selecione...</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            ) : (
              <input className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm outline-none"
                type="number" step="0.01"
                placeholder="Insira o novo valor..."
                value={value} onChange={e => setValue(e.target.value)} required
              />
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-xl font-bold uppercase text-xs hover:bg-gray-200">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-4 bg-emerald-700 text-white rounded-xl font-bold uppercase text-xs shadow-lg hover:bg-emerald-800 disabled:opacity-50">
              {saving ? 'Processando...' : 'Aplicar a Todos'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ... Stock Component Start
export const Stock: React.FC<StockProps> = ({ products, setProducts, suppliers, initialModalOpen, onModalHandled }) => {
  // ... (Keep existing states)
  const [activeTab, setActiveTab] = useState<'STOCK' | 'REGISTRY' | 'HEALTH_PLANS'>('STOCK');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'LOW_STOCK'>('ALL');

  // Modals state
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [isBulkStockAdjustmentOpen, setIsBulkStockAdjustmentOpen] = useState(false); // NEW
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Selection State
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());

  // ... (Keep Health Plans State & Effects)
  const [healthPlans, setHealthPlans] = useState<HealthPlan[]>([]);
  const [isHealthPlanFormOpen, setIsHealthPlanFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<HealthPlan | null>(null);

  useEffect(() => {
    // ... Health Plan Fetch ...
    const fetchPlans = async () => {
      if (activeTab === 'HEALTH_PLANS') {
        const user = AuthService.getCurrentUser();
        if (user?.companyId) {
          try {
            const plans = await HealthPlanService.getAll(String(user.companyId));
            setHealthPlans(plans);
          } catch (err) {
            console.error('Error fetching plans:', err);
          }
        }
      }
    };
    fetchPlans();
  }, [activeTab]);

  useMemo(() => {
    if (initialModalOpen) {
      setEditingProduct(null);
      setIsProductFormOpen(true);
      onModalHandled?.();
    }
  }, [initialModalOpen, onModalHandled]);

  const filteredProducts = useMemo(() => products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'ALL' || p.quantity <= p.minStock;
    return matchesSearch && matchesFilter;
  }), [products, searchTerm, filterType]);

  // Handle Selection
  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedProducts);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedProducts(newSet);
  };

  const toggleAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const handleBulkEdit = async (field: string, value: any) => {
    try {
      // In a real app, backend should handle batch update. Here we iterate.
      const promises = Array.from(selectedProducts).map(id => {
        const p = products.find(prod => prod.id === id);
        if (p) return ProductService.update({ ...p, [field]: value });
        return Promise.resolve(null);
      });

      await Promise.all(promises);

      // Update State Local
      setProducts(prev => prev.map(p => selectedProducts.has(p.id) ? { ...p, [field]: value } : p));
      setSelectedProducts(new Set()); // Clear selection
      alert("Produtos atualizados com sucesso!");
    } catch (e) {
      console.error("Bulk edit error", e);
      alert("Erro ao editar em massa");
    }
  };

  const handleBulkStockAdjustment = async (type: 'ENTRY' | 'EXIT', amount: number, reason: string) => {
    try {
      const promises = Array.from(selectedProducts).map(id => {
        const p = products.find(prod => prod.id === id);
        if (p) {
          const newQty = type === 'ENTRY' ? p.quantity + amount : Math.max(0, p.quantity - amount);
          return ProductService.update({ ...p, quantity: newQty });
        }
        return Promise.resolve(null);
      });

      await Promise.all(promises);

      // Update local state is tricky because each product has different quantity.
      // We need to re-calculate based on previous state.
      setProducts(prev => prev.map(p => {
        if (selectedProducts.has(p.id)) {
          const newQty = type === 'ENTRY' ? p.quantity + amount : Math.max(0, p.quantity - amount);
          return { ...p, quantity: newQty };
        }
        return p;
      }));

      setSelectedProducts(new Set());
      alert("Stock atualizado em massa com sucesso!");
    } catch (e) {
      console.error("Bulk stock error", e);
      alert("Erro ao atualizar stock em massa.");
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Tem certeza que deseja apagar ${selectedProducts.size} produtos?`)) return;

    try {
      const promises = Array.from(selectedProducts).map(id => ProductService.delete(String(id)));
      await Promise.all(promises);

      setProducts(prev => prev.filter(p => !selectedProducts.has(p.id)));
      setSelectedProducts(new Set());
      alert("Produtos apagados com sucesso!");
    } catch (e) {
      console.error("Bulk delete error", e);
      alert("Erro ao apagar produtos em massa.");
    }
  };

  // ... (Keep handleSaveProduct, handleBulkImport, handleStockAdjustment, etc.) ...
  const handleSaveProduct = async (updatedProduct: Product) => {
    try {
      let finalProduct = updatedProduct;
      const isRealUUID = updatedProduct.id.includes('-');
      const existingIndex = products.findIndex(p => p.id === updatedProduct.id);

      if (existingIndex >= 0 && isRealUUID) {
        await ProductService.update(updatedProduct);
      } else {
        const added = await ProductService.add(updatedProduct);
        if (added) finalProduct = added;
        else throw new Error("Falha ao criar produto.");
      }

      setProducts(prev => {
        if (existingIndex >= 0) {
          const newProducts = [...prev];
          newProducts[existingIndex] = finalProduct;
          return newProducts;
        }
        return [finalProduct, ...prev];
      });

      setIsProductFormOpen(false);
      setEditingProduct(null);
    } catch (e: any) {
      console.error(e);
      alert("Erro ao salvar produto: " + (e.message || "Erro desconhecido"));
    }
  };

  const handleBulkImport = async (newProducts: Partial<Product>[]) => {
    try {
      await ProductService.addBatch(newProducts);
      window.location.reload();
    } catch (e) {
      alert('Erro na importação em massa.');
      console.error(e);
    }
  };

  const handleStockAdjustment = async (newQty: number, reason: string) => {
    if (!editingProduct) return;
    try {
      const updated = { ...editingProduct, quantity: newQty };
      await ProductService.update(updated);
      setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
      setIsAdjustmentOpen(false);
      setEditingProduct(null);
    } catch (e) {
      alert("Erro ao ajustar stock.");
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await ProductService.delete(id);
      setProducts(prev => prev.filter(p => p.id !== id));
      setIsProductFormOpen(false);
      setEditingProduct(null);
    } catch (e) {
      alert("Erro ao apagar produto.");
    }
  };

  const handleSavePlan = async (plan: HealthPlan) => {
    // ... (Keep same logic)
    try {
      const user = AuthService.getCurrentUser();
      if (!user?.companyId) return;

      const planData = { ...plan, companyId: user.companyId };
      let savedPlan: HealthPlan;

      if (plan.id && !plan.id.toString().startsWith('HP-')) {
        savedPlan = await HealthPlanService.update(planData);
      } else {
        const { id, ...newPlan } = planData;
        savedPlan = await HealthPlanService.create(newPlan);
      }

      setHealthPlans(prev => {
        const exists = prev.find(p => p.id === savedPlan.id);
        if (exists) return prev.map(p => p.id === savedPlan.id ? savedPlan : p);
        return [...prev, savedPlan];
      });
      setIsHealthPlanFormOpen(false);
      setEditingPlan(null);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar plano de saúde.');
    }
  };

  return (
    <>
      <div className="space-y-6 animate-in fade-in pb-20 md:pb-0 relative">

        {/* Bulk Action Bar (Floating) */}


        {/* Tab Navigation */}
        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 w-full md:w-fit mx-auto overflow-x-auto custom-scrollbar no-scrollbar">
          <button onClick={() => setActiveTab('STOCK')} className={`flex-1 md:flex-none px-4 md:px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shrink-0 ${activeTab === 'STOCK' ? 'bg-emerald-700 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}>
            <LayoutGrid size={16} />
            <span className="whitespace-nowrap md:hidden">Gestão</span>
            <span className="whitespace-nowrap hidden md:inline">Gestão de Stock</span>
          </button>
          <button onClick={() => setActiveTab('REGISTRY')} className={`flex-1 md:flex-none px-4 md:px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shrink-0 ${activeTab === 'REGISTRY' ? 'bg-emerald-700 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}>
            <List size={16} />
            <span className="whitespace-nowrap md:hidden">Produtos</span>
            <span className="whitespace-nowrap hidden md:inline">Cadastro de Produtos</span>
          </button>
          <button onClick={() => setActiveTab('HEALTH_PLANS')} className={`flex-1 md:flex-none px-4 md:px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shrink-0 ${activeTab === 'HEALTH_PLANS' ? 'bg-emerald-700 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}>
            <ShieldCheck size={16} />
            <span className="whitespace-nowrap md:hidden">Planos</span>
            <span className="whitespace-nowrap hidden md:inline">Planos de Saúde</span>
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex gap-4 items-center">
            <div className="relative group flex-1">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input type="text" placeholder="Pesquisar produto..." className="w-full pl-14 pr-6 py-5 bg-white rounded-2xl border border-gray-100 outline-none font-bold text-sm shadow-sm focus:border-emerald-500 transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>

          {activeTab === 'STOCK' && (
            <div className="space-y-3">
              <div className="flex gap-2 mb-4 justify-between items-center">
                <div className="flex gap-2 items-center">
                  <FilterBtn active={filterType === 'ALL'} onClick={() => setFilterType('ALL')} label="Tudo" />
                  <FilterBtn active={filterType === 'LOW_STOCK'} onClick={() => setFilterType('LOW_STOCK')} label="Stock Baixo" isRed />

                  {/* Inline Bulk Actions for Stock Tab */}
                  {selectedProducts.size > 0 && (
                    <>
                      <div className="h-6 w-px bg-gray-200 mx-2"></div>
                      <span className="text-[10px] font-black uppercase text-emerald-800 tracking-widest mr-1">{selectedProducts.size} Selecionados</span>

                      <button onClick={() => setIsBulkEditOpen(true)} className="p-2 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors" title="Editar em Massa">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => setIsBulkStockAdjustmentOpen(true)} className="p-2 bg-emerald-50 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors" title="Actualizar Stock">
                        <ArrowRightLeft size={16} />
                      </button>
                      <button onClick={handleBulkDelete} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors" title="Apagar em Massa">
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
                {/* Select All Toggle */}
                <button onClick={toggleAll} className="text-gray-400 hover:text-emerald-700 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                  {selectedProducts.size === filteredProducts.length && filteredProducts.length > 0 ? <CheckSquare size={18} className="text-emerald-600" /> : <Square size={18} />} Selecionar Tudo
                </button>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="py-20 text-center text-gray-300 font-black uppercase tracking-widest text-[10px] opacity-20">Nenhum item encontrado</div>
              ) : (
                filteredProducts.map(p => (
                  <div key={p.id} className={`bg-white p-5 rounded-2xl border ${selectedProducts.has(p.id) ? 'border-emerald-500 bg-emerald-50/10 ring-1 ring-emerald-500' : 'border-gray-100'} shadow-sm flex items-center gap-4 group hover:border-emerald-300 transition-all relative overflow-hidden`}>

                    {/* Checkbox Section */}
                    <div className="z-10" onClick={(e) => { e.stopPropagation(); toggleSelection(p.id); }}>
                      {selectedProducts.has(p.id) ? <div className="text-emerald-600 cursor-pointer"><CheckSquare size={24} /></div> : <div className="text-gray-300 hover:text-gray-400 cursor-pointer"><Square size={24} /></div>}
                    </div>

                    <div className={`w-1 shrink-0 h-12 rounded-full ${p.quantity <= p.minStock ? 'bg-red-500' : 'bg-emerald-500'}`}></div>

                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${p.quantity <= p.minStock ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      <Package size={24} />
                    </div>
                    <div className="flex-1 min-w-0 pl-2">
                      <div className="flex justify-between items-start">
                        <h4 className="font-black text-emerald-950 text-sm uppercase truncate leading-tight">{p.name}</h4>
                        <span className="text-sm font-black text-emerald-700 ml-2">MT {p.salePrice}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-gray-400 font-bold uppercase truncate">{p.category} • Ref: {p.code}</span>
                        {p.unit && <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded text-[9px] font-black uppercase">{p.unit}</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <div className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${p.quantity <= p.minStock ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          Stock: {p.quantity} Un.
                        </div>
                        <div className="flex-1 w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden ml-2">
                          <div className={`h-full rounded-full ${p.quantity <= p.minStock ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, (p.quantity / (p.minStock * 4 || 20)) * 100)}%` }} />
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => { setEditingProduct(p); setIsAdjustmentOpen(true); }}
                      className="p-3 bg-gray-50 text-emerald-700 rounded-xl hover:bg-emerald-700 hover:text-white transition-all shadow-sm border border-gray-100 active:scale-95"
                      title="Ajustar Stock"
                    >
                      <ArrowRightLeft size={18} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'REGISTRY' && (
            <div className="space-y-4">
              {/* Registry Toolbar */}
              <div className="flex justify-between items-center gap-4">
                {/* Left Side: Bulk Actions */}
                <div className="flex gap-2 items-center min-h-[3rem]">
                  {selectedProducts.size > 0 && (
                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-4">
                      <span className="text-[10px] font-black uppercase text-emerald-800 tracking-widest mr-2">{selectedProducts.size} Selecionados</span>

                      <button onClick={() => setIsBulkEditOpen(true)} className="px-3 py-2 bg-emerald-50 text-emerald-800 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-100 flex items-center gap-2">
                        <Edit2 size={14} /> Editar
                      </button>
                      <button onClick={() => setIsBulkStockAdjustmentOpen(true)} className="px-3 py-2 bg-blue-50 text-blue-700 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-100 flex items-center gap-2">
                        <ArrowRightLeft size={14} /> Stock
                      </button>
                      <button onClick={handleBulkDelete} className="px-3 py-2 bg-red-50 text-red-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-100 flex items-center gap-2">
                        <Trash2 size={14} /> Apagar
                      </button>
                    </div>
                  )}
                </div>

                {/* Right Side: Standard Actions */}
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      const csvContent = "Nome,Categoria,Codigo,PrecoCompra,PrecoVenda,Quantidade,StockMinimo\n" + products.map(p => `"${p.name}","${p.category}","${p.code}",${p.purchasePrice},${p.salePrice},${p.quantity},${p.minStock}`).join("\n");
                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                      const link = document.createElement("a");
                      link.href = URL.createObjectURL(blob);
                      link.download = `stock_export_${new Date().toISOString().slice(0, 10)}.csv`;
                      link.click();
                    }}
                    className="px-4 py-4 bg-white text-emerald-700 border border-gray-200 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-sm hover:shadow-md flex items-center gap-2 transition-all"
                  >
                    <Download size={16} /> <span className="hidden md:inline">Exportar</span>
                  </button>
                  <button onClick={() => setIsBulkImportOpen(true)} className="px-4 py-4 bg-white text-emerald-700 border border-gray-200 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-sm hover:shadow-md flex items-center gap-2 transition-all cursor-pointer">
                    <Upload size={16} /> <span className="hidden md:inline">Importar em Massa</span>
                  </button>
                  <button
                    onClick={() => { setEditingProduct(null); setIsProductFormOpen(true); }}
                    className="px-6 py-4 bg-emerald-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center gap-2 whitespace-nowrap hover:bg-emerald-800 transition-colors"
                  >
                    <Plus size={16} /> <span className="hidden md:inline">Novo Produto</span>
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="p-5 w-12">
                          <button onClick={toggleAll} className="text-emerald-600 hover:text-emerald-800">
                            {selectedProducts.size > 0 && selectedProducts.size === filteredProducts.length ? <CheckSquare size={20} /> : <Square size={20} className="text-gray-300" />}
                          </button>
                        </th>
                        <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Produto</th>
                        <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Preço Compra</th>
                        <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Preço Venda</th>
                        <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Fornecedor</th>
                        <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Margem de Lucro</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredProducts.map(p => {
                        const supplierName = suppliers.find(s => s.id === p.supplierId)?.name || '-';
                        return (
                          <tr key={p.id} onClick={() => { setEditingProduct(p); setIsProductFormOpen(true); }} className={`transition-colors cursor-pointer group ${selectedProducts.has(p.id) ? 'bg-emerald-50/40' : 'hover:bg-emerald-50/30'}`}>
                            <td className="p-5" onClick={(e) => e.stopPropagation()}>
                              <div onClick={() => toggleSelection(p.id)} className="cursor-pointer">
                                {selectedProducts.has(p.id) ? <CheckSquare size={20} className="text-emerald-600" /> : <Square size={20} className="text-gray-300 hover:text-emerald-500" />}
                              </div>
                            </td>
                            <td className="p-5">
                              <p className="font-black text-emerald-950 text-xs">{p.name}</p>
                              <p className="text-[9px] text-gray-400 font-bold uppercase">{p.category} • {p.code}</p>
                            </td>
                            <td className="p-5 font-bold text-gray-600 text-xs">MT {p.purchasePrice?.toFixed(2)}</td>
                            <td className="p-5 font-bold text-emerald-700 text-xs">MT {p.salePrice.toFixed(2)}</td>
                            <td className="p-5 text-xs text-gray-500 font-medium truncate max-w-[150px]">{supplierName}</td>
                            <td className="p-5 text-right">
                              {(() => {
                                const margin = p.salePrice - (p.purchasePrice || 0);
                                const marginPercent = p.purchasePrice ? ((margin / p.purchasePrice) * 100) : 100;
                                return (
                                  <div className="flex flex-col items-end">
                                    <span className={`text-xs font-black ${margin >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                                      {marginPercent.toFixed(1)}%
                                    </span>
                                    <span className="text-[9px] text-gray-400 font-bold">MT {margin.toFixed(2)}</span>
                                  </div>
                                )
                              })()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {filteredProducts.length === 0 && (
                    <div className="p-10 text-center text-gray-300 font-black uppercase tracking-widest text-[10px] opacity-50">Sem dados para mostrar</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'HEALTH_PLANS' && (
            <div className="space-y-4">
              {/* Keep Health Plans Content */}
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setEditingPlan(null); setIsHealthPlanFormOpen(true); }}
                  className="px-6 py-4 bg-emerald-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center gap-2 whitespace-nowrap hover:bg-emerald-800 transition-colors"
                >
                  <Plus size={16} /> <span className="hidden md:inline">Novo Plano</span>
                </button>
              </div>

              <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Plano</th>
                        <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Seguradora</th>
                        <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Cobertura</th>
                        <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Contato</th>
                        <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {healthPlans.length === 0 ? (
                        <tr><td colSpan={5} className="p-10 text-center text-gray-300 font-black uppercase tracking-widest text-[10px] opacity-50">Nenhum plano registado</td></tr>
                      ) : (
                        healthPlans.map(hp => (
                          <tr key={hp.id} className="hover:bg-emerald-50/30 transition-colors">
                            <td className="p-5"><p className="font-black text-emerald-950 text-xs">{hp.name}</p></td>
                            <td className="p-5 text-xs text-gray-600 font-bold">{hp.insurer}</td>
                            <td className="p-5"><span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-lg text-xs font-black">{hp.coveragePercentage}%</span></td>
                            <td className="p-5 text-xs text-gray-500">{hp.contact || 'N/A'}</td>
                            <td className="p-5 text-right">
                              <button onClick={() => { setEditingPlan(hp); setIsHealthPlanFormOpen(true); }} className="p-2 text-gray-400 hover:text-emerald-700 transition-colors"><Edit2 size={18} /></button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {isProductFormOpen && (
        <ProductForm
          product={editingProduct}
          suppliers={suppliers}
          onClose={() => setIsProductFormOpen(false)}
          onSave={handleSaveProduct}
          onDelete={handleDeleteProduct}
        />
      )}

      {isBulkEditOpen && (
        <BulkEditModal
          selectedIds={Array.from(selectedProducts)}
          products={products}
          suppliers={suppliers}
          onClose={() => setIsBulkEditOpen(false)}
          onSave={handleBulkEdit}
        />
      )}

      {isBulkStockAdjustmentOpen && (
        <BulkStockAdjustmentModal
          selectedCount={selectedProducts.size}
          onClose={() => setIsBulkStockAdjustmentOpen(false)}
          onConfirm={handleBulkStockAdjustment}
        />
      )}

      {isAdjustmentOpen && editingProduct && (
        <StockAdjustmentModal
          product={editingProduct}
          onClose={() => setIsAdjustmentOpen(false)}
          onConfirm={handleStockAdjustment}
        />
      )}
      {isHealthPlanFormOpen && (
        <HealthPlanForm
          plan={editingPlan}
          onClose={() => setIsHealthPlanFormOpen(false)}
          onSave={handleSavePlan}
        />
      )}
      {isBulkImportOpen && (
        <BulkImportModal
          onClose={() => setIsBulkImportOpen(false)}
          onImport={handleBulkImport}
          suppliers={suppliers}
        />
      )}
    </>
  );
};

interface AdjustmentModalProps {
  product: Product;
  onClose: () => void;
  onConfirm: (newQty: number, reason: string) => Promise<void>;
}

const StockAdjustmentModal: React.FC<AdjustmentModalProps> = ({ product, onClose, onConfirm }) => {
  const [type, setType] = useState<'ENTRY' | 'EXIT'>('ENTRY');
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const qty = parseInt(amount) || 0;
  const finalStock = type === 'ENTRY' ? product.quantity + qty : product.quantity - qty;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qty) return;
    if (confirm("Confirmar ajuste de stock?")) {
      setSaving(true);
      try {
        await onConfirm(finalStock, reason);
      } finally {
        setSaving(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[200] p-4 flex items-center justify-center backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center border-b pb-4">
          <div>
            <h3 className="text-xl font-black text-emerald-950 uppercase leading-none">Ajuste de Stock</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">{product.name}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-gray-300 hover:text-emerald-700 transition-colors"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl">
            <button
              type="button"
              onClick={() => setType('ENTRY')}
              className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${type === 'ENTRY' ? 'bg-white shadow-md text-emerald-700' : 'text-gray-400'}`}
            >
              <TrendingUp size={16} /> Entrada
            </button>
            <button
              type="button"
              onClick={() => setType('EXIT')}
              className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${type === 'EXIT' ? 'bg-white shadow-md text-red-600' : 'text-gray-400'}`}
            >
              <TrendingDown size={16} /> Saída
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 items-center">
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-center">
              <span className="text-[9px] font-black uppercase text-gray-400 block mb-1">Atual</span>
              <span className="text-2xl font-black text-gray-900">{product.quantity}</span>
            </div>
            <div className="flex justify-center text-gray-300"><ChevronRight size={24} /></div>
            <div className={`p-4 rounded-2xl border-2 text-center absolute right-12 opacity-10 pointer-events-none`}>
              {/* Spacer */}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Quantidade a {type === 'ENTRY' ? 'Adicionar' : 'Remover'}</label>
            <input
              type="number"
              required
              min="1"
              autoFocus
              className="w-full p-5 bg-gray-50 rounded-2xl font-bold border-2 border-transparent focus:bg-white focus:border-emerald-500 outline-none text-2xl text-center"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>

          <div className="flex justify-between items-center px-2 py-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50">
            <span className="text-[10px] font-black text-emerald-800 uppercase">Stock Previsto:</span>
            <span className={`text-xl font-black ${finalStock < product.minStock ? 'text-red-500' : 'text-emerald-700'}`}>{finalStock}</span>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Motivo (Opcional)</label>
            <input
              className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-sm border-transparent focus:border-emerald-500 outline-none"
              placeholder="Ex: Compra, Avaria, Oferta..."
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
          </div>

          <button type="submit" disabled={saving} className={`w-full py-6 rounded-2xl font-black uppercase text-xs shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all text-white disabled:opacity-50 ${type === 'ENTRY' ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-red-600 hover:bg-red-700'}`}>
            <ArrowRightLeft size={20} /> {saving ? 'PROCESSANDO...' : 'CONFIRMAR AJUSTE'}
          </button>
        </form>
      </div>
    </div>
  );
};


interface BulkStockAdjustmentModalProps {
  selectedCount: number;
  onClose: () => void;
  onConfirm: (type: 'ENTRY' | 'EXIT', amount: number, reason: string) => Promise<void>;
}

const BulkStockAdjustmentModal: React.FC<BulkStockAdjustmentModalProps> = ({ selectedCount, onClose, onConfirm }) => {
  const [type, setType] = useState<'ENTRY' | 'EXIT'>('ENTRY');
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(amount);
    if (!qty) return;

    if (confirm(`Confirmar ajuste de stock para ${selectedCount} produtos?`)) {
      setSaving(true);
      try {
        await onConfirm(type, qty, reason);
        onClose();
      } finally {
        setSaving(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[300] p-4 flex items-center justify-center backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center border-b pb-4">
          <div>
            <h3 className="text-xl font-black text-emerald-950 uppercase leading-none">Atualizar Stock em Massa</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">{selectedCount} Itens Selecionados</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-gray-300 hover:text-emerald-700 transition-colors"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl">
            <button
              type="button"
              onClick={() => setType('ENTRY')}
              className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${type === 'ENTRY' ? 'bg-white shadow-md text-emerald-700' : 'text-gray-400'}`}
            >
              <TrendingUp size={16} /> Adicionar
            </button>
            <button
              type="button"
              onClick={() => setType('EXIT')}
              className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${type === 'EXIT' ? 'bg-white shadow-md text-red-600' : 'text-gray-400'}`}
            >
              <TrendingDown size={16} /> Remover
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Quantidade a {type === 'ENTRY' ? 'Adicionar' : 'Remover'} (para cada item)</label>
            <input
              type="number"
              required
              min="1"
              autoFocus
              className="w-full p-5 bg-gray-50 rounded-2xl font-bold border-2 border-transparent focus:bg-white focus:border-emerald-500 outline-none text-2xl text-center"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Motivo</label>
            <input
              className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-sm border-transparent focus:border-emerald-500 outline-none"
              placeholder="Ex: Atualização Semanal..."
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
          </div>

          <button type="submit" disabled={saving} className={`w-full py-6 rounded-2xl font-black uppercase text-xs shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all text-white disabled:opacity-50 ${type === 'ENTRY' ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-red-600 hover:bg-red-700'}`}>
            <ArrowRightLeft size={20} /> {saving ? 'PROCESSANDO...' : 'CONFIRMAR ATUALIZAÇÃO'}
          </button>
        </form>
      </div>
    </div>
  );
};


interface HealthPlanFormProps {
  plan?: HealthPlan | null;
  onClose: () => void;
  onSave: (plan: HealthPlan) => void;
}

const HealthPlanForm: React.FC<HealthPlanFormProps> = ({ plan, onClose, onSave }) => {
  const [formData, setFormData] = useState<Partial<HealthPlan>>(
    plan || {
      name: '',
      insurer: '',
      coveragePercentage: 100,
      contact: '',
      email: '',
      website: '',
      description: '',
      coverageDetails: '',
      active: true
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData, id: plan?.id || `HP-${Date.now()}` } as HealthPlan);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[200] p-4 flex items-center justify-center backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] p-8 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh] custom-scrollbar" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-black text-emerald-950 uppercase">{plan ? 'Editar Plano' : 'Novo Plano de Saúde'}</h3>
          <button type="button" onClick={onClose} className="p-2 text-gray-300 hover:text-emerald-700 transition-colors"><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Nome do Plano</label>
              <input required className="w-full p-4 bg-gray-50 rounded-2xl font-bold border-2 border-transparent focus:bg-white focus:border-emerald-500 outline-none" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ex: Médis Standard" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Seguradora / Entidade</label>
              <input required className="w-full p-4 bg-gray-50 rounded-2xl font-bold border-2 border-transparent focus:bg-white focus:border-emerald-500 outline-none" value={formData.insurer} onChange={e => setFormData({ ...formData, insurer: e.target.value })} placeholder="Ex: Moçambique Seguros" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Cobertura (%)</label>
              <input type="number" min="0" max="100" required className="w-full p-4 bg-gray-50 rounded-2xl font-bold border-2 border-transparent focus:bg-white focus:border-emerald-500 outline-none" value={formData.coveragePercentage} onChange={e => setFormData({ ...formData, coveragePercentage: parseInt(e.target.value) })} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Contato Suporte</label>
              <input className="w-full p-4 bg-gray-50 rounded-2xl font-bold border-2 border-transparent focus:bg-white focus:border-emerald-500 outline-none" value={formData.contact} onChange={e => setFormData({ ...formData, contact: e.target.value })} placeholder="+258..." />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Email Suporte</label>
              <input type="email" className="w-full p-4 bg-gray-50 rounded-2xl font-bold border-2 border-transparent focus:bg-white focus:border-emerald-500 outline-none" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="suporte@seguradora.co.mz" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Website</label>
              <input className="w-full p-4 bg-gray-50 rounded-2xl font-bold border-2 border-transparent focus:bg-white focus:border-emerald-500 outline-none" value={formData.website || ''} onChange={e => setFormData({ ...formData, website: e.target.value })} placeholder="https://..." />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Descrição / Notas</label>
            <textarea className="w-full p-4 bg-gray-50 rounded-2xl font-bold border-2 border-transparent focus:bg-white focus:border-emerald-500 outline-none min-h-[80px]" value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Detalhes adicionais sobre o plano..." />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Detalhes de Cobertura</label>
            <textarea className="w-full p-4 bg-gray-50 rounded-2xl font-bold border-2 border-transparent focus:bg-white focus:border-emerald-500 outline-none min-h-[100px]" value={formData.coverageDetails || ''} onChange={e => setFormData({ ...formData, coverageDetails: e.target.value })} placeholder="Lista de exclusões, limites, ou procedimentos específicos..." />
          </div>

          <button type="submit" className="w-full py-4 bg-emerald-700 text-white rounded-2xl font-black uppercase text-xs shadow-xl hover:bg-emerald-800 transition-all">Salvar Plano</button>
        </form>
      </div>
    </div>
  );
};

const FilterBtn = ({ active, onClick, label, isRed }: any) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-4 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest border transition-all whitespace-nowrap ${active
      ? (isRed ? 'bg-red-600 border-red-600 text-white shadow-lg' : 'bg-emerald-950 border-emerald-950 text-white shadow-lg')
      : 'bg-white border-gray-100 text-gray-400 hover:border-emerald-200'
      }`}
  >
    {label}
  </button>
);

interface StockProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  suppliers: Supplier[];
  initialModalOpen?: boolean;
  onModalHandled?: () => void;
}

interface BulkImportModalProps {
  onClose: () => void;
  onImport: (products: Partial<Product>[]) => Promise<void>;
}

const BulkImportModal: React.FC<BulkImportModalProps> = ({ onClose, onImport }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [rawData, setRawData] = useState('');
  const [parsedData, setParsedData] = useState<string[][]>([]);
  const [mappings, setMappings] = useState<Record<number, string>>({});
  const [importing, setImporting] = useState(false);

  // Field Options for Mapping
  const fields = [
    { id: 'name', label: 'Nome do Produto (Obrigatório)' },
    { id: 'code', label: 'Código de Barras / Ref' },
    { id: 'category', label: 'Categoria' },
    { id: 'purchasePrice', label: 'Preço de Compra' },
    { id: 'salePrice', label: 'Preço de Venda' },
    { id: 'quantity', label: 'Stock Inicial' },
    { id: 'minStock', label: 'Stock Mínimo' },
    { id: 'skip', label: '-- Ignorar --' }
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setRawData(evt.target?.result as string);
    };
    reader.readAsText(file);
  };

  const parseData = () => {
    if (!rawData.trim()) return;

    // Detect delimiter (Tab for Excel paste, Comma/Semi-colon for CSV)
    const firstLine = rawData.split('\n')[0];
    let delimiter = ',';
    if (firstLine.includes('\t')) delimiter = '\t';
    else if (firstLine.includes(';')) delimiter = ';';

    const rows = rawData.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => {
        if (delimiter === '\t') return line.split('\t');
        // Simple CSV regex for quoted values
        const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(delimiter);
        return matches.map(m => m.replace(/^"|"$/g, '').trim());
      });

    setParsedData(rows.slice(0, 200)); // Limit to 200 as requested
    setStep(2);

    // Auto-guess mappings based on headers
    const newMappings: Record<number, string> = {};
    if (rows.length > 0) {
      rows[0].forEach((header, index) => {
        const h = header.toLowerCase();
        if (h.includes('nome') || h.includes('produto')) newMappings[index] = 'name';
        else if (h.includes('cod') || h.includes('ref') || h.includes('barras')) newMappings[index] = 'code';
        else if (h.includes('cat')) newMappings[index] = 'category';
        else if (h.includes('compra') || h.includes('cus')) newMappings[index] = 'purchasePrice';
        else if (h.includes('venda') || h.includes('pvp')) newMappings[index] = 'salePrice';
        else if (h.includes('qtd') || h.includes('quant') || h.includes('stock')) newMappings[index] = 'quantity';
        else if (h.includes('min') || h.includes('alerta')) newMappings[index] = 'minStock';
      });
      setMappings(newMappings);
    }
  };

  const executeImport = async () => {
    setImporting(true);
    try {
      const products: Partial<Product>[] = [];
      const startRow = 1; // Assume first row is header if we found mappings, otherwise 0? Let's assume headers exist for now.

      for (let i = startRow; i < parsedData.length; i++) {
        const row = parsedData[i];
        const product: any = { category: 'Geral', quantity: 0, minStock: 5, purchasePrice: 0, salePrice: 0 };
        let hasName = false;

        Object.entries(mappings).forEach(([colIndex, field]) => {
          if (field && field !== 'skip') {
            const val = row[parseInt(colIndex)];
            if (field === 'purchasePrice' || field === 'salePrice') product[field] = parseFloat(val?.replace(',', '.') || '0') || 0;
            else if (field === 'quantity' || field === 'minStock') product[field] = parseInt(val || '0') || 0;
            else product[field as string] = val || '';

            if (field === 'name' && val) hasName = true;
          }
        });

        if (hasName) {
          if (!product.code) product.code = `IMP-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
          products.push(product);
        }
      }

      await onImport(products);
      onClose();
    } catch (e) {
      alert("Erro na importação. Verifique os dados.");
      console.error(e);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[250] p-4 flex items-center justify-center backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-4xl rounded-[2rem] p-8 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-2xl font-black text-emerald-950 uppercase">Importação em Massa</h3>
            <p className="text-xs text-gray-400 font-bold uppercase mt-1">Passo {step} de 2: {step === 1 ? 'Colar Dados' : 'Mapear Colunas'}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-300 hover:text-emerald-700"><X size={24} /></button>
        </div>

        {step === 1 && (
          <div className="space-y-4 flex-1 overflow-y-auto">
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex gap-4 items-start">
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg"><Upload size={20} /></div>
              <div>
                <h4 className="font-bold text-emerald-900 text-sm">Instruções</h4>
                <p className="text-xs text-emerald-700 mt-1">Copie os dados do Excel (incluindo cabeçalhos) e cole abaixo, ou carregue um ficheiro CSV/Excel.</p>
              </div>
            </div>

            <textarea
              className="w-full h-64 p-4 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl font-mono text-xs focus:border-emerald-500 outline-none resize-none"
              placeholder={`Nome\tCódigo\tPreço\nParacetamol\t789...\t500\n...`}
              value={rawData}
              onChange={e => setRawData(e.target.value)}
            />

            <div className="flex justify-between items-center">
              <label className="cursor-pointer text-xs font-bold text-emerald-700 uppercase hover:underline">
                Carregar Ficheiro...
                <input type="file" onChange={handleFileUpload} className="hidden" accept=".csv,.txt" />
              </label>
              <button disabled={!rawData} onClick={parseData} className="px-8 py-3 bg-emerald-950 text-white rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-emerald-800 disabled:opacity-50">
                Continuar <ChevronRight size={14} className="inline ml-1" />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="overflow-x-auto flex-1 custom-scrollbar border border-gray-100 rounded-xl mb-4">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr>
                    {parsedData[0]?.map((_, index) => (
                      <th key={index} className="p-2 bg-gray-50 border-b border-gray-200 min-w-[150px]">
                        <div className="mb-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Coluna {index + 1}</div>
                        <select
                          className="w-full p-2 text-xs font-bold border rounded-lg focus:border-emerald-500 outline-none shadow-sm"
                          value={mappings[index] || 'skip'}
                          onChange={e => setMappings({ ...mappings, [index]: e.target.value })}
                        >
                          {fields.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                        </select>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {parsedData.slice(0, 5).map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      {row.map((cell, j) => (
                        <td key={j} className="p-3 text-xs text-gray-600 border-r border-gray-50 last:border-0 truncate max-w-[150px]">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-100 mb-4 text-[10px] text-yellow-800 font-bold text-center">
              A mostrar pré-visualização das primeiras 5 linhas. Total de linhas detectadas: {parsedData.length}.
            </div>
            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="text-gray-400 font-bold uppercase text-xs hover:text-gray-600">Voltar</button>
              <button
                onClick={executeImport}
                disabled={importing}
                className="px-8 py-3 bg-emerald-700 text-white rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-emerald-800 shadow-xl flex items-center gap-2">
                {importing ? 'Importando...' : `Importar ${parsedData.length - 1} Produtos`} <Save size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};




