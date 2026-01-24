-- 49_TEAM_ENHANCEMENTS.sql
-- 1. Add salary field to users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS base_salary NUMERIC DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS base_hours NUMERIC DEFAULT 160;

-- 2. Add working hours to companies
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS working_hours JSONB DEFAULT '{"start": "08:00", "end": "18:00", "days": [1,2,3,4,5]}'::jsonb;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS closing_time TEXT DEFAULT '18:00';

-- 3. Ensure system_logs has correct company_id FK and RLS
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'system_logs') THEN
        CREATE TABLE public.system_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            company_id BIGINT REFERENCES public.companies(id) ON DELETE CASCADE,
            user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
            user_name TEXT,
            action TEXT NOT NULL,
            details TEXT,
            timestamp TIMESTAMPTZ DEFAULT now()
        );
    END IF;
END $$;

-- Enable RLS on system_logs
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Policies for system_logs
DROP POLICY IF EXISTS "Users can view own company logs" ON public.system_logs;
CREATE POLICY "Users can view own company logs" 
ON public.system_logs FOR SELECT 
USING (
    company_id IN (
        SELECT company_id FROM public.users WHERE id = auth.uid()
    )
);

DROP POLICY IF EXISTS "System can insert logs" ON public.system_logs;
CREATE POLICY "System can insert logs" 
ON public.system_logs FOR INSERT 
WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_system_logs_company_id ON public.system_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON public.system_logs(timestamp DESC);

-- Reload Schema
NOTIFY pgrst, 'reload schema';
