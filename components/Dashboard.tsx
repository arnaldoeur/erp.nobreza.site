
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  TrendingUp,
  Package,
  AlertCircle,
  Wallet,
  Sun,
  Moon,
  ShoppingCart,
  FileText,
  Truck,
  ChevronRight,
  X,
  CreditCard,
  Banknote,
  Smartphone,
  ArrowRight,
  Zap
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Product, Sale, CompanyInfo, User } from '../types';
import { QuoteWidget } from './QuoteWidget';

interface DashboardProps {
  products: Product[];
  sales: Sale[];
  onQuickAction?: (view: string, action: string) => void;
  user?: User;
  companyInfo?: CompanyInfo;
}

type DashboardModalType = 'SALES_TODAY' | 'STOCK_VALUE' | 'LOW_STOCK' | 'CASH_DETAILS' | null;

export const Dashboard: React.FC<DashboardProps> = ({ products, sales, onQuickAction, user, companyInfo }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeModal, setActiveModal] = useState<DashboardModalType>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getCompanyTimeParts = (date: Date) => {
    try {
      const options: Intl.DateTimeFormatOptions = {
        timeZone: companyInfo?.timezone || 'Africa/Maputo',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hourCycle: 'h23'
      };
      const formatter = new Intl.DateTimeFormat('en-GB', options);
      const parts = formatter.formatToParts(date);

      const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
      const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
      const second = parseInt(parts.find(p => p.type === 'second')?.value || '0');

      return { hour, minute, second };
    } catch (e) {
      console.error("Timezone error:", e);
      return { hour: date.getHours(), minute: date.getMinutes(), second: date.getSeconds() };
    }
  };

  const companyTime = getCompanyTimeParts(currentTime);
  const timeVal = companyTime.hour + companyTime.minute / 60;

  const getGreeting = () => {
    if (companyTime.hour < 12) return "Bom dia";
    if (companyTime.hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const activeShift = useMemo(() => {
    if (!companyInfo?.shifts || companyInfo.shifts.length === 0) return null;

    return companyInfo.shifts.find(s => {
      const [startH, startM] = s.start.split(':').map(Number);
      const [endH, endM] = s.end.split(':').map(Number);
      const startVal = startH + startM / 60;
      const endVal = endH + endM / 60;

      // Handle shifts crossing midnight
      if (startVal <= endVal) {
        return timeVal >= startVal && timeVal < endVal;
      } else {
        return timeVal >= startVal || timeVal < endVal;
      }
    });
  }, [companyInfo?.shifts, timeVal]);

  // Strict Business Status based on Opening/Closing Time
  // Strict Business Status based on Opening/Closing Time
  const isOpenStatus = useMemo(() => {
    if (!companyInfo?.openingTime || !companyInfo?.closingTime) return activeShift !== null;

    try {
      const [openH, openM] = companyInfo.openingTime.split(':').map(Number);
      const [closeH, closeM] = companyInfo.closingTime.split(':').map(Number);

      const openVal = openH + (openM || 0) / 60;
      const closeVal = closeH + (closeM || 0) / 60;

      if (openVal <= closeVal) {
        return timeVal >= openVal && timeVal < closeVal;
      } else {
        return timeVal >= openVal || timeVal < closeVal;
      }
    } catch (e) {
      return activeShift !== null;
    }
  }, [companyInfo, timeVal, activeShift]);

  const today = new Date().toLocaleDateString();
  const salesToday = sales.filter(s => new Date(s.timestamp).toLocaleDateString() === today);
  const totalSalesToday = salesToday.reduce((sum, s) => sum + s.total, 0);

  const lowStockCount = products.filter(p => Number(p.quantity) <= Number(p.minStock)).length;
  const totalStockValue = products.reduce((sum, p) => {
    const qty = Number(p.quantity) || 0;
    const price = Number(p.purchasePrice || p.salePrice || 0);
    return sum + (qty * price);
  }, 0);

  const [chartPeriod, setChartPeriod] = useState<'daily' | '15days' | '1month' | '3months'>('daily');

  // Chart Data Calculation
  const chartData = useMemo(() => {
    const now = new Date();
    const data: { name: string; sales: number }[] = [];

    if (chartPeriod === 'daily') {
      // Daily Logic (Hourly based on Company Hours)
      let startHour = 8;
      let endHour = 20;

      if (companyInfo?.openingTime && companyInfo?.closingTime) {
        startHour = parseInt(companyInfo.openingTime.split(':')[0]);
        endHour = parseInt(companyInfo.closingTime.split(':')[0]);
        if (endHour < startHour) endHour += 24; // Handle Next Day closing for chart ??? Complex. 
        // Simplified: If closes next day, show until 23h or extend. 
        // For visualization, usually we just show the operating window.
        // Let's assume standard day operation for chart x-axis simplicity or 0-23 if 24h.
        if (startHour > endHour) { endHour = 23; startHour = 0; } // Fallback for complex shifts
      }

      const length = Math.max(1, endHour - startHour + 1);

      return Array.from({ length }, (_, i) => i + startHour).map(hour => {
        const h = hour % 24;
        const hourLabel = `${h.toString().padStart(2, '0')}:00`;
        const salesInHour = salesToday.filter(s => new Date(s.timestamp).getHours() === h);
        const amount = salesInHour.reduce((sum, s) => sum + s.total, 0);
        return { name: hourLabel, sales: amount };
      });
    } else {
      // Period Logic (Group by Date)
      let days = 30;
      if (chartPeriod === '15days') days = 15;
      if (chartPeriod === '3months') days = 90;

      const startDate = new Date();
      startDate.setDate(now.getDate() - days);

      // Initialize map with 0 for all days to show gaps
      const dateMap = new Map<string, number>();
      for (let i = 0; i <= days; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        const label = d.toLocaleDateString('pt-MZ', { day: '2-digit', month: '2-digit' });
        dateMap.set(label, 0);
      }

      // Fill with actual sales
      sales.filter(s => new Date(s.timestamp) >= startDate).forEach(s => {
        const dateKey = new Date(s.timestamp).toLocaleDateString('pt-MZ', { day: '2-digit', month: '2-digit' });
        if (dateMap.has(dateKey)) {
          dateMap.set(dateKey, (dateMap.get(dateKey) || 0) + s.total);
        }
      });

      return Array.from(dateMap.entries()).map(([name, val]) => ({ name, sales: val }));
    }
  }, [sales, chartPeriod, salesToday, companyInfo]);

  const topLowStock = products
    .filter(p => p.quantity <= p.minStock)
    .slice(0, 3);

  const quickActions = [
    { label: 'Nova Venda', icon: ShoppingCart, view: 'pos', action: 'new_sale', color: 'text-red-600' },
    { label: 'Proforma', icon: FileText, view: 'billing', action: 'new_invoice', color: 'text-emerald-600' },
    { label: 'P. Compra', icon: Truck, view: 'billing', action: 'new_purchase', color: 'text-blue-600' },
    { label: 'Novo Item', icon: Package, view: 'stock', action: 'new_product', color: 'text-purple-600' },
  ];

  /* Modal renderers */
  const renderModalContent = () => {
    switch (activeModal) {
      case 'SALES_TODAY':
        return (
          <div className="space-y-4">
            <div className="flex items-baseline gap-2 border-b pb-4">
              <h3 className="text-lg font-black text-emerald-950 uppercase">Vendas de Hoje</h3>
              <span className="text-lg font-black text-gray-400">-</span>
              <span className="text-lg font-black text-emerald-600">Total: MT {totalSalesToday.toLocaleString()}</span>
            </div>
            <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {salesToday.length === 0 ? <p className="text-gray-400 text-center py-10">Sem vendas hoje.</p> : salesToday.map(s => (
                <div key={s.id} className="bg-gray-50 p-4 rounded-2xl flex justify-between items-center">
                  <div>
                    <p className="text-xs font-black text-emerald-950 uppercase">#{s.id.slice(-6)} • {new Date(s.timestamp).toLocaleTimeString()}</p>
                    <p className="text-[10px] text-gray-500 uppercase font-bold mt-1">
                      {s.customerName || 'Venda Direta'} • {s.items.length} Itens
                    </p>
                    <p className="text-[9px] text-gray-400 font-bold uppercase">{s.performedBy}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-emerald-700">MT {s.total.toLocaleString()}</p>
                    <p className="text-[9px] text-gray-400 uppercase font-bold">{s.paymentMethod}</p>
                  </div>
                </div>
              ))}
            </div>
          </div >
        );
      case 'STOCK_VALUE':
        const invested = products.reduce((sum, p) => sum + (p.quantity * (p.purchasePrice || 0)), 0);
        const profitPotential = products.reduce((sum, p) => sum + (p.quantity * (p.salePrice - (p.purchasePrice || 0))), 0);
        const topValueProducts = [...products].sort((a, b) => (b.quantity * b.salePrice) - (a.quantity * a.salePrice)).slice(0, 20);

        return (
          <div className="space-y-6">
            <div className="flex items-baseline gap-2 border-b pb-4">
              <h3 className="text-lg font-black text-blue-950 uppercase">Valor do Stock</h3>
              <span className="text-lg font-black text-gray-400">-</span>
              <span className="text-lg font-black text-blue-600">Total: MT {totalStockValue.toLocaleString()}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Total Investido (Custo)</p>
                <p className="text-xl font-black text-blue-950">MT {invested.toLocaleString()}</p>
              </div>
              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Lucro Estimado</p>
                <p className="text-xl font-black text-emerald-950">MT {profitPotential.toLocaleString()}</p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Top Produtos (Valor de Venda)</h4>
              <div className="max-h-[40vh] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {topValueProducts.map(p => (
                  <div key={p.id} className="bg-gray-50 p-4 rounded-2xl flex justify-between items-center group hover:bg-blue-50 transition-colors">
                    <div>
                      <p className="text-xs font-black text-gray-800 uppercase group-hover:text-blue-950">{p.name}</p>
                      <p className="text-[10px] text-gray-400 uppercase font-bold mt-1 group-hover:text-blue-400">{p.quantity} Un. x MT {p.salePrice}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-blue-700">MT {(p.quantity * p.salePrice).toLocaleString()}</p>
                      <p className="text-[9px] font-bold text-gray-400 group-hover:text-blue-300">
                        Lucro: MT {(p.quantity * (p.salePrice - (p.purchasePrice || 0))).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'LOW_STOCK':
        const allLowStock = products.filter(p => p.quantity <= p.minStock);
        return (
          <div className="space-y-6">
            <div className="flex items-baseline gap-2 border-b pb-4">
              <h3 className="text-lg font-black text-red-950 uppercase">Ruptura de Stock</h3>
              <span className="text-lg font-black text-gray-400">-</span>
              <span className="text-lg font-black text-red-600">{allLowStock.length} Itens</span>
            </div>

            <div className="bg-red-50/50 rounded-2xl border border-red-100 overflow-hidden">
              <div className="grid grid-cols-12 gap-4 p-4 border-b border-red-100 bg-red-50 text-[10px] uppercase font-black text-red-400 tracking-widest">
                <div className="col-span-6">Produto</div>
                <div className="col-span-3 text-center">Stock Atual</div>
                <div className="col-span-3 text-right">Mínimo</div>
              </div>
              <div className="max-h-[50vh] overflow-y-auto custom-scrollbar">
                {allLowStock.length === 0 ? (
                  <div className="py-12 text-center">
                    <AlertCircle size={40} className="mx-auto text-emerald-200 mb-2" />
                    <p className="text-emerald-600 font-bold text-sm uppercase">Stock Saudável!</p>
                    <p className="text-[10px] text-emerald-400 font-medium">Nenhum item abaixo do mínimo.</p>
                  </div>
                ) : (
                  allLowStock.map((p, idx) => (
                    <div key={p.id} className={`grid grid-cols-12 gap-4 p-4 items-center hover:bg-red-50 transition-colors ${idx !== allLowStock.length - 1 ? 'border-b border-red-50' : ''}`}>
                      <div className="col-span-6">
                        <p className="text-xs font-black text-red-950 uppercase truncate">{p.name}</p>
                        <p className="text-[9px] text-red-300 font-bold uppercase">{p.code}</p>
                      </div>
                      <div className="col-span-3 text-center">
                        <span className="inline-block px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-black">{p.quantity}</span>
                      </div>
                      <div className="col-span-3 text-right">
                        <span className="text-xs font-bold text-red-400">{p.minStock} Un.</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            {allLowStock.length > 0 && (
              <div className="flex justify-end">
                <button onClick={() => onQuickAction?.('stock', 'new_product')} className="text-xs font-bold text-red-500 hover:text-red-700 uppercase tracking-widest flex items-center gap-2">
                  Gerir Stock <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>
        );
      case 'CASH_DETAILS':
        const byMethod = salesToday.reduce((acc, curr) => {
          acc[curr.paymentMethod] = (acc[curr.paymentMethod] || 0) + curr.total;
          return acc;
        }, {} as Record<string, number>);

        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
              <h3 className="text-lg font-black text-amber-950 uppercase">Detalhes de Caixa</h3>
              <span className="text-sm font-black text-amber-600">Total: MT {totalSalesToday.toLocaleString()}</span>
            </div>

            <div className="space-y-4">
              <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 flex items-center gap-4">
                <div className="p-3 bg-white text-emerald-600 rounded-xl shadow-sm"><Banknote size={24} /></div>
                <div className="flex-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Numerário (Cash)</p>
                  <p className="text-2xl font-black text-emerald-950">MT {(byMethod['CASH'] || 0).toLocaleString()}</p>
                </div>
              </div>

              <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 flex items-center gap-4">
                <div className="p-3 bg-white text-red-600 rounded-xl shadow-sm"><Smartphone size={24} /></div>
                <div className="flex-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">M-Pesa</p>
                  <p className="text-2xl font-black text-red-950">MT {(byMethod['MPESA'] || 0).toLocaleString()}</p>
                </div>
              </div>

              <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 flex items-center gap-4">
                <div className="p-3 bg-white text-purple-600 rounded-xl shadow-sm"><Zap size={24} /></div>
                <div className="flex-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">E-Mola</p>
                  <p className="text-2xl font-black text-purple-950">MT {(byMethod['EMOLA'] || 0).toLocaleString()}</p>
                </div>
              </div>

              <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 flex items-center gap-4">
                <div className="p-3 bg-white text-blue-600 rounded-xl shadow-sm"><CreditCard size={24} /></div>
                <div className="flex-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">POS / Transferência</p>
                  <p className="text-2xl font-black text-blue-950">MT {((byMethod['TRANSFER'] || 0) + (byMethod['OTHER'] || 0)).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-20 md:pb-0 w-full">

      {/* Top Section: Greeting + Clock + Quote = Fluid Height */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 shrink-0">
        {/* Left: Greeting & Clock */}
        <div className="lg:col-span-2 flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden relative">
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-14 h-14 bg-emerald-950/5 rounded-2xl flex items-center justify-center overflow-hidden shrink-0">
              {user?.photo ? (
                <img src={user.photo} alt="User Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-emerald-950 text-xl font-black italic">
                  {user?.name?.charAt(0) || 'G'}
                </div>
              )}
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-black text-emerald-950 tracking-tighter">
                {getGreeting()}, <span className="text-emerald-600">{user?.name?.split(' ')[0] || 'Gestor'}</span>
              </h1>
              <p className="text-[10px] text-gray-500 font-medium mt-0.5">Visão geral do sistema.</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${isOpenStatus ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {isOpenStatus ? 'Aberto' : 'Fechado'}
                </span>
                <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-[9px] font-black uppercase tracking-widest">
                  {isOpenStatus ? activeShift?.name : 'Fora de Horário'}
                </span>
              </div>
            </div>
          </div>

          <div className="relative z-10 text-left md:text-right mt-4 md:mt-0">
            <p className="text-2xl md:text-4xl font-black text-emerald-950 tracking-tighter font-mono">
              {currentTime.toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit', timeZone: companyInfo?.timezone || 'Africa/Maputo' })}
            </p>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">
              {currentTime.toLocaleDateString('pt-MZ', { day: 'numeric', month: 'long', timeZone: companyInfo?.timezone || 'Africa/Maputo' })}
            </p>
          </div>
        </div>

        {/* Right: Quote Widget */}
        <div className="h-full">
          <QuoteWidget />
        </div>
      </div>

      {/* Stats Grid = Fixed height auto, but compacted */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 shrink-0">
        <StatCard
          icon={TrendingUp}
          label="Vendas do Dia"
          value={`MT ${totalSalesToday.toFixed(0)}`}
          change={`${salesToday.length} transações`}
          color="emerald"
          onClick={() => setActiveModal('SALES_TODAY')}
        />
        <StatCard
          icon={Package}
          label="Valor em Stock"
          value={`MT ${totalStockValue.toLocaleString()}`}
          change={`${products.length} itens`}
          color="blue"
          onClick={() => setActiveModal('STOCK_VALUE')}
        />
        <StatCard
          icon={AlertCircle}
          label="Stock Baixo"
          value={`${lowStockCount}`}
          change="Atenção"
          color="red"
          onClick={() => setActiveModal('LOW_STOCK')}
        />
        <StatCard
          icon={Wallet}
          label="Em Caixa"
          value={`MT ${totalSalesToday.toFixed(0)}`}
          change="Líquido"
          color="amber"
          onClick={() => setActiveModal('CASH_DETAILS')}
        />
      </div>

      {/* Quick Actions Mobile (Hidden on Desktop) */}
      <div className="grid grid-cols-2 md:hidden gap-3 shrink-0">
        {/* Kept for mobile functionality, although request focused on desktop view */}
        {quickActions.map((action, i) => (
          <button
            key={i}
            onClick={() => onQuickAction?.(action.view, action.action)}
            className="bg-white p-4 rounded-2xl border border-gray-100 flex flex-col items-center gap-2 shadow-sm active:bg-gray-50 transition-colors"
          >
            <div className={`p-2 rounded-xl bg-gray-50 ${action.color}`}><action.icon size={20} /></div>
            <span className="text-[9px] font-black uppercase text-emerald-950 tracking-widest">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Bottom Section: Chart + Critical Alerts = Takes Remaining Space */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full lg:flex-1 min-h-0">
        {/* Sales Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col h-[500px] lg:h-[600px] w-full">
          <div className="flex justify-between items-center mb-4 shrink-0">
            <h3 className="text-base font-black flex items-center gap-3 text-gray-800 uppercase tracking-tight">
              <TrendingUp size={20} className="text-emerald-600" />
              Fluxo Financeiro
            </h3>
            <div className="flex bg-gray-50 rounded-xl p-1 gap-1">
              {(['daily', '15days', '1month', '3months'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setChartPeriod(period)}
                  className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${chartPeriod === period ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                    }`}
                >
                  {period === 'daily' && 'Diário'}
                  {period === '15days' && '15 Dias'}
                  {period === '1month' && '1 Mês'}
                  {period === '3months' && '3 Meses'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  interval={chartPeriod === 'daily' ? 0 : 'preserveStartEnd'}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                  formatter={(value: any) => [`MT ${value.toLocaleString()}`, 'Vendas']}
                />
                <Area type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Notificações */}
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col h-[500px] lg:h-[600px] overflow-hidden">
          <h3 className="text-base font-black flex items-center gap-3 text-gray-800 uppercase tracking-tight mb-4 shrink-0">
            <Zap size={20} className="text-amber-500" />
            Notificações
          </h3>
          <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
            {/* Recent Sales Notifications */}
            {sales.slice(0, 3).map((sale, idx) => (
              <div key={`sale-${idx}`} className="flex items-center justify-between p-3 bg-emerald-50 rounded-2xl border border-emerald-100 group shrink-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <ShoppingCart size={10} className="text-emerald-600" />
                    <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Nova Venda</span>
                  </div>
                  <p className="font-black text-emerald-950 text-xs leading-tight uppercase truncate">
                    {sale.items.map(i => i.productName).join(', ')}
                  </p>
                  <p className="text-[9px] text-emerald-600 font-bold uppercase mt-1">MT {sale.total.toLocaleString()} • {new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <ChevronRight size={14} className="text-emerald-300" />
              </div>
            ))}

            {/* Low Stock Notifications */}
            {topLowStock.map((item, idx) => (
              <div key={`stock-${idx}`} className="flex items-center justify-between p-3 bg-red-50 rounded-2xl border border-red-100 group shrink-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <AlertCircle size={10} className="text-red-500" />
                    <span className="text-[8px] font-black text-red-500 uppercase tracking-widest">Stock Baixo</span>
                  </div>
                  <p className="font-black text-red-950 text-xs leading-tight uppercase truncate">{item.name}</p>
                  <p className="text-[9px] text-red-600 font-bold uppercase mt-1">Stock Atual: {item.quantity}</p>
                </div>
                <ChevronRight size={14} className="text-red-300" />
              </div>
            ))}

            {topLowStock.length === 0 && sales.length === 0 && (
              <div className="text-center py-10 bg-gray-50 rounded-2xl text-gray-400 font-bold text-xs uppercase tracking-widest">Nenhuma atividade recente.</div>
            )}
          </div>
          <button onClick={() => setActiveModal('LOW_STOCK')} className="w-full py-3 mt-2 text-[9px] text-gray-400 hover:text-emerald-600 font-black text-center uppercase tracking-widest border-t border-dashed shrink-0">
            Ver Alertas Completos
          </button>
        </div>
      </div>

      {activeModal && (
        <div className="fixed inset-0 bg-emerald-950/40 z-[300] p-4 flex items-center justify-center backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200 relative overflow-hidden">
            <button onClick={() => setActiveModal(null)} className="absolute top-6 right-6 p-2 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-400 transition-colors z-10"><X size={20} /></button>
            {renderModalContent()}
          </div>
        </div>
      )}

    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, change, color, onClick }: any) => {
  const styles: any = {
    emerald: {
      bg: 'hover:bg-emerald-50 border-emerald-100',
      iconBg: 'bg-emerald-100 text-emerald-600',
      text: 'text-emerald-950',
      subtext: 'text-emerald-600'
    },
    blue: {
      bg: 'hover:bg-blue-50 border-blue-100',
      iconBg: 'bg-blue-100 text-blue-600',
      text: 'text-blue-950',
      subtext: 'text-blue-600'
    },
    red: {
      bg: 'hover:bg-red-50 border-red-100',
      iconBg: 'bg-red-100 text-red-600',
      text: 'text-red-950',
      subtext: 'text-red-600'
    },
    amber: {
      bg: 'hover:bg-amber-50 border-amber-100',
      iconBg: 'bg-amber-100 text-amber-600',
      text: 'text-amber-950',
      subtext: 'text-amber-600'
    },
  };

  const style = styles[color];

  return (
    <div
      onClick={onClick}
      className={`bg-white p-4 rounded-[1.5rem] shadow-sm border border-gray-100 group active:scale-95 transition-all cursor-pointer hover:shadow-md ${style.bg} flex flex-col items-center justify-center text-center gap-1.5 h-full`}
    >
      <div className={`w-10 h-10 rounded-full ${style.iconBg} flex items-center justify-center shrink-0 shadow-inner mb-0.5`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0 w-full">
        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5">{label}</p>
        <p className={`text-lg lg:text-xl font-black ${style.text} truncate tracking-tight mb-0.5`}>{value}</p>
        <p className={`text-[8px] font-black uppercase opacity-80 flex items-center justify-center gap-1 ${style.subtext}`}>
          {change} <ArrowRight size={10} className="group-hover:translate-x-1 transition-transform" />
        </p>
      </div>
    </div>
  );
};
