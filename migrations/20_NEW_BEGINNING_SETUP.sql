
-- 20_NEW_BEGINNING_SETUP.sql
-- COMPLETE DATABASE SETUP FOR NOBREZA ERP V2
-- Run this in the SQL Editor of the NEW Supabase project.

-- ==============================================================================
-- 1. BASE CONFIGURATION & EXTENSIONS
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. CORE TABLES (HIERARCHY ROOT)
-- ==============================================================================

-- Companies (The main entity)
CREATE TABLE IF NOT EXISTS public.companies (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- Changed to bigint to match v7 alignment
    name text NOT NULL DEFAULT 'Nova Farmácia',
    slogan text,
    nuit text,
    address text,
    email text,
    contact text,
    website text,
    logo text,
    logo_horizontal text,
    logo_vertical text,
    theme_color text DEFAULT '#10b981',
    active boolean DEFAULT true,
    closing_time text,
    created_at timestamp with time zone DEFAULT now()
);

-- Users (Linked to auth.users and public.companies)
CREATE TABLE IF NOT EXISTS public.users (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id bigint REFERENCES public.companies(id) ON DELETE CASCADE,
    name text NOT NULL,
    email text NOT NULL,
    role text DEFAULT 'USER', -- 'ADMIN', 'MANAGER', 'SELLER'
    responsibility text,
    active boolean DEFAULT true,
    photo text,
    contact text,
    location text,
    social_security_number text,
    hire_date date,
    created_at timestamp with time zone DEFAULT now()
);

-- Helper function for RLS (Security)
CREATE OR REPLACE FUNCTION public.get_company_id_safe()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT company_id FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;

-- ==============================================================================
-- 3. COMMERCIAL MODULE (Sales, Products, Customers)
-- ==============================================================================

-- Products / Stock
CREATE TABLE IF NOT EXISTS public.products (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id bigint REFERENCES public.companies(id) ON DELETE CASCADE,
    name text NOT NULL,
    category text NOT NULL,
    code text,
    purchase_price numeric DEFAULT 0,
    sale_price numeric NOT NULL DEFAULT 0,
    quantity integer NOT NULL DEFAULT 0,
    min_stock integer DEFAULT 5,
    supplier_id text, -- Can be linked to suppliers table later
    description text,
    image_url text,
    expiry_date date,
    created_at timestamp with time zone DEFAULT now()
);

-- Customers
CREATE TABLE IF NOT EXISTS public.customers (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id bigint REFERENCES public.companies(id) ON DELETE CASCADE,
    name text NOT NULL,
    nuit text,
    contact text,
    email text,
    address text,
    type text DEFAULT 'NORMAL',
    total_spent numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);

-- Suppliers
CREATE TABLE IF NOT EXISTS public.suppliers (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id bigint REFERENCES public.companies(id) ON DELETE CASCADE,
    name text NOT NULL,
    nuit text,
    location text,
    contact text,
    email text,
    conditions text,
    is_preferred boolean DEFAULT false,
    logo text,
    created_at timestamp with time zone DEFAULT now()
);

-- Sales (Transactions)
CREATE TABLE IF NOT EXISTS public.sales (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id bigint REFERENCES public.companies(id) ON DELETE CASCADE,
    customer_name text,
    customer_id uuid REFERENCES public.customers(id),
    total numeric NOT NULL DEFAULT 0,
    type text NOT NULL, -- 'DIRECT', 'INVOICE'
    payment_method text NOT NULL,
    other_payment_details text,
    performed_by text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    items jsonb DEFAULT '[]'::jsonb -- Storing items as JSONB for history preservation
);

-- Sale Items (Normalized items)
CREATE TABLE IF NOT EXISTS public.sale_items (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id bigint REFERENCES public.companies(id) ON DELETE CASCADE,
    sale_id uuid REFERENCES public.sales(id) ON DELETE CASCADE,
    product_id uuid REFERENCES public.products(id),
    product_name text NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric NOT NULL,
    total numeric NOT NULL
);

-- ==============================================================================
-- 4. FINANCIAL MODULE (Closures, Expenses, Billing)
-- ==============================================================================

-- Daily Closures
CREATE TABLE IF NOT EXISTS public.daily_closures (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id bigint REFERENCES public.companies(id) ON DELETE CASCADE,
    closure_date timestamp with time zone NOT NULL,
    shift text,
    responsible_id uuid REFERENCES public.users(id),
    responsible_name text,
    system_total numeric DEFAULT 0,
    manual_cash numeric DEFAULT 0,
    difference numeric DEFAULT 0,
    observations text,
    status text DEFAULT 'CLOSED',
    created_at timestamp with time zone DEFAULT now()
);

-- Expenses
CREATE TABLE IF NOT EXISTS public.expenses (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id bigint REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.users(id),
    description text NOT NULL,
    amount numeric NOT NULL DEFAULT 0,
    type text DEFAULT 'Operational', -- 'Operational', 'Salary', 'Maintenance', 'Other'
    date timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);

