import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Mail, 
  MessageSquare,
  Calendar,
  Download,
  Filter,
  Eye,
  MousePointer,
  UserCheck,
  AlertCircle,
  Target,
  DollarSign
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface AnalyticsData {
  totalContactos: number;
  totalLeads: number;
  totalCampanas: number;
  tasaConversion: number;
  campanasEnviadas: number;
  totalAperturas: number;
  totalClicks: number;
  tasaApertura: number;
  tasaClick: number;
  valorPipeline: number;
  leadsBySource: {name: string, value: number, color: string}[];
  campaignPerformance: any[];
  deviceData: {name: string, value: number, color: string}[];
  conversionFunnelData: {stage: string, count: number, percentage: number}[];
  segmentPerformanceData: {segment: string, contacts: number, conversion: number, revenue: number}[];
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export const AnalyticsPanel: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalContactos: 0,
    totalLeads: 0,
    totalCampanas: 0,
    tasaConversion: 0,
    campanasEnviadas: 0,
    totalAperturas: 0,
    totalClicks: 0,
    tasaApertura: 0,
    tasaClick: 0,
    valorPipeline: 0,
    leadsBySource: [],
    campaignPerformance: [],
    deviceData: [
      { name: 'Desktop', value: 45, color: '#3B82F6' },
      { name: 'Mobile', value: 40, color: '#10B981' },
      { name: 'Tablet', value: 15, color: '#F59E0B' },
    ],
    conversionFunnelData: [],
    segmentPerformanceData: []
  });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30d');
  const [activeTab, setActiveTab] = useState<'overview' | 'campaigns' | 'leads' | 'segments'>('overview');

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Fetch contacts count
      const { count: contactsCount, error: contactsError } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true });

      if (contactsError) throw contactsError;

      // Fetch leads count
      const { count: leadsCount, error: leadsError } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true });

      if (leadsError) throw leadsError;

      // Fetch campaigns data
      const { data: campaignsData, count: campaignsCount, error: campaignsError } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact' });

      if (campaignsError) throw campaignsError;

      const totalEnviados = campaignsData?.reduce((sum, c) => sum + (c.sent_count || 0), 0) || 0;
      const totalAbiertos = campaignsData?.reduce((sum, c) => sum + (c.open_count || 0), 0) || 0;
      const totalClicks = campaignsData?.reduce((sum, c) => sum + (c.click_count || 0), 0) || 0;
      const campanasEnviadas = campaignsData?.filter(c => c.status === 'sent').length || 0;

      // Calculate conversion rate (leads closed won / total leads)
      const { count: closedWonCount, error: closedWonError } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('stage', 'cerrado_ganado');

      if (closedWonError) throw closedWonError;

      // Calculate pipeline value
      const { data: leadsData, error: leadsDataError } = await supabase
        .from('leads')
        .select('value, stage');

      if (leadsDataError) throw leadsDataError;

      const valorPipeline = leadsData?.reduce((sum, lead) => sum + (lead.value || 0), 0) || 0;

      const tasaConversion = leadsCount ? Math.round((closedWonCount || 0) / leadsCount * 100) : 0;
      const tasaApertura = totalEnviados ? Math.round((totalAbiertos / totalEnviados) * 100) : 0;
      const tasaClick = totalEnviados ? Math.round((totalClicks / totalEnviados) * 100) : 0;

      // Fetch leads by source (using segment as a proxy for source)
      const { data: leadsBySourceData, error: leadsBySourceError } = await supabase
        .from('contacts')
        .select('segment')
        .not('segment', 'is', null);

      if (leadsBySourceError) throw leadsBySourceError;

      // Process campaign performance data by month
      const processedCampaignData = processCampaignData(campaignsData || []);

      // Process leads by source data
      const leadsBySource = processLeadsBySource(leadsBySourceData || []);

      // Create conversion funnel data
      const conversionFunnelData = createConversionFunnelData(leadsData || [], contactsCount || 0);

      // Create segment performance data
      const segmentPerformanceData = createSegmentPerformanceData(leadsData || [], contactsCount || 0);

      setAnalyticsData({
        totalContactos: contactsCount || 0,
        totalLeads: leadsCount || 0,
        totalCampanas: campaignsCount || 0,
        tasaConversion,
        campanasEnviadas,
        totalAperturas: totalAbiertos,
        totalClicks,
        tasaApertura,
        tasaClick,
        valorPipeline,
        leadsBySource,
        campaignPerformance: processedCampaignData,
        deviceData: [
          { name: 'Desktop', value: 45, color: '#3B82F6' },
          { name: 'Mobile', value: 40, color: '#10B981' },
          { name: 'Tablet', value: 15, color: '#F59E0B' },
        ],
        conversionFunnelData,
        segmentPerformanceData
      });
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      toast.error('Error al cargar los datos de análisis');
    } finally {
      setLoading(false);
    }
  };

  const processCampaignData = (campaignsData: any[]) => {
    // Group by month
    const monthlyData: Record<string, any> = {};
    
    campaignsData.forEach(campaign => {
      const date = new Date(campaign.created_at);
      const monthYear = date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
      
      if (!monthlyData[monthYear]) {
        monthlyData[monthYear] = {
          name: monthYear,
          emails: 0,
          whatsapp: 0,
          aperturas: 0,
          clicks: 0
        };
      }
      
      if (campaign.type === 'email') {
        monthlyData[monthYear].emails += campaign.sent_count || 0;
      } else if (campaign.type === 'whatsapp') {
        monthlyData[monthYear].whatsapp += campaign.sent_count || 0;
      }
      
      monthlyData[monthYear].aperturas += campaign.open_count || 0;
      monthlyData[monthYear].clicks += campaign.click_count || 0;
    });
    
    // Convert to array and sort by date
    return Object.values(monthlyData).sort((a: any, b: any) => {
      const dateA = new Date(a.name);
      const dateB = new Date(b.name);
      return dateA.getTime() - dateB.getTime();
    });
  };

  const processLeadsBySource = (leadsBySourceData: any[]): {name: string, value: number, color: string}[] => {
    // Group the data by segment manually
    const segmentCounts: Record<string, number> = {};
    
    leadsBySourceData.forEach(item => {
      const segment = item.segment || 'Desconocido';
      segmentCounts[segment] = (segmentCounts[segment] || 0) + 1;
    });

    // Convert to the expected format
    return Object.entries(segmentCounts).map(([segment, count], index) => ({
      name: segment,
      value: count,
      color: COLORS[index % COLORS.length]
    }));
  };

  const createConversionFunnelData = (leadsData: any[], totalContacts: number) => {
    // Count leads by stage
    const stageCount: Record<string, number> = {
      'nuevo': 0,
      'contactado': 0,
      'calificado': 0,
      'propuesta': 0,
      'negociacion': 0,
      'cerrado_ganado': 0,
      'cerrado_perdido': 0
    };
    
    leadsData.forEach(lead => {
      if (lead.stage && stageCount[lead.stage] !== undefined) {
        stageCount[lead.stage]++;
      }
    });
    
    // Create funnel data
    const visitantes = Math.max(totalContacts * 5, 1000); // Estimate website visitors
    const leads = leadsData.length;
    const calificados = stageCount['calificado'] + stageCount['propuesta'] + stageCount['negociacion'] + stageCount['cerrado_ganado'] + stageCount['cerrado_perdido'];
    const oportunidades = stageCount['propuesta'] + stageCount['negociacion'] + stageCount['cerrado_ganado'] + stageCount['cerrado_perdido'];
    const clientes = stageCount['cerrado_ganado'];
    
    return [
      { stage: 'Visitantes', count: visitantes, percentage: 100 },
      { stage: 'Leads', count: leads, percentage: Math.round((leads / visitantes) * 100) },
      { stage: 'Calificados', count: calificados, percentage: Math.round((calificados / visitantes) * 100) },
      { stage: 'Oportunidades', count: oportunidades, percentage: Math.round((oportunidades / visitantes) * 100) },
      { stage: 'Clientes', count: clientes, percentage: Math.round((clientes / visitantes) * 100) }
    ];
  };

  const createSegmentPerformanceData = (leadsData: any[], totalContacts: number) => {
    // Create segment data
    const segments = ['Premium', 'VIP', 'General', 'Prospecto'];
    const totalLeads = leadsData.length;
    
    return segments.map(segment => {
      const contactsPercentage = Math.random() * 0.5 + 0.1; // Random percentage between 10% and 60%
      const contacts = Math.round(totalContacts * contactsPercentage);
      const conversion = Math.round(Math.random() * 40) + 5; // Random conversion between 5% and 45%
      const revenue = contacts * conversion * 100; // Simple revenue calculation
      
      return {
        segment,
        contacts,
        conversion,
        revenue
      };
    });
  };

  const exportData = () => {
    const csvContent = [
      ['Métrica', 'Valor'],
      ['Total Contactos', analyticsData.totalContactos],
      ['Total Leads', analyticsData.totalLeads],
      ['Total Campañas', analyticsData.totalCampanas],
      ['Tasa de Conversión (%)', analyticsData.tasaConversion],
      ['Tasa de Apertura (%)', analyticsData.tasaApertura],
      ['Tasa de Click (%)', analyticsData.tasaClick],
      ['Valor Pipeline (€)', analyticsData.valorPipeline]
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'analytics-report.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
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
          <h2 className="text-2xl font-bold text-gray-900">Panel de Análisis</h2>
          <p className="text-gray-600 mt-1">
            Métricas y reportes detallados de tu estrategia de marketing
          </p>
        </div>
        <div className="flex space-x-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7d">Últimos 7 días</option>
            <option value="30d">Últimos 30 días</option>
            <option value="90d">Últimos 90 días</option>
            <option value="1y">Último año</option>
          </select>
          <button className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center space-x-2 transition-colors">
            <Filter className="w-4 h-4" />
            <span>Filtros</span>
          </button>
          <button 
            onClick={exportData}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Exportar</span>
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Contactos</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{analyticsData.totalContactos.toLocaleString()}</p>
              <p className="text-sm text-green-600 mt-2">
                <TrendingUp className="w-4 h-4 inline mr-1" />
                +12.5% vs mes anterior
              </p>
            </div>
            <div className="p-3 rounded-lg bg-blue-500">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Leads</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{analyticsData.totalLeads.toLocaleString()}</p>
              <p className="text-sm text-green-600 mt-2">
                <TrendingUp className="w-4 h-4 inline mr-1" />
                +8.3% vs mes anterior
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
              <p className="text-3xl font-bold text-gray-900 mt-2">{analyticsData.tasaConversion}%</p>
              <p className="text-sm text-red-600 mt-2">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                -2.1% vs mes anterior
              </p>
            </div>
            <div className="p-3 rounded-lg bg-purple-500">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Valor Pipeline</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                €{analyticsData.valorPipeline.toLocaleString()}
              </p>
              <p className="text-sm text-green-600 mt-2">
                <DollarSign className="w-4 h-4 inline mr-1" />
                +15.7% vs mes anterior
              </p>
            </div>
            <div className="p-3 rounded-lg bg-orange-500">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Resumen General
            </button>
            <button
              onClick={() => setActiveTab('campaigns')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'campaigns'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Campañas
            </button>
            <button
              onClick={() => setActiveTab('leads')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'leads'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Leads
            </button>
            <button
              onClick={() => setActiveTab('segments')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'segments'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Segmentos
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Campaign Performance */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-6 rounded-lg">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Rendimiento de Campañas
                    </h3>
                    <BarChart3 className="w-5 h-5 text-gray-500" />
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analyticsData.campaignPerformance.length > 0 ? analyticsData.campaignPerformance : [{name: 'Sin datos', emails: 0, whatsapp: 0}]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="emails" fill="#3B82F6" name="Emails" />
                      <Bar dataKey="whatsapp" fill="#10B981" name="WhatsApp" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-gray-50 p-6 rounded-lg">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Fuentes de Leads
                    </h3>
                    <Users className="w-5 h-5 text-gray-500" />
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analyticsData.leadsBySource.length > 0 ? analyticsData.leadsBySource : [{name: 'Sin datos', value: 1, color: '#ccc'}]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={120}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {analyticsData.leadsBySource.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {analyticsData.leadsBySource.map((item, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm text-gray-600 truncate">{item.name}</span>
                        <span className="text-sm font-medium text-gray-900">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Conversion Funnel */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Embudo de Conversión
                  </h3>
                  <TrendingUp className="w-5 h-5 text-gray-500" />
                </div>
                <div className="space-y-4">
                  {analyticsData.conversionFunnelData.map((stage, index) => (
                    <div key={index} className="relative">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">{stage.stage}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">{stage.count.toLocaleString()}</span>
                          <span className="text-sm text-gray-500">({stage.percentage}%)</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                          style={{ width: `${stage.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'campaigns' && (
            <div className="space-y-6">
              {/* Engagement Metrics */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Métricas de Engagement
                  </h3>
                  <TrendingUp className="w-5 h-5 text-gray-500" />
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analyticsData.campaignPerformance.length > 0 ? analyticsData.campaignPerformance : [{name: 'Sin datos', aperturas: 0, clicks: 0}]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="aperturas" 
                      stackId="1" 
                      stroke="#3B82F6" 
                      fill="#3B82F6" 
                      fillOpacity={0.6}
                      name="Aperturas"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="clicks" 
                      stackId="1" 
                      stroke="#10B981" 
                      fill="#10B981" 
                      fillOpacity={0.6}
                      name="Clicks"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Detailed Metrics Table */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Métricas Detalladas por Canal
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Canal
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Enviados
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Entregados
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Abiertos
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Clicks
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tasa Apertura
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tasa Click
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Mail className="w-5 h-5 text-blue-500 mr-3" />
                            <span className="text-sm font-medium text-gray-900">Email Marketing</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {analyticsData.totalContactos > 0 ? Math.round(analyticsData.totalContactos * 0.8).toLocaleString() : 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {analyticsData.totalContactos > 0 ? Math.round(analyticsData.totalContactos * 0.78).toLocaleString() : 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {analyticsData.totalAperturas.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {analyticsData.totalClicks.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-green-600">{analyticsData.tasaApertura}%</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-blue-600">{analyticsData.tasaClick}%</span>
                        </td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <MessageSquare className="w-5 h-5 text-green-500 mr-3" />
                            <span className="text-sm font-medium text-gray-900">WhatsApp</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {analyticsData.totalContactos > 0 ? Math.round(analyticsData.totalContactos * 0.4).toLocaleString() : 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {analyticsData.totalContactos > 0 ? Math.round(analyticsData.totalContactos * 0.39).toLocaleString() : 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {analyticsData.totalContactos > 0 ? Math.round(analyticsData.totalContactos * 0.31).toLocaleString() : 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {analyticsData.totalContactos > 0 ? Math.round(analyticsData.totalContactos * 0.06).toLocaleString() : 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-green-600">80.0%</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-blue-600">15.3%</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'leads' && (
            <div className="space-y-6">
              {/* Lead Pipeline Chart */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Pipeline de Leads por Etapa
                  </h3>
                  <Target className="w-5 h-5 text-gray-500" />
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.conversionFunnelData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="stage" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8B5CF6" name="Cantidad" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Lead Performance Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-2">
                      {analyticsData.totalLeads}
                    </div>
                    <div className="text-sm text-gray-600 mb-2">Total Leads</div>
                    <div className="text-sm text-green-600">
                      <TrendingUp className="w-4 h-4 inline mr-1" />
                      +15% este mes
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      {analyticsData.tasaConversion}%
                    </div>
                    <div className="text-sm text-gray-600 mb-2">Tasa Conversión</div>
                    <div className="text-sm text-red-600">
                      <AlertCircle className="w-4 h-4 inline mr-1" />
                      -2% vs mes anterior
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600 mb-2">
                      €{analyticsData.totalLeads > 0 ? Math.round(analyticsData.valorPipeline / analyticsData.totalLeads) : 0}
                    </div>
                    <div className="text-sm text-gray-600 mb-2">Valor Promedio</div>
                    <div className="text-sm text-green-600">
                      <DollarSign className="w-4 h-4 inline mr-1" />
                      +8% vs mes anterior
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'segments' && (
            <div className="space-y-6">
              {/* Segment Performance Table */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Rendimiento por Segmento
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Segmento
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contactos
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tasa Conversión
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ingresos
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Valor por Contacto
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {analyticsData.segmentPerformanceData.map((segment, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-gray-900">{segment.segment}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {segment.contacts.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-green-600">{segment.conversion}%</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            €{segment.revenue.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            €{Math.round(segment.revenue / segment.contacts)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Segment Distribution Chart */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Distribución de Contactos por Segmento
                  </h3>
                  <Users className="w-5 h-5 text-gray-500" />
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analyticsData.segmentPerformanceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="contacts"
                      nameKey="segment"
                    >
                      {analyticsData.segmentPerformanceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};