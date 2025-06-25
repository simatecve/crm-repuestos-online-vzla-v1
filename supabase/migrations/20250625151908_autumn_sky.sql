/*
  # Add conversation_id column to messages table

  1. Changes
    - Add `conversation_id` column to `messages` table as a foreign key to `conversations` table
    - Create index for better query performance
    - Update existing messages to link them to conversations based on phone_number

  2. Security
    - No RLS changes needed as messages table already has appropriate policies
*/

-- Add conversation_id column to messages table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'conversation_id'
  ) THEN
    ALTER TABLE messages ADD COLUMN conversation_id uuid;
  END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'messages_conversation_id_fkey'
  ) THEN
    ALTER TABLE messages 
    ADD CONSTRAINT messages_conversation_id_fkey 
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Update existing messages to link them to conversations
UPDATE messages 
SET conversation_id = conversations.id
FROM conversations
WHERE messages.phone_number = conversations.phone_number
AND messages.conversation_id IS NULL;