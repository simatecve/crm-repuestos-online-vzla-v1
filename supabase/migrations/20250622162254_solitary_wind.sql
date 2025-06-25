/*
  # Sistema de Gestión de Marketing Integral - Extensión de Base de Datos

  1. Nuevas Tablas
    - `etiquetas` - Sistema de etiquetado para contactos y leads
    - `grupos` - Agrupación de contactos por categorías
    - `listas` - Listas de distribución estáticas y dinámicas
    - `plantillas` - Plantillas para campañas de email, WhatsApp y SMS
    - `mensajes` - Registro de mensajes enviados
    - `interacciones` - Historial de interacciones con contactos y leads
    - `actividades` - Log de actividades del sistema
    - `contactos_grupos` - Relación muchos a muchos entre contactos y grupos
    - `contactos_listas` - Relación muchos a muchos entre contactos y listas

  2. Seguridad
    - Habilitar RLS en todas las nuevas tablas
    - Políticas de acceso para usuarios autenticados
    - Triggers para actualización automática de timestamps

  3. Optimización
    - Índices estratégicos para consultas frecuentes
    - Foreign keys para integridad referencial
*/

-- Función para actualizar updated_at (solo si no existe)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Tabla de etiquetas
CREATE TABLE IF NOT EXISTS etiquetas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text UNIQUE NOT NULL,
  color text DEFAULT '#3B82F6',
  descripcion text DEFAULT '',
  activa boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabla de grupos
CREATE TABLE IF NOT EXISTS grupos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text UNIQUE NOT NULL,
  descripcion text DEFAULT '',
  color text DEFAULT '#10B981',
  total_contactos integer DEFAULT 0,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabla de listas
CREATE TABLE IF NOT EXISTS listas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text UNIQUE NOT NULL,
  descripcion text DEFAULT '',
  tipo text DEFAULT 'estatica',
  criterios jsonb DEFAULT '{}',
  total_contactos integer DEFAULT 0,
  activa boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT listas_tipo_check CHECK (tipo = ANY (ARRAY['estatica'::text, 'dinamica'::text]))
);

-- Tabla de plantillas
CREATE TABLE IF NOT EXISTS plantillas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  tipo text NOT NULL,
  asunto text DEFAULT '',
  contenido text NOT NULL,
  variables jsonb DEFAULT '{}',
  activa boolean DEFAULT true,
  uso_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT plantillas_tipo_check CHECK (tipo = ANY (ARRAY['email'::text, 'whatsapp'::text, 'sms'::text]))
);

-- Tabla de mensajes
CREATE TABLE IF NOT EXISTS mensajes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campana_id uuid,
  contacto_id uuid,
  tipo text NOT NULL,
  asunto text DEFAULT '',
  contenido text NOT NULL,
  estado text DEFAULT 'pendiente'::text,
  enviado_en timestamptz,
  entregado_en timestamptz,
  abierto_en timestamptz,
  click_en timestamptz,
  respondido_en timestamptz,
  error_mensaje text DEFAULT '',
  metadatos jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT mensajes_tipo_check CHECK (tipo = ANY (ARRAY['email'::text, 'whatsapp'::text, 'sms'::text])),
  CONSTRAINT mensajes_estado_check CHECK (estado = ANY (ARRAY['pendiente'::text, 'enviado'::text, 'entregado'::text, 'abierto'::text, 'error'::text]))
);

-- Tabla de interacciones
CREATE TABLE IF NOT EXISTS interacciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  contacto_id uuid,
  lead_id uuid,
  campana_id uuid,
  mensaje_id uuid,
  usuario_id uuid,
  titulo text NOT NULL,
  descripcion text DEFAULT '',
  fecha timestamptz DEFAULT now(),
  metadatos jsonb DEFAULT '{}'
);

