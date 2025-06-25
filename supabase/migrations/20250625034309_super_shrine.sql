-- Tabla para webhook URLs
CREATE TABLE IF NOT EXISTS whatsapp_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  url text NOT NULL,
  description text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabla para instancias de WhatsApp
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

-- Trigger para updated_at
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

-- Habilitar RLS
ALTER TABLE whatsapp_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_instances ENABLE ROW LEVEL SECURITY;

-- Políticas para whatsapp_webhooks (verificar si ya existen)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view all webhooks' AND tablename = 'whatsapp_webhooks') THEN
        CREATE POLICY "Users can view all webhooks" ON whatsapp_webhooks
            FOR SELECT TO authenticated USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage webhooks' AND tablename = 'whatsapp_webhooks') THEN
        CREATE POLICY "Users can manage webhooks" ON whatsapp_webhooks
            FOR ALL TO authenticated USING (true);
    END IF;
END $$;

-- Políticas para whatsapp_instances (verificar si ya existen)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view all instances' AND tablename = 'whatsapp_instances') THEN
        CREATE POLICY "Users can view all instances" ON whatsapp_instances
            FOR SELECT TO authenticated USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage instances' AND tablename = 'whatsapp_instances') THEN
        CREATE POLICY "Users can manage instances" ON whatsapp_instances
            FOR ALL TO authenticated USING (true);
    END IF;
END $$;

-- Insertar webhooks predeterminados
INSERT INTO whatsapp_webhooks (name, url, description) 
VALUES ('crear-instancia', 'https://repuestosonlinecrm-n8n.knbhoa.easypanel.host/webhook/crear-instancia', 'Webhook para crear nuevas instancias de WhatsApp')
ON CONFLICT (name) DO UPDATE SET url = EXCLUDED.url;

INSERT INTO whatsapp_webhooks (name, url, description) 
VALUES ('estatus-instancia', 'https://repuestosonlinecrm-n8n.knbhoa.easypanel.host/webhook/estatus-instancia', 'Webhook para verificar el estado de una instancia')
ON CONFLICT (name) DO UPDATE SET url = EXCLUDED.url;

INSERT INTO whatsapp_webhooks (name, url, description) 
VALUES ('qr', 'https://repuestosonlinecrm-n8n.knbhoa.easypanel.host/webhook/qr', 'Webhook para obtener el código QR de una instancia')
ON CONFLICT (name) DO UPDATE SET url = EXCLUDED.url;