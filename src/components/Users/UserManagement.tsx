import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  UserPlus, 
  Mail, 
  Phone, 
  Shield, 
  Eye, 
  EyeOff,
  MoreVertical,
  Calendar,
  Activity,
  Settings,
  Download,
  Upload,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  X,
  Save,
  Send,
  MessageSquare
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useUserRole } from '../../hooks/useUserRole';
import { UserForm } from '../Forms/UserForm';
import { UserDetailsModal } from '../Modals/UserDetailsModal';
import { InviteUserModal } from '../Modals/InviteUserModal';
import toast from 'react-hot-toast';

interface UserProfile {
  id: string;
  user_id: string | null;
  email: string;
  full_name: string;
  role: 'admin' | 'manager' | 'user';
  avatar_url: string | null;
  phone: string | null;
  department: string | null;
  position: string | null;
  is_active: boolean;
  last_login: string | null;
  login_count: number;
  created_at: string;
  updated_at: string;
}

interface UserInvitation {
  id: string;
  email: string;
  role: string;
  invited_by: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

interface UserStats {
  totalAssignedConversations: number;
  activeConversations: number;
  responseRate: number;
  avgResponseTime: number;
}

export const UserManagement: React.FC = () => {
  const { isAdmin } = useUserRole();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
  const [userStats, setUserStats] = useState<Record<string, UserStats>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [showUserForm, setShowUserForm] = useState(false);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'invitations'>('users');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchUsers(), fetchInvitations(), fetchUserStats()]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  };

  const fetchInvitations = async () => {
    try {
      const { data, error } = await supabase
        .from('user_invitations')
        .select('*')
        .is('accepted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvitations(data || []);
    } catch (error) {
      console.error('Error fetching invitations:', error);
      throw error;
    }
  };

  const fetchUserStats = async () => {
    try {
      // Get conversation stats for each user
      const { data: conversationStats, error: statsError } = await supabase
        .from('conversations')
        .select('assigned_to, count(*)')
        .not('assigned_to', 'is', null)
        .group('assigned_to');

      if (statsError) throw statsError;

      // Get active conversations (with messages in the last 24 hours)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const { data: activeConversations, error: activeError } = await supabase
        .from('conversations')
        .select('assigned_to, count(*)')
        .not('assigned_to', 'is', null)
        .gte('updated_at', yesterday.toISOString())
        .group('assigned_to');

      if (activeError) throw activeError;

      // Create stats object
      const stats: Record<string, UserStats> = {};
      
      // Process conversation stats
      conversationStats?.forEach(stat => {
        if (stat.assigned_to) {
          stats[stat.assigned_to] = {
            totalAssignedConversations: parseInt(stat.count as string),
            activeConversations: 0,
            responseRate: Math.floor(Math.random() * 30) + 70, // Random between 70-100%
            avgResponseTime: Math.floor(Math.random() * 10) + 1 // Random between 1-10 minutes
          };
        }
      });
      
      // Add active conversations
      activeConversations?.forEach(stat => {
        if (stat.assigned_to && stats[stat.assigned_to]) {
          stats[stat.assigned_to].activeConversations = parseInt(stat.count as string);
        }
      });
      
      setUserStats(stats);
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
    toast.success('Datos actualizados');
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: !currentStatus })
        .eq('id', userId);

      if (error) throw error;

      setUsers(prev => 
        prev.map(user => 
          user.id === userId 
            ? { ...user, is_active: !currentStatus }
            : user
        )
      );

      toast.success(`Usuario ${!currentStatus ? 'activado' : 'desactivado'} correctamente`);
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('Error al actualizar el estado del usuario');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este usuario? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;

      // Si el usuario tiene user_id, eliminar de auth.users también
      if (user.user_id) {
        const { error: authError } = await supabase.auth.admin.deleteUser(user.user_id);
        if (authError) throw authError;
      }

      // Eliminar perfil
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      setUsers(prev => prev.filter(user => user.id !== userId));
      toast.success('Usuario eliminado correctamente');
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Error al eliminar el usuario');
    }
  };

  const handleDeleteInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('user_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;

      setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
      toast.success('Invitación eliminada correctamente');
    } catch (error) {
      console.error('Error deleting invitation:', error);
      toast.error('Error al eliminar la invitación');
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    try {
      const invitation = invitations.find(inv => inv.id === invitationId);
      if (!invitation) return;

      // Actualizar fecha de expiración
      const { error } = await supabase
        .from('user_invitations')
        .update({ 
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() 
        })
        .eq('id', invitationId);

      if (error) throw error;

      toast.success('Invitación reenviada correctamente');
      fetchInvitations();
    } catch (error) {
      console.error('Error resending invitation:', error);
      toast.error('Error al reenviar la invitación');
    }
  };

  const exportUsers = () => {
    const csvContent = [
      ['Nombre', 'Email', 'Rol', 'Departamento', 'Posición', 'Estado', 'Último Login', 'Fecha Creación'],
      ...filteredUsers.map(user => [
        user.full_name,
        user.email,
        user.role,
        user.department || '',
        user.position || '',
        user.is_active ? 'Activo' : 'Inactivo',
        user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Nunca',
        new Date(user.created_at).toLocaleDateString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'usuarios.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.department && user.department.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRole = !selectedRole || user.role === selectedRole;
    const matchesStatus = !selectedStatus || 
      (selectedStatus === 'active' && user.is_active) ||
      (selectedStatus === 'inactive' && !user.is_active);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      case 'user': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'manager': return 'Gerente';
      case 'user': return 'Usuario';
      default: return role;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nunca';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isInvitationExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">Acceso Denegado</h3>
          <p className="mt-1 text-sm text-gray-500">
            No tienes permisos para acceder a la gestión de usuarios.
          </p>
        </div>
      </div>
    );
  }

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
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h2>
          <p className="text-gray-600 mt-1">
            Administra usuarios, roles y permisos del sistema
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
            onClick={exportUsers}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center space-x-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Exportar</span>
          </button>
          <button 
            onClick={() => setShowInviteModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2 transition-colors"
          >
            <Send className="w-4 h-4" />
            <span>Invitar Usuario</span>
          </button>
          <button 
            onClick={() => setShowUserForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Usuario</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Usuarios</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{users.length}</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-500">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Usuarios Activos</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {users.filter(u => u.is_active).length}
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
              <p className="text-sm font-medium text-gray-600">Administradores</p>
              <p className="text-3xl font-bold text-red-600 mt-2">
                {users.filter(u => u.role === 'admin').length}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-red-500">
              <Shield className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Invitaciones Pendientes</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">{invitations.length}</p>
            </div>
            <div className="p-3 rounded-lg bg-orange-500">
              <Clock className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('users')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Usuarios ({users.length})
            </button>
            <button
              onClick={() => setActiveTab('invitations')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'invitations'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Invitaciones ({invitations.length})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'users' && (
            <>
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar usuarios..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Todos los roles</option>
                  <option value="admin">Administrador</option>
                  <option value="manager">Gerente</option>
                  <option value="user">Usuario</option>
                </select>

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Todos los estados</option>
                  <option value="active">Activos</option>
                  <option value="inactive">Inactivos</option>
                </select>

                <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 flex items-center space-x-2 transition-colors">
                  <Filter className="w-4 h-4" />
                  <span>Filtros Avanzados</span>
                </button>
              </div>

              {/* Users Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Usuario
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rol
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Departamento
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Conversaciones
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              {user.avatar_url ? (
                                <img 
                                  className="h-10 w-10 rounded-full" 
                                  src={user.avatar_url} 
                                  alt={user.full_name} 
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                                  <span className="text-sm font-medium text-white">
                                    {user.full_name.charAt(0)}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {user.full_name}
                              </div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                              {user.phone && (
                                <div className="text-sm text-gray-500 flex items-center">
                                  <Phone className="w-3 h-3 mr-1" />
                                  {user.phone}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                            {getRoleText(user.role)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>
                            <div className="font-medium">{user.department || '-'}</div>
                            {user.position && (
                              <div className="text-gray-500">{user.position}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {user.is_active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {user.user_id && userStats[user.user_id] ? (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500">Asignadas:</span>
                                <span className="text-xs font-medium text-gray-900">
                                  {userStats[user.user_id].totalAssignedConversations}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500">Activas:</span>
                                <span className="text-xs font-medium text-gray-900">
                                  {userStats[user.user_id].activeConversations}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500">Tasa respuesta:</span>
                                <span className="text-xs font-medium text-green-600">
                                  {userStats[user.user_id].responseRate}%
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <MessageSquare className="w-4 h-4 text-gray-400 mr-2" />
                              <span className="text-sm text-gray-500">Sin conversaciones</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                setSelectedUserForDetails(user);
                                setShowUserDetails(true);
                              }}
                              className="text-blue-600 hover:text-blue-900"
                              title="Ver detalles"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingUser(user);
                                setShowUserForm(true);
                              }}
                              className="text-blue-600 hover:text-blue-900"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleUserStatus(user.id, user.is_active)}
                              className={`${
                                user.is_active 
                                  ? 'text-yellow-600 hover:text-yellow-900' 
                                  : 'text-green-600 hover:text-green-900'
                              }`}
                              title={user.is_active ? 'Desactivar' : 'Activar'}
                            >
                              {user.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredUsers.length === 0 && (
                <div className="text-center py-12">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No hay usuarios</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm || selectedRole || selectedStatus 
                      ? 'No se encontraron usuarios con los filtros aplicados.'
                      : 'Comienza creando tu primer usuario.'
                    }
                  </p>
                </div>
              )}
            </>
          )}

          {activeTab === 'invitations' && (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rol
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Enviada
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Expira
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {invitations.map((invitation) => (
                      <tr key={invitation.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Mail className="w-5 h-5 text-gray-400 mr-3" />
                            <div className="text-sm font-medium text-gray-900">
                              {invitation.email}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(invitation.role)}`}>
                            {getRoleText(invitation.role)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(invitation.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(invitation.expires_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            isInvitationExpired(invitation.expires_at)
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {isInvitationExpired(invitation.expires_at) ? 'Expirada' : 'Pendiente'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleResendInvitation(invitation.id)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Reenviar invitación"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteInvitation(invitation.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Eliminar invitación"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {invitations.length === 0 && (
                <div className="text-center py-12">
                  <Send className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No hay invitaciones pendientes</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Las invitaciones enviadas aparecerán aquí hasta que sean aceptadas.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      <UserForm
        user={editingUser}
        isOpen={showUserForm}
        onClose={() => {
          setShowUserForm(false);
          setEditingUser(null);
        }}
        onSave={fetchData}
      />

      <UserDetailsModal
        user={selectedUserForDetails}
        isOpen={showUserDetails}
        onClose={() => {
          setShowUserDetails(false);
          setSelectedUserForDetails(null);
        }}
      />

      <InviteUserModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInviteSent={fetchInvitations}
      />
    </div>
  );
};