-- Tabla de actividades del sistema
CREATE TABLE IF NOT EXISTS actividades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid,
  accion text NOT NULL,
  entidad text NOT NULL,
  entidad_id uuid,
  descripcion text NOT NULL,
  metadatos jsonb DEFAULT '{}',
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Tabla de relación contactos-grupos
CREATE TABLE IF NOT EXISTS contactos_grupos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contacto_id uuid,
  grupo_id uuid,
  agregado_en timestamptz DEFAULT now(),
  UNIQUE(contacto_id, grupo_id)
);

-- Tabla de relación contactos-listas
CREATE TABLE IF NOT EXISTS contactos_listas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contacto_id uuid,
  lista_id uuid,
  agregado_en timestamptz DEFAULT now(),
  UNIQUE(contacto_id, lista_id)
);

-- Agregar foreign keys solo si las tablas de referencia existen
DO $$
BEGIN
  -- Foreign keys para mensajes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'campaigns') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'mensajes_campana_id_fkey') THEN
      ALTER TABLE mensajes ADD CONSTRAINT mensajes_campana_id_fkey FOREIGN KEY (campana_id) REFERENCES campaigns(id) ON DELETE CASCADE;
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contacts') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'mensajes_contacto_id_fkey') THEN
      ALTER TABLE mensajes ADD CONSTRAINT mensajes_contacto_id_fkey FOREIGN KEY (contacto_id) REFERENCES contacts(id) ON DELETE CASCADE;
    END IF;
  END IF;

  -- Foreign keys para interacciones
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contacts') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'interacciones_contacto_id_fkey') THEN
      ALTER TABLE interacciones ADD CONSTRAINT interacciones_contacto_id_fkey FOREIGN KEY (contacto_id) REFERENCES contacts(id) ON DELETE CASCADE;
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leads') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'interacciones_lead_id_fkey') THEN
      ALTER TABLE interacciones ADD CONSTRAINT interacciones_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'campaigns') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'interacciones_campana_id_fkey') THEN
      ALTER TABLE interacciones ADD CONSTRAINT interacciones_campana_id_fkey FOREIGN KEY (campana_id) REFERENCES campaigns(id);
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'interacciones_mensaje_id_fkey') THEN
    ALTER TABLE interacciones ADD CONSTRAINT interacciones_mensaje_id_fkey FOREIGN KEY (mensaje_id) REFERENCES mensajes(id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'interacciones_usuario_id_fkey') THEN
      ALTER TABLE interacciones ADD CONSTRAINT interacciones_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES users(id);
    END IF;
  END IF;

  -- Foreign keys para actividades
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'actividades_usuario_id_fkey') THEN
      ALTER TABLE actividades ADD CONSTRAINT actividades_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES users(id);
    END IF;
  END IF;

  -- Foreign keys para contactos_grupos
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contacts') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'contactos_grupos_contacto_id_fkey') THEN
      ALTER TABLE contactos_grupos ADD CONSTRAINT contactos_grupos_contacto_id_fkey FOREIGN KEY (contacto_id) REFERENCES contacts(id) ON DELETE CASCADE;
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'contactos_grupos_grupo_id_fkey') THEN
    ALTER TABLE contactos_grupos ADD CONSTRAINT contactos_grupos_grupo_id_fkey FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE;
  END IF;

  -- Foreign keys para contactos_listas
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contacts') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'contactos_listas_contacto_id_fkey') THEN
      ALTER TABLE contactos_listas ADD CONSTRAINT contactos_listas_contacto_id_fkey FOREIGN KEY (contacto_id) REFERENCES contacts(id) ON DELETE CASCADE;
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'contactos_listas_lista_id_fkey') THEN
    ALTER TABLE contactos_listas ADD CONSTRAINT contactos_listas_lista_id_fkey FOREIGN KEY (lista_id) REFERENCES listas(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Crear índices solo si no existen
CREATE INDEX IF NOT EXISTS idx_etiquetas_nombre ON etiquetas(nombre);
CREATE INDEX IF NOT EXISTS idx_etiquetas_activa ON etiquetas(activa);
CREATE INDEX IF NOT EXISTS idx_grupos_nombre ON grupos(nombre);
CREATE INDEX IF NOT EXISTS idx_grupos_activo ON grupos(activo);
CREATE INDEX IF NOT EXISTS idx_listas_nombre ON listas(nombre);
CREATE INDEX IF NOT EXISTS idx_listas_activa ON listas(activa);
CREATE INDEX IF NOT EXISTS idx_plantillas_tipo ON plantillas(tipo);
CREATE INDEX IF NOT EXISTS idx_plantillas_activa ON plantillas(activa);
CREATE INDEX IF NOT EXISTS idx_mensajes_campana ON mensajes(campana_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_contacto ON mensajes(contacto_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_estado ON mensajes(estado);
CREATE INDEX IF NOT EXISTS idx_mensajes_tipo ON mensajes(tipo);
CREATE INDEX IF NOT EXISTS idx_interacciones_contacto ON interacciones(contacto_id);
CREATE INDEX IF NOT EXISTS idx_interacciones_lead ON interacciones(lead_id);
CREATE INDEX IF NOT EXISTS idx_interacciones_tipo ON interacciones(tipo);
CREATE INDEX IF NOT EXISTS idx_actividades_usuario ON actividades(usuario_id);
CREATE INDEX IF NOT EXISTS idx_actividades_entidad ON actividades(entidad);
CREATE INDEX IF NOT EXISTS idx_contactos_grupos_contacto ON contactos_grupos(contacto_id);
CREATE INDEX IF NOT EXISTS idx_contactos_grupos_grupo ON contactos_grupos(grupo_id);
CREATE INDEX IF NOT EXISTS idx_contactos_listas_contacto ON contactos_listas(contacto_id);
CREATE INDEX IF NOT EXISTS idx_contactos_listas_lista ON contactos_listas(lista_id);

-- Crear triggers solo si no existen
DO $$
BEGIN
  -- Trigger para etiquetas
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_etiquetas_updated_at') THEN
    CREATE TRIGGER update_etiquetas_updated_at BEFORE UPDATE ON etiquetas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- Trigger para grupos
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_grupos_updated_at') THEN
    CREATE TRIGGER update_grupos_updated_at BEFORE UPDATE ON grupos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- Trigger para listas
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_listas_updated_at') THEN
    CREATE TRIGGER update_listas_updated_at BEFORE UPDATE ON listas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- Trigger para plantillas
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_plantillas_updated_at') THEN
    CREATE TRIGGER update_plantillas_updated_at BEFORE UPDATE ON plantillas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Habilitar RLS en las nuevas tablas
ALTER TABLE etiquetas ENABLE ROW LEVEL SECURITY;
ALTER TABLE grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE listas ENABLE ROW LEVEL SECURITY;
ALTER TABLE contactos_grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE contactos_listas ENABLE ROW LEVEL SECURITY;
ALTER TABLE plantillas ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensajes ENABLE ROW LEVEL SECURITY;
ALTER TABLE interacciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE actividades ENABLE ROW LEVEL SECURITY;

-- Crear políticas de seguridad solo si no existen
DO $$
BEGIN
  -- Políticas para etiquetas
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'etiquetas' AND policyname = 'Los usuarios pueden ver todas las etiquetas') THEN
    CREATE POLICY "Los usuarios pueden ver todas las etiquetas" ON etiquetas FOR SELECT TO authenticated USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'etiquetas' AND policyname = 'Los usuarios pueden gestionar etiquetas') THEN
    CREATE POLICY "Los usuarios pueden gestionar etiquetas" ON etiquetas FOR ALL TO authenticated USING (true);
  END IF;

  -- Políticas para grupos
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'grupos' AND policyname = 'Los usuarios pueden ver todos los grupos') THEN
    CREATE POLICY "Los usuarios pueden ver todos los grupos" ON grupos FOR SELECT TO authenticated USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'grupos' AND policyname = 'Los usuarios pueden gestionar grupos') THEN
    CREATE POLICY "Los usuarios pueden gestionar grupos" ON grupos FOR ALL TO authenticated USING (true);
  END IF;

  -- Políticas para listas
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'listas' AND policyname = 'Los usuarios pueden ver todas las listas') THEN
    CREATE POLICY "Los usuarios pueden ver todas las listas" ON listas FOR SELECT TO authenticated USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'listas' AND policyname = 'Los usuarios pueden gestionar listas') THEN
    CREATE POLICY "Los usuarios pueden gestionar listas" ON listas FOR ALL TO authenticated USING (true);
  END IF;

  -- Políticas para contactos_grupos
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contactos_grupos' AND policyname = 'Los usuarios pueden ver contactos_grupos') THEN
    CREATE POLICY "Los usuarios pueden ver contactos_grupos" ON contactos_grupos FOR SELECT TO authenticated USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contactos_grupos' AND policyname = 'Los usuarios pueden gestionar contactos_grupos') THEN
    CREATE POLICY "Los usuarios pueden gestionar contactos_grupos" ON contactos_grupos FOR ALL TO authenticated USING (true);
  END IF;

  -- Políticas para contactos_listas
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contactos_listas' AND policyname = 'Los usuarios pueden ver contactos_listas') THEN
    CREATE POLICY "Los usuarios pueden ver contactos_listas" ON contactos_listas FOR SELECT TO authenticated USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contactos_listas' AND policyname = 'Los usuarios pueden gestionar contactos_listas') THEN
    CREATE POLICY "Los usuarios pueden gestionar contactos_listas" ON contactos_listas FOR ALL TO authenticated USING (true);
  END IF;

  -- Políticas para plantillas
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'plantillas' AND policyname = 'Los usuarios pueden ver todas las plantillas') THEN
    CREATE POLICY "Los usuarios pueden ver todas las plantillas" ON plantillas FOR SELECT TO authenticated USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'plantillas' AND policyname = 'Los usuarios pueden gestionar plantillas') THEN
    CREATE POLICY "Los usuarios pueden gestionar plantillas" ON plantillas FOR ALL TO authenticated USING (true);
  END IF;

  -- Políticas para mensajes
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mensajes' AND policyname = 'Los usuarios pueden ver todos los mensajes') THEN
    CREATE POLICY "Los usuarios pueden ver todos los mensajes" ON mensajes FOR SELECT TO authenticated USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mensajes' AND policyname = 'Los usuarios pueden gestionar mensajes') THEN
    CREATE POLICY "Los usuarios pueden gestionar mensajes" ON mensajes FOR ALL TO authenticated USING (true);
  END IF;

  -- Políticas para interacciones
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'interacciones' AND policyname = 'Los usuarios pueden ver todas las interacciones') THEN
    CREATE POLICY "Los usuarios pueden ver todas las interacciones" ON interacciones FOR SELECT TO authenticated USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'interacciones' AND policyname = 'Los usuarios pueden gestionar interacciones') THEN
    CREATE POLICY "Los usuarios pueden gestionar interacciones" ON interacciones FOR ALL TO authenticated USING (true);
  END IF;

  -- Políticas para actividades
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'actividades' AND policyname = 'Los usuarios pueden ver todas las actividades') THEN
    CREATE POLICY "Los usuarios pueden ver todas las actividades" ON actividades FOR SELECT TO authenticated USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'actividades' AND policyname = 'Los usuarios pueden crear actividades') THEN
    CREATE POLICY "Los usuarios pueden crear actividades" ON actividades FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

