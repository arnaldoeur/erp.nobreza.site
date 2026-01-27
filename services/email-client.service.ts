import { supabase } from './supabase';
import { EmailFolder, EmailMessage } from '../types';

export const EmailClientService = {
    /**
     * Fetch folders for an account from local DB cache
     */
    async getFolders(accountId: string) {
        const { data, error } = await supabase
            .from('erp_email_folders')
            .select('*')
            .eq('account_id', accountId)
            .order('name');

        if (error) throw error;
        return data as EmailFolder[];
    },

    /**
     * Fetch messages for a folder from local DB cache
     */
    async getMessages(folderId: string, page = 1, pageSize = 20, toAddr?: string) {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        // Check if folder is null (unified inbox? not supported yet)
        if (!folderId) return { data: [], count: 0 };

        let query = supabase
            .from('erp_emails_metadata')
            .select('*', { count: 'exact' })
            .eq('folder_id', folderId);

        if (toAddr) {
            query = query.contains('to_addr', [toAddr]);
        }

        const { data, error, count } = await query
            .order('date', { ascending: false })
            .range(from, to);

        if (error) throw error;
        return { data: data as EmailMessage[], count };
    },

    /**
     * Send email using Resend API (for verified domains)
     */
    async sendEmailViaResend(from: string, to: string[], subject: string, html: string, attachments?: any[]) {
        console.log('[EmailService] Sending via Resend API...');
        const { data, error } = await supabase.functions.invoke('resend-domains', {
            body: {
                action: 'SEND_EMAIL',
                from,
                to,
                subject,
                html,
                attachments
            }
        });
        if (error) throw error;

        // Return whole data which includes 'id' from Resend
        return data;
    },

    /**
     * Trigger IMAP sync via Edge Function
     */
    async syncAccount(accountId: string) {
        console.log('[EmailService] Syncing account:', accountId);
        try {
            const { data, error } = await supabase.functions.invoke('sync-email', {
                body: {
                    action: 'SYNC_FOLDERS',
                    accountId
                }
            });

            if (error) {
                console.error('[EmailService] Sync Account HTTP Error:', error);
                throw new Error(`Erro na conexão com servidor: ${error.message || 'Falha desconhecida'}`);
            }

            if (data?.error) {
                console.error('[EmailService] Sync Account Function Error:', data.error);
                throw new Error(`Erro no servidor de email: ${data.error}`);
            }

            console.log('[EmailService] Sync Account Result:', data);
            return data;
        } catch (e: any) {
            console.error('[EmailService] Sync Account Exception:', e);
            throw e;
        }
    },

    /**
     * Sync specific folder
     */
    async syncFolder(accountId: string, path: string) {
        console.log('[EmailService] Syncing folder:', path);
        try {
            const { data, error } = await supabase.functions.invoke('sync-email', {
                body: {
                    action: 'SYNC_MESSAGES',
                    accountId,
                    path
                }
            });
            if (error) {
                console.error('[EmailService] Sync Folder HTTP Error:', error);
                throw error;
            }
            if (data?.error) {
                console.error('[EmailService] Sync Folder Function Error:', data.error);
                throw new Error(data.error);
            }
            return data;
        } catch (e) {
            console.error('[EmailService] Sync Folder Exception:', e);
            throw e;
        }
    },

    /**
     * Log a system-generated email to erp_emails_metadata
     */
    async logSystemEmail(payload: {
        company_id: string | number;
        to_addr: string[];
        subject: string;
        body_html: string;
        snippet?: string;
    }) {
        const systemAccountId = '00000000-0000-0000-0000-000000000000';

        // Find Sent folder for system account
        const { data: folder } = await supabase
            .from('erp_email_folders')
            .select('id')
            .eq('account_id', systemAccountId)
            .eq('type', 'SENT')
            .single();

        if (!folder) return;

        const { error } = await supabase.from('erp_emails_metadata').insert({
            account_id: systemAccountId,
            folder_id: folder.id,
            uid: Math.floor(Date.now() / 1000),
            subject: payload.subject,
            from_addr: 'sistema@nobreza.site',
            from_name: 'Sistema Nobreza',
            to_addr: payload.to_addr,
            date: new Date().toISOString(),
            snippet: payload.snippet || payload.body_html.substring(0, 100).replace(/<[^>]*>?/gm, ''),
            body_structure: { html: payload.body_html },
            flags: ['SEEN']
        });

        if (error) console.warn('[EmailService] Failed to log system email:', error);
    }
};
