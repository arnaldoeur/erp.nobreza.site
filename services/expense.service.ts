import { supabase } from './supabase';
import { AuthService } from './auth.service';

export interface Expense {
    id: string;
    companyId: string;
    userId: string;
    type: 'Operational' | 'Salary' | 'Maintenance' | 'Technical' | 'Tax' | 'Other';
    amount: number;
    description: string;
    date: string;
    createdAt?: string;
}

export const ExpenseService = {
    getAll: async (): Promise<Expense[]> => {
        const user = AuthService.getCurrentUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('expenses')
            .select('*')
            .order('date', { ascending: false });

        if (error) {
            console.error('Error fetching expenses:', error);
            return [];
        }

        return data.map((e: any) => ({
            id: e.id,
            companyId: e.company_id,
            userId: e.user_id,
            type: e.type,
            amount: e.amount,
            description: e.description,
            date: e.date,
            createdAt: e.created_at
        }));
    },

    add: async (expense: Partial<Expense>): Promise<Expense> => {
        const user = AuthService.getCurrentUser();
        if (!user) throw new Error("Unauthorized");

        const payload = {
            company_id: user.companyId,
            user_id: user.id,
            type: expense.type,
            amount: expense.amount,
            description: expense.description,
            date: expense.date || new Date().toISOString().split('T')[0]
        };

        const { data, error } = await supabase
            .from('expenses')
            .insert(payload)
            .select()
            .single();

        if (error) throw error;
        return {
            id: data.id,
            companyId: data.company_id,
            userId: data.user_id,
            type: data.type,
            amount: data.amount,
            description: data.description,
            date: data.date
        };
    },

    delete: async (id: string): Promise<void> => {
        const { error } = await supabase.from('expenses').delete().eq('id', id);
        if (error) throw error;
    }
};