-- Insertar datos de ejemplo usando bloques DO para evitar conflictos
DO $$
BEGIN
  -- Insertar etiquetas si no existen
  IF NOT EXISTS (SELECT 1 FROM etiquetas WHERE nombre = 'Cliente VIP') THEN
    INSERT INTO etiquetas (nombre, color, descripcion) VALUES ('Cliente VIP', '#F59E0B', 'Clientes de alto valor');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM etiquetas WHERE nombre = 'Prospecto Caliente') THEN
    INSERT INTO etiquetas (nombre, color, descripcion) VALUES ('Prospecto Caliente', '#EF4444', 'Leads con alta probabilidad de conversión');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM etiquetas WHERE nombre = 'Newsletter') THEN
    INSERT INTO etiquetas (nombre, color, descripcion) VALUES ('Newsletter', '#3B82F6', 'Suscriptores del newsletter');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM etiquetas WHERE nombre = 'Evento') THEN
    INSERT INTO etiquetas (nombre, color, descripcion) VALUES ('Evento', '#8B5CF6', 'Contactos de eventos');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM etiquetas WHERE nombre = 'Referido') THEN
    INSERT INTO etiquetas (nombre, color, descripcion) VALUES ('Referido', '#10B981', 'Contactos referidos por otros clientes');
  END IF;

  -- Insertar grupos si no existen
  IF NOT EXISTS (SELECT 1 FROM grupos WHERE nombre = 'Clientes Premium') THEN
    INSERT INTO grupos (nombre, descripcion, color) VALUES ('Clientes Premium', 'Clientes con suscripción premium', '#F59E0B');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM grupos WHERE nombre = 'Leads Calificados') THEN
    INSERT INTO grupos (nombre, descripcion, color) VALUES ('Leads Calificados', 'Leads que han pasado la calificación inicial', '#EF4444');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM grupos WHERE nombre = 'Suscriptores Newsletter') THEN
    INSERT INTO grupos (nombre, descripcion, color) VALUES ('Suscriptores Newsletter', 'Usuarios suscritos al newsletter', '#3B82F6');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM grupos WHERE nombre = 'Contactos de Eventos') THEN
    INSERT INTO grupos (nombre, descripcion, color) VALUES ('Contactos de Eventos', 'Contactos obtenidos en eventos', '#8B5CF6');
  END IF;

  -- Insertar listas si no existen
  IF NOT EXISTS (SELECT 1 FROM listas WHERE nombre = 'Lista General') THEN
    INSERT INTO listas (nombre, descripcion, tipo) VALUES ('Lista General', 'Lista principal de contactos', 'estatica');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM listas WHERE nombre = 'Clientes Activos') THEN
    INSERT INTO listas (nombre, descripcion, tipo) VALUES ('Clientes Activos', 'Clientes con actividad reciente', 'dinamica');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM listas WHERE nombre = 'Prospects Calientes') THEN
    INSERT INTO listas (nombre, descripcion, tipo) VALUES ('Prospects Calientes', 'Prospects con alta probabilidad', 'dinamica');
  END IF;

  -- Insertar plantillas si no existen
  IF NOT EXISTS (SELECT 1 FROM plantillas WHERE nombre = 'Bienvenida Email') THEN
    INSERT INTO plantillas (nombre, tipo, asunto, contenido) VALUES ('Bienvenida Email', 'email', '¡Bienvenido a MarketingPro!', 'Hola {{nombre}}, bienvenido a nuestra plataforma. Estamos emocionados de tenerte con nosotros.');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM plantillas WHERE nombre = 'Seguimiento WhatsApp') THEN
    INSERT INTO plantillas (nombre, tipo, asunto, contenido) VALUES ('Seguimiento WhatsApp', 'whatsapp', '', 'Hola {{nombre}}, gracias por tu interés en nuestros servicios. ¿Te gustaría agendar una llamada?');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM plantillas WHERE nombre = 'Promoción Especial') THEN
    INSERT INTO plantillas (nombre, tipo, asunto, contenido) VALUES ('Promoción Especial', 'email', 'Oferta Especial Solo Para Ti', 'Estimado {{nombre}}, tenemos una oferta especial que no puedes perderte...');
  END IF;
END $$;