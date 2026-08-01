import { Customer } from '../types';
import { api } from './api';

/**
 * Clientes.
 *
 * `updateTotalSpent` foi removido: o acumulado passa a ser incrementado pelo
 * servidor dentro da transação da venda. A versão anterior lia o valor,
 * somava no browser e voltava a gravar, o que perdia vendas concorrentes.
 */

function toCustomer(raw: any): Customer {
    return { ...raw, createdAt: new Date(raw.createdAt) } as Customer;
}

export const CustomerService = {
    getAll: async (): Promise<Customer[]> => {
        const customers = await api.get<any[]>('/customers');
        return customers.map(toCustomer);
    },

    add: async (customer: Omit<Customer, 'id' | 'createdAt'>): Promise<Customer> => {
        return toCustomer(await api.post<any>('/customers', customer));
    },

    update: async (id: string, updates: Partial<Customer>): Promise<Customer> => {
        return toCustomer(await api.put<any>(`/customers/${id}`, updates));
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/customers/${id}`);
    },
};
