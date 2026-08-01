import { Product } from '../types';
import { api } from './api';

/**
 * Catálogo de produtos.
 *
 * `updateStock` foi removido. Existia para abater existências a partir do
 * browser, uma leitura seguida de escrita por cada artigo, sem transação e
 * sem verificação — duas vendas simultâneas do mesmo produto perdiam um dos
 * abates. O stock passa a ser abatido pelo servidor, dentro da transação da
 * venda.
 */

function toProduct(raw: any): Product {
    return {
        ...raw,
        expiryDate: raw.expiryDate ? new Date(raw.expiryDate) : undefined,
    } as Product;
}

function toPayload(product: Partial<Product>) {
    return {
        name: product.name,
        category: product.category,
        code: product.code,
        purchasePrice: product.purchasePrice,
        salePrice: product.salePrice,
        quantity: product.quantity,
        minStock: product.minStock,
        unit: product.unit,
        batch: product.batch,
        expiryDate: product.expiryDate,
        supplierId: product.supplierId || null,
    };
}

export const ProductService = {
    getAll: async (): Promise<Product[]> => {
        const products = await api.get<any[]>('/products');
        return products.map(toProduct);
    },

    add: async (product: Product): Promise<Product> => {
        return toProduct(await api.post<any>('/products', toPayload(product)));
    },

    update: async (product: Product): Promise<Product> => {
        return toProduct(await api.put<any>(`/products/${product.id}`, toPayload(product)));
    },

    addBatch: async (products: Partial<Product>[]): Promise<number> => {
        const { created } = await api.post<{ created: number }>('/products/batch', {
            products: products.map(toPayload),
        });
        return created;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/products/${id}`);
    },

    bulkUpdate: async (ids: string[], field: string, value: any): Promise<number> => {
        const { updated } = await api.patch<{ updated: number }>('/products/bulk', { ids, field, value });
        return updated;
    },

    bulkDelete: async (ids: string[]): Promise<number> => {
        const { deleted } = await api.post<{ deleted: number }>('/products/bulk-delete', { ids });
        return deleted;
    },

    /**
     * Ajusta todos os preços de venda por uma percentagem.
     *
     * Substitui a chamada direta ao RPC `adjust_all_prices` a partir do
     * browser, que reescrevia o catálogo inteiro sem limite nem registo.
     */
    adjustAllPrices: async (percentage: number): Promise<number> => {
        const { updated } = await api.post<{ updated: number }>('/products/adjust-prices', { percentage });
        return updated;
    },

    /** Produtos em rutura ou abaixo do mínimo definido. */
    getLowStock: async (): Promise<Array<{ id: string; name: string; quantity: number; minStock: number; unit: string }>> => {
        return api.get('/stock/alerts');
    },

    /** Histórico de entradas e saídas de um produto. Não existia antes. */
    getMovements: async (productId: string) => {
        return api.get<Array<{
            id: string; quantityDelta: number; quantityAfter: number;
            reason: string; notes?: string; performedBy: string; createdAt: string;
        }>>(`/products/${productId}/movements`);
    },
};
