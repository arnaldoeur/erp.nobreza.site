import { User, UserRole } from '../types';

import { supabase } from './supabase';

export const AuthService = {
    login: async (email: string, password: string): Promise<User> => {
        // 1. Strict Authentication via Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (authError || !authData.user) {
            throw new Error('Credenciais inválidas (Password incorreta).');
        }

        // 2. Fetch User Profile from 'public.users'
        // Try linking by Auth ID (Best Practice)
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', authData.user.id)
            .single();

        let targetUser = user;

        // Fallback: If public user not found by ID (e.g. created manually), try by Email
        if (error || !targetUser) {
            const { data: legacyUser, error: legacyError } = await supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .single();

            // REPAIR LOGIC: If still no user, we create one automatically from Auth Data
            if (legacyError || !legacyUser) {
                console.warn("User record missing in public.users. Attempting auto-repair...");

                const repairUser = {
                    id: authData.user.id,
                    name: authData.user.user_metadata?.name || email.split('@')[0],
                    email: email,
                    company_id: authData.user.user_metadata?.company_id || null, // Best effort link
                    active: true,
                    role: 'ADMIN', // Default to Admin to ensure access
                    created_at: new Date()
                };

                // If company_id is null, try to find ANY company (Emergency Mode) or create a placeholder
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

        // 3. Verify Company Status
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
            baseSalary: targetUser.base_salary,
            baseHours: targetUser.base_hours,
            hireDate: new Date(targetUser.created_at || new Date())
        } as User;

        localStorage.setItem('nobreza_current_user', JSON.stringify(mappedUser));
        return mappedUser;
    },

    register: async (user: Partial<User>, password?: string): Promise<User> => {
        // Multi-tenant Registration:
        // 1. Create a "New Company" (Placeholder Name)
        // 2. Register in Supabase Auth
        // 3. Create User linked to Company in 'public.users'

        if (!user.email || !password) {
            throw new Error("Email e Palavra-passe são obrigatórios.");
        }

        // 1. Create Company (Public allowed)
        const { data: company, error: companyError } = await supabase
            .from('companies')
            .insert({
                name: user.name ? `Farmácia de ${user.name}` : 'Nova Farmácia',
                active: true,
                theme_color: '#10b981' // Emerald-500 default
            })
            .select()
            .single();

        if (companyError || !company) {
            console.error("Company creation error:", companyError);
            throw new Error('Erro ao criar empresa: ' + companyError.message);
        }

        // 2. Register in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: user.email,
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

        // 3. Create User in Public Table MANUALLY (Reverted per request)
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
            // Ignore Duplicate Key error (if Trigger ran properly)
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

        // Try to recover profile
        try {
            const { data: user, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', session.user.id)
                .single();

            let targetCompanyId = user?.company_id || session.user.user_metadata?.company_id;

            // If still no companyId, try to find the most recent one (Repair Mode)
            if (!targetCompanyId) {
                const { data: companies } = await supabase.from('companies').select('id').order('created_at', { ascending: false }).limit(1);
                if (companies && companies.length > 0) {
                    targetCompanyId = companies[0].id;
                    // Update user/profile with this salvaged ID
                    await supabase.from('users').update({ company_id: targetCompanyId }).eq('id', session.user.id);
                }
            }

            if (user && !error) {
                const mappedUser = {
                    ...user,
                    companyId: targetCompanyId,
                    baseSalary: user.base_salary,
                    baseHours: user.base_hours,
                    hireDate: new Date(user.created_at || new Date())
                } as User;
                localStorage.setItem('nobreza_current_user', JSON.stringify(mappedUser));
                return mappedUser;
            }

            // Fallback by email if ID match failed
            const { data: secondaryUser, error: secondaryError } = await supabase
                .from('users')
                .select('*')
                .eq('email', session.user.email)
                .single();

            if (secondaryUser && !secondaryError) {
                const mappedUser = {
                    ...secondaryUser,
                    companyId: targetCompanyId || secondaryUser.company_id,
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
            .eq('company_id', currentUser.companyId); // Data Isolation

        if (error) {
            console.error("Error fetching team:", error);
            return [];
        }

        return (data || []).map(u => ({
            ...u,
            baseSalary: u.base_salary,
            baseHours: u.base_hours,
            hireDate: new Date(u.created_at || new Date())
        }));
    },

    updateTeam: async (newTeam: User[]): Promise<void> => {
        // Generally should update individual users, but keeping signature
        const currentUser = AuthService.getCurrentUser();
        if (!currentUser) return;

        // Ensure all updated users belong to this company
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
                // Role is intentionally excluded for security (handled by Admin only)
            })
            .eq('id', user.id);

        if (error) throw new Error("Erro ao atualizar perfil: " + error.message);

        // Update local storage if it's the current user
        const current = AuthService.getCurrentUser();
        if (current && current.id === user.id) {
            localStorage.setItem('nobreza_current_user', JSON.stringify(user));
        }
    },

    activateAccount: async (email: string, password: string, name: string): Promise<void> => {
        // 1. Register in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { name }
            }
        });

        if (authError) throw new Error(authError.message);
        if (!authData.user) throw new Error("Falha ao criar conta.");

        // 2. Claim the placeholder profile
        const { data: claimed, error: claimError } = await supabase.rpc('claim_public_profile', {
            target_email: email
        });

        if (claimError) {
            console.error("Claim error:", claimError);
            throw new Error("Conta criada, mas erro ao vincular perfil: " + claimError.message);
        }

        if (!claimed) {
            // Edge case: No placeholder existed?
            // Depending on strictness, we might throw or just proceed as a fresh user
            console.warn("No placeholder profile found for email:", email);
        }

        // 3. Login immediately handled by signUp usually, but good to ensure session
    }
};
