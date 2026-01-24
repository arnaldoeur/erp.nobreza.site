import React, { useState, useMemo, useRef, useEffect } from 'react';
import { PasswordConfirmationModal } from './PasswordConfirmationModal';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { createPortal } from "react-dom";
import {
  Building2,
  Users,
  Save,
  Mail,
  Phone,
  MapPin,
  Fingerprint,
  UserPlus,
  Trash2,
  Globe,
  Upload,
  Clock,
  Briefcase,
  Edit2,
  X,
  Sparkles,
  Camera,
  LayoutDashboard,
  FilePieChart,
  BarChart3,
  ListFilter,
  ArrowUpRight,
  TrendingUp,
  AlertCircle,
  TrendingDown,
  ChevronRight,
  Printer,
  FileSpreadsheet,
  Zap,
  History,
  Search,
  Package,
  ArrowRight,
  Calendar,
  ShoppingCart,
  User as UserIcon,
  Download,
  FileText,
  Lock,
  Wallet,
  Banknote,
  Smartphone,
  CreditCard,
  ShieldCheck,
  Plus
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie } from 'recharts';
import { CompanyInfo, User, UserRole, DailyClosure, SystemLog, Sale, Product, PaymentMethod } from '../types';
import { LogService, NotificationService, CompanyService, TimeTrackingService } from '../services';
import { WorkShift } from '../services/time-tracking.service';
import { supabase } from '../services/supabase';
import { Support } from './Support';
import { PerformanceReport } from './PerformanceReport';
import { SystemSettings } from './SystemSettings';
import { LayoutTemplate } from 'lucide-react';

type ReportType = 'GERAL' | 'CATALOGO' | 'VENDAS' | 'STOCK' | 'PRESENCAS' | 'LOGS';

interface SettingsProps {
  companyInfo: CompanyInfo;
  setCompanyInfo: (info: CompanyInfo) => void;
  team: User[];
  onUpdateTeam: (users: User[]) => void;
  currentUser: User;
  dailyClosures: DailyClosure[];
  logs: SystemLog[];
  sales: Sale[];
  products: Product[];
  expenses?: any[];
  initialTab?: 'FINANCE' | 'COMPANY' | 'TEAM' | 'PROFILE';
  onTabHandled?: () => void;
  onAddSale: (sale: Sale) => Promise<void>;
}





