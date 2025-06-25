import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { 
  Plus, 
  MoreVertical, 
  User, 
  Phone, 
  Mail, 
  Building, 
  Calendar,
  DollarSign,
  Edit,
  Trash2,
  Eye,
  Filter,
  Search,
  Download,
  Target,
  TrendingUp,
  Settings,
  X,
  Save,
  List
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useUserRole } from '../../hooks/useUserRole';
import { LeadForm } from '../Forms/LeadForm';
import { LeadDetailsModal } from '../Modals/LeadDetailsModal';
import { BulkLeadActionsModal } from '../Modals/BulkLeadActionsModal';
import { ColumnManagementModal } from '../Modals/ColumnManagementModal';
import { CustomFieldsManager } from './CustomFieldsManager';
import { LeadScoringPanel } from './LeadScoringPanel';
import toast from 'react-hot-toast';

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  company: string;
  value: number;
  stage: string;
  priority: 'low' | 'medium' | 'high';
  assigned_to: string | null;
  notes: string;
  created_at: string;
  custom_fields?: Record<string, any>;
  score?: number;
}

interface Column {
  id: string;
  title: string;
  leads: Lead[];
  color: string;
  order: number;
  is_default: boolean;
}

const defaultColumns: Omit<Column, 'leads'>[] = [
  { id: 'nuevo', title: 'Nuevos Leads', color: 'bg-gray-500', order: 1, is_default: true },
  { id: 'contactado', title: 'Contactados', color: 'bg-blue-500', order: 2, is_default: true },
  { id: 'calificado', title: 'Calificados', color: 'bg-orange-500', order: 3, is_default: true },
  { id: 'propuesta', title: 'Propuesta', color: 'bg-purple-500', order: 4, is_default: true },
  { id: 'negociacion', title: 'Negociación', color: 'bg-yellow-500', order: 5, is_default: true },
  { id: 'cerrado_ganado', title: 'Cerrados Ganados', color: 'bg-green-500', order: 6, is_default: true },
  { id: 'cerrado_perdido', title: 'Cerrados Perdidos', color: 'bg-red-500', order: 7, is_default: true }
];

