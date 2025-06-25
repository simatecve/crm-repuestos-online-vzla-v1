import React, { useState, useEffect } from 'react';
import { X, Search, Brain, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface AIAgent {
  id: string;
  name: string;
  prompt: string;
  instance_id: string | null;
  instance_name: string | null;
  is_active: boolean;
}

interface AgentSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  onAgentAssigned: () => void;
}

export const AgentSelector: React.FC<AgentSelectorProps> = ({
  isOpen,
  onClose,
  conversationId,
  onAgentAssigned
}) => {
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchAgents();
    }
  }, [isOpen]);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ai_agents')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
      toast.error('Error al cargar los agentes');
    } finally {
      setLoading(false);
    }
  };

  const assignAgent = async (agentId: string) => {
    try {
      setAssigning(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user authenticated');

      // Call the RPC function with the correct parameter names
      const { error } = await supabase.rpc('assign_conversation', {
        agent_id_param: agentId,
        conversation_id_param: conversationId,
        user_id_param: user.id
      });

      if (error) throw error;

      toast.success('Agente asignado correctamente');
      onAgentAssigned();
      onClose();
    } catch (error) {
      console.error('Error assigning agent:', error);
      toast.error('Error al asignar el agente');
    } finally {
      setAssigning(false);
    }
  };

  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Asignar Agente IA</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Search */}
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

          {/* Agents List */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredAgents.length > 0 ? (
            <div className="space-y-4">
              {filteredAgents.map((agent) => (
                <div 
                  key={agent.id} 
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
                        <Brain className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{agent.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {agent.instance_name ? `Instancia: ${agent.instance_name}` : 'Sin instancia asignada'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => assignAgent(agent.id)}
                      disabled={assigning}
                      className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay agentes disponibles</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm 
                  ? 'No se encontraron agentes con ese término de búsqueda.' 
                  : 'No hay agentes activos configurados en el sistema.'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};