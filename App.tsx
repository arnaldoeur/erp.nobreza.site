
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { POS } from './components/POS';
import { Stock } from './components/Stock';
import { DailyClose } from './components/DailyClose';
import { Billing } from './components/Billing';
import { Settings } from './components/Settings';
import { SuperAdmin } from './components/SuperAdmin';
import { Customers } from './components/Customers';
import { Suppliers } from './components/Suppliers';
import { Sale, CompanyInfo, BillingDocument, Supplier, Customer, User, DailyClosure, SystemLog, Product, UserRole } from './types';
import { WorkShift } from './services/time-tracking.service';
import { LogIn, Key, ShieldCheck, UserPlus, Lock, ArrowLeft, Mail, AlertCircle, Sparkles, MessageCircle } from 'lucide-react';
import {
  AuthService,
  ProductService,
  SalesService,
  ClosureService,
  LogService,
  CompanyService,
  BillingService,
  SupplierService,
  CustomerService,
  NotificationService,
  ExpenseService,
  CollabService,
  TimeTrackingService
} from './services';
import { InitialLoader } from './components/InitialLoader';
import { Onboarding } from './components/Onboarding';
import { Terms } from './components/Terms';
import { Privacy } from './components/Privacy';
import { Expenses } from './components/Expenses';

import { Tasks } from './components/Tasks';
import { Documents } from './components/Documents';
import { SocialChat } from './components/SocialChat';
import { Support } from './components/Support';
import { Calendar } from './components/Calendar';
import { useSystem } from './contexts/SystemContext';
import { WifiOff } from 'lucide-react';

