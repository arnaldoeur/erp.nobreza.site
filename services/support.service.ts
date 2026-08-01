import { api } from './api';

/**
 * Suporte e assistente de IA.
 *
 * A chave da OpenRouter estava escrita à mão neste ficheiro e, por estar no
 * código do frontend, era compilada para dentro do JavaScript servido a
 * qualquer visitante do site. Agora vive apenas no servidor: o browser
 * apenas faz a pergunta e recebe a resposta.
 *
 * O contexto de negócio (vendas, stock) também deixou de ser enviado daqui —
 * é o servidor que o reúne, a partir da empresa da sessão.
 */

export interface ChatThread {
    id: string;
    title: string;
    last_message_at: string;
    status: 'OPEN' | 'CLOSED' | 'ARCHIVED';
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    attachments?: any[];
    created_at?: string;
}

export const SupportService = {
    getThreads: async (): Promise<ChatThread[]> => {
        return api.get<ChatThread[]>('/support/chats?type=AI');
    },

    createThread: async (title = 'Nova Conversa'): Promise<ChatThread> => {
        return api.post<ChatThread>('/support/chats', { type: 'AI', title });
    },

    getMessages: async (chatId: string): Promise<ChatMessage[]> => {
        return api.get<ChatMessage[]>(`/support/chats/${chatId}/messages`);
    },

    /**
     * Envia a pergunta e devolve a resposta do assistente.
     *
     * Ambas as mensagens são gravadas pelo servidor, pelo que a conversa não
     * se perde se o browser fechar a meio.
     */
    ask: async (chatId: string, question: string): Promise<string> => {
        const { answer } = await api.post<{ answer: string }>(`/support/chats/${chatId}/ask`, { question });
        return answer;
    },

    /**
     * Envia a mensagem do utilizador e devolve a resposta do assistente.
     *
     * Substitui o par `sendMessage` + `generateAIResponse`: as duas metades
     * eram feitas em pedidos separados a partir do browser, o que deixava a
     * pergunta gravada sem resposta se a segunda falhasse. Agora é uma só
     * operação do lado do servidor.
     */
    sendMessage: async (chatId: string, content: string): Promise<string> => {
        return SupportService.ask(chatId, content);
    },

    getTickets: async () => {
        return api.get<any[]>('/support/tickets');
    },

    createTicket: async (ticket: { subject: string; description?: string; priority?: string }) => {
        return api.post<any>('/support/tickets', ticket);
    },
};
