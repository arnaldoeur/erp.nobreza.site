import { CompanyInfo } from '../types';
import { api } from './api';

/**
 * Dados da empresa.
 *
 * O mecanismo anterior de "tenta gravar tudo, e se falhar tenta gravar
 * menos" desapareceu. Existia porque o schema e o código estavam
 * dessincronizados e não se sabia que colunas existiam de facto — o utilizador
 * recebia mensagens como "DADOS SALVOS! Mas os Logotipos Extras foram
 * ignorados porque as colunas faltam na Base de Dados". Com um schema único
 * e verificado, ou a gravação funciona ou é um erro a corrigir.
 */

export const CompanyService = {
    get: async (): Promise<CompanyInfo> => {
        return api.get<CompanyInfo>('/company');
    },

    update: async (info: CompanyInfo): Promise<CompanyInfo> => {
        return api.put<CompanyInfo>('/company', info);
    },

    /** Próximo número de funcionário disponível, para preencher o formulário. */
    getNextEmployeeId: async (): Promise<number> => {
        const { nextId } = await api.get<{ nextId: number }>('/team/next-employee-id');
        return nextId;
    },

    /**
     * Exporta os dados da empresa para cópia de segurança local.
     *
     * Operação de administrador, limitada à empresa da sessão. Hashes de
     * palavra-passe e credenciais de e-mail nunca são incluídos.
     */
    exportBackup: async (): Promise<Record<string, any>> => {
        return api.get<Record<string, any>>('/company/backup');
    },
};

/**
 * Histórico de relatórios gerados.
 *
 * Estava a ser gravado com um INSERT direto na tabela `reports` a partir do
 * componente de definições.
 */
export const ReportService = {
    save: async (type: string, period: string, summary: string, data?: unknown): Promise<string> => {
        const { id } = await api.post<{ id: string }>('/reports', { type, period, summary, data });
        return id;
    },

    getAll: async () => {
        return api.get<Array<{
            id: string; type: string; period: string; summary: string;
            createdBy: string; createdAt: string;
        }>>('/reports');
    },
};
