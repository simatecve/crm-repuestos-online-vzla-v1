import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginForm } from './components/Auth/LoginForm';
import { Sidebar } from './components/Layout/Sidebar';
import { Header } from './components/Layout/Header';
import { Dashboard } from './components/Dashboard/Dashboard';
import { KanbanBoard } from './components/Leads/KanbanBoard';
import { ContactsManager } from './components/Contacts/ContactsManager';
import { CampaignsManager } from './components/Campaigns/CampaignsManager';
import { AnalyticsPanel } from './components/Analytics/AnalyticsPanel';
import { ReportsPanel } from './components/Reports/ReportsPanel';
import { SettingsPanel } from './components/Settings/SettingsPanel';
import { AutomationPanel } from './components/Automation/AutomationPanel';
import { UserManagement } from './components/Users/UserManagement';
import { CRMPanel } from './components/CRM/CRMPanel';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeMenu, setActiveMenu] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  const getPageTitle = (menu: string) => {
    const titles: Record<string, string> = {
      dashboard: 'Panel de Control',
      leads: 'Gestión de Leads',
      contactos: 'Gestión de Contactos',
      campanas: 'Campañas de Marketing',
      automatizacion: 'Automatizaciones',
      crm: 'CRM - Conversaciones',
      analisis: 'Análisis y Reportes',
      reportes: 'Reportes Avanzados',
      usuarios: 'Gestión de Usuarios',
      configuracion: 'Configuración del Sistema'
    };
    return titles[menu] || 'Panel de Control';
  };

  const renderContent = () => {
    switch (activeMenu) {
      case 'dashboard':
        return <Dashboard />;
      case 'leads':
        return <KanbanBoard />;
      case 'contactos':
        return <ContactsManager />;
      case 'campanas':
        return <CampaignsManager />;
      case 'automatizacion':
        return <AutomationPanel />;
      case 'crm':
        return <CRMPanel />;
      case 'analisis':
        return <AnalyticsPanel />;
      case 'reportes':
        return <ReportsPanel />;
      case 'usuarios':
        return <UserManagement />;
      case 'configuracion':
        return <SettingsPanel />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <Sidebar
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        activeMenu={activeMenu}
        onMenuChange={setActiveMenu}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeMenu !== 'crm' && <Header title={getPageTitle(activeMenu)} />}
        
        <main className={`flex-1 overflow-y-auto ${activeMenu !== 'crm' ? 'p-6' : ''}`}>
          {renderContent()}
        </main>
      </div>
      
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;