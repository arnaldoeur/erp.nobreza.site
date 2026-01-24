-- 05_FIX_RLS_SOCIAL.sql
-- Ensure social messages and groups are accessible

-- Enable RLS
ALTER TABLE social_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_groups ENABLE ROW LEVEL SECURITY;

-- Simple "Allow All" policies for authenticated users (can be refined later)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated_all_messages') THEN
        CREATE POLICY "authenticated_all_messages" ON social_messages FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated_all_groups') THEN
        CREATE POLICY "authenticated_all_groups" ON social_groups FOR ALL USING (true);
    END IF;
END $$;

-- Storage Bucket for Documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- RLS for Storage (simplified)
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'documents');
CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documents');
