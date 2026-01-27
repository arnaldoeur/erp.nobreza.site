import { supabase } from './supabase';
import { EmailAccount, User } from '../types';
import { AuthService } from './auth.service';

export const EmailAccountService = {
    async getAccounts(companyId: string) {
        const currentUser = AuthService.getCurrentUser();
        if (!currentUser) return [];

        // 1. Fetch company accounts (Shared/Team) + Personal account of the current user
        const { data: userAccounts, error } = await supabase
            .from('erp_email_accounts')
            .select('*')
            .eq('company_id', companyId)
            .or(`account_type.neq.PERSONAL,user_id.eq.${currentUser.id}`)
            .order('created_at', { ascending: false });

        if (error) throw error;

        let allAccounts = (userAccounts || []) as EmailAccount[];

        // 2. Ensure Personal Virtual Account exists in DB
        // Format: [name][last2Id]@nobreza.site
        const namePart = currentUser.name.split(' ')[0].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const idPart = String(currentUser.sequentialId || '00').slice(-2).padStart(2, '0');
        const virtualEmail = `${namePart}${idPart}@nobreza.site`;

        // Check if personal virtual already exists for this user
        let personalAccount = allAccounts.find(a => a.user_id === currentUser.id && a.account_type === 'PERSONAL');

        if (!personalAccount) {
            // Check in DB specifically in case it wasn't in the company filter for some reason
            const { data: dbPersonal } = await supabase
                .from('erp_email_accounts')
                .select('*')
                .eq('user_id', currentUser.id)
                .eq('account_type', 'PERSONAL')
                .maybeSingle();

            personalAccount = dbPersonal as EmailAccount;
        }

        if (personalAccount) {
            // Check if email needs update to new naming convention
            if (personalAccount.email !== virtualEmail && virtualEmail.includes('@nobreza.site')) {
                const { data: updatedAcc } = await supabase
                    .from('erp_email_accounts')
                    .update({ email: virtualEmail })
                    .eq('id', personalAccount.id)
                    .select()
                    .single();

                if (updatedAcc) {
                    personalAccount = updatedAcc as EmailAccount;
                    allAccounts = allAccounts.map(a => a.id === personalAccount.id ? personalAccount : a);
                }
            }
        } else {
            // Create it
            const { data: newAcc, error: createError } = await supabase
                .from('erp_email_accounts')
                .insert([{
                    company_id: Number(companyId),
                    user_id: currentUser.id,
                    account_type: 'PERSONAL',
                    display_name: `${currentUser.name}`,
                    email: virtualEmail,
                    is_active: true,
                    smtp_host: 'smtp.resend.com',
                    smtp_port: 465,
                    smtp_user: 'resend',
                    smtp_pass: 'virtual',
                    smtp_secure: true
                }])
                .select()
                .single();

            if (!createError && newAcc) {
                personalAccount = newAcc as EmailAccount;
                allAccounts.unshift(personalAccount);
            }
        }

        // 3. Ensure Folders for Personal Account
        if (personalAccount) {
            await this.ensureDefaultFolders(personalAccount.id);
        }

        // 4. Fetch the global system account
        const SYSTEM_ACCOUNT_ID = '00000000-0000-0000-0000-000000000000';
        const { data: systemAccount } = await supabase
            .from('erp_email_accounts')
            .select('*')
            .eq('id', SYSTEM_ACCOUNT_ID)
            .single();

        if (systemAccount) {
            if (!allAccounts.find(a => a.id === systemAccount.id)) {
                allAccounts.push(systemAccount as EmailAccount);
            }
            // Ensure Folders for System Account
            await this.ensureDefaultFolders(SYSTEM_ACCOUNT_ID);
        }

        return allAccounts;
    },

    async ensureDefaultFolders(accountId: string) {
        const types = [
            { type: 'INBOX', name: 'Entrada' },
            { type: 'SENT', name: 'Enviados' },
            { type: 'DRAFT', name: 'Rascunhos' },
            { type: 'TRASH', name: 'Lixo' }
        ];

        const { data: existing } = await supabase
            .from('erp_email_folders')
            .select('type')
            .eq('account_id', accountId);

        const existingTypes = (existing || []).map(f => f.type);
        const missing = types.filter(t => !existingTypes.includes(t.type));

        if (missing.length > 0) {
            const inserts = missing.map(m => ({
                account_id: accountId,
                name: m.name,
                type: m.type,
                path: m.type
            }));
            await supabase.from('erp_email_folders').insert(inserts);
        }
    },

    async saveAccount(account: Partial<EmailAccount>) {
        const payload = { ...account };
        if (payload.company_id) {
            payload.company_id = Number(payload.company_id);
        }

        const { data, error } = await supabase
            .from('erp_email_accounts')
            .upsert([payload])
            .select();

        if (error) throw error;
        return data[0] as EmailAccount;
    },

    async deleteAccount(id: string) {
        const { error } = await supabase
            .from('erp_email_accounts')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    },

    async testConnection(accountId: string) {
        console.log(`Testing SMTP account: ${accountId}`);

        try {
            const { data, error } = await supabase.functions.invoke('send-email', {
                body: {
                    type: 'TEST_CONNECTION',
                    accountId: accountId
                }
            });

            if (error) {
                // If the edge function is failing at network level, we report it clearly
                throw new Error(`Servidor de Funções Indisponível: ${error.message || 'Erro de Conexão'}`);
            }

            return data;
        } catch (e: any) {
            console.error('SMTP Test Failure:', e);
            // Help the user identify if it's a local dev issue or a real SMTP error
            return {
                success: false,
                error: e.message,
                message: "Não foi possível contactar o motor de e-mail no Supabase. Verifique a sua ligação à internet."
            };
        }
    }
};
