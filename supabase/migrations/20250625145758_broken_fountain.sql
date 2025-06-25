/*
  # Add instance_name field to AI agents

  1. Changes
    - Add instance_name column to ai_agents table to store the name of the WhatsApp instance
    - This allows for easier reference to the instance without additional joins
*/

-- Add instance_name column to ai_agents table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_agents' AND column_name = 'instance_name'
  ) THEN
    ALTER TABLE ai_agents ADD COLUMN instance_name text;
  END IF;
END $$;