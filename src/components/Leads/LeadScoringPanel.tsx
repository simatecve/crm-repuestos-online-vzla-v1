import React, { useState, useEffect } from 'react';
import { 
  Target, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Save,
  X,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Settings,
  Eye,
  EyeOff,
  Download,
  RefreshCw
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useUserRole } from '../../hooks/useUserRole';
import toast from 'react-hot-toast';

interface ScoringRule {
  id: string;
  name: string;
  description: string | null;
  entity_type: 'contact' | 'lead';
  condition_field: string;
  condition_operator: string;
  condition_value: string | null;
  points: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ScoringHistory {
  id: string;
  entity_id: string;
  entity_type: 'contact' | 'lead';
  rule_id: string | null;
  points: number;
  reason: string | null;
  created_at: string;
  rule_name?: string;
}

interface EntityWithScore {
  id: string;
  name: string;
  email: string;
  score: number;
  entity_type: 'contact' | 'lead';
  last_scored?: string;
}

export const LeadScoringPanel: React.FC = () => {
  const { canEdit, canCreate, canDelete, loading: roleLoading } = useUserRole();
  const [scoringRules, setScoringRules] = useState<ScoringRule[]>([]);
  const [scoringHistory, setScoringHistory] = useState<ScoringHistory[]>([]);
  const [topScoredEntities, setTopScoredEntities] = useState<EntityWithScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntityType, setSelectedEntityType] = useState<string>('');
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [editingRule, setEditingRule] = useState<ScoringRule | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<Partial<ScoringRule>>({
    name: '',
    description: '',
    entity_type: 'lead',
    condition_field: '',
    condition_operator: 'equals',
    condition_value: '',
    points: 10,
    is_active: true
  });

  // Available fields for conditions
  const availableFields = {
    contact: [
      { value: 'email', label: 'Email' },
      { value: 'phone', label: 'Teléfono' },
      { value: 'segment', label: 'Segmento' },
      { value: 'status', label: 'Estado' },
      { value: 'tags', label: 'Etiquetas' },
      { value: 'custom_fields.industry', label: 'Industria (Campo personalizado)' },
      { value: 'custom_fields.website', label: 'Sitio Web (Campo personalizado)' },
      { value: 'behavior_data.email_opens', label: 'Emails abiertos' },
      { value: 'behavior_data.email_clicks', label: 'Clicks en emails' },
      { value: 'behavior_data.website_visits', label: 'Visitas al sitio web' }
    ],
    lead: [
      { value: 'email', label: 'Email' },
      { value: 'phone', label: 'Teléfono' },
      { value: 'company', label: 'Empresa' },
      { value: 'value', label: 'Valor estimado' },
      { value: 'stage', label: 'Etapa' },
      { value: 'priority', label: 'Prioridad' },
      { value: 'assigned_to', label: 'Asignado a' },
      { value: 'custom_fields.budget', label: 'Presupuesto (Campo personalizado)' },
      { value: 'custom_fields.decision_maker', label: 'Tomador de decisiones (Campo personalizado)' },
      { value: 'behavior_data.proposal_viewed', label: 'Propuesta vista' },
      { value: 'behavior_data.meeting_attended', label: 'Asistió a reunión' }
    ]
  };

