import { HealthPlan } from '../types';
import { api } from './api';

export const HealthPlanService = {
    async getAll(): Promise<HealthPlan[]> {
        return api.get<HealthPlan[]>('/health-plans');
    },

    async create(plan: Omit<HealthPlan, 'id'>): Promise<HealthPlan> {
        return api.post<HealthPlan>('/health-plans', plan);
    },

    async update(plan: HealthPlan): Promise<HealthPlan> {
        return api.put<HealthPlan>(`/health-plans/${plan.id}`, plan);
    },

    /** Remoção lógica: o plano deixa de aparecer sem quebrar o histórico. */
    async delete(id: string): Promise<void> {
        await api.delete(`/health-plans/${id}`);
    },
};
