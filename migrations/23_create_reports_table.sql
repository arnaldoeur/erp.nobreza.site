-- Create table for storing generated reports for history/audit
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id BIGINT REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    type TEXT NOT NULL, -- 'FINANCIAL', 'SALES', etc.
    period TEXT NOT NULL, -- '2026-01'
    summary TEXT, -- Short summary e.g. "Receita: 5000"
    data JSONB, -- Full dataset snapshotted or just stats
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB -- Extra info (version, etc)
);

-- RLS Policies
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view reports from their own company" ON public.reports;
CREATE POLICY "Users can view reports from their own company" ON public.reports
    FOR SELECT USING (company_id IN (
        SELECT company_id FROM public.users WHERE id = auth.uid()
    ));

DROP POLICY IF EXISTS "Users can insert reports for their own company" ON public.reports
    FOR INSERT WITH CHECK (company_id IN (
        SELECT company_id FROM public.users WHERE id = auth.uid()
    ));
