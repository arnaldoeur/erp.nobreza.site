import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Truck,
  FileText,
  Settings as SettingsIcon,
  LogOut,
  ScanSearch,
  Lock,
  ShieldCheck,
  ChevronUp,
  User as UserIcon,
  Menu,
  X,
  Bell,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  MessageSquare,
  FolderCheck,
  CheckSquare,
  Zap,
  Calendar as CalendarIcon,
  PlayCircle,
  StopCircle,
  Clock,
  Fingerprint,
  Mail
} from 'lucide-react';
import { User, UserRole, CompanyInfo } from '../types';
import { WorkShift } from '../services/time-tracking.service';
import { t, Language } from '../utils/i18n';
import { NotificationCenter } from './NotificationCenter';

interface SidebarItem {
  icon: React.ElementType;
  label: string;
  id: string;
  roles: UserRole[];
}

const getSidebarItems = (lang: Language): SidebarItem[] => [
  { icon: LayoutDashboard, label: t('nav.dashboard', lang), id: 'dashboard', roles: Object.values(UserRole) },
  { icon: ShoppingCart, label: t('nav.sales', lang) + ' (POS)', id: 'pos', roles: [UserRole.ADMIN, UserRole.COMMERCIAL, UserRole.TECHNICIAN, UserRole.ADMINISTRATIVE] },
  { icon: Package, label: t('nav.stock', lang), id: 'stock', roles: [UserRole.ADMIN, UserRole.COMMERCIAL, UserRole.TECHNICIAN, UserRole.ADMINISTRATIVE] },
  { icon: FileText, label: t('nav.billing', lang), id: 'billing', roles: [UserRole.ADMIN, UserRole.ADMINISTRATIVE] },
  { icon: FolderCheck, label: t('nav.docs', lang), id: 'documents', roles: Object.values(UserRole) },
  { icon: CheckSquare, label: t('nav.tasks', lang), id: 'tasks', roles: Object.values(UserRole) },
  { icon: CalendarIcon, label: t('nav.agenda', lang), id: 'calendar', roles: Object.values(UserRole) },
  { icon: MessageSquare, label: 'Chat Equipe', id: 'social', roles: Object.values(UserRole) },
  { icon: Truck, label: t('nav.suppliers', lang), id: 'suppliers', roles: [UserRole.ADMIN, UserRole.ADMINISTRATIVE, UserRole.COMMERCIAL, UserRole.TECHNICIAN] },
  { icon: Users, label: t('nav.customers', lang), id: 'customers', roles: [UserRole.ADMIN, UserRole.ADMINISTRATIVE, UserRole.COMMERCIAL, UserRole.TECHNICIAN] },
  { icon: Mail, label: 'Correio', id: 'email', roles: Object.values(UserRole) },
  { icon: SettingsIcon, label: t('nav.settings', lang), id: 'administration', roles: Object.values(UserRole) }, // Everyone sees settings (for profile) but tabs are restricted
  { icon: ShieldCheck, label: t('nav.support', lang), id: 'support', roles: Object.values(UserRole) },
  { icon: Lock, label: 'Boss Admin', id: 'SUPER_ADMIN', roles: [UserRole.ADMIN] },
];

