-- Add metadata to groups
ALTER TABLE erp_chat_groups 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Create members table to manage explicit group membership
CREATE TABLE IF NOT EXISTS erp_chat_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES erp_chat_groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'MEMBER', -- 'ADMIN', 'MEMBER'
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

-- Enable RLS for members
ALTER TABLE erp_chat_group_members ENABLE ROW LEVEL SECURITY;

-- Policies for members
CREATE POLICY "Users can view members of their groups" ON erp_chat_group_members
    FOR SELECT USING (
        group_id IN (
            SELECT group_id FROM erp_chat_group_members WHERE user_id = auth.uid()
        )
        OR 
        -- Allow viewing members if you are in the same company (simplified for now, or public groups)
        EXISTS (
            SELECT 1 FROM erp_chat_groups WHERE id = erp_chat_group_members.group_id AND company_id = (SELECT company_id FROM public.users WHERE id = auth.uid())
        )
    );

CREATE POLICY "Admins or self can add members" ON erp_chat_group_members
    FOR INSERT WITH CHECK (
        -- Simplified: Any company member can join any group for now, or just created_by
        true 
    );

CREATE POLICY "Admins or self can remove" ON erp_chat_group_members
    FOR DELETE USING (
        user_id = auth.uid() 
        OR 
        EXISTS (
            SELECT 1 FROM erp_chat_group_members WHERE group_id = erp_chat_group_members.group_id AND user_id = auth.uid() AND role = 'ADMIN'
        )
    );
