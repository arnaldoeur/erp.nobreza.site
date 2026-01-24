import React, { useState, useEffect } from 'react';
import { Download, Globe, Moon, Sun, Shield, Save, RefreshCw, LayoutTemplate, Palette, Eye, Clock } from 'lucide-react';
import { CompanyInfo, User } from '../types';
import { t, Language } from '../utils/i18n';

interface SystemSettingsProps {
    companyInfo: CompanyInfo;
    currentUser: User;
    onUpdateCompany: (info: CompanyInfo) => void;
}

export const SystemSettings: React.FC<SystemSettingsProps> = ({ companyInfo, currentUser, onUpdateCompany }) => {
    const [loading, setLoading] = useState(false);
    const [language, setLanguage] = useState<Language>(companyInfo.language || 'pt-MZ');
    const [contrastMode, setContrastMode] = useState(false);
    const [nightMode, setNightMode] = useState(companyInfo.isDarkMode || false);
    const [tempColors, setTempColors] = useState({
        primary: companyInfo.themeColor || '#10b981',
        secondary: companyInfo.themeColorSecondary || '#6366f1'
    });

    const handleBackup = async () => {
        setLoading(true);
        try {
            const tables = ['sales', 'products', 'users', 'expenses', 'suppliers', 'customers'];
            const backupData: Record<string, any> = {};

            const { supabase } = await import('../services/supabase');

            for (const table of tables) {
                const { data } = await supabase.from(table).select('*');
                backupData[table] = data;
            }

            const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `backup_nobreza_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            alert(t('system.backup.success', language));
        } catch (e: any) {
            console.error(e);
            alert(t('system.backup.error', language) + " " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleContrast = () => {
        setContrastMode(!contrastMode);
        if (!contrastMode) {
            document.documentElement.style.filter = 'contrast(1.5) saturate(1.2)';
        } else {
            document.documentElement.style.filter = '';
        }
    };

    const toggleNightMode = () => {
        const newState = !nightMode;
        setNightMode(newState);
        if (newState) {
            document.documentElement.classList.add('dark');
            document.body.style.backgroundColor = '#111827';
            document.body.style.color = '#f3f4f6';
        } else {
            document.documentElement.classList.remove('dark');
            document.body.style.backgroundColor = '';
            document.body.style.color = '';
        }
        onUpdateCompany({ ...companyInfo, isDarkMode: newState });
    };

    const updateTheme = (primary: string, secondary: string) => {
        setTempColors({ primary, secondary });
        import('../utils/theme').then(m => m.applyTheme(primary, secondary));
        // We could also persist this if onUpdateCompany supported partial updates without full reload
    };

    return (
        <div className="space-y-8 animate-in fade-in pb-10">

            {/* Header */}
            <div className="bg-slate-900 p-8 rounded-[2.5rem] relative overflow-hidden text-white shadow-2xl">
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h2 className="text-3xl font-black tracking-tight mb-2">{t('system.settings.title', language)}</h2>
                        <p className="text-slate-400 font-medium">{t('system.settings.subtitle', language)}</p>
                    </div>
                    <div className="p-4 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${loading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`}></div>
                            <span className="text-xs font-bold uppercase tracking-widest">{loading ? t('system.loading', language) : t('system.os', language)}</span>
                        </div>
                    </div>
                </div>
                {/* Background graphic */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* 1. General Preferences */}
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col gap-6 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-purple-50 dark:bg-purple-900/30 text-purple-600 rounded-xl"><LayoutTemplate size={24} /></div>
                        <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">{t('system.preferences', language)}</h3>
                    </div>

                    <div className="space-y-4">
                        {/* Language */}
                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-900/50 rounded-2xl border border-gray-100 dark:border-slate-700">
                            <div className="flex items-center gap-3">
                                <Globe size={20} className="text-gray-400" />
                                <div>
                                    <p className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase">{t('system.language', language)}</p>
                                    <p className="text-[10px] text-gray-400 font-bold">{t('system.language.desc', language)}</p>
                                </div>
                            </div>
                            <select
                                value={language}
                                onChange={(e) => {
                                    const newLang = e.target.value as Language;
                                    setLanguage(newLang);
                                    onUpdateCompany({ ...companyInfo, language: newLang });
                                }}
                                className="bg-white dark:bg-slate-800 border text-xs font-bold border-gray-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg px-3 py-2 outline-none focus:border-purple-500"
                            >
                                <option value="pt-MZ">Português (MZ)</option>
                                <option value="en-US">English (US)</option>
                            </select>
                        </div>

                        {/* Night Mode */}
                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-900/50 rounded-2xl border border-gray-100 dark:border-slate-700">
                            <div className="flex items-center gap-3">
                                {nightMode ? <Moon size={20} className="text-blue-400" /> : <Sun size={20} className="text-amber-500" />}
                                <div>
                                    <p className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase">{t('system.nightmode', language)}</p>
                                    <p className="text-[10px] text-gray-400 font-bold">{t('system.nightmode.desc', language)}</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={nightMode} onChange={toggleNightMode} />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>

                        {/* Contrast Mode */}
                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-900/50 rounded-2xl border border-gray-100 dark:border-slate-700">
                            <div className="flex items-center gap-3">
                                <Eye size={20} className="text-emerald-500" />
                                <div>
                                    <p className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase">{t('system.contrast', language)}</p>
                                    <p className="text-[10px] text-gray-400 font-bold">{t('system.contrast.desc', language)}</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={contrastMode} onChange={toggleContrast} />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                            </label>
                        </div>

                        {/* Timezone */}
                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-900/50 rounded-2xl border border-gray-100 dark:border-slate-700">
                            <div className="flex items-center gap-3">
                                <Clock size={20} className="text-blue-500" />
                                <div>
                                    <p className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase">{t('system.timezone', language)}</p>
                                    <p className="text-[10px] text-gray-400 font-bold">{t('system.timezone.desc', language)}</p>
                                </div>
                            </div>
                            <select
                                value={companyInfo.timezone || 'Africa/Maputo'}
                                onChange={(e) => {
                                    onUpdateCompany({ ...companyInfo, timezone: e.target.value });
                                }}
                                className="bg-white dark:bg-slate-800 border text-[10px] font-bold border-gray-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg px-2 py-2 outline-none focus:border-blue-500 max-w-[150px]"
                            >
                                <option value="Africa/Maputo">Maputo (GMT+2)</option>
                                <option value="Africa/Johannesburg">Johannesburg (GMT+2)</option>
                                <option value="Europe/Lisbon">Lisbon (GMT+0/1)</option>
                                <option value="Atlantic/Cape_Verde">Cape Verde (GMT-1)</option>
                                <option value="Africa/Luanda">Luanda (GMT+1)</option>
                                <option value="Africa/Bissau">Bissau (GMT+0)</option>
                                <option value="America/Sao_Paulo">São Paulo (GMT-3)</option>
                                <option value="UTC">UTC/GMT</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* 2. Color Palette */}
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col gap-6 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-pink-50 dark:bg-pink-900/30 text-pink-600 rounded-xl"><Palette size={24} /></div>
                        <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">{t('system.colors', language)}</h3>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-4 bg-gray-50 dark:bg-slate-900/50 p-4 rounded-xl border border-gray-100 dark:border-slate-700">
                            <input
                                type="color"
                                value={tempColors.primary}
                                onChange={(e) => updateTheme(e.target.value, tempColors.secondary)}
                                className="w-10 h-10 rounded-lg cursor-pointer border-none p-0 bg-transparent"
                            />
                            <div className="flex-1">
                                <p className="text-xs font-bold text-slate-500 dark:text-slate-300 uppercase">{t('system.primary', language)}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 bg-gray-50 dark:bg-slate-900/50 p-4 rounded-xl border border-gray-100 dark:border-slate-700">
                            <input
                                type="color"
                                value={tempColors.secondary}
                                onChange={(e) => updateTheme(tempColors.primary, e.target.value)}
                                className="w-10 h-10 rounded-lg cursor-pointer border-none p-0 bg-transparent"
                            />
                            <div className="flex-1">
                                <p className="text-xs font-bold text-slate-500 dark:text-slate-300 uppercase">{t('system.secondary', language)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Data & Security */}
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col gap-6 lg:col-span-2 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-xl"><Shield size={24} /></div>
                        <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">{t('system.security', language)}</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 rounded-3xl text-center space-y-4">
                            <div className="mx-auto w-16 h-16 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300 dark:text-slate-500 shadow-sm">
                                <Save size={32} />
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase">{t('system.backup', language)}</h4>
                                <p className="text-[10px] text-slate-400 font-bold max-w-[200px] mx-auto mt-1">
                                    {t('system.backup.desc', language)}
                                </p>
                            </div>
                            <button
                                onClick={handleBackup}
                                disabled={loading}
                                className="w-full max-w-md mx-auto py-3 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white rounded-xl font-black uppercase text-xs transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2"
                            >
                                {loading ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
                                {loading ? t('system.backup.process', language) : t('system.backup.button', language)}
                            </button>
                        </div>

                        <div className="p-6 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/50 rounded-3xl text-center space-y-4">
                            <div className="mx-auto w-16 h-16 bg-white dark:bg-emerald-950/50 rounded-full flex items-center justify-center text-emerald-300 dark:text-emerald-700 shadow-sm">
                                <RefreshCw size={32} />
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-emerald-950 dark:text-emerald-400 uppercase">Sincronização</h4>
                                <p className="text-[10px] text-emerald-600/70 dark:text-emerald-500/70 font-bold max-w-[200px] mx-auto mt-1">
                                    Atualize os dados e salve as preferências globais do sistema.
                                </p>
                            </div>
                            <div className="flex gap-2 justify-center">
                                <button
                                    onClick={async () => {
                                        setLoading(true);
                                        try {
                                            const updated = {
                                                ...companyInfo,
                                                themeColor: tempColors.primary,
                                                themeColorSecondary: tempColors.secondary,
                                                language: language,
                                                isDarkMode: nightMode
                                            };
                                            const { CompanyService } = await import('../services');
                                            await CompanyService.update(updated);
                                            onUpdateCompany(updated);
                                            alert(t('common.success', language) + ": Configurações salvas.");
                                        } catch (e: any) {
                                            console.error(e);
                                            // Handle the specific "DADOS SALVOS" warning from CompanyService
                                            if (e.message && e.message.includes("DADOS SALVOS")) {
                                                alert("✅ " + e.message);
                                            } else {
                                                alert(t('common.error', language) + ": " + e.message);
                                            }
                                        } finally {
                                            setLoading(false);
                                        }
                                    }}
                                    disabled={loading}
                                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase text-xs transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    <Save size={16} /> {loading ? t('system.loading', language) : 'Salvar'}
                                </button>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="flex-1 py-3 bg-white dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 rounded-xl font-black uppercase text-xs transition-all hover:bg-emerald-50 dark:hover:bg-emerald-900 active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <RefreshCw size={16} /> Sync
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
