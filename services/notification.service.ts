import { DailyClosure, CompanyInfo, User, AppNotification, Sale } from '../types';
import { NotificationTemplates } from './notification-templates';
import { api } from './api';

/**
 * Notificações do sistema: por e-mail e dentro da aplicação.
 *
 * A superfície pública mantém-se, mas o transporte mudou por completo:
 *
 *  - O envio deixa de passar pela Edge Function `resend-domains`, que não
 *    validava autenticação, respondia a qualquer origem e aceitava remetente,
 *    destinatário e corpo livres. Era um relay aberto para o domínio.
 *
 *  - O remetente deixa de ser escolhido aqui. A versão anterior construía um
 *    endereço dinâmico a partir do nome do utilizador e enviava-o ao serviço
 *    de e-mail, que o aceitava sem verificar. Agora o servidor usa sempre o
 *    remetente configurado, e o campo nem sequer é enviado.
 *
 * Os modelos de mensagem continuam a ser preenchidos aqui, porque dependem
 * de dados que a interface já tem em mãos.
 */

/** Preenche um modelo, escapando os valores para não permitir injeção de HTML. */
function renderTemplate(templateName: string | undefined, data: Record<string, any>, fallbackSubject?: string) {
    const escape = (value: any) => String(value ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

    const template = templateName ? (NotificationTemplates as any)[templateName] : null;

    if (template) {
        let subject = template.subject as string;
        let html = template.html as string;
        for (const [key, value] of Object.entries(data)) {
            const pattern = new RegExp(`{{${key}}}`, 'g');
            subject = subject.replace(pattern, escape(value));
            html = html.replace(pattern, escape(value));
        }
        return { subject, html };
    }

    const generic = (NotificationTemplates as any).GENERIC_ACTION;
    const subject = fallbackSubject || 'Notificação Nobreza ERP';
    const details = typeof data === 'string' ? data : (data.details || data.message || '');
    const html = (generic?.html as string || '<p>{{details}}</p>')
        .replace(/{{title}}/g, escape(subject))
        .replace(/{{details}}/g, escape(details));

    return { subject, html };
}

async function deliver(to: string | string[], subject: string, html: string): Promise<boolean> {
    const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean);
    if (recipients.length === 0) return false;

    try {
        await api.post('/email/send', { to: recipients, subject, html });
        return true;
    } catch (error) {
        // Uma notificação que não sai não pode fazer falhar a venda, o fecho
        // de caixa ou o registo que a originou.
        console.error('[notificações] Falha no envio:', error);
        return false;
    }
}

