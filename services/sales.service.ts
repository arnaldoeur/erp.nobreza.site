import { Sale } from '../types';
import { api } from './api';

/**
 * Vendas.
 *
 * O pedido enviado ao servidor contém apenas o que o cliente tem direito a
 * decidir: que produtos, que quantidades, que forma de pagamento. Os preços
 * e o total são calculados no servidor a partir do catálogo — enviá-los
 * daqui permitiria faturar um produto de 500 MT por 5 MT alterando o pedido.
 */

export const SalesService = {
    getHistory: async (): Promise<Sale[]> => {
        const sales = await api.get<any[]>('/sales');
        return sales.map((sale) => ({
            ...sale,
            timestamp: new Date(sale.timestamp),
        })) as Sale[];
    },

    addSale: async (sale: Sale): Promise<{ id: string; saleNumber: number; total: number }> => {
        return api.post('/sales', {
            items: sale.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
            })),
            type: sale.type,
            paymentMethod: sale.paymentMethod,
            otherPaymentDetails: sale.otherPaymentDetails,
            customerName: sale.customerName,
            customerId: (sale as any).customerId,
            discount: (sale as any).discount,
            performedBy: sale.performedBy,
        });
    },
};
