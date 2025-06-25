import React from 'react';
import { X, Mail, Phone, Shield, Building, MapPin, Calendar, Activity, User } from 'lucide-react';

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

interface UserDetailsModalProps {
  user: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
}

export const UserDetailsModal: React.FC<UserDetailsModalProps> = ({ 
  user, 
  isOpen, 
  onClose 
}) => {
  if (!isOpen || !user) return null;

  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'manager': return 'Gerente';
      case 'user': return 'Usuario';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      case 'user': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nunca';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Detalles del Usuario</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* User Header */}
          <div className="flex items-center space-x-6 mb-8">
            {user.avatar_url ? (
              <img 
                src={user.avatar_url} 
                alt={user.full_name}
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-blue-500 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">
                  {user.full_name.charAt(0)}
                </span>
              </div>
            )}
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{user.full_name}</h3>
              <p className="text-gray-600">{user.email}</p>
              <div className="flex items-center space-x-3 mt-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                  {getRoleText(user.role)}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {user.is_active ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
          </div>

          {/* User Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <h4 className="text-lg font-semibold text-gray-900">Información Personal</h4>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Email</p>
                    <p className="text-sm text-gray-600">{user.email}</p>
                  </div>
                </div>

                {user.phone && (
                  <div className="flex items-center space-x-3">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Teléfono</p>
                      <p className="text-sm text-gray-600">{user.phone}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-3">
                  <Shield className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Rol</p>
                    <p className="text-sm text-gray-600">{getRoleText(user.role)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h4 className="text-lg font-semibold text-gray-900">Información Laboral</h4>
              
              <div className="space-y-4">
                {user.department && (
                  <div className="flex items-center space-x-3">
                    <Building className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Departamento</p>
                      <p className="text-sm text-gray-600">{user.department}</p>
                    </div>
                  </div>
                )}

                {user.position && (
                  <div className="flex items-center space-x-3">
                    <MapPin className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Posición</p>
                      <p className="text-sm text-gray-600">{user.position}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Fecha de Creación</p>
                    <p className="text-sm text-gray-600">{formatDate(user.created_at)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Information */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Actividad</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{user.login_count}</div>
                <div className="text-sm text-gray-600">Inicios de Sesión</div>
              </div>
              
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900">
                  {user.last_login ? formatDate(user.last_login) : 'Nunca'}
                </div>
                <div className="text-sm text-gray-600">Último Login</div>
              </div>
              
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900">
                  {formatDate(user.updated_at)}
                </div>
                <div className="text-sm text-gray-600">Última Actualización</div>
              </div>
            </div>
          </div>

          {/* System Information */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Información del Sistema</h4>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">ID de Usuario:</span>
                  <span className="ml-2 text-gray-600 font-mono">{user.id}</span>
                </div>
                {user.user_id && (
                  <div>
                    <span className="font-medium text-gray-700">ID de Auth:</span>
                    <span className="ml-2 text-gray-600 font-mono">{user.user_id}</span>
                  </div>
                )}
                <div>
                  <span className="font-medium text-gray-700">Estado:</span>
                  <span className={`ml-2 ${user.is_active ? 'text-green-600' : 'text-red-600'}`}>
                    {user.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Creado:</span>
                  <span className="ml-2 text-gray-600">{formatDate(user.created_at)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};