import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, Language } from '../utils/i18n';
import { applyTheme } from '../utils/theme';

interface SystemContextProps {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
    isNightMode: boolean;
    toggleNightMode: () => void;
    isOffline: boolean;
    primaryColor: string;
    secondaryColor: string;
    updateTheme: (primary: string, secondary: string) => void;
}

const SystemContext = createContext<SystemContextProps>({
    language: 'pt-MZ',
    setLanguage: () => { },
    t: (k) => k,
    isNightMode: false,
    toggleNightMode: () => { },
    isOffline: false,
    primaryColor: '#10b981',
    secondaryColor: '#6366f1',
    updateTheme: () => { }
});

export const useSystem = () => useContext(SystemContext);

export const SystemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // 1. Language
    const [language, setLangState] = useState<Language>(() => {
        return (localStorage.getItem('sys_lang') as Language) || 'pt-MZ';
    });

    const setLanguage = (lang: Language) => {
        setLangState(lang);
        localStorage.setItem('sys_lang', lang);
    };

    const t = (key: string) => {
        return translations[language][key as keyof typeof translations['pt-MZ']] || key;
    };

    // 2. Night Mode
    const [isNightMode, setIsNightMode] = useState(() => {
        return localStorage.getItem('sys_night_mode') === 'true';
    });

    const toggleNightMode = () => {
        const newVal = !isNightMode;
        setIsNightMode(newVal);
        localStorage.setItem('sys_night_mode', String(newVal));
        if (newVal) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    // Apply night mode on mount
    useEffect(() => {
        if (isNightMode) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
    }, []);

    // 3. Offline Status
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // 4. Theme Colors
    const [primaryColor, setPrimaryColor] = useState(() => localStorage.getItem('sys_primary') || '#10b981');
    const [secondaryColor, setSecondaryColor] = useState(() => localStorage.getItem('sys_secondary') || '#6366f1');

    const updateTheme = (primary: string, secondary: string) => {
        setPrimaryColor(primary);
        setSecondaryColor(secondary);
        localStorage.setItem('sys_primary', primary);
        localStorage.setItem('sys_secondary', secondary);
        applyTheme(primary, secondary);
    };

    // Apply theme on mount
    useEffect(() => {
        applyTheme(primaryColor, secondaryColor);
    }, []);

    return (
        <SystemContext.Provider value={{
            language,
            setLanguage,
            t,
            isNightMode,
            toggleNightMode,
            isOffline,
            primaryColor,
            secondaryColor,
            updateTheme
        }}>
            {children}
        </SystemContext.Provider>
    );
};
