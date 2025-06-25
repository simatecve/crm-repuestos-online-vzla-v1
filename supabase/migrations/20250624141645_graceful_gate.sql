/*
  # Sistema CRM - Conversaciones y Mensajes

  1. Nuevas Tablas
    - `conversations` - Conversaciones con contactos
    - `messages` - Mensajes individuales de cada conversación

  2. Seguridad
    - Habilitar RLS en todas las tablas
    - Políticas para usuarios autenticados

  3. Funciones
    - Trigger para actualizar último mensaje en conversaciones
    - Función para marcar mensajes como leídos
*/

-- Tabla de conversaciones
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL UNIQUE,
  contact_name text,
  pushname text,
  avatar_url text,
  last_message text,
  last_message_time timestamptz,
  unread_count integer DEFAULT 0,
  is_archived boolean DEFAULT false,
  is_pinned boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabla de mensajes
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  pushname text,
  message_content text NOT NULL,
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'audio', 'document', 'location')),
  direction text NOT NULL CHECK (direction IN ('sent', 'received')),
  status text DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
  timestamp timestamptz DEFAULT now(),
  is_read boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_conversations_phone ON conversations(phone_number);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_messages_phone ON messages(phone_number);
CREATE INDEX IF NOT EXISTS idx_messages_direction ON messages(direction);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);

-- Función para actualizar la conversación cuando se agrega un mensaje
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizar la conversación con el último mensaje
    UPDATE conversations 
    SET 
        last_message = NEW.message_content,
        last_message_time = NEW.timestamp,
        updated_at = now(),
        unread_count = CASE 
            WHEN NEW.direction = 'received' THEN unread_count + 1 
            ELSE unread_count 
        END
    WHERE phone_number = NEW.phone_number;
    
    -- Si no existe la conversación, crearla
    IF NOT FOUND THEN
        INSERT INTO conversations (
            phone_number, 
            contact_name, 
            pushname, 
            last_message, 
            last_message_time,
            unread_count
        ) VALUES (
            NEW.phone_number,
            NEW.pushname,
            NEW.pushname,
            NEW.message_content,
            NEW.timestamp,
            CASE WHEN NEW.direction = 'received' THEN 1 ELSE 0 END
        );
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Función para marcar mensajes como leídos
CREATE OR REPLACE FUNCTION mark_messages_as_read(conversation_phone text)
RETURNS void AS $$
BEGIN
    -- Marcar todos los mensajes recibidos como leídos
    UPDATE messages 
    SET is_read = true, status = 'read'
    WHERE phone_number = conversation_phone 
    AND direction = 'received' 
    AND is_read = false;
    
    -- Resetear contador de no leídos
    UPDATE conversations 
    SET unread_count = 0 
    WHERE phone_number = conversation_phone;
END;
$$ language 'plpgsql';

-- Trigger para actualizar conversación automáticamente
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_conversation_on_message') THEN
        CREATE TRIGGER trigger_update_conversation_on_message
            AFTER INSERT ON messages
            FOR EACH ROW EXECUTE FUNCTION update_conversation_on_message();
    END IF;
END $$;

-- Trigger para actualizar updated_at en conversaciones
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_conversations_updated_at') THEN
        CREATE TRIGGER update_conversations_updated_at 
            BEFORE UPDATE ON conversations 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Habilitar RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
CREATE POLICY "Users can view all conversations" ON conversations
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage conversations" ON conversations
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can view all messages" ON messages
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage messages" ON messages
    FOR ALL TO authenticated USING (true);

-- Insertar datos de ejemplo
INSERT INTO conversations (phone_number, contact_name, pushname, last_message, last_message_time, unread_count) VALUES
('+34600123456', 'Juan Pérez', 'Juan', 'Hola, ¿cómo estás?', now() - interval '5 minutes', 2),
('+34600789012', 'María García', 'María', 'Perfecto, nos vemos mañana', now() - interval '1 hour', 0),
('+34600345678', 'Carlos López', 'Carlos', '¿Tienes disponibilidad para una reunión?', now() - interval '2 hours', 1),
('+34600901234', 'Ana Martínez', 'Ana', 'Gracias por la información', now() - interval '1 day', 0),
('+34600567890', 'Luis Rodríguez', 'Luis', 'Te envío el documento por email', now() - interval '2 days', 3)
ON CONFLICT (phone_number) DO NOTHING;

INSERT INTO messages (conversation_id, phone_number, pushname, message_content, direction, timestamp, is_read) 
SELECT 
    c.id,
    c.phone_number,
    c.pushname,
    'Hola, ¿cómo estás?',
    'received',
    now() - interval '5 minutes',
    false
FROM conversations c WHERE c.phone_number = '+34600123456'
ON CONFLICT DO NOTHING;

INSERT INTO messages (conversation_id, phone_number, pushname, message_content, direction, timestamp, is_read) 
SELECT 
    c.id,
    c.phone_number,
    c.pushname,
    'Muy bien, gracias por preguntar',
    'sent',
    now() - interval '4 minutes',
    true
FROM conversations c WHERE c.phone_number = '+34600123456'
ON CONFLICT DO NOTHING;

INSERT INTO messages (conversation_id, phone_number, pushname, message_content, direction, timestamp, is_read) 
SELECT 
    c.id,
    c.phone_number,
    c.pushname,
    '¿Podemos hablar sobre el proyecto?',
    'received',
    now() - interval '3 minutes',
    false
FROM conversations c WHERE c.phone_number = '+34600123456'
ON CONFLICT DO NOTHING;