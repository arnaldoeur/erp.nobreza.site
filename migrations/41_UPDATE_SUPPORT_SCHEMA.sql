-- 41_UPDATE_SUPPORT_SCHEMA.sql
-- Upgrade Support Chat schema for Attachments and Threads

-- 1. Add 'attachments' to messages
ALTER TABLE public.support_messages 
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- 2. Add 'status' and 'last_message_at' to chats for sorting/filtering
ALTER TABLE public.support_chats
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'ARCHIVED')),
ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ DEFAULT now();

-- 3. Trigger to update last_message_at automatically
CREATE OR REPLACE FUNCTION public.update_chat_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.support_chats
    SET last_message_at = now()
    WHERE id = NEW.chat_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_chat_timestamp ON public.support_messages;
CREATE TRIGGER trigger_update_chat_timestamp
AFTER INSERT ON public.support_messages
FOR EACH ROW EXECUTE FUNCTION public.update_chat_timestamp();

-- 4. Reload Schema
NOTIFY pgrst, 'reload schema';
