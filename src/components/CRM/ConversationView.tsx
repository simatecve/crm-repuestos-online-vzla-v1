import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Smile, Image, Mic, X, FileText, Video, Camera } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { MessageBubble } from './MessageBubble';
import { QuickReplies } from './QuickReplies';
import { AgentSelector } from './AgentSelector';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  phone_number: string;
  pushname: string | null;
  message_content: string;
  message_type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location';
  direction: 'sent' | 'received';
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  is_read: boolean;
  adjunto: string | null;
}

interface Conversation {
  id: string;
  phone_number: string;
  contact_name: string | null;
  pushname: string | null;
  assigned_to: string | null;
  agent_id: string | null;
}

interface ConversationViewProps {
  conversation: Conversation | null;
  onMessageSent: () => void;
}

export const ConversationView: React.FC<ConversationViewProps> = ({ 
  conversation, 
  onMessageSent 
}) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showAgentSelector, setShowAgentSelector] = useState(false);
  const [fileUpload, setFileUpload] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (conversation) {
      fetchMessages();
      markConversationAsRead();
    } else {
      setMessages([]);
    }
  }, [conversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    if (!conversation) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('timestamp', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Error al cargar los mensajes');
    } finally {
      setLoading(false);
    }
  };

  const markConversationAsRead = async () => {
    if (!conversation) return;
    
    try {
      // Update conversation unread count
      await supabase
        .from('conversations')
        .update({ unread_count: 0 })
        .eq('id', conversation.id);
        
      // Mark messages as read
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversation.id)
        .eq('direction', 'received')
        .eq('is_read', false);
    } catch (error) {
      console.error('Error marking conversation as read:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !fileUpload) || !conversation) return;
    
    try {
      setSending(true);
      
      let adjuntoUrl = null;
      let messageType = 'text';
      let messageContent = newMessage.trim();
      
      // Handle file upload if present
      if (fileUpload) {
        // For demo purposes, we'll use the file preview as the adjunto
        // In a real app, you would upload the file to storage
        adjuntoUrl = filePreview;
        messageType = fileType;
        
        // If no text message, use a default message based on file type
        if (!messageContent) {
          switch (fileType) {
            case 'image':
              messageContent = 'Imagen enviada';
              break;
            case 'video':
              messageContent = 'Video enviado';
              break;
            case 'audio':
              messageContent = 'Audio enviado';
              break;
            case 'document':
              messageContent = 'Documento enviado';
              break;
            default:
              messageContent = 'Archivo enviado';
          }
        }
      }
      
      // Insert the message
      const { error } = await supabase
        .from('messages')
        .insert([{
          phone_number: conversation.phone_number,
          message_content: messageContent,
          message_type: messageType,
          direction: 'sent',
          status: 'sent',
          timestamp: new Date().toISOString(),
          is_read: false,
          instancia: 'default',
          adjunto: adjuntoUrl,
          conversation_id: conversation.id
        }]);

      if (error) throw error;
      
      // Update conversation last message
      await supabase
        .from('conversations')
        .update({
          last_message: messageContent,
          last_message_time: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', conversation.id);
      
      // Clear form
      setNewMessage('');
      setFileUpload(null);
      setFilePreview(null);
      setFileType('');
      
      // Refresh messages and notify parent
      fetchMessages();
      onMessageSent();
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Error al enviar el mensaje');
    } finally {
      setSending(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('El archivo es demasiado grande. Máximo 5MB.');
      return;
    }
    
    setFileUpload(file);
    
    // Determine file type
    if (file.type.startsWith('image/')) {
      setFileType('image');
    } else if (file.type.startsWith('video/')) {
      setFileType('video');
    } else if (file.type.startsWith('audio/')) {
      setFileType('audio');
    } else {
      setFileType('document');
    }
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setFilePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleQuickReplySelect = (content: string) => {
    setNewMessage(content);
    setShowQuickReplies(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 text-gray-400">
            <Send className="h-12 w-12" />
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay conversación seleccionada</h3>
          <p className="mt-1 text-sm text-gray-500">
            Selecciona una conversación para comenzar a chatear
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
            {conversation.contact_name 
              ? conversation.contact_name.charAt(0) 
              : conversation.pushname 
                ? conversation.pushname.charAt(0) 
                : conversation.phone_number.charAt(0)
            }
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-gray-900">
              {conversation.contact_name || conversation.pushname || conversation.phone_number}
            </h3>
            <p className="text-xs text-gray-500">{conversation.phone_number}</p>
          </div>
        </div>
        <div>
          <button 
            onClick={() => setShowAgentSelector(true)}
            className="text-gray-600 hover:text-gray-900 px-2 py-1 rounded text-sm hover:bg-gray-100"
          >
            {conversation.agent_id 
              ? 'Asignado a IA' 
              : conversation.assigned_to 
                ? 'Asignado a Agente' 
                : 'Sin asignar'
            }
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-100">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-500">No hay mensajes en esta conversación</p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              id={message.id}
              content={message.message_content}
              type={message.message_type}
              adjunto={message.adjunto}
              direction={message.direction}
              status={message.status}
              timestamp={message.timestamp}
              pushname={message.pushname}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* File Preview */}
      {filePreview && (
        <div className="p-3 bg-gray-50 border-t border-gray-200">
          <div className="flex items-start">
            <div className="relative">
              {fileType === 'image' && (
                <img src={filePreview} alt="Preview" className="h-20 w-20 object-cover rounded" />
              )}
              {fileType === 'video' && (
                <div className="h-20 w-20 bg-gray-200 rounded flex items-center justify-center">
                  <Video className="h-8 w-8 text-gray-500" />
                </div>
              )}
              {fileType === 'audio' && (
                <div className="h-20 w-20 bg-gray-200 rounded flex items-center justify-center">
                  <Mic className="h-8 w-8 text-gray-500" />
                </div>
              )}
              {fileType === 'document' && (
                <div className="h-20 w-20 bg-gray-200 rounded flex items-center justify-center">
                  <FileText className="h-8 w-8 text-gray-500" />
                </div>
              )}
              <button 
                onClick={() => {
                  setFileUpload(null);
                  setFilePreview(null);
                  setFileType('');
                }}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-gray-900">
                {fileUpload?.name}
              </p>
              <p className="text-xs text-gray-500">
                {fileUpload && (fileUpload.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="bg-white border-t border-gray-200 p-3">
        <div className="flex items-end space-x-2">
          <div className="relative">
            <button 
              onClick={() => setShowAttachMenu(!showAttachMenu)}
              className="p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            >
              <Paperclip className="h-5 w-5" />
            </button>
            
            {/* Attachment Menu */}
            {showAttachMenu && (
              <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 p-2 w-48">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button 
                  onClick={() => {
                    fileInputRef.current?.click();
                    setShowAttachMenu(false);
                  }}
                  className="flex items-center w-full p-2 hover:bg-gray-100 rounded text-left"
                >
                  <Image className="h-5 w-5 text-blue-500 mr-3" />
                  <span className="text-sm">Imagen</span>
                </button>
                <button 
                  onClick={() => {
                    fileInputRef.current?.click();
                    setShowAttachMenu(false);
                  }}
                  className="flex items-center w-full p-2 hover:bg-gray-100 rounded text-left"
                >
                  <Video className="h-5 w-5 text-purple-500 mr-3" />
                  <span className="text-sm">Video</span>
                </button>
                <button 
                  onClick={() => {
                    fileInputRef.current?.click();
                    setShowAttachMenu(false);
                  }}
                  className="flex items-center w-full p-2 hover:bg-gray-100 rounded text-left"
                >
                  <FileText className="h-5 w-5 text-red-500 mr-3" />
                  <span className="text-sm">Documento</span>
                </button>
                <button 
                  onClick={() => {
                    fileInputRef.current?.click();
                    setShowAttachMenu(false);
                  }}
                  className="flex items-center w-full p-2 hover:bg-gray-100 rounded text-left"
                >
                  <Mic className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-sm">Audio</span>
                </button>
                <button 
                  onClick={() => {
                    setShowAttachMenu(false);
                    toast.error('Funcionalidad no implementada');
                  }}
                  className="flex items-center w-full p-2 hover:bg-gray-100 rounded text-left"
                >
                  <Camera className="h-5 w-5 text-amber-500 mr-3" />
                  <span className="text-sm">Cámara</span>
                </button>
              </div>
            )}
          </div>
          
          <div className="flex-1 relative">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe un mensaje..."
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={1}
            />
            <button 
              onClick={() => setShowQuickReplies(!showQuickReplies)}
              className="absolute right-3 bottom-2 text-gray-500 hover:text-gray-700"
            >
              <Smile className="h-5 w-5" />
            </button>
            
            {/* Quick Replies Dropdown */}
            {showQuickReplies && (
              <div className="absolute bottom-full left-0 mb-2 w-full bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                <QuickReplies onSelect={handleQuickReplySelect} />
              </div>
            )}
          </div>
          
          <button
            onClick={handleSendMessage}
            disabled={sending || (!newMessage.trim() && !fileUpload)}
            className="p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-blue-500"
          >
            {sending ? (
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Agent Selector Modal */}
      {showAgentSelector && (
        <AgentSelector
          conversationId={conversation.id}
          currentAgentId={conversation.agent_id}
          currentUserId={conversation.assigned_to}
          onClose={() => setShowAgentSelector(false)}
          onAssigned={() => {
            setShowAgentSelector(false);
            // Refresh conversation data
            onMessageSent();
          }}
        />
      )}
    </div>
  );
};