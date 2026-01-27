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
    generateAIResponse: async (
        chatId: string,
        history: ChatMessage[],
        userQuestion: string,
        contextData: {
            userName: string;
            role: string;
            companyId: number;
            sales: any[];
            products: any[];
        }
    ) => {
        try {
            // 1. Prepare Context
            const systemPrompt = `
                ${SYSTEM_KNOWLEDGE.CONTEXT_INSTRUCTIONS}
                
                ${SYSTEM_KNOWLEDGE.NAVIGATION_MAP}
                
                Categorias de Intenção:
                ${JSON.stringify(SYSTEM_KNOWLEDGE.INTENT_CLASSES, null, 2)}
                
                Modelos de Resposta:
                ${JSON.stringify(SYSTEM_KNOWLEDGE.RESPONSE_TEMPLATES, null, 2)}
                
                Info do Utilizador:
                - Nome: ${contextData.userName}
                - Cargo: ${contextData.role}
                
                Dados da Empresa:
                - Company ID: ${contextData.companyId}
                
                Resumo de Dados Atuais:
                - Vendas Recentes: ${JSON.stringify(contextData.sales.slice(0, 5))}
                - Produtos Principais: ${JSON.stringify(contextData.products.slice(0, 5))}
            `;

            // 2. Call OpenRouter / LLM
            const response = await fetch(OPENROUTER_URL, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "liquid/lfm-2.5-1.2b-thinking:free",
                    messages: [
                        { role: "system", content: systemPrompt },
                        ...history.map(m => ({
                            role: m.role === 'user' ? 'user' : 'assistant',
                            content: m.content
                        })),
                        { role: "user", content: userQuestion }
                    ]
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('OpenRouter Error Details:', errorData);
                throw new Error(errorData.error?.message || 'AI Service Error');
            }

            const aiData = await response.json();
            const aiText = aiData.choices?.[0]?.message?.content || "Desculpe, não consegui processar sua solicitação.";

            // 3. Save AI Answer to DB
            await SupportService.sendMessage(chatId, 'assistant', aiText);

        } catch (error: any) {
            console.error("AI Generation Failed:", error);
            const errorMessage = error.message?.includes('401')
                ? "Erro de autenticação na IA. Por favor, contacte o suporte."
                : "⚠️ Estou com dificuldades técnicas momentâneas (OpenRouter/API). Tente novamente em instantes.";
            await SupportService.sendMessage(chatId, 'assistant', errorMessage);
        }
    }
};
