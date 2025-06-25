/*
  # Constructor Visual de Automatizaciones (Workflow Builder)

  1. Nuevas Funcionalidades
    - Añadir soporte para flujos de trabajo visuales
    - Implementar sistema de nodos y conexiones para automatizaciones
    - Crear tablas para definir flujos de trabajo complejos
    - Añadir soporte para condiciones y bifurcaciones en flujos

  2. Cambios
    - Crear tabla para workflows
    - Crear tabla para nodos de workflow
    - Crear tabla para conexiones entre nodos
    - Añadir campos para configuración visual
*/

-- Tabla para workflows
CREATE TABLE IF NOT EXISTS workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  trigger_type text NOT NULL,
  trigger_config jsonb DEFAULT '{}',
  visual_data jsonb DEFAULT '{}',
  execution_count integer DEFAULT 0,
  success_count integer DEFAULT 0,
  error_count integer DEFAULT 0,
  last_execution timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabla para nodos de workflow
CREATE TABLE IF NOT EXISTS workflow_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid REFERENCES workflows(id) ON DELETE CASCADE,
  node_type text NOT NULL,
  node_name text NOT NULL,
  config jsonb DEFAULT '{}',
  position_x integer DEFAULT 0,
  position_y integer DEFAULT 0,
  is_start_node boolean DEFAULT false,
  is_end_node boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabla para conexiones entre nodos
CREATE TABLE IF NOT EXISTS workflow_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid REFERENCES workflows(id) ON DELETE CASCADE,
  source_node_id uuid REFERENCES workflow_nodes(id) ON DELETE CASCADE,
  target_node_id uuid REFERENCES workflow_nodes(id) ON DELETE CASCADE,
  condition_type text,
  condition_config jsonb DEFAULT '{}',
  label text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(source_node_id, target_node_id)
);

-- Tabla para ejecuciones de workflow
CREATE TABLE IF NOT EXISTS workflow_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid REFERENCES workflows(id) ON DELETE CASCADE,
  entity_id uuid,
  entity_type text,
  status text DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  start_time timestamptz DEFAULT now(),
  end_time timestamptz,
  execution_path jsonb DEFAULT '[]',
  result jsonb DEFAULT '{}',
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status);
CREATE INDEX IF NOT EXISTS idx_workflow_nodes_workflow_id ON workflow_nodes(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_connections_workflow_id ON workflow_connections(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);

-- Trigger para actualizar updated_at
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_workflows_updated_at') THEN
        CREATE TRIGGER update_workflows_updated_at 
            BEFORE UPDATE ON workflows 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_workflow_nodes_updated_at') THEN
        CREATE TRIGGER update_workflow_nodes_updated_at 
            BEFORE UPDATE ON workflow_nodes 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_workflow_connections_updated_at') THEN
        CREATE TRIGGER update_workflow_connections_updated_at 
            BEFORE UPDATE ON workflow_connections 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Habilitar RLS
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
CREATE POLICY "Users can view all workflows" ON workflows
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage own workflows" ON workflows
    FOR ALL TO authenticated USING (created_by = auth.uid() OR created_by IS NULL);

CREATE POLICY "Users can view all workflow_nodes" ON workflow_nodes
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage workflow_nodes" ON workflow_nodes
    FOR ALL TO authenticated USING (
      EXISTS (
        SELECT 1 FROM workflows w
        WHERE w.id = workflow_id AND (w.created_by = auth.uid() OR w.created_by IS NULL)
      )
    );

CREATE POLICY "Users can view all workflow_connections" ON workflow_connections
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage workflow_connections" ON workflow_connections
    FOR ALL TO authenticated USING (
      EXISTS (
        SELECT 1 FROM workflows w
        WHERE w.id = workflow_id AND (w.created_by = auth.uid() OR w.created_by IS NULL)
      )
    );

CREATE POLICY "Users can view all workflow_executions" ON workflow_executions
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert workflow_executions" ON workflow_executions
    FOR INSERT TO authenticated WITH CHECK (true);