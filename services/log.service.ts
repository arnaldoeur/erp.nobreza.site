import { SystemLog } from '../types';
import { api } from './api';

/**
 * Registo de atividade.
 *
 * O cliente descreve apenas a ação. Quem, quando e de onde é determinado
 * pelo servidor — antes, o registo era construído por inteiro no browser,
 * incluindo o autor, o que o tornava falsificável e inútil como auditoria.
 */

export const LogService = {
    getAll: async (): Promise<SystemLog[]> => {
        const logs = await api.get<any[]>('/logs');
        return logs.map((log) => ({ ...log, timestamp: new Date(log.timestamp) })) as SystemLog[];
    },

    getByUser: async (userId: string): Promise<SystemLog[]> => {
        const logs = await api.get<any[]>(`/logs?userId=${encodeURIComponent(userId)}`);
        return logs.map((log) => ({ ...log, timestamp: new Date(log.timestamp) })) as SystemLog[];
    },

    add: async (log: SystemLog): Promise<void> => {
        try {
            await api.post('/logs', { action: log.action, details: log.details });
        } catch {
            // Um registo que falhe não pode fazer falhar a operação que o
            // originou. O servidor tem o seu próprio registo de erros.
        }
    },

    clearAll: async (): Promise<number> => {
        const { deleted } = await api.delete<{ deleted: number }>('/logs');
        return deleted;
    },
};
