import { CalendarEvent } from '../types';
import { api } from './api';

function toEvent(raw: any): CalendarEvent {
    return {
        ...raw,
        startTime: new Date(raw.startTime),
        endTime: new Date(raw.endTime),
    } as CalendarEvent;
}

export const CalendarService = {
    /**
     * Eventos da empresa.
     *
     * O intervalo é opcional; sem ele o servidor devolve tudo até ao limite
     * de segurança. Eventos marcados como pessoais só são visíveis a quem os
     * criou — a verificação é feita no servidor, não pela interface.
     */
    getEvents: async (from?: Date, to?: Date): Promise<CalendarEvent[]> => {
        const params = new URLSearchParams();
        if (from) params.set('from', from.toISOString());
        if (to) params.set('to', to.toISOString());
        const suffix = params.toString() ? `?${params}` : '';

        const events = await api.get<any[]>(`/events${suffix}`);
        return events.map(toEvent);
    },

    createEvent: async (event: Partial<CalendarEvent>, attendeeIds: string[] = []): Promise<CalendarEvent> => {
        return toEvent(await api.post<any>('/events', { ...event, attendeeIds }));
    },

    updateEvent: async (id: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent> => {
        return toEvent(await api.put<any>(`/events/${id}`, updates));
    },

    deleteEvent: async (id: string): Promise<void> => {
        await api.delete(`/events/${id}`);
    },

    /** Resposta a um convite. Cada pessoa responde apenas pela sua presença. */
    setAttendance: async (eventId: string, status: 'PENDING' | 'ACCEPTED' | 'DECLINED'): Promise<void> => {
        await api.patch(`/events/${eventId}/attendance`, { status });
    },
};
