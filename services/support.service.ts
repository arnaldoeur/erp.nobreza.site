import { SYSTEM_KNOWLEDGE } from "../utils/system-knowledge";

const API_KEY = "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";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

import { supabase } from "./supabase";

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
    // --- DB Interactions ---

    getThreads: async (companyId: number, userId: string): Promise<ChatThread[]> => {
        const { data, error } = await supabase
            .from('support_chats')
            .select('*')
            .eq('company_id', companyId)
            .eq('user_id', userId)
            .order('last_message_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    createThread: async (companyId: number, userId: string, title: string = "Nova Conversa"): Promise<ChatThread> => {
        const { data, error } = await supabase
            .from('support_chats')
            .insert({ company_id: companyId, user_id: userId, title })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    getMessages: async (chatId: string): Promise<ChatMessage[]> => {
        const { data, error } = await supabase
            .from('support_messages')
            .select('*')
            .eq('chat_id', chatId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    sendMessage: async (chatId: string, role: 'user' | 'assistant', content: string, attachments: any[] = []): Promise<ChatMessage> => {
        const { data, error } = await supabase
            .from('support_messages')
            .insert({ chat_id: chatId, role, content, attachments })
            .select()
            .single();

        if (error) throw error;
        return data;
    },


    // --- AI Logic (Integrated) ---

};
