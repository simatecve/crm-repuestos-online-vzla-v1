/*
  # Fix assign_conversation RPC function

  1. New Functions
    - `assign_conversation` - Assigns a conversation to a user or AI agent with proper column qualification
  
  2. Security
    - Function accessible to authenticated users
    - Proper error handling and validation
*/

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS assign_conversation(uuid, uuid, uuid);

-- Create the assign_conversation function with proper column qualification
CREATE OR REPLACE FUNCTION assign_conversation(
  conversation_id_param uuid,
  user_id_param uuid DEFAULT NULL,
  agent_id_param uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result_record conversations%ROWTYPE;
  current_user_id uuid;
BEGIN
  -- Get the current user ID
  current_user_id := auth.uid();
  
  -- Validate that the conversation exists
  IF NOT EXISTS (SELECT 1 FROM conversations WHERE id = conversation_id_param) THEN
    RAISE EXCEPTION 'Conversation not found';
  END IF;
  
  -- Validate that either user_id_param or agent_id_param is provided, but not both
  IF (user_id_param IS NULL AND agent_id_param IS NULL) THEN
    RAISE EXCEPTION 'Either user_id or agent_id must be provided';
  END IF;
  
  IF (user_id_param IS NOT NULL AND agent_id_param IS NOT NULL) THEN
    RAISE EXCEPTION 'Cannot assign to both user and agent simultaneously';
  END IF;
  
  -- If assigning to a user, validate the user exists
  IF user_id_param IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user_id_param) THEN
      RAISE EXCEPTION 'User not found';
    END IF;
  END IF;
  
  -- If assigning to an agent, validate the agent exists
  IF agent_id_param IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM ai_agents WHERE id = agent_id_param) THEN
      RAISE EXCEPTION 'AI Agent not found';
    END IF;
  END IF;
  
  -- Update the conversation with explicit column qualification
  UPDATE conversations 
  SET 
    assigned_to = user_id_param,
    assigned_by = current_user_id,
    assigned_at = now(),
    conversations.agent_id = agent_id_param,  -- Explicitly qualify the column
    updated_at = now()
  WHERE conversations.id = conversation_id_param
  RETURNING * INTO result_record;
  
  -- Return the updated conversation as JSON
  RETURN row_to_json(result_record);
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error assigning conversation: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION assign_conversation(uuid, uuid, uuid) TO authenticated;