/*
  # Personalización Avanzada de Campañas y Pruebas A/B

  1. Nuevas Funcionalidades
    - Añadir soporte para personalización avanzada de campañas
    - Implementar sistema de pruebas A/B
    - Añadir campos para contenido condicional
    - Crear tablas para variantes de pruebas A/B

  2. Cambios
    - Añadir columnas para contenido condicional en plantillas
    - Crear tabla para variantes de pruebas A/B
    - Añadir campos para seguimiento de resultados de pruebas A/B
*/

-- Añadir columna de contenido condicional a plantillas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'plantillas' AND column_name = 'conditional_content'
  ) THEN
    ALTER TABLE plantillas ADD COLUMN conditional_content jsonb DEFAULT '[]';
  END IF;
END $$;

-- Añadir columna de segmentos objetivo a plantillas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'plantillas' AND column_name = 'target_segments'
  ) THEN
    ALTER TABLE plantillas ADD COLUMN target_segments jsonb DEFAULT '[]';
  END IF;
END $$;

-- Tabla para variantes de pruebas A/B
CREATE TABLE IF NOT EXISTS ab_test_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  name text NOT NULL,
  subject text,
  content text,
  conditional_content jsonb DEFAULT '[]',
  weight integer DEFAULT 50,
  sent_count integer DEFAULT 0,
  open_count integer DEFAULT 0,
  click_count integer DEFAULT 0,
  conversion_count integer DEFAULT 0,
  is_winner boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Añadir columna de prueba A/B a campañas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'is_ab_test'
  ) THEN
    ALTER TABLE campaigns ADD COLUMN is_ab_test boolean DEFAULT false;
  END IF;
END $$;

-- Añadir columna de configuración de prueba A/B a campañas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'ab_test_config'
  ) THEN
    ALTER TABLE campaigns ADD COLUMN ab_test_config jsonb DEFAULT '{}';
  END IF;
END $$;

-- Añadir columna de personalización avanzada a campañas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'personalization_config'
  ) THEN
    ALTER TABLE campaigns ADD COLUMN personalization_config jsonb DEFAULT '{}';
  END IF;
END $$;

-- Tabla para reglas de personalización
CREATE TABLE IF NOT EXISTS personalization_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  condition_field text NOT NULL,
  condition_operator text NOT NULL CHECK (condition_operator IN ('equals', 'not_equals', 'contains', 'not_contains', 'greater_than', 'less_than', 'is_empty', 'is_not_empty')),
  condition_value text,
  content_override jsonb DEFAULT '{}',
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_ab_test_variants_campaign_id ON ab_test_variants(campaign_id);
CREATE INDEX IF NOT EXISTS idx_personalization_rules_campaign_id ON personalization_rules(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_is_ab_test ON campaigns(is_ab_test);

-- Trigger para actualizar updated_at
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_ab_test_variants_updated_at') THEN
        CREATE TRIGGER update_ab_test_variants_updated_at 
            BEFORE UPDATE ON ab_test_variants 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_personalization_rules_updated_at') THEN
        CREATE TRIGGER update_personalization_rules_updated_at 
            BEFORE UPDATE ON personalization_rules 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Habilitar RLS
ALTER TABLE ab_test_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE personalization_rules ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
CREATE POLICY "Users can view all ab_test_variants" ON ab_test_variants
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage ab_test_variants" ON ab_test_variants
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can view all personalization_rules" ON personalization_rules
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage personalization_rules" ON personalization_rules
    FOR ALL TO authenticated USING (true);