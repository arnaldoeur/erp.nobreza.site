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

        const saleData = {
            company_id: user.companyId,
            user_id: user.id,
            customer_id: null, // If you have customer ID, use it here
            customer_name: sale.customerName,
            total: sale.total,
            discount: 0, // Add discount field to Sale type if needed
            payment_method: sale.paymentMethod,
            type: sale.type,
            performed_by: sale.performedBy || user.name
        };

        const itemsData = sale.items.map(item => ({
            product_id: item.productId,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            total: item.total
        }));

        const { data, error } = await supabase.rpc('process_sale', {
            p_sale_data: saleData,
            p_items_data: itemsData
        });

        if (error) {
            console.error('❌ Error processing atomic sale:', error);
            throw new Error(`Falha ao processar venda: ${error.message}`);
        }

        console.log('✅ Venda atómica processada com sucesso:', data);
    }

};
