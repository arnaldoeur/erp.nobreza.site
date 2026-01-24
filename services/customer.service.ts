import { Customer } from '../types';
import { supabase } from './supabase';
import { AuthService } from './auth.service';

export const CustomerService = {
    getAll: async (): Promise<Customer[]> => {
        const user = AuthService.getCurrentUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .eq('company_id', user.companyId);

        if (error) {
            console.error('Error fetching customers:', error);
            return [];
        }

        // If no customers, create the default "Venda Directa" automatically
        if (!data || data.length === 0) {
            console.log("No customers found. Creating default 'Venda Directa'...");

            const defaultCustomer = {
                company_id: user.companyId,
                name: 'Venda Directa',
                nuit: '999999999',
                contact: '840000000',
                email: 'geral@cliente.com',
                address: 'Balcão',
                type: 'NORMAL',
                total_spent: 0
            };

            const { data: newCustomer, error: createError } = await supabase
                .from('customers')
                .insert(defaultCustomer)
                .select()
                .single();

            if (createError) {
                console.error("Error creating default customer:", createError);
                return [];
            }

            return [{
                id: newCustomer.id,
                companyId: newCustomer.company_id,
                name: newCustomer.name,
                nuit: newCustomer.nuit,
                contact: newCustomer.contact,
                email: newCustomer.email,
                address: newCustomer.address,
                type: newCustomer.type as 'NORMAL' | 'INSTITUTIONAL',
                totalSpent: newCustomer.total_spent || 0,
                createdAt: new Date(newCustomer.created_at)
            }];
        }

        return data.map((c: any) => ({
            id: c.id,
            companyId: c.company_id,
            name: c.name,
            nuit: c.nuit,
            contact: c.contact,
            email: c.email,
            address: c.address,
            type: c.type as 'NORMAL' | 'INSTITUTIONAL',
            totalSpent: c.total_spent || 0,
            createdAt: new Date(c.created_at)
        }));
    },

    add: async (customer: Omit<Customer, 'id' | 'createdAt'>): Promise<Customer> => {
        const user = AuthService.getCurrentUser();
        if (!user) throw new Error('User not authenticated');

        const dbCustomer = {
            company_id: user.companyId,
            name: customer.name,
            nuit: customer.nuit,
            contact: customer.contact,
            email: customer.email,
            address: customer.address,
            type: customer.type || 'NORMAL',
            total_spent: 0
        };

        const { data, error } = await supabase
            .from('customers')
            .insert(dbCustomer)
            .select()
            .single();

        if (error) {
            console.error('Error adding customer:', error);
            throw new Error('Failed to add customer');
        }

        return {
            id: data.id,
            companyId: data.company_id,
            name: data.name,
            nuit: data.nuit,
            contact: data.contact,
            email: data.email,
            address: data.address,
            type: data.type as 'NORMAL' | 'INSTITUTIONAL',
            totalSpent: data.total_spent || 0,
            createdAt: new Date(data.created_at)
        };
    },

    update: async (id: string, updates: Partial<Customer>): Promise<Customer> => {
        const dbUpdates: any = {};
        if (updates.name) dbUpdates.name = updates.name;
        if (updates.nuit) dbUpdates.nuit = updates.nuit;
        if (updates.contact) dbUpdates.contact = updates.contact;
        if (updates.email) dbUpdates.email = updates.email;
        if (updates.address) dbUpdates.address = updates.address;

        const { data, error } = await supabase
            .from('customers')
            .update(dbUpdates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            throw new Error('Failed to update customer');
        }

        return {
            id: data.id,
            companyId: data.company_id,
            name: data.name,
            nuit: data.nuit,
            contact: data.contact,
            email: data.email,
            address: data.address,
            type: data.type as 'NORMAL' | 'INSTITUTIONAL',
            totalSpent: data.total_spent || 0,
            createdAt: new Date(data.created_at)
        };
    },

    updateTotalSpent: async (customerName: string, amount: number): Promise<void> => {
        const user = AuthService.getCurrentUser();
        if (!user) return;

        const { data: customer } = await supabase
            .from('customers')
            .select('*')
            .eq('name', customerName)
            .eq('company_id', user.companyId)
            .single();

        if (customer) {
            await supabase
                .from('customers')
                .update({ total_spent: (customer.total_spent || 0) + amount })
                .eq('id', customer.id);
        }
    },

    delete: async (id: string): Promise<void> => {
        const { error } = await supabase
            .from('customers')
            .delete()
            .eq('id', id);

        if (error) {
            throw new Error('Failed to delete customer');
        }
    }
};
