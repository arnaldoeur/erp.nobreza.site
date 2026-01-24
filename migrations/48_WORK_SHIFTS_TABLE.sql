-- 48_WORK_SHIFTS_TABLE.sql
-- Create table for employee work shifts (Check-In/Check-Out)

CREATE TABLE IF NOT EXISTS public.work_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    company_id BIGINT REFERENCES public.companies(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ DEFAULT now() NOT NULL,
    end_time TIMESTAMPTZ,
    status TEXT NOT NULL CHECK (status IN ('OPEN', 'CLOSED')) DEFAULT 'OPEN',
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.work_shifts ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Users can see their own shifts
CREATE POLICY "Users can view own shifts" 
ON public.work_shifts FOR SELECT 
USING (auth.uid() = user_id);

-- 2. Admins can see all company shifts
CREATE POLICY "Admins can view all company shifts" 
ON public.work_shifts FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role = 'ADMIN' AND company_id = work_shifts.company_id
    )
);

-- 3. Users can insert their own shifts
CREATE POLICY "Users can insert own shifts" 
ON public.work_shifts FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 4. Users can update their own shifts (for check-out)
CREATE POLICY "Users can update own shifts" 
ON public.work_shifts FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_work_shifts_user_id ON public.work_shifts(user_id);
CREATE INDEX IF NOT EXISTS idx_work_shifts_company_id ON public.work_shifts(company_id);
CREATE INDEX IF NOT EXISTS idx_work_shifts_status ON public.work_shifts(status);

-- Reload Schema
NOTIFY pgrst, 'reload schema';
