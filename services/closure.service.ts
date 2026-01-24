
import { DailyClosure } from '../types';
import { supabase } from './supabase';
import { AuthService } from './auth.service';

export const ClosureService = {
    getAll: async (): Promise<DailyClosure[]> => {
        const user = AuthService.getCurrentUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('daily_closures')
            .select('*')
            .eq('company_id', user.companyId)
            .order('closure_date', { ascending: false });

        if (error) {
            console.error('Error fetching closures:', error);
            return [];
        }

        return data.map((c: any) => ({
            id: c.id,
            companyId: c.company_id,
            closureDate: new Date(c.closure_date),
            shift: c.shift,
            responsibleId: c.responsible_id,
            responsibleName: c.responsible_name,
            systemTotal: c.system_total,
            manualCash: c.manual_cash,
            difference: c.difference,
            observations: c.observations,
            status: c.status,
            createdAt: new Date(c.created_at || c.closure_date)
        }));
    },

    add: async (closure: DailyClosure): Promise<void> => {
        const user = AuthService.getCurrentUser();
        if (!user) return;

        const dbClosure = {
            company_id: user.companyId,
            closure_date: closure.closureDate,
            shift: closure.shift,
            responsible_id: closure.responsibleId,
            responsible_name: closure.responsibleName,
            system_total: closure.systemTotal,
            manual_cash: closure.manualCash,
            difference: closure.difference,
            observations: closure.observations,
            status: closure.status || 'CLOSED'
        };

        const { error } = await supabase.from('daily_closures').insert(dbClosure);

        if (error) {
            console.error('Error adding closure:', error);
            throw error;
        }
    }
};
