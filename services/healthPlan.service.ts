
import { supabase } from './supabase';
import { HealthPlan } from '../types';

export const HealthPlanService = {
    async getAll(companyId: string): Promise<HealthPlan[]> {
        const { data, error } = await supabase
            .from('health_plans')
            .select('*')
            .eq('company_id', companyId)
            .eq('active', true);

        if (error) throw error;
        return data.map(mapToHealthPlan);
    },

    async create(plan: Omit<HealthPlan, 'id'>): Promise<HealthPlan> {
        const { data, error } = await supabase
            .from('health_plans')
            .insert([mapToDb(plan)])
            .select()
            .single();

        if (error) throw error;
        return mapToHealthPlan(data);
    },

    async update(plan: HealthPlan): Promise<HealthPlan> {
        const { data, error } = await supabase
            .from('health_plans')
            .update(mapToDb(plan))
            .eq('id', plan.id)
            .select()
            .single();

        if (error) throw error;
        return mapToHealthPlan(data);
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('health_plans')
            .update({ active: false })
            .eq('id', id);

        if (error) throw error;
    }
};

const mapToDb = (p: Partial<HealthPlan>) => ({
    company_id: p.companyId,
    name: p.name,
    insurer: p.insurer,
    coverage_percentage: p.coveragePercentage,
    contact: p.contact,
    email: p.email,
    website: p.website,
    description: p.description,
    coverage_details: p.coverageDetails,
    active: p.active
});

const mapToHealthPlan = (db: any): HealthPlan => ({
    id: db.id,
    companyId: db.company_id,
    name: db.name,
    insurer: db.insurer,
    coveragePercentage: db.coverage_percentage,
    contact: db.contact,
    email: db.email,
    website: db.website,
    description: db.description,
    coverageDetails: db.coverage_details,
    active: db.active
});
