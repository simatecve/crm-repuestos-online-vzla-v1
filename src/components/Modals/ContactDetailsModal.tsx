import React, { useState, useEffect } from 'react';
import { X, Mail, Phone, Building, Calendar, Tag, Activity, MessageSquare, Edit, List } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  tags: string[];
  segment: string;
  status: 'active' | 'inactive';
  created_at: string;
  custom_fields?: Record<string, any>;
  score?: number;
}

interface Interaction {
  id: string;
  tipo: string;
  titulo: string;
  descripcion: string;
  fecha: string;
}

interface CustomField {
  id: string;
  name: string;
  label: string;
  field_type: string;
  entity_type: string;
  options: string[];
}

interface ContactDetailsModalProps {
  contact: Contact | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ContactDetailsModal: React.FC<ContactDetailsModalProps> = ({ 
  contact, 
  isOpen, 
  onClose 
}) => {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);

  useEffect(() => {
    if (contact && isOpen) {
      fetchInteractions();
      fetchCustomFields();
    }
  }, [contact, isOpen]);

  const fetchInteractions = async () => {
    if (!contact) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('interacciones')
        .select('*')
        .eq('contacto_id', contact.id)
        .order('fecha', { ascending: false });

      if (error) throw error;
      setInteractions(data || []);
    } catch (error) {
      console.error('Error fetching interactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomFields = async () => {
    try {
      setLoadingFields(true);
      const { data, error } = await supabase
        .from('custom_fields')
        .select('*')
        .eq('entity_type', 'contact')
        .eq('is_visible', true);

      if (error) throw error;
      setCustomFields(data || []);
    } catch (error) {
      console.error('Error fetching custom fields:', error);
    } finally {
      setLoadingFields(false);
    }
  };

  const addNote = async () => {
    if (!contact || !newNote.trim()) return;

    try {
      setAddingNote(true);
      const { error } = await supabase
        .from('interacciones')
        .insert([{
          tipo: 'nota',
          contacto_id: contact.id,
          titulo: 'Nota agregada',
          descripcion: newNote.trim(),
          fecha: new Date().toISOString()
        }]);

      if (error) throw error;

      toast.success('Nota agregada correctamente');
      setNewNote('');
      fetchInteractions();
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Error al agregar la nota');
    } finally {
      setAddingNote(false);
    }
  };

  const getInteractionIcon = (tipo: string) => {
    switch (tipo) {
      case 'email_enviado':
      case 'email_abierto':
      case 'email_click':
        return <Mail className="w-4 h-4" />;
      case 'whatsapp_enviado':
      case 'whatsapp_leido':
      case 'whatsapp_respondido':
        return <MessageSquare className="w-4 h-4" />;
      case 'llamada':
        return <Phone className="w-4 h-4" />;
      case 'nota':
        return <Edit className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getInteractionColor = (tipo: string) => {
    switch (tipo) {
      case 'email_enviado':
      case 'email_abierto':
      case 'email_click':
        return 'text-blue-600 bg-blue-100';
      case 'whatsapp_enviado':
      case 'whatsapp_leido':
      case 'whatsapp_respondido':
        return 'text-green-600 bg-green-100';
      case 'llamada':
        return 'text-purple-600 bg-purple-100';
      case 'nota':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFieldLabel = (fieldName: string): string => {
    const field = customFields.find(f => f.name === fieldName);
    return field ? field.label : fieldName;
  };

  const formatFieldValue = (value: any, fieldType: string): string => {
    if (value === null || value === undefined) return '-';
    
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    
    if (fieldType === 'boolean') {
      return value ? 'Sí' : 'No';
    }
    
    if (fieldType === 'date' && value) {
      try {
        return new Date(value).toLocaleDateString();
      } catch (e) {
        return value;
      }
    }
    
    return String(value);
  };

  if (!isOpen || !contact) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Detalles del Contacto</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Contact Info */}
            <div className="lg:col-span-1">
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="text-center mb-6">
                  <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-white">
                      {contact.name.charAt(0)}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">{contact.name}</h3>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${
                    contact.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {contact.status === 'active' ? 'Activo' : 'Inactivo'}
                  </span>
                  {contact.score !== undefined && contact.score > 0 && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ml-2 bg-indigo-100 text-indigo-800">
                      {contact.score} puntos
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Email</p>
                      <p className="text-sm text-gray-600">{contact.email}</p>
                    </div>
                  </div>

                  {contact.phone && (
                    <div className="flex items-center space-x-3">
                      <Phone className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Teléfono</p>
                        <p className="text-sm text-gray-600">{contact.phone}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center space-x-3">
                    <Building className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Segmento</p>
                      <p className="text-sm text-gray-600">{contact.segment}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Creado</p>
                      <p className="text-sm text-gray-600">{formatDate(contact.created_at)}</p>
                    </div>
                  </div>

                  {contact.tags.length > 0 && (
                    <div className="flex items-start space-x-3">
                      <Tag className="w-5 h-5 text-gray-400 mt-1" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 mb-2">Etiquetas</p>
                        <div className="flex flex-wrap gap-1">
                          {contact.tags.map((tag, index) => (
                            <span 
                              key={index}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Custom Fields */}
                  {contact.custom_fields && Object.keys(contact.custom_fields).length > 0 && (
                    <div className="flex items-start space-x-3 mt-4 pt-4 border-t border-gray-200">
                      <List className="w-5 h-5 text-gray-400 mt-1" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 mb-2">Campos Personalizados</p>
                        <div className="space-y-2">
                          {Object.entries(contact.custom_fields).map(([key, value], index) => {
                            const field = customFields.find(f => f.name === key);
                            return (
                              <div key={index} className="flex justify-between">
                                <span className="text-sm text-gray-600">{getFieldLabel(key)}:</span>
                                <span className="text-sm font-medium text-gray-900">
                                  {formatFieldValue(value, field?.field_type || 'text')}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Interactions */}
            <div className="lg:col-span-2">
              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Historial de Interacciones</h3>
                </div>

                {/* Add Note */}
                <div className="p-6 border-b border-gray-200 bg-gray-50">
                  <div className="space-y-3">
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Agregar una nota..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={addNote}
                        disabled={!newNote.trim() || addingNote}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2 transition-colors"
                      >
                        {addingNote ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <Edit className="w-4 h-4" />
                        )}
                        <span>Agregar Nota</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Interactions List */}
                <div className="p-6">
                  {loading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : interactions.length > 0 ? (
                    <div className="space-y-4">
                      {interactions.map((interaction) => (
                        <div key={interaction.id} className="flex items-start space-x-3">
                          <div className={`p-2 rounded-lg ${getInteractionColor(interaction.tipo)}`}>
                            {getInteractionIcon(interaction.tipo)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-medium text-gray-900">
                                {interaction.titulo}
                              </h4>
                              <span className="text-xs text-gray-500">
                                {formatDate(interaction.fecha)}
                              </span>
                            </div>
                            {interaction.descripcion && (
                              <p className="text-sm text-gray-600 mt-1">
                                {interaction.descripcion}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Activity className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No hay interacciones</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Las interacciones aparecerán aquí cuando se registren.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};