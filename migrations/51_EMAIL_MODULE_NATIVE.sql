-- 1. Updates to Email Accounts for IMAP support
-- Add IMAP fields to allow receiving emails
ALTER TABLE erp_email_accounts 
ADD COLUMN IF NOT EXISTS imap_host text,
ADD COLUMN IF NOT EXISTS imap_port integer DEFAULT 993,
ADD COLUMN IF NOT EXISTS imap_user text,
ADD COLUMN IF NOT EXISTS imap_pass text,
ADD COLUMN IF NOT EXISTS imap_secure boolean DEFAULT true;

-- 2. Folders Structure (replicates server folders locally for caching)
CREATE TABLE IF NOT EXISTS erp_email_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES erp_email_accounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  path text NOT NULL, -- e.g. "INBOX", "INBOX.Archive"
  type text CHECK (type IN ('INBOX', 'SENT', 'DRAFT', 'TRASH', 'JUNK', 'ARCHIVE', 'CUSTOM')) DEFAULT 'CUSTOM',
  total_count integer DEFAULT 0,
  unseen_count integer DEFAULT 0,
  last_sync timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS for Folders
ALTER TABLE erp_email_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users browse folders of their company accounts" ON erp_email_folders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM erp_email_accounts a 
      WHERE a.id = erp_email_folders.account_id 
      AND a.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    )
  );

-- 3. Email Metadata (Header storage for fast listing)
CREATE TABLE IF NOT EXISTS erp_emails_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES erp_email_accounts(id) ON DELETE CASCADE,
  folder_id uuid REFERENCES erp_email_folders(id) ON DELETE CASCADE,
  uid integer NOT NULL, -- IMAP UID
  message_id text,
  subject text,
  from_name text,
  from_addr text,
  to_addr text[],
  cc_addr text[],
  bcc_addr text[],
  date timestamptz,
  flags text[], -- e.g. ['SEEN', 'FLAGGED']
  has_attachments boolean DEFAULT false,
  snippet text,
  body_structure jsonb, -- Store mime structure for advanced parsing
  created_at timestamptz DEFAULT now()
);

-- RLS for Emails
ALTER TABLE erp_emails_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read emails of their company" ON erp_emails_metadata
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM erp_email_accounts a 
      WHERE a.id = erp_emails_metadata.account_id 
      AND a.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_emails_folder ON erp_emails_metadata(folder_id);
CREATE INDEX IF NOT EXISTS idx_emails_date ON erp_emails_metadata(date DESC);