interface LayoutProps {
  children: React.ReactNode;
  activeView: string;
  setActiveView: (view: string) => void;
  user: User;
  onLogout: () => void;
  onGoToProfile: () => void;
  companyInfo: CompanyInfo;
  activeShift?: WorkShift | null;
  onCheckIn?: () => void;
  onCheckOut?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeView, setActiveView, user, onLogout, onGoToProfile, companyInfo, activeShift, onCheckIn, onCheckOut }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!companyInfo.closingTime) return;

    const checkTime = () => {
      const now = new Date();
      const [hours, minutes] = companyInfo.closingTime!.split(':').map(Number);
      const closeTime = new Date();
      closeTime.setHours(hours, minutes, 0, 0);

      const diff = closeTime.getTime() - now.getTime();
      const diffMinutes = diff / (1000 * 60);

      if (diffMinutes > 0 && diffMinutes <= 30) {
        setNotification(`⚠️ Atenção: Faltam ${Math.ceil(diffMinutes)} minutos para o fecho (Hora: ${companyInfo.closingTime}). Considere realizar o Fecho do Dia.`);
      } else {
        setNotification(null);
      }
    };

    checkTime();
    const interval = setInterval(checkTime, 60000);
    return () => clearInterval(interval);
  }, [companyInfo.closingTime]);

  const handleNavClick = (id: string) => {
    setActiveView(id);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] bg-[rgb(var(--bg-app))] overflow-hidden transition-colors duration-300">
      <header className="md:hidden h-16 bg-emerald-950 dark:bg-black text-white flex items-center justify-between px-4 z-50 shrink-0 shadow-lg">
        <div className="flex items-center gap-2 overflow-hidden cursor-pointer" onClick={() => handleNavClick('dashboard')}>
          <img
            src="/nobreza_erp_logo_white_horizontal.png"
            alt="Nobreza ERP"
            className="h-8 w-auto object-contain"
          />
        </div>
        <div className="flex items-center gap-3">
          <NotificationCenter user={user} />
          <button
            onClick={() => handleNavClick('daily-close')}
            className="p-2 bg-red-600 rounded-lg text-white"
          >
            <Lock size={18} />
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-emerald-400"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      <aside className={`
        fixed inset-0 z-40 bg-emerald-950 dark:bg-[rgb(var(--bg-app))] text-white flex flex-col shadow-xl transition-all duration-300
        pt-20 md:pt-0
        md:relative md:translate-x-0
        ${collapsed ? 'md:w-20' : 'md:w-60'}
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className={`hidden md:flex relative ${collapsed ? 'p-4 justify-center items-center' : 'p-6'}`}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="absolute -right-3 top-7 bg-white text-emerald-950 p-1.5 rounded-full shadow-lg border border-gray-100 hover:bg-emerald-50 transition-colors z-50">
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>

          {!collapsed ? (
            <div className="flex items-center gap-3 px-2 cursor-pointer w-full" onClick={() => setActiveView('dashboard')}>
              <img
                src="/nobreza_erp_logo_white_horizontal.png"
                alt="Nobreza ERP"
                className="h-10 w-auto object-contain max-w-[80%]"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center cursor-pointer w-full" onClick={() => setActiveView('dashboard')}>
              <img
                src="/NERP ICONE.png"
                alt="N"
                className="w-10 h-10 object-contain"
              />
            </div>
          )}
        </div>

        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto custom-scrollbar min-h-0">
          {getSidebarItems(companyInfo.language || 'pt-MZ').filter(item => {
            if (!user) return false;
            if (item.id === 'SUPER_ADMIN') {
              return user.email === 'admin@nobreza.site';
            }
            return item.roles.includes(user.role);
          }).map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl transition-all duration-200 group ${activeView === item.id
                ? 'bg-emerald-700 text-white font-black shadow-lg shadow-emerald-950/40'
                : 'text-emerald-100/60 hover:text-white hover:bg-emerald-900/50'
                } ${collapsed ? 'justify-center px-0' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={18} className={activeView === item.id ? 'text-white' : 'text-emerald-50 group-hover:text-emerald-400'} />
              {!collapsed && <span className="text-[10px] font-bold uppercase tracking-wider truncate">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="px-3 mb-2">
          {activeShift ? (
            <button
              onClick={onCheckOut}
              className="w-full bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white p-3 rounded-[1.5rem] transition-all flex flex-col items-center gap-1 group border border-red-500/20 shadow-lg shadow-red-500/5 active:scale-95"
            >
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest leading-none">Turno Ativo</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={16} className="group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-bold font-mono">
                  {new Date(activeShift.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-[10px] opacity-70 font-black">SAIR</span>
              </div>
            </button>
          ) : (
            <button
              onClick={onCheckIn}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white p-3 rounded-[1.5rem] transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 group"
            >
              <Clock size={18} className="group-hover:rotate-12 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-widest">Entrar no Turno</span>
            </button>
          )}
        </div>

        <div className="p-4 border-t border-white/5 bg-white/5 relative" ref={dropdownRef}>
          {isDropdownOpen && (
            <div className="absolute bottom-full left-4 right-4 mb-4 bg-[rgb(var(--bg-surface))] dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-[rgb(var(--border-subtle))] dark:border-white/10 animate-in slide-in-from-bottom-2 duration-200 z-50">
              <div className="p-4 border-b dark:border-white/10 bg-gray-50/50 dark:bg-white/5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-700 text-emerald-100 flex items-center justify-center font-black overflow-hidden">
                  {user.photo ? (
                    <img src={user.photo} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    user.name.charAt(0)
                  )}
                </div>
                <div className="overflow-hidden text-left">
                  <p className="text-xs font-black text-[rgb(var(--text-main))] dark:text-white truncate uppercase">{user.name}</p>
                  <p className="text-[9px] font-bold text-gray-400 dark:text-emerald-400/60 uppercase tracking-widest">{user.role}</p>
                </div>
              </div>
              <div className="p-2 space-y-1">
                <button
                  onClick={() => { setIsDropdownOpen(false); onGoToProfile(); setIsMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-400 transition-all font-black text-[10px] uppercase tracking-widest text-left"
                >
                  <UserIcon size={16} />
                  Ver Perfil
                </button>
                <button
                  onClick={onLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-all font-black text-[10px] uppercase tracking-widest text-left"
                >
                  <LogOut size={16} />
                  {t('profile.logout', companyInfo.language || 'pt-MZ')}
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all duration-200 ${isDropdownOpen ? 'bg-emerald-800 shadow-inner' : 'hover:bg-emerald-900/50'} ${collapsed ? 'justify-center p-0 bg-transparent hover:bg-transparent' : ''}`}
          >
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-emerald-500 text-emerald-950 flex items-center justify-center font-black text-xl shadow-inner relative overflow-hidden shrink-0">
              {user.photo ? (
                <img src={user.photo} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                user.name.charAt(0)
              )}
            </div>
            {!collapsed && (
              <>
                <div className="overflow-hidden text-left flex-1">
                  <p className="text-sm font-black truncate text-white uppercase">{user.name}</p>
                  <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest truncate">{user.role}</p>
                </div>
                <ChevronUp size={16} className={`text-emerald-600 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </>
            )}
          </button>
        </div>
      </aside >

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="hidden md:flex h-20 bg-[rgb(var(--bg-surface))] dark:bg-black border-b border-[rgb(var(--border-subtle))] dark:border-white/5 items-center justify-between px-10 shadow-sm z-10 shrink-0">
          <div className="flex flex-col">
            <h2 className="text-xl font-black text-[rgb(var(--text-main))] dark:text-white uppercase tracking-tight">
              {getSidebarItems(companyInfo.language || 'pt-MZ').find(i => i.id === activeView)?.label || 'Bem-vindo'}
            </h2>
            {notification && (
              <div className="absolute top-20 left-0 right-0 bg-amber-400 text-emerald-950 px-4 py-1 text-xs font-black uppercase text-center animate-in slide-in-from-top-2 z-50">
                {notification}
              </div>
            )}
          </div>
          <div className="flex items-center gap-6">
            {notification && (
              <div className="flex items-center gap-2 bg-amber-100 text-amber-700 px-3 py-1.5 rounded-xl animate-pulse">
                <Bell size={16} />
                <span className="text-[10px] font-black uppercase">Fecho Próximo</span>
              </div>
            )}


            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('common.system_status', companyInfo.language || 'pt-MZ')}</span>
              <span className="flex items-center gap-2 text-xs font-bold text-emerald-600">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                {t('common.online', companyInfo.language || 'pt-MZ')}
              </span>
            </div>
            <NotificationCenter user={user} />
            <button
              onClick={() => setActiveView('daily-close')}
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-2xl font-black flex items-center gap-2 shadow-xl shadow-red-900/20 transition-all active:scale-95 group"
            >
              <Lock size={18} className="group-hover:rotate-12 transition-transform" />
              {t('common.daily_close', companyInfo.language || 'pt-MZ')}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-3 md:p-6 custom-scrollbar pb-24 md:pb-6 relative">
          {children}
        </div>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[rgb(var(--bg-surface))] dark:bg-black border-t border-[rgb(var(--border-subtle))] dark:border-white/10 flex items-center justify-around px-2 z-30 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
          <BottomNavButton active={activeView === 'dashboard'} icon={LayoutDashboard} onClick={() => setActiveView('dashboard')} label="Home" />
          <BottomNavButton active={activeView === 'pos'} icon={ShoppingCart} onClick={() => setActiveView('pos')} label="Vendas" />
          <BottomNavButton active={activeView === 'stock'} icon={Package} onClick={() => setActiveView('stock')} label="Stock" />
          <BottomNavButton active={activeView === 'administration'} icon={ShieldCheck} onClick={() => setActiveView('administration')} label="Admin" />
        </nav>
      </main>
    </div >
  );
};

const BottomNavButton = ({ active, icon: Icon, onClick, label }: any) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all ${active ? 'text-emerald-700' : 'text-gray-400'}`}
  >
    <div className={`p-1.5 rounded-xl transition-all ${active ? 'bg-emerald-50 scale-110' : ''}`}>
      <Icon size={active ? 22 : 20} />
    </div>
    <span className="text-[10px] font-black uppercase tracking-tighter">{label}</span>
  </button>
);
