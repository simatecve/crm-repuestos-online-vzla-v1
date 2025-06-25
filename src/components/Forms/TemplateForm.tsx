import React, { useState, useEffect } from 'react';
import { X, Save, FileText, MessageSquare, Mail, Type } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface Template {
  id?: string;
  nombre: string;
  tipo: 'email' | 'whatsapp' | 'sms';
  asunto: string;
  contenido: string;
  variables: Record<string, string>;
  activa: boolean;
}

interface TemplateFormProps {
  template?: Template | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export const TemplateForm: React.FC<TemplateFormProps> = ({ template, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState<Template>({
    nombre: '',
    tipo: 'email',
    asunto: '',
    contenido: '',
    variables: {},
    activa: true
  });
  const [loading, setLoading] = useState(false);
  const [newVariable, setNewVariable] = useState({ key: '', value: '' });

  useEffect(() => {
    if (template) {
      setFormData(template);
    } else {
      setFormData({
        nombre: '',
        tipo: 'email',
        asunto: '',
        contenido: '',
        variables: {},
        activa: true
      });
    }
  }, [template]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (template?.id) {
        // Update existing template
        const { error } = await supabase
          .from('plantillas')
          .update(formData)
          .eq('id', template.id);

        if (error) throw error;
        toast.success('Plantilla actualizada correctamente');
      } else {
        // Create new template
        const { error } = await supabase
          .from('plantillas')
          .insert([formData]);

        if (error) throw error;
        toast.success('Plantilla creada correctamente');
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Error al guardar la plantilla');
    } finally {
      setLoading(false);
    }
  };

  const addVariable = () => {
    if (newVariable.key.trim() && newVariable.value.trim()) {
      setFormData({
        ...formData,
        variables: {
          ...formData.variables,
          [newVariable.key]: newVariable.value
        }
      });
      setNewVariable({ key: '', value: '' });
    }
  };

  const removeVariable = (key: string) => {
    const { [key]: removed, ...rest } = formData.variables;
    setFormData({
      ...formData,
      variables: rest
    });
  };

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('contenido') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const before = text.substring(0, start);
      const after = text.substring(end, text.length);
      const newText = before + `{{${variable}}}` + after;
      
      setFormData({ ...formData, contenido: newText });
      
      // Set cursor position after the inserted variable
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length + 4, start + variable.length + 4);
      }, 0);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {template ? 'Editar Plantilla' : 'Nueva Plantilla'}
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
                <FileText className="w-4 h-4 inline mr-2" />
                Nombre de la Plantilla *
              </label>
              <input
                type="text"
                required
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Bienvenida Email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Plantilla *
              </label>
              <select
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value as 'email' | 'whatsapp' | 'sms' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="sms">SMS</option>
              </select>
            </div>

            {formData.tipo === 'email' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="w-4 h-4 inline mr-2" />
                  Asunto del Email
                </label>
                <input
                  type="text"
                  value={formData.asunto}
                  onChange={(e) => setFormData({ ...formData, asunto: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="¡Bienvenido a nuestra plataforma!"
                />
              </div>
            )}
          </div>

          {/* Variables Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Type className="w-4 h-4 inline mr-2" />
              Variables Disponibles
            </label>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex flex-wrap gap-2 mb-4">
                {['nombre', 'email', 'empresa', 'telefono'].map((variable) => (
                  <button
                    key={variable}
                    type="button"
                    onClick={() => insertVariable(variable)}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm hover:bg-blue-200 transition-colors"
                  >
                    {`{{${variable}}}`}
                  </button>
                ))}
                {Object.keys(formData.variables).map((variable) => (
                  <button
                    key={variable}
                    type="button"
                    onClick={() => insertVariable(variable)}
                    className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm hover:bg-green-200 transition-colors"
                  >
                    {`{{${variable}}}`}
                  </button>
                ))}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Nombre variable"
                  value={newVariable.key}
                  onChange={(e) => setNewVariable({ ...newVariable, key: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="Descripción"
                  value={newVariable.value}
                  onChange={(e) => setNewVariable({ ...newVariable, value: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={addVariable}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Agregar Variable
                </button>
              </div>

              {Object.keys(formData.variables).length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Variables Personalizadas:</h4>
                  <div className="space-y-2">
                    {Object.entries(formData.variables).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between bg-white p-2 rounded border">
                        <span className="text-sm">
                          <code className="bg-gray-100 px-2 py-1 rounded">{`{{${key}}}`}</code>
                          <span className="ml-2 text-gray-600">{value}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => removeVariable(key)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MessageSquare className="w-4 h-4 inline mr-2" />
              Contenido del Mensaje *
            </label>
            <textarea
              id="contenido"
              rows={8}
              required
              value={formData.contenido}
              onChange={(e) => setFormData({ ...formData, contenido: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={`Hola ${"{{nombre}}"}, bienvenido a nuestra plataforma...`}
            />
            <div className="mt-2 text-sm text-gray-500">
              Haz clic en las variables de arriba para insertarlas en el contenido.
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="activa"
              checked={formData.activa}
              onChange={(e) => setFormData({ ...formData, activa: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="activa" className="ml-2 block text-sm text-gray-900">
              Plantilla activa
            </label>
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
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2 transition-colors"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{template ? 'Actualizar' : 'Crear'} Plantilla</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};