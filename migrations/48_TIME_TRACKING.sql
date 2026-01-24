-- 48_TIME_TRACKING.sql

CREATE TABLE IF NOT EXISTS public.work_shifts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'OPEN', -- OPEN, CLOSED
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE public.work_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all shifts (Admin) or own shifts" ON public.work_shifts
FOR SELECT USING (
    (auth.uid() = user_id) OR 
    (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN'))
);

CREATE POLICY "Users can insert own shifts" ON public.work_shifts
FOR INSERT WITH CHECK (
    auth.uid() = user_id
);

CREATE POLICY "Users can update own shifts" ON public.work_shifts
FOR UPDATE USING (
    auth.uid() = user_id
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_work_shifts_user_id ON public.work_shifts(user_id);
CREATE INDEX IF NOT EXISTS idx_work_shifts_start_time ON public.work_shifts(start_time);
