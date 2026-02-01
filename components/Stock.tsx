import React, { useState, useMemo, useEffect } from 'react';
import {
  Search, Plus, Filter, Download, Edit2, Trash2, ArrowRightLeft, TrendingUp, TrendingDown,
  ChevronRight, ChevronLeft, Package, User, Calendar, LogOut, MessageSquare, Menu, X,
  CheckSquare, Square, Save, Upload, FileText, LayoutGrid, List, ShieldCheck
} from 'lucide-react';
import { Product, Supplier, HealthPlan } from '../types';
import { ProductService, HealthPlanService, AuthService, SupplierService, NotificationService } from '../services';
import { t, Language } from '../utils/i18n';

interface ProductFormProps {
  product?: Product | null;
  suppliers: Supplier[];
  onClose: () => void;
  onSave: (product: Product) => void;
  onDelete: (id: string) => void;
  lang?: Language;
}

const ProductForm: React.FC<ProductFormProps> = ({ product, suppliers, onClose, onSave, onDelete, lang = 'pt-MZ' }) => {
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
      <div className="bg-[rgb(var(--bg-surface))] dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] p-8 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh] custom-scrollbar border dark:border-white/10" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center border-b border-gray-100 dark:border-white/10 pb-4">
          <h3 className="text-xl font-black text-emerald-950 dark:text-emerald-400 uppercase tracking-tight">{product ? t('product.edit', lang as Language) : t('product.new', lang as Language)}</h3>
          <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-all"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 pb-4">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 focus-within:translate-x-1 transition-transform">
                <label className="text-[10px] font-black text-emerald-900/40 dark:text-emerald-400/50 uppercase tracking-[0.2em] px-1">{t('product.name', lang as Language)}</label>
                <input required className="w-full p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl font-bold border-2 border-transparent focus:bg-white dark:focus:bg-slate-700 focus:border-emerald-500 outline-none shadow-sm transition-all text-emerald-950 dark:text-white" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="space-y-1.5 focus-within:translate-x-1 transition-transform">
                <label className="text-[10px] font-black text-emerald-900/40 dark:text-emerald-400/50 uppercase tracking-[0.2em] px-1">{t('product.category', lang as Language)}</label>
                <select className="w-full p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl font-bold border-2 border-transparent focus:border-emerald-500 outline-none shadow-sm text-emerald-950 dark:text-white transition-all appearance-none" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                  <option className="dark:bg-slate-900">Medicamento</option><option className="dark:bg-slate-900">Antibiótico</option><option className="dark:bg-slate-900">Higiene</option><option className="dark:bg-slate-900">Suplemento</option><option className="dark:bg-slate-900">Equipamento</option><option className="dark:bg-slate-900">Geral</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-emerald-900/40 dark:text-emerald-400/50 uppercase tracking-[0.2em] px-1">{t('product.code', lang as Language)}</label>
                <input required className="w-full p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl font-bold border-2 border-transparent focus:bg-white dark:focus:bg-slate-700 focus:border-emerald-500 outline-none shadow-sm text-emerald-950 dark:text-white transition-all" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-emerald-900/40 dark:text-emerald-400/50 uppercase tracking-[0.2em] px-1">{t('product.supplier', lang as Language)}</label>
                <select className="w-full p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl font-bold border-2 border-transparent focus:border-emerald-500 outline-none shadow-sm text-emerald-950 dark:text-white transition-all appearance-none" value={formData.supplierId || ''} onChange={e => setFormData({ ...formData, supplierId: e.target.value })}>
                  <option value="" className="dark:bg-slate-900">Selecione...</option>
                  {suppliers.map(s => <option key={s.id} value={s.id} className="dark:bg-slate-900">{s.name}</option>)}
                </select>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] space-y-4 border border-gray-100 dark:border-white/10 shadow-sm">
              <h4 className="flex items-center gap-2 text-[10px] font-black text-gray-400 dark:text-emerald-400/60 uppercase tracking-[0.2em]">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                {t('product.finance', lang as Language)}
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 group">
                  <label className="text-[10px] font-black text-emerald-800/40 dark:text-emerald-400/50 uppercase tracking-[0.2em] px-1">{t('product.buy_price', lang as Language)}</label>
                  <input type="number" required min="0" step="0.01" className="w-full p-4 bg-gray-50 dark:bg-slate-900 rounded-2xl font-black text-emerald-950 dark:text-white outline-none border-2 border-transparent focus:border-emerald-500 shadow-sm transition-all" value={formData.purchasePrice} onChange={e => setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="space-y-1.5 group">
                  <label className="text-[10px] font-black text-emerald-800/40 dark:text-emerald-400/50 uppercase tracking-[0.2em] px-1">{t('product.sell_price', lang as Language)}</label>
                  <input type="number" required min="0" step="0.01" className="w-full p-4 bg-gray-50 dark:bg-slate-900 rounded-2xl font-black text-emerald-700 dark:text-emerald-400 outline-none border-2 border-transparent focus:border-emerald-500 shadow-sm transition-all" value={formData.salePrice} onChange={e => setFormData({ ...formData, salePrice: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] space-y-6 border border-gray-100 dark:border-white/10 shadow-sm">
              <h4 className="flex items-center gap-2 text-[10px] font-black text-gray-500 dark:text-emerald-400/60 uppercase tracking-[0.2em]">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                {t('product.logistics', lang as Language)}
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-emerald-950/40 dark:text-emerald-400/50 uppercase tracking-[0.2em] px-1">{product ? t('stock.current', lang as Language) : t('stock.initial', lang as Language)}</label>
                  <input
                    type="number"
                    disabled={!!product}
                    required
                    className={`w-full p-4 bg-gray-50 dark:bg-slate-900 rounded-2xl font-black text-emerald-950 dark:text-white shadow-sm outline-none border-2 border-transparent focus:border-emerald-500 transition-all ${product ? 'opacity-40 cursor-not-allowed grayscale' : ''}`}
                    value={formData.quantity}
                    onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-emerald-950/40 dark:text-emerald-400/50 uppercase tracking-[0.2em] px-1">{t('stock.unit', lang as Language)}</label>
                  <select className="w-full p-4 bg-gray-50 dark:bg-slate-900 border-2 border-transparent focus:border-emerald-500 rounded-2xl font-bold text-emerald-950 dark:text-white shadow-sm outline-none transition-all appearance-none" value={formData.unit || 'Unidade'} onChange={e => setFormData({ ...formData, unit: e.target.value })}>
                    <option className="dark:bg-slate-900">Unidade</option><option className="dark:bg-slate-900">Caixa</option><option className="dark:bg-slate-900">Pacote</option><option className="dark:bg-slate-900">Frasco</option><option className="dark:bg-slate-900">Kg</option><option className="dark:bg-slate-900">Litro</option><option className="dark:bg-slate-900">Cartela</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-emerald-950/40 dark:text-emerald-400/50 uppercase tracking-[0.2em] px-1">{t('stock.batch', lang as Language)}</label>
                  <input className="w-full p-4 bg-gray-50 dark:bg-slate-900 border-2 border-transparent focus:border-emerald-500 rounded-2xl font-bold text-emerald-950 dark:text-white shadow-sm outline-none transition-all" value={formData.batch || ''} onChange={e => setFormData({ ...formData, batch: e.target.value })} placeholder="Ex: LOT-2024" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-emerald-950/40 dark:text-emerald-400/50 uppercase tracking-[0.2em] px-1">{t('stock.expiry', lang as Language)}</label>
                  <input
                    type="date"
                    className="w-full p-4 bg-gray-50 dark:bg-slate-900 border-2 border-transparent focus:border-emerald-500 rounded-2xl font-bold text-emerald-950 dark:text-white shadow-sm outline-none transition-all"
                    value={formData.expiryDate ? new Date(formData.expiryDate).toISOString().split('T')[0] : ''}
                    onChange={e => setFormData({ ...formData, expiryDate: e.target.value ? new Date(e.target.value) : undefined })}
                  />
                </div>
              </div>
              <div className="space-y-1.5 max-w-[200px]">
                <label className="text-[10px] font-black text-emerald-950/40 dark:text-emerald-400/50 uppercase tracking-[0.2em] px-1">{t('stock.min', lang as Language)}</label>
                <input type="number" required min="0" className="w-full p-4 bg-gray-50 dark:bg-slate-900 border-2 border-transparent focus:border-emerald-500 rounded-2xl font-black text-emerald-950 dark:text-white shadow-sm outline-none transition-all" value={formData.minStock} onChange={e => setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
          </div>
          <div className="flex gap-4 mt-4">
            {product && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(t('product.delete_confirm', lang as Language))) {
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
              <Save size={20} /> {saving ? t('system.loading', lang as Language).toUpperCase() : (product ? t('product.edit', lang as Language).toUpperCase() : t('product.new', lang as Language).toUpperCase())}
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
  lang?: Language;
}

const BulkEditModal: React.FC<BulkEditModalProps> = ({ selectedIds, products, suppliers, onClose, onSave, lang = 'pt-MZ' }) => {
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
      <div className="bg-[rgb(var(--bg-surface))] dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl border dark:border-white/10">
        <h3 className="text-xl font-black text-[rgb(var(--text-main))] dark:text-white uppercase mb-4">{t('stock.bulk_edit', lang as Language)}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 font-medium">{t('stock.bulk_editing', lang as Language)} (<b>{selectedIds.length}</b>)</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 dark:text-emerald-400/40 uppercase tracking-widest px-1">{t('stock.bulk_field', lang as Language)}</label>
            <select className="w-full p-4 bg-gray-50 dark:bg-white/5 rounded-xl font-bold text-sm outline-none text-[rgb(var(--text-main))] dark:text-white" value={field} onChange={e => setField(e.target.value)}>
              <option className="dark:bg-slate-900" value="purchasePrice">{t('product.buy_price', lang as Language)}</option>
              <option className="dark:bg-slate-900" value="salePrice">{t('product.sell_price', lang as Language)}</option>
              <option className="dark:bg-slate-900" value="supplierId">{t('product.supplier', lang as Language)}</option>
              <option className="dark:bg-slate-900" value="minStock">{t('stock.min', lang as Language)}</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 dark:text-emerald-400/40 uppercase tracking-widest px-1">{t('stock.bulk_value', lang as Language)}</label>
            {field === 'supplierId' ? (
              <select className="w-full p-4 bg-gray-50 dark:bg-slate-800 rounded-xl font-bold text-sm outline-none text-[rgb(var(--text-main))] dark:text-white" value={value} onChange={e => setValue(e.target.value)} required>
                <option value="" className="dark:bg-slate-900">Selecione...</option>
                {suppliers.map(s => <option key={s.id} value={s.id} className="dark:bg-slate-900">{s.name}</option>)}
              </select>
            ) : (
              <input className="w-full p-4 bg-gray-50 dark:bg-slate-800 rounded-xl font-bold text-sm outline-none text-[rgb(var(--text-main))] dark:text-white"
                type="number" step="0.01"
                placeholder="Insira o novo valor..."
                value={value} onChange={e => setValue(e.target.value)} required
              />
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-4 bg-gray-100 dark:bg-white/5 text-gray-500 rounded-xl font-bold uppercase text-xs hover:bg-gray-200 dark:hover:bg-white/10">{t('common.cancel', lang as Language)}</button>
            <button type="submit" disabled={saving} className="flex-1 py-4 bg-emerald-700 text-white rounded-xl font-bold uppercase text-xs shadow-lg hover:bg-emerald-800 disabled:opacity-50">
              {saving ? t('system.loading', lang as Language).toUpperCase() : t('stock.bulk_apply', lang as Language)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ... Stock Component Start
export const Stock: React.FC<StockProps> = ({ products, setProducts, suppliers, initialModalOpen, onModalHandled, lang = 'pt-MZ' }) => {
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
    const nameStr = p.name || '';
    const codeStr = p.code || '';
    const matchesSearch = nameStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      codeStr.toLowerCase().includes(searchTerm.toLowerCase());
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
      await ProductService.bulkUpdate(Array.from(selectedProducts), field, value);

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
    if (!confirm(`Tem certeza que deseja apagar ${selectedProducts.size} produtos ? `)) return;

    try {
      await ProductService.bulkDelete(Array.from(selectedProducts));

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
    console.log("handleSaveProduct initiated", updatedProduct);
    try {
      let finalProduct: Product | null = null;
      const existingIndex = products.findIndex(p => p.id === updatedProduct.id);

      // Simple heuristic: UUIDs have hyphens. Temp IDs (Date.now()) do not.
      const hasRealId = updatedProduct.id && typeof updatedProduct.id === 'string' && updatedProduct.id.includes('-');

      console.log(`Product ID: ${updatedProduct.id}, hasRealId: ${hasRealId}, existingIndex: ${existingIndex}`);

      // Attempt update ONLY if it looks like a real UUID and exists locally
      if (existingIndex >= 0 && hasRealId) {
        console.log("Attempting Update...");
        try {
          finalProduct = await ProductService.update(updatedProduct);
          console.log("Update result:", finalProduct);
        } catch (err) {
          console.warn("Update failed, falling back to Add:", err);
          finalProduct = null;
        }
      } else {
        console.log("Skipping update (New or Temp ID). proceeding to Add.");
      }

      // If update wasn't attempted or returned null (not found/error), try adding
      if (!finalProduct) {
        console.log("Attempting Add...");
        // Ensure we don't send the temp ID to the add method if it's auto-generating
        finalProduct = await ProductService.add(updatedProduct);
        console.log("Add result:", finalProduct);
      }

      if (!finalProduct) {
        console.error("Critical: Final product is null after both attempts.");
        throw new Error("Falha ao salvar produto: O servidor não retornou dados.");
      }

      setProducts(prev => {
        if (existingIndex >= 0) {
          const newProducts = [...prev];
          newProducts[existingIndex] = finalProduct!;
          return newProducts;
        }
        return [finalProduct!, ...prev];
      });

      console.log("State updated successfully.");
      setIsProductFormOpen(false);
      setEditingProduct(null);
      alert("Produto salvo com sucesso!");
    } catch (e: any) {
      console.error("handleSaveProduct Error:", e);
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
        <div className="flex bg-[rgb(var(--bg-surface))] dark:bg-white/5 p-1.5 rounded-2xl shadow-sm w-full md:w-fit mx-auto overflow-x-auto custom-scrollbar no-scrollbar">
          <button onClick={() => setActiveTab('STOCK')} className={`flex-1 md:flex-none px-4 md:px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shrink-0 ${activeTab === 'STOCK' ? 'bg-emerald-700 text-white shadow-md' : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5'}`}>
            <LayoutGrid size={16} />
            <span className="whitespace-nowrap md:hidden">Gestão</span>
            <span className="whitespace-nowrap hidden md:inline">{t('stock.title', lang as Language)}</span>
          </button>
          <button onClick={() => setActiveTab('REGISTRY')} className={`flex-1 md:flex-none px-4 md:px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shrink-0 ${activeTab === 'REGISTRY' ? 'bg-emerald-700 text-white shadow-md' : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5'}`}>
            <List size={16} />
            <span className="whitespace-nowrap md:hidden">Produtos</span>
            <span className="whitespace-nowrap hidden md:inline">{t('stock.registry', lang as Language)}</span>
          </button>
          <button onClick={() => setActiveTab('HEALTH_PLANS')} className={`flex-1 md:flex-none px-4 md:px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shrink-0 ${activeTab === 'HEALTH_PLANS' ? 'bg-emerald-700 text-white shadow-md' : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5'}`}>
            <ShieldCheck size={16} />
            <span className="whitespace-nowrap md:hidden">Planos</span>
            <span className="whitespace-nowrap hidden md:inline">{t('stock.health_plans', lang as Language)}</span>
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex gap-4 items-center">
            <div className="relative group flex-1">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-600/50" size={20} />
              <input type="text" placeholder={t('stock.search_placeholder', lang as Language)} className="w-full pl-14 pr-6 py-5 bg-[rgb(var(--bg-surface))] dark:bg-white/5 rounded-2xl border border-transparent outline-none font-bold text-sm shadow-sm focus:border-emerald-500 transition-all text-[rgb(var(--text-main))] dark:text-white" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>

          {activeTab === 'STOCK' && (
            <div className="space-y-3">
              <div className="flex gap-2 mb-4 justify-between items-center">
                <div className="flex gap-2 items-center">
                  <FilterBtn active={filterType === 'ALL'} onClick={() => setFilterType('ALL')} label={t('stock.all', lang as Language)} />
                  <FilterBtn active={filterType === 'LOW_STOCK'} onClick={() => setFilterType('LOW_STOCK')} label={t('stock.low_stock', lang as Language)} isRed />

                  {/* Inline Bulk Actions for Stock Tab */}
                  {selectedProducts.size > 0 && (
                    <>
                      <div className="h-6 w-px bg-gray-200 dark:bg-white/10 mx-2"></div>
                      <span className="text-[10px] font-black uppercase text-emerald-800 dark:text-emerald-400 tracking-widest mr-1">{selectedProducts.size} {t('stock.selected', lang as Language)}</span>

                      <button onClick={() => setIsBulkEditOpen(true)} className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 transition-colors" title={t('stock.bulk_edit', lang as Language)}>
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => setIsBulkStockAdjustmentOpen(true)} className="p-2 bg-emerald-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 transition-colors" title={t('stock.bulk_adjust', lang as Language)}>
                        <ArrowRightLeft size={16} />
                      </button>
                      <button onClick={handleBulkDelete} className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 transition-colors" title={t('stock.bulk_delete', lang as Language)}>
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
                {/* Select All Toggle */}
                <button onClick={toggleAll} className="text-gray-400 dark:text-gray-500 hover:text-emerald-700 dark:hover:text-emerald-400 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                  {selectedProducts.size === filteredProducts.length && filteredProducts.length > 0 ? <CheckSquare size={18} className="text-emerald-600" /> : <Square size={18} />} {t('stock.select_all', lang as Language)}
                </button>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="py-20 text-center text-gray-300 dark:text-white/10 font-black uppercase tracking-widest text-[10px] opacity-20">{t('stock.no_results', lang as Language)}</div>
              ) : (
                filteredProducts.map(p => (
                  <div key={p.id} className={`bg-white dark:bg-slate-900 p-5 rounded-2xl border ${selectedProducts.has(p.id) ? 'border-emerald-500 bg-emerald-50/10 ring-1 ring-emerald-500' : 'border-gray-100 dark:border-white/10'} shadow-sm flex items-center gap-4 group hover:border-emerald-300 transition-all relative overflow-hidden`}>

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
                        <h4 className="font-black text-[rgb(var(--text-main))] dark:text-white text-sm uppercase truncate leading-tight">{p.name}</h4>
                        <span className="text-sm font-black text-emerald-700 dark:text-emerald-400 ml-2">MT {p.salePrice}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-gray-500 dark:text-emerald-400/40 font-black uppercase truncate tracking-wider">{p.category} • REF: <span className="text-emerald-800 dark:text-emerald-300">{p.code}</span></span>
                        {p.unit && <span className="bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded text-[9px] font-black uppercase">{p.unit}</span>}
                        {p.batch && <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded text-[9px] font-black uppercase">{t('stock.batch_label', lang as Language)}: {p.batch}</span>}
                        {p.expiryDate && (
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${new Date(p.expiryDate) < new Date() ? 'bg-red-100 text-red-700' : 'bg-orange-50 text-orange-700'}`}>
                            {t('stock.val_label', lang as Language)}: {new Date(p.expiryDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <div className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${p.quantity <= p.minStock ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {t('stock.initial', lang as Language).split(' ')[0]}: {p.quantity} Un.
                        </div>
                        <div className="flex-1 w-24 h-1.5 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden ml-2">
                          <div className={`h-full rounded-full ${p.quantity <= p.minStock ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, (p.quantity / (p.minStock * 4 || 20)) * 100)}%` }} />
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => { setEditingProduct(p); setIsAdjustmentOpen(true); }}
                      className="p-3 bg-gray-50 dark:bg-white/5 text-emerald-700 dark:text-emerald-400 rounded-xl hover:bg-emerald-700 hover:text-white transition-all shadow-sm active:scale-95"
                      title={t('stock.bulk_adjust', lang as Language)}
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
                      <span className="text-[10px] font-black uppercase text-emerald-800 dark:text-emerald-400 tracking-widest mr-2">{selectedProducts.size} {t('stock.selected', lang as Language)}</span>

                      <button onClick={() => setIsBulkEditOpen(true)} className="px-3 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-100 flex items-center gap-2">
                        <Edit2 size={14} /> {t('common.edit', lang as Language)}
                      </button>
                      <button onClick={() => setIsBulkStockAdjustmentOpen(true)} className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-100 flex items-center gap-2">
                        <ArrowRightLeft size={14} /> {t('nav.stock', lang as Language)}
                      </button>
                      <button onClick={handleBulkDelete} className="px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-100 flex items-center gap-2">
                        <Trash2 size={14} /> {t('common.delete', lang as Language)}
                      </button>
                    </div>
                  )}
                </div>

                {/* Right Side: Standard Actions */}
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      const csvContent = "Nome,Categoria,Codigo,PrecoCompra,PrecoVenda,Quantidade,StockMinimo\n" + products.map(p => `"${p.name}", "${p.category}", "${p.code}", ${p.purchasePrice},${p.salePrice},${p.quantity},${p.minStock} `).join("\n");
                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                      const link = document.createElement("a");
                      link.href = URL.createObjectURL(blob);
                      link.download = `stock_export_${new Date().toISOString().slice(0, 10)}.csv`;
                      link.click();
                    }}
                    className="px-4 py-4 bg-white text-emerald-700 border border-gray-200 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-sm hover:shadow-md flex items-center gap-2 transition-all"
                  >
                    <Download size={16} /> <span className="hidden md:inline">{t('stock.export', lang as Language)}</span>
                  </button>
                  <button onClick={() => setIsBulkImportOpen(true)} className="px-4 py-4 bg-white dark:bg-white/5 text-emerald-700 dark:text-emerald-400 border border-gray-200 dark:border-white/10 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-sm hover:shadow-md flex items-center gap-2 transition-all cursor-pointer">
                    <Upload size={16} /> <span className="hidden md:inline">{t('stock.import_bulk', lang as Language)}</span>
                  </button>
                  <button
                    onClick={() => { setEditingProduct(null); setIsProductFormOpen(true); }}
                    className="px-6 py-4 bg-emerald-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center gap-2 whitespace-nowrap hover:bg-emerald-800 transition-colors"
                  >
                    <Plus size={16} /> <span className="hidden md:inline">{t('product.new', lang as Language)}</span>
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/10">
                      <tr>
                        <th className="p-5 w-12">
                          <button onClick={toggleAll} className="text-emerald-600 hover:text-emerald-800">
                            {selectedProducts.size > 0 && selectedProducts.size === filteredProducts.length ? <CheckSquare size={20} /> : <Square size={20} className="text-gray-300" />}
                          </button>
                        </th>
                        <th className="p-5 text-[10px] font-black text-gray-400 dark:text-emerald-400/40 uppercase tracking-widest">{t('product.name', lang as Language)}</th>
                        <th className="p-5 text-[10px] font-black text-gray-400 dark:text-emerald-400/40 uppercase tracking-widest">{t('product.buy_price', lang as Language)}</th>
                        <th className="p-5 text-[10px] font-black text-gray-400 dark:text-emerald-400/40 uppercase tracking-widest">{t('product.sell_price', lang as Language)}</th>
                        <th className="p-5 text-[10px] font-black text-gray-400 dark:text-emerald-400/40 uppercase tracking-widest">{t('product.supplier', lang as Language)}</th>
                        <th className="p-5 text-[10px] font-black text-gray-400 dark:text-emerald-400/40 uppercase tracking-widest text-right">{t('product.margin', lang as Language)}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-white/5">
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
                              <p className="font-black text-emerald-950 dark:text-white text-xs">{p.name}</p>
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
                    <div className="p-10 text-center text-gray-300 dark:text-white/10 font-black uppercase tracking-widest text-[10px] opacity-50">{t('stock.no_results', lang as Language)}</div>
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
                  <Plus size={16} /> <span className="hidden md:inline">{t('hp.new', lang as Language)}</span>
                </button>
              </div>

              <div className="bg-white dark:bg-white/5 rounded-[2rem] border border-gray-100 dark:border-white/10 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/10">
                      <tr>
                        <th className="p-5 text-[10px] font-black text-gray-400 dark:text-emerald-400/40 uppercase tracking-widest">{t('hp.name', lang as Language)}</th>
                        <th className="p-5 text-[10px] font-black text-gray-400 dark:text-emerald-400/40 uppercase tracking-widest">{t('hp.insurer', lang as Language)}</th>
                        <th className="p-5 text-[10px] font-black text-gray-400 dark:text-emerald-400/40 uppercase tracking-widest">{t('hp.coverage', lang as Language)}</th>
                        <th className="p-5 text-[10px] font-black text-gray-400 dark:text-emerald-400/40 uppercase tracking-widest">{t('hp.contact', lang as Language)}</th>
                        <th className="p-5 text-[10px] font-black text-gray-400 dark:text-emerald-400/40 uppercase tracking-widest text-right">{t('common.actions', lang as Language)}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                      {healthPlans.length === 0 ? (
                        <tr><td colSpan={5} className="p-10 text-center text-gray-300 dark:text-white/10 font-black uppercase tracking-widest text-[10px] opacity-50">{t('stock.no_results', lang as Language)}</td></tr>
                      ) : (
                        healthPlans.map(hp => (
                          <tr key={hp.id} className="hover:bg-emerald-50/30 dark:hover:bg-white/5 transition-colors">
                            <td className="p-5"><p className="font-black text-emerald-950 dark:text-white text-xs">{hp.name}</p></td>
                            <td className="p-5 text-xs text-gray-600 dark:text-gray-400 font-bold">{hp.insurer}</td>
                            <td className="p-5"><span className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-lg text-xs font-black">{hp.coveragePercentage}%</span></td>
                            <td className="p-5 text-xs text-gray-500 dark:text-emerald-400/40">{hp.contact || 'N/A'}</td>
                            <td className="p-5 text-right">
                              <button onClick={() => { setEditingPlan(hp); setIsHealthPlanFormOpen(true); }} className="p-2 text-gray-400 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"><Edit2 size={18} /></button>
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
          lang={lang as Language}
        />
      )}

      {isBulkStockAdjustmentOpen && (
        <BulkStockAdjustmentModal
          selectedCount={selectedProducts.size}
          onClose={() => setIsBulkStockAdjustmentOpen(false)}
          onConfirm={handleBulkStockAdjustment}
          lang={lang as Language}
        />
      )}

      {isAdjustmentOpen && editingProduct && (
        <StockAdjustmentModal
          product={editingProduct}
          onClose={() => setIsAdjustmentOpen(false)}
          onConfirm={handleStockAdjustment}
          lang={lang as Language}
        />
      )}
      {isHealthPlanFormOpen && (
        <HealthPlanForm
          plan={editingPlan}
          onClose={() => setIsHealthPlanFormOpen(false)}
          onSave={handleSavePlan}
          lang={lang as Language}
        />
      )}
      {isBulkImportOpen && (
        <BulkImportModal
          onClose={() => setIsBulkImportOpen(false)}
          onImport={handleBulkImport}
          lang={lang as Language}
        />
      )}
    </>
  );
};

interface StockAdjustmentModalProps {
  product: Product;
  onClose: () => void;
  onConfirm: (newAmount: number, reason: string) => Promise<void>;
  lang?: Language;
}

const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({ product, onClose, onConfirm, lang = 'pt-MZ' }) => {
  const [type, setType] = useState<'ENTRY' | 'EXIT'>('ENTRY');
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const qty = parseInt(amount) || 0;
  const finalStock = type === 'ENTRY' ? product.quantity + qty : product.quantity - qty;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qty) return;
    if (confirm(t('stock.adjust_confirm_prompt', lang as Language))) {
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
      <div className="bg-[rgb(var(--bg-surface))] dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-8 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200 border dark:border-white/10" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center border-b dark:border-white/10 pb-4">
          <div>
            <h3 className="text-xl font-black text-emerald-950 dark:text-emerald-400 uppercase leading-none">{t('stock.adjust_title', lang as Language)}</h3>
            <p className="text-[10px] text-gray-400 dark:text-emerald-400/50 font-bold uppercase mt-1">PRODUCT: <span className="text-emerald-800 dark:text-emerald-300">{product.name}</span></p>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-gray-300 hover:text-emerald-700 transition-colors"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex gap-2 p-1 bg-gray-100 dark:bg-white/5 rounded-2xl">
            <button
              type="button"
              onClick={() => setType('ENTRY')}
              className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${type === 'ENTRY' ? 'bg-white dark:bg-white/10 shadow-md text-emerald-700 dark:text-emerald-400' : 'text-gray-400 dark:text-emerald-400/40'}`}
            >
              <TrendingUp size={16} /> {t('stock.entry', lang as Language)}
            </button>
            <button
              type="button"
              onClick={() => setType('EXIT')}
              className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${type === 'EXIT' ? 'bg-white dark:bg-red-500/20 shadow-md text-red-600' : 'text-gray-400 dark:text-emerald-400/40'}`}
            >
              <TrendingDown size={16} /> {t('stock.exit', lang as Language)}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 items-center">
            <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/10 text-center">
              <span className="text-[9px] font-black uppercase text-gray-400 dark:text-emerald-400/40 block mb-1">{t('stock.current', lang as Language)}</span>
              <span className="text-2xl font-black text-gray-900 dark:text-white">{product.quantity}</span>
            </div>
            <div className="flex justify-center text-gray-300"><ChevronRight size={24} /></div>
            <div className="p-4 rounded-2xl border-2 text-center absolute right-12 opacity-10 pointer-events-none">
              {/* Spacer */}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 dark:text-emerald-400/50 uppercase tracking-widest px-1">{t('stock.adjust_qty', lang as Language)} {type === 'ENTRY' ? t('stock.adjust_add', lang as Language) : t('stock.adjust_remove', lang as Language)}</label>
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

          <div className="flex justify-between items-center px-4 py-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100/50 dark:border-emerald-500/10">
            <span className="text-[10px] font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-widest">{t('stock.adjust_predicted', lang as Language)}:</span>
            <span className={`text-xl font-black ${finalStock < product.minStock ? 'text-red-500' : 'text-emerald-700 dark:text-emerald-400'}`}>{finalStock}</span>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 dark:text-emerald-400/50 uppercase tracking-widest px-1">{t('stock.adjust_reason', lang as Language)}</label>
            <input
              className="w-full p-4 bg-gray-50 dark:bg-white/5 rounded-2xl font-bold text-sm border-2 border-transparent focus:border-emerald-500 outline-none transition-all text-[rgb(var(--text-main))] dark:text-white"
              placeholder={t('stock.adjust_reason_placeholder', lang as Language)}
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
          </div>

          <button type="submit" disabled={saving} className={`w-full py-6 rounded-2xl font-black uppercase text-xs shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all text-white disabled:opacity-50 ${type === 'ENTRY' ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-red-600 hover:bg-red-700'}`}>
            <ArrowRightLeft size={20} /> {saving ? t('system.loading', lang as Language).toUpperCase() : t('stock.adjust_confirm', lang as Language)}
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
  lang?: Language;
}

const BulkStockAdjustmentModal: React.FC<BulkStockAdjustmentModalProps> = ({ selectedCount, onClose, onConfirm, lang = 'pt-MZ' }) => {
  const [type, setType] = useState<'ENTRY' | 'EXIT'>('ENTRY');
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(amount);
    if (!qty) return;

    if (confirm(t('stock.bulk_adjust_confirm', lang as Language))) {
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
      <div className="bg-[rgb(var(--bg-surface))] dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-8 space-y-6 shadow-2xl border dark:border-white/10" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center border-b dark:border-white/10 pb-4">
          <div>
            <h3 className="text-xl font-black text-emerald-950 dark:text-emerald-400 uppercase leading-none">{t('stock.bulk_adjust', lang as Language)}</h3>
            <p className="text-[10px] text-gray-400 dark:text-emerald-400/50 font-bold uppercase mt-1"><b>{selectedCount}</b> {t('stock.selected', lang as Language)}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-gray-300 hover:text-emerald-700 transition-colors"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex gap-2 p-1 bg-gray-100 dark:bg-white/5 rounded-2xl">
            <button
              type="button"
              onClick={() => setType('ENTRY')}
              className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${type === 'ENTRY' ? 'bg-white dark:bg-white/10 shadow-md text-emerald-700 dark:text-emerald-400' : 'text-gray-400 dark:text-emerald-400/40'}`}
            >
              <TrendingUp size={16} /> {t('stock.entry', lang as Language)}
            </button>
            <button
              type="button"
              onClick={() => setType('EXIT')}
              className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${type === 'EXIT' ? 'bg-white dark:bg-red-500/20 shadow-md text-red-600' : 'text-gray-400 dark:text-emerald-400/40'}`}
            >
              <TrendingDown size={16} /> {t('stock.exit', lang as Language)}
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 dark:text-emerald-400/50 uppercase tracking-widest px-1">{t('stock.adjust_qty', lang as Language)} {type === 'ENTRY' ? t('stock.entry', lang as Language) : t('stock.exit', lang as Language)} ({t('common.item', lang as Language)})</label>
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
            <label className="text-[10px] font-black text-gray-400 dark:text-emerald-400/50 uppercase tracking-widest px-1">{t('stock.adjust_reason', lang as Language)}</label>
            <input
              className="w-full p-4 bg-gray-50 dark:bg-white/5 rounded-2xl font-bold text-sm border-transparent focus:border-emerald-500 outline-none text-[rgb(var(--text-main))] dark:text-white"
              placeholder={t('stock.adjust_reason_placeholder', lang as Language)}
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
          </div>

          <button type="submit" disabled={saving} className={`w-full py-6 rounded-2xl font-black uppercase text-xs shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all text-white disabled:opacity-50 ${type === 'ENTRY' ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-red-600 hover:bg-red-700'}`}>
            <ArrowRightLeft size={20} /> {saving ? t('system.loading', lang as Language).toUpperCase() : t('stock.adjust_confirm', lang as Language)}
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
  lang?: Language;
}

const HealthPlanForm: React.FC<HealthPlanFormProps> = ({ plan, onClose, onSave, lang = 'pt-MZ' }) => {
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
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] p-8 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh] custom-scrollbar border dark:border-white/10" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center border-b border-gray-100 dark:border-white/10 pb-4">
          <h3 className="text-xl font-black text-emerald-950 dark:text-emerald-400 uppercase tracking-tight">{plan ? 'EDITAR PLANO' : 'NOVO PLANO DE SAÚDE'}</h3>
          <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-all"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 pb-4">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 translate-x-0">
                <label className="text-[10px] font-black text-emerald-900/40 dark:text-emerald-400/50 uppercase tracking-[0.2em] px-1">Nome do Plano</label>
                <input required className="w-full p-4 bg-gray-50 dark:bg-white/5 rounded-2xl font-bold border-2 border-transparent focus:bg-white dark:focus:bg-white/10 focus:border-emerald-500 outline-none shadow-sm transition-all text-emerald-950 dark:text-white" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ex: Médis Standard" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-emerald-900/40 dark:text-emerald-400/50 uppercase tracking-[0.2em] px-1">Seguradora / Entidade</label>
                <input required className="w-full p-4 bg-gray-50 dark:bg-white/5 rounded-2xl font-bold border-2 border-transparent focus:bg-white dark:focus:bg-white/10 focus:border-emerald-500 outline-none shadow-sm transition-all text-emerald-950 dark:text-white" value={formData.provider} onChange={e => setFormData({ ...formData, provider: e.target.value })} placeholder="Ex: Moçambique Seguros" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-emerald-900/40 dark:text-emerald-400/50 uppercase tracking-[0.2em] px-1">Cobertura (%)</label>
                <input type="number" required min="1" max="100" className="w-full p-4 bg-gray-50 dark:bg-white/5 rounded-2xl font-bold border-2 border-transparent focus:bg-white dark:focus:bg-white/10 focus:border-emerald-500 outline-none shadow-sm text-emerald-950 dark:text-white transition-all" value={formData.coveragePercent} onChange={e => setFormData({ ...formData, coveragePercent: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-emerald-900/40 dark:text-emerald-400/50 uppercase tracking-[0.2em] px-1">Contato</label>
                <input className="w-full p-4 bg-gray-50 dark:bg-white/5 rounded-2xl font-bold border-2 border-transparent focus:bg-white dark:focus:bg-white/10 focus:border-emerald-500 outline-none shadow-sm text-emerald-950 dark:text-white transition-all" value={formData.contactPhone || ''} onChange={e => setFormData({ ...formData, contactPhone: e.target.value })} placeholder="+258..." />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-emerald-900/40 dark:text-emerald-400/50 uppercase tracking-[0.2em] px-1">E-mail de Contacto</label>
                <input type="email" className="w-full p-4 bg-gray-50 dark:bg-white/5 rounded-2xl font-bold border-2 border-transparent focus:bg-white dark:focus:bg-white/10 focus:border-emerald-500 outline-none shadow-sm text-emerald-950 dark:text-white transition-all" value={formData.contactEmail || ''} onChange={e => setFormData({ ...formData, contactEmail: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-emerald-900/40 dark:text-emerald-400/50 uppercase tracking-[0.2em] px-1">Website Portal</label>
                <input className="w-full p-4 bg-gray-50 dark:bg-white/5 rounded-2xl font-bold border-2 border-transparent focus:bg-white dark:focus:bg-white/10 focus:border-emerald-500 outline-none shadow-sm text-emerald-950 dark:text-white transition-all" value={formData.portalUrl || ''} onChange={e => setFormData({ ...formData, portalUrl: e.target.value })} />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] space-y-6 border border-gray-100 dark:border-white/10 shadow-sm">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-500 dark:text-emerald-400/60 uppercase tracking-[0.2em] px-1">Descrição / Notas</label>
                <textarea className="w-full p-4 bg-gray-50 dark:bg-black/40 border-2 border-transparent focus:border-emerald-500 rounded-2xl font-bold text-emerald-950 dark:text-white shadow-sm outline-none transition-all min-h-[100px]" value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-500 dark:text-emerald-400/60 uppercase tracking-[0.2em] px-1">Detalhes Técnicos / Cobertura</label>
                <textarea className="w-full p-4 bg-gray-50 dark:bg-black/40 border-2 border-transparent focus:border-emerald-500 rounded-2xl font-bold text-emerald-950 dark:text-white shadow-sm outline-none transition-all min-h-[100px]" value={formData.technicalDetails || ''} onChange={e => setFormData({ ...formData, technicalDetails: e.target.value })} />
              </div>
            </div>
          </div>

          <button type="submit" className="w-full py-6 bg-emerald-700 text-white rounded-2xl font-black uppercase text-xs shadow-xl hover:bg-emerald-800 active:scale-95 transition-all flex items-center justify-center gap-2">
            <Save size={20} /> {t('hp.save', lang as Language).toUpperCase()}
          </button>
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
  lang?: Language;
}

interface BulkImportModalProps {
  onClose: () => void;
  onImport: (products: Partial<Product>[]) => Promise<void>;
  lang?: Language;
}

const BulkImportModal: React.FC<BulkImportModalProps> = ({ onClose, onImport, lang = 'pt-MZ' }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [rawData, setRawData] = useState('');
  const [parsedData, setParsedData] = useState<string[][]>([]);
  const [mappings, setMappings] = useState<Record<number, string>>({});
  const [importing, setImporting] = useState(false);

  const downloadTemplate = () => {
    const headers = ['Código / Ref', 'Nome Genérico', 'Nome Comercial', 'Stock Inicial', 'Preco de Compra', 'Preco De Venda', 'Fornecedor Habitual', 'Categoria', 'Unidade', 'Lote', 'Validade', 'Minimo de Stock'];
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "template_importacao_stock.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Field Options for Mapping
  const fields = [
    { id: 'name', label: t('mapping.name_req', lang as Language) },
    { id: 'code', label: t('mapping.code', lang as Language) },
    { id: 'category', label: t('mapping.category', lang as Language) },
    { id: 'purchasePrice', label: t('mapping.buy_price', lang as Language) },
    { id: 'salePrice', label: t('mapping.sell_price', lang as Language) },
    { id: 'quantity', label: t('mapping.qty', lang as Language) },
    { id: 'minStock', label: t('mapping.min', lang as Language) },
    { id: 'unit', label: t('mapping.unit', lang as Language) },
    { id: 'batch', label: t('mapping.batch', lang as Language) },
    { id: 'expiryDate', label: t('mapping.expiry', lang as Language) },
    { id: 'supplierId', label: t('mapping.supplier', lang as Language) },
    { id: 'skip', label: t('mapping.skip', lang as Language) }
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
    rows[0].forEach((header, index) => {
      const h = header.toLowerCase();
      if (h.includes('nome comercial') || h.includes('nome do produto')) newMappings[index] = 'name';
      else if (h.includes('nome genérico') || h.includes('composição')) newMappings[index] = 'description';
      else if (h.includes('código') || h.includes('ref') || h.includes('barras')) newMappings[index] = 'code';
      else if (h.includes('categoria')) newMappings[index] = 'category';
      else if (h.includes('compra') || h.includes('custo')) newMappings[index] = 'purchasePrice';
      else if (h.includes('venda') || h.includes('pvp') || h.includes('preco de venda')) newMappings[index] = 'salePrice';
      else if (h.includes('stock inicial') || h.includes('qtd') || h.includes('quant')) newMappings[index] = 'quantity';
      else if (h.includes('minimo') || h.includes('alerta')) newMappings[index] = 'minStock';
      else if (h.includes('fornecedor')) newMappings[index] = 'supplierId';
      else if (h.includes('unidade') || h.includes('uni')) newMappings[index] = 'unit';
      else if (h.includes('lote') || h.includes('lot')) newMappings[index] = 'batch';
      else if (h.includes('validade') || h.includes('val')) newMappings[index] = 'expiryDate';
    });
    setMappings(newMappings);
  };

  const executeImport = async () => {
    setImporting(true);
    console.log("Starting Bulk Import...");
    let lastErrorMessage = '';

    try {
      const allProducts = await ProductService.getAll();
      const startRow = 1;
      let successCount = 0;
      let errorCount = 0;

      for (let i = startRow; i < parsedData.length; i++) {
        const row = parsedData[i];
        const productData: any = { category: 'Geral', quantity: 0, minStock: 5, purchasePrice: 0, salePrice: 0 };
        let hasName = false;
        let supplierName = '';

        Object.entries(mappings).forEach(([colIndex, field]) => {
          if (field && field !== 'skip') {
            const val = row[parseInt(colIndex)];
            const cleanVal = val ? val.trim() : '';

            if (field === 'purchasePrice' || field === 'salePrice') {
              productData[field] = parseFloat(cleanVal.replace(/[^0-9.,]/g, '').replace(',', '.') || '0') || 0;
            } else if (field === 'quantity' || field === 'minStock') {
              productData[field] = parseInt(cleanVal.replace(/[^0-9]/g, '') || '0') || 0;
            } else if (field === 'supplierId') {
              supplierName = cleanVal;
            } else if (field === 'description') {
              productData.description = (productData.description ? productData.description + ' | ' : '') + cleanVal;
            } else if (field === 'expiryDate') {
              // Fix: Only set expiryDate if value is present to avoid "invalid input syntax for type date: ''" error from DB
              if (cleanVal) productData[field] = cleanVal;
            } else {
              // For other fields like batch, unit, etc. Only set if has value to avoid clutter
              if (cleanVal) productData[field as string] = cleanVal;
            }

            if (field === 'name' && cleanVal) hasName = true;
          }
        });

        if (hasName) {
          try {
            // Handle Supplier Resolution
            if (supplierName) {
              const sId = await SupplierService.findOrCreateByName(supplierName);
              if (sId) productData.supplierId = sId;
            }

            const existing = allProducts.find(p => p.code === productData.code);
            let result: Product | null = null;

            if (existing) {
              // UPSERT: Try Update found product
              console.log(`Updating existing product: ${existing.name} (${existing.code})`);
              result = await ProductService.update({ ...existing, ...productData });
            }

            // If not found OR update failed, Create new
            if (!result) {
              console.log(`Creating new product: ${productData.name}`);
              if (!productData.code) productData.code = `IMP-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

              // Check if code really exists to avoid unique violation if getAll was stale
              // (Though expensive, safe for bulk)
              result = await ProductService.add(productData);
            }

            if (result) successCount++;
            else {
              throw new Error("API returned null without error");
            }
          } catch (rowError: any) {
            console.error(`Error processing row ${i}:`, rowError);
            lastErrorMessage = rowError.message || JSON.stringify(rowError);
            errorCount++;
          }
        }
      }

      console.log(`Import finished. Success: ${successCount}, Errors: ${errorCount}`);

      // Notify User
      const user = AuthService.getCurrentUser();
      if (user?.id) {
        await NotificationService.sendInApp({
          userId: user.id,
          type: 'STOCK',
          title: 'Importação Concluída',
          content: `Processamento finalizado. Sucesso: ${successCount}, Falhas: ${errorCount}. ${lastErrorMessage ? `Últro erro: ${lastErrorMessage}` : ''}`,
          metadata: { count: successCount, errors: errorCount, lastError: lastErrorMessage }
        });
      }

      let msg = `Importação concluída! ${successCount} produtos processados com sucesso.`;
      if (errorCount > 0) {
        msg += `\n${errorCount} falhas.`;
        if (lastErrorMessage) msg += `\nExemplo de erro: ${lastErrorMessage}`;
      }
      alert(msg);
      window.location.reload();
    } catch (e: any) {
      alert(t('bulk_import.error', lang as Language) + "\n" + e.message);
      console.error("Bulk Import Fatal Error:", e);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[250] p-4 flex items-center justify-center backdrop-blur-sm animate-in fade-in">
      <div className="bg-[rgb(var(--bg-surface))] dark:bg-slate-950 w-full max-w-4xl rounded-[2.5rem] p-8 shadow-2xl flex flex-col max-h-[90vh] border dark:border-white/10" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-2xl font-black text-emerald-950 dark:text-emerald-400 uppercase tracking-tight">{t('bulk_import.title', lang as Language)}</h3>
            <p className="text-[10px] text-gray-400 dark:text-emerald-400/50 font-bold uppercase mt-1">{t('bulk_import.step', lang as Language)} {step} de 2: {step === 1 ? t('bulk_import.paste', lang as Language) : t('bulk_import.map', lang as Language)}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-all"><X size={24} /></button>
        </div>

        {step === 1 && (
          <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar">
            <div className="bg-white dark:bg-slate-900 shadow-sm p-5 rounded-3xl border border-gray-100 dark:border-white/10 flex gap-4 items-start">
              <div className="p-3 bg-gray-50 dark:bg-slate-800 text-emerald-800 dark:text-emerald-400 rounded-2xl shadow-sm"><Upload size={20} /></div>
              <div>
                <h4 className="font-black text-gray-950 dark:text-emerald-400 text-sm uppercase tracking-wider">{t('bulk_import.instructions', lang as Language)}</h4>
                <p className="text-xs text-gray-500 dark:text-emerald-400/60 mt-1 font-medium leading-relaxed">{t('bulk_import.desc', lang as Language)}</p>
              </div>
            </div>

            <textarea
              className="w-full h-64 p-6 bg-white dark:bg-slate-900 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-3xl font-mono text-[11px] focus:border-emerald-500 outline-none resize-none transition-all shadow-inner text-emerald-950 dark:text-emerald-50 custom-scrollbar"
              placeholder={t('bulk_import.placeholder', lang as Language)}
              value={rawData}
              onChange={e => setRawData(e.target.value)}
            />

            <div className="flex justify-between items-center pt-2">
              <div className="flex gap-4">
                <label className="cursor-pointer text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest hover:underline flex items-center gap-2">
                  <FileText size={16} /> {t('bulk_import.load_file', lang as Language)}
                  <input type="file" onChange={handleFileUpload} className="hidden" accept=".csv,.txt" />
                </label>
                <button onClick={downloadTemplate} className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest hover:underline flex items-center gap-2">
                  <Download size={16} /> Download Template
                </button>
              </div>
              <button disabled={!rawData} onClick={parseData} className="px-10 py-4 bg-emerald-900 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:bg-emerald-800 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2">
                {t('bulk_import.continue', lang as Language)} <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="overflow-x-auto flex-1 custom-scrollbar border border-gray-100 dark:border-white/10 rounded-3xl mb-4 shadow-inner bg-white dark:bg-slate-900">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr>
                    {parsedData[0]?.map((_, index) => (
                      <th key={index} className="p-4 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-white/10 min-w-[180px]">
                        <div className="mb-2 text-[10px] font-black text-gray-400 dark:text-emerald-400/40 uppercase tracking-widest px-1">{t('bulk_import.column', lang as Language)} {index + 1}</div>
                        <select
                          className="w-full p-3 text-xs font-black border-2 border-transparent bg-gray-50 dark:bg-slate-900 rounded-xl focus:border-emerald-500 outline-none shadow-sm transition-all text-emerald-950 dark:text-emerald-400"
                          value={mappings[index] || 'skip'}
                          onChange={e => setMappings({ ...mappings, [index]: e.target.value })}
                        >
                          {fields.map(f => <option key={f.id} value={f.id} className="dark:bg-slate-900">{f.label}</option>)}
                        </select>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                  {parsedData.slice(0, 5).map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                      {row.map((cell, j) => (
                        <td key={j} className="p-4 text-xs font-bold text-gray-600 dark:text-emerald-50/60 border-r border-gray-50 dark:border-white/5 last:border-0 truncate max-w-[180px]">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-yellow-50/50 dark:bg-yellow-950/20 p-4 rounded-2xl border border-yellow-200/50 dark:border-yellow-500/10 mb-4 text-[10px] text-yellow-800 dark:text-yellow-400 font-black uppercase tracking-widest text-center animate-pulse">
              {t('bulk_import.preview_limit', lang as Language).replace('{n}', parsedData.length.toString())}
            </div>
            <div className="flex justify-between items-center px-2">
              <button onClick={() => setStep(1)} className="text-[10px] font-black text-gray-400 dark:text-white/40 uppercase tracking-widest hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors flex items-center gap-2">
                <ChevronLeft size={16} /> {t('bulk_import.back', lang as Language)}
              </button>
              <button
                onClick={executeImport}
                disabled={importing}
                className="px-10 py-5 bg-emerald-700 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:bg-emerald-800 active:scale-95 transition-all flex items-center gap-3">
                {importing ? t('system.loading', lang as Language).toUpperCase() : t('bulk_import.import_n', lang as Language).replace('{n}', (parsedData.length - 1).toString())} <Save size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
