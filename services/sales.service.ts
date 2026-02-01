import { Sale } from '../types';
import { supabase } from './supabase';
import { AuthService } from './auth.service';

export const SalesService = {
    getHistory: async (): Promise<Sale[]> => {
        const user = AuthService.getCurrentUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('sales')
            .select('*, items:sale_items(*)')
            .eq('company_id', user.companyId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching sales:', error);
            return [];
        }

        return data.map((s: any) => ({
            id: s.id,
            companyId: s.company_id,
            timestamp: new Date(s.created_at), // Using created_at as timestamp
            items: (s.items || []).map((i: any) => ({
                productId: i.product_id,
                companyId: i.company_id,
                productName: i.product_name,
                quantity: i.quantity,
                unitPrice: i.unit_price,
                total: i.total
            })),
            total: s.total,
            type: s.type,
            customerName: s.customer_name,
            paymentMethod: s.payment_method,
            otherPaymentDetails: s.other_payment_details, // Assuming you might add this column or ignore
            performedBy: s.performed_by
        }));
    },

    addSale: async (sale: Sale): Promise<void> => {
        const user = AuthService.getCurrentUser();
        if (!user || !user.companyId) {
            throw new Error("Não autenticado ou empresa não associada.");
        }

        // 1. Direct Insert into 'sales' (Bypassing broken RPC)
        const saleData = {
            company_id: user.companyId,
            // user_id removed as it doesn't exist on the table
            customer_name: sale.customerName,
            total: sale.total,
            payment_method: sale.paymentMethod,
            type: sale.type,
            performed_by: sale.performedBy || user.name,
            created_at: new Date().toISOString()
        };

        const { data: saleResult, error: saleError } = await supabase
            .from('sales')
            .insert(saleData)
            .select()
            .single();

        if (saleError) {
            console.error('Error inserting sale:', saleError);
            throw new Error(`Erro ao criar venda: ${saleError.message}`);
        }

        if (!saleResult) throw new Error("Venda criada mas nenhum dado retornado.");

        // 2. Insert Items
        const itemsData = sale.items.map(item => ({
            sale_id: saleResult.id,
            company_id: user.companyId,
            product_id: item.productId,
            product_name: item.productName, // Ensure this field exists in your sales_items schema, otherwise remove
            quantity: item.quantity,
            unit_price: item.unitPrice,
            total: item.total
        }));

        const { error: itemsError } = await supabase
            .from('sale_items')
            .insert(itemsData);

        if (itemsError) {
            console.error('Error inserting items:', itemsError);
            // Optional: Rollback sale if items fail? Supabase doesn't support client-side transactions easily.
            // For now, we report the error.
            throw new Error(`Erro ao adicionar itens da venda: ${itemsError.message}`);
        }

        // Trigger Notification/Log manually since RPC is gone
        // (Assuming App.tsx handles the UI log update based on success return)
    }

};
