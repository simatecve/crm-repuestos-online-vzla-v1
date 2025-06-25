/*
  # Implementación de Campos Personalizados y Puntuación de Leads

  1. Nuevas Funcionalidades
    - Añadir soporte para campos personalizados en contactos y leads
    - Implementar sistema de puntuación de leads (lead scoring)
    - Añadir campos para seguimiento de comportamiento y engagement
    - Crear tablas para definiciones de campos personalizados

  2. Cambios
    - Añadir columnas para puntuación y comportamiento en leads y contactos
    - Crear tabla para definir campos personalizados
    - Añadir índices para optimizar consultas
*/

-- Tabla para definiciones de campos personalizados
CREATE TABLE IF NOT EXISTS custom_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  label text NOT NULL,
  field_type text NOT NULL CHECK (field_type IN ('text', 'number', 'date', 'boolean', 'select', 'multiselect')),
  entity_type text NOT NULL CHECK (entity_type IN ('contact', 'lead')),
  options jsonb DEFAULT '[]',
  is_required boolean DEFAULT false,
  is_visible boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Añadir columna de puntuación a contactos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contacts' AND column_name = 'score'
  ) THEN
    ALTER TABLE contacts ADD COLUMN score integer DEFAULT 0;
  END IF;
END $$;

-- Añadir columna de campos personalizados a contactos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contacts' AND column_name = 'custom_fields'
  ) THEN
    ALTER TABLE contacts ADD COLUMN custom_fields jsonb DEFAULT '{}';
  END IF;
END $$;

-- Añadir columna de comportamiento a contactos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contacts' AND column_name = 'behavior_data'
  ) THEN
    ALTER TABLE contacts ADD COLUMN behavior_data jsonb DEFAULT '{}';
  END IF;
END $$;

-- Añadir columna de puntuación a leads
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'score'
  ) THEN
    ALTER TABLE leads ADD COLUMN score integer DEFAULT 0;
  END IF;
END $$;

-- Añadir columna de campos personalizados a leads
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'custom_fields'
  ) THEN
    ALTER TABLE leads ADD COLUMN custom_fields jsonb DEFAULT '{}';
  END IF;
END $$;

-- Añadir columna de comportamiento a leads
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'behavior_data'
  ) THEN
    ALTER TABLE leads ADD COLUMN behavior_data jsonb DEFAULT '{}';
  END IF;
END $$;

-- Tabla para reglas de puntuación de leads
CREATE TABLE IF NOT EXISTS scoring_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  entity_type text NOT NULL CHECK (entity_type IN ('contact', 'lead')),
  condition_field text NOT NULL,
  condition_operator text NOT NULL CHECK (condition_operator IN ('equals', 'not_equals', 'contains', 'not_contains', 'greater_than', 'less_than', 'is_empty', 'is_not_empty')),
  condition_value text,
  points integer NOT NULL,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabla para historial de puntuación
CREATE TABLE IF NOT EXISTS scoring_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('contact', 'lead')),
  rule_id uuid REFERENCES scoring_rules(id),
  points integer NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now()
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_contacts_score ON contacts(score);
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score);
CREATE INDEX IF NOT EXISTS idx_custom_fields_entity_type ON custom_fields(entity_type);
CREATE INDEX IF NOT EXISTS idx_scoring_rules_entity_type ON scoring_rules(entity_type);
CREATE INDEX IF NOT EXISTS idx_scoring_history_entity_id ON scoring_history(entity_id);

-- Trigger para actualizar updated_at
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_custom_fields_updated_at') THEN
        CREATE TRIGGER update_custom_fields_updated_at 
            BEFORE UPDATE ON custom_fields 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_scoring_rules_updated_at') THEN
        CREATE TRIGGER update_scoring_rules_updated_at 
            BEFORE UPDATE ON scoring_rules 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Habilitar RLS
ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_history ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
CREATE POLICY "Users can view all custom fields" ON custom_fields
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage custom fields" ON custom_fields
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can view all scoring rules" ON scoring_rules
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage scoring rules" ON scoring_rules
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can view all scoring history" ON scoring_history
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert scoring history" ON scoring_history
    FOR INSERT TO authenticated WITH CHECK (true);

-- Insertar algunos campos personalizados de ejemplo
INSERT INTO custom_fields (name, label, field_type, entity_type, options, is_required, display_order) VALUES
('industry', 'Industria', 'select', 'contact', '["Tecnología", "Salud", "Educación", "Finanzas", "Retail", "Manufactura", "Servicios", "Otros"]', false, 1),
('birthday', 'Fecha de Nacimiento', 'date', 'contact', '[]', false, 2),
('interests', 'Intereses', 'multiselect', 'contact', '["Marketing", "Ventas", "Tecnología", "Diseño", "Desarrollo", "Finanzas", "Recursos Humanos"]', false, 3),
('website', 'Sitio Web', 'text', 'contact', '[]', false, 4),
('budget', 'Presupuesto', 'number', 'lead', '[]', false, 1),
('decision_maker', '¿Es tomador de decisiones?', 'boolean', 'lead', '[]', false, 2),
('product_interest', 'Producto de Interés', 'select', 'lead', '["Producto A", "Producto B", "Producto C", "Servicio X", "Servicio Y"]', false, 3),
('lead_source_details', 'Detalles de Origen', 'text', 'lead', '[]', false, 4)
ON CONFLICT DO NOTHING;

-- Insertar algunas reglas de puntuación de ejemplo
INSERT INTO scoring_rules (name, description, entity_type, condition_field, condition_operator, condition_value, points, is_active) VALUES
('Email corporativo', 'Puntos adicionales por tener email corporativo', 'contact', 'email', 'not_contains', 'gmail.com,hotmail.com,yahoo.com', 10, true),
('Teléfono proporcionado', 'Contacto proporcionó número de teléfono', 'contact', 'phone', 'is_not_empty', '', 5, true),
('Segmento Premium', 'Contacto en segmento premium', 'contact', 'segment', 'equals', 'premium', 20, true),
('Presupuesto alto', 'Lead con presupuesto superior a 10000', 'lead', 'value', 'greater_than', '10000', 15, true),
('Tomador de decisiones', 'Lead es tomador de decisiones', 'lead', 'custom_fields.decision_maker', 'equals', 'true', 25, true),
('Etapa avanzada', 'Lead en etapa de negociación o propuesta', 'lead', 'stage', 'contains', 'propuesta,negociacion', 20, true)
ON CONFLICT DO NOTHING;