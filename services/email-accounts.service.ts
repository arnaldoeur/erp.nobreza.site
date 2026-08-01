import { EmailAccount } from '../types';
import { api } from './api';

/**
 * Contas de e-mail configuradas no sistema.
 *
 * As palavras-passe SMTP e IMAP nunca chegam ao browser. O servidor devolve
 * apenas `has_smtp_password` e `has_imap_password`, o que basta para a
 * interface indicar se a conta está configurada. Antes eram guardadas em
 * texto simples e lidas por um `select('*')`.
 *
 * Ao gravar, um campo de palavra-passe vazio significa "manter a atual", e
 * não "apagar" — caso contrário seria impossível editar o nome de uma conta
 * sem voltar a escrever a palavra-passe.
 */

export const EmailAccountService = {
    async getAccounts(): Promise<EmailAccount[]> {
        return api.get<EmailAccount[]>('/email/accounts');
    },

    async saveAccount(account: Partial<EmailAccount>): Promise<EmailAccount> {
        return api.post<EmailAccount>('/email/accounts', account);
    },

    /**
     * Testa a ligação SMTP da conta.
     *
     * O teste corre no servidor, onde a credencial existe. Antes esta função
     * não testava nada — devolvia sempre sucesso.
     */
    async testConnection(accountId: string): Promise<{ ok: boolean; message: string }> {
        return api.post<{ ok: boolean; message: string }>(`/email/accounts/${accountId}/test`);
    },

    async deleteAccount(id: string): Promise<void> {
        await api.delete(`/email/accounts/${id}`);
    },
};
