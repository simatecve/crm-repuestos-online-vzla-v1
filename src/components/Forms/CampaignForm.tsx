import React, { useState, useEffect } from 'react';
import { X, Save, Mail, MessageSquare, FileText, Calendar, Users, Send, Upload, Image, Video, FileAudio, Paperclip, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface Campaign {
  id?: string;
  name: string;
  type: 'email' | 'whatsapp';
  subject: string;
  content: string;
  status: 'draft' | 'scheduled' | 'sent' | 'paused';
  scheduled_at?: string;
  target_lists?: string[];
  target_groups?: string[];
  target_tags?: string[];
  multimedia_files?: string[];
}

interface ContactList {
  id: string;
  nombre: string;
  total_contactos: number;
}

interface ContactGroup {
  id: string;
  name: string;
  member_count: number;
}

interface ContactTag {
  id: string;
  name: string;
  usage_count: number;
}

interface CampaignFormProps {
  campaign?: Campaign | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export const CampaignForm: React.FC<CampaignFormProps> = ({ campaign, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState<Campaign>({
    name: '',
    type: 'email',
    subject: '',
    content: '',
    status: 'draft',
    target_lists: [],
    target_groups: [],
    target_tags: [],
    multimedia_files: []
  });
  const [loading, setLoading] = useState(false);
  const [plantillas, setPlantillas] = useState<any[]>([]);
  const [contactLists, setContactLists] = useState<ContactList[]>([]);
  const [contactGroups, setContactGroups] = useState<ContactGroup[]>([]);
  const [contactTags, setContactTags] = useState<ContactTag[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  useEffect(() => {
    if (campaign) {
      setFormData(campaign);
    } else {
      setFormData({
        name: '',
        type: 'email',
        subject: '',
        content: '',
        status: 'draft',
        target_lists: [],
        target_groups: [],
        target_tags: [],
        multimedia_files: []
      });
    }
  }, [campaign]);

  useEffect(() => {
    fetchPlantillas();
    fetchContactData();
  }, []);

  const fetchPlantillas = async () => {
    try {
      const { data, error } = await supabase
        .from('plantillas')
        .select('*')
        .eq('activa', true)
        .order('nombre');

      if (error) throw error;
      setPlantillas(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchContactData = async () => {
    try {
      // Fetch contact lists
      const { data: listsData, error: listsError } = await supabase
        .from('listas')
        .select('id, nombre, total_contactos')
        .eq('activa', true)
        .order('nombre');

      if (listsError) throw listsError;
      setContactLists(listsData || []);

      // Fetch contact groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('contact_groups')
        .select('id, name, member_count')
        .eq('is_active', true)
        .order('name');

      if (groupsError) throw groupsError;
      setContactGroups(groupsData || []);

      // Fetch contact tags
      const { data: tagsData, error: tagsError } = await supabase
        .from('contact_tags')
        .select('id, name, usage_count')
        .eq('is_active', true)
        .order('name');

      if (tagsError) throw tagsError;
      setContactTags(tagsData || []);
    } catch (error) {
      console.error('Error fetching contact data:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Upload multimedia files if any
      let multimediaUrls: string[] = [];
      if (uploadedFiles.length > 0) {
        multimediaUrls = await uploadMultimediaFiles();
      }

      const campaignData = {
        ...formData,
        multimedia_files: [...(formData.multimedia_files || []), ...multimediaUrls]
      };

      if (campaign?.id) {
        // Update existing campaign
        const { error } = await supabase
          .from('campaigns')
          .update(campaignData)
          .eq('id', campaign.id);

        if (error) throw error;
        toast.success('Campaña actualizada correctamente');
      } else {
        // Create new campaign
        const { error } = await supabase
          .from('campaigns')
          .insert([campaignData]);

        if (error) throw error;
        toast.success('Campaña creada correctamente');
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving campaign:', error);
      toast.error('Error al guardar la campaña');
    } finally {
      setLoading(false);
    }
  };

  const uploadMultimediaFiles = async (): Promise<string[]> => {
    const urls: string[] = [];
    setUploadingFiles(true);

    try {
      for (const file of uploadedFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `campaign-media/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('campaign-files')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('campaign-files')
          .getPublicUrl(filePath);

        urls.push(data.publicUrl);
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Error al subir archivos multimedia');
    } finally {
      setUploadingFiles(false);
    }

    return urls;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/') || 
                         file.type.startsWith('video/') || 
                         file.type.startsWith('audio/') ||
                         file.type === 'application/pdf';
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB limit

      if (!isValidType) {
        toast.error(`${file.name}: Tipo de archivo no válido`);
        return false;
      }
      if (!isValidSize) {
        toast.error(`${file.name}: El archivo es demasiado grande (máximo 10MB)`);
        return false;
      }
      return true;
    });

    setUploadedFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="w-4 h-4" />;
    if (file.type.startsWith('video/')) return <Video className="w-4 h-4" />;
    if (file.type.startsWith('audio/')) return <FileAudio className="w-4 h-4" />;
    return <Paperclip className="w-4 h-4" />;
  };

  const loadTemplate = (template: any) => {
    setFormData({
      ...formData,
      subject: template.asunto,
      content: template.contenido,
      type: template.tipo
    });
  };

  const handleTargetSelection = (type: 'lists' | 'groups' | 'tags', id: string) => {
    const targetKey = type === 'lists' ? 'target_lists' : 
                     type === 'groups' ? 'target_groups' : 'target_tags';
    
    const currentTargets = formData[targetKey] || [];
    const isSelected = currentTargets.includes(id);
    
    setFormData({
      ...formData,
      [targetKey]: isSelected 
        ? currentTargets.filter(targetId => targetId !== id)
        : [...currentTargets, id]
    });
  };

  const getTotalTargetContacts = () => {
    let total = 0;
    
    // Count from lists
    (formData.target_lists || []).forEach(listId => {
      const list = contactLists.find(l => l.id === listId);
      if (list) total += list.total_contactos;
    });
    
    // Count from groups
    (formData.target_groups || []).forEach(groupId => {
      const group = contactGroups.find(g => g.id === groupId);
      if (group) total += group.member_count;
    });
    
    // Count from tags (approximate)
    (formData.target_tags || []).forEach(tagId => {
      const tag = contactTags.find(t => t.id === tagId);
      if (tag) total += tag.usage_count;
    });
    
    return total;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {campaign ? 'Editar Campaña' : 'Nueva Campaña'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Basic Info */}
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FileText className="w-4 h-4 inline mr-2" />
                    Nombre de la Campaña *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Promoción de Verano 2024"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Campaña *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'email' | 'whatsapp' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="email">Email Marketing</option>
                    <option value="whatsapp">WhatsApp</option>
                  </select>
                </div>

                {formData.type === 'email' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Mail className="w-4 h-4 inline mr-2" />
                      Asunto del Email *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="¡Oferta especial solo para ti!"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estado
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="draft">Borrador</option>
                    <option value="scheduled">Programada</option>
                    <option value="sent">Enviada</option>
                    <option value="paused">Pausada</option>
                  </select>
                </div>

                {formData.status === 'scheduled' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="w-4 h-4 inline mr-2" />
                      Fecha y Hora de Envío
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.scheduled_at}
                      onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}
              </div>

              {/* Template Selection */}
              {plantillas.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Usar Plantilla
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {plantillas
                      .filter(t => t.tipo === formData.type)
                      .map((template) => (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => loadTemplate(template)}
                          className="p-3 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                        >
                          <div className="font-medium text-gray-900">{template.nombre}</div>
                          <div className="text-sm text-gray-500 mt-1">{template.descripcion}</div>
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MessageSquare className="w-4 h-4 inline mr-2" />
                  Contenido del Mensaje *
                </label>
                <textarea
                  rows={8}
                  required
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Escribe aquí el contenido de tu campaña..."
                />
                <div className="mt-2 text-sm text-gray-500">
                  Puedes usar variables como {"{{nombre}}"}, {"{{email}}"}, {"{{empresa}}"} para personalizar el mensaje.
                </div>
              </div>

              {/* Multimedia Upload for WhatsApp */}
              {formData.type === 'whatsapp' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Upload className="w-4 h-4 inline mr-2" />
                    Archivos Multimedia (Opcional)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                    <div className="text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="mt-4">
                        <label htmlFor="multimedia-upload" className="cursor-pointer">
                          <span className="mt-2 block text-sm font-medium text-gray-900">
                            Selecciona archivos multimedia
                          </span>
                          <input
                            id="multimedia-upload"
                            name="multimedia-upload"
                            type="file"
                            multiple
                            accept="image/*,video/*,audio/*,.pdf"
                            className="sr-only"
                            onChange={handleFileUpload}
                          />
                        </label>
                        <p className="mt-1 text-sm text-gray-500">
                          Imágenes, videos, audios o PDFs (máximo 10MB cada uno)
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Uploaded Files List */}
                  {uploadedFiles.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Archivos seleccionados:</h4>
                      <div className="space-y-2">
                        {uploadedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              {getFileIcon(file)}
                              <div>
                                <p className="text-sm font-medium text-gray-900">{file.name}</p>
                                <p className="text-xs text-gray-500">
                                  {(file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="p-1 text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Column - Target Selection */}
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  <Users className="w-5 h-5 inline mr-2" />
                  Audiencia Objetivo
                </h3>

                {/* Contact Lists */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Listas de Contactos</h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {contactLists.map((list) => (
                      <label key={list.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={(formData.target_lists || []).includes(list.id)}
                          onChange={() => handleTargetSelection('lists', list.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-900">{list.nombre}</span>
                        <span className="ml-auto text-xs text-gray-500">
                          ({list.total_contactos} contactos)
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Contact Groups */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Grupos de Contactos</h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {contactGroups.map((group) => (
                      <label key={group.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={(formData.target_groups || []).includes(group.id)}
                          onChange={() => handleTargetSelection('groups', group.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-900">{group.name}</span>
                        <span className="ml-auto text-xs text-gray-500">
                          ({group.member_count} miembros)
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Contact Tags */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Etiquetas</h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {contactTags.map((tag) => (
                      <label key={tag.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={(formData.target_tags || []).includes(tag.id)}
                          onChange={() => handleTargetSelection('tags', tag.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-900">{tag.name}</span>
                        <span className="ml-auto text-xs text-gray-500">
                          ({tag.usage_count} usos)
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Target Summary */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">Resumen de Audiencia</h4>
                  <p className="text-sm text-blue-700">
                    <strong>Contactos aproximados:</strong> {getTotalTargetContacts().toLocaleString()}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    * Los números pueden variar debido a contactos duplicados entre listas, grupos y etiquetas
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || uploadingFiles}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2 transition-colors"
            >
              {loading || uploadingFiles ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>
                {uploadingFiles ? 'Subiendo archivos...' : campaign ? 'Actualizar' : 'Crear'} Campaña
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};