import { supabase } from './supabase';
import { User, CompanyInfo, Sale, SystemLog } from '../types';

export const SuperAdminService = {
    // Global Metrics
    getGlobalStats: async () => {
        const { count: companiesCount } = await supabase.from('companies').select('*', { count: 'exact', head: true });
        const { count: usersCount } = await supabase.from('users').select('*', { count: 'exact', head: true });

        // For revenue, we might need a sum. Large dataset warning in production.
        const { data: sales } = await supabase.from('sales').select('total');
        const totalRevenue = sales?.reduce((acc, curr) => acc + (curr.total || 0), 0) || 0;

        return { companiesCount: companiesCount || 0, usersCount: usersCount || 0, totalRevenue };
    },

    // Companies Management
    getAllCompanies: async () => {
        const { data, error } = await supabase.from('companies').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return data as CompanyInfo[];
    },

    createCompany: async (company: Partial<CompanyInfo>) => {
        const { data, error } = await supabase.from('companies').insert(company).select().single();
        if (error) throw error;
        return data;
    },

    deleteCompany: async (id: string) => {
        const { error } = await supabase.from('companies').delete().eq('id', id);
        if (error) throw error;
    },

    // Users Management
    getAllUsers: async () => {
        // Join with companies to show where they belong
        const { data, error } = await supabase.from('users').select('*, companies(name)').order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    },

    deleteUser: async (id: string) => {
        const { error } = await supabase.from('users').delete().eq('id', id);
        if (error) throw error;
    },

    // Super Admins (Mocked logic for now, or based on specific table if requested later)
    // Currently we rely on strict email check in frontend/RLS.
};