-- Billing Documents (Invoices, Quotes)
CREATE TABLE IF NOT EXISTS public.documents (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id bigint REFERENCES public.companies(id) ON DELETE CASCADE,
    type text NOT NULL, -- 'INVOICE', 'QUOTE', 'RECEIPT'
    customer_name text,
    customer_id uuid,
    total numeric(20,2) DEFAULT 0,
    status text DEFAULT 'SENT', -- 'DRAFT', 'SENT', 'PAID', 'CANCELLED'
    items jsonb DEFAULT '[]'::jsonb,
    created_by text,
    date timestamp with time zone DEFAULT now(),
    due_date date,
    created_at timestamp with time zone DEFAULT now()
);

-- ==============================================================================
-- 5. COLLABORATION MODULE (Chat, Tasks, Support)
-- ==============================================================================

-- Chat Groups
CREATE TABLE IF NOT EXISTS public.erp_chat_groups (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id bigint REFERENCES public.companies(id) ON DELETE CASCADE,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- Chat Messages
CREATE TABLE IF NOT EXISTS public.erp_chat_messages (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id bigint REFERENCES public.companies(id) ON DELETE CASCADE,
    grupo_id uuid REFERENCES public.erp_chat_groups(id) ON DELETE CASCADE,
    user_id uuid,
    user_name text,
    content text NOT NULL,
    mentions text[],
    created_at timestamp with time zone DEFAULT now()
);

-- Tasks
CREATE TABLE IF NOT EXISTS public.tasks (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id bigint REFERENCES public.companies(id) ON DELETE CASCADE,
    creator_id uuid NOT NULL,
    assigned_to uuid,
    title text NOT NULL,
    description text,
    status text DEFAULT 'PENDING', -- 'PENDING', 'PROGRESS', 'DONE'
    priority text DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH'
    due_date date,
    location text,
    created_at timestamp with time zone DEFAULT now()
);

-- Support Tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id bigint REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id uuid,
    subject text NOT NULL,
    description text,
    priority text DEFAULT 'MEDIUM',
    status text DEFAULT 'OPEN',
    created_at timestamp with time zone DEFAULT now()
);

-- System Logs
CREATE TABLE IF NOT EXISTS public.system_logs (
    id text PRIMARY KEY, -- Using text ID as seen in frontend logic (LOG-{timestamp}) use text or uuid. Frontend generates string.
    company_id bigint REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id text,
    user_name text,
    action text NOT NULL,
    details text,
    timestamp timestamp with time zone DEFAULT now()
);

-- ==============================================================================
-- 6. SECURITY & POLICIES (RLS)
-- ==============================================================================

-- Enable RLS on ALL tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Create "Access Own Company" Policy for ALL tables
-- Note: For simplicity and debugging, we are using a fairly permissive policy logic:
-- "If I belong to this company, I can access its data."

-- Companies: Users can read their own company
CREATE POLICY "companies_read_policy" ON public.companies FOR SELECT USING (id = get_company_id_safe());
CREATE POLICY "companies_update_policy" ON public.companies FOR UPDATE USING (id = get_company_id_safe());

-- Generic Policy Generator Macro (Concept) -> Applied manually below
CREATE POLICY "users_isolation" ON public.users FOR ALL USING (company_id = get_company_id_safe());
CREATE POLICY "products_isolation" ON public.products FOR ALL USING (company_id = get_company_id_safe());
CREATE POLICY "customers_isolation" ON public.customers FOR ALL USING (company_id = get_company_id_safe());
CREATE POLICY "suppliers_isolation" ON public.suppliers FOR ALL USING (company_id = get_company_id_safe());
CREATE POLICY "sales_isolation" ON public.sales FOR ALL USING (company_id = get_company_id_safe());
CREATE POLICY "daily_closures_isolation" ON public.daily_closures FOR ALL USING (company_id = get_company_id_safe());
CREATE POLICY "expenses_isolation" ON public.expenses FOR ALL USING (company_id = get_company_id_safe());
CREATE POLICY "documents_isolation" ON public.documents FOR ALL USING (company_id = get_company_id_safe());

-- Collab Isolation
CREATE POLICY "chat_groups_isolation" ON public.erp_chat_groups FOR ALL USING (company_id = get_company_id_safe());
CREATE POLICY "chat_messages_isolation" ON public.erp_chat_messages FOR ALL USING (company_id = get_company_id_safe());
CREATE POLICY "tasks_isolation" ON public.tasks FOR ALL USING (company_id = get_company_id_safe());
CREATE POLICY "support_isolation" ON public.support_tickets FOR ALL USING (company_id = get_company_id_safe());
CREATE POLICY "logs_isolation" ON public.system_logs FOR ALL USING (company_id = get_company_id_safe());


-- ==============================================================================
-- 7. INITIAL SEED DATA
-- ==============================================================================

-- Create default company if none exists (safe check)
INSERT INTO public.companies (name, active) 
SELECT 'Farmácia Nobreza Setup', true 
WHERE NOT EXISTS (SELECT 1 FROM public.companies LIMIT 1);

-- ==============================================================================
-- 8. GRANT PERMISSIONS
-- ==============================================================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- Force Cache Refresh
NOTIFY pgrst, 'reload schema';
