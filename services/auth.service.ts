import { User, UserRole } from '../types';
import { api } from './api';

/**
 * Autenticação do lado do cliente.
 *
 * Mantém a mesma superfície pública de antes, para que os componentes não
 * precisem de mudar — mas o que faz por dentro é diferente em pontos que
 * importam:
 *
 *  - A sessão vive em cookies httpOnly geridos pelo servidor. O localStorage
 *    passa a guardar apenas uma cópia do perfil para a interface arrancar
 *    sem esperar pela rede; deixou de ser a fonte de verdade da identidade.
 *    Antes, o `companyId` guardado aqui alimentava diretamente as consultas
 *    à base de dados — editá-lo bastava para operar sobre outra empresa.
 *
 *  - `register` deixou de existir. Contas são criadas por um administrador
 *    através da gestão de equipa, e a pessoa define a palavra-passe pelo
 *    convite que recebe. O registo aberto criava empresas a partir de
 *    pedidos anónimos.
 */

const PROFILE_KEY = 'nobreza_current_user';

/** Guarda uma cópia do perfil para a interface arrancar de imediato. */
function cacheProfile(user: User | null): void {
    if (user) localStorage.setItem(PROFILE_KEY, JSON.stringify(user));
    else localStorage.removeItem(PROFILE_KEY);
}

function normalize(user: any): User {
    return {
        ...user,
        companyId: user.companyId,
        hireDate: new Date(user.hireDate || user.createdAt || Date.now()),
        role: (user.role || 'OTHER') as UserRole,
    } as User;
}

export const AuthService = {
    login: async (email: string, password: string): Promise<User> => {
        const { user } = await api.post<{ user: any }>('/auth/login', { email, password });
        const mapped = normalize(user);
        cacheProfile(mapped);
        return mapped;
    },

    logout: async (): Promise<void> => {
        cacheProfile(null);
        try {
            await api.post('/auth/logout');
        } catch {
            // A sessão local já foi limpa. Se o servidor estiver inacessível,
            // o token expira sozinho — não vale a pena bloquear a saída.
        }
    },

    /**
     * Confirma a sessão junto do servidor.
     *
     * É o servidor que decide quem somos, a partir do cookie assinado. A
     * versão anterior reconstruía o utilizador a partir do localStorage e,
     * quando não o encontrava na base de dados, chegava a criar um perfil
     * ADMIN novo ligado a uma empresa qualquer.
     */
    syncSession: async (): Promise<User | null> => {
        try {
            const { user } = await api.get<{ user: any }>('/auth/me');
            const mapped = normalize(user);
            cacheProfile(mapped);
            return mapped;
        } catch {
            cacheProfile(null);
            return null;
        }
    },

    /** Perfil em cache. Serve o primeiro render; não é uma prova de sessão. */
    getCurrentUser: (): User | null => {
        const stored = localStorage.getItem(PROFILE_KEY);
        if (!stored) return null;
        try {
            return normalize(JSON.parse(stored));
        } catch {
            localStorage.removeItem(PROFILE_KEY);
            return null;
        }
    },

    getTeam: async (): Promise<User[]> => {
        const team = await api.get<any[]>('/team');
        return team.map(normalize);
    },

    saveTeamMember: async (user: User): Promise<User> => {
        const payload = {
            name: user.name,
            email: user.email,
            role: user.role,
            employeeId: user.employeeId,
            responsibility: user.responsibility,
            contact: user.contact,
            location: user.location,
            socialSecurityNumber: user.socialSecurityNumber,
            baseSalary: user.baseSalary,
            baseHours: user.baseHours,
            hireDate: user.hireDate,
            active: user.active ?? true,
        };

        const saved = user.id
            ? await api.put<any>(`/team/${user.id}`, payload)
            : await api.post<any>('/team', payload);

        return normalize(saved);
    },

    deleteTeamMember: async (id: string): Promise<void> => {
        await api.delete(`/team/${id}`);
    },

    /** Reenvia o convite a quem ainda não definiu palavra-passe. */
    resendInvite: async (id: string): Promise<void> => {
        await api.post(`/team/${id}/invite`);
    },

    /**
     * Atualiza o próprio perfil.
     *
     * Papel, salário e estado ativo não passam por aqui — são geridos pela
     * administração. Antes, `updateTeam` recebia o array completo de
     * utilizadores vindo do browser e fazia upsert, o que permitia a qualquer
     * pessoa reescrever o perfil de um colega, incluindo promover-se.
     */
    updateProfile: async (user: User): Promise<void> => {
        const updated = await api.put<any>('/profile', {
            name: user.name,
            contact: user.contact,
            location: user.location,
            photo: user.photo,
        });

        const mapped = normalize(updated);
        cacheProfile(mapped);
        window.dispatchEvent(new CustomEvent('nobreza-user-updated', { detail: mapped }));
    },

    /**
     * Pede a recuperação de palavra-passe.
     *
     * A resposta é sempre a mesma, exista ou não a conta: dizer "e-mail não
     * encontrado", como o sistema anterior fazia, permitia descobrir quem
     * tem conta testando endereços.
     */
    resetPassword: async (email: string): Promise<string> => {
        const { message } = await api.post<{ message: string }>('/auth/password/forgot', { email });
        return message;
    },

    /** Conclui a recuperação ou a ativação com o token recebido por e-mail. */
    completePasswordReset: async (token: string, password: string): Promise<void> => {
        await api.post('/auth/password/reset', { token, password });
        cacheProfile(null);
    },

    changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
        await api.post('/auth/password/change', { currentPassword, newPassword });
        cacheProfile(null);
    },

    /** Confirma a palavra-passe atual, para proteger operações destrutivas. */
    verifyPassword: async (password: string): Promise<boolean> => {
        try {
            await api.post('/auth/password/verify', { password });
            return true;
        } catch {
            return false;
        }
    },
};