const TabButton = ({ active, onClick, icon: Icon, label }: any) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all ${active ? 'bg-emerald-950 text-white shadow-lg' : 'text-gray-400 hover:text-emerald-700 hover:bg-emerald-50'}`}
  >
    <Icon size={16} />
    <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

const ShiftsManager = ({ shifts, onUpdate }: { shifts: any[], onUpdate: (shifts: any[]) => void }) => {
  const [newShift, setNewShift] = useState({ name: '', start: '08:00', end: '16:00' });

  const addShift = () => {
    if (!newShift.name) return;
    onUpdate([...shifts, newShift]);
    setNewShift({ name: '', start: '08:00', end: '16:00' });
  };

  const removeShift = (idx: number) => {
    onUpdate(shifts.filter((_, i) => i !== idx));
  };

  return (
    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div className="md:col-span-2 space-y-1">
          <label className="text-[9px] font-black text-gray-400 uppercase tracking-tight">Nome do Turno (ex: Manhã)</label>
          <input
            value={newShift.name}
            onChange={e => setNewShift({ ...newShift, name: e.target.value })}
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl font-bold text-emerald-950 text-xs outline-none"
            placeholder="Nome do turno..."
          />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-gray-400 uppercase tracking-tight">Início</label>
          <input
            type="time"
            value={newShift.start}
            onChange={e => setNewShift({ ...newShift, start: e.target.value })}
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl font-bold text-emerald-950 text-xs outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-gray-400 uppercase tracking-tight">Fim</label>
          <input
            type="time"
            value={newShift.end}
            onChange={e => setNewShift({ ...newShift, end: e.target.value })}
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl font-bold text-emerald-950 text-xs outline-none"
          />
        </div>
      </div>
      <button
        onClick={addShift}
        type="button"
        className="flex items-center gap-2 px-6 py-3 bg-emerald-950 text-white rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-black transition-all"
      >
        <Plus size={14} /> Adicionar Turno
      </button>

      {shifts.length > 0 && (
        <div className="mt-4 space-y-2">
          {shifts.map((s, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg"><Clock size={16} /></div>
                <div>
                  <p className="text-xs font-black text-emerald-950 uppercase">{s.name}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">{s.start} - {s.end}</p>
                </div>
              </div>
              <button
                onClick={() => removeShift(i)}
                type="button"
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const Settings: React.FC<SettingsProps> = ({
  companyInfo, setCompanyInfo, team, onUpdateTeam, currentUser,
  dailyClosures, logs, sales, products, expenses = [], initialTab, onTabHandled, onAddSale
}) => {
  const [activeTab, setActiveTab] = useState<'REPORTS' | 'FINANCE' | 'EXPENSES' | 'CAIXA' | 'COMPANY' | 'TEAM' | 'PROFILE' | 'PERFORMANCE' | 'SYSTEM'>('REPORTS');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
      onTabHandled?.();
    }
  }, [initialTab, onTabHandled]);

  const [tempInfo, setTempInfo] = useState(companyInfo);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<User | null>(null);
  const [reportFilter, setReportFilter] = useState({
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    type: 'GERAL' as ReportType
  });
  const [shifts, setShifts] = useState<WorkShift[]>([]);
  const [loadingShifts, setLoadingShifts] = useState(false);

  useEffect(() => {
    if (reportFilter.type === 'PRESENCAS') {
      const fetchShifts = async () => {
        setLoadingShifts(true);
        try {
          const data = await TimeTrackingService.getShifts(undefined, reportFilter.startDate, reportFilter.endDate);
          setShifts(data);
        } catch (e) {
          console.error(e);
        } finally {
          setLoadingShifts(false);
        }
      };
      fetchShifts();
    }
  }, [reportFilter.type, reportFilter.startDate, reportFilter.endDate]);

  const [priceAdjustmentAmount, setPriceAdjustmentAmount] = useState<number>(0);
  const [adjustingPrices, setAdjustingPrices] = useState(false);
  const [isReportPreviewOpen, setIsReportPreviewOpen] = useState(false);
  const [previewScale, setPreviewScale] = useState(0.85);

  useEffect(() => {
    const handleResize = () => {
      const containerW = window.innerWidth - 64;
      // A4 width in px at 96 DPI is approx 794px
      if (containerW < 794) {
        setPreviewScale(Math.max(0.4, containerW / 794));
      } else {
        setPreviewScale(0.85);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const saveReportToDB = async (type: string, period: string, data: any, summary: string) => {
    try {
      const { error } = await supabase.from('reports').insert({
        company_id: currentUser.companyId,
        user_id: currentUser.id,
        type,
        period,
        summary,
        data,
        metadata: { version: '1.0', generated_via: 'WEB_PREVIEW' }
      });
      if (error) console.error('Error saving report:', error);
      else console.log('Relatório salvo no histórico.');
    } catch (e) {
      console.error('Failed to save report to DB', e);
    }
  };

  const [isPasswordConfirmOpen, setIsPasswordConfirmOpen] = useState(false);
  const [pendingAdjustment, setPendingAdjustment] = useState<any>(null);

  const requestAdjustment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const type = formData.get('type') as string;
    const method = formData.get('method') as string;
    const amount = parseFloat(formData.get('amount') as string);
    const description = formData.get('description') as string;

    if (!amount || amount <= 0) return;

    setPendingAdjustment({ type, method, amount, description });
    setIsPasswordConfirmOpen(true);
  };

  const handleAdjustmentSubmit = async () => {
    if (!pendingAdjustment) return;
    const { type, method, amount, description } = pendingAdjustment;
    const finalAmount = type === 'SAIDA' ? -amount : amount;

    const processPDF = async (action: 'DOWNLOAD' | 'PRINT') => {
      // NOTE: We now use Native Browser Print for both actions to ensure A4 Pagination support.
      // 'DOWNLOAD' essentially tells the user to "Save as PDF" in the dialog.
      const element = document.getElementById('printable-report');
      if (!element) return;

      const printWindow = window.open('', '', 'width=1024,height=768');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Relatório Financeiro - Nobreza ERP</title>
              <script src="https://cdn.tailwindcss.com"></script>
              <style>
                @media print {
                  @page { size: A4; margin: 10mm; }
                  body { -webkit-print-color-adjust: exact; font-family: sans-serif; }
                  .break-inside-avoid { break-inside: avoid; }
                  tr { page-break-inside: avoid; }
                  thead { display: table-header-group; }
                  tfoot { display: table-footer-group; }
                }
                body { padding: 20px; background: white; }
                table { width: 100%; border-collapse: collapse; }
                th { text-align: left; border-bottom: 2px solid #000; padding: 5px; font-size: 10px; text-transform: uppercase; }
                td { border-bottom: 1px solid #ddd; padding: 5px; font-size: 10px; }
              </style>
            </head>
            <body>
              ${element.innerHTML}
              <script>
                // Auto-print after styles load
                setTimeout(() => {
                  window.print();
                  // window.close(); // Optional: User might want to keep it open
                }, 1000);
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    };

    const adjustmentSale: Sale = {
      id: `ADJ-${Date.now()}`,
      items: [{
        productId: 'ADJUSTMENT',
        quantity: 1,
        unitPrice: finalAmount,
        total: finalAmount,
        companyId: currentUser.companyId,
        productName: description || `Ajuste de ${type === 'SAIDA' ? 'Saída' : 'Entrada'}`
      }],
      total: finalAmount,
      companyId: currentUser.companyId,
      type: 'DIRECT',
      paymentMethod: method as PaymentMethod,
      timestamp: new Date(),
      performedBy: currentUser.name,
      customerName: 'Sistema (Ajuste)',
      otherPaymentDetails: 'N/A'
    };

    try {
      await onAddSale(adjustmentSale);

      // Log the adjustment
      await LogService.add({
        companyId: currentUser.companyId,
        action: 'AJUSTE_CAIXA',
        details: `Ajuste de ${type}: MT ${amount} (${description}). Autorizado por ${currentUser.name}`,
        userId: currentUser.id,
        userName: currentUser.name
      });

      setIsAdjustmentModalOpen(false);
      setIsPasswordConfirmOpen(false);
      setPendingAdjustment(null);
      alert("Ajuste realizado com sucesso.");
    } catch (error) {
      console.error("Adjustment error:", error);
      alert("Erro ao processar ajuste.");
    }
  };

  const checkMethod = (method: string, target: string[]) => {
    if (!method) return false;
    const m = method.toLowerCase();
    return target.some(t => m.includes(t));
  }

  const fileInputRef = useRef<HTMLInputElement>(null);

  const analytics = useMemo(() => {
    if (!sales || !dailyClosures) return { totalInMonth: 0, totalDivergence: 0, salesCount: 0, totalExpenses: 0, netProfit: 0, topProducts: [], byMethod: {} as any };

    const monthSales = sales.filter(s => {
      const d = new Date(s.timestamp);
      return d.getMonth() === reportFilter.month && d.getFullYear() === reportFilter.year;
    });

    const monthExpenses = expenses.filter(e => {
      const d = new Date(e.date || e.timestamp);
      return d.getMonth() === reportFilter.month && d.getFullYear() === reportFilter.year;
    });

    const totalInMonth = monthSales.reduce((a, b) => a + b.total, 0);
    const totalExpenses = monthExpenses.reduce((a, b) => a + (b.amount || 0), 0);
    const netProfit = totalInMonth - totalExpenses;

    const byMethod: Record<string, number> = {};
    monthSales.forEach(s => {
      const m = s.paymentMethod?.toUpperCase() || 'OTHER';
      byMethod[m] = (byMethod[m] || 0) + s.total;
    });

    const totalDivergence = dailyClosures.filter(c => {
      const d = new Date(c.closureDate);
      return d.getMonth() === reportFilter.month && d.getFullYear() === reportFilter.year;
    }).reduce((a, b) => a + (b.difference || 0), 0);

    // Calculate Investments (Expenses with category 'STOCK' or 'PURCHASE' or 'FORNECEDOR')
    const stockInvestments = monthExpenses
      .filter(e => {
        const cat = (e.category || '').toUpperCase();
        return cat.includes('STOCK') || cat.includes('COMPRA') || cat.includes('FORNECEDOR') || cat.includes('INVESTIMENTO');
      })
      .reduce((a, b) => a + (b.amount || 0), 0);

    // Calculate Stock Output (at Purchase Price / Cost)
    let stockOutputs = 0;
    monthSales.forEach(s => {
      s.items.forEach(item => {
        // Find product to get its *current* purchase price (best effort)
        const product = products.find(p => p.id === item.productId || p.name === item.productName);
        const costPrice = product ? Number(product.purchasePrice || 0) : 0;
        stockOutputs += (item.quantity * costPrice);
      });
    });

    const sellerCounts: Record<string, number> = {};
    monthSales.forEach(s => sellerCounts[s.performedBy] = (sellerCounts[s.performedBy] || 0) + s.total);
    const bestSeller = Object.entries(sellerCounts).sort((a, b) => b[1] - a[1])[0];

    return {
      totalInMonth,
      totalExpenses,
      netProfit,
      totalDivergence,
      salesCount: monthSales.length,
      byMethod,
      topProducts: [],
      bestSeller,
      stockInvestments, // New field
      stockOutputs      // New field
    };
  }, [sales, dailyClosures, expenses, reportFilter, products]);

  const stockStats = useMemo(() => {
    return {
      totalValue: products.reduce((acc, p) => acc + ((p.purchasePrice || 0) * (p.quantity || 0)), 0),
      totalItems: products.reduce((acc, p) => acc + (p.quantity || 0), 0),
      investment: products.reduce((acc, p) => acc + ((p.purchasePrice || 0) * (p.quantity || 0)), 0)
    };
  }, [products]);

  const handleGlobalPriceAdjustment = async () => {
    if (!priceAdjustmentAmount || priceAdjustmentAmount === 0) return;
    if (!confirm(`Deseja ajustar o Preço de TODOS os produtos em ${priceAdjustmentAmount}%?`)) return;

    setAdjustingPrices(true);
    try {
      const { error } = await supabase.rpc('adjust_all_prices', { percentage: priceAdjustmentAmount });
      if (error) throw error;
      alert("Preços ajustados com sucesso!");
      window.location.reload();
    } catch (e: any) {
      console.error(e);
      alert("Erro ao ajustar Preços: " + e.message);
    } finally {
      setAdjustingPrices(false);
    }
  };


  const processPDF = async (action: 'DOWNLOAD' | 'PRINT') => {
    const element = document.getElementById('printable-report');
    if (!element) return;

    // Open a print window
    const printWindow = window.open('', '', 'width=1024,height=768');

    if (printWindow) {
      // Save to DB (Fire and Forget)
      const periodStr = `${months[reportFilter.month]} ${reportFilter.year}`;
      const summaryStr = `Receita: ${analytics.totalInMonth}, Lucro: ${analytics.netProfit}`;
      // Snapshot key metrics
      saveReportToDB(reportFilter.type || 'GERAL', periodStr, {
        analytics,
        stockStats,
        salesCount: sales.length,
        expensesCount: expenses?.length,
        generatedAt: new Date().toISOString()
      }, summaryStr);

      printWindow.document.write(`
        <html>
          <head>
            <title>Relatório Financeiro</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
               @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
               body { 
                 font-family: 'Inter', sans-serif; 
                 -webkit-print-color-adjust: exact; 
                 print-color-adjust: exact;
               }
               @media print {
                 @page { size: A4; margin: 10mm; }
                 table { page-break-inside: auto; }
                 tr { page-break-inside: avoid; page-break-after: auto; }
                 thead { display: table-header-group; }
                 tfoot { display: table-footer-group; }
                 .break-inside-avoid { break-inside: avoid; }
               }
               table { width: 100%; border-collapse: collapse; font-size: 10px; }
               th { background-color: #f3f4f6; color: #111827; font-weight: 900; text-transform: uppercase; padding: 8px; border: 1px solid #e5e7eb; }
               td { padding: 6px 8px; border: 1px solid #e5e7eb; color: #374151; }
            </style>
          </head>
          <body>
            ${element.innerHTML}
            <script>
               setTimeout(() => {
                 window.print();
                 // If action is DOWNLOAD, we might rely on the user choosing 'Save as PDF' from the print dialog
                 // JS-only PDF generation often creates layout issues, so native print is safer.
               }, 1000);
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleSaveCompany = async () => {
    try {
      await CompanyService.update(tempInfo);
      setCompanyInfo(tempInfo);
      alert("Configurações da empresa guardadas perfeitamente!");
    } catch (e) {
      console.error(e);
      alert("Erro ao persistir dados da empresa.");
    }
  };

  const handleSaveEmployee = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const hireDateInput = formData.get('hireDate') as string;

    const updatedMember: User = {
      id: editingEmployee?.id || `u-${Date.now()}`,
      companyId: currentUser.companyId,
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      contact: formData.get('contact') as string,
      location: formData.get('location') as string,
      responsibility: formData.get('responsibility') as string,
      socialSecurityNumber: formData.get('socialSecurityNumber') as string,
      baseSalary: Number(formData.get('baseSalary') || 0),
      baseHours: Number(formData.get('baseHours') || 160),
      role: formData.get('role') as UserRole,
      hireDate: hireDateInput ? new Date(hireDateInput) : (editingEmployee?.hireDate || new Date()),
      active: editingEmployee ? editingEmployee.active : true,
      photo: editingEmployee?.photo
    };

    if (editingEmployee) {
      onUpdateTeam(team.map(m => m.id === updatedMember.id ? updatedMember : m));
      import('../services').then(m => m.LogService.add({
        action: 'Edição de Colaborador',
        details: `Editou o colaborador: ${updatedMember.name} (Função: ${updatedMember.role})`,
        companyId: currentUser.companyId
      }));
    } else {
      onUpdateTeam([...team, updatedMember]);
      import('../services').then(m => m.LogService.add({
        action: 'Novo Colaborador',
        details: `Adicionou o colaborador: ${updatedMember.name} (Função: ${updatedMember.role})`,
        companyId: currentUser.companyId
      }));
    }
    setIsEmployeeModalOpen(false);
    setEditingEmployee(null);
  };

  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-10 animate-in fade-in pb-20">
      <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 overflow-x-auto custom-scrollbar whitespace-nowrap gap-2">
        <TabButton active={activeTab === 'REPORTS'} onClick={() => setActiveTab('REPORTS')} icon={FileText} label="Relatórios" />
        <TabButton active={activeTab === 'PERFORMANCE'} onClick={() => setActiveTab('PERFORMANCE')} icon={BarChart3} label="Performance" />
        <TabButton active={activeTab === 'FINANCE'} onClick={() => setActiveTab('FINANCE')} icon={Wallet} label="Financeiro" />
        <TabButton active={activeTab === 'EXPENSES'} onClick={() => setActiveTab('EXPENSES')} icon={Banknote} label="Despesas" />
        <TabButton active={activeTab === 'CAIXA'} onClick={() => setActiveTab('CAIXA')} icon={CreditCard} label="Caixa" />
        <TabButton active={activeTab === 'COMPANY'} onClick={() => setActiveTab('COMPANY')} icon={Building2} label="Empresa" />
        <TabButton active={activeTab === 'TEAM'} onClick={() => setActiveTab('TEAM')} icon={Users} label="Equipa" />
        <TabButton active={activeTab === 'PROFILE'} onClick={() => setActiveTab('PROFILE')} icon={UserIcon} label="Perfil" />
        <TabButton active={activeTab === 'SYSTEM'} onClick={() => setActiveTab('SYSTEM')} icon={LayoutTemplate} label="Sistema" />
      </div>


      {activeTab === 'CAIXA' && (
        <div className="space-y-6">
          {/* Header with Dashboard Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Total Balance */}
            <div className="lg:col-span-4 bg-emerald-950 p-8 rounded-[2.5rem] text-white flex justify-between items-center relative overflow-hidden shadow-xl">
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2 opacity-80">
                  <div className="p-2 bg-white/10 rounded-lg"><Wallet size={20} /></div>
                  <span className="text-xs font-bold uppercase tracking-widest">Saldo Total em Caixa</span>
                </div>
                <h2 className="text-4xl font-black tracking-tight mt-1">
                  MT {sales?.reduce((acc, curr) => acc + curr.total, 0).toLocaleString()}
                </h2>
              </div>
              <div className="relative z-10">
                <button onClick={() => setIsAdjustmentModalOpen(true)} className="bg-white text-emerald-950 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-emerald-50 transition-colors shadow-lg active:scale-95 flex items-center gap-2">
                  <TrendingUp size={16} /> Fazer Ajuste
                </button>
              </div>
              {/* Background Pattern */}
              <div className="absolute right-0 top-0 w-64 h-64 bg-emerald-500 rounded-full blur-[100px] opacity-20 translate-x-1/2 -translate-y-1/2"></div>
            </div>

            {/* Breakdown Cards */}
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-emerald-600 mb-2">
                <Banknote size={20} />
                <span className="text-[10px] font-black uppercase tracking-widest">Dinheiro Físico</span>
              </div>
              <p className="text-2xl font-black text-emerald-950">
                MT {sales?.filter(s => checkMethod(s.paymentMethod, ['numerario', 'cash', 'dinheiro'])).reduce((a, b) => a + b.total, 0).toLocaleString()}
              </p>
            </div>

            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-red-500 mb-2">
                <Smartphone size={20} />
                <span className="text-[10px] font-black uppercase tracking-widest">M-Pesa</span>
              </div>
              <p className="text-2xl font-black text-emerald-950">
                MT {sales?.filter(s => checkMethod(s.paymentMethod, ['mpesa', 'm-pesa'])).reduce((a, b) => a + b.total, 0).toLocaleString()}
              </p>
            </div>

            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-orange-500 mb-2">
                <Zap size={20} />
                <span className="text-[10px] font-black uppercase tracking-widest">E-Mola</span>
              </div>
              <p className="text-2xl font-black text-emerald-950">
                MT {sales?.filter(s => checkMethod(s.paymentMethod, ['emola'])).reduce((a, b) => a + b.total, 0).toLocaleString()}
              </p>
            </div>

            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-blue-600 mb-2">
                <CreditCard size={20} />
                <span className="text-[10px] font-black uppercase tracking-widest">POS / Banco</span>
              </div>
              <p className="text-2xl font-black text-emerald-950">
                MT {sales?.filter(s => checkMethod(s.paymentMethod, ['ponto24', 'pos', 'banco', 'card', 'cartao'])).reduce((a, b) => a + b.total, 0).toLocaleString()}
              </p>
            </div>

            {/* Custom Payment Methods Reflection */}
            {companyInfo?.paymentMethods?.map(method => (
              <div key={method} className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-purple-600 mb-2">
                  <CreditCard size={20} />
                  <span className="text-[10px] font-black uppercase tracking-widest">{method}</span>
                </div>
                <p className="text-2xl font-black text-emerald-950">
                  MT {sales?.filter(s => s.paymentMethod === method).reduce((a, b) => a + b.total, 0).toLocaleString()}
                </p>
              </div>
            ))}
          </div>

          {/* Filter & Table */}
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-8 pb-6 border-b border-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2">
                <ListFilter size={18} className="text-gray-400" />
                <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">Movimentos Detalhados</h3>
              </div>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                <input
                  placeholder="Filtrar movimentos..."
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-transparent focus:bg-white focus:border-emerald-500 rounded-xl font-bold text-xs text-emerald-950 outline-none transition-all placeholder:text-gray-300"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="p-6 text-[9px] font-black text-gray-400 uppercase tracking-widest pl-8">Data / Hora</th>
                    <th className="p-6 text-[9px] font-black text-gray-400 uppercase tracking-widest">Produto / Descrição</th>
                    <th className="p-6 text-[9px] font-black text-gray-400 uppercase tracking-widest">Cliente</th>
                    <th className="p-6 text-[9px] font-black text-gray-400 uppercase tracking-widest">Método</th>
                    <th className="p-6 text-[9px] font-black text-gray-400 uppercase tracking-widest">Responsável</th>
                    <th className="p-6 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right pr-8">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sales && sales.length > 0 ? (
                    [...sales].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((sale, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors group">
                        <td className="p-5 pl-8">
                          <div className="flex flex-col">
                            <span className="font-bold text-emerald-950 text-xs">{new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            <span className="text-[9px] font-bold text-gray-400 uppercase">{new Date(sale.timestamp).toLocaleDateString()}</span>
                          </div>
                        </td>
                        <td className="p-5">
                          <div className="flex flex-col gap-1 max-w-[200px]">
                            <span className="font-bold text-emerald-950 text-xs truncate" title={sale.items?.map(i => i.name).join(', ')}>
                              {sale.items?.map(i => i.name).join(', ') || 'N/A'}
                            </span>
                            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded w-fit uppercase">{sale.items?.length || 0} Itens</span>
                          </div>
                        </td>
                        <td className="p-5">
                          <span className="font-bold text-emerald-950 text-xs">{sale.clientName || '-'}</span>
                        </td>
                        <td className="p-5">
                          <div className="flex items-center gap-2">
                            {sale.paymentMethod === 'mpesa' && <Smartphone size={14} className="text-red-500" />}
                            {sale.paymentMethod === 'emola' && <Zap size={14} className="text-orange-500" />}
                            {sale.paymentMethod === 'numerario' && <Banknote size={14} className="text-emerald-500" />}
                            {(sale.paymentMethod === 'ponto24' || sale.paymentMethod === 'banco') && <CreditCard size={14} className="text-blue-500" />}
                            <span className="text-[10px] font-black uppercase text-gray-500">{sale.paymentMethod}</span>
                          </div>
                        </td>
                        <td className="p-5">
                          <span className="text-[10px] font-bold text-gray-500 border border-gray-100 px-2 py-1 rounded-lg">{sale.performedBy}</span>
                        </td>
                        <td className="p-5 pr-8 text-right">
                          <span className="font-black text-emerald-950 text-sm">MT {sale.total?.toLocaleString()}</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-gray-400 font-bold text-sm uppercase tracking-widest">
                        Nenhum movimento registado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )} {activeTab === 'REPORTS' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-700 rounded-2xl"><FileText size={24} /></div>
              <div>
                <h3 className="text-lg font-black text-blue-950 uppercase">Relatório Geral</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Logs e Auditoria do Sistema</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 items-center bg-gray-50/50 p-3 rounded-2xl border border-gray-100">
              <select
                className="bg-transparent font-black text-[10px] uppercase outline-none text-emerald-950 grow"
                value={reportFilter.month}
                onChange={e => setReportFilter({ ...reportFilter, month: parseInt(e.target.value) })}
              >
                {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <select
                className="bg-transparent font-black text-[10px] uppercase outline-none text-emerald-950"
                value={reportFilter.year}
                onChange={e => setReportFilter({ ...reportFilter, year: parseInt(e.target.value) })}
              >
                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <div className="w-px h-6 bg-gray-200 mx-2"></div>
              <button
                onClick={async () => {
                  if (confirm("Tem a certeza? Isso apagarÃ¡ todo o histÃ³rico de logs da empresa.")) {
                    await LogService.clearAll();
                    alert("HistÃ³rico limpo com sucesso.");
                    window.location.reload();
                  }
                }}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Limpar HistÃ³rico"
              >
                <Trash2 size={18} />
              </button>
              <button
                onClick={() => {
                  const headers = ["Data", "Utilizador", "Ação", "Detalhes"];
                  const csvContent = [
                    headers.join(','),
                    ...logs.map(l => [
                      new Date(l.timestamp).toLocaleString(),
                      l.userName,
                      l.action,
                      `"${l.details.replace(/"/g, '""')}"`
                    ].join(','))
                  ].join('\n');
                  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.setAttribute('href', url);
                  link.setAttribute('download', `logs_${new Date().toISOString()}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                title="Exportar CSV"
              >
                <Download size={18} />
              </button>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 p-6 min-h-[400px]">
            <LogsDetailedReport logs={logs} filter={reportFilter} />
          </div>
        </div>
      )} {activeTab === 'FINANCE' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl"><Wallet size={24} /></div>
              <div>
                <h3 className="text-lg font-black text-emerald-950 uppercase">Módulo Financeiro</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Análise de Receita e Caixa</p>
              </div>
            </div>

            <div className="flex flex-col gap-4 bg-gray-50/50 p-4 rounded-[2rem] border border-gray-100">
              <div className="flex flex-wrap gap-4 items-center justify-between">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2 mb-1 block">Período de Análise</label>
                  <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
                    <Calendar size={16} className="text-emerald-600 ml-2" />
                    <input
                      type="date"
                      className="bg-transparent text-xs font-bold text-emerald-950 outline-none uppercase"
                      value={reportFilter.startDate}
                      onChange={e => setReportFilter({ ...reportFilter, startDate: e.target.value })}
                    />
                    <span className="text-gray-300 font-black">-</span>
                    <input
                      type="date"
                      className="bg-transparent text-xs font-bold text-emerald-950 outline-none uppercase"
                      value={reportFilter.endDate}
                      onChange={e => setReportFilter({ ...reportFilter, endDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsReportPreviewOpen(true)}
                    className="bg-emerald-950 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-900/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                  >
                    <FileText size={16} />
                    Gerar Relatório PDF
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div id="report-content" className="bg-emerald-950 p-6 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col gap-6">
            <div className="relative z-10 border-b border-emerald-800 pb-4 mb-2 flex items-center justify-between">
              <div>
                <img src={companyInfo.logoHorizontal || companyInfo.logo || "/logo-sidebar.png"} alt="Logo" className="h-10 mb-2 object-contain brightness-0 invert" />
                <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">{companyInfo.name}</p>
                <p className="text-[9px] text-emerald-600 uppercase">{companyInfo.address}</p>
              </div>
              <div className="text-right">
                <p className="text-[8px] text-emerald-600 font-bold uppercase tracking-widest mb-0.5">Relatório Financeiro</p>
                <p className="text-xs font-black text-white uppercase">{months[reportFilter.month]} / {reportFilter.year}</p>
                <p className="text-[8px] text-emerald-800 font-bold uppercase tracking-widest mt-1">Nobreza ERP &bull; Zyph Tech, Lda</p>
              </div>
            </div>

            <div className="relative z-10">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-[9px] font-black uppercase tracking-widest mb-3">
                <Sparkles size={12} /> Insight Automático
              </div>
              <p className="text-white/80 font-medium text-sm italic leading-relaxed">
                "No Período de {months[reportFilter.month]}, a receita totalizou <span className="text-white font-black underline decoration-emerald-500 underline-offset-4">MT {analytics.totalInMonth.toLocaleString()}</span>.
                Despesa acumulada de <span className="text-red-400 font-black">MT {analytics.totalExpenses.toLocaleString()}</span>, resultando num lucro lÃ­quido de <span className="text-emerald-400 font-black">MT {analytics.netProfit.toLocaleString()}</span>.
                {analytics.totalDivergence < 0 ? ` Atenção: Quebra de caixa detectada no valor de MT ${Math.abs(analytics.totalDivergence).toLocaleString()}.` : ' Operação de fluxo de caixa estável.'}"
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 relative z-10">
              <SummaryBox label="Vendas Brutas" val={`MT ${analytics.totalInMonth.toLocaleString()}`} />
              <SummaryBox label="Despesas" val={`MT ${analytics.totalExpenses.toLocaleString()}`} isRed={true} />
              <SummaryBox label="Lucro Líquido" val={`MT ${analytics.netProfit.toLocaleString()}`} />
              <SummaryBox label="Divergência" val={`MT ${analytics.totalDivergence.toLocaleString()}`} isRed={analytics.totalDivergence < 0} />
            </div>

            <div className="grid grid-cols-4 gap-2 relative z-10 pt-4 border-t border-white/10">
              <div className="text-center">
                <p className="text-[8px] font-black text-white/40 uppercase mb-1">Cash</p>
                <p className="text-xs font-black text-white">MT {(analytics.byMethod['CASH'] || 0).toLocaleString()}</p>
              </div>
              <div className="text-center border-l border-white/10">
                <p className="text-[8px] font-black text-white/40 uppercase mb-1">M-Pesa</p>
                <p className="text-xs font-black text-white">MT {(analytics.byMethod['MPESA'] || 0).toLocaleString()}</p>
              </div>
              <div className="text-center border-l border-white/10">
                <p className="text-[8px] font-black text-white/40 uppercase mb-1">E-Mola</p>
                <p className="text-xs font-black text-white">MT {(analytics.byMethod['EMOLA'] || 0).toLocaleString()}</p>
              </div>
              <div className="text-center border-l border-white/10">
                <p className="text-[8px] font-black text-white/40 uppercase mb-1">Bancos</p>
                <p className="text-xs font-black text-white">MT {((analytics.byMethod['TRANSFER'] || 0) + (analytics.byMethod['OTHER'] || 0)).toLocaleString()}</p>
              </div>
            </div>

            {/* Footer */}
            {/* Footer - Only visible for PDF generation (using a class we can target or just by being at bottom with margin) */}
            <div className="relative z-10 pt-4 border-t border-white/10 flex justify-between items-end mt-8 report-footer opacity-0 transition-opacity">
              <p className="text-[7px] text-white/40 font-bold uppercase tracking-widest">Documento Processado Por Computador</p>
              <div className="text-right">
                <p className="text-[7px] text-white/40 font-bold uppercase tracking-widest">Nobreza ERP - Developed BY Zyph Tech, Lda</p>
                <p className="text-[7px] text-white/20 font-mono mt-0.5">{new Date().toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Report Sub-nav for mobile (icons only + label) */}
          <div className="flex bg-white rounded-2xl shadow-sm border border-gray-100 p-1 overflow-x-auto gap-1">
            <SubReportBtn active={reportFilter.type === 'GERAL'} label="Geral" onClick={() => setReportFilter({ ...reportFilter, type: 'GERAL' })} icon={LayoutDashboard} />
            <SubReportBtn active={reportFilter.type === 'CATALOGO'} label="Catálogo" onClick={() => setReportFilter({ ...reportFilter, type: 'CATALOGO' })} icon={BarChart3} />
            <SubReportBtn active={reportFilter.type === 'VENDAS'} label="Transações" onClick={() => setReportFilter({ ...reportFilter, type: 'VENDAS' })} icon={TrendingUp} />
            <SubReportBtn active={reportFilter.type === 'STOCK'} label="Stock" onClick={() => setReportFilter({ ...reportFilter, type: 'STOCK' })} icon={Package} />
            <SubReportBtn active={reportFilter.type === 'PRESENCAS'} label="Presenças" onClick={() => setReportFilter({ ...reportFilter, type: 'PRESENCAS' })} icon={Clock} />
            <SubReportBtn active={reportFilter.type === 'LOGS'} label="Auditoria" onClick={() => setReportFilter({ ...reportFilter, type: 'LOGS' })} icon={History} />
          </div>

          <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 p-6 min-h-[400px]">
            {reportFilter.type === 'GERAL' && <DashboardSummary analytics={analytics} />}
            {reportFilter.type === 'CATALOGO' && <CatalogPerformanceReport sales={sales} filter={reportFilter} products={products} />}
            {reportFilter.type === 'VENDAS' && <SalesDetailedReport sales={sales} filter={reportFilter} />}
            {reportFilter.type === 'PRESENCAS' && (
              <div className="space-y-4">
                <h4 className="text-xs font-black text-emerald-950 uppercase tracking-tight flex items-center gap-2 italic"><Clock size={16} className="text-emerald-600" /> Registo de Assiduidade</h4>
                <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Colaborador</th>
                        <th className="p-4 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Data</th>
                        <th className="p-4 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Horas</th>
                        <th className="p-4 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right pr-8">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {loadingShifts ? (
                        <tr><td colSpan={4} className="p-10 text-center text-xs font-bold text-gray-400 animate-pulse">Carregando registos...</td></tr>
                      ) : shifts.length === 0 ? (
                        <tr><td colSpan={4} className="p-10 text-center text-xs font-bold text-gray-400 italic">Nenhum registo de ponto encontrado para este Período.</td></tr>
                      ) : (
                        shifts.map(shift => {
                          const user = team.find(u => u.id === shift.user_id);
                          const start = new Date(shift.start_time);
                          const end = shift.end_time ? new Date(shift.end_time) : null;
                          const duration = end ? (end.getTime() - start.getTime()) / (1000 * 60 * 60) : 0;

                          return (
                            <tr key={shift.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-[10px] uppercase">
                                    {user?.photo ? <img src={user.photo} className="w-full h-full rounded-full object-cover" /> : (user?.name || 'U').charAt(0)}
                                  </div>
                                  <span className="font-bold text-emerald-950 text-[11px] uppercase truncate">{user?.name || 'Utilizador Desconhecido'}</span>
                                </div>
                              </td>
                              <td className="p-4 text-center">
                                <span className="text-[10px] font-bold text-gray-500">{start.toLocaleDateString()}</span>
                                <p className="text-[9px] text-gray-400 font-mono mt-0.5">{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {end && `â†’ ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}</p>
                              </td>
                              <td className="p-4 text-center">
                                {end ? (
                                  <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">{duration.toFixed(1)}h</span>
                                ) : (
                                  <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100 animate-pulse">EM CURSO</span>
                                )}
                              </td>
                              <td className="p-4 text-right pr-8">
                                <span className={`text-[9px] font-black uppercase tracking-tight px-2 py-1 rounded-lg ${end ? 'bg-gray-100 text-gray-500' : 'bg-emerald-500 text-white'}`}>
                                  {end ? 'ConcluÃ­do' : 'Ativo'}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {reportFilter.type === 'LOGS' && <LogsDetailedReport logs={logs} filter={reportFilter} />}
            {reportFilter.type === 'STOCK' && (
              <StockDetailedReport
                products={products}
                priceAdjustmentAmount={priceAdjustmentAmount}
                setPriceAdjustmentAmount={setPriceAdjustmentAmount}
                handleGlobalPriceAdjustment={handleGlobalPriceAdjustment}
                adjustingPrices={adjustingPrices}
              />
            )}
          </div>
        </div>
      )} {activeTab === 'COMPANY' && (
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-emerald-950 p-8 flex flex-col items-center gap-6 relative">
            <h3 className="text-xl font-black text-white uppercase tracking-tight mb-4">Identidade Visual</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
              {/* Main/Icon Logo */}
              <div className="flex flex-col items-center gap-2">
                <div onClick={() => document.getElementById('logo-input')?.click()} className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center cursor-pointer border-4 border-emerald-900 shadow-xl overflow-hidden relative group">
                  {tempInfo.logo ? <img src={tempInfo.logo} className="w-full h-full object-contain p-2" /> : <img src="/icon-512.png" className="w-full h-full object-contain p-2 opacity-20" />}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center"><Camera size={20} className="text-white" /></div>
                </div>
                <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Principal / Ícone</p>
                <input id="logo-input" type="file" className="hidden" accept="image/*" onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) { const r = new FileReader(); r.onloadend = () => setTempInfo({ ...tempInfo, logo: r.result as string }); r.readAsDataURL(f); }
                }} />
              </div>

              {/* Horizontal Logo */}
              <div className="flex flex-col items-center gap-2">
                <div onClick={() => document.getElementById('logo-h-input')?.click()} className="w-48 h-24 bg-white rounded-[1rem] flex items-center justify-center cursor-pointer border-4 border-emerald-900 shadow-xl overflow-hidden relative group">
                  {tempInfo.logoHorizontal ? <img src={tempInfo.logoHorizontal} className="w-full h-full object-contain p-2" /> : <img src="/logo-sidebar.png" className="w-full h-full object-contain p-2 opacity-20 grayscale" />}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center"><Camera size={20} className="text-white" /></div>
                </div>
                <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Horizontal (Faturas)</p>
                <input id="logo-h-input" type="file" className="hidden" accept="image/*" onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) { const r = new FileReader(); r.onloadend = () => setTempInfo({ ...tempInfo, logoHorizontal: r.result as string }); r.readAsDataURL(f); }
                }} />
              </div>

              {/* Vertical Logo */}
              <div className="flex flex-col items-center gap-2">
                <div onClick={() => document.getElementById('logo-v-input')?.click()} className="w-24 h-32 bg-white rounded-[1rem] flex items-center justify-center cursor-pointer border-4 border-emerald-900 shadow-xl overflow-hidden relative group">
                  {tempInfo.logoVertical ? <img src={tempInfo.logoVertical} className="w-full h-full object-contain p-2" /> : <img src="/logo-login.png" className="w-full h-full object-contain p-2 opacity-20 grayscale" />}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center"><Camera size={20} className="text-white" /></div>
                </div>
                <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Vertical (Docs)</p>
                <input id="logo-v-input" type="file" className="hidden" accept="image/*" onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) { const r = new FileReader(); r.onloadend = () => setTempInfo({ ...tempInfo, logoVertical: r.result as string }); r.readAsDataURL(f); }
                }} />
              </div>
            </div>
          </div>
          <div className="p-8 space-y-6">
            <SettingInput label="Razão Social" val={tempInfo.name} setVal={v => setTempInfo({ ...tempInfo, name: v })} icon={Building2} />
            <div className="grid grid-cols-2 gap-4">
              <SettingInput label="NUIT" val={tempInfo.nuit} setVal={v => setTempInfo({ ...tempInfo, nuit: v })} icon={FileText} />
              <SettingInput label="Slogan Fatura" val={tempInfo.slogan} setVal={v => setTempInfo({ ...tempInfo, slogan: v })} icon={Sparkles} />
            </div>
            <SettingInput label="Email Oficial" val={tempInfo.email} setVal={v => setTempInfo({ ...tempInfo, email: v })} icon={Mail} />
            <SettingInput label="Telefone" val={tempInfo.phone} setVal={v => setTempInfo({ ...tempInfo, phone: v })} icon={Phone} />
            <SettingInput label="Endereço" val={tempInfo.address} setVal={v => setTempInfo({ ...tempInfo, address: v })} icon={MapPin} />
            <div className="grid grid-cols-2 gap-4">
              <SettingInput label="Horário de Fecho (Fim de Turno)" val={tempInfo.closingTime || ''} setVal={v => setTempInfo({ ...tempInfo, closingTime: v })} icon={Clock} type="time" />
              <SettingInput label="Início de Turno (Check-in)" val={tempInfo.workingHours?.start || '08:00'} setVal={v => setTempInfo({ ...tempInfo, workingHours: { ...(tempInfo.workingHours || { end: '18:00', days: [1, 2, 3, 4, 5] }), start: v } })} icon={Zap} type="time" />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-emerald-950 uppercase tracking-widest pl-1">Cores do Tema</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Primary Color */}
                <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <input
                    type="color"
                    value={tempInfo.themeColor || '#10b981'}
                    onChange={(e) => {
                      const newColor = e.target.value;
                      setTempInfo({ ...tempInfo, themeColor: newColor });
                      // Real-time preview
                      import('../utils/theme').then(m => m.applyTheme(newColor, tempInfo.themeColorSecondary));
                    }}
                    className="w-12 h-12 rounded-lg cursor-pointer border-none p-0 bg-transparent"
                  />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-gray-500 uppercase">Cor Primária</p>
                    <p className="text-[10px] text-gray-400">Botões, Destaques, Links.</p>
                  </div>
                </div>

                {/* Secondary Color */}
                <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <input
                    type="color"
                    value={tempInfo.themeColorSecondary || '#6366f1'}
                    onChange={(e) => {
                      const newColor = e.target.value;
                      setTempInfo({ ...tempInfo, themeColorSecondary: newColor });
                      // Real-time preview
                      import('../utils/theme').then(m => m.applyTheme(tempInfo.themeColor || '#10b981', newColor));
                    }}
                    className="w-12 h-12 rounded-lg cursor-pointer border-none p-0 bg-transparent"
                  />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-gray-500 uppercase">Cor Secundária</p>
                    <p className="text-[10px] text-gray-400">Acentos, Detalhes, Ícones.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Methods Management */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-emerald-950 uppercase tracking-widest pl-1">Métodos de Pagamento Customizados</label>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                <div className="flex gap-2">
                  <input id="new-method-input" className="flex-1 px-4 py-2 rounded-lg text-xs font-bold border border-gray-200 outline-none focus:border-emerald-500" placeholder="Novo Método (Ex: M-Kesh)" />
                  <button onClick={() => {
                    const inp = document.getElementById('new-method-input') as HTMLInputElement;
                    const val = inp.value.trim();
                    if (val) {
                      const current = tempInfo.paymentMethods || [];
                      if (!current.includes(val)) {
                        setTempInfo({ ...tempInfo, paymentMethods: [...current, val] });
                        inp.value = '';
                      }
                    }
                  }} className="bg-emerald-600 text-white px-4 rounded-lg font-bold text-xs uppercase hover:bg-emerald-700">Adicionar</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tempInfo.paymentMethods?.map(m => (
                    <span key={m} className="bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase text-gray-600 flex items-center gap-2">
                      {m}
                      <button onClick={() => setTempInfo({ ...tempInfo, paymentMethods: tempInfo.paymentMethods?.filter(pm => pm !== m) })} className="text-red-400 hover:text-red-600"><X size={12} /></button>
                    </span>
                  ))}
                  {(!tempInfo.paymentMethods || tempInfo.paymentMethods.length === 0) && <p className="text-[10px] text-gray-400 italic">Nenhum método customizado.</p>}
                </div>
              </div>
            </div>

            {/* Shift Management */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="text-emerald-600" size={18} />
                <h4 className="text-[10px] font-black text-emerald-950 uppercase tracking-widest">Configuração de Turnos</h4>
              </div>
              <ShiftsManager
                shifts={tempInfo.shifts || []}
                onUpdate={(newShifts) => setTempInfo({ ...tempInfo, shifts: newShifts })}
              />
            </div>

            <button onClick={async () => {
              try {
                await import('../services').then(mod => mod.CompanyService.update(tempInfo));
                setCompanyInfo(tempInfo);

                // Update theme immediately if changed
                if (tempInfo.themeColor) {
                  import('../utils/theme').then(m => m.applyTheme(tempInfo.themeColor!, tempInfo.themeColorSecondary));
                }

                NotificationService.sendSystemAlert('UPDATE_COMPANY_INFO', tempInfo, currentUser, 'Informações da empresa/logos atualizadas.');
                alert("Dados da empresa atualizados com sucesso!");
              } catch (e: any) {
                console.error(e);
                if (e.message && e.message.includes("DADOS SALVOS!")) {
                  alert("✅ " + e.message);
                } else if (e.message && (e.message.includes("schema cache") || e.message.includes("payment_methods"))) {
                  // If schema cache is stale, reload might fix it
                  alert("A base de dados foi atualizada. A página será recarregada para aplicar as mudanças.");
                  window.location.reload();
                } else {
                  alert("Erro ao salvar: " + (e.message || "Verifique a base de dados. Provavelmente faltam as colunas 'logo_vertical' e 'logo_horizontal'. Execute o script SQL fornecido."));
                }
              }
            }} className="w-full bg-emerald-700 text-white py-5 rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all outline-none focus:ring-4 focus:ring-emerald-500/20 hover:bg-emerald-800">Actualizar Cadastro & Logos</button>
          </div>
        </div>
      )} {activeTab === 'PROFILE' && (
        <div className="bg-[#f3f7f6] min-h-[600px] space-y-6">
          <UserProfileEditor currentUser={currentUser} sales={sales || []} onUpdate={(updatedUser) => {
            onUpdateTeam(team.map(u => u.id === updatedUser.id ? updatedUser : u));
            NotificationService.sendSystemAlert('UPDATE_PROFILE', companyInfo, updatedUser, `Perfil de utilizador ${updatedUser.name} atualizado.`);
          }} />
        </div>
      )} {activeTab === 'PERFORMANCE' && (
        <div className="space-y-6">
          <PerformanceReport
            sales={sales}
            team={team}
          />
        </div>
      )} {activeTab === 'EXPENSES' && (
        <div className="space-y-6">
          <ExpensesView expenses={expenses} team={team} currentUser={currentUser} />
        </div>
      )} {activeTab === 'SUPPORT' && (
        <div className="space-y-6">
          <Support currentUser={currentUser} />
        </div>
      )} {activeTab === 'TEAM' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border flex justify-between items-center">
            <h3 className="text-lg font-black text-emerald-950 uppercase tracking-tight">Equipa</h3>
            <button onClick={() => { setEditingEmployee(null); setIsEmployeeModalOpen(true); }} className="p-3 bg-emerald-700 text-white rounded-xl shadow-lg"><UserPlus size={20} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {team.map(member => (
              <div key={member.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 flex items-center gap-5 shadow-sm active:bg-gray-50 transition-colors">
                <div className="w-14 h-14 bg-emerald-950 text-emerald-400 rounded-xl flex items-center justify-center font-black text-xl overflow-hidden shrink-0">
                  {member.photo ? <img src={member.photo} className="w-full h-full object-cover" /> : member.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-emerald-950 uppercase text-xs truncate">{member.name}</p>
                  <p className="text-[10px] text-emerald-600 font-bold uppercase truncate">{member.role} â€¢ {member.responsibility}</p>
                </div>
                <button onClick={() => { setEditingEmployee(member); setIsEmployeeModalOpen(true); }} className="p-3 text-gray-300 hover:text-emerald-700"><Edit2 size={18} /></button>
              </div>
            ))}
          </div>
        </div>
      )} {activeTab === 'SYSTEM' && (
        <SystemSettings
          companyInfo={companyInfo}
          currentUser={currentUser}
          onUpdateCompany={setCompanyInfo}
        />
      )}

      {/* Employee Modal - Standard Safe Layout - Rendered via Portal */}
      {
        isEmployeeModalOpen && createPortal(
          <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">

              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
                <div>
                  <h4 className="text-lg font-black text-emerald-950 uppercase tracking-tight">{editingEmployee ? 'Editar Membro' : 'Novo Colaborador'}</h4>
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Gestão de Equipa</p>
                </div>
                <button onClick={() => setIsEmployeeModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-400 transition-colors"><X size={20} /></button>
              </div>

              {/* Scrollable Content */}
              <div className="overflow-y-auto p-6 custom-scrollbar">
                <form onSubmit={handleSaveEmployee} className="space-y-6">

                  {/* Photo Uploader - Standard Inside Layout */}
                  <div className="flex flex-col items-center gap-3">
                    <div onClick={() => document.getElementById('employee-photo-input')?.click()} className="w-24 h-24 rounded-full bg-emerald-50 border-4 border-white shadow-lg flex items-center justify-center cursor-pointer overflow-hidden relative group hover:scale-105 transition-transform">
                      {editingEmployee?.photo ? <img src={editingEmployee.photo} className="w-full h-full object-cover" /> : <Camera size={28} className="text-emerald-300 group-hover:text-emerald-500 transition-colors" />}
                      <div className="absolute inset-0 bg-emerald-950/40 hidden group-hover:flex items-center justify-center text-white text-[9px] font-black uppercase tracking-widest transition-all backdrop-blur-[1px]">Alterar</div>
                    </div>
                    <input
                      id="employee-photo-input"
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          const r = new FileReader();
                          r.onloadend = () => setEditingEmployee({ ...(editingEmployee || {} as User), photo: r.result as string });
                          r.readAsDataURL(f);
                        }
                      }}
                    />
                    <p className="text-[10px] uppercase font-bold text-gray-400">Foto de Perfil</p>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Nome Completo</label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><UserIcon size={16} /></div>
                        <input name="name" placeholder="Ex: Arnaldo Eurico" required defaultValue={editingEmployee?.name} className="w-full pl-10 pr-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl font-bold focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none text-emerald-950 text-sm transition-all placeholder:font-medium placeholder:text-gray-300" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Email Corporativo</label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><Mail size={16} /></div>
                        <input name="email" type="email" placeholder="admin@nobreza.site" required defaultValue={editingEmployee?.email} className="w-full pl-10 pr-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl font-bold focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none text-emerald-950 text-sm transition-all placeholder:font-medium placeholder:text-gray-300" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Contacto</label>
                        <input name="contact" placeholder="+258..." defaultValue={editingEmployee?.contact} className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl font-bold focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none text-emerald-950 text-sm transition-all" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Localização</label>
                        <input name="location" placeholder="Cidade" defaultValue={editingEmployee?.location} className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl font-bold focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none text-emerald-950 text-sm transition-all" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Cargo / Função</label>
                      <div className="relative">
                        <select name="role" required defaultValue={editingEmployee?.role} className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl font-bold focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none text-emerald-950 text-sm appearance-none cursor-pointer transition-all">
                          {Object.values(UserRole).map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400"><ChevronRight size={16} className="rotate-90" /></div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Responsabilidade</label>
                      <input name="responsibility" placeholder="Ex: Gestor de Vendas" required defaultValue={editingEmployee?.responsibility} className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl font-bold focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none text-emerald-950 text-sm transition-all" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">INSS / NUIT</label>
                        <input name="socialSecurityNumber" placeholder="---" defaultValue={editingEmployee?.socialSecurityNumber} className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl font-bold focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none text-emerald-950 text-sm transition-all" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Salário Base (MT)</label>
                        <input name="baseSalary" type="number" step="0.01" placeholder="0.00" defaultValue={editingEmployee?.baseSalary} className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl font-bold focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none text-emerald-950 text-sm transition-all" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Horas Base (Mensal)</label>
                        <input name="baseHours" type="number" step="1" placeholder="160" defaultValue={editingEmployee?.baseHours || 160} className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl font-bold focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none text-emerald-950 text-sm transition-all" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Data de Adesão</label>
                        <input name="hireDate" type="date" required defaultValue={editingEmployee?.hireDate ? new Date(editingEmployee.hireDate).toISOString().split('T')[0] : ''} className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl font-bold focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none text-emerald-950 text-sm transition-all" />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button type="submit" className="w-full bg-emerald-950 hover:bg-emerald-900 text-white py-4 rounded-xl font-black uppercase text-xs shadow-xl shadow-emerald-900/10 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-4">
                      <Save size={18} />
                      Guardar Colaborador
                    </button>
                  </div>

                </form>
              </div>
            </div>
          </div>,
          document.body
        )
      }



      {/* Adjustment Modal */}
      {isAdjustmentModalOpen && createPortal(
        <AdjustmentModal
          isOpen={isAdjustmentModalOpen}
          onClose={() => setIsAdjustmentModalOpen(false)}
          onConfirm={async (type, amount, method, desc) => {
            try {
              const val = type === 'ENTRY' ? amount : -amount;
              // We create a fake sale or expense or dedicated transaction.
              // For simplicity and to reflect in cash map:
              if (type === 'ENTRY') {
                // Create a "Direct Sale" type or similar
                const adjustmentSale: Sale = {
                  id: `ADJ-${Date.now()}`,
                  companyId: currentUser.companyId,
                  timestamp: new Date(),
                  items: [{
                    productId: 'ADJUSTMENT',
                    companyId: currentUser.companyId,
                    productName: desc || 'Ajuste de Caixa',
                    quantity: 1,
                    unitPrice: amount,
                    total: amount
                  }],
                  total: amount,
                  type: 'DIRECT',
                  paymentMethod: method,
                  performedBy: currentUser.name,
                  customerName: 'Ajuste Interno'
                };
                await onAddSale?.(adjustmentSale);
                alert("Ajuste de entrada realizado com sucesso!");
              } else {
                // Expense
                const { error } = await supabase.from('expenses').insert([{
                  company_id: currentUser.companyId,
                  user_id: currentUser.id,
                  amount: amount,
                  description: desc || 'Ajuste de Saída',
                  type: 'Other', // or create a specfic type
                  date: new Date().toISOString()
                }]);
                if (error) throw error;
                alert("Ajuste de saída realizado com sucesso!");
                window.location.reload(); // Simple reload to refresh expenses
              }
              setIsAdjustmentModalOpen(false);
            } catch (e: any) {
              alert("Erro ao realizar ajuste: " + e.message);
            }
          }}
          paymentMethods={['CASH', 'MPESA', 'EMOLA', 'POS', ...(companyInfo.paymentMethods || [])]}
        />,
        document.body
      )}

      {/* Report Preview Modal */}
      {
        isReportPreviewOpen && createPortal(
          <div className="fixed inset-0 z-[99999] flex bg-emerald-950/95 backdrop-blur-2xl overflow-hidden animate-in fade-in duration-500 font-sans">
            {/* LEFT PANEL: Report Preview Area */}
            <div className="flex-1 bg-gradient-to-br from-emerald-900/10 to-emerald-950/30 flex items-center justify-center relative">
              {/* Scrollable Wrapper */}
              <div className="absolute inset-0 overflow-auto flex items-start justify-center p-8 custom-scrollbar">
                {/* Printable Report Container */}
                <div
                  id="printable-report"
                  className="bg-white w-[210mm] min-h-[297mm] shadow-[0_40px_120px_rgba(0,0,0,0.4)] p-[15mm] text-black relative shrink-0 origin-top transition-all duration-300"
                  style={{
                    transform: `scale(${previewScale})`,
                    marginBottom: '8rem'
                  }}
                >

                  {/* Report Header Standard */}
                  <div className="flex justify-between items-start border-b border-gray-200 pb-8 mb-8">
                    {/* Left: Branding & Company */}
                    <div className="flex flex-col gap-4 max-w-[50%]">
                      {/* Company Logo if available, else standard text */}
                      {companyInfo.logoHorizontal || companyInfo.logo ? (
                        <img src={companyInfo.logoHorizontal || companyInfo.logo} className="h-12 w-auto object-contain self-start" crossOrigin="anonymous" />
                      ) : (
                        <h1 className="text-2xl font-black text-emerald-950 uppercase tracking-tight">{companyInfo.name || 'Nobreza ERP'}</h1>
                      )}

                      <div className="text-[9px] text-gray-500 font-medium leading-relaxed uppercase tracking-wide">
                        <p className="font-bold text-gray-900 text-xs mb-1">{companyInfo.name}</p>
                        <p>{companyInfo.address}</p>
                        <p>{companyInfo.email} &bull; {companyInfo.phone}</p>
                        <p>{companyInfo.nuit ? `NUIT: ${companyInfo.nuit}` : ''}</p>
                      </div>
                    </div>

                    {/* Right: Document Info */}
                    <div className="text-right">
                      <h2 className="text-xl font-bold text-emerald-950 uppercase tracking-tight mb-4">Relatório Financeiro</h2>

                      <div className="space-y-1.5">
                        <div className="flex justify-end items-center gap-3">
                          <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Período</span>
                          <span className="text-[10px] font-black text-gray-900 uppercase">{months[reportFilter.month]} {reportFilter.year}</span>
                        </div>
                        <div className="flex justify-end items-center gap-3">
                          <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Emissão</span>
                          <span className="text-[10px] font-black text-gray-900 uppercase">{new Date().toLocaleString()}</span>
                        </div>
                        <div className="flex justify-end items-center gap-3">
                          <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Autor</span>
                          <span className="text-[10px] font-black text-gray-900 uppercase">{currentUser.name}</span>
                        </div>
                        <div className="flex justify-end items-center gap-3">
                          <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Ref</span>
                          <span className="text-[10px] font-black text-gray-900 uppercase bg-gray-100 px-2 py-0.5 rounded">REL-{reportFilter.year}-{reportFilter.month + 1}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Summary Grid - Clean & Minimal */}
                  <div className="grid grid-cols-4 gap-6 mb-8">
                    <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                      <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1">Receita Total</p>
                      <p className="text-lg font-black text-gray-900">MT {analytics.totalInMonth.toLocaleString()}</p>
                    </div>
                    <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                      <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1">Despesas</p>
                      <p className="text-lg font-black text-red-600">MT {analytics.totalExpenses.toLocaleString()}</p>
                    </div>
                    <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                      <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1">Stock (Valor)</p>
                      <p className="text-lg font-black text-blue-900">MT {stockStats.totalValue.toLocaleString()}</p>
                    </div>
                    <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                      <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1">Lucro Líquido</p>
                      <p className={`text-lg font-black ${analytics.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>MT {analytics.netProfit.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Stock Movements Summary */}
                  <div className="mb-6 p-4 rounded-xl border border-gray-100 bg-white">
                    <h3 className="text-[9px] font-black text-gray-900 uppercase tracking-widest mb-3 border-b border-gray-100 pb-2">Resumo de Investimento</h3>
                    <div className="grid grid-cols-2 gap-8">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-bold text-gray-500 uppercase">Investimentos (Entradas)</span>
                        <span className="text-xs font-black text-gray-900">MT {analytics.stockInvestments.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-bold text-gray-500 uppercase">Saídas de Stock (Custo)</span>
                        <span className="text-xs font-black text-gray-900">MT {analytics.stockOutputs.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* AI Insights Section - New! */}
                  <div className="mb-10 p-5 rounded-2xl border-2 border-emerald-50 bg-emerald-50/30 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <Sparkles size={60} className="text-emerald-900" />
                    </div>

                    <div className="flex items-center gap-2 mb-4">
                      <div className="px-3 py-1 bg-emerald-900 text-white rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-lg shadow-emerald-900/10">
                        <Sparkles size={12} />
                        Análise de Inteligência Artificial
                      </div>
                      <div className="h-px bg-emerald-200 grow"></div>
                    </div>

                    <div className="grid grid-cols-2 gap-8 relative z-10">
                      {/* Left Side: Strategic Overview */}
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-emerald-950 uppercase tracking-tight flex items-center gap-2">
                          <TrendingUp size={14} className="text-emerald-700" />
                          Visão Estratégica
                        </h4>
                        <div className="space-y-2.5">
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 p-1 rounded-md ${analytics.netProfit >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                              {analytics.netProfit >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                            </div>
                            <p className="text-[10px] text-gray-700 leading-relaxed">
                              <span className="font-bold text-gray-900">Rentabilidade:</span> {analytics.netProfit >= 0
                                ? "Operação lucrativa. Margem líquida positiva indica saúde financeira."
                                : "Atenção: Operação com prejuízo no período. Necessário revisar custos fixos."}
                            </p>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 p-1 rounded-md ${analytics.totalDivergence >= 0 ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                              <Wallet size={10} />
                            </div>
                            <p className="text-[10px] text-gray-700 leading-relaxed">
                              <span className="font-bold text-gray-900">Controle de Caixa:</span> {Math.abs(analytics.totalDivergence) < (analytics.totalInMonth * 0.01)
                                ? "Fluxo de caixa extremamente preciso. Divergência mínima detectada."
                                : `Alerta: Divergência de MT ${Math.abs(analytics.totalDivergence).toLocaleString()} requer auditoria imediata.`}
                            </p>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 p-1 rounded-md bg-purple-100 text-purple-700">
                              <ArrowUpRight size={10} />
                            </div>
                            <p className="text-[10px] text-gray-700 leading-relaxed">
                              <span className="font-bold text-gray-900">Eficiência de Giro:</span> {analytics.stockOutputs > analytics.stockInvestments
                                ? "O stock está a girar bem. Vendas superam a reposição."
                                : "Alto investimento em stock. Focar em queimar inventário parado."}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Right Side: Tips & Recommendations */}
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-emerald-950 uppercase tracking-tight flex items-center gap-2">
                          <Zap size={14} className="text-emerald-700" />
                          Recomendações e Boas Práticas
                        </h4>
                        <ul className="space-y-2 border-l-2 border-emerald-100 pl-4">
                          <li className="text-[9px] text-gray-600 italic">
                            <span className="font-bold text-emerald-900 block not-italic mb-0.5">Otimização de Custos</span>
                            Revisar fornecedores nas categorias de maiores gastos para aumentar a margem bruta.
                          </li>
                          <li className="text-[9px] text-gray-600 italic">
                            <span className="font-bold text-emerald-900 block not-italic mb-0.5">Gestão de Inventário</span>
                            Implementar promoções em itens de baixo giro identificados na análise de catálogo.
                          </li>
                          <li className="text-[9px] text-gray-600 italic">
                            <span className="font-bold text-emerald-900 block not-italic mb-0.5">Fidelização</span>
                            Aproveitar o ticket médio de MT {(analytics.totalInMonth / (analytics.salesCount || 1)).toFixed(0)} para criar pacotes de produtos.
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Transactions Table - Professional */}
                  <div className="mb-8">
                    <h3 className="text-[9px] font-black text-gray-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <span className="w-1 h-1 bg-emerald-500 rounded-full"></span> Detalhe de Vendas
                    </h3>
                    <table className="w-full text-left border-collapse text-[8px]">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="py-2 font-bold uppercase text-gray-500 w-24">Data</th>
                          <th className="py-2 font-bold uppercase text-gray-500">Cliente</th>
                          <th className="py-2 font-bold uppercase text-gray-500">Descrição</th>
                          <th className="py-2 font-bold uppercase text-gray-500 w-20">Método</th>
                          <th className="py-2 font-bold uppercase text-gray-500 text-right w-24">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sales
                          .filter(s => {
                            const d = new Date(s.timestamp);
                            return d.getMonth() === reportFilter.month && d.getFullYear() === reportFilter.year;
                          })
                          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                          .map((sale, idx) => (
                            <tr key={idx} className="border-b border-gray-100 break-inside-avoid page-break-avoid">
                              <td className="py-2 text-gray-600">{new Date(sale.timestamp).toLocaleString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                              <td className="py-2 font-bold text-gray-900">{sale.clientName || 'Consumidor Final'}</td>
                              <td className="py-2 text-gray-600 truncate max-w-[200px]">{sale.items.map(i => i.name).join(', ')}</td>
                              <td className="py-2 uppercase text-gray-500 text-[7px] font-bold tracking-wider">{sale.paymentMethod}</td>
                              <td className="py-2 text-right font-black text-gray-900">MT {sale.total.toLocaleString()}</td>
                            </tr>
                          ))}
                        {sales.filter(s => new Date(s.timestamp).getMonth() === reportFilter.month && new Date(s.timestamp).getFullYear() === reportFilter.year).length === 0 && (
                          <tr><td colSpan={5} className="py-8 text-center text-gray-400 italic font-medium">Nenhum registo neste período.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Expenses Table */}
                  <div className="mb-8">
                    <h3 className="text-[9px] font-black text-gray-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <span className="w-1 h-1 bg-red-500 rounded-full"></span> Detalhe de Despesas
                    </h3>
                    <table className="w-full text-left border-collapse text-[8px]">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="py-2 font-bold uppercase text-gray-500 w-24">Data</th>
                          <th className="py-2 font-bold uppercase text-gray-500">Descrição</th>
                          <th className="py-2 font-bold uppercase text-gray-500">Categoria</th>
                          <th className="py-2 font-bold uppercase text-gray-500 text-right w-24">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expenses
                          .filter(e => {
                            const d = new Date(e.date || e.timestamp);
                            return d.getMonth() === reportFilter.month && d.getFullYear() === reportFilter.year;
                          })
                          .sort((a, b) => new Date(a.date || a.timestamp).getTime() - new Date(b.date || b.timestamp).getTime())
                          .map((exp, idx) => (
                            <tr key={idx} className="border-b border-gray-100 break-inside-avoid page-break-avoid">
                              <td className="py-2 text-gray-600">{new Date(exp.date || exp.timestamp).toLocaleDateString()}</td>
                              <td className="py-2 text-gray-900 font-medium">{exp.description}</td>
                              <td className="py-2 uppercase text-gray-500 text-[7px] font-bold tracking-wider">{exp.category}</td>
                              <td className="py-2 text-right font-black text-red-600">MT {exp.amount.toLocaleString()}</td>
                            </tr>
                          ))}
                        {expenses.filter(e => new Date(e.date || e.timestamp).getMonth() === reportFilter.month && new Date(e.date || e.timestamp).getFullYear() === reportFilter.year).length === 0 && (
                          <tr><td colSpan={4} className="py-8 text-center text-gray-400 italic font-medium">Nenhum registo neste período.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Footer (Print Only) */}
                  <div className="mt-auto pt-8 border-t border-gray-200 flex justify-between items-center text-[7px] uppercase font-bold text-gray-400 tracking-widest">
                    <p>Processado por Computador - Nobreza ERP</p>
                    <p>Página 1 de 1</p>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT PANEL: Actions Sidebar */}
            <div className="w-[350px] bg-white/95 backdrop-blur-sm shadow-2xl flex flex-col z-10 shrink-0 h-full">
              <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                  <FileText className="text-emerald-600" size={24} />
                  Ações do Relatório
                </h2>
                <p className="text-xs text-gray-500 mt-1 font-medium">Gerencie e exporte o documento gerado.</p>
              </div>

              <div className="p-6 space-y-4 flex-1 overflow-y-auto">

                {/* Main Actions */}
                <div className="space-y-3">
                  <button onClick={() => processPDF('PRINT')} className="w-full py-4 bg-emerald-950 hover:bg-emerald-900 text-white rounded-xl font-black uppercase text-xs shadow-xl shadow-emerald-900/10 transition-all active:scale-[0.98] flex items-center justify-center gap-3">
                    <Printer size={18} />
                    <span>Imprimir / Salvar PDF</span>
                  </button>

                  <button onClick={() => processPDF('DOWNLOAD')} className="w-full py-4 bg-white border border-gray-200 hover:bg-gray-50 text-emerald-950 rounded-xl font-bold uppercase text-xs transition-all active:scale-[0.98] flex items-center justify-center gap-3">
                    <Download size={18} />
                    <span>Download Direto</span>
                  </button>
                </div>

                <div className="h-px bg-gray-100 my-2"></div>

                {/* Info Box */}
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-blue-500"><AlertCircle size={16} /></div>
                    <div>
                      <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wide mb-1">Histórico Automático</p>
                      <p className="text-xs text-blue-600 leading-relaxed font-medium">
                        O relatório é guardado automaticamente no histórico da empresa ao ser gerado.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-gray-100 my-2"></div>

                {/* Zoom Control */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Zoom de Visualização</label>
                    <span className="text-[10px] font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">{(previewScale * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.4"
                    max="1.5"
                    step="0.05"
                    value={previewScale}
                    onChange={(e) => setPreviewScale(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                  <div className="flex justify-between text-[8px] text-gray-400 font-bold mt-2 px-1">
                    <span>40%</span>
                    <span>100%</span>
                    <span>150%</span>
                  </div>
                </div>

              </div>

              {/* Close Button */}
              <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                <button onClick={() => setIsReportPreviewOpen(false)} className="w-full py-3 bg-white border-2 border-gray-200 hover:border-gray-300 text-gray-600 rounded-xl font-bold uppercase text-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                  <X size={16} />
                  Fechar Visualização
                </button>
              </div>
            </div>
          </div>
          , document.body)
      }
    </div>
  )
}



function UserProfileEditor({ currentUser, onUpdate, sales }: { currentUser: User, onUpdate: (user: User) => void, sales: Sale[] }) {
  const [user, setUser] = useState(currentUser);

  if (!user) return <div className="p-10 text-center text-gray-400">Dados do utilizador indisponÃ­veis</div>;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await import('../services').then(m => m.AuthService.updateProfile(user));
      onUpdate(user);
      alert('Perfil atualizado com sucesso!');
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Erro ao atualizar perfil.");
    }
  };

  // Personal Dashboard Stats
  const mySales = (sales || []).filter(s => s && s.performedBy === user.name);
  const totalSalesValue = mySales.reduce((acc, curr) => acc + (curr.total || 0), 0);
  const totalTransactions = mySales.length;
  // Mock efficiency or other stats
  const efficiency = totalTransactions > 0 ? Math.round(totalSalesValue / totalTransactions) : 0;

  return (
    <div className="animate-in fade-in space-y-6">
      {/* 1. Header Card with Personal Stats */}
      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          {/* Profile Photo & Basic Info */}
          <div className="flex flex-col items-center gap-4 text-center md:text-left md:items-start shrink-0">
            <div onClick={() => document.getElementById('profile-photo-input')?.click()} className="w-28 h-28 rounded-[2rem] bg-gray-50 border-4 border-white shadow-xl flex items-center justify-center cursor-pointer overflow-hidden relative group transition-transform hover:scale-105">
              {user.photo ? <img src={user.photo} className="w-full h-full object-cover" /> : <UserIcon size={40} className="text-emerald-950/20" />}
              <div className="absolute inset-0 bg-emerald-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all backdrop-blur-[2px]">
                <Camera size={24} className="text-white drop-shadow-md" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-black text-emerald-950 tracking-tight">{user.name}</h2>
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-lg inline-block mt-2">{user.role}</p>
            </div>
            <input
              id="profile-photo-input"
              type="file"
              className="hidden"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  const r = new FileReader();
                  r.onloadend = () => setUser({ ...user, photo: r.result as string });
                  r.readAsDataURL(f);
                }
              }}
            />
          </div>

          {/* Personal Dashboard Stats Grid */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><TrendingUp size={18} /></div>
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Vendas Totais</span>
              </div>
              <p className="text-xl font-black text-emerald-950">MT {totalSalesValue.toLocaleString()}</p>
            </div>
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><ShoppingCart size={18} /></div>
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Transações</span>
              </div>
              <p className="text-xl font-black text-emerald-950">{totalTransactions}</p>
            </div>
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><Zap size={18} /></div>
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Eficiência Média</span>
              </div>
              <p className="text-xl font-black text-emerald-950">MT {efficiency.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Edit Form */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-emerald-950 text-white rounded-xl"><Edit2 size={20} /></div>
          <div>
            <h3 className="text-lg font-black text-emerald-950 uppercase tracking-tight">Dados Pessoais</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Mantenha seus dados atualizados</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SettingInput label="Nome Completo" val={user.name} setVal={v => setUser({ ...user, name: v })} icon={UserIcon} />
            <SettingInput label="Email Profissional" val={user.email} setVal={v => setUser({ ...user, email: v })} icon={Mail} />
            <SettingInput label="Contacto TelefÃ³nico" val={user.contact || ''} setVal={v => setUser({ ...user, contact: v })} icon={Phone} />
            <SettingInput label="Cidade / Localização" val={user.location || ''} setVal={v => setUser({ ...user, location: v })} icon={MapPin} />
            <SettingInput label="NÂº Segurança Social / NUIT" val={user.socialSecurityNumber || ''} setVal={v => setUser({ ...user, socialSecurityNumber: v })} icon={Fingerprint} />

            <div className="space-y-1 opacity-60 grayscale" title="Contacte o suporte para alterar">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-2">Cargo Atual (Fixo)</label>
              <div className="relative">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300"><Briefcase size={18} /></div>
                <input className="w-full pl-14 pr-4 py-5 bg-gray-50 border-2 border-transparent rounded-2xl font-black text-emerald-950 text-sm cursor-not-allowed" value={user.role} readOnly />
                <div className="absolute right-5 top-1/2 -translate-y-1/2 text-emerald-600"><Lock size={14} /></div>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button type="submit" className="bg-emerald-950 hover:bg-emerald-900 text-white px-10 py-5 rounded-2xl font-black uppercase text-xs shadow-xl shadow-emerald-900/20 active:scale-95 transition-all flex items-center gap-3">
              <Save size={18} /> Atualizar Perfil
            </button>
          </div>
        </form>
      </div>
      {/* Report Preview Modal */}
    </div>
  );
};



function SubReportBtn({ active, icon: Icon, label, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center justify-center p-3 rounded-xl transition-all min-w-[70px] ${active ? 'bg-emerald-950 text-white' : 'text-gray-400 hover:text-emerald-700'}`}
    >
      <Icon size={18} />
      <span className="text-[8px] font-black uppercase mt-1 tracking-tighter">{label}</span>
    </button>
  );
}

