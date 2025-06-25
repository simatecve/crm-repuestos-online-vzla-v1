/*
  # Add instancia field to messages table
  
  1. Changes
    - Add 'instancia' column to messages table to identify which WhatsApp connection each message belongs to
    - Add index for faster queries by instancia
*/

-- Add instancia column to messages table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'instancia'
  ) THEN
    ALTER TABLE messages ADD COLUMN instancia text DEFAULT 'default';
  END IF;
END $$;

-- Create index for the new column
CREATE INDEX IF NOT EXISTS idx_messages_instancia ON messages(instancia);