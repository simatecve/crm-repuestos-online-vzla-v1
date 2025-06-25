import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Mail, 
  Target, 
  TrendingUp,
  BarChart3,
  Calendar,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Eye
} from 'lucide-react';
import { StatCard } from './StatCard';
import { supabase } from '../../lib/supabase';
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
import toast from 'react-hot-toast';

interface DashboardStats {
  totalContacts: number;
  totalLeads: number;
  totalCampaigns: number;
  activeCampaigns: number;
  conversionRate: number;
  openRate: number;
  clickRate: number;
  totalRevenue: number;
  leadsBySource: {name: string, value: number, color: string}[];
  campaignPerformance: any[];
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalContacts: 0,
    totalLeads: 0,
    totalCampaigns: 0,
    activeCampaigns: 0,
    conversionRate: 0,
    openRate: 0,
    clickRate: 0,
    totalRevenue: 0,
    leadsBySource: [],
    campaignPerformance: []
  });
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('month'); // 'week', 'month', 'quarter', 'year'
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardStats();
  }, [timeframe]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Test Supabase connection first
      const { data: testData, error: testError } = await supabase
        .from('contacts')
        .select('id')
        .limit(1);

      if (testError) {
        throw new Error(`Database connection failed: ${testError.message}`);
      }
      
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

      // Fetch campaigns count
      const { count: campaignsCount, error: campaignsError } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true });

      if (campaignsError) throw campaignsError;

      // Fetch active campaigns
      const { count: activeCampaignsCount, error: activeCampaignsError } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'sent');

      if (activeCampaignsError) throw activeCampaignsError;

      // Fetch campaign performance data
      const { data: campaignsData, error: campaignsDataError } = await supabase
        .from('campaigns')
        .select('sent_count, open_count, click_count, created_at, type')
        .order('created_at', { ascending: true });

      if (campaignsDataError) throw campaignsDataError;

      // Fetch leads by source (using segment as a proxy for source)
      const { data: leadsBySourceData, error: leadsBySourceError } = await supabase
        .from('contacts')
        .select('segment')
        .not('segment', 'is', null);

      if (leadsBySourceError) throw leadsBySourceError;

      // Calculate conversion rate (example calculation)
      const { data: closedWonLeads, error: closedWonError } = await supabase
        .from('leads')
        .select('id')
        .eq('stage', 'cerrado_ganado');

      if (closedWonError) throw closedWonError;

      const conversionRate = leadsCount > 0 ? Math.round((closedWonLeads?.length || 0) / leadsCount * 100) : 0;

      // Calculate average open rate and click rate
      let openRate = 0;
      let clickRate = 0;
      let totalRevenue = 0;

      if (campaignsData && campaignsData.length > 0) {
        const totalSent = campaignsData.reduce((sum, c) => sum + (c.sent_count || 0), 0);
        const totalOpened = campaignsData.reduce((sum, c) => sum + (c.open_count || 0), 0);
        const totalClicks = campaignsData.reduce((sum, c) => sum + (c.click_count || 0), 0);
        
        openRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;
        clickRate = totalSent > 0 ? Math.round((totalClicks / totalSent) * 100) : 0;
      }

      // Calculate total revenue from leads
      const { data: leadsData, error: leadsDataError } = await supabase
        .from('leads')
        .select('value');

      if (leadsDataError) throw leadsDataError;

      if (leadsData) {
        totalRevenue = leadsData.reduce((sum, lead) => sum + (lead.value || 0), 0);
      }

      // Process campaign performance data by month
      const processedCampaignData = processCampaignData(campaignsData || []);

      // Process leads by source data
      const leadsBySource = processLeadsBySource(leadsBySourceData || []);

      setStats({
        totalContacts: contactsCount || 0,
        totalLeads: leadsCount || 0,
        totalCampaigns: campaignsCount || 0,
        activeCampaigns: activeCampaignsCount || 0,
        conversionRate,
        openRate,
        clickRate,
        totalRevenue,
        leadsBySource,
        campaignPerformance: processedCampaignData
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch dashboard data');
      toast.error('Error al cargar las estadísticas del dashboard');
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
          clicks: 0
        };
      }
      
      if (campaign.type === 'email') {
        monthlyData[monthYear].emails += campaign.sent_count || 0;
      } else if (campaign.type === 'whatsapp') {
        monthlyData[monthYear].whatsapp += campaign.sent_count || 0;
      }
      
      monthlyData[monthYear].opens += campaign.open_count || 0;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error loading dashboard
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={fetchDashboardStats}
                  className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm font-medium transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">¡Bienvenido al Panel de Control!</h1>
            <p className="text-blue-100">
              Aquí tienes un resumen de tu actividad de marketing y ventas.
            </p>
          </div>
          <div className="hidden md:block">
            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <BarChart3 className="w-12 h-12" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Contactos"
          value={stats.totalContacts.toLocaleString()}
          change="+12.5%"
          changeType="positive"
          icon={Users}
          color="bg-blue-500"
        />
        <StatCard
          title="Campañas Activas"
          value={stats.activeCampaigns.toString()}
          change={`${stats.totalCampaigns} total`}
          changeType="neutral"
          icon={Mail}
          color="bg-green-500"
        />
        <StatCard
          title="Leads Generados"
          value={stats.totalLeads.toLocaleString()}
          change="+8.2%"
          changeType="positive"
          icon={Target}
          color="bg-purple-500"
        />
        <StatCard
          title="Tasa de Apertura"
          value={`${stats.openRate}%`}
          change={stats.clickRate > 0 ? `${stats.clickRate}% clicks` : "-"}
          changeType="neutral"
          icon={Eye}
          color="bg-orange-500"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Campaign Performance */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Rendimiento de Campañas
            </h3>
            <div className="flex items-center space-x-2">
              <select 
                className="text-sm border border-gray-300 rounded-md px-2 py-1"
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
              >
                <option value="month">Mensual</option>
                <option value="quarter">Trimestral</option>
                <option value="year">Anual</option>
              </select>
              <BarChart3 className="w-5 h-5 text-gray-500" />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.campaignPerformance.length > 0 ? stats.campaignPerformance : [{name: 'Sin datos', emails: 0, whatsapp: 0}]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="emails" fill="#3B82F6" name="Emails" />
              <Bar dataKey="whatsapp" fill="#10B981" name="WhatsApp" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Lead Sources */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Fuentes de Leads
            </h3>
            <Activity className="w-5 h-5 text-gray-500" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stats.leadsBySource.length > 0 ? stats.leadsBySource : [{name: 'Sin datos', value: 1, color: '#ccc'}]}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={5}
                dataKey="value"
              >
                {stats.leadsBySource.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-2 gap-4">
            {stats.leadsBySource.map((item, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-gray-600">{item.name}</span>
                <span className="text-sm font-medium text-gray-900">{item.value}</span>
              </div>
            ))}
            {stats.leadsBySource.length === 0 && (
              <div className="col-span-2 text-center text-gray-500 text-sm">
                No hay datos de fuentes de leads disponibles
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Engagement Trends */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Tendencias de Engagement
          </h3>
          <TrendingUp className="w-5 h-5 text-gray-500" />
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={stats.campaignPerformance.length > 0 ? stats.campaignPerformance : [{name: 'Sin datos', opens: 0, clicks: 0}]}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Area 
              type="monotone" 
              dataKey="opens" 
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

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Actividad Reciente
              </h3>
              <Calendar className="w-5 h-5 text-gray-500" />
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {/* Fetch real activity data here */}
              <div className="flex items-start space-x-4">
                <div className="p-2 rounded-lg bg-gray-100 text-blue-600">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    Nueva campaña de email creada
                  </p>
                  <p className="text-sm text-gray-600">Promoción de Verano 2025</p>
                  <p className="text-xs text-gray-400 mt-1">Hace 2 horas</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="p-2 rounded-lg bg-gray-100 text-green-600">
                  <Target className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    Lead convertido a cliente
                  </p>
                  <p className="text-sm text-gray-600">María González - €{stats.totalRevenue > 0 ? (stats.totalRevenue / stats.totalLeads).toFixed(0) : 5000}</p>
                  <p className="text-xs text-gray-400 mt-1">Hace 4 horas</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">
              Acciones Rápidas
            </h3>
          </div>
          <div className="p-6 space-y-4">
            <button className="w-full bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-3">
              <Plus className="w-5 h-5" />
              <span className="font-medium">Nueva Campaña</span>
            </button>
            
            <button className="w-full bg-green-600 text-white p-4 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-3">
              <Users className="w-5 h-5" />
              <span className="font-medium">Agregar Contacto</span>
            </button>
            
            <button className="w-full bg-purple-600 text-white p-4 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-3">
              <Target className="w-5 h-5" />
              <span className="font-medium">Nuevo Lead</span>
            </button>
            
            <button className="w-full bg-orange-600 text-white p-4 rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-3">
              <BarChart3 className="w-5 h-5" />
              <span className="font-medium">Ver Reportes</span>
            </button>
          </div>
        </div>
      </div>

      {/* Performance Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">
            Resumen de Rendimiento
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {stats.conversionRate}%
              </div>
              <div className="text-sm text-gray-600 mb-2">Tasa de Conversión</div>
              <div className="flex items-center justify-center text-sm text-green-600">
                <ArrowUpRight className="w-4 h-4 mr-1" />
                +2.3% vs mes anterior
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {stats.openRate}%
              </div>
              <div className="text-sm text-gray-600 mb-2">Tasa de Apertura</div>
              <div className="flex items-center justify-center text-sm text-red-600">
                <ArrowDownRight className="w-4 h-4 mr-1" />
                -1.2% vs mes anterior
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                €{stats.totalRevenue.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 mb-2">Valor Pipeline</div>
              <div className="flex items-center justify-center text-sm text-green-600">
                <ArrowUpRight className="w-4 h-4 mr-1" />
                +15.7% vs mes anterior
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;