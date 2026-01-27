import React, { useState, useMemo } from 'react';
import {
  Search, ShoppingCart, X, Plus, Trash2, Printer, CreditCard, Banknote, Smartphone, Receipt as ReceiptIcon, User, Package, Calculator, ArrowRight, Download, FileText, UserPlus, List, LayoutGrid, Wallet, ChevronRight, MoreHorizontal, Check, Coffee, CircleDot, History, Files, Landmark, Minus
} from 'lucide-react';
import { MOCK_USER } from '../constants';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Product, SaleItem, PaymentMethod, Sale, Customer, CompanyInfo } from '../types';
import { NotificationService } from '../services/notification.service';

// --- Components ---

interface ReceiptProps {
  sale: Sale;
  companyInfo: CompanyInfo;
  onClose: () => void;
  currentUser?: { name: string; email: string };
}

const Receipt: React.FC<ReceiptProps> = ({ sale, companyInfo, onClose, currentUser }) => {
  const [printMode, setPrintMode] = React.useState<'THERMAL' | 'A4'>('THERMAL');

  const getMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      CASH: 'Dinheiro',
      MPESA: 'M-Pesa',
      EMOLA: 'E-Mola',
      MKESH: 'm-Kesh',
      TRANSFER: 'Transferência',
      OTHER: 'Outro'
    };
    return labels[method] || method;
  };

  const handlePrint = (mode: 'THERMAL' | 'A4') => {
    setPrintMode(mode);

    // Wait for state update then clone and print
    setTimeout(() => {
      const receipt = document.getElementById('pos-receipt');
      if (!receipt) return;

      // Create a clone for printing
      const printContainer = document.createElement('div');
      printContainer.id = 'print-container';
      printContainer.style.position = 'fixed';
      printContainer.style.top = '0';
      printContainer.style.left = '0';
      printContainer.style.width = '100%';
      printContainer.style.height = '100%';
      printContainer.style.zIndex = '99999';
      printContainer.style.background = 'white';
      printContainer.style.overflow = 'visible'; // Allow overflow for long receipts

      // Clone content
      const content = receipt.cloneNode(true) as HTMLElement;

      // Apply print-specific styles to the clone based on mode
      if (mode === 'THERMAL') {
        content.style.width = '80mm';
        content.style.margin = '0 auto'; // Center thermal? Or left? User requested button, assuming standard left or center.
        content.style.padding = '0';
        content.style.fontSize = '12px';
      } else {
        content.style.width = '100%';
        content.style.maxWidth = '210mm';
        content.style.margin = '0 auto';
        content.style.padding = '20mm';
        content.style.fontSize = '12pt';
      }

      // Remove any screen-only restrictions from the clone
      content.style.maxHeight = 'none';
      content.style.overflow = 'visible';
      content.style.height = 'auto';

      printContainer.appendChild(content);
      document.body.appendChild(printContainer);

      // Add print class to body to hide other stuff
      document.body.classList.add('printing');

      // Print
      window.print();

      // Cleanup
      document.body.removeChild(printContainer);
      document.body.classList.remove('printing');
    }, 100);
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById('pos-receipt');
    if (!element) return;

    // Temporarily fix styles for capture
    const originalOverflow = element.style.overflow;
    const originalHeight = element.style.height;
    element.style.overflow = 'visible';
    element.style.height = 'auto';

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = 80; // 80mm thermal width
      const xOffset = (210 - 80) / 2; // Center on A4
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', xOffset, 10, pdfWidth, pdfHeight);
      pdf.save(`recibo_${sale.id}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Erro ao baixar PDF");
    } finally {
      element.style.overflow = originalOverflow;
      element.style.height = originalHeight;
    }
  };

  React.useEffect(() => {
    // Force re-render/style update when printMode passes
  }, [printMode]);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[200] p-4 backdrop-blur-sm print:p-0 print:bg-white print:static print:inset-auto print:block">
      {/* Print Style Override */}
      <style>{`
        @media print {
          body > *:not(#print-container) { display: none !important; }
          #print-container { display: block !important; }
        }
      `}</style>

      <div className="bg-[rgb(var(--bg-surface))] dark:bg-slate-900 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col h-auto max-h-[90vh] print:shadow-none print:max-w-none print:h-auto print:rounded-none border dark:border-white/10">
        <div className="p-4 border-b dark:border-white/10 flex justify-between items-center bg-gray-50 dark:bg-white/5 print:hidden shrink-0">
          <div className="flex gap-2">
            <button onClick={() => handlePrint('THERMAL')} className="flex items-center gap-2 px-3 py-2 bg-emerald-100 text-emerald-800 rounded-xl hover:bg-emerald-200 transition-colors">
              <Printer size={16} />
              <span className="text-[10px] font-black uppercase">Recibo</span>
            </button>
            <button onClick={() => handlePrint('A4')} className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-800 rounded-xl hover:bg-blue-200 transition-colors">
              <FileText size={16} />
              <span className="text-[10px] font-black uppercase">A4</span>
            </button>
            <button onClick={handleDownloadPDF} className="p-2 text-gray-400 hover:text-gray-600 bg-gray-100 rounded-xl">
              <Download size={16} />
            </button>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div id="pos-receipt" className="flex-1 overflow-y-auto p-6 md:p-8 text-center font-mono text-[11px] print:overflow-visible print:px-2 print:py-0 bg-white dark:bg-white/5 dark:text-white">
          <div className="mb-6 flex flex-col items-center">
            {/* Logo Logic: A4 uses Horizontal, Thermal uses Vertical or Principal */}
            {((printMode === 'A4' && (companyInfo.logoHorizontal || true)) || companyInfo.logoVertical || companyInfo.logo || true) && (
              <img
                src={
                  (printMode === 'A4')
                    ? (companyInfo.logoHorizontal || "/logo-horizontal-green.png")
                    : (companyInfo.logoVertical || companyInfo.logo || "/logo-vertical-green.png")
                }
                className="h-12 mb-2"
                alt="Logo"
              />
            )}
            <h2 className="text-base font-black uppercase text-emerald-950 leading-none mb-1">{companyInfo.name}</h2>
            <p className="text-[9px] font-bold uppercase text-emerald-600 tracking-widest">{companyInfo.slogan}</p>
            <div className="text-[9px] text-gray-400 uppercase mt-2 space-y-0.5">
              <p>NUIT: {companyInfo.nuit}</p>
              <p>{companyInfo.address}</p>
            </div>
          </div>

          <div className="border-t border-dashed border-gray-300 my-4"></div>

          <div className="text-left space-y-1 uppercase font-bold text-[10px] text-gray-600">
            <div className="flex justify-between"><span>Data:</span><span>{new Date(sale.timestamp).toLocaleDateString()}</span></div>
            <div className="flex justify-between"><span>Hora:</span><span>{new Date(sale.timestamp).toLocaleTimeString()}</span></div>
            <div className="flex justify-between"><span>Doc:</span><span># {sale.id}</span></div>
            <div className="flex justify-between"><span>Client:</span><span>{sale.customerName || 'Venda Direta'}</span></div>
            <div className="flex justify-between"><span>OP:</span><span>{currentUser?.name || 'Sistema'}</span></div>
          </div>

          <div className="border-t border-dashed border-gray-300 my-4"></div>

          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-900">
                <th className="py-1 uppercase text-[9px] font-black">Item</th>
                <th className="py-1 text-center text-[9px] font-black">Qtd</th>
                <th className="py-1 text-right text-[9px] font-black">Total</th>
              </tr>
            </thead>
            <tbody className="text-[10px]">
              {sale.items.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-1.5 leading-tight uppercase font-medium">{item.productName}</td>
                  <td className="py-1.5 text-center">{item.quantity}</td>
                  <td className="py-1.5 text-right font-bold">{item.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t-2 border-emerald-950 my-4 pt-3">
            <div className="flex justify-between text-lg font-black text-emerald-950">
              <span>TOTAL</span>
              <span>MT {sale.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[9px] mt-1 font-bold uppercase text-gray-500">
              <span>Método:</span>
              <span className="text-emerald-700">{getMethodLabel(sale.paymentMethod)}</span>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-dashed border-gray-200">
            <p className="text-[8px] text-gray-400 font-bold uppercase">OBRIGADO PELA PREFERÊNCIA!</p>
            <p className="text-[7px] text-gray-300 font-bold uppercase mt-1">PROCESSADO POR NOBREZA ERP</p>
          </div>
        </div>

        <div className="p-4 bg-gray-50 border-t flex gap-3 print:hidden shrink-0">
          <button onClick={handleDownloadPDF} className="flex-1 bg-white border border-gray-200 text-gray-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-[10px] uppercase hover:bg-gray-50">
            <Download size={16} /> PDF
          </button>
          <button onClick={handlePrint} className="flex-1 bg-emerald-950 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-[10px] uppercase shadow-lg hover:bg-emerald-900">
            <Printer size={16} /> Imprimir
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Main POS Component ---

interface POSProps {
  products: Product[];
  customers: Customer[];
  companyInfo: CompanyInfo;
  onSaleComplete: (sale: Sale) => void;
  onQuickAddCustomer: (customer: Customer) => void;
  salesHistory: Sale[];
  currentUser?: { name: string; email: string };
}

export const POS: React.FC<POSProps> = ({ products, customers, companyInfo, onSaleComplete, onQuickAddCustomer, salesHistory, currentUser }) => {
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [isInvoice, setIsInvoice] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showPaymentSelection, setShowPaymentSelection] = useState(false);
  const [currentSale, setCurrentSale] = useState<Sale | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [otherDetails, setOtherDetails] = useState('');
  const [showOtherInput, setShowOtherInput] = useState(false);

  // Derived State
  const filteredProducts = useMemo(() => {
    return products.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  const total = useMemo(() => cart.reduce((sum, item) => sum + item.total, 0), [cart]);

  // Actions
  const addToCart = (product: Product) => {
    if (product.quantity <= 0) { alert("Sem stock!"); return; } // Ideally replace with a toast
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.quantity) { return prev; } // Max stock visual feedback needed
        return prev.map(item => item.productId === product.id ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.unitPrice } : item);
      }
      return [...prev, { productId: product.id, productName: product.name, quantity: 1, unitPrice: product.salePrice, total: product.salePrice }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    setCart(prev => {
      const existing = prev.find(item => item.productId === productId);
      // Remove if qty goes to 0 (optional design choice, usually min is 1)
      if (!existing && delta < 0) return prev;

      const newQty = (existing?.quantity || 0) + delta;

      if (newQty <= 0) {
        return prev.filter(item => item.productId !== productId);
      }

      if (newQty > product.quantity) { return prev; } // Cap at stock

      return prev.map(item => {
        if (item.productId === productId) {
          return { ...item, quantity: newQty, total: newQty * item.unitPrice };
        }
        return item;
      });
    });
  };

  const finalizeSale = (method: PaymentMethod) => {
    if (method === 'OTHER' && !showOtherInput) { setShowOtherInput(true); return; }

    // Auto-register logic for new customers
    const finalCustomerName = selectedCustomer?.name || customerSearch;
    if (finalCustomerName && !selectedCustomer) {
      const exists = customers.find(c => c.name.toLowerCase() === finalCustomerName.toLowerCase());
      if (!exists) {
        const newCustomer: Customer = {
          id: Date.now().toString(36),
          name: finalCustomerName,
          nuit: '999999999',
          contact: '',
          email: '',
          address: '',
          type: 'NORMAL',
          totalSpent: 0,
          createdAt: new Date(),
          companyId: companyInfo.id
        };
        onQuickAddCustomer(newCustomer);
      }
    }

    const newSale: Sale = {
      id: `FAC - ${Date.now().toString().slice(-6)} `,
      timestamp: new Date(),
      items: [...cart],
      total: total,
      type: isInvoice ? 'INVOICE' : 'DIRECT',
      customerName: finalCustomerName || undefined,
      paymentMethod: method,
      otherPaymentDetails: method === 'OTHER' ? otherDetails : undefined,
      performedBy: currentUser?.name || 'Sistema',
      companyId: companyInfo.id
    };
    onSaleComplete(newSale);
    setCurrentSale(newSale);

    // Trigger In-App Notification
    if (currentUser?.id) {
      NotificationService.sendInApp({
        userId: currentUser.id,
        type: 'SALE',
        title: 'Nova Venda Realizada',
        content: `Venda de MT ${total.toLocaleString()} finalizada por ${newSale.performedBy}.`,
        metadata: { saleId: newSale.id }
      });
    }

    setShowPaymentSelection(false);
    setIsCartOpen(false);
    setCart([]);
  };

  const resetSaleState = () => {
    setCart([]);
    setCustomerSearch('');
    setSelectedCustomer(null);
    setIsInvoice(false);
    setCurrentSale(null);
    setShowPaymentSelection(false);
    setShowOtherInput(false);
    setOtherDetails('');
  };

  return (
    <div className="flex h-full gap-6 overflow-hidden">

      {/* LEFT PANEL: PRODUCT GRID */}
      <div className="flex-1 flex flex-col min-w-0 bg-[rgb(var(--bg-surface))] dark:bg-black/20 rounded-[2rem] shadow-sm overflow-hidden">
        {/* Header: Search & Info */}
        <div className="p-5 border-b dark:border-white/5 flex gap-4 items-center shrink-0 bg-[rgb(var(--bg-surface))] dark:bg-transparent z-10">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Pesquisar por nome ou código..."
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border-2 border-transparent focus:bg-white dark:focus:bg-white/10 focus:border-emerald-500 outline-none font-medium text-sm transition-all text-[rgb(var(--text-main))] dark:text-white placeholder-gray-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider px-3">
            <LayoutGrid size={16} />
            <span>{filteredProducts.length} items</span>
          </div>
        </div>

        {/* Grid Content */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
            {filteredProducts.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onAdd={() => addToCart(product)}
              />
            ))}
            {filteredProducts.length === 0 && (
              <div className="col-span-full h-40 flex flex-col items-center justify-center text-gray-400">
                <Package size={40} className="mb-2 opacity-50" />
                <p className="text-sm font-medium">Nenhum produto encontrado</p>
              </div>
            )}
          </div>
        </div>
      </div>


      {/* RIGHT PANEL: CART & CHECKOUT (Desktop Sidebar) */}
      <div className={`
        fixed inset-0 z-50 bg-black/50 transition-opacity md:static md:bg-transparent md:z-auto md:w-[400px] shrink-0
        ${isCartOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none md:opacity-100 md:pointer-events-auto'}
      `}>
        <div className={`
          absolute right-0 top-0 bottom-0 w-[90%] max-w-[400px] bg-[rgb(var(--bg-surface))] dark:bg-black/20 md:bg-gray-50 dark:md:bg-transparent md:border-l dark:md:border-white/5 shadow-2xl md:shadow-none flex flex-col
          md:relative md:w-full md:h-full md:rounded-[2rem] md:overflow-hidden transition-transform duration-300
          ${isCartOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
        `}>

          {/* Cart Header */}
          <div className="p-5 border-b border-gray-200 dark:border-white/5 md:border-gray-100 bg-white dark:bg-black/20 md:bg-gray-50 dark:md:bg-transparent flex justify-between items-center shrink-0">
            <div>
              <h2 className="text-sm font-black text-[rgb(var(--text-main))] dark:text-white uppercase tracking-widest flex items-center gap-2">
                <ShoppingCart size={18} className="text-emerald-600" /> Venda Atual
              </h2>
              <p className="text-[10px] text-gray-400 font-bold mt-0.5">{cart.length} itens adicionados</p>
            </div>
            <button onClick={() => setIsCartOpen(false)} className="md:hidden p-2 bg-gray-100 dark:bg-white/5 rounded-full text-[rgb(var(--text-main))] dark:text-white">
              <X size={20} />
            </button>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-white dark:bg-black/40 md:bg-gray-50 dark:md:bg-transparent">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 opacity-60">
                <ShoppingCart size={48} className="mb-4 text-gray-300 dark:text-gray-800" />
                <p className="text-xs font-bold uppercase tracking-widest text-center">Carrinho Vazio</p>
                <p className="text-[10px] mt-2">Adicione produtos para iniciar</p>
              </div>
            ) : (
              cart.map(item => (
                <CartItem
                  key={item.productId}
                  item={item}
                  onInc={() => updateQuantity(item.productId, 1)}
                  onDec={() => updateQuantity(item.productId, -1)}
                  onRemove={() => setCart(c => c.filter(i => i.productId !== item.productId))}
                />
              ))
            )}
          </div>

          {/* Cart Footer / Checkout */}
          <div className="p-5 bg-white dark:bg-black/40 border-t dark:border-white/5 shrink-0 space-y-4 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] z-10">

            {/* Client Selector (Compact) */}
            <div className="relative">
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 p-2 pr-4 rounded-xl border border-gray-100 dark:border-white/5 focus-within:border-emerald-500 focus-within:bg-white transition-all">
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-700">
                  <User size={16} />
                </div>
                <input
                  className="bg-transparent text-xs font-bold text-gray-700 placeholder-gray-400 outline-none flex-1"
                  placeholder="Venda Direta / Nome do Cliente"
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                />
                <button
                  onClick={() => onQuickAddCustomer({ id: `c-${Date.now()}`, name: customerSearch, companyId: companyInfo.id, totalSpent: 0, lastVisit: new Date(), phone: '', email: '' })}
                  className="text-emerald-600 hover:bg-emerald-50 p-1.5 rounded-lg"
                  title="Novo Cliente"
                >
                  <UserPlus size={16} />
                </button>
              </div>

              {/* Customer Search Dropdown */}
              {customerSearch && !selectedCustomer && (
                <div className="absolute bottom-full left-0 w-full bg-white shadow-2xl rounded-2xl border border-gray-100 mb-2 p-1 z-[100] animate-in slide-in-from-bottom-2 max-h-48 overflow-y-auto custom-scrollbar">
                  {customers
                    .filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()))
                    .map(c => (
                      <div
                        key={c.id}
                        onClick={() => {
                          setSelectedCustomer(c);
                          setCustomerSearch(c.name);
                        }}
                        className="p-3 hover:bg-emerald-50 rounded-xl flex items-center justify-between cursor-pointer group transition-colors"
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-emerald-950 uppercase">{c.name}</span>
                          <span className="text-[10px] text-gray-400 font-bold uppercase">{c.phone || 'Sem telefone'}</span>
                        </div>
                        <Check size={14} className="text-emerald-500 opacity-0 group-hover:opacity-100" />
                      </div>
                    ))}
                  {customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase())).length === 0 && (
                    <div className="p-4 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest italic">
                      Nenhum cliente encontrado
                    </div>
                  )}
                </div>
              )}

              {/* Selected Customer Badge */}
              {selectedCustomer && (
                <div className="absolute bottom-full left-0 w-full mb-2 flex items-center justify-between bg-emerald-950 text-white p-2 rounded-xl border border-emerald-900 shadow-lg animate-in slide-in-from-bottom-2">
                  <div className="flex items-center gap-2 overflow-hidden px-1">
                    <User size={12} className="text-emerald-400 shrink-0" />
                    <span className="text-[10px] font-black uppercase truncate">{selectedCustomer.name}</span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedCustomer(null);
                      setCustomerSearch('');
                    }}
                    className="p-1 hover:bg-white/10 rounded-lg text-emerald-400"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total a Pagar</span>
                <span className="text-2xl font-black text-[rgb(var(--text-main))] dark:text-white tracking-tighter">MT {total.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={() => {
                if (cart.length === 0) return;
                setShowPaymentSelection(true);
              }}
              disabled={cart.length === 0}
              className={`
                w-full py-4 rounded-xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 shadow-lg transition-all
                ${cart.length === 0 ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none' : 'bg-emerald-950 text-emerald-400 hover:bg-emerald-900 shadow-emerald-900/20 active:scale-[0.98]'}
              `}
            >
              Finalizar Venda <ChevronRight size={16} />
            </button>
          </div>

        </div>
      </div>

      {/* Floating Button for Mobile Cart Trigger */}
      <button
        onClick={() => setIsCartOpen(true)}
        className="md:hidden fixed bottom-6 right-6 h-14 w-14 bg-emerald-600 text-white rounded-full shadow-2xl flex items-center justify-center z-40"
      >
        <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white">{cart.length}</span>
        <ShoppingCart size={24} />
      </button>

      {/* Payment Selection Modal */}
      {showPaymentSelection && (
        <PaymentModal
          total={total}
          onClose={() => setShowPaymentSelection(false)}
          onSelectMethod={finalizeSale}
          showOtherInput={showOtherInput}
          otherDetails={otherDetails}
          setOtherDetails={setOtherDetails}
          onConfirmOther={() => finalizeSale('OTHER')}
          companyInfo={companyInfo}
        />
      )}

      {/* Receipt Modal */}
      {currentSale && <Receipt sale={currentSale} companyInfo={companyInfo} onClose={resetSaleState} currentUser={currentUser} />}

    </div>
  );
};


// --- Sub-components for Cleaner Code ---

const ProductCard: React.FC<{ product: Product; onAdd: () => void }> = ({ product, onAdd }) => (
  <button
    onClick={onAdd}
    className="group relative flex flex-col bg-[rgb(var(--bg-surface))] dark:bg-white/5 hover:border-emerald-500/30 rounded-2xl p-4 text-left transition-all hover:shadow-[0_4px_20px_rgba(16,185,129,0.06)] active:scale-[0.98]"
  >
    <div className="flex items-start justify-between mb-3">
      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors">
        <Package size={20} />
      </div>
      <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${product.quantity <= product.minStock ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-400'} `}>
        Stock: {product.quantity}
      </div>
    </div>

    <h3 className="font-bold text-[rgb(var(--text-main))] dark:text-white text-xs uppercase leading-tight line-clamp-2 mb-auto min-h-[2.5em]">
      {product.name}
    </h3>

    <div className="mt-3 pt-3 border-t dark:border-white/5 flex items-end justify-between">
      <div>
        <span className="text-[10px] font-bold text-gray-400 block -mb-0.5">Preço</span>
        <span className="text-sm font-black text-emerald-700 dark:text-emerald-400">MT {product.salePrice}</span>
      </div>
      <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-white/5 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:bg-emerald-600 dark:group-hover:bg-emerald-500 group-hover:text-white transition-colors">
        <Plus size={16} strokeWidth={3} />
      </div>
    </div>
  </button>
);

const CartItem: React.FC<{ item: SaleItem; onInc: () => void; onDec: () => void; onRemove: () => void }> = ({ item, onInc, onDec, onRemove }) => (
  <div className="group flex items-center gap-3 bg-[rgb(var(--bg-surface))] dark:bg-white/5 p-3 rounded-2xl shadow-sm relative overflow-hidden">
    <div className="flex-1 min-w-0">
      <p className="font-bold text-[rgb(var(--text-main))] dark:text-white text-xs uppercase truncate">{item.productName}</p>
      <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">MT {item.total.toFixed(2)}</p>
    </div>

    <div className="flex items-center gap-1 bg-gray-50 dark:bg-black/20 rounded-lg p-1">
      <button onClick={onDec} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-red-500 hover:shadow-sm transition-all">
        <Minus size={12} strokeWidth={3} />
      </button>
      <span className="w-6 text-center text-xs font-black text-[rgb(var(--text-main))] dark:text-white">{item.quantity}</span>
      <button onClick={onInc} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-emerald-500 hover:shadow-sm transition-all">
        <Plus size={12} strokeWidth={3} />
      </button>
    </div>

    <button onClick={onRemove} className="opacity-0 group-hover:opacity-100 absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-white via-white to-transparent flex items-center justify-end pr-3 text-red-400 hover:text-red-600 transition-all">
      <Trash2 size={16} />
    </button>
  </div>
);

const PaymentModal = ({ total, onClose, onSelectMethod, showOtherInput, otherDetails, setOtherDetails, onConfirmOther, companyInfo }: any) => (
  <div className="fixed inset-0 bg-emerald-950/95 z-[999] flex flex-col animate-in fade-in duration-200">
    <div className="p-6 flex justify-between items-center text-white shrink-0">
      <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
        <Wallet size={24} className="text-emerald-400" /> Pagamento
      </h3>
      <button onClick={onClose} className="p-2 opacity-70 hover:opacity-100"><X size={32} /></button>
    </div>

    <div className="flex-1 overflow-y-auto px-6 pb-20 max-w-2xl mx-auto w-full">
      <div className="text-center mb-10 mt-4">
        <p className="text-xs font-black text-emerald-400 uppercase tracking-[0.2em] mb-2">Total Final</p>
        <p className="text-6xl font-black text-white tracking-tighter">MT {total.toFixed(2)}</p>
      </div>

      {!showOtherInput ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <PaymentBtn icon={Banknote} label="Dinheiro" onClick={() => onSelectMethod('CASH')} color="bg-emerald-600" />
          <PaymentBtn icon={Smartphone} label="M-Pesa" onClick={() => onSelectMethod('MPESA')} color="bg-red-600" />
          <PaymentBtn icon={Smartphone} label="E-Mola" onClick={() => onSelectMethod('EMOLA')} color="bg-orange-600" />
          <PaymentBtn icon={Smartphone} label="m-Kesh" onClick={() => onSelectMethod('MKESH')} color="bg-amber-500" />
          <PaymentBtn icon={CreditCard} label="POS" onClick={() => onSelectMethod('TRANSFER')} color="bg-blue-600" />

          {/* Custom Methods */}
          {companyInfo?.paymentMethods?.map((pm: string) => (
            <PaymentBtn key={pm} icon={CreditCard} label={pm} onClick={() => onSelectMethod(pm)} color="bg-purple-600" />
          ))}

          <PaymentBtn icon={MoreHorizontal} label="Outro" onClick={() => onSelectMethod('OTHER')} color="bg-gray-700" />
        </div>
      ) : (
        <div className="space-y-6 animate-in slide-in-from-bottom-4">
          <div className="bg-white/10 p-6 rounded-3xl border border-white/10">
            <label className="block text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-4">Detalhes do Pagamento</label>
            <input
              autoFocus
              className="w-full bg-white/5 border-2 border-white/20 rounded-2xl p-5 text-white font-black text-lg outline-none focus:border-emerald-500 transition-all placeholder-white/30"
              placeholder="Ex: Cheque Nº 123..."
              value={otherDetails}
              onChange={e => setOtherDetails(e.target.value)}
            />
          </div>
          <button
            onClick={onConfirmOther}
            className="w-full bg-emerald-500 text-emerald-950 py-6 rounded-2xl font-black uppercase tracking-widest shadow-2xl hover:bg-emerald-400 hover:scale-[1.01] transition-all"
          >
            Confirmar Pagamento
          </button>
          <button onClick={() => onSelectMethod('CANCEL_OTHER')} className="w-full py-4 text-emerald-400 font-bold text-xs uppercase tracking-widest">
            Voltar
          </button>
        </div>
      )}
    </div>
  </div>
);

const PaymentBtn = ({ icon: Icon, label, onClick, color }: any) => (
  <button
    onClick={onClick}
    className="group relative overflow-hidden bg-white/5 border border-white/10 p-6 rounded-3xl flex flex-col items-center justify-center gap-4 hover:bg-white/10 active:scale-95 transition-all"
  >
    <div className={`p-4 rounded-2xl shadow-xl text-white ${color} group-hover:scale-110 transition-transform`}>
      <Icon size={28} strokeWidth={1.5} />
    </div>
    <span className="text-[10px] font-black text-white uppercase tracking-widest group-hover:text-emerald-200 transition-colors">{label}</span>
  </button>
);
