import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Search, 
  Phone, 
  Video, 
  MoreVertical,
  Send,
  Paperclip,
  Smile,
  Mic,
  Archive,
  Pin,
  Trash2,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  Zap,
  Plus,
  Edit,
  X,
  Save,
  Settings,
  UserPlus,
  Users,
  User,
  RefreshCw,
  Shield
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useUserRole } from '../../hooks/useUserRole';
import toast from 'react-hot-toast';

interface Conversation {
  id: string;
  phone_number: string;
  contact_name: string | null;
  pushname: string | null;
  avatar_url: string | null;
  last_message: string | null;
  last_message_time: string | null;
  unread_count: number;
  is_archived: boolean;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  assigned_to: string | null;
  assigned_by: string | null;
  assigned_at: string | null;
  agent_id: string | null;
}

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
  metadata: any;
  created_at: string;
  instancia: string;
  adjunto: string | null;
  conversation_id: string | null;
}

interface QuickReply {
  id: string;
  title: string;
  content: string;
  category: string;
  is_active: boolean;
  usage_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface WhatsAppInstance {
  id: string;
  name: string;
  color: string;
  status: 'connected' | 'disconnected' | 'connecting';
}

interface AIAgent {
  id: string;
  name: string;
  prompt: string;
  instance_id: string;
  instance_name: string;
  is_active: boolean;
}

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  avatar_url: string | null;
}

const emojis = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
  '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
  '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩',
  '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
  '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬',
  '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗',
  '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯',
  '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐',
  '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '👍',
  '👎', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✌️', '🤞', '🤟'
];

