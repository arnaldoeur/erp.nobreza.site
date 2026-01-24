
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
        }
    }
};
