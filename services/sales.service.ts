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
        console.log('📦 SalesService.addSale chamado com:', sale);

        const user = AuthService.getCurrentUser();
        console.log('👤 Usuário autenticado:', user);

        if (!user) {
            console.error('❌ No authenticated user found');
            throw new Error("Não autenticado. Por favor, faça login novamente.");
        }

        if (!user.companyId) {
            console.error('❌ User has no company ID:', user);
            throw new Error("Utilizador sem empresa associada.");
        }

        const saleData = {
            company_id: user.companyId,
            customer_name: sale.customerName,
            total: sale.total,
            payment_method: sale.paymentMethod,
            type: sale.type,
            performed_by: sale.performedBy || user.name
        };

        console.log('💾 Dados da venda a inserir:', saleData);

        // Insert Sale
        const { data: newSale, error: saleError } = await supabase
            .from('sales')
            .insert(saleData)
            .select()
            .single();

        if (saleError || !newSale) {
            console.error('❌ Error adding sale:', saleError);
            throw saleError || new Error('Falha ao criar venda');
        }

        console.log('✅ Venda criada no Supabase:', newSale);

        // Insert Items
        const itemsWithSaleId = sale.items.map(item => ({
            company_id: user.companyId,
            sale_id: newSale.id,
            product_id: item.productId,
            product_name: item.productName,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            total: item.total
        }));

        console.log('📝 Itens a inserir:', itemsWithSaleId);

        const { error: itemsError } = await supabase.from('sale_items').insert(itemsWithSaleId);

        if (itemsError) {
            console.error('❌ Error adding sale items:', itemsError);
            // Rollback sale
            await supabase.from('sales').delete().eq('id', newSale.id);
            throw itemsError;
        }

        console.log('✅ Itens da venda inseridos com sucesso');
    }
};
