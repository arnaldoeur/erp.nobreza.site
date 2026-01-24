-- ==========================================
-- NOBREZA ERP - GOLD MASTER SCHEMA (v2.0)
-- ==========================================
-- Run this script in the SQL Editor of your NEW Supabase Project.
-- It sets up all tables, relations, and security policies from zero.

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLES STRUCTURE

-- Companies (Root Table)
CREATE TABLE IF NOT EXISTS "companies" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name" text NOT NULL,
  "slogan" text,
  "nuit" text,
  "address" text,
  "email" text,
  "contact" text,
  "website" text,
  "logo" text,
  "theme_color" text DEFAULT '#10b981',
  "active" boolean DEFAULT true,
  "created_at" timestamptz DEFAULT now()
);

-- Users (Linked to Companies)
CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "company_id" uuid REFERENCES "companies"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "password" text, -- Managed by Supabase Auth (metadata only here)
  "role" text NOT NULL, -- 'ADMIN', 'COMMERCIAL', etc.
  "responsibility" text,
  "active" boolean DEFAULT true,
  "photo" text,
  "contact" text,
  "location" text,
  "social_security_number" text,
  "created_at" timestamptz DEFAULT now()
);

-- Products
CREATE TABLE IF NOT EXISTS "products" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "company_id" uuid REFERENCES "companies"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "category" text NOT NULL,
  "code" text NOT NULL,
  "purchase_price" numeric NOT NULL DEFAULT 0,
  "sale_price" numeric NOT NULL DEFAULT 0,
  "quantity" integer NOT NULL DEFAULT 0,
  "min_stock" integer NOT NULL DEFAULT 0,
  "supplier_id" text,
  "created_at" timestamptz DEFAULT now()
);

-- Customers
CREATE TABLE IF NOT EXISTS "customers" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "company_id" uuid REFERENCES "companies"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "nuit" text,
  "contact" text,
  "email" text,
  "address" text,
  "type" text DEFAULT 'NORMAL',
  "total_spent" numeric DEFAULT 0,
  "created_at" timestamptz DEFAULT now()
);

-- Suppliers
CREATE TABLE IF NOT EXISTS "suppliers" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "company_id" uuid REFERENCES "companies"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "nuit" text,
  "location" text,
  "contact" text,
  "email" text,
  "conditions" text,
  "is_preferred" boolean DEFAULT false,
  "logo" text,
  "created_at" timestamptz DEFAULT now()
);

-- Sales
CREATE TABLE IF NOT EXISTS "sales" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "company_id" uuid REFERENCES "companies"("id") ON DELETE CASCADE,
  "customer_name" text,
  "total" numeric NOT NULL DEFAULT 0,
  "type" text NOT NULL, -- 'DIRECT', 'INVOICE'
  "payment_method" text NOT NULL,
  "other_payment_details" text,
  "performed_by" text NOT NULL,
  "created_at" timestamptz DEFAULT now()
);

-- Sale Items
CREATE TABLE IF NOT EXISTS "sale_items" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "company_id" uuid REFERENCES "companies"("id") ON DELETE CASCADE,
  "sale_id" uuid REFERENCES "sales"("id") ON DELETE CASCADE,
  "product_id" text,
  "product_name" text NOT NULL,
  "quantity" integer NOT NULL,
  "unit_price" numeric NOT NULL,
  "total" numeric NOT NULL
);

-- Daily Closures
CREATE TABLE IF NOT EXISTS "daily_closures" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "company_id" uuid REFERENCES "companies"("id") ON DELETE CASCADE,
  "closure_date" timestamptz NOT NULL,
  "shift" text,
  "responsible_id" text,
  "responsible_name" text,
  "system_total" numeric DEFAULT 0,
  "manual_cash" numeric DEFAULT 0,
  "difference" numeric DEFAULT 0,
  "observations" text,
  "status" text DEFAULT 'CLOSED',
  "created_at" timestamptz DEFAULT now()
);

-- System Logs
CREATE TABLE IF NOT EXISTS "system_logs" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "company_id" uuid REFERENCES "companies"("id") ON DELETE CASCADE,
  "user_id" text,
  "action" text NOT NULL,
  "details" text,
  "timestamp" timestamptz DEFAULT now()
);

-- Health Plans
CREATE TABLE IF NOT EXISTS "health_plans" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "company_id" uuid REFERENCES "companies"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "insurer" text NOT NULL,
  "coverage_percentage" integer NOT NULL,
  "contact" text,
  "email" text,
  "website" text,
  "description" text,
  "coverage_details" text,
  "active" boolean DEFAULT true,
  "created_at" timestamptz DEFAULT now()
);


-- 3. SECURITY & RLS (The Critical Part)
-- We use a SECURITY DEFINER function to allow users to see their own company ID securely,
-- preventing infinite recursion in RLS policies.

-- Create Safe Helper Function
CREATE OR REPLACE FUNCTION get_company_id_safe()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT company_id FROM users WHERE id = auth.uid() LIMIT 1;
$$;

);

-- System Logs
CREATE POLICY "Access company logs" ON system_logs FOR ALL USING (
    company_id = get_auth_user_company_id() OR auth.jwt() ->> 'email' = 'admin@nobreza.site'
);

-- Health Plans
CREATE POLICY "Access company health_plans" ON health_plans FOR ALL USING (
    company_id = get_auth_user_company_id() OR auth.jwt() ->> 'email' = 'admin@nobreza.site'
);

-- GRANT PERMISSIONS
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;