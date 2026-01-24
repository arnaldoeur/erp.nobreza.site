
import { Product } from '../types';
import { supabase } from './supabase';
import { AuthService } from './auth.service';

export const ProductService = {
    getAll: async (): Promise<Product[]> => {
        const user = AuthService.getCurrentUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('company_id', user.companyId);

        if (error) {
            console.error('Error fetching products:', error);
            return [];
        }
        return (data || []).map((p: any) => ({
            id: p.id,
            companyId: p.company_id,
            name: p.name,
            category: p.category,
            code: p.code,
            purchasePrice: p.purchase_price,
            salePrice: p.sale_price,
            quantity: p.quantity,
            minStock: p.min_stock,
            supplierId: p.supplier_id
        }));
    },

    addBatch: async (products: Partial<Product>[]): Promise<void> => {
        const user = AuthService.getCurrentUser();
        if (!user) return;

        const dbProducts = products.map(p => ({
            company_id: user.companyId,
            name: p.name,
            category: p.category || 'Geral',
            code: p.code || `IMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            purchase_price: p.purchasePrice || 0,
            sale_price: p.salePrice || 0,
            quantity: p.quantity || 0,
            min_stock: p.minStock || 5,
            supplier_id: p.supplierId
        }));

        const { error } = await supabase.from('products').insert(dbProducts);

        if (error) {
            console.error('Error batch adding products:', error);
            throw error;
        }
    },

    add: async (product: Product): Promise<Product | null> => {
        const user = AuthService.getCurrentUser();
        if (!user) return null;

        const newProduct = {
            company_id: user.companyId,
            name: product.name,
            category: product.category,
            code: product.code,
            purchase_price: product.purchasePrice,
            sale_price: product.salePrice,
            quantity: product.quantity,
            min_stock: product.minStock,
            supplier_id: product.supplierId || null
        };

        const { data, error } = await supabase.from('products').insert(newProduct).select().single();
        if (error) {
            console.error('Error adding product:', error);
            return null;
        }
        return {
            id: data.id,
            companyId: data.company_id,
            name: data.name,
            category: data.category,
            code: data.code,
            purchasePrice: data.purchase_price,
            salePrice: data.sale_price,
            quantity: data.quantity,
            minStock: data.min_stock,
            supplierId: data.supplier_id
        };
    },

    update: async (product: Product): Promise<void> => {
        const user = AuthService.getCurrentUser();
        if (!user) return;

        const dbProduct = {
            name: product.name,
            category: product.category,
            code: product.code,
            purchase_price: product.purchasePrice,
            sale_price: product.salePrice,
            quantity: product.quantity,
            min_stock: product.minStock,
            supplier_id: product.supplierId || null // Ensure null if empty
        };

        const { error } = await supabase
            .from('products')
            .update(dbProduct)
            .eq('id', product.id)
            .eq('company_id', user.companyId); // Security check

        if (error) {
            console.error('Error updating product:', error);
            throw error;
        }
    },

    updateStock: async (items: { productId: string; quantityToRemove: number }[]): Promise<void> => {
        const user = AuthService.getCurrentUser();
        if (!user) return;

        // ideally use RPC
        for (const item of items) {
            const { data: product } = await supabase
                .from('products')
                .select('quantity')
                .eq('id', item.productId)
                .eq('company_id', user.companyId)
                .single();

            if (product) {
                const newQty = Math.max(0, product.quantity - item.quantityToRemove);
                await supabase
                    .from('products')
                    .update({ quantity: newQty })
                    .eq('id', item.productId)
                    .eq('company_id', user.companyId);
            }
        }
    },

    delete: async (id: string): Promise<void> => {
        const user = AuthService.getCurrentUser();
        if (!user) return;

        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id)
            .eq('company_id', user.companyId);

        if (error) {
            console.error('Error deleting product:', error);
            throw error;
        }
    }
};
