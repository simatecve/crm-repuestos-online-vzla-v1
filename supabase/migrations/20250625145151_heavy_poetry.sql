/*
  # AI Agents for WhatsApp

  1. New Table
    - `ai_agents` - AI agents configuration for WhatsApp instances
      - `id` (uuid, primary key)
      - `name` (text) - Name of the AI agent
      - `prompt` (text) - Prompt/instructions for the AI agent
      - `instance_id` (uuid) - Reference to whatsapp_instances
      - `is_active` (boolean) - Whether the agent is active
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS
    - Policies for authenticated users
*/

-- Table for AI agents
CREATE TABLE IF NOT EXISTS ai_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  prompt text NOT NULL,
  instance_id uuid REFERENCES whatsapp_instances(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_ai_agents_instance_id ON ai_agents(instance_id);
CREATE INDEX IF NOT EXISTS idx_ai_agents_is_active ON ai_agents(is_active);

-- Trigger for updated_at
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_ai_agents_updated_at') THEN
        CREATE TRIGGER update_ai_agents_updated_at 
            BEFORE UPDATE ON ai_agents 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Enable RLS
ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;

-- Security policies
CREATE POLICY "Users can view all ai_agents" ON ai_agents
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage ai_agents" ON ai_agents
    FOR ALL TO authenticated USING (true);