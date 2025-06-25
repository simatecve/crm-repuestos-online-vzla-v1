import React, { useState, useEffect } from 'react';
import { Users, MessageSquare, TrendingUp, Target, Calendar, Mail, Phone, BarChart3 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import StatCard from './StatCard';

interface DashboardStats {
  totalContacts: number;
  totalLeads: number;
  totalCampaigns: number;
  totalMessages: number;
  activeUsers: number;
  conversionRate: number;
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
  }>;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalContacts: 0,
    totalLeads: 0,
    totalCampaigns: 0,
    totalMessages: 0,
    activeUsers: 0,
    conversionRate: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      if (contactsError) {
        console.warn('Error fetching contacts count:', contactsError);
      }

      // Fetch leads count
      const { count: leadsCount, error: leadsError } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true });

      if (leadsError) {
        console.warn('Error fetching leads count:', leadsError);
      }

      // Fetch campaigns count
      const { count: campaignsCount, error: campaignsError } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true });

      if (campaignsError) {
        console.warn('Error fetching campaigns count:', campaignsError);
      }

      // Fetch messages count
      const { count: messagesCount, error: messagesError } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true });

      if (messagesError) {
        console.warn('Error fetching messages count:', messagesError);
      }

      // Fetch active users count
      const { count: usersCount, error: usersError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      if (usersError) {
        console.warn('Error fetching users count:', usersError);
      }

      // Fetch recent activities
      const { data: activities, error: activitiesError } = await supabase
        .from('actividades')
        .select('id, accion, descripcion, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      if (activitiesError) {
        console.warn('Error fetching activities:', activitiesError);
      }

      // Calculate conversion rate (leads to contacts ratio)
      const conversionRate = contactsCount && leadsCount 
        ? Math.round((contactsCount / (contactsCount + leadsCount)) * 100)
        : 0;

      setStats({
        totalContacts: contactsCount || 0,
        totalLeads: leadsCount || 0,
        totalCampaigns: campaignsCount || 0,
        totalMessages: messagesCount || 0,
        activeUsers: usersCount || 0,
        conversionRate,
        recentActivity: activities?.map(activity => ({
          id: activity.id,
          type: activity.accion,
          description: activity.descripcion,
          timestamp: activity.created_at
        })) || []
      });

    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <button
          onClick={fetchDashboardStats}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Contacts"
          value={stats.totalContacts}
          icon={Users}
          color="blue"
          trend={stats.totalContacts > 0 ? 'up' : 'neutral'}
        />
        <StatCard
          title="Active Leads"
          value={stats.totalLeads}
          icon={Target}
          color="green"
          trend={stats.totalLeads > 0 ? 'up' : 'neutral'}
        />
        <StatCard
          title="Campaigns"
          value={stats.totalCampaigns}
          icon={Mail}
          color="purple"
          trend={stats.totalCampaigns > 0 ? 'up' : 'neutral'}
        />
        <StatCard
          title="Messages Sent"
          value={stats.totalMessages}
          icon={MessageSquare}
          color="orange"
          trend={stats.totalMessages > 0 ? 'up' : 'neutral'}
        />
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Active Users"
          value={stats.activeUsers}
          icon={Users}
          color="indigo"
          trend={stats.activeUsers > 0 ? 'up' : 'neutral'}
        />
        <StatCard
          title="Conversion Rate"
          value={`${stats.conversionRate}%`}
          icon={TrendingUp}
          color="emerald"
          trend={stats.conversionRate > 50 ? 'up' : stats.conversionRate > 25 ? 'neutral' : 'down'}
        />
        <StatCard
          title="Total Interactions"
          value={stats.totalContacts + stats.totalLeads}
          icon={BarChart3}
          color="rose"
          trend={(stats.totalContacts + stats.totalLeads) > 0 ? 'up' : 'neutral'}
        />
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        </div>
        <div className="p-6">
          {stats.recentActivity.length > 0 ? (
            <div className="space-y-4">
              {stats.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.type}
                    </p>
                    <p className="text-sm text-gray-500">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No recent activity</h3>
              <p className="mt-1 text-sm text-gray-500">
                Activity will appear here as users interact with the system.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;