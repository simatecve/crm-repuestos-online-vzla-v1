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
  DollarSign,
  Clock,
  Activity,
  FileText,
  PieChart,
  LineChart,
  Settings,
  RefreshCw,
  Share2,
  Printer,
  Globe,
  Smartphone,
  Monitor,
  MapPin,
  Star,
  Zap
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ComposedChart,
  Scatter,
  ScatterChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Funnel,
  FunnelChart,
  LabelList
} from 'recharts';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface ReportData {
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
  ingresosMes: number;
  crecimientoMensual: number;
  satisfaccionCliente: number;
  retencionClientes: number;
  leadsBySource: {name: string, value: number, color: string, conversion: number}[];
  campaignPerformance: any[];
  deviceData: {name: string, value: number, color: string}[];
  geographicData: {country: string, leads: number, conversions: number, revenue: number}[];
  funnelData: {name: string, value: number, fill: string}[];
  customerSatisfactionData: {aspect: string, score: number}[];
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export const ReportsPanel: React.FC = () => {
  const [reportData, setReportData] = useState<ReportData>({
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
    ingresosMes: 0,
    crecimientoMensual: 0,
    satisfaccionCliente: 0,
    retencionClientes: 0,
    leadsBySource: [],
    campaignPerformance: [],
    deviceData: [
      { name: 'Desktop', value: 45, color: '#3B82F6' },
      { name: 'Mobile', value: 40, color: '#10B981' },
      { name: 'Tablet', value: 15, color: '#F59E0B' },
    ],
    geographicData: [
      { country: 'España', leads: 450, conversions: 90, revenue: 135000 },
      { country: 'México', leads: 320, conversions: 64, revenue: 96000 },
      { country: 'Argentina', leads: 280, conversions: 56, revenue: 84000 },
      { country: 'Colombia', leads: 200, conversions: 40, revenue: 60000 },
      { country: 'Chile', leads: 150, conversions: 30, revenue: 45000 },
    ],
    funnelData: [
      { name: 'Visitantes', value: 10000, fill: '#8884d8' },
      { name: 'Leads', value: 2000, fill: '#83a6ed' },
      { name: 'Calificados', value: 800, fill: '#8dd1e1' },
      { name: 'Oportunidades', value: 400, fill: '#82ca9d' },
      { name: 'Clientes', value: 100, fill: '#a4de6c' },
    ],
    customerSatisfactionData: [
      { aspect: 'Calidad', score: 85 },
      { aspect: 'Soporte', score: 78 },
      { aspect: 'Precio', score: 72 },
      { aspect: 'Facilidad', score: 88 },
      { aspect: 'Velocidad', score: 82 },
      { aspect: 'Confiabilidad', score: 90 },
    ]
  });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30d');
  const [activeTab, setActiveTab] = useState<'overview' | 'campaigns' | 'leads' | 'customers' | 'geographic' | 'advanced'>('overview');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  const fetchReportData = async () => {
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

      // Calculate conversion rate
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

      // Fetch contacts by segment to create leads by source data
      const { data: contactsBySegment, error: contactsBySegmentError } = await supabase
        .from('contacts')
        .select('segment')
        .not('segment', 'is', null);

      if (contactsBySegmentError) throw contactsBySegmentError;

      // Process campaign performance data by month
      const processedCampaignData = processCampaignData(campaignsData || []);

      // Process leads by source data
      const leadsBySource = processLeadsBySource(contactsBySegment || []);

      // Create funnel data based on real lead stages
      const funnelData = createFunnelData(leadsData || [], contactsCount || 0);

      // Create geographic data (simulated)
      const geographicData = createGeographicData(leadsCount || 0, valorPipeline);

      setReportData({
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
        ingresosMes: Math.round(valorPipeline * 0.15),
        crecimientoMensual: 12.5,
        satisfaccionCliente: 4.2,
        retencionClientes: 85,
        leadsBySource,
        campaignPerformance: processedCampaignData,
        deviceData: [
          { name: 'Desktop', value: 45, color: '#3B82F6' },
          { name: 'Mobile', value: 40, color: '#10B981' },
          { name: 'Tablet', value: 15, color: '#F59E0B' },
        ],
        geographicData,
        funnelData,
        customerSatisfactionData: [
          { aspect: 'Calidad', score: 85 },
          { aspect: 'Soporte', score: 78 },
          { aspect: 'Precio', score: 72 },
          { aspect: 'Facilidad', score: 88 },
          { aspect: 'Velocidad', score: 82 },
          { aspect: 'Confiabilidad', score: 90 },
        ]
      });
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast.error('Error al cargar los datos del reporte');
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
          opens: 0,
          clicks: 0,
          conversiones: 0,
          ingresos: 0
        };
      }
      
      if (campaign.type === 'email') {
        monthlyData[monthYear].emails += campaign.sent_count || 0;
      } else if (campaign.type === 'whatsapp') {
        monthlyData[monthYear].whatsapp += campaign.sent_count || 0;
      }
      
      monthlyData[monthYear].opens += campaign.open_count || 0;
      monthlyData[monthYear].clicks += campaign.click_count || 0;
      
      // Estimate conversions and revenue
      const estimatedConversions = Math.round((campaign.click_count || 0) * 0.2);
      monthlyData[monthYear].conversiones += estimatedConversions;
      monthlyData[monthYear].ingresos += estimatedConversions * 150;
    });
    
    // Convert to array and sort by date
    return Object.values(monthlyData).sort((a: any, b: any) => {
      const dateA = new Date(a.name);
      const dateB = new Date(b.name);
      return dateA.getTime() - dateB.getTime();
    });
  };

  const processLeadsBySource = (contactsBySegment: any[]): {name: string, value: number, color: string, conversion: number}[] => {
    // Count contacts by segment
    const segmentCounts: Record<string, number> = {};
    
    contactsBySegment.forEach(contact => {
      const segment = contact.segment || 'Desconocido';
      segmentCounts[segment] = (segmentCounts[segment] || 0) + 1;
    });

    // Convert to array format
    return Object.entries(segmentCounts).map(([segment, count], index) => {
      // Generate random conversion rate between 15% and 45%
      const conversion = Math.floor(Math.random() * 30) + 15;
      
      return {
        name: segment,
        value: count,
        color: COLORS[index % COLORS.length],
        conversion
      };
    });
  };

  const createFunnelData = (leadsData: any[], totalContacts: number) => {
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
    const visitantes = Math.max(totalContacts * 5, 10000); // Estimate website visitors
    const leads = leadsData.length;
    const calificados = stageCount['calificado'] + stageCount['propuesta'] + stageCount['negociacion'] + stageCount['cerrado_ganado'] + stageCount['cerrado_perdido'];
    const oportunidades = stageCount['propuesta'] + stageCount['negociacion'] + stageCount['cerrado_ganado'] + stageCount['cerrado_perdido'];
    const clientes = stageCount['cerrado_ganado'];
    
    return [
      { name: 'Visitantes', value: visitantes, fill: '#8884d8' },
      { name: 'Leads', value: leads, fill: '#83a6ed' },
      { name: 'Calificados', value: calificados, fill: '#8dd1e1' },
      { name: 'Oportunidades', value: oportunidades, fill: '#82ca9d' },
      { name: 'Clientes', value: clientes, fill: '#a4de6c' }
    ];
  };

  const createGeographicData = (totalLeads: number, totalRevenue: number) => {
    // Create geographic distribution based on total leads and revenue
    const countries = ['España', 'México', 'Argentina', 'Colombia', 'Chile'];
    const percentages = [0.35, 0.25, 0.2, 0.12, 0.08]; // Distribution percentages
    
    return countries.map((country, index) => {
      const leads = Math.round(totalLeads * percentages[index]);
      const conversionRate = Math.floor(Math.random() * 10) + 15; // Random between 15% and 25%
      const conversions = Math.round(leads * conversionRate / 100);
      const revenue = Math.round(totalRevenue * percentages[index]);
      
      return {
        country,
        leads,
        conversions,
        revenue
      };
    });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchReportData();
    setRefreshing(false);
    toast.success('Datos actualizados');
  };

  const exportReport = (format: 'pdf' | 'excel' | 'csv') => {
    // Simulate export functionality
    toast.success(`Reporte exportado en formato ${format.toUpperCase()}`);
  };

  const shareReport = () => {
    // Simulate share functionality
    toast.success('Enlace del reporte copiado al portapapeles');
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
          <h2 className="text-2xl font-bold text-gray-900">Reportes Avanzados</h2>
          <p className="text-gray-600 mt-1">
            Análisis completo y métricas detalladas de tu negocio
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
            <option value="custom">Personalizado</option>
          </select>
          <button 
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center space-x-2 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
          <button 
            onClick={shareReport}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span>Compartir</span>
          </button>
          <div className="relative group">
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors">
              <Download className="w-4 h-4" />
              <span>Exportar</span>
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 hidden group-hover:block">
              <button onClick={() => exportReport('pdf')} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left">
                <FileText className="w-4 h-4 inline mr-2" />
                Exportar PDF
              </button>
              <button onClick={() => exportReport('excel')} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left">
                <BarChart3 className="w-4 h-4 inline mr-2" />
                Exportar Excel
              </button>
              <button onClick={() => exportReport('csv')} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left">
                <FileText className="w-4 h-4 inline mr-2" />
                Exportar CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Contactos</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{reportData.totalContactos.toLocaleString()}</p>
              <p className="text-sm text-green-600 mt-2">
                <TrendingUp className="w-4 h-4 inline mr-1" />
                +{reportData.crecimientoMensual}%
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
              <p className="text-sm font-medium text-gray-600">Ingresos del Mes</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                €{reportData.ingresosMes.toLocaleString()}
              </p>
              <p className="text-sm text-green-600 mt-2">
                <DollarSign className="w-4 h-4 inline mr-1" />
                +15.7%
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
              <p className="text-sm font-medium text-gray-600">Tasa Conversión</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">{reportData.tasaConversion}%</p>
              <p className="text-sm text-red-600 mt-2">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                -2.1%
              </p>
            </div>
            <div className="p-3 rounded-lg bg-purple-500">
              <Target className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tasa Apertura</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">{reportData.tasaApertura}%</p>
              <p className="text-sm text-green-600 mt-2">
                <Eye className="w-4 h-4 inline mr-1" />
                +3.2%
              </p>
            </div>
            <div className="p-3 rounded-lg bg-orange-500">
              <Eye className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Satisfacción</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">{reportData.satisfaccionCliente}/5</p>
              <p className="text-sm text-green-600 mt-2">
                <Star className="w-4 h-4 inline mr-1" />
                +0.3
              </p>
            </div>
            <div className="p-3 rounded-lg bg-yellow-500">
              <Star className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Retención</p>
              <p className="text-3xl font-bold text-indigo-600 mt-2">{reportData.retencionClientes}%</p>
              <p className="text-sm text-green-600 mt-2">
                <UserCheck className="w-4 h-4 inline mr-1" />
                +5.1%
              </p>
            </div>
            <div className="p-3 rounded-lg bg-indigo-500">
              <UserCheck className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Resumen General
            </button>
            <button
              onClick={() => setActiveTab('campaigns')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'campaigns'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Campañas
            </button>
            <button
              onClick={() => setActiveTab('leads')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'leads'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Leads y Ventas
            </button>
            <button
              onClick={() => setActiveTab('customers')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'customers'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Clientes
            </button>
            <button
              onClick={() => setActiveTab('geographic')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'geographic'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Geográfico
            </button>
            <button
              onClick={() => setActiveTab('advanced')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'advanced'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Análisis Avanzado
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Performance Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-6 rounded-lg">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Rendimiento Mensual
                    </h3>
                    <BarChart3 className="w-5 h-5 text-gray-500" />
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={reportData.campaignPerformance.length > 0 ? reportData.campaignPerformance : [{name: 'Sin datos', emails: 0, whatsapp: 0, conversiones: 0}]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="emails" fill="#3B82F6" name="Emails" />
                      <Bar dataKey="whatsapp" fill="#10B981" name="WhatsApp" />
                      <Line type="monotone" dataKey="conversiones" stroke="#EF4444" name="Conversiones" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-gray-50 p-6 rounded-lg">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Embudo de Conversión
                    </h3>
                    <Target className="w-5 h-5 text-gray-500" />
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <FunnelChart>
                      <Tooltip />
                      <Funnel
                        dataKey="value"
                        data={reportData.funnelData}
                        isAnimationActive
                      >
                        <LabelList position="center" fill="#fff" stroke="none" />
                      </Funnel>
                    </FunnelChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Revenue and Growth */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Ingresos y Crecimiento
                  </h3>
                  <DollarSign className="w-5 h-5 text-gray-500" />
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={reportData.campaignPerformance.length > 0 ? reportData.campaignPerformance : [{name: 'Sin datos', ingresos: 0}]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="ingresos" 
                      stroke="#10B981" 
                      fill="#10B981" 
                      fillOpacity={0.6}
                      name="Ingresos (€)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeTab === 'campaigns' && (
            <div className="space-y-6">
              {/* Campaign Performance by Channel */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-6 rounded-lg">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Rendimiento por Canal
                    </h3>
                    <Mail className="w-5 h-5 text-gray-500" />
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={reportData.campaignPerformance.length > 0 ? reportData.campaignPerformance : [{name: 'Sin datos', emails: 0, whatsapp: 0}]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="emails" fill="#3B82F6" name="Email" />
                      <Bar dataKey="whatsapp" fill="#10B981" name="WhatsApp" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-gray-50 p-6 rounded-lg">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Engagement por Dispositivo
                    </h3>
                    <Monitor className="w-5 h-5 text-gray-500" />
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={reportData.deviceData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={120}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {reportData.deviceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {reportData.deviceData.map((item, index) => (
                      <div key={index} className="text-center">
                        <div 
                          className="w-3 h-3 rounded-full mx-auto mb-1" 
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-xs text-gray-600">{item.name}</span>
                        <div className="text-sm font-medium text-gray-900">{item.value}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Engagement Timeline */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Timeline de Engagement
                  </h3>
                  <Clock className="w-5 h-5 text-gray-500" />
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsLineChart data={reportData.campaignPerformance.length > 0 ? reportData.campaignPerformance : [{name: 'Sin datos', opens: 0, clicks: 0}]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="opens" stroke="#3B82F6" name="Aperturas" strokeWidth={3} />
                    <Line type="monotone" dataKey="clicks" stroke="#10B981" name="Clicks" strokeWidth={3} />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeTab === 'leads' && (
            <div className="space-y-6">
              {/* Lead Sources */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-6 rounded-lg">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Fuentes de Leads
                    </h3>
                    <Users className="w-5 h-5 text-gray-500" />
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={reportData.leadsBySource.length > 0 ? reportData.leadsBySource : [{name: 'Sin datos', value: 1, color: '#ccc', conversion: 0}]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={120}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {reportData.leadsBySource.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {reportData.leadsBySource.map((item, index) => (
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

                <div className="bg-gray-50 p-6 rounded-lg">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Conversión por Fuente
                    </h3>
                    <Target className="w-5 h-5 text-gray-500" />
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={reportData.leadsBySource} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} />
                      <Tooltip />
                      <Bar dataKey="conversion" fill="#8B5CF6" name="Conversión %" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Sales Pipeline */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Pipeline de Ventas
                  </h3>
                  <DollarSign className="w-5 h-5 text-gray-500" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {reportData.funnelData.map((stage, index) => (
                    <div key={index} className="text-center">
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <div className="text-2xl font-bold text-gray-900">{stage.value.toLocaleString()}</div>
                        <div className="text-sm text-gray-600 mt-1">{stage.name}</div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                          <div 
                            className="h-2 rounded-full transition-all duration-300"
                            style={{ 
                              width: `${(stage.value / reportData.funnelData[0].value) * 100}%`,
                              backgroundColor: stage.fill 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'customers' && (
            <div className="space-y-6">
              {/* Customer Satisfaction */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-6 rounded-lg">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Satisfacción del Cliente
                    </h3>
                    <Star className="w-5 h-5 text-gray-500" />
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={reportData.customerSatisfactionData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="aspect" />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} />
                      <Radar
                        name="Puntuación"
                        dataKey="score"
                        stroke="#8B5CF6"
                        fill="#8B5CF6"
                        fillOpacity={0.3}
                      />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-gray-50 p-6 rounded-lg">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Retención de Clientes
                    </h3>
                    <UserCheck className="w-5 h-5 text-gray-500" />
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsLineChart data={[
                      { month: 'Ene', week1: 100, week2: 85, week3: 72, week4: 65 },
                      { month: 'Feb', week1: 120, week2: 102, week3: 87, week4: 78 },
                      { month: 'Mar', week1: 95, week2: 81, week3: 69, week4: 62 },
                      { month: 'Abr', week1: 110, week2: 94, week3: 80, week4: 72 },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="week1" stroke="#3B82F6" name="Semana 1" />
                      <Line type="monotone" dataKey="week2" stroke="#10B981" name="Semana 2" />
                      <Line type="monotone" dataKey="week3" stroke="#F59E0B" name="Semana 3" />
                      <Line type="monotone" dataKey="week4" stroke="#EF4444" name="Semana 4" />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Customer Lifetime Value */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Valor de Vida del Cliente (CLV)
                  </h3>
                  <DollarSign className="w-5 h-5 text-gray-500" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">€2,450</div>
                    <div className="text-sm text-gray-600 mt-1">CLV Promedio</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">18</div>
                    <div className="text-sm text-gray-600 mt-1">Meses Promedio</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600">€136</div>
                    <div className="text-sm text-gray-600 mt-1">Valor Mensual</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-600">85%</div>
                    <div className="text-sm text-gray-600 mt-1">Tasa Retención</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'geographic' && (
            <div className="space-y-6">
              {/* Geographic Performance */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Rendimiento por País
                  </h3>
                  <MapPin className="w-5 h-5 text-gray-500" />
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          País
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Leads
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Conversiones
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tasa Conversión
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ingresos
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reportData.geographicData.map((country, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {country.country}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {country.leads}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {country.conversions}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {Math.round((country.conversions / country.leads) * 100)}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                            €{country.revenue.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Geographic Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-6 rounded-lg">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Distribución de Leads
                    </h3>
                    <Globe className="w-5 h-5 text-gray-500" />
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={reportData.geographicData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={120}
                        paddingAngle={5}
                        dataKey="leads"
                        nameKey="country"
                      >
                        {reportData.geographicData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-gray-50 p-6 rounded-lg">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Ingresos por Región
                    </h3>
                    <DollarSign className="w-5 h-5 text-gray-500" />
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={reportData.geographicData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="country" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="revenue" fill="#10B981" name="Ingresos (€)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className="space-y-6">
              {/* Advanced Analytics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-6 rounded-lg">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Análisis de Correlación
                    </h3>
                    <Activity className="w-5 h-5 text-gray-500" />
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart data={reportData.leadsBySource}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="value" name="Leads" />
                      <YAxis dataKey="conversion" name="Conversión %" />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                      <Scatter name="Fuentes" dataKey="conversion" fill="#8B5CF6" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-gray-50 p-6 rounded-lg">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Predicciones de Crecimiento
                    </h3>
                    <Zap className="w-5 h-5 text-gray-500" />
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Próximo mes</span>
                      <span className="text-lg font-semibold text-green-600">+18%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Próximo trimestre</span>
                      <span className="text-lg font-semibold text-blue-600">+45%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Próximo año</span>
                      <span className="text-lg font-semibold text-purple-600">+120%</span>
                    </div>
                    <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Recomendación:</strong> Incrementar inversión en WhatsApp marketing 
                        para maximizar el ROI basado en tendencias actuales.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Benchmarks */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Benchmarks de la Industria
                  </h3>
                  <BarChart3 className="w-5 h-5 text-gray-500" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{reportData.tasaApertura}%</div>
                    <div className="text-sm text-gray-600 mb-2">Tu Tasa de Apertura</div>
                    <div className="text-sm text-green-600">
                      +5% vs industria (20%)
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{reportData.tasaClick}%</div>
                    <div className="text-sm text-gray-600 mb-2">Tu Tasa de Click</div>
                    <div className="text-sm text-green-600">
                      +2% vs industria (3%)
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{reportData.tasaConversion}%</div>
                    <div className="text-sm text-gray-600 mb-2">Tu Tasa de Conversión</div>
                    <div className="text-sm text-red-600">
                      -3% vs industria (18%)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};