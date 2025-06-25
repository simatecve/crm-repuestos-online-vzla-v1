/*
  # Tabla de respuestas rápidas

  1. Nueva Tabla
    - `quick_replies` - Respuestas rápidas guardadas por el usuario
      - `id` (uuid, primary key)
      - `title` (text) - Título de la respuesta rápida
      - `content` (text) - Contenido del mensaje
      - `category` (text) - Categoría para organizar
      - `is_active` (boolean) - Si está activa
      - `usage_count` (integer) - Contador de uso
      - `created_by` (uuid) - Usuario que la creó
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Seguridad
    - Habilitar RLS
    - Políticas para usuarios autenticados
*/

-- Tabla de respuestas rápidas
CREATE TABLE IF NOT EXISTS quick_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  category text DEFAULT 'general',
  is_active boolean DEFAULT true,
  usage_count integer DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_quick_replies_category ON quick_replies(category);
CREATE INDEX IF NOT EXISTS idx_quick_replies_active ON quick_replies(is_active);
CREATE INDEX IF NOT EXISTS idx_quick_replies_created_by ON quick_replies(created_by);

-- Trigger para updated_at
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_quick_replies_updated_at') THEN
        CREATE TRIGGER update_quick_replies_updated_at 
            BEFORE UPDATE ON quick_replies 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Habilitar RLS
ALTER TABLE quick_replies ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
CREATE POLICY "Users can view own quick replies" ON quick_replies
    FOR SELECT TO authenticated 
    USING (auth.uid() = created_by);

CREATE POLICY "Users can manage own quick replies" ON quick_replies
    FOR ALL TO authenticated 
    USING (auth.uid() = created_by)
    WITH CHECK (auth.uid() = created_by);

-- Insertar respuestas rápidas de ejemplo
INSERT INTO quick_replies (title, content, category, created_by) 
SELECT 
    'Saludo inicial',
    '¡Hola! Gracias por contactarnos. ¿En qué podemos ayudarte hoy?',
    'saludos',
    auth.uid()
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO quick_replies (title, content, category, created_by) 
SELECT 
    'Información de horarios',
    'Nuestro horario de atención es de lunes a viernes de 9:00 AM a 6:00 PM.',
    'informacion',
    auth.uid()
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO quick_replies (title, content, category, created_by) 
SELECT 
    'Despedida',
    'Gracias por contactarnos. ¡Que tengas un excelente día!',
    'despedidas',
    auth.uid()
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO quick_replies (title, content, category, created_by) 
SELECT 
    'Solicitar información',
    '¿Podrías proporcionarme más detalles sobre tu consulta?',
    'preguntas',
    auth.uid()
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO quick_replies (title, content, category, created_by) 
SELECT 
    'Agendar reunión',
    'Me gustaría agendar una reunión contigo. ¿Cuándo tienes disponibilidad?',
    'reuniones',
    auth.uid()
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;