export const NotificationService = {
    /** Resumo do fecho de caixa, para o responsável e para a empresa. */
    sendDailyClosureEmail: async (closure: DailyClosure, companyInfo: CompanyInfo, user: User) => {
        const { subject, html } = renderTemplate('MONTHLY_REPORT', {
            user_name: user.name,
            company_name: companyInfo.name,
            month: new Date(closure.closureDate).toLocaleDateString('pt-PT', { month: 'long' }),
        }, `[${companyInfo.name}] Fecho de Caixa`);

        return deliver([user.email, companyInfo.email], subject, html);
    },

    sendUserOnboarding: async (newUser: User, companyInfo: CompanyInfo) => {
        const { subject, html } = renderTemplate('USER_WELCOME', {
            user_name: newUser.name,
            company_name: companyInfo.name,
            role: newUser.role,
        }, `Bem-vindo(a) ao ${companyInfo.name}`);

        return deliver([newUser.email, companyInfo.email], subject, html);
    },

    sendStockAlert: async (lowStockItems: any[], companyInfo: CompanyInfo) => {
        if (!lowStockItems || lowStockItems.length === 0) return false;

        const rows = lowStockItems
            .map((item) => `<li><strong>${item.name}</strong> — ${item.quantity} em stock (mínimo ${item.minStock ?? item.min_stock})</li>`)
            .join('');

        const { subject, html } = renderTemplate(undefined, {
            details: `<ul style="padding-left:18px;">${rows}</ul>`,
        }, `[${companyInfo.name}] Alerta de Stock Baixo`);

        return deliver([companyInfo.email], subject, html);
    },

    sendSaleEmail: async (sale: Sale, companyInfo: CompanyInfo, user: User) => {
        const { subject, html } = renderTemplate(undefined, {
            details: `Venda registada por ${user.name} no valor de ${sale.total.toFixed(2)} MT (${sale.paymentMethod}).`,
        }, `[${companyInfo.name}] Nova Venda`);

        return deliver([companyInfo.email], subject, html);
    },

    sendManagementAlert: async (
        type: 'TASK' | 'AGENDA' | 'CHAT' | 'CUSTOMER' | 'SUPPLIER',
        title: string,
        details: string,
        companyInfo: CompanyInfo,
        recipientEmail?: string
    ) => {
        const { subject, html } = renderTemplate(undefined, { details }, `[${companyInfo.name}] ${title}`);
        return deliver([recipientEmail || companyInfo.email], subject, html);
    },

    sendSystemAlert: async (type: string, companyInfo: CompanyInfo, user: User, details: string) => {
        const { subject, html } = renderTemplate(undefined, { details }, `[${companyInfo.name}] ${type}`);
        return deliver([companyInfo.email], subject, html);
    },

    /**
     * Envio genérico com modelo.
     *
     * Mantido para os pontos do sistema que compõem a mensagem à medida. O
     * campo `from` do payload é ignorado: o remetente é fixado pelo servidor.
     * Era precisamente a liberdade de o escolher que tornava o mecanismo
     * anterior utilizável como relay para o domínio.
     */
    invokeNativeEmail: async (payload: {
        to: string | string[];
        subject?: string;
        template?: string;
        data?: Record<string, any>;
    }): Promise<boolean> => {
        const { subject, html } = renderTemplate(payload.template, payload.data ?? {}, payload.subject);
        return deliver(payload.to, subject, html);
    },

    // -------------------------------------------------------------------------
    // Notificações dentro da aplicação
    // -------------------------------------------------------------------------

    /**
     * Cria uma notificação para membros da equipa.
     *
     * Restrita a administradores no servidor. Sem essa restrição, qualquer
     * utilizador poderia emitir avisos em nome do sistema.
     */
    sendInApp: async (notification: Partial<AppNotification> & { userIds?: string[] }) => {
        try {
            await api.post('/notifications', {
                title: notification.title,
                content: notification.content,
                type: notification.type,
                metadata: notification.metadata,
                userIds: notification.userIds ?? (notification.userId ? [notification.userId] : undefined),
            });
            return true;
        } catch (error) {
            console.error('[notificações] Falha ao criar notificação:', error);
            return false;
        }
    },

    /** Notifica todos os membros com determinados perfis. */
    notifyRole: async (_companyId: string, roles: string[], notification: Partial<AppNotification>) => {
        try {
            const team = await api.get<Array<{ id: string; role: string }>>('/team');
            const userIds = team.filter((member) => roles.includes(member.role)).map((member) => member.id);
            if (userIds.length === 0) return false;

            return NotificationService.sendInApp({ ...notification, userIds });
        } catch (error) {
            console.error('[notificações] Falha ao notificar perfis:', error);
            return false;
        }
    },

    /**
     * Notificações do utilizador da sessão.
     *
     * O identificador deixou de ser um argumento: o servidor devolve apenas
     * as notificações de quem faz o pedido. Antes era possível pedir as de
     * outra pessoa passando o identificador dela.
     */
    getNotifications: async (): Promise<AppNotification[]> => {
        const notifications = await api.get<any[]>('/notifications');
        return notifications.map((item) => ({
            ...item,
            createdAt: new Date(item.createdAt),
        })) as AppNotification[];
    },

    getUnreadCount: async (): Promise<number> => {
        const { count } = await api.get<{ count: number }>('/notifications/unread-count');
        return count;
    },

    markAsRead: async (id: string): Promise<void> => {
        await api.patch(`/notifications/${id}/read`);
    },

    markAllAsRead: async (): Promise<void> => {
        await api.post('/notifications/read-all');
    },
};
