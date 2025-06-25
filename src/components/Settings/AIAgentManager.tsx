import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Plus, 
  Search, 
  RefreshCw, 
  Smartphone,
  Trash2,
  Save,
  X,
  AlertTriangle,
  Check,
  Edit,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useUserRole } from '../../hooks/useUserRole';
import toast from 'react-hot-toast';

interface AIAgent {
  id: string;
  name: string;
  prompt: string;
  instance_id: string;
  instance_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface WhatsAppInstance {
  id: string;
  name: string;
  color: string;
  status: 'connected' | 'disconnected' | 'connecting';
}

export const AIAgentManager: React.FC = () => {
  const { canEdit, canCreate, canDelete, loading: roleLoading } = useUserRole();
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'agents' | 'new' | 'edit'>('agents');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form state
  const [formData, setFormData] = useState<{
    id?: string;
    name: string;
    prompt: string;
    instance_id: string;
    instance_name: string;
    is_active: boolean;
  }>({
    name: '',
    prompt: '',
    instance_id: '',
    instance_name: '',
    is_active: true
  });
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchAgents(),
        fetchInstances()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_agents')
        .select(`
          *,
          whatsapp_instances(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Format the data to include instance_name
      const formattedData = data?.map(agent => ({
        ...agent,
        instance_name: agent.instance_name || agent.whatsapp_instances?.name || 'Desconocida'
      })) || [];
      
      setAgents(formattedData);
    } catch (error) {
      console.error('Error fetching agents:', error);
      throw error;
    }
  };

  const fetchInstances = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .eq('status', 'connected')
        .order('name');

      if (error) throw error;
      setInstances(data || []);
      
      // Set default instance if available and creating new agent
      if (data && data.length > 0 && !formData.id) {
        setFormData(prev => ({
          ...prev,
          instance_id: data[0].id,
          instance_name: data[0].name
        }));
      }
    } catch (error) {
      console.error('Error fetching instances:', error);
      throw error;
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
    toast.success('Datos actualizados');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.prompt.trim() || !formData.instance_id) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    try {
      setSaving(true);

      // Find the selected instance to get its name
      const selectedInstance = instances.find(instance => instance.id === formData.instance_id);
      const instanceName = selectedInstance?.name || '';

      if (formData.id) {
        // Update existing agent
        const { error } = await supabase
          .from('ai_agents')
          .update({
            name: formData.name.trim(),
            prompt: formData.prompt.trim(),
            instance_id: formData.instance_id,
            instance_name: instanceName,
            is_active: formData.is_active
          })
          .eq('id', formData.id);

        if (error) throw error;
        toast.success('Agente actualizado correctamente');
      } else {
        // Create new agent
        const { error } = await supabase
          .from('ai_agents')
          .insert([{
            name: formData.name.trim(),
            prompt: formData.prompt.trim(),
            instance_id: formData.instance_id,
            instance_name: instanceName,
            is_active: formData.is_active
          }]);

        if (error) throw error;
        toast.success('Agente creado correctamente');
      }

      // Reset form and go back to list
      setFormData({
        name: '',
        prompt: '',
        instance_id: instances.length > 0 ? instances[0].id : '',
        instance_name: instances.length > 0 ? instances[0].name : '',
        is_active: true
      });
      setActiveTab('agents');
      fetchAgents();
    } catch (error) {
      console.error('Error saving agent:', error);
      toast.error('Error al guardar el agente');
    } finally {
      setSaving(false);
    }
  };

  const handleEditAgent = (agent: AIAgent) => {
    setFormData({
      id: agent.id,
      name: agent.name,
      prompt: agent.prompt,
      instance_id: agent.instance_id,
      instance_name: agent.instance_name,
      is_active: agent.is_active
    });
    setActiveTab('edit');
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este agente? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('ai_agents')
        .delete()
        .eq('id', agentId);

      if (error) throw error;

      toast.success('Agente eliminado correctamente');
      fetchAgents();
    } catch (error) {
      console.error('Error deleting agent:', error);
      toast.error('Error al eliminar el agente');
    }
  };

  const handleToggleStatus = async (agentId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('ai_agents')
        .update({ is_active: !currentStatus })
        .eq('id', agentId);

      if (error) throw error;

      setAgents(prev => 
        prev.map(agent => 
          agent.id === agentId 
            ? { ...agent, is_active: !currentStatus }
            : agent
        )
      );

      toast.success(`Agente ${!currentStatus ? 'activado' : 'desactivado'} correctamente`);
    } catch (error) {
      console.error('Error updating agent status:', error);
      toast.error('Error al actualizar el estado del agente');
    }
  };

  const handleInstanceChange = (instanceId: string) => {
    const selectedInstance = instances.find(instance => instance.id === instanceId);
    setFormData({
      ...formData,
      instance_id: instanceId,
      instance_name: selectedInstance?.name || ''
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.prompt.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h2 className="text-2xl font-bold text-gray-900">Agentes de IA</h2>
          <p className="text-gray-600 mt-1">
            Gestiona tus agentes de inteligencia artificial para WhatsApp
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
              setFormData({
                name: '',
                prompt: '',
                instance_id: instances.length > 0 ? instances[0].id : '',
                instance_name: instances.length > 0 ? instances[0].name : '',
                is_active: true
              });
              setActiveTab('new');
            }}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Agente</span>
          </button>
        </div>
      </div>

      {/* Warning if no instances available */}
      {instances.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">
                No hay instancias conectadas
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                Necesitas al menos una instancia de WhatsApp conectada para crear un agente de IA.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('agents')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'agents'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Mis Agentes
            </button>
            <button
              onClick={() => {
                setFormData({
                  name: '',
                  prompt: '',
                  instance_id: instances.length > 0 ? instances[0].id : '',
                  instance_name: instances.length > 0 ? instances[0].name : '',
                  is_active: true
                });
                setActiveTab('new');
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'new'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Nuevo Agente
            </button>
            {activeTab === 'edit' && (
              <button
                className="py-4 px-1 border-b-2 border-blue-500 font-medium text-sm text-blue-600"
              >
                Editar Agente
              </button>
            )}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'agents' && (
            <div>
              {/* Search */}
              {agents.length > 0 && (
                <div className="mb-6">
                  <div className="relative">
                    <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar agentes..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}
              
              {filteredAgents.length > 0 ? (
                <div className="grid grid-cols-1 gap-6">
                  {filteredAgents.map((agent) => (
                    <div 
                      key={agent.id} 
                      className="border rounded-lg overflow-hidden"
                    >
                      <div className="p-6 bg-white">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-4">
                            <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
                              <Zap className="w-6 h-6" />
                            </div>
                            <div>
                              <h3 className="font-medium text-lg text-gray-900">{agent.name}</h3>
                              <p className="text-sm text-gray-500 mt-1">
                                Instancia: <span className="font-medium">{agent.instance_name}</span>
                              </p>
                              <div className="flex items-center mt-2">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  agent.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {agent.is_active ? 'Activo' : 'Inactivo'}
                                </span>
                                <span className="text-xs text-gray-500 ml-3">
                                  Creado: {formatDate(agent.created_at)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleToggleStatus(agent.id, agent.is_active)}
                              className={`p-1 rounded ${
                                agent.is_active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'
                              }`}
                              title={agent.is_active ? 'Desactivar' : 'Activar'}
                            >
                              {agent.is_active ? 
                                <ToggleRight className="w-6 h-6" /> : 
                                <ToggleLeft className="w-6 h-6" />
                              }
                            </button>
                            <button
                              onClick={() => handleEditAgent(agent)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                              title="Editar"
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteAgent(agent.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                              title="Eliminar"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                        
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Prompt:</h4>
                          <p className="text-sm text-gray-600 whitespace-pre-line">
                            {agent.prompt.length > 200 
                              ? `${agent.prompt.substring(0, 200)}...` 
                              : agent.prompt
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <Zap className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No hay agentes</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm 
                      ? 'No se encontraron agentes con ese término de búsqueda.' 
                      : 'Comienza creando tu primer agente de IA.'
                    }
                  </p>
                  {!searchTerm && (
                    <button
                      onClick={() => {
                        setFormData({
                          name: '',
                          prompt: '',
                          instance_id: instances.length > 0 ? instances[0].id : '',
                          instance_name: instances.length > 0 ? instances[0].name : '',
                          is_active: true
                        });
                        setActiveTab('new');
                      }}
                      className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 inline-flex items-center space-x-2"
                      disabled={instances.length === 0}
                    >
                      <Plus className="w-4 h-4" />
                      <span>Nuevo Agente</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {(activeTab === 'new' || activeTab === 'edit') && (
            <div className="max-w-3xl mx-auto">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="agent-name" className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre del Agente *
                  </label>
                  <input
                    type="text"
                    id="agent-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Asistente de Ventas"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="agent-prompt" className="block text-sm font-medium text-gray-700 mb-2">
                    Prompt *
                  </label>
                  <textarea
                    id="agent-prompt"
                    value={formData.prompt}
                    onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Eres un asistente de ventas amigable que ayuda a los clientes a encontrar los productos adecuados..."
                    rows={8}
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Define las instrucciones y personalidad del agente de IA
                  </p>
                </div>

                <div>
                  <label htmlFor="agent-instance" className="block text-sm font-medium text-gray-700 mb-2">
                    Instancia de WhatsApp *
                  </label>
                  <select
                    id="agent-instance"
                    value={formData.instance_id}
                    onChange={(e) => handleInstanceChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    {instances.length > 0 ? (
                      instances.map((instance) => (
                        <option key={instance.id} value={instance.id}>
                          {instance.name}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>No hay instancias conectadas disponibles</option>
                    )}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Selecciona la instancia de WhatsApp que usará este agente
                  </p>
                </div>

                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      formData.is_active ? 'bg-green-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.is_active ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className="ml-3 text-sm font-medium text-gray-900">
                    {formData.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setActiveTab('agents')}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !formData.name.trim() || !formData.prompt.trim() || !formData.instance_id || instances.length === 0}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2 transition-colors"
                  >
                    {saving ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>{formData.id ? 'Actualizar' : 'Crear'} Agente</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};