function SummaryBox({ label, val, isRed }: any) {
  return (
    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
      <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-lg font-black ${isRed ? 'text-red-400' : 'text-white'}`}>{val}</p>
    </div>
  );
}

function SettingInput({ label, val, setVal, icon: Icon, type = 'text' }: any) {
  return (
    <div className="space-y-1">
      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-2">{label}</label>
      <div className="relative">
        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none"><Icon size={18} /></div>
        <input type={type} className="w-full pl-14 pr-4 py-5 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 transition-all font-black text-emerald-950 shadow-inner" value={val} onChange={e => setVal(e.target.value)} />
      </div>
    </div>
  );
}

/* Specialized Mobile Summary View for Reports */
function DashboardSummary({ analytics }: any) {
  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="space-y-4">
        <h4 className="text-xs font-black text-emerald-950 uppercase tracking-tight flex items-center gap-2"><TrendingUp size={16} className="text-emerald-600" /> Performance de Catálogo</h4>
        <div className="space-y-3">
          {analytics.topProducts.map((p: any, i: number) => (
            <div key={i} className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl">
              <span className="text-[10px] font-black text-gray-700 uppercase truncate pr-4">{p.name}</span>
              <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg text-[10px] font-black shrink-0">{p.value} un.</span>
            </div>
          ))}
        </div>
      </div>

      {analytics.bestSeller && (
        <div className="space-y-4">
          <h4 className="text-xs font-black text-emerald-950 uppercase tracking-tight flex items-center gap-2"><Users size={16} className="text-emerald-600" /> Melhor Vendedor</h4>
          <div className="bg-gradient-to-br from-emerald-900 to-emerald-950 p-5 rounded-2xl text-white flex items-center gap-4 shadow-lg">
            <div className="p-3 bg-white/10 rounded-xl"><UserIcon size={24} /></div>
            <div>
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Top Performance</p>
              <p className="text-xl font-black">{analytics.bestSeller[0]}</p>
              <p className="text-[10px] opacity-60 font-bold uppercase mt-1">Total: MT {analytics.bestSeller[1].toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CatalogPerformanceReport({ sales, filter, products }: any) {
  const catalogStats = useMemo(() => {
    const stats: Record<string, { name: string; qty: number; revenue: number; category: string }> = {};
    const start = new Date(filter.startDate);
    const end = new Date(filter.endDate);
    end.setHours(23, 59, 59);

    sales.forEach((s: any) => {
      const d = new Date(s.timestamp);
      if (d >= start && d <= end) {
        s.items?.forEach((item: any) => {
          if (!stats[item.productName]) {
            const p = products.find((p: any) => p.name === item.productName);
            stats[item.productName] = {
              name: item.productName,
              qty: 0,
              revenue: 0,
              category: p?.category || 'Geral'
            };
          }
          stats[item.productName].qty += item.quantity;
          stats[item.productName].revenue += item.total;
        });
      }
    });

    return Object.values(stats).sort((a, b) => b.revenue - a.revenue);
  }, [sales, filter, products]);

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-emerald-50 p-4 rounded-3xl border border-emerald-100 italic">
          <p className="text-[8px] font-black text-emerald-800 uppercase tracking-widest mb-1">Top Produto (Receita)</p>
          <p className="text-sm font-black text-emerald-950 truncate">{catalogStats[0]?.name || '-'}</p>
        </div>
        <div className="bg-emerald-50 p-4 rounded-3xl border border-emerald-100 italic">
          <p className="text-[8px] font-black text-emerald-800 uppercase tracking-widest mb-1">Total Itens Vendidos</p>
          <p className="text-sm font-black text-emerald-950 uppercase">{catalogStats.reduce((a, b) => a + b.qty, 0).toLocaleString()} <span className="text-[10px] text-gray-400 font-bold tracking-tight">unidades</span></p>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white">
        <table className="w-full text-left">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Produto</th>
              <th className="p-4 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Categoria</th>
              <th className="p-4 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Quantidade</th>
              <th className="p-4 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right pr-8">Receita Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {catalogStats.map((item, i) => (
              <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                <td className="p-4">
                  <span className="font-bold text-emerald-950 text-xs uppercase">{item.name}</span>
                </td>
                <td className="p-4 text-center">
                  <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md uppercase">{item.category}</span>
                </td>
                <td className="p-4 text-center">
                  <span className="font-black text-emerald-950 text-xs">{item.qty}</span>
                </td>
                <td className="p-4 text-right pr-8">
                  <span className="font-black text-emerald-950 text-xs">MT {item.revenue.toLocaleString()}</span>
                </td>
              </tr>
            ))}
            {catalogStats.length === 0 && (
              <tr>
                <td colSpan={4} className="p-20 text-center">
                  <Package size={48} className="mx-auto text-gray-200 mb-4" />
                  <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Nenhuma venda de catÃ¡logo no Período</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

function SalesDetailedReport({ sales, filter }: any) {
  const filtered = sales.filter((s: any) => {
    const d = new Date(s.timestamp);
    return d.getMonth() === filter.month && d.getFullYear() === filter.year;
  });
  return (
    <div className="space-y-4 animate-in fade-in">
      <div className="flex justify-between items-end border-b pb-4">
        <p className="text-[10px] font-black text-gray-400 uppercase">Volume Mensal</p>
        <p className="text-lg font-black text-emerald-950">{filtered.length} Vendas</p>
      </div>
      <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
        {filtered.map((s: any) => (
          <div key={s.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex justify-between items-center group">
            <div>
              <p className="text-[8px] font-black text-emerald-600 uppercase mb-1">#{s.id} â€¢ {new Date(s.timestamp).toLocaleDateString()}</p>
              <p className="text-xs font-black text-gray-900 uppercase truncate">{s.performedBy}</p>
            </div>
            <p className="text-sm font-black text-emerald-950 shrink-0">MT {s.total.toFixed(0)}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

function LogsDetailedReport({ logs, filter }: any) {
  return (
    <div className="space-y-4 animate-in fade-in overflow-y-auto max-h-[450px] pr-2 custom-scrollbar">
      {logs.filter((l: any) => new Date(l.timestamp).getMonth() === filter.month).map((l: any) => {
        const isSystem = l.userId === 'sys' || l.userName === 'Sistema' || l.userName === 'Nobreza System';
        return (
          <div key={l.id} className={`p-4 border-2 ${isSystem ? 'border-blue-50 bg-blue-50/20' : 'border-gray-50'} rounded-2xl flex flex-col gap-2`}>
            <div className="flex justify-between">
              <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase ${isSystem ? 'bg-blue-100 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
                {l.action}
              </span>
              <span className="text-[8px] text-gray-400 font-bold">{new Date(l.timestamp).toLocaleTimeString()}</span>
            </div>
            <p className="text-[11px] font-bold text-gray-700 leading-tight">{l.details}</p>
            <div className="flex items-center gap-2 mt-1">
              {isSystem ? (
                <div className="flex items-center gap-1 text-[8px] font-black text-blue-600 uppercase">
                  <ShieldCheck size={10} />
                  <span>Nobreza System</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-[8px] font-black text-gray-400 uppercase">
                  <UserIcon size={10} />
                  <span>{l.userName}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StockDetailedReport({
  products,
  priceAdjustmentAmount,
  setPriceAdjustmentAmount,
  handleGlobalPriceAdjustment,
  adjustingPrices
}: any) {
  const critical = products.filter((p: any) => p.quantity <= p.minStock);
  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex items-center gap-3 bg-red-50 p-4 rounded-2xl text-red-600">
        <AlertCircle size={20} />
        <p className="text-xs font-black uppercase tracking-widest">{critical.length} Alertas de Ruptura</p>
      </div>

      <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100/50 space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-emerald-700" />
          <h4 className="text-[10px] font-black text-emerald-900 uppercase tracking-widest">Ajuste Rápido de Margens</h4>
        </div>
        <p className="text-[10px] text-emerald-600/70 font-bold uppercase leading-relaxed">
          Aumentar ou diminuir o Preço de venda de todos os produtos em massa.
        </p>
        <div className="flex gap-3">
          <input
            type="number"
            placeholder="Ex: 5 ou -5 (%)"
            className="flex-1 px-4 py-3 bg-white border border-emerald-200 rounded-xl font-black text-xs outline-none focus:border-emerald-500"
            value={priceAdjustmentAmount}
            onChange={e => setPriceAdjustmentAmount(parseFloat(e.target.value) || 0)}
          />
          <button
            onClick={handleGlobalPriceAdjustment}
            disabled={adjustingPrices}
            className="bg-emerald-700 text-white px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-800 disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg shadow-emerald-700/20"
          >
            {adjustingPrices ? 'Ajustando...' : 'Aplicar'}
          </button>
        </div>
      </div>
      <div className="space-y-3">
        {critical.map((p: any) => (
          <div key={p.id} className="p-4 bg-white border border-gray-100 rounded-2xl flex justify-between items-center shadow-sm">
            <div>
              <p className="text-xs font-black text-emerald-950 uppercase">{p.name}</p>
              <p className="text-[9px] text-gray-400 uppercase font-bold mt-1">Stock Atual: <span className="text-red-600 font-black">{p.quantity}</span></p>
            </div>
            <div className="bg-gray-100 px-3 py-1 rounded-lg text-[10px] font-black text-gray-500 uppercase tracking-tighter">MIN {p.minStock}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
function ExpensesView({ expenses, team, currentUser }: { expenses: any[], team: User[], currentUser: User }) {
  const [localExpenses, setLocalExpenses] = useState<any[]>(expenses.filter((e: any) => !e.deleted));
  const [showAdd, setShowAdd] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any | null>(null);

  const total = localExpenses.reduce((a, b) => a + (b.amount || 0), 0);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const amount = parseFloat(formData.get('amount') as string);
    const description = formData.get('description') as string;
    const type = formData.get('type') as string;

    try {
      if (editingExpense) {
        const { error } = await supabase.from('expenses').update({
          amount,
          description,
          type
        }).eq('id', editingExpense.id);

        if (error) throw error;

        const updated = { ...editingExpense, amount, description, type };
        setLocalExpenses(localExpenses.map(exp => exp.id === editingExpense.id ? updated : exp));

        await LogService.add({
          action: 'EDIT_EXPENSE',
          details: `Editou Despesa: ${description} (${amount} MT)`,
          userId: currentUser.id,
          userName: currentUser.name,
          companyId: currentUser.companyId
        });

        setEditingExpense(null);
        alert("Despesa atualizada com sucesso!");
      } else {
        const { data, error } = await supabase.from('expenses').insert([{
          company_id: currentUser.companyId,
          user_id: currentUser.id,
          amount,
          description,
          type,
          date: new Date().toISOString()
        }]).select();

        if (error) throw error;
        setLocalExpenses([data[0], ...localExpenses]);

        await LogService.add({
          action: 'ADD_EXPENSE',
          details: `Nova Despesa: ${description} (${amount} MT)`,
          userId: currentUser.id,
          userName: currentUser.name,
          companyId: currentUser.companyId
        });
      }
      setShowAdd(false);
    } catch (e: any) {
      console.error("Expense Error:", e);
      alert(`Erro ao salvar despesa: ${e.message || 'Erro desconhecido'}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem a certeza que deseja remover esta despesa?")) return;
    try {
      // Soft Delete
      const { error } = await supabase.from('expenses').update({ deleted: true }).eq('id', id);
      if (error) throw error;

      setLocalExpenses(localExpenses.filter(e => e.id !== id));

      await LogService.add({
        action: 'DELETE_EXPENSE',
        details: `Removeu Despesa #${id}`,
        userId: currentUser.id,
        userName: currentUser.name,
        companyId: currentUser.companyId
      });
    } catch (e: any) {
      alert("Erro ao remover: " + e.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100">
        <div>
          <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">Total de Despesas</p>
          <p className="text-3xl font-black text-emerald-950">MT {total.toLocaleString()}</p>
        </div>
        <button onClick={() => { setEditingExpense(null); setShowAdd(true); }} className="bg-emerald-950 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-950/20 active:scale-95 transition-all flex items-center gap-2">
          <Plus size={16} /> Nova Despesa
        </button>
      </div>

      <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Data</th>
              <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Descrição</th>
              <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Categoria</th>
              <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Valor</th>
              <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {localExpenses.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-400 font-bold text-xs uppercase tracking-widest">Sem despesas registradas</td></tr>
            ) : (
              localExpenses.map((exp, idx) => (
                <tr key={idx} className="hover:bg-gray-50/50 group">
                  <td className="px-6 py-4 text-xs font-bold text-gray-500">{new Date(exp.date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-xs font-black text-emerald-950 uppercase">{exp.description}</td>
                  <td className="px-6 py-4 text-[10px] font-bold text-emerald-600 uppercase bg-emerald-50 w-fit rounded-lg px-2 m-2">{exp.type}</td>
                  <td className="px-6 py-4 text-sm font-black text-red-600 text-right">MT {exp.amount?.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingExpense(exp); setShowAdd(true); }} className="p-2 text-blue-400 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(exp.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAdd && createPortal(
        <div className="fixed inset-0 bg-emerald-950/95 backdrop-blur-2xl z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-500">
          <div className="bg-white w-full max-w-xl rounded-[3.5rem] p-10 md:p-14 shadow-[0_40px_100px_rgba(0,0,0,0.6)] animate-in zoom-in-95 duration-500 overflow-y-auto max-h-[95vh] border border-white/20 relative">
            <button onClick={() => setShowAdd(false)} className="absolute top-8 right-8 md:top-12 md:right-12 p-3 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-400 hover:text-emerald-700 transition-all z-10"><X size={26} /></button>
            <div className="mb-10">
              <h3 className="text-3xl font-black text-emerald-950 uppercase tracking-tight">{editingExpense ? 'Editar Despesa' : 'Nova Despesa'}</h3>
              <p className="text-xs text-emerald-600 font-bold uppercase tracking-widest mt-2">{editingExpense ? 'Atualizar detalhes da despesa' : 'Registe um novo gasto na base de dados'}</p>
            </div>
            <form onSubmit={handleSave} className="space-y-8">
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-emerald-800 uppercase tracking-widest ml-4 mb-2 block">Descrição</label>
                  <input name="description" defaultValue={editingExpense?.description} required placeholder="Ex: Aluguel Janeiro" className="w-full px-6 py-4 bg-gray-50 rounded-2xl text-sm font-bold border-2 border-transparent focus:border-emerald-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-emerald-800 uppercase tracking-widest ml-4 mb-2 block">Valor (MT)</label>
                  <input name="amount" defaultValue={editingExpense?.amount} type="number" step="0.01" required placeholder="0.00" className="w-full px-6 py-4 bg-gray-50 rounded-2xl text-sm font-bold border-2 border-transparent focus:border-emerald-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-emerald-800 uppercase tracking-widest ml-4 mb-2 block">Categoria</label>
                  <select name="type" defaultValue={editingExpense?.type} className="w-full px-6 py-4 bg-gray-50 rounded-2xl text-sm font-bold border-2 border-transparent focus:border-emerald-500 outline-none transition-all appearance-none cursor-pointer">
                    <option value="Operational">Operacional</option>
                    <option value="Salary">Salários</option>
                    <option value="Maintenance">Manutenção</option>
                    <option value="Stock">Stock / Compras</option>
                    <option value="Other">Outros</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="w-full bg-emerald-950 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl active:scale-95 transition-all">
                {editingExpense ? 'Atualizar Despesa' : 'Registar Gasto'}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
function AdjustmentModal({ isOpen, onClose, onConfirm, paymentMethods }: any) {
  const [type, setType] = useState<'ENTRY' | 'EXIT'>('ENTRY');
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [method, setMethod] = useState('CASH');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[99999] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95">
        <h3 className="text-xl font-black text-emerald-950 uppercase mb-6 flex items-center gap-2">
          <TrendingUp className="text-emerald-600" />
          Ajuste de Caixa
        </h3>

        <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
          <button onClick={() => setType('ENTRY')} className={`flex-1 py-3 rounded-lg text-xs font-black uppercase transition-all ${type === 'ENTRY' ? 'bg-emerald-500 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}>Entrada</button>
          <button onClick={() => setType('EXIT')} className={`flex-1 py-3 rounded-lg text-xs font-black uppercase transition-all ${type === 'EXIT' ? 'bg-red-500 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}>Saída</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2 mb-1 block">Valor (MT)</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full px-5 py-4 bg-gray-50 rounded-2xl font-black text-emerald-950 border-2 border-transparent focus:border-emerald-500 outline-none" placeholder="0.00" />
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2 mb-1 block">Método</label>
            <select value={method} onChange={e => setMethod(e.target.value)} className="w-full px-5 py-4 bg-gray-50 rounded-2xl font-black text-emerald-950 border-2 border-transparent focus:border-emerald-500 outline-none appearance-none cursor-pointer">
              {paymentMethods.map((m: string) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2 mb-1 block">Motivo</label>
            <input type="text" value={desc} onChange={e => setDesc(e.target.value)} className="w-full px-5 py-4 bg-gray-50 rounded-2xl font-black text-emerald-950 border-2 border-transparent focus:border-emerald-500 outline-none" placeholder="Ex: Correção de troco, esquecimento..." />
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button onClick={onClose} className="flex-1 py-4 rounded-xl border-2 border-gray-100 font-bold text-gray-400 text-xs uppercase hover:bg-gray-50">Cancelar</button>
          <button onClick={() => onConfirm(type, parseFloat(amount), method, desc)} className="flex-1 py-4 rounded-xl bg-emerald-950 text-white font-black text-xs uppercase shadow-xl active:scale-95 transition-all">Confirmar</button>
        </div>
      </div>
    </div>
  )
}
