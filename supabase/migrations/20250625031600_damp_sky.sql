/*
  # WhatsApp Instances Management

  1. New Tables
    - `whatsapp_webhooks` - Store webhook URLs for different operations
    - `whatsapp_instances` - Store WhatsApp instances configuration

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Table for webhook URLs
CREATE TABLE IF NOT EXISTS whatsapp_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  url text NOT NULL,
  description text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table for WhatsApp instances
CREATE TABLE IF NOT EXISTS whatsapp_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text DEFAULT '#3B82F6',
  status text DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'connecting')),
  qr_code text,
  session_data jsonb DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Trigger for updated_at
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_whatsapp_webhooks_updated_at') THEN
        CREATE TRIGGER update_whatsapp_webhooks_updated_at 
            BEFORE UPDATE ON whatsapp_webhooks 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_whatsapp_instances_updated_at') THEN
        CREATE TRIGGER update_whatsapp_instances_updated_at 
            BEFORE UPDATE ON whatsapp_instances 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Enable RLS
ALTER TABLE whatsapp_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_instances ENABLE ROW LEVEL SECURITY;

-- Policies for whatsapp_webhooks
CREATE POLICY "Users can view all webhooks" ON whatsapp_webhooks
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage webhooks" ON whatsapp_webhooks
    FOR ALL TO authenticated USING (true);

-- Policies for whatsapp_instances
CREATE POLICY "Users can view all instances" ON whatsapp_instances
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage instances" ON whatsapp_instances
    FOR ALL TO authenticated USING (true);

-- Insert default webhook for creating instances
INSERT INTO whatsapp_webhooks (name, url, description) 
VALUES ('crear-instancia', 'https://repuestosonlinecrm-n8n.knbhoa.easypanel.host/webhook/crear-instancia', 'Webhook para crear nuevas instancias de WhatsApp')
ON CONFLICT (name) DO UPDATE SET url = EXCLUDED.url;