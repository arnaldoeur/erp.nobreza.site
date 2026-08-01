import { EmailFolder, EmailMessage } from '../types';
import { api } from './api';

/**
 * Caixa de correio.
 *
 * O envio passa por `/api/email/send`, que usa o SMTP configurado no
 * servidor e um remetente fixo. A função anterior chamava uma Edge Function
 * sem autenticação, com CORS aberto, que aceitava remetente e destinatário
 * livres — qualquer pessoa na internet enviava e-mail em nome do domínio.
 */

export const EmailClientService = {
    async getFolders(accountId: string): Promise<EmailFolder[]> {
        return api.get<EmailFolder[]>(`/email/accounts/${accountId}/folders`);
    },

    async getMessages(folderId: string, page = 1, pageSize = 20): Promise<{ data: EmailMessage[]; count: number }> {
        if (!folderId) return { data: [], count: 0 };
        return api.get<{ data: EmailMessage[]; count: number }>(
            `/email/folders/${folderId}/messages?page=${page}&limit=${pageSize}`
        );
    },

    async sendEmail(to: string[], subject: string, html: string, replyTo?: string): Promise<void> {
        await api.post('/email/send', { to, subject, html, replyTo });
    },

    /**
     * Compatibilidade com o nome antigo.
     *
     * O envio já não passa pela Resend. O parâmetro `from` é aceite e
     * ignorado: o remetente é definido pelo servidor.
     */
    async sendEmailViaResend(_from: string, to: string[], subject: string, html: string, _attachments?: any[], replyTo?: string) {
        await EmailClientService.sendEmail(to, subject, html, replyTo);
        return { ok: true };
    },

    /**
     * Sincronização IMAP.
     *
     * Ainda não implementada nesta migração: a leitura de correio por IMAP
     * exige um processo de fundo que não fazia parte do que existia (o
     * módulo lia apenas o que estivesse em cache na base de dados, que nada
     * preenchia). As pastas e mensagens já guardadas continuam a ser lidas
     * normalmente.
     */
    async syncAccount(_accountId: string): Promise<{ synced: boolean; message: string }> {
        return { synced: false, message: 'Sincronização IMAP ainda não disponível nesta versão.' };
    },

    async syncFolder(_accountId: string, _path: string): Promise<{ synced: boolean; message: string }> {
        return { synced: false, message: 'Sincronização IMAP ainda não disponível nesta versão.' };
    },

    /** O registo de e-mails enviados é feito pelo servidor. */
    async logSystemEmail(_payload: Record<string, unknown>): Promise<void> {
        // Sem efeito no cliente: o servidor regista cada envio em system_logs.
    },

    async getDomains() {
        return api.get<Array<{ id: string; domain: string; status: string; dns_records: any[] }>>('/email/domains');
    },

    async addDomain(domain: string) {
        return api.post<{ id: string; domain: string; status: string; dns_records: any[] }>('/email/domains', { domain });
    },

    async setDomainStatus(id: string, status: 'not_started' | 'pending' | 'verified' | 'failed') {
        await api.patch(`/email/domains/${id}`, { status });
    },

    async deleteDomain(id: string): Promise<void> {
        await api.delete(`/email/domains/${id}`);
    },
};
