/*
  # Add user assignment to conversations

  1. New Columns
    - `assigned_to` (uuid) - References the user assigned to handle the conversation
    - `assigned_by` (uuid) - References the user who made the assignment
    - `assigned_at` (timestamp) - When the assignment was made
    - `agent_id` (uuid) - References an AI agent that might be handling the conversation

  2. Security
    - Update RLS policies to allow users to only see conversations assigned to them
*/

-- Add assignment columns to conversations table
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS assigned_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS assigned_at timestamptz,
ADD COLUMN IF NOT EXISTS agent_id uuid REFERENCES ai_agents(id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_conversations_assigned_to ON conversations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_conversations_agent_id ON conversations(agent_id);

-- Update RLS policies
-- First, drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view all conversations" ON conversations;

-- Create new policies
-- Admins can see and manage all conversations
CREATE POLICY "Admins can manage all conversations" ON conversations
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Users can only see and manage conversations assigned to them
CREATE POLICY "Users can manage assigned conversations" ON conversations
  FOR ALL TO authenticated
  USING (
    assigned_to = auth.uid() OR
    assigned_to IS NULL OR -- Allow access to unassigned conversations
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Create function to assign conversation
CREATE OR REPLACE FUNCTION assign_conversation(
  conversation_id UUID,
  user_id UUID,
  agent_id UUID DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE conversations
  SET 
    assigned_to = user_id,
    assigned_by = auth.uid(),
    assigned_at = NOW(),
    agent_id = agent_id
  WHERE id = conversation_id;
  
  -- Log the assignment as an interaction
  INSERT INTO interacciones (
    tipo,
    contacto_id,
    usuario_id,
    titulo,
    descripcion,
    fecha
  )
  SELECT
    'asignacion',
    c.id,
    auth.uid(),
    'Conversación asignada',
    CASE 
      WHEN agent_id IS NOT NULL THEN 'Conversación asignada a agente IA'
      ELSE 'Conversación asignada a usuario'
    END,
    NOW()
  FROM contacts c
  JOIN conversations conv ON c.phone = conv.phone_number
  WHERE conv.id = conversation_id
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;