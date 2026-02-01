import { supabase } from './supabase';

export interface WorkShift {
    id: string;
    user_id: string;
    start_time: string;
    end_time?: string;
    status: 'OPEN' | 'CLOSED';
    duration_minutes?: number; // Computed on client
}

export const TimeTrackingService = {
    // Start a new shift
    checkIn: async (userId: string): Promise<WorkShift> => {
        // 1. Check if there is already an open shift, if so, return it
        const current = await TimeTrackingService.getCurrentShift(userId);
        if (current) return current;

        const currentUser = (await supabase.auth.getUser()).data.user;
        if (!currentUser) throw new Error("Not authenticated");

        // Fetch user profile to get company_id
        const { data: profile } = await supabase.from('users').select('company_id').eq('id', userId).single();

        const { data, error } = await supabase
            .from('work_shifts')
            .insert({
                user_id: userId,
                company_id: profile?.company_id,
                status: 'OPEN'
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // End current shift
    checkOut: async (shiftId: string, notes?: string): Promise<void> => {
        const { error } = await supabase
            .from('work_shifts')
            .update({
                end_time: new Date().toISOString(),
                status: 'CLOSED',
                notes
            })
            .eq('id', shiftId);

        if (error) throw error;
    },

    // Get active shift for user
    getCurrentShift: async (userId: string): Promise<WorkShift | null> => {
        const { data, error } = await supabase
            .from('work_shifts')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'OPEN')
            .maybeSingle();

        if (error) throw error;
        return data;
    },

    // Get history for reporting
    getShifts: async (userId?: string, startDate?: string, endDate?: string): Promise<WorkShift[]> => {
        let query = supabase
            .from('work_shifts')
            .select('*')
            .order('start_time', { ascending: false });

        if (userId) {
            query = query.eq('user_id', userId);
        }
        if (startDate) {
            // Adjust to start of local day in UTC
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            query = query.gte('start_time', start.toISOString());
        }
        if (endDate) {
            // Ensure end date includes the whole day
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            query = query.lte('start_time', end.toISOString());
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }
};