  const operators = [
    { value: 'equals', label: 'Es igual a' },
    { value: 'not_equals', label: 'No es igual a' },
    { value: 'contains', label: 'Contiene' },
    { value: 'not_contains', label: 'No contiene' },
    { value: 'greater_than', label: 'Mayor que' },
    { value: 'less_than', label: 'Menor que' },
    { value: 'is_empty', label: 'Está vacío' },
    { value: 'is_not_empty', label: 'No está vacío' }
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchScoringRules(),
        fetchScoringHistory(),
        fetchTopScoredEntities()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const fetchScoringRules = async () => {
    const { data, error } = await supabase
      .from('scoring_rules')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    setScoringRules(data || []);
  };

  const fetchScoringHistory = async () => {
    const { data, error } = await supabase
      .from('scoring_history')
      .select(`
        *,
        scoring_rules (name)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    
    // Format the data to include rule_name
    const formattedData = data?.map(item => ({
      ...item,
      rule_name: item.scoring_rules?.name || 'Ajuste manual'
    })) || [];
    
    setScoringHistory(formattedData);
  };

  const fetchTopScoredEntities = async () => {
    // Fetch top scored contacts
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('id, name, email, score')
      .order('score', { ascending: false })
      .gt('score', 0)
      .limit(10);

    if (contactsError) throw contactsError;

    // Fetch top scored leads
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, name, email, score')
      .order('score', { ascending: false })
      .gt('score', 0)
      .limit(10);

    if (leadsError) throw leadsError;

    // Combine and sort
    const combinedEntities = [
      ...(contacts || []).map(c => ({ ...c, entity_type: 'contact' as const })),
      ...(leads || []).map(l => ({ ...l, entity_type: 'lead' as const }))
    ].sort((a, b) => b.score - a.score).slice(0, 10);

    setTopScoredEntities(combinedEntities);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
    toast.success('Datos actualizados');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.condition_field || !formData.points) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    try {
      if (editingRule?.id) {
        // Update existing rule
        const { error } = await supabase
          .from('scoring_rules')
          .update(formData)
          .eq('id', editingRule.id);

        if (error) throw error;
        toast.success('Regla actualizada correctamente');
      } else {
        // Create new rule
        const { error } = await supabase
          .from('scoring_rules')
          .insert([formData]);

        if (error) throw error;
        toast.success('Regla creada correctamente');
      }

      setShowRuleForm(false);
      setEditingRule(null);
      setFormData({
        name: '',
        description: '',
        entity_type: 'lead',
        condition_field: '',
        condition_operator: 'equals',
        condition_value: '',
        points: 10,
        is_active: true
      });
      fetchScoringRules();
    } catch (error) {
      console.error('Error saving rule:', error);
      toast.error('Error al guardar la regla');
    }
  };

  const handleToggleRuleStatus = async (ruleId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('scoring_rules')
        .update({ is_active: !currentStatus })
        .eq('id', ruleId);

      if (error) throw error;

      setScoringRules(prev => 
        prev.map(rule => 
          rule.id === ruleId 
            ? { ...rule, is_active: !currentStatus }
            : rule
        )
      );

      toast.success(`Regla ${!currentStatus ? 'activada' : 'desactivada'} correctamente`);
    } catch (error) {
      console.error('Error updating rule status:', error);
      toast.error('Error al actualizar el estado de la regla');
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta regla? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('scoring_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;

      setScoringRules(prev => prev.filter(rule => rule.id !== ruleId));
      toast.success('Regla eliminada correctamente');
    } catch (error) {
      console.error('Error deleting rule:', error);
      toast.error('Error al eliminar la regla');
    }
  };

  const handleEditRule = (rule: ScoringRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      description: rule.description,
      entity_type: rule.entity_type,
      condition_field: rule.condition_field,
      condition_operator: rule.condition_operator,
      condition_value: rule.condition_value,
      points: rule.points,
      is_active: rule.is_active
    });
    setShowRuleForm(true);
  };

  const exportRules = () => {
    const csvContent = [
      ['Nombre', 'Descripción', 'Tipo', 'Campo', 'Operador', 'Valor', 'Puntos', 'Estado'],
      ...scoringRules.map(rule => [
        rule.name,
        rule.description || '',
        rule.entity_type,
        rule.condition_field,
        rule.condition_operator,
        rule.condition_value || '',
        rule.points.toString(),
        rule.is_active ? 'Activo' : 'Inactivo'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reglas_puntuacion.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredRules = scoringRules.filter(rule => {
    const matchesSearch = 
      rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rule.description && rule.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesEntityType = !selectedEntityType || rule.entity_type === selectedEntityType;
    
    return matchesSearch && matchesEntityType;
  });

  const getOperatorText = (operator: string) => {
    const op = operators.find(o => o.value === operator);
    return op ? op.label : operator;
  };

  const getFieldLabel = (field: string, entityType: 'contact' | 'lead') => {
    const fieldObj = availableFields[entityType].find(f => f.value === field);
    return fieldObj ? fieldObj.label : field;
  };

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
          <h2 className="text-2xl font-bold text-gray-900">Puntuación de Leads</h2>
          <p className="text-gray-600 mt-1">
            Configura reglas para puntuar automáticamente tus leads y contactos
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
            onClick={exportRules}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center space-x-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Exportar</span>
          </button>
          <button 
            onClick={() => {
              setEditingRule(null);
              setFormData({
                name: '',
                description: '',
                entity_type: 'lead',
                condition_field: '',
                condition_operator: 'equals',
                condition_value: '',
                points: 10,
                is_active: true
              });
              setShowRuleForm(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Regla</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Reglas</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{scoringRules.length}</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-500">
              <Target className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Reglas Activas</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {scoringRules.filter(r => r.is_active).length}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-green-500">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Puntuaciones Aplicadas</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">
                {scoringHistory.length}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-purple-500">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Puntuación Promedio</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">
                {topScoredEntities.length > 0 
                  ? Math.round(topScoredEntities.reduce((sum, entity) => sum + entity.score, 0) / topScoredEntities.length)
                  : 0}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-orange-500">
              <Target className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reglas de Puntuación */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Reglas de Puntuación
              </h3>
              <div className="flex space-x-2">
                <select
                  value={selectedEntityType}
                  onChange={(e) => setSelectedEntityType(e.target.value)}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Todos los tipos</option>
                  <option value="lead">Leads</option>
                  <option value="contact">Contactos</option>
                </select>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar reglas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Lista de Reglas */}
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {filteredRules.length > 0 ? (
                filteredRules.map((rule) => (
                  <div 
                    key={rule.id} 
                    className={`border rounded-lg p-4 ${rule.is_active ? 'border-gray-200' : 'border-gray-200 bg-gray-50'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-gray-900">{rule.name}</h4>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            rule.entity_type === 'lead' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {rule.entity_type === 'lead' ? 'Lead' : 'Contacto'}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            rule.points > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {rule.points > 0 ? '+' : ''}{rule.points} puntos
                          </span>
                        </div>
                        {rule.description && (
                          <p className="text-sm text-gray-600 mt-1">{rule.description}</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleToggleRuleStatus(rule.id, rule.is_active)}
                          className={`p-1 rounded hover:bg-gray-100 ${
                            rule.is_active ? 'text-green-600' : 'text-gray-400'
                          }`}
                          title={rule.is_active ? 'Desactivar' : 'Activar'}
                        >
                          {rule.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleEditRule(rule)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="font-medium">Condición:</span>
                        <span className="ml-2">
                          {getFieldLabel(rule.condition_field, rule.entity_type)} {getOperatorText(rule.condition_operator)} {rule.condition_value || ''}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Target className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No hay reglas</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm || selectedEntityType 
                      ? 'No se encontraron reglas con los filtros aplicados.' 
                      : 'Comienza creando tu primera regla de puntuación.'}
                  </p>
                  {!searchTerm && !selectedEntityType && (
                    <button
                      onClick={() => {
                        setEditingRule(null);
                        setFormData({
                          name: '',
                          description: '',
                          entity_type: 'lead',
                          condition_field: '',
                          condition_operator: 'equals',
                          condition_value: '',
                          points: 10,
                          is_active: true
                        });
                        setShowRuleForm(true);
                      }}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center space-x-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Nueva Regla</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Panel Lateral */}
        <div className="space-y-6">
          {/* Top Scored Entities */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Top Puntuaciones</h3>
            </div>
            <div className="p-4">
              {topScoredEntities.length > 0 ? (
                <div className="space-y-3">
                  {topScoredEntities.map((entity) => (
                    <div key={entity.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">{entity.name}</div>
                        <div className="text-sm text-gray-500">{entity.email}</div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          entity.entity_type === 'lead' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {entity.entity_type === 'lead' ? 'Lead' : 'Contacto'}
                        </span>
                        <span className="font-bold text-green-600">{entity.score}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">No hay entidades puntuadas</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Scoring History */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Historial Reciente</h3>
            </div>
            <div className="p-4">
              {scoringHistory.length > 0 ? (
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {scoringHistory.slice(0, 10).map((entry) => (
                    <div key={entry.id} className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded-lg">
                      <div className={`p-2 rounded-full ${
                        entry.points > 0 ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        {entry.points > 0 ? (
                          <ArrowUp className={`w-4 h-4 text-green-600`} />
                        ) : (
                          <ArrowDown className={`w-4 h-4 text-red-600`} />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-gray-900">{entry.rule_name}</div>
                          <span className={`font-bold ${
                            entry.points > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {entry.points > 0 ? '+' : ''}{entry.points}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">
                          {entry.entity_type === 'lead' ? 'Lead' : 'Contacto'} • {new Date(entry.created_at).toLocaleDateString()}
                        </div>
                        {entry.reason && (
                          <div className="text-xs text-gray-500 mt-1">{entry.reason}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">No hay historial de puntuación</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {showRuleForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingRule ? 'Editar Regla de Puntuación' : 'Nueva Regla de Puntuación'}
              </h2>
              <button
                onClick={() => {
                  setShowRuleForm(false);
                  setEditingRule(null);
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
                    Nombre de la Regla *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: Email corporativo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Entidad *
                  </label>
                  <select
                    value={formData.entity_type}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      entity_type: e.target.value as 'lead' | 'contact',
                      condition_field: '' // Reset field when entity type changes
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="lead">Lead</option>
                    <option value="contact">Contacto</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción
                  </label>
                  <textarea
                    rows={2}
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Descripción de la regla (opcional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Campo *
                  </label>
                  <select
                    required
                    value={formData.condition_field}
                    onChange={(e) => setFormData({ ...formData, condition_field: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar campo</option>
                    {formData.entity_type && availableFields[formData.entity_type].map((field) => (
                      <option key={field.value} value={field.value}>
                        {field.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Operador *
                  </label>
                  <select
                    required
                    value={formData.condition_operator}
                    onChange={(e) => setFormData({ ...formData, condition_operator: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {operators.map((op) => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </select>
                </div>

                {formData.condition_operator !== 'is_empty' && formData.condition_operator !== 'is_not_empty' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Valor *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.condition_value || ''}
                      onChange={(e) => setFormData({ ...formData, condition_value: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Valor para comparar"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Para múltiples valores, sepáralos con comas (ej: valor1,valor2,valor3)
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Puntos *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.points}
                    onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="10"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Usa números positivos para sumar puntos y negativos para restar
                  </p>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                    Regla activa
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowRuleForm(false);
                    setEditingRule(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingRule ? 'Actualizar' : 'Crear'} Regla</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};