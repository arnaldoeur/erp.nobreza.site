import { User, UserRole } from '../types';
import { supabase } from './supabase';

export const AuthService = {
    login: async (email: string, password: string): Promise<User> => {
        // 0. Check if user exists in public.users for better feedback (RLS Safe)
        const { data: userExists, error: rpcError } = await supabase
            .rpc('check_user_active_profile', { target_email: email.toLowerCase().trim() });

        if (rpcError) console.error("RPC Error:", rpcError);

        if (!userExists) {
            throw new Error('E-mail não encontrado no sistema. Se é o seu primeiro acesso, use a opção abaixo.');
        }

        // 1. Strict Authentication via Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: email.toLowerCase(),
            password
        });

        if (authError || !authData.user) {
            throw new Error('Palavra-passe incorreta. Por favor, tente novamente.');
        }

        // 2. Fetch User Profile from 'public.users'
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', authData.user.id)
            .single();

        let targetUser = user;

        if (error || !targetUser) {
            const { data: legacyUser, error: legacyError } = await supabase
                .from('users')
                .select('*')
                .ilike('email', email)
                .single();

            if (legacyError || !legacyUser) {
                console.warn("User record missing in public.users. Attempting auto-repair...");

                const repairUser = {
                    id: authData.user.id,
                    name: authData.user.user_metadata?.name || email.split('@')[0],
                    email: email,
                    company_id: authData.user.user_metadata?.company_id || null,
                    active: true,
                    role: 'ADMIN',
                    created_at: new Date()
                };

                if (!repairUser.company_id) {
                    const { data: anyCompany } = await supabase.from('companies').select('id').limit(1).single();
                    if (anyCompany) repairUser.company_id = anyCompany.id;
                }

                const { data: newUser, error: createError } = await supabase
                    .from('users')
                    .insert(repairUser)
                    .select()
                    .single();

                if (createError) {
                    throw new Error('Utilizador não encontrado e falha ao reparar: ' + createError.message);
                }
                targetUser = newUser;
            } else {
                targetUser = legacyUser;
            }
        }

        if (!targetUser.active) throw new Error('Utilizador inativo.');

        const { data: company, error: companyError } = await supabase
            .from('companies')
            .select('*')
            .eq('id', targetUser.company_id)
            .single();

        if (companyError || !company || !company.active) {
            throw new Error('Empresa bloqueada ou não encontrada.');
        }

        const mappedUser = {
            ...targetUser,
            companyId: targetUser.company_id,
            employeeId: targetUser.employee_id,
            sequentialId: targetUser.sequential_id,
            baseSalary: targetUser.base_salary,
            baseHours: targetUser.base_hours,
            hireDate: new Date(targetUser.created_at || new Date())
        } as User;

        localStorage.setItem('nobreza_current_user', JSON.stringify(mappedUser));
        return mappedUser;
    },

    register: async (user: Partial<User>, password?: string, companyData?: { name: string, nuit?: string, phone?: string, address?: string }): Promise<User> => {
        if (!user.email || !password) {
            throw new Error("Email e Palavra-passe são obrigatórios.");
        }

        const { data: company, error: companyError } = await supabase
            .from('companies')
            .insert({
                name: companyData?.name || (user.name ? `Farmácia de ${user.name}` : 'Nova Farmácia'),
                nuit: companyData?.nuit || '',
                contact: companyData?.phone || '',
                address: companyData?.address || '',
                active: true,
                theme_color: '#10b981'
            })
            .select()
            .single();

        if (companyError || !company) {
            console.error("Company creation error:", companyError);
            throw new Error('Erro ao criar empresa: ' + companyError.message);
        }

        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: user.email.toLowerCase(),
            password: password,
            options: {
                data: {
                    name: user.name,
                    company_id: company.id
                }
            }
        });

        if (authError) {
            console.error("Auth error:", authError);
            throw new Error('Erro ao criar conta de autenticação: ' + authError.message);
        }

        if (!authData.user) {
            throw new Error('Falha crítica no registo.');
        }

        const newUser = {
            id: authData.user.id,
            name: user.name,
            email: user.email,
            company_id: company.id,
            active: true,
            role: 'ADMIN',
            created_at: new Date()
        };

        const { data: createdUser, error: userError } = await supabase
            .from('users')
            .insert(newUser)
            .select()
            .single();

        if (userError) {
            console.error("User creation error:", userError);
            if (!userError.message.includes('duplicate key')) {
                throw new Error('Erro ao gravar dados do utilizador: ' + userError.message);
            }
        }

        const mappedUser = { ...newUser, companyId: newUser.company_id, hireDate: new Date() } as User;

        if (authData.session) {
            localStorage.setItem('nobreza_current_user', JSON.stringify(mappedUser));
        }

        return mappedUser;
    },

    logout: async (): Promise<void> => {
        localStorage.removeItem('nobreza_current_user');
        await supabase.auth.signOut();
    },

    syncSession: async (): Promise<User | null> => {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session?.user) {
            localStorage.removeItem('nobreza_current_user');
            return null;
        }

        try {
            const { data: user, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', session.user.id)
                .single();

            let targetCompanyId = user?.company_id || session.user.user_metadata?.company_id;

            if (!targetCompanyId) {
                const { data: companies } = await supabase.from('companies').select('id').order('created_at', { ascending: false }).limit(1);
                if (companies && companies.length > 0) {
                    targetCompanyId = companies[0].id;
                    await supabase.from('users').update({ company_id: targetCompanyId }).eq('id', session.user.id);
                }
            }

            if (user && !error) {
                const mappedUser = {
                    ...user,
                    companyId: targetCompanyId,
                    employeeId: user.employee_id,
                    sequentialId: user.sequential_id,
                    baseSalary: user.base_salary,
                    baseHours: user.base_hours,
                    hireDate: new Date(user.created_at || new Date())
                } as User;
                localStorage.setItem('nobreza_current_user', JSON.stringify(mappedUser));
                return mappedUser;
            }

            const { data: secondaryUser, error: secondaryError } = await supabase
                .from('users')
                .select('*')
                .ilike('email', session.user.email)
                .single();

            if (secondaryUser && !secondaryError) {
                const mappedUser = {
                    ...secondaryUser,
                    companyId: targetCompanyId || secondaryUser.company_id,
                    employeeId: secondaryUser.employee_id,
                    sequentialId: secondaryUser.sequential_id,
                    baseSalary: secondaryUser.base_salary,
                    baseHours: secondaryUser.base_hours,
                    hireDate: new Date(secondaryUser.created_at || new Date())
                } as User;
                localStorage.setItem('nobreza_current_user', JSON.stringify(mappedUser));
                return mappedUser;
            }
        } catch (e) {
            console.error("Sync session error:", e);
        }

        return AuthService.getCurrentUser();
    },

    getCurrentUser: (): User | null => {
        const stored = localStorage.getItem('nobreza_current_user');
        if (!stored) return null;
        try {
            const user = JSON.parse(stored);
            return { ...user, companyId: user.companyId || user.company_id, hireDate: new Date(user.hireDate || user.created_at) };
        } catch (e) {
            return null;
        }
    },

    getTeam: async (): Promise<User[]> => {
        const currentUser = AuthService.getCurrentUser();
        if (!currentUser) return [];

        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('company_id', currentUser.companyId)
            .order('name');

        if (error) {
            console.error("Error fetching team:", error);
            return [];
        }

        return (data || []).map(u => ({
            ...u,
            employeeId: u.employee_id,
            sequentialId: u.sequential_id,
            baseSalary: u.base_salary,
            baseHours: u.base_hours,
            hireDate: new Date(u.created_at || new Date())
        }));
    },

    saveTeamMember: async (user: User): Promise<User> => {
        const currentUser = AuthService.getCurrentUser();
        if (!currentUser) throw new Error("Apenas administradores podem gerir a equipa.");

        const payload = {
            id: user.id || undefined,
            employee_id: user.employeeId,
            name: user.name,
            email: user.email,
            contact: user.contact,
            location: user.location,
            responsibility: user.responsibility,
            social_security_number: user.socialSecurityNumber,
            base_salary: user.baseSalary,
            base_hours: user.baseHours,
            role: user.role,
            company_id: currentUser.companyId,
            active: user.active ?? true
        };

        const { data, error } = await supabase
            .from('users')
            .upsert(payload)
            .select()
            .single();

        if (error) throw error;

        return {
            ...data,
            companyId: data.company_id,
            employeeId: data.employee_id,
            sequentialId: data.sequential_id,
            baseSalary: data.base_salary,
            baseHours: data.base_hours,
            hireDate: new Date(data.created_at || new Date())
        } as User;
    },

    updateTeam: async (newTeam: User[]): Promise<void> => {
        const currentUser = AuthService.getCurrentUser();
        if (!currentUser) return;

        const safeTeam = newTeam.map(u => ({
            ...u,
            company_id: currentUser.companyId,
            base_salary: u.baseSalary,
            base_hours: u.baseHours
        }));

        const { error } = await supabase.from('users').upsert(safeTeam);
        if (error) console.error("Error updating team:", error);
    },

    updateProfile: async (user: User): Promise<void> => {
        const { error } = await supabase
            .from('users')
            .update({
                name: user.name,
                email: user.email,
                contact: user.contact,
                location: user.location,
                social_security_number: user.socialSecurityNumber,
                photo: user.photo
            })
            .eq('id', user.id);

        if (error) throw new Error("Erro ao atualizar perfil: " + error.message);

        const current = AuthService.getCurrentUser();
        if (current && current.id === user.id) {
            localStorage.setItem('nobreza_current_user', JSON.stringify(user));
            // Dispatch event for App.tsx to pick up changes immediately
            window.dispatchEvent(new CustomEvent('nobreza-user-updated', { detail: user }));
        }
    },

    activateAccount: async (email: string, password: string, name: string): Promise<void> => {
        const normalizedEmail = email.toLowerCase().trim();

        const { data: exists, error: profileError } = await supabase
            .rpc('check_user_active_profile', { target_email: normalizedEmail });

        if (profileError || !exists) {
            throw new Error("Utilizador não encontrado na nossa base de dados. Por favor, contacte o administrador para ser adicionado à equipa.");
        }

        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: normalizedEmail,
            password,
            options: {
                data: { name }
            }
        });

        if (authError) {
            if (authError.message.includes("already registered")) {
                throw new Error("Esta conta já está registada. Por favor, tente iniciar sessão ou utilize a opção 'Esqueceu a Senha'.");
            }
            throw new Error(authError.message);
        }

        if (!authData.user) throw new Error("Falha ao criar conta de autenticação.");

        const { data: claimed, error: claimError } = await supabase.rpc('claim_public_profile', {
            target_email: normalizedEmail
        });

        if (claimError) {
            console.error("Claim error:", claimError);
            throw new Error("Conta ativada, mas erro ao vincular perfil: " + claimError.message);
        }
    },

    resetPassword: async (email: string): Promise<void> => {
        // Check if user exists first for better feedback (RLS Safe)
        const { data: userExists, error: rpcError } = await supabase
            .rpc('check_user_active_profile', { target_email: email.toLowerCase().trim() });

        if (rpcError) console.error("RPC Error:", rpcError);

        if (!userExists) {
            throw new Error('E-mail não encontrado no sistema. Verifique se digitou corretamente.');
        }

        const { data, error } = await supabase.functions.invoke('resend-domains', {
            body: {
                action: 'REQUEST_PASSWORD_RESET',
                email: email.toLowerCase().trim(),
                redirectTo: `${window.location.origin}/#reset-password`
            }
        });

        if (error) throw new Error("Erro na comunicação com o servidor de email: " + error.message);
        if (data?.error) throw new Error(data.error);
    },

    updateUserPassword: async (password: string): Promise<void> => {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw new Error(error.message);
    },

    sendMagicLink: async (email: string): Promise<void> => {
        const { data, error } = await supabase.functions.invoke('resend-domains', {
            body: {
                action: 'SEND_MAGIC_LINK',
                email: email.toLowerCase().trim(),
                redirectTo: `${window.location.origin}`
            }
        });

        if (error) throw new Error("Erro na Edge Function: " + error.message);
        if (data?.error) throw new Error(data.error);
    }
};
