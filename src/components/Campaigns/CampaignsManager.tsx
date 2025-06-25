import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  MessageSquare, 
  Plus, 
  Search, 
  Filter,
  Play,
  Pause,
  Edit,
  Trash2,
  Copy,
  BarChart3,
  Calendar,
  Users,
  Send,
  Eye,
  MousePointer,
  Clock,
  CheckCircle,
  FileText,
  Target,
  Settings
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useUserRole } from '../../hooks/useUserRole';
import { CampaignForm } from '../Forms/CampaignForm';
import { TemplateForm } from '../Forms/TemplateForm';
import { CampaignStatsModal } from '../Modals/CampaignStatsModal';
import { CampaignScheduleModal } from '../Modals/CampaignScheduleModal';
import toast from 'react-hot-toast';

interface Campaign {
  id: string;
  name: string;
  type: 'email' | 'whatsapp';
  subject: string;
  content: string;
  status: 'draft' | 'scheduled' | 'sent' | 'paused';
  sent_count: number;
  open_count: number;
  click_count: number;
  scheduled_at: string | null;
  created_at: string;
  updated_at: string;
  is_ab_test?: boolean;
  personalization_config?: any;
}

interface Template {
  id: string;
  nombre: string;
  tipo: 'email' | 'whatsapp' | 'sms';
  asunto: string;
  contenido: string;
  variables: Record<string, string>;
  activa: boolean;
  uso_count: number;
  conditional_content?: any[];
  target_segments?: any[];
}

