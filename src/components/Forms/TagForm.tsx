import React, { useState, useEffect } from 'react';
import { X, Save, Tag, Palette, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface TagData {
  id?: string;
  nombre: string;
  descripcion: string;
  color: string;
  activa: boolean;
}

interface TagFormProps {
  tag?: TagData | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const colorOptions = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
];

export const TagForm: React.FC<TagFormProps> = ({ tag, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState<TagData>({
    nombre: '',
    descripcion: '',
    color: '#3B82F6',
    activa: true
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tag) {
      setFormData(tag);
    } else {
      setFormData({
        nombre: '',
        descripcion: '',
        color: '#3B82F6',
        activa: true
      });
    }
  }, [tag]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (tag?.id) {
        // Update existing tag
        const { error } = await supabase
          .from('etiquetas')
          .update(formData)
          .eq('id', tag.id);

        if (error) throw error;
        toast.success('Etiqueta actualizada correctamente');
      } else {
        // Create new tag
        const { error } = await supabase
          .from('etiquetas')
          .insert([formData]);

        if (error) throw error;
        toast.success('Etiqueta creada correctamente');
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving tag:', error);
      toast.error('Error al guardar la etiqueta');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {tag ? 'Editar Etiqueta' : 'Nueva Etiqueta'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Tag className="w-4 h-4 inline mr-2" />
              Nombre de la Etiqueta *
            </label>
            <input
              type="text"
              required
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Cliente VIP"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4 inline mr-2" />
              Descripción
            </label>
            <textarea
              rows={3}
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Descripción de la etiqueta..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Palette className="w-4 h-4 inline mr-2" />
              Color de la Etiqueta
            </label>
            <div className="grid grid-cols-5 gap-2">
              {colorOptions.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`w-10 h-10 rounded-lg border-2 ${
                    formData.color === color ? 'border-gray-400' : 'border-gray-200'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <div className="mt-2">
              <span 
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white"
                style={{ backgroundColor: formData.color }}
              >
                {formData.nombre || 'Vista previa'}
              </span>
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
              Etiqueta activa
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
              <span>{tag ? 'Actualizar' : 'Crear'} Etiqueta</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};