type AuthView = 'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD' | 'SUPER_ADMIN_LOGIN' | 'TERMS' | 'PRIVACY' | 'ACTIVATE';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState('dashboard');
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!AuthService.getCurrentUser());
  const [loading, setLoading] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const [onboardingNeeded, setOnboardingNeeded] = useState(false);

  // Auth State
  const [authView, setAuthView] = useState<AuthView>(() => {
    const hash = window.location.hash;
    return (hash.includes('superadmin') || hash.includes('super_admin')) ? 'SUPER_ADMIN_LOGIN' : 'LOGIN';
  });
  const [authError, setAuthError] = useState<string | null>(null);

  // State initialization
  const [products, setProducts] = useState<Product[]>([]);
  const [salesHistory, setSalesHistory] = useState<Sale[]>([]);
  const [dailyClosures, setDailyClosures] = useState<DailyClosure[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    id: '',
    name: 'Farmácia Nobreza',
    slogan: 'Gestão Inteligente',
    nuit: '',
    address: '',
    email: '',
    phone: '',
    website: '',
    themeColor: '#10b981'
  });
  const [billingDocuments, setBillingDocuments] = useState<BillingDocument[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [team, setTeam] = useState<User[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [activeShift, setActiveShift] = useState<WorkShift | null>(null);

  // Handle Theme & Dark Mode Globally
  useEffect(() => {
    if (companyInfo?.isDarkMode) {
      document.documentElement.classList.add('dark');
      document.body.style.backgroundColor = '#111827';
      document.body.style.color = '#f3f4f6';
    } else {
      document.documentElement.classList.remove('dark');
      document.body.style.backgroundColor = '';
      document.body.style.color = '';
    }
  }, [companyInfo?.isDarkMode]);

  // Initial Data Load & Session Sync
  useEffect(() => {
    const initApp = async () => {
      // 1. Sync session with Supabase
      const syncedUser = await AuthService.syncSession();
      if (syncedUser) {
        setIsAuthenticated(true);
      }

      // 2. Load data if authenticated
      if (isAuthenticated || syncedUser) {
        try {
          const info = await CompanyService.get();
          setCompanyInfo(info);

          if (info.themeColor) {
            import('./utils/theme').then(m => m.applyTheme(info.themeColor, info.themeColorSecondary));
          } else {
            import('./utils/theme').then(m => m.applyTheme('#10b981'));
          }

          if (info.name === 'Nome da Empresa' || !info.name) {
            // Only force onboarding if we are SURE it's a fresh company (and not just a failed fetch)
            // But if we just repaired the user, we might be linked to a fresh company.
            // Let's add a small check: if user is logged in, we allow dashboard access.
            // setOnboardingNeeded(true); 
            console.log("Company info seemingly empty, but allowing access for repair.");
          }

          const [
            loadedProducts,
            loadedHistory,
            loadedClosures,
            loadedLogs,
            loadedDocs,
            loadedSuppliers,
            loadedCustomers,
            loadedTeam,
            loadedExpenses,
            loadedShifts
          ] = await Promise.all([
            ProductService.getAll(),
            SalesService.getHistory(),
            ClosureService.getAll(),
            LogService.getAll(),
            BillingService.getAll(),
            SupplierService.getAll(),
            CustomerService.getAll(),
            AuthService.getTeam(),
            ExpenseService.getAll(),
            TimeTrackingService.getShifts()
          ]);

          setProducts(loadedProducts);
          setSalesHistory(loadedHistory);
          setDailyClosures(loadedClosures);
          setLogs(loadedLogs);
          setBillingDocuments(loadedDocs);
          setSuppliers(loadedSuppliers);
          setCustomers(loadedCustomers);
          setTeam(loadedTeam);
          setExpenses(loadedExpenses);
          // Set shifts if needed, but PerformanceReport already fetches them.
          // However, for immediate activeShift detection:
          const currentUserShift = loadedShifts.find(s => s.user_id === AuthService.getCurrentUser()?.id && !s.end_time);
          if (currentUserShift) setActiveShift(currentUserShift);
        } catch (e) {
          console.error("Failed to load initial data", e);
        }
      }

      setInitializing(false);
    };

    initApp();
  }, [isAuthenticated]);

  // Handle Dark Mode
  useEffect(() => {
    if (companyInfo.isDarkMode) {
      document.documentElement.classList.add('dark');
      document.body.style.backgroundColor = '#111827';
      document.body.style.color = '#f3f4f6';
    } else {
      document.documentElement.classList.remove('dark');
      document.body.style.backgroundColor = '';
      document.body.style.color = '';
    }
  }, [companyInfo.isDarkMode]);

  const currentUser = AuthService.getCurrentUser() || team[0];

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '');
      console.log("Current Hash:", hash, "User:", currentUser?.email);

      if (hash.includes('superadmin') || hash.includes('super_admin')) {
        if (!isAuthenticated) {
          setAuthView('SUPER_ADMIN_LOGIN' as any);
        } else if (currentUser?.email === 'admin@nobreza.site') {
          setActiveView('SUPER_ADMIN');
        } else {
          alert("Acesso Negado: Esta área é restrita a Administradores de Sistema.");
          window.location.hash = '';
          setActiveView('dashboard');
        }
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [currentUser, isAuthenticated]);

  const addLog = (action: string, details: string) => {
    const newLog: SystemLog = {
      id: `LOG-${Date.now()}`,
      companyId: currentUser?.companyId || '',
      timestamp: new Date(),
      userId: currentUser?.id || 'sys',
      userName: currentUser?.name || 'System',
      action,
      details
    };
    LogService.add(newLog);
    setLogs(prev => [newLog, ...prev]);
  };

  const handleSale = async (newSale: Sale) => {
    try {
      console.log('🔵 Iniciando processamento de venda:', newSale);
      console.log('🔵 Usuário atual:', AuthService.getCurrentUser());

      await SalesService.addSale(newSale);
      console.log('✅ Venda adicionada ao Supabase');

      setSalesHistory(prev => [newSale, ...prev]);
      addLog('VENDA', `Venda #${newSale.id} realizada. Total: MT ${newSale.total}`);

      if (newSale.customerName) {
        await CustomerService.updateTotalSpent(newSale.customerName, newSale.total);
        setCustomers(await CustomerService.getAll());
      }
      const itemsToUpdate = newSale.items.map(item => ({
        productId: item.productId,
        quantityToRemove: item.quantity
      }));
      await ProductService.updateStock(itemsToUpdate);
      setProducts(await ProductService.getAll());

      console.log('✅ Venda processada com sucesso');
    } catch (error: any) {
      console.error("❌ Erro detalhado ao processar venda:", error);
      console.error("❌ Mensagem:", error?.message);
      console.error("❌ Stack:", error?.stack);
      alert(`Erro ao processar venda: ${error?.message || 'Verifique a conexão.'}`);
    }
  };

  const handleAddClosure = (closure: DailyClosure) => {
    ClosureService.add(closure);
    setDailyClosures(prev => [closure, ...prev]);
    addLog('FECHO_DIA', `Fecho de dia em ${new Date(closure.closureDate).toLocaleDateString()} confirmado.`);
  };

  const handleAddDocument = (doc: BillingDocument) => {
    BillingService.add(doc);
    setBillingDocuments(prev => [doc, ...prev]);
    addLog('DOCUMENTO', `Novo documento #${doc.id} (${doc.type}) gerado.`);
  };

  const handleAddCustomer = (customer: Customer) => {
    CustomerService.add(customer);
    setCustomers(prev => [...prev, customer]);
    addLog('CLIENTE', `Cliente ${customer.name} adicionado.`);
  };

  const handleDeleteDocument = (id: string) => {
    BillingService.delete(id);
    setBillingDocuments(prev => prev.filter(d => d.id !== id));
    addLog('DOCUMENTO', `Documento #${id} removido.`);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError(null);
    const form = e.target as HTMLFormElement;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;

    try {
      await AuthService.login(email, password);
      setIsAuthenticated(true);
      addLog('LOGIN', 'Utilizador acedeu ao sistema.');
    } catch (error: any) {
      console.error(error);
      setAuthError(error.message || "Erro ao iniciar sessão.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError(null);
    const form = e.target as HTMLFormElement;
    const name = (form.elements.namedItem('name') as HTMLInputElement).value;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;
    const confirmPassword = (form.elements.namedItem('confirmPassword') as HTMLInputElement).value;

    if (password !== confirmPassword) {
      setAuthError("As senhas não coincidem.");
      setLoading(false);
      return;
    }

    try {
      const newUser: Partial<User> = { name, email, role: UserRole.ADMIN, responsibility: 'Administrador' };
      await AuthService.register(newUser, password);
      setIsAuthenticated(true);
      setOnboardingNeeded(true);
      addLog('REGISTER', 'Novo administrador registado.');
    } catch (error: any) {
      console.error(error);
      setAuthError(error.message || "Erro ao criar conta.");
    } finally {
      setLoading(false);
    }
  };

  const handleActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError(null);
    const form = e.target as HTMLFormElement;
    const name = (form.elements.namedItem('name') as HTMLInputElement).value;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;
    const confirmPassword = (form.elements.namedItem('confirmPassword') as HTMLInputElement).value;

    if (password !== confirmPassword) {
      setAuthError("As senhas não coincidem.");
      setLoading(false);
      return;
    }

    try {
      await AuthService.activateAccount(email, password, name);
      alert("Conta ativada com sucesso! Faça login para continuar.");
      setAuthView('LOGIN');
    } catch (error: any) {
      console.error(error);
      setAuthError(error.message || "Erro ao ativar conta.");
    } finally {
      setLoading(false);
    }
  };

  const handleOnboardingComplete = async (info: CompanyInfo) => {
    setLoading(true);
    try {
      await CompanyService.update(info);
      setCompanyInfo(info);
      setOnboardingNeeded(false);
      addLog('SYSTEM', 'Configuração inicial da empresa concluída.');
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar informações.");
    } finally {
      setLoading(false);
    }
  };

  const navigateWithAction = (view: string, action: string) => {
    setActiveView(view);
    setPendingAction(action);
  };

  if (showIntro || initializing) {
    return <InitialLoader onComplete={() => setShowIntro(false)} />;
  }

  if (isAuthenticated && onboardingNeeded && currentUser?.email !== 'admin@nobreza.site') {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  const isSuperAdminMode = activeView === 'SUPER_ADMIN' || authView === 'SUPER_ADMIN_LOGIN' as any;

  if (!companyInfo && !isSuperAdminMode) {
    if (!isAuthenticated) {
      // Allow falling through to Auth Screens
    } else {
      return <div className="h-screen flex items-center justify-center text-emerald-600 font-bold"><div className="animate-spin mr-2">⏳</div> Carregando Empresa...</div>;
    }
  }

  if (isAuthenticated && activeView === 'SUPER_ADMIN') {
    return (
      <SuperAdmin
        currentUser={currentUser}
        onLogout={() => {
          AuthService.logout().then(() => {
            setIsAuthenticated(false);
            window.location.hash = '';
            setAuthView('LOGIN');
          });
          addLog('LOGOUT', 'Boss Admin encerrou sessão.');
        }}
      />
    );
  }

  if (!isAuthenticated) {
    if (authView === 'TERMS') return <Terms onBack={() => setAuthView('LOGIN')} />;
    if (authView === 'PRIVACY') return <Privacy onBack={() => setAuthView('LOGIN')} />;

    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,_#064e3b_0%,_#020617_60%)] opacity-80" />
        <div className="absolute w-[800px] h-[800px] bg-emerald-500/10 rounded-full blur-[120px] -top-40 -left-20 animate-pulse duration-10000" />
        <div className="absolute w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[100px] bottom-0 right-0" />

        <div className="w-full max-w-5xl bg-white rounded-[2.5rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col md:flex-row relative z-10 animate-in zoom-in-95 duration-500 min-h-[600px]">

          {/* Left Panel - Branding */}
          <div className="w-full md:w-[450px] bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-white p-12 flex flex-col justify-between relative overflow-hidden shrink-0">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

            <div className="relative z-10">
              <div className="mb-8">
                <img src="/logo-login.png" alt="Nobreza ERP" className="h-32 w-auto object-contain" />
              </div>
              <p className="text-emerald-200/60 font-medium text-sm leading-relaxed max-w-xs">
                Gestão Inteligente para Farmácias.
              </p>
            </div>

            <div className="relative z-10 space-y-6">
              <div className="bg-emerald-900/50 backdrop-blur-sm p-4 rounded-xl border border-emerald-500/10">
                <p className="text-emerald-100/90 text-sm font-medium italic leading-relaxed">"Gerir com eficiência não é apenas cortar custos, é investir na inteligência do crescimento."</p>
                <p className="text-emerald-400 text-[10px] font-black mt-3 uppercase tracking-widest">- Peter Drucker</p>
              </div>
            </div>

          </div>

          {/* Right Panel - Auth Forms */}
          <div className="flex-1 bg-white p-10 md:p-14 flex flex-col justify-center relative">
            <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500" />

            {authError && (
              <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-xl flex items-start gap-3 animate-in slide-in-from-top-2">
                <AlertCircle className="text-red-500 shrink-0" size={20} />
                <p className="text-red-700 text-sm font-medium">{authError}</p>
              </div>
            )}

            {authView === 'LOGIN' && (
              <form onSubmit={handleLogin} className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Bem-vindo de volta!</h2>
                  <p className="text-slate-400 font-medium">Aceda ao painel de controlo.</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2 group">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1 group-focus-within:text-emerald-600 transition-colors">Email Profissional</label>
                    <div className="relative">
                      <LogIn className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" size={20} />
                      <input name="email" type="email" className="w-full pl-14 pr-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-emerald-500 focus:bg-white outline-none font-bold text-slate-700 shadow-sm transition-all placeholder-slate-300" required />
                    </div>
                  </div>

                  <div className="space-y-2 group">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block group-focus-within:text-emerald-600 transition-colors">Senha</label>
                      <button type="button" onClick={() => setAuthView('FORGOT_PASSWORD')} className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 uppercase tracking-wider transition-colors">Esqueceu?</button>
                    </div>
                    <div className="relative">
                      <Key className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" size={20} />
                      <input name="password" type="password" className="w-full pl-14 pr-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-emerald-500 focus:bg-white outline-none font-bold text-slate-700 shadow-sm transition-all placeholder-slate-300" required />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-950 hover:bg-emerald-900 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl shadow-emerald-900/20 transition-all active:scale-[0.98] uppercase tracking-widest text-xs disabled:opacity-70 disabled:cursor-not-allowed mt-4 group"
                >
                  {loading ? "Verificando..." : <>Aceder ao Sistema <ShieldCheck size={18} className="group-hover:text-emerald-400 transition-colors" /></>}
                </button>

                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-4 text-slate-300 font-bold tracking-widest">Ou</span></div>
                </div>

                <button
                  type="button"
                  onClick={() => setAuthView('ACTIVATE')}
                  className="w-full bg-emerald-50 text-emerald-700 py-3 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-emerald-100 transition-colors uppercase tracking-widest text-[10px] mb-4"
                >
                  <Sparkles size={14} /> Primeiro Acesso?
                </button>

                <button
                  type="button"
                  onClick={() => setAuthView('REGISTER')}
                  className="w-full bg-white border-2 border-emerald-100 hover:border-emerald-500 text-emerald-700 py-4 rounded-2xl font-black flex items-center justify-center gap-3 transition-all active:scale-[0.98] uppercase tracking-widest text-xs hover:bg-emerald-50"
                >
                  <UserPlus size={18} /> Criar Nova Conta
                </button>
              </form>
            )}

            {authView === 'ACTIVATE' && (
              <form onSubmit={handleActivation} className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Primeiro Acesso</h2>
                  <p className="text-slate-400 font-medium">Defina a sua senha para ativar o acesso.</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2 group">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Email Cadastrado</label>
                    <input name="email" type="email" className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-emerald-500 focus:bg-white outline-none font-bold text-slate-700 shadow-sm transition-all" required placeholder="Seu email profissional" />
                  </div>
                  <div className="space-y-2 group">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Seu Nome</label>
                    <input name="name" type="text" className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-emerald-500 focus:bg-white outline-none font-bold text-slate-700 shadow-sm transition-all" required placeholder="Confirme seu nome" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 group">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Nova Senha</label>
                      <input name="password" type="password" className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-emerald-500 focus:bg-white outline-none font-bold text-slate-700 shadow-sm transition-all" required minLength={6} />
                    </div>
                    <div className="space-y-2 group">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Confirmar</label>
                      <input name="confirmPassword" type="password" className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-emerald-500 focus:bg-white outline-none font-bold text-slate-700 shadow-sm transition-all" required />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-950 hover:bg-emerald-900 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl transition-all uppercase tracking-widest text-xs"
                >
                  {loading ? "Ativando..." : "Ativar Conta"}
                </button>

                <button
                  type="button"
                  onClick={() => setAuthView('LOGIN')}
                  className="w-full text-center text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-emerald-600 transition-colors"
                >
                  Voltar ao Login
                </button>
              </form>
            )}

            {authView === 'REGISTER' && (
              <form onSubmit={handleRegister} className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Primeiro Acesso?</h2>
                  <p className="text-slate-400 font-medium">Crie a sua conta de Administrador.</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2 group">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1 group-focus-within:text-emerald-600 transition-colors">Nome Completo</label>
                    <div className="relative">
                      <input name="name" type="text" className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-emerald-500 focus:bg-white outline-none font-bold text-slate-700 shadow-sm transition-all placeholder-slate-300" placeholder="Ex: Arnaldo Eurico" required />
                    </div>
                  </div>
                  <div className="space-y-2 group">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1 group-focus-within:text-emerald-600 transition-colors">Email Corporativo</label>
                    <div className="relative">
                      <input name="email" type="email" className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-emerald-500 focus:bg-white outline-none font-bold text-slate-700 shadow-sm transition-all placeholder-slate-300" placeholder="admin@empresa.com" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 group">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1 group-focus-within:text-emerald-600 transition-colors">Senha</label>
                      <input name="password" type="password" className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-emerald-500 focus:bg-white outline-none font-bold text-slate-700 shadow-sm transition-all" required />
                    </div>
                    <div className="space-y-2 group">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1 group-focus-within:text-emerald-600 transition-colors">Confirmar</label>
                      <input name="confirmPassword" type="password" className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-emerald-500 focus:bg-white outline-none font-bold text-slate-700 shadow-sm transition-all" required />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-950 hover:bg-emerald-900 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl shadow-emerald-900/20 transition-all active:scale-[0.98] uppercase tracking-widest text-xs disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                >
                  {loading ? "Criando Conta..." : <><UserPlus size={18} /> Registar Admin</>}
                </button>

                <button
                  type="button"
                  onClick={() => setAuthView('LOGIN')}
                  className="w-full text-slate-400 hover:text-emerald-600 py-2 font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-colors"
                >
                  <ArrowLeft size={14} /> Voltar ao Login
                </button>
              </form>
            )}

            {authView === 'SUPER_ADMIN_LOGIN' as any && (
              <form onSubmit={handleLogin} className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300 border-l-4 border-amber-500 pl-6">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2 uppercase">Super Acesso</h2>
                  <p className="text-amber-600 font-bold tracking-widest text-xs uppercase">Área Restrita: Administração de Sistema</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2 group">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1 group-focus-within:text-amber-600 transition-colors">Credencial Mestra</label>
                    <div className="relative">
                      <ShieldCheck className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-amber-500 transition-colors" size={20} />
                      <input name="email" type="email" defaultValue="admin@nobreza.site" className="w-full pl-14 pr-6 py-4 rounded-2xl bg-amber-50/50 border-2 border-slate-100 focus:border-amber-500 focus:bg-white outline-none font-bold text-slate-700 shadow-sm transition-all placeholder-slate-300" required />
                    </div>
                  </div>

                  <div className="space-y-2 group">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1 group-focus-within:text-amber-600 transition-colors">Chave de Segurança</label>
                    <div className="relative">
                      <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-amber-500 transition-colors" size={20} />
                      <input name="password" type="password" className="w-full pl-14 pr-6 py-4 rounded-2xl bg-amber-50/50 border-2 border-slate-100 focus:border-amber-500 focus:bg-white outline-none font-bold text-slate-700 shadow-sm transition-all placeholder-slate-300" required />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-amber-500 py-4 rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl shadow-slate-900/20 transition-all active:scale-[0.98] uppercase tracking-widest text-xs disabled:opacity-70 disabled:cursor-not-allowed mt-4 group border border-slate-700"
                >
                  {loading ? "Autenticando..." : <>Aceder ao Núcleo <Lock size={18} className="text-amber-500" /></>}
                </button>

                <div className="text-center">
                  <button type="button" onClick={() => { window.location.hash = ''; setAuthView('LOGIN'); }} className="text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest">
                    Voltar ao Acesso Farmácia
                  </button>
                </div>
              </form>
            )}

            {authView === 'FORGOT_PASSWORD' && (
              <div className="space-y-8 text-center animate-in slide-in-from-right-4 fade-in duration-300 py-8">
                <div className="w-20 h-20 bg-emerald-100 rounded-[2rem] flex items-center justify-center mx-auto text-emerald-600 shadow-inner">
                  <Lock size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 mb-2">Recuperar Acesso</h3>
                  <p className="text-slate-400 font-medium text-sm leading-relaxed max-w-xs mx-auto">Para garantir a segurança dos dados, a recuperação automática está desactivada.</p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-left flex gap-4 items-center shadow-sm">
                    <div className="bg-white p-3 rounded-xl shadow-sm text-emerald-500"><Mail size={24} /></div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Email de Suporte</p>
                      <p className="text-emerald-950 font-bold text-lg">support@nobreza.site</p>
                    </div>
                  </div>

                  <a href="https://wa.me/918725861829" target="_blank" rel="noopener noreferrer" className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 text-left flex gap-4 items-center shadow-sm hover:bg-emerald-100/50 hover:border-emerald-300 transition-all group cursor-pointer decoration-0">
                    <div className="bg-emerald-500 p-3 rounded-xl shadow-lg text-white group-hover:scale-110 transition-transform"><MessageCircle size={24} /></div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">WhatsApp Directo</p>
                      <p className="text-emerald-950 font-bold text-lg group-hover:text-emerald-700 transition-colors">Falar com um Agente</p>
                    </div>
                  </a>
                </div>

                <button
                  type="button"
                  onClick={() => setAuthView('LOGIN')}
                  className="w-full bg-emerald-950 hover:bg-emerald-900 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl shadow-emerald-900/20 transition-all active:scale-[0.98] uppercase tracking-widest text-xs"
                >
                  Voltar ao Login
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 text-center relative z-10 opacity-70 hover:opacity-100 transition-opacity space-y-2">
          <p className="text-emerald-200/50 text-[10px] font-bold tracking-widest uppercase">
            Desenvolvido e licenciado por <a href="https://zyph.co.in" target="_blank" rel="noopener noreferrer" className="text-emerald-200 hover:text-white transition-colors underline-offset-4 decoration-emerald-500/50">Zyph Tech, Lda</a>
          </p>
          <div className="flex justify-center gap-4 text-[9px] font-bold text-emerald-200/40 uppercase tracking-widest">
            <button onClick={() => setAuthView('TERMS')} className="hover:text-emerald-200 transition-colors">Termos de Serviço</button>
            <span>•</span>
            <button onClick={() => setAuthView('PRIVACY')} className="hover:text-emerald-200 transition-colors">Política de Privacidade</button>
          </div>
        </div>

        {/* Texture Overlay */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none mix-blend-overlay"></div>
      </div >
    );
  }

  const { isOffline } = useSystem();

  return (
    <>
      {isOffline && (
        <div className="bg-red-500 text-white text-xs font-bold text-center py-1 uppercase tracking-widest flex items-center justify-center gap-2 fixed top-0 left-0 w-full z-[99999]">
          <WifiOff size={12} /> Sistema Offline - Modo de Leitura
        </div>
      )}
      <Layout
        activeView={activeView}
        setActiveView={setActiveView}
        user={currentUser}
        onLogout={() => {
          AuthService.logout().then(() => setIsAuthenticated(false));
          addLog('LOGOUT', 'Utilizador encerrou sessão.');
        }}
        onGoToProfile={() => navigateWithAction('administration', 'manage_profile')}
        companyInfo={companyInfo}
        activeShift={activeShift}
        onCheckIn={async () => {
          try {
            const shift = await TimeTrackingService.checkIn(currentUser.id);
            setActiveShift(shift);
            addLog('SHIFT', 'Iniciou turno de trabalho.');
          } catch (e) { alert("Erro ao iniciar turno."); }
        }}
        onCheckOut={async () => {
          if (!activeShift) return;
          try {
            await TimeTrackingService.checkOut(activeShift.id);
            setActiveShift(null);
            addLog('SHIFT', 'Terminou turno de trabalho.');
          } catch (e) { alert("Erro ao finalizar turno."); }
        }}
      >
        {activeView === 'dashboard' && <Dashboard products={products} sales={salesHistory} onQuickAction={navigateWithAction} user={currentUser} expenses={expenses} companyInfo={companyInfo} />}
        {activeView === 'pos' && <POS products={products} customers={customers} companyInfo={companyInfo} onSaleComplete={handleSale} onQuickAddCustomer={handleAddCustomer} salesHistory={salesHistory} currentUser={currentUser} />}
        {activeView === 'stock' && <Stock products={products} setProducts={setProducts} suppliers={suppliers} initialModalOpen={pendingAction === 'new_product'} onModalHandled={() => setPendingAction(null)} />}
        {activeView === 'daily-close' && <DailyClose sales={salesHistory} dailyClosures={dailyClosures} onConfirmClosure={handleAddClosure} user={currentUser} />}
        {activeView === 'billing' && <Billing products={products} companyInfo={companyInfo} documents={billingDocuments} onAddDocument={handleAddDocument} onDeleteDocument={handleDeleteDocument} initialCreateMode={pendingAction === 'new_invoice' || pendingAction === 'new_purchase'} initialType={pendingAction === 'new_purchase' ? 'PURCHASE_ORDER' : 'INVOICE'} onModeHandled={() => setPendingAction(null)} suppliers={suppliers} customers={customers} currentUser={currentUser} />}
        {activeView === 'suppliers' && <Suppliers suppliers={suppliers} setSuppliers={setSuppliers} products={products} onGenerateOrder={(doc) => { handleAddDocument(doc); setActiveView('billing'); }} initialModalOpen={pendingAction === 'new_supplier'} onModalHandled={() => setPendingAction(null)} currentUser={currentUser} />}
        {activeView === 'customers' && <Customers customers={customers} setCustomers={setCustomers} sales={salesHistory} initialModalOpen={pendingAction === 'new_customer'} onModalHandled={() => setPendingAction(null)} currentUser={currentUser} />}
        {activeView === 'expenses' && <Expenses />}
        {activeView === 'documents' && <Documents currentUser={currentUser} />}
        {activeView === 'tasks' && <Tasks currentUser={currentUser} team={team} />}
        {activeView === 'social' && <SocialChat currentUser={currentUser} team={team} />}
        {activeView === 'calendar' && <Calendar currentUser={currentUser} team={team} />}
        {activeView === 'support' && <Support currentUser={currentUser} sales={salesHistory} products={products} customers={customers} dailyClosures={dailyClosures} />}
        {activeView === 'SUPER_ADMIN' && <SuperAdmin />}
        {activeView === 'administration' &&
          <Settings
            companyInfo={companyInfo || { name: 'Nome da Empresa', address: '', contact: '', nuit: '', email: '' }}
            setCompanyInfo={setCompanyInfo}
            team={team}
            onUpdateTeam={setTeam}
            currentUser={currentUser}
            dailyClosures={dailyClosures}
            logs={logs}
            sales={salesHistory}
            products={products}
            expenses={expenses}
            initialTab={pendingAction === 'OPEN_PROFILE' ? 'PROFILE' : undefined}
            onTabHandled={() => setPendingAction(null)}
            onAddSale={handleSale}
          />}
      </Layout>
    </>
  );
};

export default App;
