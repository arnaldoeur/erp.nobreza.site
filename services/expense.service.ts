import { api } from './api';

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
        return api.get<Expense[]>('/expenses');
    },

    add: async (expense: Partial<Expense>): Promise<Expense> => {
        return api.post<Expense>('/expenses', expense);
    },

    update: async (id: string, expense: Partial<Expense>): Promise<Expense> => {
        return api.put<Expense>(`/expenses/${id}`, expense);
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/expenses/${id}`);
    },
};
