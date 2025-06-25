import React, { useState } from 'react';
import { X, Target, User, Tag, Trash2, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface BulkLeadActionsModalProps {
  selectedLeads: string[];
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const BulkLeadActionsModal: React.FC<BulkLeadActionsModalProps> = ({ 
  selectedLeads, 
  isOpen, 
  onClose, 
  onComplete 
}) => {
  const [action, setAction] = useState<'stage' | 'assign' | 'priority' | 'delete'>('stage');
  const [newStage, setNewStage] = useState('');
  const [newAssignee, setNewAssignee] = useState('');
  const [newPriority, setNewPriority] = useState('');
  const [loading, setLoading] = useState(false);

  const stages = [
    { id: 'nuevo', name: 'Nuevo' },
    { id: 'contactado', name: 'Contactado' },
    { id: 'calificado', name: 'Calificado' },
    { id: 'propuesta', name: 'Propuesta' },
    { id: 'negociacion', name: 'Negociación' },
    { id: 'cerrado_ganado', name: 'Cerrado Ganado' },
    { id: 'cerrado_perdido', name: 'Cerrado Perdido' }
  ];

  const assignees = [
    'Juan Pérez',
    'María García',
    'Carlos López',
    'Ana Martínez'
  ];

  const priorities = [
    { id: 'low', name: 'Baja' },
    { id: 'medium', name: 'Media' },
    { id: 'high', name: 'Alta' }
  ];

  const handleExecuteAction = async () => {
    if (selectedLeads.length === 0) return;

    try {
      setLoading(true);

      switch (action) {
        case 'stage':
          if (!newStage) {
            toast.error('Selecciona una etapa');
            return;
          }
          const { error: stageError } = await supabase
            .from('leads')
            .update({ stage: newStage })
            .in('id', selectedLeads);

          if (stageError) throw stageError;
          toast.success(`${selectedLeads.length} leads movidos a ${stages.find(s => s.id === newStage)?.name}`);
          break;

        case 'assign':
          if (!newAssignee) {
            toast.error('Selecciona un responsable');
            return;
          }
          const { error: assignError } = await supabase
            .from('leads')
            .update({ assigned_to: newAssignee })
            .in('id', selectedLeads);

          if (assignError) throw assignError;
          toast.success(`${selectedLeads.length} leads asignados a ${newAssignee}`);
          break;

        case 'priority':
          if (!newPriority) {
            toast.error('Selecciona una prioridad');
            return;
          }
          const { error: priorityError } = await supabase
            .from('leads')
            .update({ priority: newPriority })
            .in('id', selectedLeads);

          if (priorityError) throw priorityError;
          toast.success(`${selectedLeads.length} leads actualizados con prioridad ${priorities.find(p => p.id === newPriority)?.name}`);
          break;

        case 'delete':
          if (!confirm(`¿Estás seguro de que quieres eliminar ${selectedLeads.length} leads?`)) {
            return;
          }
          const { error: deleteError } = await supabase
            .from('leads')
            .delete()
            .in('id', selectedLeads);

          if (deleteError) throw deleteError;
          toast.success(`${selectedLeads.length} leads eliminados`);
          break;
      }

      onComplete();
      onClose();
    } catch (error) {
      console.error('Error executing bulk action:', error);
      toast.error('Error al ejecutar la acción');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Acciones Masivas</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Selected Count */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>{selectedLeads.length}</strong> leads seleccionados
            </p>
          </div>

          {/* Action Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Selecciona una acción:
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="action"
                  value="stage"
                  checked={action === 'stage'}
                  onChange={(e) => setAction(e.target.value as any)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-3 text-sm text-gray-900 flex items-center">
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Cambiar etapa
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="action"
                  value="assign"
                  checked={action === 'assign'}
                  onChange={(e) => setAction(e.target.value as any)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-3 text-sm text-gray-900 flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  Asignar responsable
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="action"
                  value="priority"
                  checked={action === 'priority'}
                  onChange={(e) => setAction(e.target.value as any)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-3 text-sm text-gray-900 flex items-center">
                  <Tag className="w-4 h-4 mr-2" />
                  Cambiar prioridad
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="action"
                  value="delete"
                  checked={action === 'delete'}
                  onChange={(e) => setAction(e.target.value as any)}
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                />
                <span className="ml-3 text-sm text-red-900 flex items-center">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar leads
                </span>
              </label>
            </div>
          </div>

          {/* Action-specific options */}
          {action === 'stage' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nueva etapa:
              </label>
              <select
                value={newStage}
                onChange={(e) => setNewStage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Seleccionar etapa</option>
                {stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {action === 'assign' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Asignar a:
              </label>
              <select
                value={newAssignee}
                onChange={(e) => setNewAssignee(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Seleccionar responsable</option>
                {assignees.map((assignee) => (
                  <option key={assignee} value={assignee}>
                    {assignee}
                  </option>
                ))}
              </select>
            </div>
          )}

          {action === 'priority' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nueva prioridad:
              </label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Seleccionar prioridad</option>
                {priorities.map((priority) => (
                  <option key={priority.id} value={priority.id}>
                    {priority.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {action === 'delete' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">
                <strong>¡Atención!</strong> Esta acción no se puede deshacer. 
                Se eliminarán permanentemente {selectedLeads.length} leads.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleExecuteAction}
            disabled={loading || (action !== 'delete' && !newStage && !newAssignee && !newPriority)}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
              action === 'delete' 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            } disabled:opacity-50`}
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Target className="w-4 h-4" />
            )}
            <span>Ejecutar Acción</span>
          </button>
        </div>
      </div>
    </div>
  );
};