-- FIX PERMISSIONS FOR TEAM CHAT

-- 0. Ensure Schema Updates (Backfill from 41 just in case)
ALTER TABLE erp_chat_groups 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- 0.1 Ensure Members Table Exists
CREATE TABLE IF NOT EXISTS erp_chat_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES erp_chat_groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'MEMBER', -- 'ADMIN', 'MEMBER'
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

ALTER TABLE erp_chat_group_members ENABLE ROW LEVEL SECURITY;

-- 1. Enable updating groups (Name, Description, Image)
-- Drop existing policy if conflicting, or just create new one
DROP POLICY IF EXISTS "Group Members can update group details" ON erp_chat_groups;

CREATE POLICY "Group Members can update group details" ON erp_chat_groups
    FOR UPDATE
    USING (
        auth.uid() = created_by OR
        EXISTS (
            SELECT 1 FROM erp_chat_group_members
            WHERE group_id = erp_chat_groups.id
            AND user_id = auth.uid()
            AND role = 'ADMIN'
        )
    );

-- 2. Enable creating groups (if not already enabled)
DROP POLICY IF EXISTS "Authenticated users can create groups" ON erp_chat_groups;
CREATE POLICY "Authenticated users can create groups" ON erp_chat_groups
    FOR INSERT TO authenticated
    WITH CHECK (true); -- Simplified to allow creation

-- 3. Fix RLS for Adding Members
DROP POLICY IF EXISTS "Admins or self can add members" ON erp_chat_group_members;

CREATE POLICY "Admins or self can add members" ON erp_chat_group_members
    FOR INSERT TO authenticated
    WITH CHECK (
        -- Allow if adding self (joining) or if adding others and is Admin
        (auth.uid() = user_id) OR
        EXISTS (
            SELECT 1 FROM erp_chat_group_members
            WHERE group_id = erp_chat_group_members.group_id
            AND user_id = auth.uid()
            AND role = 'ADMIN'
        ) OR
        -- Allow Group Creator to add members even if not in members table yet (bootstrap)
        EXISTS (
            SELECT 1 FROM erp_chat_groups
            WHERE id = erp_chat_group_members.group_id
            AND created_by = auth.uid()
        )
    );

-- 4. Fix RLS for Removing Members
DROP POLICY IF EXISTS "Admins or self can remove members" ON erp_chat_group_members;

CREATE POLICY "Admins or self can remove members" ON erp_chat_group_members
    FOR DELETE TO authenticated
    USING (
        (auth.uid() = user_id) OR
        EXISTS (
            SELECT 1 FROM erp_chat_group_members
            WHERE group_id = erp_chat_group_members.group_id
            AND user_id = auth.uid()
            AND role = 'ADMIN'
        ) OR
        -- Allow Group Creator to remove members
        EXISTS (
            SELECT 1 FROM erp_chat_groups
            WHERE id = erp_chat_group_members.group_id
            AND created_by = auth.uid()
        )
    );

-- 5. Ensure Storage Bucket Exists and has permissions
-- Note: 'documents' bucket usually exists. If not, creating it via SQL is specific to Supabase functions but we can set policies.
-- We assume 'documents' exists.

DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
CREATE POLICY "Allow public read" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'documents');
