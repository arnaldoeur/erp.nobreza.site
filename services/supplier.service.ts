import { Supplier } from '../types';
import { api } from './api';

export const SupplierService = {
    getAll: async (): Promise<Supplier[]> => {
        return api.get<Supplier[]>('/suppliers');
    },

    add: async (supplier: Supplier): Promise<Supplier> => {
        return api.post<Supplier>('/suppliers', supplier);
    },

    update: async (supplier: Supplier): Promise<Supplier> => {
        return api.put<Supplier>(`/suppliers/${supplier.id}`, supplier);
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/suppliers/${id}`);
    },

    /**
     * Usado pela importação de produtos. A criação corre numa transação no
     * servidor, para que duas importações em paralelo não criem o mesmo
     * fornecedor duas vezes.
     */
    findOrCreateByName: async (name: string): Promise<string | null> => {
        if (!name?.trim()) return null;
        const { id } = await api.post<{ id: string }>('/suppliers/find-or-create', { name: name.trim() });
        return id;
    },
};
