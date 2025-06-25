/*
  # Configuración de Instancias de WhatsApp y Webhooks

  1. Nuevas Tablas
    - `whatsapp_webhooks` - Almacena URLs de webhooks para diferentes acciones
    - `whatsapp_instances` - Almacena configuración de instancias de WhatsApp

  2. Seguridad
    - Habilitar RLS en todas las tablas
    - Políticas para usuarios autenticados

  3. Datos Iniciales
    - Insertar webhooks predeterminados para crear instancias y verificar estado
*/

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

-- Políticas para whatsapp_webhooks
CREATE POLICY "Users can view all webhooks" ON whatsapp_webhooks
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage webhooks" ON whatsapp_webhooks
    FOR ALL TO authenticated USING (true);

-- Políticas para whatsapp_instances
CREATE POLICY "Users can view all instances" ON whatsapp_instances
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage instances" ON whatsapp_instances
    FOR ALL TO authenticated USING (true);

-- Insertar webhooks predeterminados
INSERT INTO whatsapp_webhooks (name, url, description) 
VALUES ('crear-instancia', 'https://repuestosonlinecrm-n8n.knbhoa.easypanel.host/webhook/crear-instancia', 'Webhook para crear nuevas instancias de WhatsApp')
ON CONFLICT (name) DO UPDATE SET url = EXCLUDED.url;

INSERT INTO whatsapp_webhooks (name, url, description) 
VALUES ('estatus-instancia', 'https://repuestosonlinecrm-n8n.knbhoa.easypanel.host/webhook/estatus-instancia', 'Webhook para verificar el estado de una instancia')
ON CONFLICT (name) DO UPDATE SET url = EXCLUDED.url;