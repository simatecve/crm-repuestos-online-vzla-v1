import React, { useState, useEffect } from 'react';
import { X, Save, User, Mail, Phone, Building, MapPin, Tag, List } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface Contact {
  id?: string;
  name: string;
  email: string;
  phone: string;
  tags: string[];
  segment: string;
  status: 'active' | 'inactive';
  custom_fields?: Record<string, any>;
}

interface CustomField {
  id: string;
  name: string;
  label: string;
  field_type: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'multiselect';
  entity_type: 'contact' | 'lead';
  options: string[];
  is_required: boolean;
  is_visible: boolean;
  display_order: number;
}

interface ContactFormProps {
  contact?: Contact | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export const ContactForm: React.FC<ContactFormProps> = ({ contact, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState<Contact>({
    name: '',
    email: '',
    phone: '',
    tags: [],
    segment: 'general',
    status: 'active',
    custom_fields: {}
  });
  const [loading, setLoading] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);

  useEffect(() => {
    if (contact) {
      setFormData({
        ...contact,
        custom_fields: contact.custom_fields || {}
      });
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        tags: [],
        segment: 'general',
        status: 'active',
        custom_fields: {}
      });
    }
    
    fetchCustomFields();
  }, [contact]);

  const fetchCustomFields = async () => {
    try {
      setLoadingFields(true);
      const { data, error } = await supabase
        .from('custom_fields')
        .select('*')
        .eq('entity_type', 'contact')
        .eq('is_visible', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setCustomFields(data || []);
    } catch (error) {
      console.error('Error fetching custom fields:', error);
    } finally {
      setLoadingFields(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (contact?.id) {
        // Update existing contact
        const { error } = await supabase
          .from('contacts')
          .update(formData)
          .eq('id', contact.id);

        if (error) throw error;
        toast.success('Contacto actualizado correctamente');
      } else {
        // Create new contact
        const { error } = await supabase
          .from('contacts')
          .insert([formData]);

        if (error) throw error;
        toast.success('Contacto creado correctamente');
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving contact:', error);
      toast.error('Error al guardar el contacto');
    } finally {
      setLoading(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag.trim()]
      });
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const handleCustomFieldChange = (fieldName: string, value: any) => {
    setFormData({
      ...formData,
      custom_fields: {
        ...(formData.custom_fields || {}),
        [fieldName]: value
      }
    });
  };

  const renderCustomFieldInput = (field: CustomField) => {
    const fieldValue = formData.custom_fields?.[field.name] || '';
    
    switch (field.field_type) {
      case 'text':
        return (
          <input
            type="text"
            value={fieldValue}
            onChange={(e) => handleCustomFieldChange(field.name, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={`Ingrese ${field.label}`}
            required={field.is_required}
          />
        );
      case 'number':
        return (
          <input
            type="number"
            value={fieldValue}
            onChange={(e) => handleCustomFieldChange(field.name, e.target.value ? Number(e.target.value) : '')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={`Ingrese ${field.label}`}
            required={field.is_required}
          />
        );
      case 'date':
        return (
          <input
            type="date"
            value={fieldValue}
            onChange={(e) => handleCustomFieldChange(field.name, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={field.is_required}
          />
        );
      case 'boolean':
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              id={`field-${field.name}`}
              checked={!!fieldValue}
              onChange={(e) => handleCustomFieldChange(field.name, e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              required={field.is_required}
            />
            <label htmlFor={`field-${field.name}`} className="ml-2 block text-sm text-gray-900">
              {field.label}
            </label>
          </div>
        );
      case 'select':
        return (
          <select
            value={fieldValue}
            onChange={(e) => handleCustomFieldChange(field.name, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={field.is_required}
          >
            <option value="">Seleccionar {field.label}</option>
            {field.options.map((option, index) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
        );
      case 'multiselect':
        return (
          <div>
            <select
              multiple
              value={Array.isArray(fieldValue) ? fieldValue : []}
              onChange={(e) => {
                const values = Array.from(e.target.selectedOptions, option => option.value);
                handleCustomFieldChange(field.name, values);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required={field.is_required}
              size={Math.min(field.options.length, 4)}
            >
              {field.options.map((option, index) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Mantén presionado Ctrl (o Cmd en Mac) para seleccionar múltiples opciones
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {contact ? 'Editar Contacto' : 'Nuevo Contacto'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-2" />
                Nombre Completo *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Juan Pérez"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="w-4 h-4 inline mr-2" />
                Email *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="juan@empresa.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Phone className="w-4 h-4 inline mr-2" />
                Teléfono
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+34 600 000 000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-2" />
                Segmento
              </label>
              <select
                value={formData.segment}
                onChange={(e) => setFormData({ ...formData, segment: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="general">General</option>
                <option value="premium">Premium</option>
                <option value="vip">VIP</option>
                <option value="prospecto">Prospecto</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Tag className="w-4 h-4 inline mr-2" />
              Etiquetas
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {formData.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex space-x-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Agregar etiqueta"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Agregar
              </button>
            </div>
          </div>

          {/* Custom Fields Section */}
          {customFields.length > 0 && (
            <div>
              <div className="flex items-center mb-4">
                <List className="w-5 h-5 text-gray-500 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">Campos Personalizados</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customFields.map((field) => (
                  <div key={field.id} className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {field.label} {field.is_required && <span className="text-red-500">*</span>}
                    </label>
                    {renderCustomFieldInput(field)}
                  </div>
                ))}
              </div>
            </div>
          )}

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
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2 transition-colors"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{contact ? 'Actualizar' : 'Crear'} Contacto</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};