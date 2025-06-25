import React, { useState, useEffect } from 'react';
import { X, Plus, Edit, Trash2, GripVertical, Save, Palette } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import toast from 'react-hot-toast';

interface Column {
  id: string;
  title: string;
  color: string;
  order: number;
  is_default: boolean;
}

interface ColumnManagementModalProps {
  columns: Column[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (columns: Column[]) => void;
}

const colorOptions = [
  { name: 'Gris', value: 'bg-gray-500' },
  { name: 'Azul', value: 'bg-blue-500' },
  { name: 'Verde', value: 'bg-green-500' },
  { name: 'Amarillo', value: 'bg-yellow-500' },
  { name: 'Naranja', value: 'bg-orange-500' },
  { name: 'Rojo', value: 'bg-red-500' },
  { name: 'Púrpura', value: 'bg-purple-500' },
  { name: 'Rosa', value: 'bg-pink-500' },
  { name: 'Índigo', value: 'bg-indigo-500' },
  { name: 'Teal', value: 'bg-teal-500' }
];

export const ColumnManagementModal: React.FC<ColumnManagementModalProps> = ({
  columns,
  isOpen,
  onClose,
  onSave
}) => {
  const [localColumns, setLocalColumns] = useState<Column[]>([]);
  const [editingColumn, setEditingColumn] = useState<string | null>(null);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [newColumnColor, setNewColumnColor] = useState('bg-blue-500');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLocalColumns([...columns].sort((a, b) => a.order - b.order));
    }
  }, [columns, isOpen]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(localColumns);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update order numbers
    const updatedItems = items.map((item, index) => ({
      ...item,
      order: index + 1
    }));

    setLocalColumns(updatedItems);
  };

  const handleEditColumn = (columnId: string, newTitle: string) => {
    setLocalColumns(prev => 
      prev.map(col => 
        col.id === columnId ? { ...col, title: newTitle } : col
      )
    );
    setEditingColumn(null);
  };

  const handleColorChange = (columnId: string, newColor: string) => {
    setLocalColumns(prev => 
      prev.map(col => 
        col.id === columnId ? { ...col, color: newColor } : col
      )
    );
  };

  const handleDeleteColumn = (columnId: string) => {
    const column = localColumns.find(col => col.id === columnId);
    
    if (column?.is_default) {
      toast.error('No se pueden eliminar las columnas por defecto');
      return;
    }

    if (!confirm('¿Estás seguro de que quieres eliminar esta columna? Los leads en esta columna se moverán a "Nuevo".')) {
      return;
    }

    setLocalColumns(prev => prev.filter(col => col.id !== columnId));
    toast.success('Columna eliminada correctamente');
  };

  const handleAddColumn = () => {
    if (!newColumnTitle.trim()) {
      toast.error('El título de la columna es obligatorio');
      return;
    }

    const newColumn: Column = {
      id: `custom_${Date.now()}`,
      title: newColumnTitle.trim(),
      color: newColumnColor,
      order: localColumns.length + 1,
      is_default: false
    };

    setLocalColumns(prev => [...prev, newColumn]);
    setNewColumnTitle('');
    setNewColumnColor('bg-blue-500');
    setShowAddForm(false);
    toast.success('Columna agregada correctamente');
  };

  const handleSave = () => {
    if (localColumns.length === 0) {
      toast.error('Debe haber al menos una columna');
      return;
    }

    onSave(localColumns);
    toast.success('Configuración de columnas guardada');
    onClose();
  };

  const resetToDefault = () => {
    if (!confirm('¿Estás seguro de que quieres restaurar las columnas por defecto? Se perderán todas las personalizaciones.')) {
      return;
    }

    const defaultColumns: Column[] = [
      { id: 'nuevo', title: 'Nuevos Leads', color: 'bg-gray-500', order: 1, is_default: true },
      { id: 'contactado', title: 'Contactados', color: 'bg-blue-500', order: 2, is_default: true },
      { id: 'calificado', title: 'Calificados', color: 'bg-orange-500', order: 3, is_default: true },
      { id: 'propuesta', title: 'Propuesta', color: 'bg-purple-500', order: 4, is_default: true },
      { id: 'negociacion', title: 'Negociación', color: 'bg-yellow-500', order: 5, is_default: true },
      { id: 'cerrado_ganado', title: 'Cerrados Ganados', color: 'bg-green-500', order: 6, is_default: true },
      { id: 'cerrado_perdido', title: 'Cerrados Perdidos', color: 'bg-red-500', order: 7, is_default: true }
    ];

    setLocalColumns(defaultColumns);
    toast.success('Columnas restauradas a valores por defecto');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Gestionar Columnas del Kanban</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-medium text-blue-800 mb-2">Instrucciones</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Arrastra las columnas para reordenarlas</li>
              <li>• Haz clic en el título para editarlo</li>
              <li>• Cambia el color haciendo clic en el círculo de color</li>
              <li>• Las columnas por defecto no se pueden eliminar</li>
            </ul>
          </div>

          {/* Add New Column */}
          {showAddForm ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Agregar Nueva Columna</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Título
                  </label>
                  <input
                    type="text"
                    value={newColumnTitle}
                    onChange={(e) => setNewColumnTitle(e.target.value)}
                    placeholder="Nombre de la columna"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Color
                  </label>
                  <select
                    value={newColumnColor}
                    onChange={(e) => setNewColumnColor(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {colorOptions.map((color) => (
                      <option key={color.value} value={color.value}>
                        {color.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end space-x-2">
                  <button
                    onClick={handleAddColumn}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    <span>Agregar</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setNewColumnTitle('');
                      setNewColumnColor('bg-blue-500');
                    }}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-6">
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Columna</span>
              </button>
            </div>
          )}

          {/* Columns List */}
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="columns">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-3"
                >
                  {localColumns.map((column, index) => (
                    <Draggable key={column.id} draggableId={column.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`bg-white border border-gray-200 rounded-lg p-4 ${
                            snapshot.isDragging ? 'shadow-lg' : 'hover:shadow-md'
                          } transition-shadow`}
                        >
                          <div className="flex items-center space-x-4">
                            {/* Drag Handle */}
                            <div
                              {...provided.dragHandleProps}
                              className="text-gray-400 hover:text-gray-600 cursor-grab"
                            >
                              <GripVertical className="w-5 h-5" />
                            </div>

                            {/* Color Selector */}
                            <div className="relative">
                              <select
                                value={column.color}
                                onChange={(e) => handleColorChange(column.id, e.target.value)}
                                className="appearance-none bg-transparent border-none focus:ring-0 cursor-pointer"
                                style={{ width: '24px', height: '24px' }}
                              >
                                {colorOptions.map((color) => (
                                  <option key={color.value} value={color.value}>
                                    {color.name}
                                  </option>
                                ))}
                              </select>
                              <div 
                                className={`absolute inset-0 w-6 h-6 rounded-full ${column.color} pointer-events-none`}
                              />
                            </div>

                            {/* Title */}
                            <div className="flex-1">
                              {editingColumn === column.id ? (
                                <input
                                  type="text"
                                  defaultValue={column.title}
                                  onBlur={(e) => handleEditColumn(column.id, e.target.value)}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      handleEditColumn(column.id, e.currentTarget.value);
                                    }
                                  }}
                                  className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  autoFocus
                                />
                              ) : (
                                <div
                                  onClick={() => setEditingColumn(column.id)}
                                  className="font-medium text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
                                >
                                  {column.title}
                                </div>
                              )}
                            </div>

                            {/* Order */}
                            <div className="text-sm text-gray-500 min-w-[60px]">
                              Orden: {column.order}
                            </div>

                            {/* Default Badge */}
                            {column.is_default && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Por defecto
                              </span>
                            )}

                            {/* Actions */}
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => setEditingColumn(column.id)}
                                className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              {!column.is_default && (
                                <button
                                  onClick={() => handleDeleteColumn(column.id)}
                                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>

        <div className="flex justify-between p-6 border-t border-gray-200">
          <button
            onClick={resetToDefault}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Restaurar por Defecto
          </button>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Cambios</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};