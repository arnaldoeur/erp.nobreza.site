import { supabase } from './supabase';
import { DailyClosure, CompanyInfo, User, AppNotification } from '../types';
import { NotificationTemplates } from './notification-templates';

/**
 * Service to handle system notifications via Email.
 * Refactored to send emails NATIVELY via Resend API to ensure maximum reliability.
 */
export const NotificationService = {

    /**
     * Sends a summary email upon Daily Closure.
     */
    sendDailyClosureEmail: async (closure: DailyClosure, companyInfo: CompanyInfo, user: User) => {
        return NotificationService.invokeNativeEmail({
            type: 'DAILY_REPORT', // Or a custom mapping
            template: 'MONTHLY_REPORT',
            to: Array.from(new Set([user.email, companyInfo.email])).filter(Boolean),
            data: {
                user_name: user.name,
                user_id: user.id,
                company_name: companyInfo.name,
                month: new Date(closure.closureDate).toLocaleDateString('pt-PT', { month: 'long' }),
                // Custom data for the template if needed
            }
        });
    },

    /**
     * Sends a Welcome email to a new user and a notification to the administrator.
     */
    sendUserOnboarding: async (newUser: User, companyInfo: CompanyInfo) => {
        // 1. Welcome to the User
        await NotificationService.invokeNativeEmail({
            type: 'USER_WELCOME',
            template: 'USER_WELCOME',
            to: Array.from(new Set([newUser.email, companyInfo.email])).filter(Boolean),
            data: {
                user_name: newUser.name,
                user_id: newUser.id,
                company_name: companyInfo.name,
                role: newUser.role
            }
        });

        // 2. Alert the Admin (Standard Email for now since no template provided for "Admin Alert")
        return NotificationService.invokeNativeEmail({
            type: 'ADMIN_ALERT_NEW_USER',
            to: [companyInfo.email],
            subject: `[${companyInfo.name}] Novo Utilizador Registado`,
            data: {
                userName: newUser.name,
                role: newUser.role,
                timestamp: new Date().toISOString()
            }
        });
    },

    /**
     * Sends a Stock Alert Report.
     */
    sendStockAlert: async (lowStockItems: any[], companyInfo: CompanyInfo) => {
        // 1. Send In-App to Warehouse/Admins
        await NotificationService.notifyRole(String(companyInfo.id), ['ADMIN', 'TECHNICIAN'], {
            type: 'STOCK',
            title: '⚠️ Alerta de Stock Baixo',
            content: `${lowStockItems.length} produtos atingiram o nível mínimo. Verifique o inventário.`,
            metadata: { count: lowStockItems.length }
        });

        // 2. Send Email
        const item = lowStockItems[0];
        return NotificationService.invokeNativeEmail({
            type: 'STOCK_ALERT',
            template: 'STOCK_LOW',
            to: Array.from(new Set([companyInfo.email])).filter(Boolean),
            data: {
                user_name: 'Gestor',
                company_name: companyInfo.name,
                product_name: item.name,
                quantity: item.quantity
            }
        });
    },

    /**
     * Generic method for Task/Agenda/Chat alerts.
     */
    sendManagementAlert: async (type: 'TASK' | 'AGENDA' | 'CHAT' | 'CUSTOMER' | 'SUPPLIER', title: string, details: string, companyInfo: CompanyInfo, recipientEmail?: string, recipientId?: string) => {
        const templateMap: Record<string, string> = {
            'TASK': 'TASK_PENDING',
            'CUSTOMER': 'BRAND_MSG_2', // Fallback or specific
            'SUPPLIER': 'PURCHASE_RECOMMENDATION'
        };

        // 1. In-App Notification (if recipientId provided)
        if (recipientId) {
            await NotificationService.sendInApp({
                userId: recipientId,
                type: type === 'TASK' ? 'SYSTEM' : 'SYSTEM',
                title: `Nova Atualização: ${type}`,
                content: `${title}: ${details}`,
                metadata: { type, title }
            });
        }

        return NotificationService.invokeNativeEmail({
            type: `MANAGEMENT_${type}`,
            template: templateMap[type] || 'BRAND_MSG_2',
            to: Array.from(new Set([recipientEmail || companyInfo.email, companyInfo.email])).filter(Boolean),
            data: {
                company_name: companyInfo.name,
                task_name: title,
                product_name: title, // For recommendations
                details
            }
        });
    },

    /**
     * Broadcasts an notification to all users with specific roles in a company.
     */
    notifyRole: async (companyId: string, roles: string[], notification: Partial<AppNotification>) => {
        try {
            const { data: users } = await supabase
                .from('users')
                .select('id')
                .eq('company_id', companyId)
                .in('role', roles);

            if (users && users.length > 0) {
                const notifications = users.map(u => ({
                    user_id: u.id,
                    type: notification.type || 'SYSTEM',
                    title: notification.title,
                    content: notification.content,
                    metadata: notification.metadata || {}
                }));

                await supabase.from('notifications').insert(notifications);
            }
        } catch (error) {
            console.error('Failed to broadcast notification:', error);
        }
    },

    /**
     * Creates an In-App notification in the database.
     */
    sendInApp: async (notification: Partial<AppNotification>) => {
        try {
            const { data, error } = await supabase.from('notifications').insert([{
                user_id: notification.userId,
                type: notification.type,
                title: notification.title,
                content: notification.content,
                metadata: notification.metadata || {}
            }]).select();

            if (error) throw error;
            return data[0];
        } catch (error) {
            console.error('Failed to create In-App notification:', error);
            return null;
        }
    },

    /**
     * Gets notifications for a user.
     */
    getNotifications: async (userId: string): Promise<AppNotification[]> => {
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data.map((n: any) => ({
                id: n.id,
                userId: n.user_id,
                type: n.type,
                title: n.title,
                content: n.content,
                read: n.read,
                metadata: n.metadata,
                createdAt: new Date(n.created_at)
            }));
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
            return [];
        }
    },

    /**
     * Mark a notification as read.
     */
    markAsRead: async (id: string) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ read: true })
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
            return false;
        }
    },

    /**
     * Sends a System Alert.
     */
    sendSystemAlert: async (type: string, companyInfo: CompanyInfo, user: User, details: string) => {
        // 1. Notify Admins In-App
        await NotificationService.notifyRole(String(companyInfo.id), ['ADMIN'], {
            type: 'SYSTEM',
            title: `🚨 Alerta de Sistema: ${type}`,
            content: `Ação por ${user.name}: ${details}`,
            metadata: { type, user: user.name }
        });

        // 2. Send Email
        return NotificationService.invokeNativeEmail({
            type: `SYSTEM_${type}`,
            to: [companyInfo.email],
            subject: `[${companyInfo.name}] Alerta de Sistema: ${type}`,
            data: {
                type,
                userName: user.name,
                details,
                timestamp: new Date().toISOString()
            }
        });
    },

    /**
     * Native implementation of email sending via Resend API.
     */
    invokeNativeEmail: async (payload: any) => {
        console.log(`Sending Email (Native): ${payload.type} to ${payload.to}`);

        const d = payload.data || {};
        let html = '';
        let subject = payload.subject;

        // Apply Template if provided
        if (payload.template && (NotificationTemplates as any)[payload.template]) {
            const tmpl = (NotificationTemplates as any)[payload.template];
            subject = tmpl.subject;
            html = tmpl.html;

            // Replace Placeholders
            Object.keys(d).forEach(key => {
                const regex = new RegExp(`{{${key}}}`, 'g');
                subject = subject.replace(regex, d[key]);
                html = html.replace(regex, d[key]);
            });
        } else {
            // Fallback for non-templated emails
            html = payload.html || `
                <div style="font-family: sans-serif; padding: 20px;">
                    <h2 style="color: #064e3b;">${payload.subject}</h2>
                    <hr/>
                    <div style="background: #f9f9f9; padding: 15px; border-radius: 8px;">
                        ${JSON.stringify(d)}
                    </div>
                </div>
            `;
        }

        try {
            console.log('[NotificationService] Routing email via edge function...');

            // Determine Sender
            let fromAddr = 'Nobreza ERP <sistema@nobreza.site>';

            // Priority: Explicit Sender > Dynamic User Email > System Default
            if (payload.from) {
                fromAddr = payload.from;
            } else if (payload.data && payload.data.user_name && payload.data.user_id) {
                // Generate dynamic email: name + last 4 chars of ID
                const cleanName = payload.data.user_name.toLowerCase().replace(/[^a-z0-9]/g, '');
                const idSuffix = String(payload.data.user_id).slice(-4);
                const dynamicEmail = `${cleanName}${idSuffix}@nobreza.site`;
                fromAddr = `Nobreza ERP <${dynamicEmail}>`;
            }

            const { data: result, error } = await supabase.functions.invoke('resend-domains', {
                body: {
                    action: 'SEND_EMAIL',
                    from: fromAddr,
                    to: (Array.isArray(payload.to) ? payload.to : [payload.to]).filter(Boolean),
                    subject: subject || 'Nobreza ERP Notification',
                    html: html || '<p>Mensagem sem conteúdo</p>'
                }
            });

            console.log('[NotificationService] Edge function raw result:', result);
            if (error) console.error('[NotificationService] Supabase Invoke Error:', error);

            if (error) {
                console.error('Edge function error:', error);
                throw new Error(error.message || 'Erro na Edge Function');
            }

            if (result?.error) {
                console.error('Resend API error:', result.error);
                throw new Error(result.error);
            }

            // Log to System Mailbox
            await NotificationService.logEmailToSystemMailbox({
                from_addr: fromAddr,
                from_name: 'Nobreza ERP',
                to_addr: Array.isArray(payload.to) ? payload.to : [payload.to],
                subject: payload.subject,
                snippet: html.replace(/<[^>]*>?/gm, '').substring(0, 100),
                body_structure: { html },
                resend_id: result?.id
            });

            // TRIGGER IN-APP NOTIFICATION FOR SENDER/ADMIN
            // We notify the current user (if known) or just log it as a system event that might reach admins
            // attempting to extract user_id from payload data if available, or just broadcast to admin if generic
            const recipientId = payload.data?.user_id;

            if (recipientId) {
                await NotificationService.sendInApp({
                    userId: recipientId,
                    type: 'EMAIL_SENT',
                    title: '📧 E-mail Enviado',
                    content: `E-mail "${payload.subject}" enviado para ${payload.to}`,
                    metadata: { type: 'EMAIL', resend_id: result?.id }
                });
            } else {
                // If we don't know the specific user context, maybe notify the company admin?
                // For now, let's just log it if we have a company ID. 
                // We'll skip generic broadcast to avoid spamming everyone for every system email unless critical.
            }

            return true;
        } catch (error: any) {
            console.error('Native email sending failed:', error);
            throw new Error(error.message || 'Falha no envio de e-mail');
        }
    },

    /**
     * Logs an email to the virtual system mailbox table.
     */
    logEmailToSystemMailbox: async (data: any) => {
        try {
            const SYSTEM_ACCOUNT_ID = '00000000-0000-0000-0000-000000000000';

            // Try to find the correct folder ID for 'SENT' instead of hardcoding
            const { data: folder } = await supabase
                .from('erp_email_folders')
                .select('id')
                .eq('account_id', SYSTEM_ACCOUNT_ID)
                .eq('type', 'SENT')
                .single();

            const targetFolderId = folder?.id || '00000000-0000-0000-0000-000000000001';

            const { error: logError } = await supabase
                .from('erp_emails_metadata')
                .insert([{
                    account_id: SYSTEM_ACCOUNT_ID,
                    folder_id: targetFolderId,
                    from_addr: data.from_addr,
                    from_name: data.from_name,
                    to_addr: Array.isArray(data.to_addr) ? data.to_addr : [data.to_addr],
                    subject: data.subject,
                    snippet: data.snippet,
                    body_structure: data.body_structure,
                    resend_id: data.resend_id,
                    date: new Date().toISOString(),
                    flags: ['SEEN']
                }]);

            if (logError) {
                console.error('Failed to log email to system mailbox:', logError);
            } else {
                console.log('[NotificationService] System email logged successfully to folder:', targetFolderId);
            }
        } catch (e) {
            console.error('Exception logging to system mailbox:', e);
        }
    },

    /**
     * Comprehensive test for notifications (In-App + Email).
     */
    sendTestNotifications: async (user: User, companyInfo: CompanyInfo) => {
        console.log('[NotificationService] Starting system test...');

        try {
            // 1. In-App Notification
            await NotificationService.sendInApp({
                userId: user.id,
                type: 'SYSTEM',
                title: '🛠️ Teste de Sistema',
                content: `Este é um alerta de teste iniciado em ${new Date().toLocaleTimeString()}. Se você vê isto, as notificações In-App estão OK!`,
                metadata: { test: true, timestamp: new Date().toISOString() }
            });

            // 2. Native Email Notification
            await NotificationService.invokeNativeEmail({
                type: 'TEST_CONNECTION',
                to: [user.email, companyInfo.email].filter(Boolean),
                subject: '🚀 Teste de Conexão Nobreza ERP',
                data: {
                    tester: user.name,
                    company: companyInfo.name,
                    timestamp: new Date().toISOString()
                }
            });

            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
};
