/*
  # Sistema de Gestión de Usuarios

  1. Nuevas Tablas
    - `user_profiles` - Perfiles de usuario con información adicional
    - `user_invitations` - Invitaciones pendientes de usuarios
    - `user_sessions` - Seguimiento de sesiones activas

  2. Seguridad
    - Habilitar RLS en todas las tablas
    - Políticas para que solo admins puedan gestionar usuarios
    - Políticas para que usuarios puedan ver su propio perfil

  3. Funciones
    - Función para crear usuarios con perfil automático
    - Función para enviar invitaciones
    - Triggers para mantener consistencia de datos
*/

-- Tabla de perfiles de usuario extendida
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'user')),
  avatar_url text,
  phone text,
  department text,
  position text,
  is_active boolean DEFAULT true,
  last_login timestamptz,
  login_count integer DEFAULT 0,
  preferences jsonb DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Tabla de invitaciones de usuarios
CREATE TABLE IF NOT EXISTS user_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'user')),
  invited_by uuid REFERENCES auth.users(id) NOT NULL,
  invitation_token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Tabla de sesiones de usuario
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token text NOT NULL,
  ip_address inet,
  user_agent text,
  is_active boolean DEFAULT true,
  last_activity timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_active ON user_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON user_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active);

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar updated_at en user_profiles
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_profiles_updated_at') THEN
        CREATE TRIGGER update_user_profiles_updated_at 
            BEFORE UPDATE ON user_profiles 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Función para crear perfil de usuario automáticamente
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (user_id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'role', 'user')
    );
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para crear perfil automáticamente cuando se crea un usuario
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
        CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE FUNCTION create_user_profile();
    END IF;
END $$;

-- Función para actualizar último login
CREATE OR REPLACE FUNCTION update_last_login()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE user_profiles 
    SET 
        last_login = now(),
        login_count = login_count + 1
    WHERE user_id = NEW.user_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Función para generar token de invitación
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS text AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ language 'plpgsql';

-- Habilitar RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Políticas para user_profiles
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own profile' AND tablename = 'user_profiles') THEN
        CREATE POLICY "Users can view own profile" ON user_profiles
            FOR SELECT TO authenticated 
            USING (auth.uid() = user_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own profile' AND tablename = 'user_profiles') THEN
        CREATE POLICY "Users can update own profile" ON user_profiles
            FOR UPDATE TO authenticated 
            USING (auth.uid() = user_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all profiles' AND tablename = 'user_profiles') THEN
        CREATE POLICY "Admins can view all profiles" ON user_profiles
            FOR SELECT TO authenticated 
            USING (
                EXISTS (
                    SELECT 1 FROM user_profiles 
                    WHERE user_id = auth.uid() AND role = 'admin'
                )
            );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage all profiles' AND tablename = 'user_profiles') THEN
        CREATE POLICY "Admins can manage all profiles" ON user_profiles
            FOR ALL TO authenticated 
            USING (
                EXISTS (
                    SELECT 1 FROM user_profiles 
                    WHERE user_id = auth.uid() AND role = 'admin'
                )
            );
    END IF;
END $$;

-- Políticas para user_invitations
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage invitations' AND tablename = 'user_invitations') THEN
        CREATE POLICY "Admins can manage invitations" ON user_invitations
            FOR ALL TO authenticated 
            USING (
                EXISTS (
                    SELECT 1 FROM user_profiles 
                    WHERE user_id = auth.uid() AND role = 'admin'
                )
            );
    END IF;
END $$;

-- Políticas para user_sessions
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own sessions' AND tablename = 'user_sessions') THEN
        CREATE POLICY "Users can view own sessions" ON user_sessions
            FOR SELECT TO authenticated 
            USING (auth.uid() = user_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all sessions' AND tablename = 'user_sessions') THEN
        CREATE POLICY "Admins can view all sessions" ON user_sessions
            FOR ALL TO authenticated 
            USING (
                EXISTS (
                    SELECT 1 FROM user_profiles 
                    WHERE user_id = auth.uid() AND role = 'admin'
                )
            );
    END IF;
END $$;

-- Insertar perfil para usuarios existentes si no existe
INSERT INTO user_profiles (user_id, email, full_name, role)
SELECT 
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'full_name', u.email),
    COALESCE(u.raw_user_meta_data->>'role', 'user')
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM user_profiles p WHERE p.user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;

-- Actualizar tabla users existente para compatibilidad
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        -- Migrar datos de la tabla users antigua a user_profiles si es necesario
        INSERT INTO user_profiles (email, full_name, role, is_active, created_at, updated_at)
        SELECT email, full_name, role, true, created_at, updated_at
        FROM users
        WHERE NOT EXISTS (
            SELECT 1 FROM user_profiles p WHERE p.email = users.email
        )
        ON CONFLICT (email) DO NOTHING;
    END IF;
END $$;