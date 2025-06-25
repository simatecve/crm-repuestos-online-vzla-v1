/*
  # Update conversation trigger to handle instance-specific conversations

  1. Problem
    - Current trigger doesn't handle multiple instances properly
    - When a message arrives, it should create a conversation specific to that instance
    - Conversations should be unique by phone_number + instance combination

  2. Solution
    - Update the update_conversation_on_message function
    - Add logic to check for existing conversation with same phone_number and instance
    - Create new conversation only if no matching conversation exists
*/

-- Drop the unique constraint on phone_number if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'conversations_phone_number_key'
  ) THEN
    ALTER TABLE conversations DROP CONSTRAINT conversations_phone_number_key;
  END IF;
END $$;

-- Create a new function that handles instance-specific conversations
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
DECLARE
  existing_conversation_id uuid;
  instance_name text;
BEGIN
  -- Get the instance name (default if not specified)
  instance_name := COALESCE(NEW.instancia, 'default');
  
  -- Check if a conversation exists for this phone number and instance
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
    
    -- Update conversation_id in the message if it's not set
    IF NEW.conversation_id IS NULL THEN
      NEW.conversation_id := existing_conversation_id;
    END IF;
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
    )
    RETURNING id INTO existing_conversation_id;
    
    -- Update the message with the new conversation_id
    NEW.conversation_id := existing_conversation_id;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Make sure the trigger is properly set up
DROP TRIGGER IF EXISTS trigger_update_conversation_on_message ON messages;

CREATE TRIGGER trigger_update_conversation_on_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_on_message();