/*
  # Actualización de trigger para mensajes

  1. Cambios
    - Modifica el trigger para actualizar correctamente las conversaciones
    - Asegura que los mensajes se asocien correctamente con las conversaciones

  2. Funcionalidad
    - Crea o actualiza la conversación cuando se inserta un mensaje
    - Actualiza el último mensaje y la hora del último mensaje
*/

-- Eliminar el trigger existente si existe
DROP TRIGGER IF EXISTS trigger_update_conversation_on_message ON public.messages;

-- Crear o reemplazar la función del trigger
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
DECLARE
    v_conversation_id UUID;
BEGIN
    -- Buscar si ya existe una conversación para este número de teléfono
    SELECT id INTO v_conversation_id
    FROM conversations
    WHERE phone_number = NEW.phone_number
    LIMIT 1;
    
    -- Si no existe la conversación, crearla
    IF v_conversation_id IS NULL THEN
        INSERT INTO conversations (
            phone_number,
            pushname,
            last_message,
            last_message_time,
            unread_count
        ) VALUES (
            NEW.phone_number,
            NEW.pushname,
            NEW.message_content,
            NEW.timestamp,
            CASE WHEN NEW.direction = 'received' THEN 1 ELSE 0 END
        )
        RETURNING id INTO v_conversation_id;
    ELSE
        -- Actualizar la conversación existente
        UPDATE conversations
        SET 
            last_message = NEW.message_content,
            last_message_time = NEW.timestamp,
            unread_count = CASE 
                WHEN NEW.direction = 'received' THEN unread_count + 1
                ELSE unread_count
            END,
            updated_at = NOW()
        WHERE id = v_conversation_id;
    END IF;
    
    -- Actualizar el mensaje con el ID de la conversación
    NEW.conversation_id = v_conversation_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger
CREATE TRIGGER trigger_update_conversation_on_message
BEFORE INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_on_message();

-- Función para marcar mensajes como leídos
CREATE OR REPLACE FUNCTION mark_messages_as_read(conversation_phone TEXT)
RETURNS void AS $$
BEGIN
    -- Actualizar los mensajes como leídos
    UPDATE messages
    SET is_read = true
    WHERE phone_number = conversation_phone
    AND direction = 'received'
    AND is_read = false;
    
    -- Actualizar el contador de no leídos en la conversación
    UPDATE conversations
    SET unread_count = 0
    WHERE phone_number = conversation_phone;
END;
$$ LANGUAGE plpgsql;