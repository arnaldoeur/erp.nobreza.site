import { supabase } from './supabase';

export interface CollabTask {
    id?: string;
    company_id: string;
    creator_id: string;
    assigned_to?: string;
    title: string;
    description?: string;
    status: 'PENDING' | 'PROGRESS' | 'DONE';
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    location?: string;
    due_date?: string;
}

export interface CollabMessage {
    id?: string;
    company_id: string;
    user_id: string;
    user_name: string;
    group_id: string;
    content: string;
    mentions: string[];
    created_at?: string;
}

export interface CollabDoc {
    id?: string;
    company_id: string;
    user_id: string;
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
    company_id: string;
    user_id: string;
    subject: string;
    description: string;
    status: 'OPEN' | 'IN_ANALYSIS' | 'RESOLVED' | 'CLOSED';
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}

export const CollabService = {
    // Tasks
    getTasks: async () => {
        const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    },
    saveTask: async (task: CollabTask) => {
        const { data: savedTask, error } = await supabase.from('tasks').upsert(task).select().single();
        if (error) throw error;

        // Auto-sync to Calendar
        // Only if it's a new task (no ID provided in input) or we want to update (logic below assumes new for simplicity or upsert)
        // For robust sync, we might need a link, but let fire-and-forget for now as requested "create -> reflect"
        try {
            if (task.due_date) {
                const eventData = {
                    company_id: task.company_id,
                    title: `Tarefa: ${task.title}`,
                    description: task.description || 'Tarefa sincronizada',
                    start_time: task.due_date, // Tasks usually have due date
                    end_time: task.due_date,   // Duration 0 or 1 hour? Let's assume point in time
                    location: task.location || 'Escritório',
                    type: 'TASK',
                    priority: task.priority || 'MEDIUM',
                    status: task.status === 'DONE' ? 'COMPLETED' : 'PENDING',
                    is_personal: false,
                    created_by: task.creator_id
                    // We could add a 'related_task_id' if schema supported it
                };
                await supabase.from('erp_events').insert(eventData);
            }
        } catch (syncError) {
            console.warn("Autosync to calendar failed", syncError);
            // Don't block task creation
        }

        return savedTask;
    },
    deleteTask: async (id: string) => {
        const { error } = await supabase.from('tasks').delete().eq('id', id);
        if (error) throw error;
    },

    // Social Chat
    getGroups: async () => {
        const { data, error } = await supabase.from('erp_chat_groups').select('*');
        if (error) throw error;
        return data;
    },
    getMessages: async (groupId: string) => {
        const { data, error } = await supabase.from('erp_chat_messages')
            .select('*')
            .eq('grupo_id', groupId)
            .order('created_at', { ascending: true });
        if (error) throw error;
        return data;
    },
    // Group Members Management
    getGroupMembers: async (groupId: string) => {
        const { data, error } = await supabase
            .from('erp_chat_group_members')
            .select(`
                *,
                user:user_id ( id, name, photo, email )
            `)
            .eq('group_id', groupId);
        if (error) throw error;
        return data;
    },

    addGroupMember: async (groupId: string, userId: string, role: 'ADMIN' | 'MEMBER' = 'MEMBER') => {
        const { data, error } = await supabase
            .from('erp_chat_group_members')
            .insert({ group_id: groupId, user_id: userId, role })
            .select()
            .single();
        if (error) {
            // Ignore duplicate key error safely
            if (error.code === '23505') return null;
            throw error;
        }
        return data;
    },

    removeGroupMember: async (groupId: string, userId: string) => {
        const { error } = await supabase
            .from('erp_chat_group_members')
            .delete()
            .eq('group_id', groupId)
            .eq('user_id', userId);
        if (error) throw error;
    },

    sendMessage: async (msg: CollabMessage) => {
        const { data, error } = await supabase.from('erp_chat_messages').insert({
            company_id: msg.company_id,
            grupo_id: msg.group_id,
            user_id: msg.user_id,
            user_name: msg.user_name,
            content: msg.content
        }).select().single();
        if (error) throw error;
        return data;
    },

    // Documents
    getDocs: async () => {
        const { data, error } = await supabase
            .from('documents')
            .select(`
                *,
                users:user_id(name)
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Supabase Docs Fetch Error:", error);
            throw error;
        }
        console.log("Supabase Docs Response:", data);
        return data as CollabDoc[];
    },
    saveDoc: async (doc: CollabDoc) => {
        const { data, error } = await supabase.from('documents').upsert(doc).select().single();
        if (error) throw error;
        return data;
    },
    deleteDoc: async (id: string) => {
        const { error } = await supabase.from('documents').delete().eq('id', id);
        if (error) throw error;
    },

    // Support
    getTickets: async () => {
        const { data, error } = await supabase.from('support_tickets').select('*');
        if (error) throw error;
        return data;
    },
    createTicket: async (ticket: SupportTicket) => {
        const { data, error } = await supabase.from('support_tickets').insert(ticket).select().single();
        if (error) throw error;
        return data;
    },

    // AI & Support Chat
    createSupportChat: async (company_id: string, user_id: string, type: 'AI' | 'HUMAN') => {
        const { data, error } = await supabase.from('support_chats').insert({
            company_id: parseInt(company_id), // Ensure INT for BigInt column
            user_id,
            type,
            title: type === 'AI' ? 'Assistente Virtual' : 'Suporte Especializado'
        }).select().single();
        if (error) throw error;
        return data;
    },

    getSupportChats: async (type: 'AI' | 'HUMAN') => {
        const { data, error } = await supabase
            .from('support_chats')
            .select('*')
            .eq('type', type)
            .order('updated_at', { ascending: false });
        if (error) throw error;
        return data;
    },

    getSupportMessages: async (chatId: string) => {
        const { data, error } = await supabase
            .from('support_messages')
            .select('*')
            .eq('chat_id', chatId)
            .order('created_at', { ascending: true });
        if (error) throw error;
        return data;
    },

    sendSupportMessage: async (chatId: string, role: 'user' | 'assistant', content: string) => {
        const { data, error } = await supabase.from('support_messages').insert({
            chat_id: chatId,
            role,
            content
        }).select().single();

        if (error) throw error;

        // Update chat timestamp
        await supabase.from('support_chats').update({ updated_at: new Date() }).eq('id', chatId);

        return data;
    },

    // Storage & Utilities
    uploadFile: async (file: File, bucket: string = 'documents') => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);

        return data.publicUrl;
    },

    updateGroup: async (id: string, updates: { name?: string, description?: string, image_url?: string }) => {
        const { data, error } = await supabase.from('erp_chat_groups').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    },

    deleteGroup: async (id: string) => {
        const { error } = await supabase.from('erp_chat_groups').delete().eq('id', id);
        if (error) throw error;
    },

    getSupportGroup: async (companyId: string) => {
        // Find a group named "Suporte Zyph" for this company
        const { data, error } = await supabase
            .from('erp_chat_groups')
            .select('*')
            .eq('company_id', companyId)
            .eq('name', 'Suporte Zyph')
            .single();

        if (data) return data;

        // If not exists, create it
        const { data: newGroup, error: createError } = await supabase
            .from('erp_chat_groups')
            .insert({ company_id: companyId, name: 'Suporte Zyph' })
            .select()
            .single();

        if (createError) throw createError;
        return newGroup;
    }
};
