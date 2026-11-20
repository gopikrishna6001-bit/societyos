-- Local-only stubs matching hosted Society OS legacy helpers.
-- Used so phase0 privilege assertions run against a representative schema.
-- Not a migration. Do not apply on hosted.

CREATE TABLE IF NOT EXISTS public.societies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text
);

CREATE TABLE IF NOT EXISTS public.residents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id uuid REFERENCES public.societies(id),
  flat_id uuid,
  flat_number text,
  name text,
  phone text,
  email text,
  type text,
  gender text,
  date_of_birth date,
  profile_photo text,
  id_type text,
  id_number text,
  id_document_url text,
  move_in_date date,
  move_out_date date,
  whatsapp_opt_in boolean DEFAULT false,
  email_opt_in boolean DEFAULT false,
  portal_access boolean DEFAULT false,
  portal_pin text,
  status text DEFAULT 'active',
  notes text,
  created_at timestamptz DEFAULT now(),
  pin text,
  pin_changed boolean DEFAULT false,
  last_login timestamptz,
  is_super_admin boolean DEFAULT false,
  block text,
  auth_user_id uuid,
  pin_hash text
);

-- If an older stub table already existed, add missing hosted columns.
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS flat_id uuid;
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS type text;
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS date_of_birth date;
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS profile_photo text;
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS move_in_date date;
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS move_out_date date;
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS whatsapp_opt_in boolean DEFAULT false;
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS email_opt_in boolean DEFAULT false;
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS portal_access boolean DEFAULT false;
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS pin_changed boolean DEFAULT false;
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS last_login timestamptz;
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS block text;

CREATE TABLE IF NOT EXISTS public.committee_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid REFERENCES public.residents(id),
  role text,
  active boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.whatsapp_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id uuid REFERENCES public.societies(id),
  to_flat text,
  to_number text,
  message text,
  type text,
  status text DEFAULT 'pending',
  wa_msg_id text,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS invoice_seq;
CREATE SEQUENCE IF NOT EXISTS ticket_seq;

CREATE OR REPLACE FUNCTION public.is_committee()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM residents r
    LEFT JOIN committee_members cm ON cm.resident_id = r.id AND cm.active = true
    WHERE r.auth_user_id = auth.uid()
      AND r.status = 'active'
      AND (r.is_super_admin = true OR cm.id IS NOT NULL)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM residents
    WHERE auth_user_id = auth.uid()
      AND is_super_admin = true
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_role(role_name text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM residents r
    JOIN committee_members cm ON cm.resident_id = r.id AND cm.active = true
    WHERE r.auth_user_id = auth.uid()
      AND r.status = 'active'
      AND (cm.role = role_name OR r.is_super_admin = true)
  );
$$;

CREATE OR REPLACE FUNCTION public.get_my_flat()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT flat_number FROM residents
  WHERE auth_user_id = auth.uid() AND status = 'active'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_my_society_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT society_id FROM residents
  WHERE auth_user_id = auth.uid() AND status = 'active'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_resident_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM residents
  WHERE auth_user_id = auth.uid() AND status = 'active'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.trigger_send_whatsapp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Stub of pre-hardening hosted trigger (HTTP omitted in local tests).
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.invoice_number := 'INV/' || TO_CHAR(NOW(), 'YYYY') || '/' || LPAD(NEXTVAL('invoice_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.ticket_number := 'TKT-' || TO_CHAR(NOW(), 'MMYYYY') || '-' || LPAD(NEXTVAL('ticket_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

-- Match hosted default grants (open before phase0).
GRANT EXECUTE ON FUNCTION public.is_committee() TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(text) TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_flat() TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_society_id() TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_resident_id() TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_send_whatsapp() TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_invoice_number() TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_ticket_number() TO PUBLIC, anon, authenticated;

-- Hosted baseline: table-level SELECT (overrides column REVOKE unless migration
-- revokes table SELECT and re-grants non-secret columns only).
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.residents TO anon, authenticated;
GRANT SELECT (pin, pin_hash, portal_pin, id_number, id_document_url, id_type)
  ON public.residents TO anon, authenticated;

-- Hosted: service_role has full DML (Edge Functions).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON TABLE public.residents TO service_role;
    GRANT ALL ON TABLE public.whatsapp_log TO service_role;
    GRANT ALL ON TABLE public.societies TO service_role;
  END IF;
END $$;

-- Minimal invoice / ticket tables so generator triggers stay exercisable after EXECUTE revoke.
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id uuid,
  invoice_number text,
  total_amount numeric DEFAULT 0,
  amount_paid numeric DEFAULT 0,
  balance_due numeric DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.tickets_legacy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id uuid,
  ticket_number text
);

DROP TRIGGER IF EXISTS trg_generate_invoice_number ON public.invoices;
CREATE TRIGGER trg_generate_invoice_number
  BEFORE INSERT ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.generate_invoice_number();

DROP TRIGGER IF EXISTS trg_generate_ticket_number ON public.tickets_legacy;
CREATE TRIGGER trg_generate_ticket_number
  BEFORE INSERT ON public.tickets_legacy
  FOR EACH ROW EXECUTE FUNCTION public.generate_ticket_number();

DROP TRIGGER IF EXISTS trg_whatsapp_queue ON public.whatsapp_log;
CREATE TRIGGER trg_whatsapp_queue
  AFTER INSERT ON public.whatsapp_log
  FOR EACH ROW EXECUTE FUNCTION public.trigger_send_whatsapp();