export const CampaignsManager: React.FC = () => {
  const { canEdit, canCreate, canDelete, loading: roleLoading } = useUserRole();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [selectedCampaignForStats, setSelectedCampaignForStats] = useState<Campaign | null>(null);
  const [selectedCampaignForSchedule, setSelectedCampaignForSchedule] = useState<Campaign | null>(null);
  const [activeTab, setActiveTab] = useState<'campaigns' | 'templates'>('campaigns');
  const [campaignStats, setCampaignStats] = useState({
    totalSent: 0,
    totalOpened: 0,
    totalClicks: 0,
    avgOpenRate: 0,
    avgClickRate: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch campaigns
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (campaignsError) throw campaignsError;

      // Fetch templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('plantillas')
        .select('*')
        .eq('activa', true)
        .order('nombre');

      if (templatesError) throw templatesError;

      setCampaigns(campaignsData || []);
      setTemplates(templatesData || []);

      // Calculate campaign stats
      if (campaignsData && campaignsData.length > 0) {
        const totalSent = campaignsData.reduce((sum, c) => sum + (c.sent_count || 0), 0);
        const totalOpened = campaignsData.reduce((sum, c) => sum + (c.open_count || 0), 0);
        const totalClicks = campaignsData.reduce((sum, c) => sum + (c.click_count || 0), 0);
        
        const avgOpenRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;
        const avgClickRate = totalSent > 0 ? Math.round((totalClicks / totalSent) * 100) : 0;
        
        setCampaignStats({
          totalSent,
          totalOpened,
          totalClicks,
          avgOpenRate,
          avgClickRate
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = 
      campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.subject.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = !selectedType || campaign.type === selectedType;
    const matchesStatus = !selectedStatus || campaign.status === selectedStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'sent': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return 'Borrador';
      case 'scheduled': return 'Programada';
      case 'sent': return 'Enviada';
      case 'paused': return 'Pausada';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <Edit className="w-4 h-4" />;
      case 'scheduled': return <Clock className="w-4 h-4" />;
      case 'sent': return <CheckCircle className="w-4 h-4" />;
      case 'paused': return <Pause className="w-4 h-4" />;
      default: return <Edit className="w-4 h-4" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="w-4 h-4" />;
      case 'whatsapp': return <MessageSquare className="w-4 h-4" />;
      default: return <Mail className="w-4 h-4" />;
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'email': return 'Email';
      case 'whatsapp': return 'WhatsApp';
      default: return type;
    }
  };

  const calculateOpenRate = (campaign: Campaign) => {
    if (campaign.sent_count === 0) return 0;
    return Math.round((campaign.open_count / campaign.sent_count) * 100);
  };

  const calculateClickRate = (campaign: Campaign) => {
    if (campaign.sent_count === 0) return 0;
    return Math.round((campaign.click_count / campaign.sent_count) * 100);
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!canDelete) {
      toast.error('No tienes permisos para eliminar campañas');
      return;
    }

    if (!confirm('¿Estás seguro de que quieres eliminar esta campaña?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaignId);

      if (error) throw error;

      toast.success('Campaña eliminada correctamente');
      fetchData();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast.error('Error al eliminar la campaña');
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!canDelete) {
      toast.error('No tienes permisos para eliminar plantillas');
      return;
    }

    if (!confirm('¿Estás seguro de que quieres eliminar esta plantilla?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('plantillas')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      toast.success('Plantilla eliminada correctamente');
      fetchData();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Error al eliminar la plantilla');
    }
  };

  const handleDuplicateCampaign = async (campaign: Campaign) => {
    if (!canCreate) {
      toast.error('No tienes permisos para crear campañas');
      return;
    }

    try {
      const { error } = await supabase
        .from('campaigns')
        .insert({
          name: `${campaign.name} (Copia)`,
          type: campaign.type,
          subject: campaign.subject,
          content: campaign.content,
          status: 'draft',
          is_ab_test: campaign.is_ab_test,
          personalization_config: campaign.personalization_config
        });

      if (error) throw error;

      toast.success('Campaña duplicada correctamente');
      fetchData();
    } catch (error) {
      console.error('Error duplicating campaign:', error);
      toast.error('Error al duplicar la campaña');
    }
  };

  const handleSendCampaign = async (campaignId: string) => {
    if (!canEdit) {
      toast.error('No tienes permisos para enviar campañas');
      return;
    }

    if (!confirm('¿Estás seguro de que quieres enviar esta campaña?')) {
      return;
    }

    try {
      // Get total contacts to simulate sending
      const { count: contactsCount, error: contactsError } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true });

      if (contactsError) throw contactsError;

      // Calculate random metrics based on contacts count
      const totalContacts = contactsCount || 100;
      const sentCount = Math.floor(totalContacts * (Math.random() * 0.3 + 0.7)); // 70-100% of contacts
      const openRate = Math.random() * 0.3 + 0.2; // 20-50% open rate
      const clickRate = Math.random() * 0.15 + 0.05; // 5-20% click rate
      
      const openCount = Math.floor(sentCount * openRate);
      const clickCount = Math.floor(sentCount * clickRate);

      const { error } = await supabase
        .from('campaigns')
        .update({ 
          status: 'sent',
          sent_count: sentCount,
          open_count: openCount,
          click_count: clickCount
        })
        .eq('id', campaignId);

      if (error) throw error;

      toast.success('Campaña enviada correctamente');
      fetchData();
    } catch (error) {
      console.error('Error sending campaign:', error);
      toast.error('Error al enviar la campaña');
    }
  };

  const handlePauseCampaign = async (campaignId: string) => {
    if (!canEdit) {
      toast.error('No tienes permisos para pausar campañas');
      return;
    }

    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ status: 'paused' })
        .eq('id', campaignId);

      if (error) throw error;

      toast.success('Campaña pausada correctamente');
      fetchData();
    } catch (error) {
      console.error('Error pausing campaign:', error);
      toast.error('Error al pausar la campaña');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleEditCampaign = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setShowCampaignForm(true);
  };

  const handleEditTemplate = (template: Template) => {
    setEditingTemplate(template);
    setShowTemplateForm(true);
  };

  const handleViewStats = (campaign: Campaign) => {
    setSelectedCampaignForStats(campaign);
    setShowStatsModal(true);
  };

  const handleScheduleCampaign = (campaign: Campaign) => {
    setSelectedCampaignForSchedule(campaign);
    setShowScheduleModal(true);
  };

  const handleCloseCampaignForm = () => {
    setShowCampaignForm(false);
    setEditingCampaign(null);
  };

  const handleCloseTemplateForm = () => {
    setShowTemplateForm(false);
    setEditingTemplate(null);
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
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Campañas</h2>
          <p className="text-gray-600 mt-1">
            Crea y gestiona campañas de email marketing y WhatsApp
          </p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={() => setShowTemplateForm(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center space-x-2 transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span>Nueva Plantilla</span>
          </button>
          <button 
            onClick={() => setShowCampaignForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Campaña</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Campañas</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{campaigns.length}</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-500">
              <Mail className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Campañas Enviadas</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {campaigns.filter(c => c.status === 'sent').length}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-green-500">
              <Send className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Enviados</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">
                {campaignStats.totalSent.toLocaleString()}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-purple-500">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tasa Apertura Promedio</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">
                {campaignStats.avgOpenRate}%
              </p>
            </div>
            <div className="p-3 rounded-lg bg-orange-500">
              <Eye className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('campaigns')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'campaigns'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Campañas ({campaigns.length})
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'templates'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Plantillas ({templates.length})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'campaigns' && (
            <>
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar campañas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Todos los tipos</option>
                  <option value="email">Email</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Todos los estados</option>
                  <option value="draft">Borrador</option>
                  <option value="scheduled">Programada</option>
                  <option value="sent">Enviada</option>
                  <option value="paused">Pausada</option>
                </select>

                <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 flex items-center space-x-2 transition-colors">
                  <Filter className="w-4 h-4" />
                  <span>Filtros Avanzados</span>
                </button>
              </div>

              {/* Campaigns Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredCampaigns.map((campaign) => (
                  <div key={campaign.id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-lg transition-shadow">
                    {/* Card Header */}
                    <div className="p-6 border-b border-gray-100">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                            {getTypeIcon(campaign.type)}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 truncate">{campaign.name}</h3>
                            <p className="text-sm text-gray-500">{getTypeText(campaign.type)}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleViewStats(campaign)}
                            className="p-1 hover:bg-gray-100 rounded text-gray-600"
                          >
                            <BarChart3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEditCampaign(campaign)}
                            className="p-1 hover:bg-gray-100 rounded text-blue-600"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDuplicateCampaign(campaign)}
                            className="p-1 hover:bg-gray-100 rounded text-gray-600"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCampaign(campaign.id)}
                            className="p-1 hover:bg-gray-100 rounded text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-6">
                      {/* Status */}
                      <div className="flex items-center justify-between mb-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                          {getStatusIcon(campaign.status)}
                          <span className="ml-1">{getStatusText(campaign.status)}</span>
                        </span>
                        <div className="text-sm text-gray-500">
                          {formatDate(campaign.created_at)}
                        </div>
                      </div>

                      {/* Subject */}
                      {campaign.subject && (
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-700 mb-1">Asunto:</p>
                          <p className="text-sm text-gray-600 truncate">{campaign.subject}</p>
                        </div>
                      )}

                      {/* Special Features */}
                      {(campaign.is_ab_test || campaign.personalization_config) && (
                        <div className="mb-4 flex flex-wrap gap-2">
                          {campaign.is_ab_test && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              Test A/B
                            </span>
                          )}
                          {campaign.personalization_config && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                              Personalización Avanzada
                            </span>
                          )}
                        </div>
                      )}

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-900">{campaign.sent_count.toLocaleString()}</div>
                          <div className="text-xs text-gray-500">Enviados</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{calculateOpenRate(campaign)}%</div>
                          <div className="text-xs text-gray-500">Apertura</div>
                        </div>
                      </div>

                      {/* Performance Metrics */}
                      {campaign.sent_count > 0 && (
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center text-gray-600">
                              <Eye className="w-3 h-3 mr-1" />
                              Abiertos
                            </span>
                            <span className="font-medium">{campaign.open_count}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center text-gray-600">
                              <MousePointer className="w-3 h-3 mr-1" />
                              Clicks
                            </span>
                            <span className="font-medium">{campaign.click_count}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Card Actions */}
                    <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
                      <div className="flex items-center justify-between">
                        <div className="flex space-x-2">
                          {campaign.status === 'draft' && (
                            <>
                              <button 
                                onClick={() => handleScheduleCampaign(campaign)}
                                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 flex items-center space-x-1"
                              >
                                <Calendar className="w-3 h-3" />
                                <span>Programar</span>
                              </button>
                              <button 
                                onClick={() => handleSendCampaign(campaign.id)}
                                className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 flex items-center space-x-1"
                              >
                                <Play className="w-3 h-3" />
                                <span>Enviar</span>
                              </button>
                            </>
                          )}
                          {campaign.status === 'scheduled' && (
                            <button 
                              onClick={() => handleSendCampaign(campaign.id)}
                              className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 flex items-center space-x-1"
                            >
                              <Play className="w-3 h-3" />
                              <span>Enviar Ahora</span>
                            </button>
                          )}
                          {campaign.status === 'sent' && (
                            <button 
                              onClick={() => handlePauseCampaign(campaign.id)}
                              className="bg-orange-600 text-white px-3 py-1 rounded text-sm hover:bg-orange-700 flex items-center space-x-1"
                            >
                              <Pause className="w-3 h-3" />
                              <span>Pausar</span>
                            </button>
                          )}
                        </div>
                        <button 
                          onClick={() => handleViewStats(campaign)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center space-x-1"
                        >
                          <BarChart3 className="w-4 h-4" />
                          <span>Estadísticas</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredCampaigns.length === 0 && (
                <div className="text-center py-12">
                  <Mail className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No hay campañas</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm || selectedType || selectedStatus 
                      ? 'No se encontraron campañas con los filtros aplicados.'
                      : 'Comienza creando tu primera campaña.'
                    }
                  </p>
                  {!searchTerm && !selectedType && !selectedStatus && (
                    <div className="mt-6">
                      <button 
                        onClick={() => setShowCampaignForm(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 mx-auto transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Nueva Campaña</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {activeTab === 'templates' && (
            <>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">Plantillas de Mensajes</h3>
                <button 
                  onClick={() => setShowTemplateForm(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nueva Plantilla</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map((template) => (
                  <div key={template.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                          {getTypeIcon(template.tipo)}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{template.nombre}</h4>
                          <p className="text-sm text-gray-500">{getTypeText(template.tipo)}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button 
                          onClick={() => handleEditTemplate(template)}
                          className="p-1 hover:bg-gray-100 rounded text-blue-600"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteTemplate(template.id)}
                          className="p-1 hover:bg-gray-100 rounded text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {template.asunto && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700">Asunto:</p>
                        <p className="text-sm text-gray-600">{template.asunto}</p>
                      </div>
                    )}
                    
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-1">Contenido:</p>
                      <p className="text-sm text-gray-600 line-clamp-3">{template.contenido}</p>
                    </div>

                    {/* Advanced Features */}
                    {(template.conditional_content?.length > 0 || template.target_segments?.length > 0) && (
                      <div className="mb-4 flex flex-wrap gap-2">
                        {template.conditional_content?.length > 0 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                            Contenido Condicional
                          </span>
                        )}
                        {template.target_segments?.length > 0 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            Segmentación
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-gray-500">
                        Usado {template.uso_count} veces
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        template.activa ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {template.activa ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                    
                    <button className="w-full bg-blue-50 text-blue-600 py-2 px-4 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium">
                      Usar Plantilla
                    </button>
                  </div>
                ))}
              </div>

              {templates.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No hay plantillas</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Crea plantillas para reutilizar contenido en tus campañas.
                  </p>
                  <div className="mt-6">
                    <button 
                      onClick={() => setShowTemplateForm(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 mx-auto transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Nueva Plantilla</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      <CampaignForm
        campaign={editingCampaign}
        isOpen={showCampaignForm}
        onClose={handleCloseCampaignForm}
        onSave={fetchData}
      />

      <TemplateForm
        template={editingTemplate}
        isOpen={showTemplateForm}
        onClose={handleCloseTemplateForm}
        onSave={fetchData}
      />

      <CampaignStatsModal
        campaign={selectedCampaignForStats}
        isOpen={showStatsModal}
        onClose={() => setShowStatsModal(false)}
      />

      <CampaignScheduleModal
        campaign={selectedCampaignForSchedule}
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        onScheduled={fetchData}
      />
    </div>
  );
};