import { supabase } from './supabase';
import { CalendarEvent } from '../types';
import { AuthService } from './auth.service';

export const CalendarService = {
    getEvents: async (): Promise<CalendarEvent[]> => {
        const user = AuthService.getCurrentUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('erp_events')
            .select(`
        *,
        attendees:erp_event_attendees(
            user_id, status, 
            user:user_id(name, email) -- Linked via public table relation usually
        )
      `)
            .eq('company_id', user.companyId)
            .order('start_time', { ascending: true });

        if (error) {
            console.error("Error fetching events", error);
            return [];
        }

        return data.map((e: any) => ({
            id: e.id,
            companyId: e.company_id,
            title: e.title,
            description: e.description,
            startTime: new Date(e.start_time),
            endTime: new Date(e.end_time),
            location: e.location,
            type: e.type,
            priority: e.priority,
            status: e.status,
            isPersonal: e.is_personal,
            createdBy: e.created_by,
            attendees: e.attendees ? e.attendees.map((a: any) => ({
                eventId: e.id,
                userId: a.user_id,
                status: a.status,
                user: a.user
            })) : []
        }));
    },

    createEvent: async (event: Partial<CalendarEvent>, attendeeIds: string[] = []): Promise<CalendarEvent | null> => {
        const user = AuthService.getCurrentUser();
        if (!user) throw new Error("Unauthorized");

        const dbEvent = {
            company_id: user.companyId,
            title: event.title,
            description: event.description,
            start_time: event.startTime,
            end_time: event.endTime,
            location: event.location,
            type: event.type || 'MEETING',
            priority: event.priority || 'MEDIUM',
            status: event.status || 'PENDING',
            is_personal: event.isPersonal || false,
            created_by: user.id
        };

        const { data: newEvent, error: eventError } = await supabase
            .from('erp_events')
            .insert(dbEvent)
            .select()
            .single();

        if (eventError) throw eventError;

        if (attendeeIds.length > 0) {
            const attendees = attendeeIds.map(uid => ({
                event_id: newEvent.id,
                user_id: uid,
                status: 'PENDING'
            }));
            await supabase.from('erp_event_attendees').insert(attendees);
        }

        return { ...newEvent, startTime: new Date(newEvent.start_time), endTime: new Date(newEvent.end_time) } as any;
    },

    updateEvent: async (id: string, updates: Partial<CalendarEvent>): Promise<void> => {
        // Map to DB fields
        const dbUpdates: any = {};
        if (updates.title) dbUpdates.title = updates.title;
        if (updates.description) dbUpdates.description = updates.description;
        if (updates.startTime) dbUpdates.start_time = updates.startTime;
        if (updates.endTime) dbUpdates.end_time = updates.endTime;
        if (updates.location) dbUpdates.location = updates.location;
        if (updates.type) dbUpdates.type = updates.type;
        if (updates.priority) dbUpdates.priority = updates.priority;
        if (updates.status) dbUpdates.status = updates.status;
        if (updates.isPersonal !== undefined) dbUpdates.is_personal = updates.isPersonal;

        const { error } = await supabase
            .from('erp_events')
            .update(dbUpdates)
            .eq('id', id);

        if (error) throw error;
    },

    deleteEvent: async (id: string) => {
        const { error } = await supabase.from('erp_events').delete().eq('id', id);
        if (error) throw error;
    }
};
