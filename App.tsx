
import React, { useState, useEffect } from 'react';
import { supabase } from './services/supabase'; // Import REAL supabase client
import { Login } from './components/Login';
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
import { Sale, CompanyInfo, BillingDocument, Supplier, Customer, User, DailyClosure, SystemLog, Product } from './types';
import { WorkShift } from './services/time-tracking.service';
import { Language } from './utils/i18n';
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
  TimeTrackingService
} from './services';
import { InitialLoader } from './components/InitialLoader';
// import { Expenses } from './components/Expenses'; // Ensure this exists or comment out if removed
import { Expenses } from './components/Expenses';

import { Tasks } from './components/Tasks';
import { Documents } from './components/Documents';
import { SocialChat } from './components/SocialChat';
import { Support } from './components/Support';
import { Calendar } from './components/Calendar';
import { EmailCenter } from './components/EmailCenter';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState('dashboard');
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(AuthService.getCurrentUser());
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);

  const [showIntro, setShowIntro] = useState(true);

  // Data State
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

  // 1. Initial Auth Check (Supabase)
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Logic to fetch full profile if needed, or rely on AuthService.getCurrentUser() cache
        // Since login() saves to localStorage, we might be good.
        // But if we reload, we might want to refresh from DB.
        console.log("Session found:", session.user.email);
        // Optional: Re-fetch profile to ensure 'currentUser' is up to date
        // const updatedUser = await AuthService.syncProfile(session.user.id); // If we implemented this
      } else {
        console.log("No session found.");
        // If local storage has user but session is invalid, clear it?
        // For now, trust Supabase Auth.
      }
      setLoading(false);
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        localStorage.removeItem('nobreza_current_user');
        setActiveView('dashboard');
      } else if (event === 'SIGNED_IN' && session) {
        // We assume AuthService.login was called and set the user in LocalStorage/State
        // Or we could fetch it here.
        const user = AuthService.getCurrentUser();
        if (user) setCurrentUser(user);
      }
    });

    const handleUserUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<User>;
      if (customEvent.detail) {
        console.log("User updated event received:", customEvent.detail);
        setCurrentUser(customEvent.detail);
      }
    };
    window.addEventListener('nobreza-user-updated', handleUserUpdate);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('nobreza-user-updated', handleUserUpdate);
    };
  }, []);

  // 2. Data Loading (Only when authenticated)
  useEffect(() => {
    const initApp = async () => {
      if (currentUser) {
        try {
          // Load Company Info First
          const info = await CompanyService.get();
          setCompanyInfo(info);

          if (info.themeColor) {
            import('./utils/theme').then(m => m.applyTheme(info.themeColor, info.themeColorSecondary));
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
            ProductService.getAll().catch(() => []),
            SalesService.getHistory().catch(() => []),
            ClosureService.getAll().catch(() => []),
            LogService.getAll().catch(() => []),
            BillingService.getAll().catch(() => []),
            SupplierService.getAll().catch(() => []),
            CustomerService.getAll().catch(() => []),
            AuthService.getTeam().catch(() => []),
            ExpenseService.getAll().catch(() => []),
            TimeTrackingService.getShifts().catch(() => [])
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

          // Check Active Shift
          const currentUid = currentUser.id;
          if (currentUid) {
            const currentUserShift = loadedShifts.find(s => s.user_id === currentUid && !s.end_time);
            if (currentUserShift) setActiveShift(currentUserShift);
          }

        } catch (e) {
          console.error("Failed to load data", e);
        } finally {
          setInitializing(false);
        }
      } else {
        setInitializing(false); // Stop loading if not auth
      }
    };

    if (!loading) { // Wait for auth check to finish
      initApp();
    }
  }, [currentUser, loading]);

  // Dark Mode
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

  // Handlers
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
      await SalesService.addSale(newSale);
      setSalesHistory(prev => [newSale, ...prev]);
      addLog('VENDA', `Venda #${newSale.id} realizada. Total: MT ${newSale.total}`);
      if (newSale.customerName) {
        await CustomerService.updateTotalSpent(newSale.customerName, newSale.total);
        setCustomers(await CustomerService.getAll());
      }

      // AUTO-GENERATE INVOICE/RECEIPT
      try {
        const billingDoc: BillingDocument = {
          id: `DOC-${newSale.id}`,
          companyId: newSale.companyId,
          type: 'INVOICE', // POS sales are standard Invoices/Receipts
          timestamp: new Date(),
          items: newSale.items,
          total: newSale.total,
          targetName: newSale.customerName || 'Consumidor Final',
          status: 'PAID',
          performedBy: newSale.performedBy
        };
        await BillingService.add(billingDoc);
        setBillingDocuments(prev => [billingDoc, ...prev]);
      } catch (invoiceError) {
        console.error("Auto-invoice failed:", invoiceError);
        // Don't block the sale flow, just log it
      }

      const itemsToUpdate = newSale.items.map(item => ({
        productId: item.productId,
        quantityToRemove: item.quantity
      }));
      await ProductService.updateStock(itemsToUpdate);
      setProducts(await ProductService.getAll());
    } catch (error: any) {
      alert(`Erro ao processar venda: ${error?.message || 'Verifique a conexão.'}`);
    }
  };

  const handleAddClosure = (closure: DailyClosure) => {
    ClosureService.add(closure);
    setDailyClosures(prev => [closure, ...prev]);
    addLog('FECHO_DIA', `Fecho de dia em ${new Date(closure.closureDate).toLocaleDateString()} confirmado.`);
  };

  const handleAddDocument = async (doc: BillingDocument) => {
    try {
      await BillingService.add(doc);
      setBillingDocuments(prev => [doc, ...prev]);
      addLog('DOCUMENTO', `Novo documento #${doc.id} (${doc.type}) gerado.`);

      NotificationService.sendInApp({
        userId: currentUser?.id,
        type: 'DOCUMENT',
        title: 'Novo Documento Gerado',
        content: `O documento ${doc.type} #${doc.id} foi criado para ${doc.targetName}.`
      });

      // Don't await the alert, just fire it
      NotificationService.sendManagementAlert(doc.type === 'PURCHASE_ORDER' ? 'SUPPLIER' : 'CUSTOMER', 'Novo Documento', `Documento #${doc.id} gerado para ${doc.targetName}.`, companyInfo);
    } catch (error: any) {
      console.error("Error creating document:", error);
      alert(`Erro ao criar documento: ${error.message}`);
      throw error; // Re-throw so child components know it failed
    }
  };

  const handleAddCustomer = (customer: Customer) => {
    CustomerService.add(customer);
    setCustomers(prev => [...prev, customer]);
    addLog('CLIENTE', `Cliente ${customer.name} adicionado.`);
    NotificationService.sendInApp({
      userId: currentUser?.id,
      type: 'USER',
      title: 'Novo Cliente Registado',
      content: `O cliente ${customer.name} foi adicionado ao sistema.`
    });
    NotificationService.sendManagementAlert('CUSTOMER', 'Novo Cliente', `O cliente ${customer.name} foi registado.`, companyInfo);
  };

  const handleDeleteDocument = (id: string) => {
    BillingService.delete(id);
    setBillingDocuments(prev => prev.filter(d => d.id !== id));
    addLog('DOCUMENTO', `Documento #${id} removido.`);
  };

  const navigateWithAction = (view: string, action: string) => {
    setActiveView(view);
    setPendingAction(action);
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
  };

  // Render Logic

  if (loading || (currentUser && initializing)) {
    if (showIntro) return <InitialLoader onComplete={() => setShowIntro(false)} />;
    // Or just a simple spinner
    return <div className="flex bg-slate-100 min-h-screen items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
    </div>;
  }

  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <Layout
      activeView={activeView}
      setActiveView={setActiveView}
      user={currentUser}
      onLogout={async () => {
        await AuthService.logout();
        setCurrentUser(null);
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
      {activeView === 'pos' && <POS products={products} customers={customers} companyInfo={companyInfo} onSaleComplete={handleSale} onQuickAddCustomer={handleAddCustomer} salesHistory={salesHistory} currentUser={currentUser} initialAction={pendingAction} onActionHandled={() => setPendingAction(null)} />}
      {activeView === 'stock' && <Stock products={products} setProducts={setProducts} suppliers={suppliers} initialModalOpen={pendingAction === 'new_product'} onModalHandled={() => setPendingAction(null)} lang={companyInfo.language as Language} />}
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
        />
      }
      {activeView === 'email' && <EmailCenter companyId={companyInfo.id.toString()} currentUser={currentUser} />}
    </Layout>
  );
};

export default App;
