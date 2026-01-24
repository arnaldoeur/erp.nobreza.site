
-- 39_SETUP_SUPPORT_CHAT.sql
-- Setup Tables for AI Support and Specialist Chat

-- 1. Create Chats Table
-- Fixed: company_id is BIGINT to match public.companies(id)
CREATE TABLE IF NOT EXISTS public.support_chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id BIGINT NOT NULL REFERENCES public.companies(id),
    user_id UUID NOT NULL REFERENCES public.users(id),
    title TEXT NOT NULL DEFAULT 'Nova Conversa',
    type TEXT NOT NULL DEFAULT 'AI', -- 'AI' or 'HUMAN'
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Messages Table
CREATE TABLE IF NOT EXISTS public.support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES public.support_chats(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.support_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- 4. Policies (STRICTLY PRIVATE TO USER)

-- Chats: Users can only see their own chats
DROP POLICY IF EXISTS "Users can manage own support chats" ON public.support_chats;
CREATE POLICY "Users can manage own support chats" ON public.support_chats
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Messages: Users can see messages if they own the chat
DROP POLICY IF EXISTS "Users can manage own support messages" ON public.support_messages;
CREATE POLICY "Users can manage own support messages" ON public.support_messages
    USING (
        chat_id IN (SELECT id FROM public.support_chats WHERE user_id = auth.uid())
    )
    WITH CHECK (
        chat_id IN (SELECT id FROM public.support_chats WHERE user_id = auth.uid())
    );

-- 5. Reload Schema
NOTIFY pgrst, 'reload schema';