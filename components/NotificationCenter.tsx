import React, { useState, useEffect } from 'react';
import { Bell, Check, Trash2, X, AlertCircle, ShoppingCart, Users, Package } from 'lucide-react';
import { AppNotification, User } from '../types';
import { NotificationService } from '../services/notification.service';

interface NotificationCenterProps {
    user: User;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ user }) => {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const prevUnreadCount = React.useRef(0);

    const unreadCount = notifications.filter(n => !n.read).length;

    const playNotificationSound = () => {
        try {
            // Using a clean, professional notification sound from a reliable CDN
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.volume = 0.5;
            audio.play().catch(e => console.log('Audio play blocked by browser:', e));
        } catch (e) {
            console.error('Error playing notification sound:', e);
        }
    };

    useEffect(() => {
        loadNotifications();
        // Setup polling
        const interval = setInterval(loadNotifications, 30000); // 30s poll
        return () => clearInterval(interval);
    }, [user.id]);

    useEffect(() => {
        if (unreadCount > prevUnreadCount.current) {
            playNotificationSound();
        }
        prevUnreadCount.current = unreadCount;
    }, [unreadCount]);

    const loadNotifications = async () => {
        const data = await NotificationService.getNotifications(user.id);
        setNotifications(data);
    };

    const handleMarkAsRead = async (id: string) => {
        await NotificationService.markAsRead(id);
        setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'SALE': return <ShoppingCart className="text-emerald-500" size={16} />;
            case 'STOCK': return <Package className="text-amber-500" size={16} />;
            case 'USER': return <Users className="text-blue-500" size={16} />;
            default: return <AlertCircle className="text-gray-400" size={16} />;
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-400 hover:text-emerald-600 transition-colors"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center animate-bounce">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-4 w-80 bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-2xl border border-gray-100 dark:border-white/10 z-[100] overflow-hidden animate-in slide-in-from-top-2 duration-200">
                    <div className="p-4 border-b dark:border-white/10 flex justify-between items-center bg-gray-50/50 dark:bg-white/5">
                        <h3 className="text-xs font-black text-emerald-950 dark:text-white uppercase tracking-widest">Notificações</h3>
                        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-red-500"><X size={16} /></button>
                    </div>

                    <div className="max-h-96 overflow-y-auto custom-scrollbar">
                        {loading ? (
                            <div className="p-8 text-center"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div></div>
                        ) : notifications.length === 0 ? (
                            <div className="p-12 text-center text-gray-400">
                                <Bell size={32} className="mx-auto mb-2 opacity-20" />
                                <p className="text-[10px] font-black uppercase tracking-widest">Vazio por agora</p>
                            </div>
                        ) : (
                            <div className="divide-y dark:divide-white/5">
                                {notifications.map(n => (
                                    <div key={n.id} className={`p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group relative ${!n.read ? 'bg-emerald-50/30 dark:bg-emerald-500/5' : ''}`}>
                                        <div className="flex gap-3">
                                            <div className="mt-1">{getIcon(n.type)}</div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[11px] font-black text-emerald-950 dark:text-white uppercase leading-tight mb-1">{n.title}</p>
                                                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium leading-relaxed">{n.content}</p>
                                                <p className="text-[8px] text-gray-400 mt-2 font-bold uppercase">{new Date(n.createdAt).toLocaleDateString()} • {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                            </div>
                                            {!n.read && (
                                                <button
                                                    onClick={() => handleMarkAsRead(n.id)}
                                                    className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-950 text-emerald-600 rounded-md transition-all self-start"
                                                    title="Marcar como lida"
                                                >
                                                    <Check size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="p-3 border-t dark:border-white/10 text-center">
                        <button onClick={loadNotifications} className="text-[9px] font-black text-emerald-600 uppercase tracking-widest hover:underline">Atualizar</button>
                    </div>
                </div>
            )}
        </div>
    );
};