export const KanbanBoard: React.FC = () => {
  const { canEdit, canCreate, canDelete, isAdmin, loading: roleLoading } = useUserRole();
  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<string>('');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [showLeadDetails, setShowLeadDetails] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showColumnManagement, setShowColumnManagement] = useState(false);
  const [showCustomFieldsManager, setShowCustomFieldsManager] = useState(false);
  const [showLeadScoringPanel, setShowLeadScoringPanel] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [selectedLeadForDetails, setSelectedLeadForDetails] = useState<Lead | null>(null);

  useEffect(() => {
    initializeColumns();
    fetchLeads();
  }, []);

  const initializeColumns = async () => {
    try {
      // Check if columns exist in localStorage
      const savedColumns = localStorage.getItem('kanban-columns');
      if (savedColumns) {
        const parsedColumns = JSON.parse(savedColumns);
        setColumns(parsedColumns.map((col: any) => ({ ...col, leads: [] })));
      } else {
        // Initialize with default columns
        const initialColumns = defaultColumns.map(col => ({ ...col, leads: [] }));
        setColumns(initialColumns);
        localStorage.setItem('kanban-columns', JSON.stringify(defaultColumns));
      }
    } catch (error) {
      console.error('Error initializing columns:', error);
      const initialColumns = defaultColumns.map(col => ({ ...col, leads: [] }));
      setColumns(initialColumns);
    }
  };

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get current columns structure
      const savedColumns = localStorage.getItem('kanban-columns');
      const columnStructure = savedColumns ? JSON.parse(savedColumns) : defaultColumns;

      // Organize leads by stage
      const updatedColumns = columnStructure.map((column: any) => ({
        ...column,
        leads: data?.filter(lead => lead.stage === column.id) || []
      }));

      setColumns(updatedColumns);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast.error('Error al cargar los leads');
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!canEdit) {
      toast.error('No tienes permisos para mover leads');
      return;
    }

    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from('leads')
        .update({ 
          stage: destination.droppableId,
          updated_at: new Date().toISOString()
        })
        .eq('id', draggableId);

      if (error) throw error;

      // Update local state
      const newColumns = [...columns];
      const sourceColumn = newColumns.find(col => col.id === source.droppableId);
      const destColumn = newColumns.find(col => col.id === destination.droppableId);

      if (sourceColumn && destColumn) {
        const [movedLead] = sourceColumn.leads.splice(source.index, 1);
        movedLead.stage = destination.droppableId;
        destColumn.leads.splice(destination.index, 0, movedLead);
        setColumns(newColumns);
      }

      toast.success('Lead movido correctamente');
    } catch (error) {
      console.error('Error updating lead:', error);
      toast.error('Error al mover el lead');
    }
  };

  const handleColumnsUpdate = (newColumns: Omit<Column, 'leads'>[]) => {
    // Save to localStorage
    localStorage.setItem('kanban-columns', JSON.stringify(newColumns));
    
    // Update state with leads
    const updatedColumns = newColumns.map(col => {
      const existingColumn = columns.find(existing => existing.id === col.id);
      return {
        ...col,
        leads: existingColumn ? existingColumn.leads : []
      };
    });
    
    setColumns(updatedColumns);
    
    // Refresh leads to ensure consistency
    fetchLeads();
  };

  const getPriorityColor = (priority: Lead['priority']) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityText = (priority: Lead['priority']) => {
    switch (priority) {
      case 'high': return 'Alta';
      case 'medium': return 'Media';
      case 'low': return 'Baja';
      default: return priority;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('es-ES');
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!canDelete) {
      toast.error('No tienes permisos para eliminar leads');
      return;
    }

    if (!confirm('¿Estás seguro de que quieres eliminar este lead?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId);

      if (error) throw error;

      toast.success('Lead eliminado correctamente');
      fetchLeads();
    } catch (error) {
      console.error('Error deleting lead:', error);
      toast.error('Error al eliminar el lead');
    }
  };

  const getTotalValue = (leads: Lead[]) => {
    return leads.reduce((sum, lead) => sum + lead.value, 0);
  };

  const handleViewLead = (lead: Lead) => {
    setSelectedLeadForDetails(lead);
    setShowLeadDetails(true);
  };

  const handleSelectLead = (leadId: string) => {
    setSelectedLeads(prev => 
      prev.includes(leadId) 
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  };

  const handleEditLead = (lead: Lead) => {
    setEditingLead(lead);
    setShowLeadForm(true);
  };

  const handleCloseForm = () => {
    setShowLeadForm(false);
    setEditingLead(null);
  };

  const exportLeads = () => {
    const allLeads = columns.flatMap(col => col.leads);
    const csvContent = [
      ['Nombre', 'Email', 'Teléfono', 'Empresa', 'Valor', 'Etapa', 'Prioridad', 'Asignado a'],
      ...allLeads.map(lead => [
        lead.name,
        lead.email || '',
        lead.phone,
        lead.company,
        lead.value,
        lead.stage,
        lead.priority,
        lead.assigned_to || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leads.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredColumns = columns.map(column => ({
    ...column,
    leads: column.leads.filter(lead => {
      const matchesSearch = 
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.company.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesPriority = !selectedPriority || lead.priority === selectedPriority;
      const matchesAssignee = !selectedAssignee || lead.assigned_to === selectedAssignee;
      
      return matchesSearch && matchesPriority && matchesAssignee;
    })
  }));

  // Show Custom Fields Manager
  if (showCustomFieldsManager) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowCustomFieldsManager(false)}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
          >
            <X className="w-4 h-4" />
            <span>Volver a Leads</span>
          </button>
        </div>
        <CustomFieldsManager />
      </div>
    );
  }

  // Show Lead Scoring Panel
  if (showLeadScoringPanel) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowLeadScoringPanel(false)}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
          >
            <X className="w-4 h-4" />
            <span>Volver a Leads</span>
          </button>
        </div>
        <LeadScoringPanel />
      </div>
    );
  }

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
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Leads</h2>
          <p className="text-gray-600 mt-1">Seguimiento visual de tu pipeline de ventas</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={() => setShowLeadScoringPanel(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center space-x-2 transition-colors"
          >
            <Target className="w-4 h-4" />
            <span>Puntuación de Leads</span>
          </button>
          <button 
            onClick={() => setShowCustomFieldsManager(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center space-x-2 transition-colors"
          >
            <List className="w-4 h-4" />
            <span>Campos Personalizados</span>
          </button>
          <button 
            onClick={exportLeads}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center space-x-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Exportar</span>
          </button>
          {isAdmin && (
            <button 
              onClick={() => setShowColumnManagement(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center space-x-2 transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>Gestionar Columnas</span>
            </button>
          )}
          {selectedLeads.length > 0 && (
            <button 
              onClick={() => setShowBulkActions(true)}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 flex items-center space-x-2 transition-colors"
            >
              <Target className="w-4 h-4" />
              <span>Acciones ({selectedLeads.length})</span>
            </button>
          )}
          <button 
            onClick={() => setShowLeadForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Lead</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Leads</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {columns.reduce((sum, col) => sum + col.leads.length, 0)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-blue-500">
              <User className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Valor Total Pipeline</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {formatCurrency(columns.reduce((sum, col) => sum + getTotalValue(col.leads), 0))}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-green-500">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Cerrados Ganados</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {columns.find(col => col.id === 'cerrado_ganado')?.leads.length || 0}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-green-500">
              <Target className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tasa de Conversión</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">
                {columns.reduce((sum, col) => sum + col.leads.length, 0) > 0 
                  ? Math.round(((columns.find(col => col.id === 'cerrado_ganado')?.leads.length || 0) / 
                      columns.reduce((sum, col) => sum + col.leads.length, 0)) * 100)
                  : 0}%
              </p>
            </div>
            <div className="p-3 rounded-lg bg-purple-500">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todas las prioridades</option>
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Baja</option>
          </select>

          <select
            value={selectedAssignee}
            onChange={(e) => setSelectedAssignee(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todos los asignados</option>
            <option value="Juan Pérez">Juan Pérez</option>
            <option value="María García">María García</option>
            <option value="Carlos López">Carlos López</option>
          </select>

          <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 flex items-center space-x-2 transition-colors">
            <Filter className="w-4 h-4" />
            <span>Más Filtros</span>
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex space-x-6 overflow-x-auto pb-4">
          {filteredColumns
            .sort((a, b) => a.order - b.order)
            .map((column) => (
            <div key={column.id} className="flex-shrink-0 w-80">
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`bg-white rounded-lg shadow-sm border border-gray-200 ${
                      snapshot.isDraggingOver ? 'bg-blue-50' : ''
                    }`}
                  >
                    {/* Column Header */}
                    <div className="p-4 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${column.color}`} />
                          <h3 className="font-semibold text-gray-900">{column.title}</h3>
                          <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-medium">
                            {column.leads.length}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 font-medium">
                          {formatCurrency(getTotalValue(column.leads))}
                        </div>
                      </div>
                    </div>

                    {/* Cards */}
                    <div className="p-4 space-y-3 min-h-[400px]">
                      {column.leads.map((lead, index) => (
                        <Draggable key={lead.id} draggableId={lead.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${
                                snapshot.isDragging ? 'shadow-lg' : ''
                              } ${selectedLeads.includes(lead.id) ? 'ring-2 ring-blue-500' : ''}`}
                            >
                              {/* Selection Checkbox */}
                              <div className="flex items-center justify-between mb-3">
                                <input
                                  type="checkbox"
                                  checked={selectedLeads.includes(lead.id)}
                                  onChange={() => handleSelectLead(lead.id)}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <div className="flex items-center space-x-1">
                                  <span className="text-sm font-semibold text-green-600">
                                    {formatCurrency(lead.value)}
                                  </span>
                                  <div className="relative">
                                    <button className="p-1 hover:bg-gray-100 rounded">
                                      <MoreVertical className="w-4 h-4 text-gray-400" />
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Priority Badge and Score */}
                              <div className="flex justify-between mb-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(lead.priority)}`}>
                                  {getPriorityText(lead.priority)}
                                </span>
                                {lead.score !== undefined && lead.score > 0 && (
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                    {lead.score} puntos
                                  </span>
                                )}
                              </div>

                              {/* Lead Info */}
                              <div className="space-y-2">
                                <h4 className="font-semibold text-gray-900">
                                  {lead.name}
                                </h4>
                                
                                {lead.email && (
                                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                                    <Mail className="w-3 h-3" />
                                    <span className="truncate">{lead.email}</span>
                                  </div>
                                )}
                                
                                {lead.phone && (
                                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                                    <Phone className="w-3 h-3" />
                                    <span>{lead.phone}</span>
                                  </div>
                                )}
                                
                                {lead.company && (
                                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                                    <Building className="w-3 h-3" />
                                    <span className="truncate">{lead.company}</span>
                                  </div>
                                )}
                              </div>

                              {/* Custom Fields */}
                              {lead.custom_fields && Object.keys(lead.custom_fields).length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                  <div className="flex flex-wrap gap-1">
                                    {Object.entries(lead.custom_fields).slice(0, 2).map(([key, value], index) => (
                                      <span 
                                        key={index}
                                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                                      >
                                        {key}: {value?.toString().substring(0, 10)}{value?.toString().length > 10 ? '...' : ''}
                                      </span>
                                    ))}
                                    {Object.keys(lead.custom_fields).length > 2 && (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                        +{Object.keys(lead.custom_fields).length - 2}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Assigned User */}
                              <div className="mt-3 pt-3 border-t border-gray-100">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <User className="w-3 h-3 text-gray-500" />
                                    <span className="text-xs text-gray-600">
                                      {lead.assigned_to || 'Sin asignar'}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleViewLead(lead);
                                      }}
                                      className="p-1 hover:bg-gray-100 rounded text-blue-600"
                                    >
                                      <Eye className="w-3 h-3" />
                                    </button>
                                    {canEdit && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEditLead(lead);
                                        }}
                                        className="p-1 hover:bg-gray-100 rounded text-blue-600"
                                      >
                                        <Edit className="w-3 h-3" />
                                      </button>
                                    )}
                                    {canDelete && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteLead(lead.id);
                                        }}
                                        className="p-1 hover:bg-gray-100 rounded text-red-600"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}

                      {/* Add Lead Button */}
                      <button 
                        onClick={() => setShowLeadForm(true)}
                        className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <Plus className="w-5 h-5 mx-auto mb-2" />
                        <span className="text-sm font-medium">Agregar Lead</span>
                      </button>
                    </div>
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      {/* Modals */}
      <LeadForm
        lead={editingLead}
        isOpen={showLeadForm}
        onClose={handleCloseForm}
        onSave={fetchLeads}
      />

      <LeadDetailsModal
        lead={selectedLeadForDetails}
        isOpen={showLeadDetails}
        onClose={() => setShowLeadDetails(false)}
      />

      <BulkLeadActionsModal
        selectedLeads={selectedLeads}
        isOpen={showBulkActions}
        onClose={() => setShowBulkActions(false)}
        onComplete={() => {
          setSelectedLeads([]);
          fetchLeads();
        }}
      />

      <ColumnManagementModal
        columns={columns.map(col => ({ 
          id: col.id, 
          title: col.title, 
          color: col.color, 
          order: col.order, 
          is_default: col.is_default 
        }))}
        isOpen={showColumnManagement}
        onClose={() => setShowColumnManagement(false)}
        onSave={handleColumnsUpdate}
      />
    </div>
  );
};