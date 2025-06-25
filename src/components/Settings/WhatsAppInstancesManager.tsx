import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Plus, 
  Search, 
  RefreshCw, 
  Smartphone,
  QrCode,
  Trash2,
  Palette,
  CheckCircle,
  XCircle,
  AlertCircle,
  Save,
  X,
  AlertTriangle,
  Check
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useUserRole } from '../../hooks/useUserRole';
import toast from 'react-hot-toast';

interface WhatsAppInstance {
  id: string;
  name: string;
  color: string;
  status: 'connected' | 'disconnected' | 'connecting';
  qr_code: string | null;
  created_at: string;
  updated_at: string;
}

interface Webhook {
  id: string;
  name: string;
  url: string;
  description: string;
}

const colorOptions = [
  { name: 'Naranja', value: '#F97316' },
  { name: 'Azul', value: '#3B82F6' },
  { name: 'Morado', value: '#8B5CF6' },
  { name: 'Verde', value: '#10B981' },
  { name: 'Rojo', value: '#EF4444' },
  { name: 'Rosa', value: '#EC4899' },
  { name: 'Índigo', value: '#6366F1' },
  { name: 'Amarillo', value: '#F59E0B' }
];

export const WhatsAppInstancesManager: React.FC = () => {
  const { canEdit, canCreate, canDelete, loading: roleLoading } = useUserRole();
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'instances' | 'new'>('instances');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<WhatsAppInstance | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [webhookError, setWebhookError] = useState<string | null>(null);
  
  // Form state
  const [newInstanceName, setNewInstanceName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#3B82F6');
  const [creatingInstance, setCreatingInstance] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setWebhookError(null);
      await Promise.all([
        fetchInstances(),
        fetchWebhooks()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const fetchInstances = async () => {
    const { data, error } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    setInstances(data || []);
  };

  const fetchWebhooks = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_webhooks')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      setWebhooks(data || []);
      
      // Check if required webhooks exist
      const requiredWebhooks = ['crear-instancia', 'estatus-instancia', 'qr'];
      const missingWebhooks = requiredWebhooks.filter(name => 
        !data?.some(webhook => webhook.name === name)
      );
      
      if (missingWebhooks.length > 0) {
        setWebhookError(`Webhooks faltantes: ${missingWebhooks.join(', ')}`);
      }
    } catch (error) {
      console.error('Error fetching webhooks:', error);
      setWebhookError('Error al cargar la configuración de webhooks');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
    toast.success('Datos actualizados');
  };

  const handleCreateInstance = async () => {
    if (!newInstanceName.trim()) {
      toast.error('El nombre de la instancia es obligatorio');
      return;
    }

    try {
      setCreatingInstance(true);

      // Check if webhooks are available
      if (webhookError) {
        // Create instance without webhook integration
        const { data, error } = await supabase
          .from('whatsapp_instances')
          .insert([{
            name: newInstanceName.trim(),
            color: selectedColor,
            status: 'disconnected',
            qr_code: null,
            created_by: (await supabase.auth.getUser()).data.user?.id
          }])
          .select();

        if (error) throw error;

        toast.success('Instancia creada correctamente (sin integración de webhook)');
        setNewInstanceName('');
        setSelectedColor('#3B82F6');
        setActiveTab('instances');
        fetchInstances();
        return;
      }

      // Find the create instance webhook
      const createWebhook = webhooks.find(w => w.name === 'crear-instancia');
      if (!createWebhook) {
        throw new Error('No se encontró el webhook para crear instancias');
      }

      // Validate webhook URL
      if (!createWebhook.url || !createWebhook.url.startsWith('http')) {
        throw new Error('URL del webhook inválida');
      }

      // Call the webhook with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      try {
        const response = await fetch(createWebhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: newInstanceName.trim(),
            color: selectedColor
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          let errorMessage = 'Error del servidor';
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || `HTTP ${response.status}`;
          } catch {
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }

        // Create the instance in Supabase
        const { data, error } = await supabase
          .from('whatsapp_instances')
          .insert([{
            name: newInstanceName.trim(),
            color: selectedColor,
            status: 'disconnected',
            created_by: (await supabase.auth.getUser()).data.user?.id
          }])
          .select();

        if (error) throw error;

        toast.success('Instancia creada correctamente');
        setNewInstanceName('');
        setSelectedColor('#3B82F6');
        setActiveTab('instances');
        fetchInstances();

      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error('Timeout: El webhook tardó demasiado en responder');
        }
        
        // If webhook fails, create instance without webhook integration
        console.warn('Webhook failed, creating instance without integration:', fetchError);
        
        const { data, error } = await supabase
          .from('whatsapp_instances')
          .insert([{
            name: newInstanceName.trim(),
            color: selectedColor,
            status: 'disconnected',
            qr_code: null,
            created_by: (await supabase.auth.getUser()).data.user?.id
          }])
          .select();

        if (error) throw error;

        toast.success('Instancia creada (webhook no disponible - configuración manual requerida)');
        setNewInstanceName('');
        setSelectedColor('#3B82F6');
        setActiveTab('instances');
        fetchInstances();
      }

    } catch (error) {
      console.error('Error creating instance:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast.error(`Error al crear la instancia: ${errorMessage}`);
    } finally {
      setCreatingInstance(false);
    }
  };

  const handleDeleteInstance = async (instanceId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta instancia? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('whatsapp_instances')
        .delete()
        .eq('id', instanceId);

      if (error) throw error;

      toast.success('Instancia eliminada correctamente');
      fetchInstances();
    } catch (error) {
      console.error('Error deleting instance:', error);
      toast.error('Error al eliminar la instancia');
    }
  };

  const handleChangeColor = async (instanceId: string, newColor: string) => {
    try {
      const { error } = await supabase
        .from('whatsapp_instances')
        .update({ color: newColor })
        .eq('id', instanceId);

      if (error) throw error;

      setInstances(prev => 
        prev.map(instance => 
          instance.id === instanceId 
            ? { ...instance, color: newColor } 
            : instance
        )
      );
      
      setShowColorPicker(false);
      setSelectedInstance(null);
      toast.success('Color actualizado correctamente');
    } catch (error) {
      console.error('Error updating color:', error);
      toast.error('Error al actualizar el color');
    }
  };

  const handleConnectInstance = async (instance: WhatsAppInstance) => {
    try {
      setSelectedInstance(instance);
      
      // Find the QR webhook
      const qrWebhook = webhooks.find(w => w.name === 'qr');
      if (!qrWebhook) {
        toast.error('No se encontró el webhook para obtener el código QR');
        return;
      }

      // Call the webhook with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      try {
        const response = await fetch(qrWebhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: instance.name
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          let errorMessage = 'Error del servidor';
          try {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const errorData = await response.json();
              errorMessage = errorData.message || errorData.error || `HTTP ${response.status}`;
            } else {
              errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            }
          } catch {
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }

        // Check the content type of the response
        const contentType = response.headers.get('content-type');
        let responseData;

        if (contentType && contentType.includes('application/json')) {
          // Response is JSON
          responseData = await response.json();
        } else {
          // Response is plain text (likely a data URL)
          const textResponse = await response.text();
          
          // Check if it's a data URL for an image
          if (textResponse.startsWith('data:image/')) {
            responseData = { qrCode: textResponse };
          } else {
            // Try to parse as JSON in case content-type header is missing
            try {
              responseData = JSON.parse(textResponse);
            } catch {
              // If it's not JSON, treat it as a plain QR code string
              responseData = { qrCode: textResponse };
            }
          }
        }
        
        if (!responseData.qrCode) {
          throw new Error('No se recibió código QR del servidor');
        }

        // Update instance with QR code
        const { error } = await supabase
          .from('whatsapp_instances')
          .update({ 
            qr_code: responseData.qrCode,
            status: 'connecting'
          })
          .eq('id', instance.id);

        if (error) throw error;

        // Show QR code modal
        setQrCode(responseData.qrCode);
        setShowQrModal(true);
        
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error('Timeout: El webhook tardó demasiado en responder');
        }
        throw fetchError;
      }

    } catch (error) {
      console.error('Error getting QR code:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast.error(`Error al obtener código QR: ${errorMessage}`);
      setSelectedInstance(null);
    }
  };

  const handleCheckStatus = async () => {
    if (!selectedInstance) return;

    try {
      setCheckingStatus(true);

      // Find the status webhook
      const statusWebhook = webhooks.find(w => w.name === 'estatus-instancia');
      if (!statusWebhook) {
        toast.error('No se encontró el webhook para verificar el estado');
        return;
      }

      // Call the webhook with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      try {
        const response = await fetch(statusWebhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: selectedInstance.name
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          let errorMessage = 'Error del servidor';
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || `HTTP ${response.status}`;
          } catch {
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }

        const responseData = await response.json();

        // Update instance status
        const { error } = await supabase
          .from('whatsapp_instances')
          .update({ 
            status: responseData.status || 'disconnected'
          })
          .eq('id', selectedInstance.id);

        if (error) throw error;

        // Close modal and refresh instances
        setShowQrModal(false);
        setSelectedInstance(null);
        setQrCode(null);
        fetchInstances();
        
        toast.success('Estado actualizado correctamente');
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error('Timeout: El webhook tardó demasiado en responder');
        }
        throw fetchError;
      }

    } catch (error) {
      console.error('Error checking status:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast.error(`Error al verificar el estado: ${errorMessage}`);
    } finally {
      setCheckingStatus(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'disconnected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'connecting':
        return <RefreshCw className="w-5 h-5 text-yellow-500 animate-spin" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected':
        return 'Conectada';
      case 'disconnected':
        return 'Desconectada';
      case 'connecting':
        return 'Conectando...';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
          <h2 className="text-2xl font-bold text-gray-900">Instancias de WhatsApp</h2>
          <p className="text-gray-600 mt-1">
            Gestiona tus conexiones de WhatsApp para enviar y recibir mensajes
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
            onClick={() => setActiveTab('new')}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Instancia</span>
          </button>
        </div>
      </div>

      {/* Webhook Error Alert */}
      {webhookError && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">
                Configuración de Webhook Incompleta
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                {webhookError}. Las instancias se crearán sin integración automática.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('instances')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'instances'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Mis Instancias
            </button>
            <button
              onClick={() => setActiveTab('new')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'new'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Nueva Instancia
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'instances' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-6">Instancias Existentes</h3>
              
              {instances.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {instances.map((instance) => (
                    <div 
                      key={instance.id} 
                      className="border rounded-lg overflow-hidden"
                      style={{ borderColor: instance.color }}
                    >
                      <div className="p-4 flex items-start justify-between" style={{ backgroundColor: `${instance.color}20` }}>
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: instance.color }}
                          >
                            <MessageSquare className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{instance.name}</h4>
                            <p className="text-sm text-gray-500">Creada: {formatDate(instance.created_at)}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(instance.status)}
                        </div>
                      </div>

                      <div className="p-4 flex items-center justify-center bg-gray-50">
                        {instance.status === 'disconnected' ? (
                          <div className="text-center py-8">
                            <Smartphone className="mx-auto h-12 w-12 text-gray-400" />
                            <p className="mt-2 text-sm text-gray-500">Instancia desconectada</p>
                          </div>
                        ) : instance.status === 'connecting' ? (
                          <div className="text-center py-8">
                            <QrCode className="mx-auto h-12 w-12 text-gray-400" />
                            <p className="mt-2 text-sm text-gray-500">Escanea el código QR</p>
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                            <p className="mt-2 text-sm text-gray-500">Instancia conectada</p>
                          </div>
                        )}
                      </div>

                      <div className="p-4 border-t border-gray-200 bg-white">
                        <div className="grid grid-cols-2 gap-2">
                          {instance.status === 'disconnected' && (
                            <button
                              onClick={() => handleConnectInstance(instance)}
                              className="flex items-center justify-center space-x-1 p-2 border border-green-300 text-green-600 rounded-lg hover:bg-green-50 transition-colors"
                            >
                              <QrCode className="w-4 h-4" />
                              <span className="text-sm">Conectar instancia</span>
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedInstance(instance);
                              setShowColorPicker(true);
                            }}
                            className="flex items-center justify-center space-x-1 p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <Palette className="w-4 h-4" />
                            <span className="text-sm">Cambiar color</span>
                          </button>
                          <button
                            onClick={() => handleDeleteInstance(instance.id)}
                            className="flex items-center justify-center space-x-1 p-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="text-sm">Eliminar instancia</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No hay instancias</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Comienza creando tu primera instancia de WhatsApp.
                  </p>
                  <button
                    onClick={() => setActiveTab('new')}
                    className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 inline-flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Nueva Instancia</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'new' && (
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Crear Nueva Instancia</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Configure el nombre para su nueva instancia de WhatsApp.
                  </p>
                  {webhookError && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-700">
                        <AlertTriangle className="w-4 h-4 inline mr-1" />
                        La instancia se creará sin integración automática debido a problemas de configuración.
                      </p>
                    </div>
                  )}
                </div>

                <div className="p-6 space-y-6">
                  <div>
                    <label htmlFor="instance-name" className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre de la Instancia
                    </label>
                    <input
                      type="text"
                      id="instance-name"
                      value={newInstanceName}
                      onChange={(e) => setNewInstanceName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Mi Instancia"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Un nombre único para identificar esta instancia
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Color
                    </label>
                    <div className="grid grid-cols-8 gap-2">
                      {colorOptions.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setSelectedColor(color.value)}
                          className={`w-10 h-10 rounded-full border-2 ${
                            selectedColor === color.value ? 'border-gray-400' : 'border-gray-200'
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
                  <button
                    onClick={() => setActiveTab('instances')}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCreateInstance}
                    disabled={creatingInstance || !newInstanceName.trim()}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2 transition-colors"
                  >
                    {creatingInstance ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    <span>Crear Instancia</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Color Picker Modal */}
      {showColorPicker && selectedInstance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Cambiar Color
              </h2>
              <button
                onClick={() => {
                  setShowColorPicker(false);
                  setSelectedInstance(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selecciona un color para {selectedInstance.name}
                </label>
                <div className="grid grid-cols-4 gap-4">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => handleChangeColor(selectedInstance.id, color.value)}
                      className="w-16 h-16 rounded-full border-2 hover:scale-110 transition-transform"
                      style={{ 
                        backgroundColor: color.value,
                        borderColor: selectedInstance.color === color.value ? 'white' : 'transparent',
                        boxShadow: selectedInstance.color === color.value ? `0 0 0 2px ${color.value}` : 'none'
                      }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowColorPicker(false);
                  setSelectedInstance(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQrModal && selectedInstance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Conectar WhatsApp
              </h2>
              <button
                onClick={() => {
                  setShowQrModal(false);
                  setSelectedInstance(null);
                  setQrCode(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Escanea este código QR con tu WhatsApp
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Abre WhatsApp en tu teléfono, ve a Configuración &gt; Dispositivos vinculados &gt; Vincular un dispositivo
                </p>
                
                {qrCode && (
                  <div className="flex justify-center mb-4">
                    <img 
                      src={qrCode} 
                      alt="Código QR para WhatsApp" 
                      className="w-64 h-64 border border-gray-200 rounded-lg"
                    />
                  </div>
                )}
                
                <button
                  onClick={handleCheckStatus}
                  disabled={checkingStatus}
                  className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center space-x-2 transition-colors"
                >
                  {checkingStatus ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <CheckCircle className="w-5 h-5" />
                  )}
                  <span>Ya conecté mi WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};