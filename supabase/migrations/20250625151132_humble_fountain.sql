/*
  # Fix conversation trigger function

  1. Problem
    - Current trigger function tries to access and update a non-existent 'conversation_id' field
    - This causes errors when inserting new messages

  2. Solution
    - Modify the trigger function to not reference or update 'conversation_id'
    - Ensure the function works with the existing table structure
    - Keep the core functionality of creating/updating conversations
*/

-- Create a new fixed function that doesn't reference conversation_id
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
DECLARE
  existing_conversation_id uuid;
  instance_name text;
BEGIN
  -- Get the instance name (default if not specified)
  instance_name := COALESCE(NEW.instancia, 'default');
  
  -- Check if a conversation exists for this phone number
  SELECT id INTO existing_conversation_id
  FROM conversations
  WHERE phone_number = NEW.phone_number;
  
  IF existing_conversation_id IS NOT NULL THEN
    -- Update existing conversation
    UPDATE conversations 
    SET 
      last_message = NEW.message_content,
      last_message_time = NEW.timestamp,
      updated_at = now(),
      unread_count = CASE 
        WHEN NEW.direction = 'received' THEN unread_count + 1 
        ELSE unread_count 
      END,
      pushname = COALESCE(conversations.pushname, NEW.pushname)
    WHERE id = existing_conversation_id;
  ELSE
    -- Create new conversation
    INSERT INTO conversations (
      phone_number, 
      contact_name, 
      pushname, 
      last_message, 
      last_message_time,
      unread_count
    ) VALUES (
      NEW.phone_number,
      NULL, -- contact_name will be set later if available
      NEW.pushname,
      NEW.message_content,
      NEW.timestamp,
      CASE WHEN NEW.direction = 'received' THEN 1 ELSE 0 END
    );
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Make sure the trigger is properly set up
DROP TRIGGER IF EXISTS trigger_update_conversation_on_message ON messages;

CREATE TRIGGER trigger_update_conversation_on_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_on_message();

-- Add a policy to allow public access to messages table if needed
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'todos' AND tablename = 'messages') THEN
    CREATE POLICY "todos" ON messages
      FOR ALL
      TO public
      USING (true);
  END IF;
END $$;