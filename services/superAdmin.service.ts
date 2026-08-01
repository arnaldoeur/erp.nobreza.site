import { api } from './api';

/**
 * Gestão da plataforma.
 *
 * Estas consultas liam as tabelas de empresas e utilizadores por inteiro a
 * partir do browser, sem qualquer verificação de que quem as fazia tinha
 * esse direito — a distinção era feita por uma comparação de e-mail no
 * frontend. Passam a exigir a marca de super administrador no token.
 */

export const SuperAdminService = {
    getGlobalStats: async (): Promise<{ companiesCount: number; usersCount: number; totalRevenue: number }> => {
        return api.get('/platform/stats');
    },

    getAllCompanies: async () => {
        return api.get<Array<{
            id: number; name: string; nuit: string; email: string;
            contact: string; active: boolean; userCount: number; createdAt: string;
        }>>('/platform/companies');
    },

    setCompanyActive: async (id: number, active: boolean): Promise<void> => {
        await api.patch(`/platform/companies/${id}`, { active });
    },

    createCompany: async (company: { name: string; adminName: string; adminEmail: string; nuit?: string; email?: string; contact?: string }) => {
        return api.post<{ id: number; name: string }>('/platform/companies', company);
    },

    /**
     * Remove uma empresa e todos os seus dados.
     *
     * Exige o nome exato como confirmação, porque a operação é irreversível
     * e as chaves estrangeiras removem em cascata tudo o que lhe pertence.
     */
    deleteCompany: async (id: number, confirmName: string): Promise<void> => {
        await api.post(`/platform/companies/${id}/delete`, { confirmName });
    },

    deleteUser: async (id: string): Promise<void> => {
        await api.delete(`/platform/users/${id}`);
    },

    getAllUsers: async () => {
        return api.get<Array<{
            id: string; name: string; email: string; role: string;
            active: boolean; lastLoginAt?: string; company: { id: number; name: string };
        }>>('/platform/users');
    },
};
