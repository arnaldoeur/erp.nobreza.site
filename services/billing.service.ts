import { BillingDocument } from '../types';
import { api } from './api';

/**
 * Documentos de faturação.
 *
 * A numeração deixa de ser gerada no browser a partir do relógio local — o
 * que produzia saltos e podia repetir com dois postos em simultâneo — e
 * passa a vir de um contador sequencial por empresa e por tipo, mantido pelo
 * servidor com bloqueio de linha.
 */

function toDocument(raw: any): BillingDocument {
    return { ...raw, timestamp: new Date(raw.timestamp) } as BillingDocument;
}

export const BillingService = {
    getAll: async (): Promise<BillingDocument[]> => {
        const documents = await api.get<any[]>('/billing-documents');
        return documents.map(toDocument);
    },

    add: async (doc: BillingDocument): Promise<BillingDocument> => {
        return toDocument(await api.post<any>('/billing-documents', {
            type: doc.type,
            status: doc.status,
            targetName: doc.targetName,
            targetDetails: doc.targetDetails,
            total: doc.total,
            items: doc.items,
            customerId: (doc as any).customerId,
            saleId: (doc as any).saleId,
            performedBy: doc.performedBy,
        }));
    },

    updateStatus: async (id: string, status: BillingDocument['status']): Promise<BillingDocument> => {
        return toDocument(await api.patch<any>(`/billing-documents/${id}`, { status }));
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/billing-documents/${id}`);
    },
};
