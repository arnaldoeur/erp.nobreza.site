import { BillingDocument } from '../types';
import { supabase } from './supabase';
import { AuthService } from './auth.service';

export const BillingService = {
    getAll: async (): Promise<BillingDocument[]> => {
        const user = AuthService.getCurrentUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('documents')
            .select('*')
            .eq('company_id', user.companyId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching documents:', error);
            return [];
        }

        return (data || []).map(d => ({
            id: d.id,
            companyId: String(d.company_id),
            type: d.type as any,
            timestamp: new Date(d.created_at || d.date),
            items: d.items || [],
            total: d.total || 0,
            targetName: d.customer_name || 'Consumidor Final',
            status: d.status as any,
            performedBy: d.created_by || 'Sistema'
        }));
    },

    add: async (doc: BillingDocument): Promise<void> => {
        const user = AuthService.getCurrentUser();
        if (!user) throw new Error("Unauthorized");

        const { error } = await supabase
            .from('documents')
            .insert({
                company_id: user.companyId,
                type: doc.type,
                customer_name: doc.targetName,
                total: doc.total,
                status: doc.status,
                items: doc.items,
                // created_by: user.name, // Removed: column does not exist
                date: new Date()
            });

        if (error) {
            console.error('Error adding document:', error);
            throw error;
        }
    },

    delete: async (id: string): Promise<void> => {
        const { error } = await supabase
            .from('documents')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting document:', error);
            throw error;
        }
    }
};
