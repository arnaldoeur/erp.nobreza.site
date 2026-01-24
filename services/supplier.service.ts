
import { Supplier } from '../types';
import { supabase } from './supabase';
import { AuthService } from './auth.service';

export const SupplierService = {
    getAll: async (): Promise<Supplier[]> => {
        const user = AuthService.getCurrentUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('suppliers')
            .select('*')
            .eq('company_id', user.companyId);

        if (error) {
            console.error('Error fetching suppliers:', error);
            return [];
        }
        return (data || []).map((s: any) => ({
            id: s.id,
            companyId: s.company_id,
            name: s.name,
            nuit: s.nuit,
            location: s.location || '',
            contact: s.contact,
            email: s.email,
            conditions: s.conditions || '',
            isPreferred: s.is_preferred || false,
            logo: s.logo
        }));
    },

    updateAll: async (): Promise<void> => {
        console.warn('SupplierService.updateAll is deprecated with Supabase');
    },

    add: async (supplier: Supplier): Promise<Supplier | null> => {
        const user = AuthService.getCurrentUser();
        if (!user) return null;

        const dbSupplier = {
            company_id: user.companyId,
            name: supplier.name,
            nuit: supplier.nuit,
            location: supplier.location,
            contact: supplier.contact,
            email: supplier.email,
            conditions: supplier.conditions,
            is_preferred: supplier.isPreferred,
            logo: supplier.logo
        };

        const { data, error } = await supabase.from('suppliers').insert(dbSupplier).select().single();
        if (error) {
            console.error('Error adding supplier:', error);
            throw error;
        }
        return {
            id: data.id,
            companyId: data.company_id,
            name: data.name,
            nuit: data.nuit,
            location: data.location,
            contact: data.contact,
            email: data.email,
            conditions: data.conditions,
            isPreferred: data.is_preferred,
            logo: data.logo
        };
    },

    update: async (supplier: Supplier): Promise<void> => {
        const user = AuthService.getCurrentUser();
        if (!user) return;

        const dbSupplier = {
            name: supplier.name,
            nuit: supplier.nuit,
            location: supplier.location,
            contact: supplier.contact,
            email: supplier.email,
            conditions: supplier.conditions,
            is_preferred: supplier.isPreferred,
            logo: supplier.logo
        };

        const { error } = await supabase
            .from('suppliers')
            .update(dbSupplier)
            .eq('id', supplier.id)
            .eq('company_id', user.companyId);

        if (error) {
            console.error('Error updating supplier:', error);
            throw error;
        }
    },

    delete: async (id: string): Promise<void> => {
        const user = AuthService.getCurrentUser();
        if (!user) return;

        const { error } = await supabase
            .from('suppliers')
            .delete()
            .eq('id', id)
            .eq('company_id', user.companyId);

        if (error) {
            console.error('Error deleting supplier:', error);
            throw error;
        }
    }
};
