import React from 'react';
import { 
  BarChart3, 
  Users, 
  Mail, 
  Target, 
  Settings, 
  Home,
  ChevronLeft,
  LogOut,
  UserCheck,
  FileText,
  Zap,
  Shield,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useUserRole } from '../../hooks/useUserRole';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  activeMenu: string;
  onMenuChange: (menu: string) => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Panel de Control', icon: Home },
  { id: 'leads', label: 'Gestión de Leads', icon: Target },
  { id: 'contactos', label: 'Gestión de Contactos', icon: Users },
  { id: 'campanas', label: 'Campañas de Marketing', icon: Mail },
  { id: 'automatizacion', label: 'Automatizaciones', icon: Zap },
  { id: 'crm', label: 'CRM - Conversaciones', icon: MessageSquare },
  { id: 'analisis', label: 'Análisis y Reportes', icon: BarChart3 },
  { id: 'reportes', label: 'Reportes Avanzados', icon: FileText },
  { id: 'usuarios', label: 'Gestión de Usuarios', icon: Shield, adminOnly: true },
  { id: 'configuracion', label: 'Configuración', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({ 
  isCollapsed, 
  onToggleCollapse, 
  activeMenu, 
  onMenuChange 
}) => {
  const { signOut } = useAuth();
  const { userRole, isAdmin } = useUserRole();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const getRoleText = (role: string | null) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'manager': return 'Gerente';
      case 'user': return 'Usuario';
      default: return 'Usuario';
    }
  };

  const getRoleColor = (role: string | null) => {
    switch (role) {
      case 'admin': return 'text-green-400';
      case 'manager': return 'text-blue-400';
      case 'user': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className={`bg-slate-900 text-white transition-all duration-300 flex flex-col ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Header */}
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        {!isCollapsed && (
          <div>
            <h1 className="text-xl font-bold text-blue-400">MarketingPro</h1>
            <p className="text-xs text-slate-400 mt-1">Sistema Integral</p>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <ChevronLeft className={`w-5 h-5 transition-transform ${
            isCollapsed ? 'rotate-180' : ''
          }`} />
        </button>
      </div>

      {/* User Role Indicator */}
      {!isCollapsed && (
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-slate-800">
              <UserCheck className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Rol Actual</p>
              <p className={`text-xs ${getRoleColor(userRole)}`}>
                {getRoleText(userRole)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeMenu === item.id;
            
            // Hide admin-only items for non-admin users
            if (item.adminOnly && !isAdmin) {
              return null;
            }
            
            return (
              <li key={item.id}>
                <button
                  onClick={() => onMenuChange(item.id)}
                  className={`w-full flex items-center px-3 py-3 rounded-lg transition-all duration-200 ${
                    isActive 
                      ? 'bg-blue-600 text-white shadow-lg' 
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon className={`w-5 h-5 ${isCollapsed ? '' : 'mr-3'}`} />
                  {!isCollapsed && (
                    <span className="font-medium">{item.label}</span>
                  )}
                  {item.adminOnly && !isCollapsed && (
                    <Shield className="w-3 h-3 ml-auto text-yellow-400" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-slate-700">
        <button
          onClick={handleSignOut}
          className={`w-full flex items-center px-3 py-3 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors ${
            isCollapsed ? 'justify-center' : ''
          }`}
          title={isCollapsed ? 'Cerrar Sesión' : undefined}
        >
          <LogOut className={`w-5 h-5 ${isCollapsed ? '' : 'mr-3'}`} />
          {!isCollapsed && <span>Cerrar Sesión</span>}
        </button>
      </div>
    </div>
  );
};