/*
  # Create contact groups and tags system

  1. New Tables
    - `contact_groups`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `description` (text)
      - `color` (text)
      - `is_active` (boolean)
      - `member_count` (integer)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `contact_tags`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `description` (text)
      - `color` (text)
      - `is_active` (boolean)
      - `usage_count` (integer)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `contact_group_members`
      - `id` (uuid, primary key)
      - `contact_id` (uuid, foreign key)
      - `group_id` (uuid, foreign key)
      - `added_at` (timestamp)
    
    - `contact_tag_assignments`
      - `id` (uuid, primary key)
      - `contact_id` (uuid, foreign key)
      - `tag_id` (uuid, foreign key)
      - `assigned_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage all data

  3. Functions and Triggers
    - Auto-update timestamps
    - Auto-update member counts
    - Auto-update usage counts
*/

-- Tabla de grupos de contactos
CREATE TABLE IF NOT EXISTS contact_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text DEFAULT '',
  color text DEFAULT '#3B82F6',
  is_active boolean DEFAULT true,
  member_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabla de etiquetas de contactos
CREATE TABLE IF NOT EXISTS contact_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text DEFAULT '',
  color text DEFAULT '#10B981',
  is_active boolean DEFAULT true,
  usage_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabla de relación contactos-grupos
CREATE TABLE IF NOT EXISTS contact_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
  group_id uuid REFERENCES contact_groups(id) ON DELETE CASCADE,
  added_at timestamptz DEFAULT now(),
  UNIQUE(contact_id, group_id)
);

-- Tabla de relación contactos-etiquetas
CREATE TABLE IF NOT EXISTS contact_tag_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES contact_tags(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(contact_id, tag_id)
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_contact_groups_name ON contact_groups(name);
CREATE INDEX IF NOT EXISTS idx_contact_groups_active ON contact_groups(is_active);
CREATE INDEX IF NOT EXISTS idx_contact_tags_name ON contact_tags(name);
CREATE INDEX IF NOT EXISTS idx_contact_tags_active ON contact_tags(is_active);
CREATE INDEX IF NOT EXISTS idx_contact_group_members_contact ON contact_group_members(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_group_members_group ON contact_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_contact_tag_assignments_contact ON contact_tag_assignments(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_tag_assignments_tag ON contact_tag_assignments(tag_id);

-- Función para actualizar contador de miembros en grupos
CREATE OR REPLACE FUNCTION update_group_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE contact_groups 
        SET member_count = member_count + 1 
        WHERE id = NEW.group_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE contact_groups 
        SET member_count = member_count - 1 
        WHERE id = OLD.group_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Función para actualizar contador de uso en etiquetas
CREATE OR REPLACE FUNCTION update_tag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE contact_tags 
        SET usage_count = usage_count + 1 
        WHERE id = NEW.tag_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE contact_tags 
        SET usage_count = usage_count - 1 
        WHERE id = OLD.tag_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Triggers para actualizar timestamps
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_contact_groups_updated_at') THEN
        CREATE TRIGGER update_contact_groups_updated_at 
            BEFORE UPDATE ON contact_groups 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_contact_tags_updated_at') THEN
        CREATE TRIGGER update_contact_tags_updated_at 
            BEFORE UPDATE ON contact_tags 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Triggers para contadores automáticos
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_group_member_count') THEN
        CREATE TRIGGER trigger_update_group_member_count
            AFTER INSERT OR DELETE ON contact_group_members
            FOR EACH ROW EXECUTE FUNCTION update_group_member_count();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_tag_usage_count') THEN
        CREATE TRIGGER trigger_update_tag_usage_count
            AFTER INSERT OR DELETE ON contact_tag_assignments
            FOR EACH ROW EXECUTE FUNCTION update_tag_usage_count();
    END IF;
END $$;

-- Habilitar RLS
ALTER TABLE contact_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_tag_assignments ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad para contact_groups
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view all contact groups' AND tablename = 'contact_groups') THEN
        CREATE POLICY "Users can view all contact groups" ON contact_groups
            FOR SELECT TO authenticated USING (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create contact groups' AND tablename = 'contact_groups') THEN
        CREATE POLICY "Users can create contact groups" ON contact_groups
            FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update contact groups' AND tablename = 'contact_groups') THEN
        CREATE POLICY "Users can update contact groups" ON contact_groups
            FOR UPDATE TO authenticated USING (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete contact groups' AND tablename = 'contact_groups') THEN
        CREATE POLICY "Users can delete contact groups" ON contact_groups
            FOR DELETE TO authenticated USING (true);
    END IF;
END $$;

-- Políticas de seguridad para contact_tags
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view all contact tags' AND tablename = 'contact_tags') THEN
        CREATE POLICY "Users can view all contact tags" ON contact_tags
            FOR SELECT TO authenticated USING (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create contact tags' AND tablename = 'contact_tags') THEN
        CREATE POLICY "Users can create contact tags" ON contact_tags
            FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update contact tags' AND tablename = 'contact_tags') THEN
        CREATE POLICY "Users can update contact tags" ON contact_tags
            FOR UPDATE TO authenticated USING (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete contact tags' AND tablename = 'contact_tags') THEN
        CREATE POLICY "Users can delete contact tags" ON contact_tags
            FOR DELETE TO authenticated USING (true);
    END IF;
END $$;

-- Políticas de seguridad para contact_group_members
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view all group memberships' AND tablename = 'contact_group_members') THEN
        CREATE POLICY "Users can view all group memberships" ON contact_group_members
            FOR SELECT TO authenticated USING (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage group memberships' AND tablename = 'contact_group_members') THEN
        CREATE POLICY "Users can manage group memberships" ON contact_group_members
            FOR ALL TO authenticated USING (true);
    END IF;
END $$;

-- Políticas de seguridad para contact_tag_assignments
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view all tag assignments' AND tablename = 'contact_tag_assignments') THEN
        CREATE POLICY "Users can view all tag assignments" ON contact_tag_assignments
            FOR SELECT TO authenticated USING (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage tag assignments' AND tablename = 'contact_tag_assignments') THEN
        CREATE POLICY "Users can manage tag assignments" ON contact_tag_assignments
            FOR ALL TO authenticated USING (true);
    END IF;
END $$;

-- Insertar algunos grupos y etiquetas de ejemplo
INSERT INTO contact_groups (name, description, color) VALUES
('Clientes VIP', 'Clientes de alto valor con servicios premium', '#10B981'),
('Prospectos Calientes', 'Leads con alta probabilidad de conversión', '#F59E0B'),
('Newsletter Suscriptores', 'Contactos suscritos al newsletter', '#3B82F6'),
('Eventos Asistentes', 'Personas que han asistido a nuestros eventos', '#8B5CF6')
ON CONFLICT (name) DO NOTHING;

INSERT INTO contact_tags (name, description, color) VALUES
('Cliente', 'Contacto que ya es cliente', '#10B981'),
('Prospecto', 'Contacto potencial', '#F59E0B'),
('Influencer', 'Persona con influencia en redes sociales', '#EC4899'),
('Partner', 'Socio comercial o colaborador', '#3B82F6'),
('Proveedor', 'Empresa o persona que nos provee servicios', '#6B7280'),
('Referido', 'Contacto que llegó por referencia', '#8B5CF6')
ON CONFLICT (name) DO NOTHING;