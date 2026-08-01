import { api } from './api';

/**
 * Colaboração: tarefas, conversas internas e biblioteca de ficheiros.
 *
 * Duas mudanças de comportamento a assinalar:
 *
 *  - As mensagens novas passam a ser obtidas por sondagem com `since`, em
 *    vez das subscrições em tempo real do Supabase. O parâmetro faz com que
 *    a esmagadora maioria dos pedidos devolva um conjunto vazio.
 *
 *  - `uploadFile` envia o ficheiro para o servidor, que o guarda fora da
 *    raiz pública. O bucket anterior tinha sido tornado público com
 *    políticas "Allow all" para leitura, escrita e remoção sem autenticação.
 */

export interface CollabTask {
    id?: string;
    company_id?: string;
    creator_id?: string;
    assigned_to?: string;
    title: string;
    description?: string;
    status: 'PENDING' | 'PROGRESS' | 'DONE';
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    location?: string;
    due_date?: string;
    creator_name?: string;
    assignee_name?: string;
}

export interface CollabMessage {
    id?: string;
    company_id?: string;
    user_id?: string;
    user_name?: string;
    group_id: string;
    content: string;
    mentions?: string[];
    created_at?: string;
}

export interface CollabDoc {
    id?: string;
    company_id?: string;
    user_id?: string;
    name: string;
    category: string;
    file_url: string;
    file_type: string;
    created_at?: string;
    last_modified_at?: string;
    users?: { name: string };
}

export interface SupportTicket {
    id?: string;
    subject: string;
    description: string;
    status?: 'OPEN' | 'IN_ANALYSIS' | 'RESOLVED' | 'CLOSED';
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}

export const CollabService = {
    // ---------------------------------------------------------------------
    // Tarefas
    // ---------------------------------------------------------------------

    getTasks: async (): Promise<CollabTask[]> => {
        return api.get<CollabTask[]>('/tasks');
    },

    /**
     * Cria ou atualiza uma tarefa.
     *
     * A sincronização com o calendário é feita no servidor e é idempotente.
     * Antes, cada gravação inseria um evento novo sem qualquer ligação à
     * tarefa — editar três vezes deixava três eventos duplicados.
     */
    saveTask: async (task: CollabTask): Promise<CollabTask> => {
        return api.post<CollabTask>('/tasks', task);
    },

    deleteTask: async (id: string): Promise<void> => {
        await api.delete(`/tasks/${id}`);
    },

    // ---------------------------------------------------------------------
    // Conversas internas
    // ---------------------------------------------------------------------

    getGroups: async () => {
        return api.get<Array<{ id: string; name: string; description?: string; image_url?: string; member_count: number }>>('/chat/groups');
    },

    createGroup: async (name: string, description?: string) => {
        return api.post<{ id: string; name: string }>('/chat/groups', { name, description });
    },

    updateGroup: async (id: string, updates: { name?: string; description?: string; image_url?: string }) => {
        return api.put<{ id: string; name: string; description?: string; image_url?: string }>(`/chat/groups/${id}`, updates);
    },

    deleteGroup: async (id: string): Promise<void> => {
        await api.delete(`/chat/groups/${id}`);
    },

    getGroupMembers: async (groupId: string) => {
        return api.get<Array<{ group_id: string; user_id: string; role: string; user: { id: string; name: string; email: string; photo?: string } }>>(
            `/chat/groups/${groupId}/members`
        );
    },

    addGroupMember: async (groupId: string, userId: string, role: 'ADMIN' | 'MEMBER' = 'MEMBER') => {
        return api.post(`/chat/groups/${groupId}/members`, { userId, role });
    },

    removeGroupMember: async (groupId: string, userId: string): Promise<void> => {
        await api.delete(`/chat/groups/${groupId}/members/${userId}`);
    },

    /**
     * Mensagens de um grupo.
     *
     * Com `since`, devolve apenas o que chegou depois desse instante — é o
     * que substitui a subscrição em tempo real na sondagem periódica.
     */
    getMessages: async (groupId: string, since?: string | Date): Promise<CollabMessage[]> => {
        const suffix = since
            ? `?since=${encodeURIComponent(since instanceof Date ? since.toISOString() : since)}`
            : '';
        return api.get<CollabMessage[]>(`/chat/groups/${groupId}/messages${suffix}`);
    },

    /**
     * Envia uma mensagem.
     *
     * O autor é determinado pelo servidor a partir da sessão. Antes vinha no
     * corpo do pedido, o que permitia escrever em nome de outra pessoa.
     */
    sendMessage: async (msg: CollabMessage): Promise<CollabMessage> => {
        return api.post<CollabMessage>(`/chat/groups/${msg.group_id}/messages`, {
            content: msg.content,
            mentions: msg.mentions ?? [],
        });
    },

    // ---------------------------------------------------------------------
    // Biblioteca de ficheiros
    // ---------------------------------------------------------------------

    getDocs: async (): Promise<CollabDoc[]> => {
        return api.get<CollabDoc[]>('/documents');
    },

    /**
     * Carrega um ficheiro e cria o registo correspondente.
     *
     * O tipo e o tamanho são validados no servidor contra uma lista fechada.
     * O nome no disco é gerado lá — usar o nome enviado pelo browser
     * permitiria travessia de diretórios.
     */
    uploadFile: async (file: File, name?: string, category?: string): Promise<CollabDoc> => {
        const formData = new FormData();
        formData.append('file', file);
        if (name) formData.append('name', name);
        if (category) formData.append('category', category);

        return api.upload<CollabDoc>('/documents', formData);
    },

    /**
     * Compatibilidade: guardar um documento a partir de um ficheiro.
     *
     * O registo e o ficheiro passaram a ser criados no mesmo pedido, pelo que
     * `uploadFile` já faz tudo. Este método existe para os pontos de chamada
     * que ainda separavam as duas coisas.
     */
    saveDoc: async (doc: CollabDoc & { file?: File }): Promise<CollabDoc> => {
        if (!doc.file) throw new Error('É necessário selecionar um ficheiro.');
        return CollabService.uploadFile(doc.file, doc.name, doc.category);
    },

    /** Altera apenas o nome de um documento já carregado. */
    renameDoc: async (id: string, name: string): Promise<CollabDoc> => {
        return api.patch<CollabDoc>(`/documents/${id}`, { name });
    },

    deleteDoc: async (id: string): Promise<void> => {
        await api.delete(`/documents/${id}`);
    },

    // ---------------------------------------------------------------------
    // Suporte
    // ---------------------------------------------------------------------

    getTickets: async () => {
        return api.get<any[]>('/support/tickets');
    },

    createTicket: async (ticket: SupportTicket) => {
        return api.post<any>('/support/tickets', ticket);
    },

    getSupportChats: async (type: 'AI' | 'HUMAN') => {
        return api.get<any[]>(`/support/chats?type=${type}`);
    },

    createSupportChat: async (type: 'AI' | 'HUMAN') => {
        return api.post<any>('/support/chats', { type });
    },

    getSupportMessages: async (chatId: string) => {
        return api.get<any[]>(`/support/chats/${chatId}/messages`);
    },
};
