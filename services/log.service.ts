
import { SystemLog } from '../types';
import { supabase } from './supabase';
import { AuthService } from './auth.service';

export const LogService = {
    getAll: async (): Promise<SystemLog[]> => {
        const user = AuthService.getCurrentUser();
        if (!user) return [];

        // 1. Fetch Logs
        const { data: logs, error: logsError } = await supabase
            .from('system_logs')
            .select('*')
            .eq('company_id', user.companyId)
            .order('timestamp', { ascending: false });

        if (logsError) {
            console.error('Error fetching logs:', logsError);
            return [];
        }

        // 2. Fetch Users for Name Mapping
        const userIds = [...new Set(logs.map(l => l.user_id))];
        let userMap: Record<string, string> = { 'sys': 'Sistema' };

        if (userIds.length > 0) {
            const { data: users } = await supabase
                .from('users')
                .select('id, name')
                .in('id', userIds);

            if (users) {
                users.forEach(u => { userMap[u.id] = u.name; });
            }
        }

        // 3. Map Data
        return logs.map((l: any) => ({
            id: l.id,
            companyId: l.company_id,
            timestamp: new Date(l.timestamp),
            userId: l.user_id,
            userName: userMap[l.user_id] || 'Utilizador Removido', // Real Name
            action: l.action,
            details: l.details
        }));
    },

    getByUser: async (userId: string): Promise<SystemLog[]> => {
        const user = AuthService.getCurrentUser();
        if (!user) return [];

        const { data: logs, error: logsError } = await supabase
            .from('system_logs')
            .select('*')
            .eq('company_id', user.companyId)
            .eq('user_id', userId)
            .order('timestamp', { ascending: false });

        if (logsError) {
            console.error('Error fetching user logs:', logsError);
            return [];
        }

        return logs.map((l: any) => ({
            id: l.id,
            companyId: l.company_id,
            timestamp: new Date(l.timestamp),
            userId: l.user_id,
            userName: l.user_name || 'Utilizador',
            action: l.action,
            details: l.details
        }));
    },

    clearAll: async (): Promise<void> => {
        const user = AuthService.getCurrentUser();
        if (!user) return;

        await supabase
            .from('system_logs')
            .delete()
            .eq('company_id', user.companyId);
    },

    add: async (log: SystemLog): Promise<void> => {
        const user = AuthService.getCurrentUser();
        const companyId = user?.companyId || log.companyId;

        const authUser = (await supabase.auth.getUser()).data.user;
        const currentId = authUser?.id || log.userId;

        const dbLog: any = {
            company_id: companyId,
            user_id: currentId,
            user_name: user?.name || log.userName,
            action: log.action,
            details: log.details,
            timestamp: log.timestamp || new Date()
        };

        const { error } = await supabase.from('system_logs').insert(dbLog);

        if (error) {
            console.error('Error adding log:', error);
        } else {
            // Auto-Alert for Critical Actions
            if (log.action.includes('DELETE') || log.action.includes('CRITICAL_ERROR') || log.action.includes('SECURITY')) {
                // We need to fetch CompanyInfo or construct a minimal one if not available, 
                // but preferably we assume logged in user context or passed info. 
                // For now, simpler implementation:
                if (user && user.email !== 'admin@nobreza.site') { // Avoid spamming super admin actions
                    // We use a safe-import or dependency injection pattern to avoid circular deps if possible
                    // But here we might just direct insert to notifications to keep it light in LogService
                    // OR import NotificationService.
                    // To avoid circular dependency (Notification -> Log -> Notification), we'll do a direct DB insert for the alert.
                    // Actually, LogService imports AuthService which is fine. NotificationService imports supabase.
                    // The safest is direct notifications insert or dynamic import.

                    // Direct Critical Notification
                    const { data: admins } = await supabase
                        .from('users')
                        .select('id')
                        .eq('company_id', companyId)
                        .eq('role', 'ADMIN');

                    if (admins && admins.length > 0) {
                        const alerts = admins.map(a => ({
                            user_id: a.id,
                            type: 'SYSTEM',
                            title: `🚨 Ação Crítica: ${log.action}`,
                            content: `Registo de: ${log.details} por ${dbLog.user_name}`,
                            metadata: { logId: 'new', action: log.action }
                        }));
                        await supabase.from('notifications').insert(alerts);
                    }
                }
            }
        }
    }
};
