import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  Save,
  X,
  Move,
  Eye,
  EyeOff,
  Check,
  AlertTriangle,
  List,
  Calendar,
  Type,
  ToggleLeft,
  Hash,
  RefreshCw
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useUserRole } from '../../hooks/useUserRole';
import toast from 'react-hot-toast';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';

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
  created_at: string;
  updated_at: string;
}

export const CustomFieldsManager: React.FC = () => {
  const { canEdit, canCreate, canDelete, loading: roleLoading } = useUserRole();
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFieldForm, setShowFieldForm] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [activeTab, setActiveTab] = useState<'contact' | 'lead'>('contact');
  const [refreshing, setRefreshing] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<Partial<CustomField>>({
    name: '',
    label: '',
    field_type: 'text',
    entity_type: 'contact',
    options: [],
    is_required: false,
    is_visible: true,
    display_order: 0
  });
  
  // Option input for select/multiselect
  const [optionInput, setOptionInput] = useState('');

  useEffect(() => {
    fetchCustomFields();
  }, []);

  const fetchCustomFields = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('custom_fields')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setCustomFields(data || []);
    } catch (error) {
      console.error('Error fetching custom fields:', error);
      toast.error('Error al cargar los campos personalizados');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCustomFields();
    setRefreshing(false);
    toast.success('Datos actualizados');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.label) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    // Validar que el nombre sea alfanumérico y con guiones bajos
    if (!/^[a-z0-9_]+$/.test(formData.name)) {
      toast.error('El nombre del campo solo puede contener letras minúsculas, números y guiones bajos');
      return;
    }

    try {
      // Determinar el orden de visualización
      if (!formData.display_order) {
        const fieldsOfSameType = customFields.filter(f => f.entity_type === formData.entity_type);
        formData.display_order = fieldsOfSameType.length > 0 
          ? Math.max(...fieldsOfSameType.map(f => f.display_order)) + 1 
          : 1;
      }

      if (editingField?.id) {
        // Update existing field
        const { error } = await supabase
          .from('custom_fields')
          .update(formData)
          .eq('id', editingField.id);

        if (error) throw error;
        toast.success('Campo personalizado actualizado correctamente');
      } else {
        // Create new field
        const { error } = await supabase
          .from('custom_fields')
          .insert([formData]);

        if (error) throw error;
        toast.success('Campo personalizado creado correctamente');
      }

      setShowFieldForm(false);
      setEditingField(null);
      setFormData({
        name: '',
        label: '',
        field_type: 'text',
        entity_type: 'contact',
        options: [],
        is_required: false,
        is_visible: true,
        display_order: 0
      });
      setOptionInput('');
      fetchCustomFields();
    } catch (error) {
      console.error('Error saving custom field:', error);
      toast.error('Error al guardar el campo personalizado');
    }
  };

  const handleToggleFieldVisibility = async (fieldId: string, currentVisibility: boolean) => {
    try {
      const { error } = await supabase
        .from('custom_fields')
        .update({ is_visible: !currentVisibility })
        .eq('id', fieldId);

      if (error) throw error;

      setCustomFields(prev => 
        prev.map(field => 
          field.id === fieldId 
            ? { ...field, is_visible: !currentVisibility }
            : field
        )
      );

      toast.success(`Campo ${!currentVisibility ? 'visible' : 'oculto'} correctamente`);
    } catch (error) {
      console.error('Error updating field visibility:', error);
      toast.error('Error al actualizar la visibilidad del campo');
    }
  };

  const handleDeleteField = async (fieldId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este campo personalizado? Esta acción no se puede deshacer y podría afectar a los datos existentes.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('custom_fields')
        .delete()
        .eq('id', fieldId);

      if (error) throw error;

      setCustomFields(prev => prev.filter(field => field.id !== fieldId));
      toast.success('Campo personalizado eliminado correctamente');
    } catch (error) {
      console.error('Error deleting custom field:', error);
      toast.error('Error al eliminar el campo personalizado');
    }
  };

  const handleEditField = (field: CustomField) => {
    setEditingField(field);
    setFormData({
      name: field.name,
      label: field.label,
      field_type: field.field_type,
      entity_type: field.entity_type,
      options: field.options,
      is_required: field.is_required,
      is_visible: field.is_visible,
      display_order: field.display_order
    });
    setShowFieldForm(true);
  };

  const handleAddOption = () => {
    if (!optionInput.trim()) return;
    
    setFormData(prev => ({
      ...prev,
      options: [...(prev.options || []), optionInput.trim()]
    }));
    setOptionInput('');
  };

  const handleRemoveOption = (index: number) => {
    setFormData(prev => ({
      ...prev,
      options: (prev.options || []).filter((_, i) => i !== index)
    }));
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    
    const { source, destination } = result;
    
    // Only handle reordering within the same entity type
    if (source.droppableId !== destination.droppableId) return;
    
    const entityType = source.droppableId as 'contact' | 'lead';
    const fieldsOfType = customFields.filter(f => f.entity_type === entityType);
    
    // Reorder the fields
    const reorderedFields = Array.from(fieldsOfType);
    const [removed] = reorderedFields.splice(source.index, 1);
    reorderedFields.splice(destination.index, 0, removed);
    
    // Update display_order for all fields
    const updatedFields = reorderedFields.map((field, index) => ({
      ...field,
      display_order: index + 1
    }));
    
    // Update local state
    setCustomFields(prev => [
      ...prev.filter(f => f.entity_type !== entityType),
      ...updatedFields
    ]);
    
    // Update in database
    try {
      for (const field of updatedFields) {
        await supabase
          .from('custom_fields')
          .update({ display_order: field.display_order })
          .eq('id', field.id);
      }
      
      toast.success('Orden actualizado correctamente');
    } catch (error) {
      console.error('Error updating field order:', error);
      toast.error('Error al actualizar el orden de los campos');
      // Revert to original state on error
      fetchCustomFields();
    }
  };

  const getFieldTypeIcon = (type: string) => {
    switch (type) {
      case 'text': return <Type className="w-4 h-4" />;
      case 'number': return <Hash className="w-4 h-4" />;
      case 'date': return <Calendar className="w-4 h-4" />;
      case 'boolean': return <ToggleLeft className="w-4 h-4" />;
      case 'select':
      case 'multiselect': 
        return <List className="w-4 h-4" />;
      default: return <Type className="w-4 h-4" />;
    }
  };

  const getFieldTypeText = (type: string) => {
    switch (type) {
      case 'text': return 'Texto';
      case 'number': return 'Número';
      case 'date': return 'Fecha';
      case 'boolean': return 'Sí/No';
      case 'select': return 'Selección';
      case 'multiselect': return 'Selección múltiple';
      default: return type;
    }
  };

  const filteredFields = customFields.filter(field => field.entity_type === activeTab);

  if (loading || roleLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Campos Personalizados</h2>
          <p className="text-gray-600 mt-1">
            Configura campos adicionales para contactos y leads
          </p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center space-x-2 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
          <button 
            onClick={() => {
              setEditingField(null);
              setFormData({
                name: '',
                label: '',
                field_type: 'text',
                entity_type: activeTab,
                options: [],
                is_required: false,
                is_visible: true,
                display_order: 0
              });
              setOptionInput('');
              setShowFieldForm(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Campo</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('contact')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'contact'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Campos de Contactos
            </button>
            <button
              onClick={() => setActiveTab('lead')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'lead'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Campos de Leads
            </button>
          </nav>
        </div>

        <div className="p-6">
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId={activeTab}>
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-4"
                >
                  {filteredFields.length > 0 ? (
                    filteredFields.map((field, index) => (
                      <Draggable key={field.id} draggableId={field.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`border rounded-lg p-4 ${
                              snapshot.isDragging ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                            } ${field.is_visible ? '' : 'bg-gray-50'}`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start space-x-3">
                                <div 
                                  {...provided.dragHandleProps}
                                  className="p-1 text-gray-400 hover:text-gray-600 cursor-grab"
                                >
                                  <Move className="w-5 h-5" />
                                </div>
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <h4 className="font-medium text-gray-900">{field.label}</h4>
                                    <span className="text-sm text-gray-500">({field.name})</span>
                                    {field.is_required && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                        Requerido
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center space-x-2 mt-1">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                      {getFieldTypeIcon(field.field_type)}
                                      <span className="ml-1">{getFieldTypeText(field.field_type)}</span>
                                    </span>
                                    {(field.field_type === 'select' || field.field_type === 'multiselect') && field.options.length > 0 && (
                                      <span className="text-xs text-gray-500">
                                        {field.options.length} opciones
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleToggleFieldVisibility(field.id, field.is_visible)}
                                  className={`p-1 rounded hover:bg-gray-100 ${
                                    field.is_visible ? 'text-green-600' : 'text-gray-400'
                                  }`}
                                  title={field.is_visible ? 'Ocultar campo' : 'Mostrar campo'}
                                >
                                  {field.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                </button>
                                <button
                                  onClick={() => handleEditField(field)}
                                  className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                  title="Editar"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteField(field.id)}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            
                            {(field.field_type === 'select' || field.field_type === 'multiselect') && field.options.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-gray-100">
                                <div className="flex flex-wrap gap-1">
                                  {field.options.map((option, i) => (
                                    <span key={i} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                      {option}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Settings className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No hay campos personalizados</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Comienza creando tu primer campo personalizado para {activeTab === 'contact' ? 'contactos' : 'leads'}.
                      </p>
                      <button
                        onClick={() => {
                          setEditingField(null);
                          setFormData({
                            name: '',
                            label: '',
                            field_type: 'text',
                            entity_type: activeTab,
                            options: [],
                            is_required: false,
                            is_visible: true,
                            display_order: 0
                          });
                          setOptionInput('');
                          setShowFieldForm(true);
                        }}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center space-x-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Nuevo Campo</span>
                      </button>
                    </div>
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      </div>

      {/* Form Modal */}
      {showFieldForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingField ? 'Editar Campo Personalizado' : 'Nuevo Campo Personalizado'}
              </h2>
              <button
                onClick={() => {
                  setShowFieldForm(false);
                  setEditingField(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre del Campo *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="nombre_campo"
                    disabled={!!editingField} // No permitir cambiar el nombre en edición
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Solo letras minúsculas, números y guiones bajos
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Etiqueta *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Etiqueta visible"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Campo *
                  </label>
                  <select
                    required
                    value={formData.field_type}
                    onChange={(e) => setFormData({ ...formData, field_type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={!!editingField} // No permitir cambiar el tipo en edición
                  >
                    <option value="text">Texto</option>
                    <option value="number">Número</option>
                    <option value="date">Fecha</option>
                    <option value="boolean">Sí/No</option>
                    <option value="select">Selección</option>
                    <option value="multiselect">Selección múltiple</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Entidad *
                  </label>
                  <select
                    required
                    value={formData.entity_type}
                    onChange={(e) => setFormData({ ...formData, entity_type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={!!editingField} // No permitir cambiar el tipo de entidad en edición
                  >
                    <option value="contact">Contacto</option>
                    <option value="lead">Lead</option>
                  </select>
                </div>

                {(formData.field_type === 'select' || formData.field_type === 'multiselect') && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Opciones *
                    </label>
                    <div className="flex space-x-2 mb-2">
                      <input
                        type="text"
                        value={optionInput}
                        onChange={(e) => setOptionInput(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Nueva opción"
                      />
                      <button
                        type="button"
                        onClick={handleAddOption}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Añadir
                      </button>
                    </div>
                    
                    {(formData.options || []).length > 0 ? (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex flex-wrap gap-2">
                          {(formData.options || []).map((option, index) => (
                            <div key={index} className="flex items-center bg-white px-3 py-1 rounded-full border border-gray-200">
                              <span className="text-sm">{option}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveOption(index)}
                                className="ml-2 text-gray-400 hover:text-red-600"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-yellow-50 p-3 rounded-lg">
                        <div className="flex items-start">
                          <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                          <div className="ml-3">
                            <p className="text-sm text-yellow-700">
                              Debes añadir al menos una opción para este tipo de campo.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_required"
                    checked={formData.is_required}
                    onChange={(e) => setFormData({ ...formData, is_required: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_required" className="ml-2 block text-sm text-gray-900">
                    Campo requerido
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_visible"
                    checked={formData.is_visible}
                    onChange={(e) => setFormData({ ...formData, is_visible: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_visible" className="ml-2 block text-sm text-gray-900">
                    Campo visible
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowFieldForm(false);
                    setEditingField(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={(formData.field_type === 'select' || formData.field_type === 'multiselect') && (!formData.options || formData.options.length === 0)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingField ? 'Actualizar' : 'Crear'} Campo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};