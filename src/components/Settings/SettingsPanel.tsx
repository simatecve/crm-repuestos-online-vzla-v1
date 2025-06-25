import React, { useState } from 'react';
import { 
  Settings, 
  User, 
  Shield, 
  Bell, 
  Mail, 
  MessageSquare, 
  Database,
  CreditCard,
  HelpCircle,
  FileText,
  Zap,
  Target,
  List,
  ChevronRight
} from 'lucide-react';
import { LeadScoringPanel } from '../Leads/LeadScoringPanel';
import { CustomFieldsManager } from '../Leads/CustomFieldsManager';

export const SettingsPanel: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const settingsSections = [
    {
      id: 'account',
      title: 'Cuenta y Perfil',
      icon: User,
      description: 'Gestiona tu información personal y preferencias de cuenta'
    },
    {
      id: 'security',
      title: 'Seguridad',
      icon: Shield,
      description: 'Configura contraseñas, autenticación de dos factores y permisos'
    },
    {
      id: 'notifications',
      title: 'Notificaciones',
      icon: Bell,
      description: 'Personaliza tus preferencias de notificaciones'
    },
    {
      id: 'email',
      title: 'Configuración de Email',
      icon: Mail,
      description: 'Configura tus cuentas de correo y plantillas'
    },
    {
      id: 'whatsapp',
      title: 'Configuración de WhatsApp',
      icon: MessageSquare,
      description: 'Conecta y gestiona tus cuentas de WhatsApp Business'
    },
    {
      id: 'database',
      title: 'Base de Datos',
      icon: Database,
      description: 'Gestiona la estructura y configuración de tu base de datos'
    },
    {
      id: 'billing',
      title: 'Facturación y Suscripción',
      icon: CreditCard,
      description: 'Gestiona tu plan, pagos y facturas'
    },
    {
      id: 'custom_fields',
      title: 'Campos Personalizados',
      icon: List,
      description: 'Configura campos personalizados para contactos y leads'
    },
    {
      id: 'lead_scoring',
      title: 'Puntuación de Leads',
      icon: Target,
      description: 'Configura reglas para puntuar automáticamente tus leads'
    },
    {
      id: 'automation',
      title: 'Automatizaciones',
      icon: Zap,
      description: 'Configura flujos de trabajo y reglas de automatización'
    },
    {
      id: 'help',
      title: 'Ayuda y Soporte',
      icon: HelpCircle,
      description: 'Obtén ayuda y recursos de soporte'
    },
    {
      id: 'terms',
      title: 'Términos y Políticas',
      icon: FileText,
      description: 'Revisa nuestros términos de servicio y políticas de privacidad'
    }
  ];

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'custom_fields':
        return <CustomFieldsManager />;
      case 'lead_scoring':
        return <LeadScoringPanel />;
      default:
        return (
          <div className="text-center py-12">
            <Settings className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Sección en desarrollo</h3>
            <p className="mt-1 text-sm text-gray-500">
              Esta sección estará disponible próximamente.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      {!activeSection && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Configuración del Sistema</h2>
          <p className="text-gray-600 mt-1">
            Personaliza y configura todos los aspectos de tu sistema de marketing
          </p>
        </div>
      )}

      {activeSection ? (
        <div>
          <button
            onClick={() => setActiveSection(null)}
            className="mb-6 flex items-center text-blue-600 hover:text-blue-800"
          >
            <ChevronRight className="w-5 h-5 rotate-180 mr-1" />
            <span>Volver a Configuración</span>
          </button>
          
          {renderActiveSection()}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {settingsSections.map((section) => {
            const Icon = section.icon;
            return (
              <div
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start space-x-4">
                  <div className="p-3 rounded-lg bg-blue-100">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{section.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{section.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};