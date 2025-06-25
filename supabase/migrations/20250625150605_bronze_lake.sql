/*
  # Add instance_name to ai_agents table

  1. Changes
    - Add instance_name column to ai_agents table to store the name of the WhatsApp instance
    - This allows for easier reference to the instance without needing to join tables
*/

-- Add instance_name column to ai_agents table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_agents' AND column_name = 'instance_name'
  ) THEN
    ALTER TABLE ai_agents ADD COLUMN instance_name text;
  END IF;
END $$;

-- Update existing records to set instance_name based on the related instance
UPDATE ai_agents
SET instance_name = wi.name
FROM whatsapp_instances wi
WHERE ai_agents.instance_id = wi.id
AND ai_agents.instance_name IS NULL;