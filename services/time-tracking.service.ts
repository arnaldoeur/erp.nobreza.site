import { api } from './api';

export interface WorkShift {
    id: string;
    user_id: string;
    start_time: string;
    end_time?: string;
    status: 'OPEN' | 'CLOSED';
    notes?: string;
    duration_minutes?: number;
}

/**
 * Registo de entradas e saídas ao serviço.
 *
 * O utilizador é sempre o da sessão: o identificador deixou de ser um
 * argumento aceite do cliente, para que ninguém possa marcar ponto por
 * outra pessoa.
 */
export const TimeTrackingService = {
    checkIn: async (): Promise<WorkShift> => {
        return api.post<WorkShift>('/shifts/check-in');
    },

    checkOut: async (shiftId: string, notes?: string): Promise<WorkShift> => {
        return api.post<WorkShift>(`/shifts/${shiftId}/check-out`, { notes });
    },

    getCurrentShift: async (): Promise<WorkShift | null> => {
        return api.get<WorkShift | null>('/shifts/current');
    },

    getShifts: async (userId?: string, startDate?: string, endDate?: string): Promise<WorkShift[]> => {
        const params = new URLSearchParams();
        if (userId) params.set('userId', userId);
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
        const suffix = params.toString() ? `?${params}` : '';
        return api.get<WorkShift[]>(`/shifts${suffix}`);
    },
};