export const CRMPanel: React.FC = () => {
  const { user } = useAuth();
  const { isAdmin, isManager } = useUserRole();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showInstanceSelector, setShowInstanceSelector] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<string>('default');
  const [showQuickReplyForm, setShowQuickReplyForm] = useState(false);
  const [newQuickReply, setNewQuickReply] = useState({
    title: '',
    content: '',
    category: 'general'
  });
  const [editingQuickReply, setEditingQuickReply] = useState<QuickReply | null>(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [filterAssigned, setFilterAssigned] = useState<string | null>(null);
  const [filterUnassigned, setFilterUnassigned] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const quickRepliesRef = useRef<HTMLDivElement>(null);
  const instanceSelectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
    fetchQuickReplies();
    fetchInstances();
    fetchAgents();
    fetchUsers();

    // Set up real-time subscription for conversations
    const conversationsSubscription = supabase
      .channel('conversations-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'conversations' }, 
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(conversationsSubscription);
    };
  }, [user?.id, filterAssigned, filterUnassigned]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.phone_number);
      markAsRead(selectedConversation.phone_number);

      // Set up real-time subscription for messages
      const messagesSubscription = supabase
        .channel('messages-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'messages', filter: `phone_number=eq.${selectedConversation.phone_number}` }, 
          () => {
            fetchMessages(selectedConversation.phone_number);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(messagesSubscription);
      };
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Cerrar los selectores al hacer clic fuera
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojis(false);
      }
      if (quickRepliesRef.current && !quickRepliesRef.current.contains(event.target as Node)) {
        setShowQuickReplies(false);
      }
      if (instanceSelectorRef.current && !instanceSelectorRef.current.contains(event.target as Node)) {
        setShowInstanceSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('conversations')
        .select('*')
        .order('updated_at', { ascending: false });
      
      // Apply filters based on user role and selected filters
      if (!isAdmin && !isManager) {
        // Regular users can only see conversations assigned to them
        query = query.eq('assigned_to', user?.id);
      } else if (filterAssigned) {
        // Filter by specific assignee
        query = query.eq('assigned_to', filterAssigned);
      } else if (filterUnassigned) {
        // Filter unassigned conversations
        query = query.is('assigned_to', null);
      }

      const { data, error } = await query;

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast.error('Error al cargar las conversaciones');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (phoneNumber: string) => {
    try {
      setMessagesLoading(true);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('phone_number', phoneNumber)
        .order('timestamp', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Error al cargar los mensajes');
    } finally {
      setMessagesLoading(false);
    }
  };

  const fetchQuickReplies = async () => {
    try {
      const { data, error } = await supabase
        .from('quick_replies')
        .select('*')
        .eq('is_active', true)
        .order('title');

      if (error) throw error;
      setQuickReplies(data || []);
    } catch (error) {
      console.error('Error fetching quick replies:', error);
    }
  };

  const fetchInstances = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .eq('status', 'connected')
        .order('name');

      if (error) throw error;
      setInstances(data || []);
      
      // Set default instance if available
      if (data && data.length > 0) {
        setSelectedInstance(data[0].name);
      }
    } catch (error) {
      console.error('Error fetching instances:', error);
    }
  };

  const fetchAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_agents')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error('Error fetching AI agents:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const markAsRead = async (phoneNumber: string) => {
    try {
      const { error } = await supabase.rpc('mark_messages_as_read', {
        conversation_phone: phoneNumber
      });

      if (error) throw error;
      
      // Actualizar el estado local
      setConversations(prev => 
        prev.map(conv => 
          conv.phone_number === phoneNumber 
            ? { ...conv, unread_count: 0 }
            : conv
        )
      );
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sending) return;

    try {
      setSending(true);
      
      // Format the phone number (remove any non-numeric characters except the + sign)
      const formattedPhone = selectedConversation.phone_number.replace(/[^\d+]/g, '');
      
      // Send message via API
      const apiUrl = `https://api.repuestosonline.com.ve/message/sendText/${selectedInstance}`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': '429683C4C977415CAAFCCE10F7D57E11'
        },
        body: JSON.stringify({
          number: formattedPhone,
          text: newMessage.trim(),
          delay: 0,
          linkPreview: true,
          mentionsEveryOne: false,
          mentioned: []
        })
      });
      
      if (!response.ok) {
        let errorMessage = 'Error sending message via API';
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (jsonError) {
          // If response is not JSON, use status text or generic message
          errorMessage = response.statusText || `HTTP ${response.status}: ${errorMessage}`;
        }
        
        throw new Error(errorMessage);
      }
      
      // Save message to database
      const { error } = await supabase
        .from('messages')
        .insert([{
          phone_number: selectedConversation.phone_number,
          pushname: 'Yo',
          message_content: newMessage.trim(),
          direction: 'sent',
          status: 'sent',
          timestamp: new Date().toISOString(),
          instancia: selectedInstance
        }]);

      if (error) throw error;

      setNewMessage('');
      fetchMessages(selectedConversation.phone_number);
      fetchConversations();
      toast.success('Mensaje enviado correctamente');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Error al enviar el mensaje');
      
      // Still save to database but mark as failed
      if (selectedConversation) {
        try {
          await supabase
            .from('messages')
            .insert([{
              phone_number: selectedConversation.phone_number,
              pushname: 'Yo',
              message_content: newMessage.trim(),
              direction: 'sent',
              status: 'failed',
              timestamp: new Date().toISOString(),
              instancia: selectedInstance
            }]);
            
          fetchMessages(selectedConversation.phone_number);
        } catch (dbError) {
          console.error('Error saving failed message to database:', dbError);
        }
      }
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const insertEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
  };

  const useQuickReply = (content: string) => {
    setNewMessage(content);
    setShowQuickReplies(false);
  };

  const saveQuickReply = async () => {
    if (!newQuickReply.title.trim() || !newQuickReply.content.trim()) {
      toast.error('El título y contenido son obligatorios');
      return;
    }

    try {
      if (editingQuickReply) {
        // Actualizar respuesta rápida existente
        const { error } = await supabase
          .from('quick_replies')
          .update({
            title: newQuickReply.title,
            content: newQuickReply.content,
            category: newQuickReply.category
          })
          .eq('id', editingQuickReply.id);

        if (error) throw error;
        toast.success('Respuesta rápida actualizada');
      } else {
        // Crear nueva respuesta rápida
        const { error } = await supabase
          .from('quick_replies')
          .insert([{
            title: newQuickReply.title,
            content: newQuickReply.content,
            category: newQuickReply.category,
            created_by: (await supabase.auth.getUser()).data.user?.id
          }]);

        if (error) throw error;
        toast.success('Respuesta rápida guardada');
      }

      setNewQuickReply({ title: '', content: '', category: 'general' });
      setEditingQuickReply(null);
      setShowQuickReplyForm(false);
      fetchQuickReplies();
    } catch (error) {
      console.error('Error saving quick reply:', error);
      toast.error('Error al guardar la respuesta rápida');
    }
  };

  const deleteQuickReply = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta respuesta rápida?')) return;

    try {
      const { error } = await supabase
        .from('quick_replies')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Respuesta rápida eliminada');
      fetchQuickReplies();
    } catch (error) {
      console.error('Error deleting quick reply:', error);
      toast.error('Error al eliminar la respuesta rápida');
    }
  };

  const editQuickReply = (quickReply: QuickReply) => {
    setEditingQuickReply(quickReply);
    setNewQuickReply({
      title: quickReply.title,
      content: quickReply.content,
      category: quickReply.category
    });
    setShowQuickReplyForm(true);
  };

  const assignConversation = async (conversationId: string, userId: string | null, agentId: string | null) => {
    try {
      const { error } = await supabase.rpc('assign_conversation', {
        conversation_id: conversationId,
        user_id: userId,
        agent_id: agentId
      });

      if (error) throw error;

      toast.success('Conversación asignada correctamente');
      fetchConversations();
      setShowAssignmentModal(false);
    } catch (error) {
      console.error('Error assigning conversation:', error);
      toast.error('Error al asignar la conversación');
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString('es-ES', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: '2-digit' 
      });
    }
  };

  const getStatusIcon = (status: string, direction: string) => {
    if (direction === 'received') return null;
    
    switch (status) {
      case 'sent':
        return <Check className="w-4 h-4 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="w-4 h-4 text-gray-400" />;
      case 'read':
        return <CheckCheck className="w-4 h-4 text-blue-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.pushname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.phone_number.includes(searchTerm)
  );

  const groupedQuickReplies = quickReplies.reduce((acc, reply) => {
    if (!acc[reply.category]) {
      acc[reply.category] = [];
    }
    acc[reply.category].push(reply);
    return acc;
  }, {} as Record<string, QuickReply[]>);

  const getInstanceColor = (instanceName: string) => {
    const instance = instances.find(i => i.name === instanceName);
    return instance?.color || '#3B82F6';
  };

  const getAssignedUserName = (userId: string | null) => {
    if (!userId) return 'Sin asignar';
    const user = users.find(u => u.user_id === userId);
    return user ? user.full_name : 'Usuario desconocido';
  };

  const getAssignedAgentName = (agentId: string | null) => {
    if (!agentId) return null;
    const agent = agents.find(a => a.id === agentId);
    return agent ? agent.name : null;
  };

  const canViewConversation = (conversation: Conversation) => {
    if (isAdmin || isManager) return true;
    return conversation.assigned_to === user?.id || conversation.assigned_to === null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-100 flex">
      {/* Sidebar - Lista de conversaciones */}
      <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Conversaciones</h2>
            <div className="flex space-x-2">
              <button 
                onClick={() => setShowInstanceSelector(!showInstanceSelector)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors relative"
              >
                <Settings className="w-5 h-5 text-gray-600" />
                
                {/* Instancia seleccionada */}
                {instances.length > 0 && (
                  <span 
                    className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
                    style={{ backgroundColor: getInstanceColor(selectedInstance) }}
                  ></span>
                )}
                
                {/* Selector de instancias */}
                {showInstanceSelector && (
                  <div 
                    ref={instanceSelectorRef}
                    className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-2 w-48 z-10"
                  >
                    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 py-1">
                      Instancias
                    </h4>
                    <div className="mt-1 space-y-1 max-h-48 overflow-y-auto">
                      {instances.length > 0 ? (
                        instances.map((instance) => (
                          <button
                            key={instance.id}
                            onClick={() => {
                              setSelectedInstance(instance.name);
                              setShowInstanceSelector(false);
                            }}
                            className={`w-full text-left px-2 py-1 rounded text-sm flex items-center space-x-2 ${
                              selectedInstance === instance.name ? 'bg-gray-100' : 'hover:bg-gray-50'
                            }`}
                          >
                            <span 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: instance.color }}
                            ></span>
                            <span className="truncate">{instance.name}</span>
                            {selectedInstance === instance.name && (
                              <Check className="w-4 h-4 ml-auto text-green-500" />
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="text-sm text-gray-500 px-2 py-1">
                          No hay instancias
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </button>
              <button 
                onClick={() => setFilterUnassigned(!filterUnassigned)}
                className={`p-2 rounded-full transition-colors ${
                  filterUnassigned ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-200 text-gray-600'
                }`}
                title="Mostrar solo conversaciones sin asignar"
              >
                <UserPlus className="w-5 h-5" />
              </button>
              {(isAdmin || isManager) && (
                <div className="relative">
                  <button 
                    onClick={() => setFilterAssigned(filterAssigned ? null : user?.id)}
                    className={`p-2 rounded-full transition-colors ${
                      filterAssigned ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-200 text-gray-600'
                    }`}
                    title="Filtrar por agente"
                  >
                    <Users className="w-5 h-5" />
                  </button>
                </div>
              )}
              <button className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <MoreVertical className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar conversaciones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Lista de conversaciones */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length > 0 ? (
            filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => canViewConversation(conversation) ? setSelectedConversation(conversation) : null}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedConversation?.id === conversation.id ? 'bg-green-50 border-r-4 border-r-green-500' : ''
                } ${!canViewConversation(conversation) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center space-x-3">
                  {/* Avatar */}
                  <div className="relative">
                    {conversation.avatar_url ? (
                      <img 
                        src={conversation.avatar_url} 
                        alt={conversation.contact_name || conversation.pushname || 'Avatar'}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">
                          {(conversation.contact_name || conversation.pushname || conversation.phone_number).charAt(0)}
                        </span>
                      </div>
                    )}
                    {conversation.unread_count > 0 && (
                      <div className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {conversation.unread_count}
                      </div>
                    )}
                  </div>

                  {/* Información de la conversación */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900 truncate">
                        {conversation.contact_name || conversation.pushname || conversation.phone_number}
                      </h3>
                      <span className="text-xs text-gray-500">
                        {conversation.last_message_time && formatTime(conversation.last_message_time)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 truncate mt-1">
                      {conversation.last_message || 'Sin mensajes'}
                    </p>
                    
                    {/* Assignment info */}
                    {(conversation.assigned_to || conversation.agent_id) && (
                      <div className="flex items-center mt-1">
                        {conversation.assigned_to && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-1">
                            <User className="w-3 h-3 mr-1" />
                            {getAssignedUserName(conversation.assigned_to)}
                          </span>
                        )}
                        {conversation.agent_id && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            <Zap className="w-3 h-3 mr-1" />
                            {getAssignedAgentName(conversation.agent_id)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Indicadores */}
                  <div className="flex flex-col items-end space-y-1">
                    {conversation.is_pinned && (
                      <Pin className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center">
              <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay conversaciones</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'No se encontraron conversaciones.' : 'Las conversaciones aparecerán aquí.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Panel principal - Chat */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Header del chat */}
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {selectedConversation.avatar_url ? (
                  <img 
                    src={selectedConversation.avatar_url} 
                    alt={selectedConversation.contact_name || selectedConversation.pushname || 'Avatar'}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-600">
                      {(selectedConversation.contact_name || selectedConversation.pushname || selectedConversation.phone_number).charAt(0)}
                    </span>
                  </div>
                )}
                <div>
                  <h3 className="font-medium text-gray-900">
                    {selectedConversation.contact_name || selectedConversation.pushname || selectedConversation.phone_number}
                  </h3>
                  <div className="flex items-center">
                    <p className="text-sm text-gray-500 mr-2">{selectedConversation.phone_number}</p>
                    {selectedConversation.assigned_to && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <User className="w-3 h-3 mr-1" />
                        {getAssignedUserName(selectedConversation.assigned_to)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => setShowAssignmentModal(true)}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                  title="Asignar conversación"
                >
                  <UserPlus className="w-5 h-5 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                  <Phone className="w-5 h-5 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                  <Video className="w-5 h-5 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                  <MoreVertical className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messagesLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.direction === 'sent' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.direction === 'sent'
                          ? 'bg-green-500 text-white'
                          : 'bg-white text-gray-900 shadow-sm'
                      }`}
                    >
                      {/* Instancia indicator */}
                      {message.instancia && message.instancia !== 'default' && (
                        <div 
                          className="w-2 h-2 rounded-full mb-1 ml-auto"
                          style={{ 
                            backgroundColor: getInstanceColor(message.instancia),
                            marginLeft: 'auto',
                            marginRight: message.direction === 'sent' ? '0' : 'auto'
                          }}
                        ></div>
                      )}
                      
                      <p className="text-sm">{message.message_content}</p>
                      <div className={`flex items-center justify-end space-x-1 mt-1 ${
                        message.direction === 'sent' ? 'text-green-100' : 'text-gray-500'
                      }`}>
                        <span className="text-xs">
                          {formatTime(message.timestamp)}
                        </span>
                        {getStatusIcon(message.status, message.direction)}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input de mensaje */}
            <div className="p-4 bg-white border-t border-gray-200">
              <div className="flex items-center space-x-3">
                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <Paperclip className="w-5 h-5 text-gray-600" />
                </button>
                
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Escribe un mensaje..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    disabled={sending}
                  />
                  
                  {/* Botón de emojis */}
                  <div className="absolute right-12 top-1/2 transform -translate-y-1/2">
                    <button 
                      onClick={() => setShowEmojis(!showEmojis)}
                      className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <Smile className="w-5 h-5 text-gray-600" />
                    </button>
                    
                    {/* Selector de emojis */}
                    {showEmojis && (
                      <div 
                        ref={emojiPickerRef}
                        className="absolute bottom-10 right-0 bg-white border border-gray-200 rounded-lg shadow-lg p-2 w-64 max-h-60 overflow-y-auto z-10"
                      >
                        <div className="grid grid-cols-8 gap-1">
                          {emojis.map((emoji, index) => (
                            <button
                              key={index}
                              onClick={() => insertEmoji(emoji)}
                              className="w-8 h-8 text-xl hover:bg-gray-100 rounded transition-colors flex items-center justify-center"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Botón de respuestas rápidas */}
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <button 
                      onClick={() => setShowQuickReplies(!showQuickReplies)}
                      className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <Zap className="w-5 h-5 text-gray-600" />
                    </button>
                    
                    {/* Selector de respuestas rápidas */}
                    {showQuickReplies && (
                      <div 
                        ref={quickRepliesRef}
                        className="absolute bottom-10 right-0 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-80 max-h-96 overflow-y-auto z-10"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-medium text-gray-900">Respuestas Rápidas</h3>
                          <button 
                            onClick={() => {
                              setEditingQuickReply(null);
                              setNewQuickReply({ title: '', content: '', category: 'general' });
                              setShowQuickReplyForm(true);
                            }}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                          >
                            <Plus className="w-4 h-4 text-gray-600" />
                          </button>
                        </div>
                        
                        {showQuickReplyForm ? (
                          <div className="bg-gray-50 p-3 rounded-lg mb-3">
                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Título
                                </label>
                                <input
                                  type="text"
                                  value={newQuickReply.title}
                                  onChange={(e) => setNewQuickReply({...newQuickReply, title: e.target.value})}
                                  className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                  placeholder="Ej: Saludo inicial"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Contenido
                                </label>
                                <textarea
                                  value={newQuickReply.content}
                                  onChange={(e) => setNewQuickReply({...newQuickReply, content: e.target.value})}
                                  className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                  placeholder="Texto de la respuesta rápida"
                                  rows={3}
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Categoría
                                </label>
                                <select
                                  value={newQuickReply.category}
                                  onChange={(e) => setNewQuickReply({...newQuickReply, category: e.target.value})}
                                  className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                >
                                  <option value="general">General</option>
                                  <option value="saludos">Saludos</option>
                                  <option value="despedidas">Despedidas</option>
                                  <option value="informacion">Información</option>
                                  <option value="preguntas">Preguntas</option>
                                  <option value="reuniones">Reuniones</option>
                                </select>
                              </div>
                              <div className="flex justify-end space-x-2">
                                <button
                                  onClick={() => setShowQuickReplyForm(false)}
                                  className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                                >
                                  Cancelar
                                </button>
                                <button
                                  onClick={saveQuickReply}
                                  className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors flex items-center space-x-1"
                                >
                                  <Save className="w-3 h-3" />
                                  <span>Guardar</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          Object.entries(groupedQuickReplies).length > 0 ? (
                            <div className="space-y-3">
                              {Object.entries(groupedQuickReplies).map(([category, replies]) => (
                                <div key={category}>
                                  <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">
                                    {category}
                                  </h4>
                                  <div className="space-y-1">
                                    {replies.map(reply => (
                                      <div 
                                        key={reply.id}
                                        className="bg-gray-50 hover:bg-gray-100 rounded-lg p-2 cursor-pointer group"
                                      >
                                        <div className="flex items-center justify-between">
                                          <h5 className="text-sm font-medium text-gray-900">{reply.title}</h5>
                                          <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                editQuickReply(reply);
                                              }}
                                              className="p-1 hover:bg-gray-200 rounded"
                                            >
                                              <Edit className="w-3 h-3 text-gray-600" />
                                            </button>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                deleteQuickReply(reply.id);
                                              }}
                                              className="p-1 hover:bg-gray-200 rounded"
                                            >
                                              <Trash2 className="w-3 h-3 text-red-600" />
                                            </button>
                                          </div>
                                        </div>
                                        <p 
                                          className="text-xs text-gray-600 mt-1 line-clamp-2"
                                          onClick={() => useQuickReply(reply.content)}
                                        >
                                          {reply.content}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-4">
                              <p className="text-sm text-gray-500">No hay respuestas rápidas</p>
                              <button
                                onClick={() => setShowQuickReplyForm(true)}
                                className="mt-2 px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                              >
                                Crear primera respuesta
                              </button>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {newMessage.trim() ? (
                  <button
                    onClick={sendMessage}
                    disabled={sending}
                    className="p-2 bg-green-500 hover:bg-green-600 rounded-full transition-colors disabled:opacity-50"
                  >
                    {sending ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <Send className="w-5 h-5 text-white" />
                    )}
                  </button>
                ) : (
                  <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <Mic className="w-5 h-5 text-gray-600" />
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Estado vacío */
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <MessageSquare className="mx-auto h-16 w-16 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                Selecciona una conversación
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Elige una conversación de la lista para comenzar a chatear
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Assignment Modal */}
      {showAssignmentModal && selectedConversation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Asignar Conversación</h2>
              <button
                onClick={() => setShowAssignmentModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Asignar a Usuario</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  <button
                    onClick={() => assignConversation(selectedConversation.id, null, null)}
                    className={`w-full text-left px-3 py-2 rounded-lg border ${
                      !selectedConversation.assigned_to ? 'bg-blue-50 border-blue-300' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                        <User className="w-4 h-4 text-gray-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Sin asignar</p>
                        <p className="text-xs text-gray-500">Disponible para cualquier agente</p>
                      </div>
                    </div>
                  </button>
                  
                  {users.map(user => (
                    <button
                      key={user.id}
                      onClick={() => assignConversation(selectedConversation.id, user.user_id, null)}
                      className={`w-full text-left px-3 py-2 rounded-lg border ${
                        selectedConversation.assigned_to === user.user_id ? 'bg-blue-50 border-blue-300' : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                          {user.role === 'admin' ? (
                            <Shield className="w-4 h-4 text-blue-600" />
                          ) : (
                            <User className="w-4 h-4 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.full_name}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Asignar a Agente IA</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {agents.length > 0 ? (
                    agents.map(agent => (
                      <button
                        key={agent.id}
                        onClick={() => assignConversation(selectedConversation.id, null, agent.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg border ${
                          selectedConversation.agent_id === agent.id ? 'bg-purple-50 border-purple-300' : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                            <Zap className="w-4 h-4 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{agent.name}</p>
                            <p className="text-xs text-gray-500">Agente IA - {agent.instance_name}</p>
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">No hay agentes IA disponibles</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowAssignmentModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};