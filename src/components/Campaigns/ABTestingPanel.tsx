import React, { useState, useEffect } from 'react';
import { 
  Split, 
  BarChart3, 
  Edit, 
  Trash2, 
  Plus, 
  Save,
  X,
  Copy,
  Mail,
  MessageSquare,
  Eye,
  MousePointer,
  CheckCircle,
  Target,
  Zap,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface Campaign {
  id: string;
  name: string;
  type: 'email' | 'whatsapp';
  subject: string;
  content: string;
  status: 'draft' | 'scheduled' | 'sent' | 'paused';
  is_ab_test: boolean;
  ab_test_config?: any;
}

interface Variant {
  id: string;
  campaign_id: string;
  name: string;
  subject: string | null;
  content: string | null;
  weight: number;
  sent_count: number;
  open_count: number;
  click_count: number;
  conversion_count: number;
  is_winner: boolean;
}

export const ABTestingPanel: React.FC<{
  campaign: Campaign;
  onClose: () => void;
  onSave: () => void;
}> = ({ campaign, onClose, onSave }) => {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingVariant, setEditingVariant] = useState<Variant | null>(null);
  const [showVariantForm, setShowVariantForm] = useState(false);
  const [abTestConfig, setAbTestConfig] = useState({
    testDuration: 24, // hours
    sampleSize: 30, // percentage
    winningCriteria: 'open_rate', // open_rate, click_rate, conversion_rate
    autoSendWinner: true
  });
  
  // Form state for variant
  const [variantForm, setVariantForm] = useState<Partial<Variant>>({
    name: '',
    subject: '',
    content: '',
    weight: 50
  });

  useEffect(() => {
    fetchVariants();
    
    // Initialize AB test config from campaign if available
    if (campaign.ab_test_config) {
      try {
        const config = typeof campaign.ab_test_config === 'string' 
          ? JSON.parse(campaign.ab_test_config) 
          : campaign.ab_test_config;
        
        setAbTestConfig({
          testDuration: config.testDuration || 24,
          sampleSize: config.sampleSize || 30,
          winningCriteria: config.winningCriteria || 'open_rate',
          autoSendWinner: config.autoSendWinner !== false
        });
      } catch (error) {
        console.error('Error parsing AB test config:', error);
      }
    }
  }, [campaign.id]);

  const fetchVariants = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ab_test_variants')
        .select('*')
        .eq('campaign_id', campaign.id)
        .order('name');

      if (error) throw error;
      setVariants(data || []);
      
      // If no variants exist, create the control variant based on the campaign
      if (!data || data.length === 0) {
        await createControlVariant();
      }
    } catch (error) {
      console.error('Error fetching variants:', error);
      toast.error('Error al cargar las variantes');
    } finally {
      setLoading(false);
    }
  };

  const createControlVariant = async () => {
    try {
      const { data, error } = await supabase
        .from('ab_test_variants')
        .insert([{
          campaign_id: campaign.id,
          name: 'Variante A (Control)',
          subject: campaign.subject,
          content: campaign.content,
          weight: 50,
          sent_count: 0,
          open_count: 0,
          click_count: 0,
          conversion_count: 0,
          is_winner: false
        }])
        .select();

      if (error) throw error;
      
      if (data && data.length > 0) {
        setVariants([data[0]]);
      }
    } catch (error) {
      console.error('Error creating control variant:', error);
      toast.error('Error al crear la variante de control');
    }
  };

  const handleSaveVariant = async () => {
    if (!variantForm.name || !variantForm.content) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    try {
      setSaving(true);
      
      if (editingVariant?.id) {
        // Update existing variant
        const { error } = await supabase
          .from('ab_test_variants')
          .update({
            name: variantForm.name,
            subject: campaign.type === 'email' ? variantForm.subject : null,
            content: variantForm.content,
            weight: variantForm.weight
          })
          .eq('id', editingVariant.id);

        if (error) throw error;
        toast.success('Variante actualizada correctamente');
      } else {
        // Create new variant
        const { error } = await supabase
          .from('ab_test_variants')
          .insert([{
            campaign_id: campaign.id,
            name: variantForm.name,
            subject: campaign.type === 'email' ? variantForm.subject : null,
            content: variantForm.content,
            weight: variantForm.weight,
            sent_count: 0,
            open_count: 0,
            click_count: 0,
            conversion_count: 0,
            is_winner: false
          }]);

        if (error) throw error;
        toast.success('Variante creada correctamente');
      }

      setShowVariantForm(false);
      setEditingVariant(null);
      setVariantForm({
        name: '',
        subject: '',
        content: '',
        weight: 50
      });
      fetchVariants();
    } catch (error) {
      console.error('Error saving variant:', error);
      toast.error('Error al guardar la variante');
    } finally {
      setSaving(false);
    }
  };

  const handleEditVariant = (variant: Variant) => {
    setEditingVariant(variant);
    setVariantForm({
      name: variant.name,
      subject: variant.subject || '',
      content: variant.content || '',
      weight: variant.weight
    });
    setShowVariantForm(true);
  };

  const handleDeleteVariant = async (variantId: string) => {
    // Don't allow deleting if there's only one variant
    if (variants.length <= 1) {
      toast.error('No puedes eliminar la única variante');
      return;
    }

    if (!confirm('¿Estás seguro de que quieres eliminar esta variante?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('ab_test_variants')
        .delete()
        .eq('id', variantId);

      if (error) throw error;
      
      toast.success('Variante eliminada correctamente');
      fetchVariants();
    } catch (error) {
      console.error('Error deleting variant:', error);
      toast.error('Error al eliminar la variante');
    }
  };

  const handleDuplicateVariant = async (variant: Variant) => {
    try {
      const { error } = await supabase
        .from('ab_test_variants')
        .insert([{
          campaign_id: campaign.id,
          name: `${variant.name} (Copia)`,
          subject: variant.subject,
          content: variant.content,
          weight: variant.weight,
          sent_count: 0,
          open_count: 0,
          click_count: 0,
          conversion_count: 0,
          is_winner: false
        }]);

      if (error) throw error;
      
      toast.success('Variante duplicada correctamente');
      fetchVariants();
    } catch (error) {
      console.error('Error duplicating variant:', error);
      toast.error('Error al duplicar la variante');
    }
  };

  const handleSaveABTest = async () => {
    try {
      setSaving(true);
      
      // Update campaign with AB test config
      const { error } = await supabase
        .from('campaigns')
        .update({
          is_ab_test: true,
          ab_test_config: abTestConfig
        })
        .eq('id', campaign.id);

      if (error) throw error;
      
      toast.success('Configuración de prueba A/B guardada correctamente');
      onSave();
    } catch (error) {
      console.error('Error saving AB test:', error);
      toast.error('Error al guardar la prueba A/B');
    } finally {
      setSaving(false);
    }
  };

  const calculateOpenRate = (variant: Variant) => {
    if (variant.sent_count === 0) return 0;
    return Math.round((variant.open_count / variant.sent_count) * 100);
  };

  const calculateClickRate = (variant: Variant) => {
    if (variant.sent_count === 0) return 0;
    return Math.round((variant.click_count / variant.sent_count) * 100);
  };

  const calculateConversionRate = (variant: Variant) => {
    if (variant.sent_count === 0) return 0;
    return Math.round((variant.conversion_count / variant.sent_count) * 100);
  };

  const getWinningCriteriaText = (criteria: string) => {
    switch (criteria) {
      case 'open_rate': return 'Tasa de Apertura';
      case 'click_rate': return 'Tasa de Click';
      case 'conversion_rate': return 'Tasa de Conversión';
      default: return criteria;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl mx-auto max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Prueba A/B para Campaña</h2>
          <p className="text-gray-600 mt-1">{campaign.name}</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Introduction */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <Split className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-blue-800">
                Pruebas A/B para Optimizar tus Campañas
              </h3>
              <p className="text-sm text-blue-700 mt-1">
                Las pruebas A/B te permiten comparar diferentes versiones de tu campaña para determinar cuál funciona mejor. 
                Crea variantes con diferentes asuntos, contenidos o llamadas a la acción, y el sistema enviará cada variante 
                a un segmento de tu audiencia para determinar la más efectiva.
              </p>
            </div>
          </div>
        </div>

        {/* AB Test Configuration */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Configuración de la Prueba A/B</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duración de la Prueba (horas)
              </label>
              <input
                type="number"
                min="1"
                max="72"
                value={abTestConfig.testDuration}
                onChange={(e) => setAbTestConfig({
                  ...abTestConfig,
                  testDuration: parseInt(e.target.value) || 24
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">
                Tiempo que durará la fase de prueba antes de determinar la variante ganadora
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tamaño de la Muestra (%)
              </label>
              <input
                type="number"
                min="10"
                max="50"
                value={abTestConfig.sampleSize}
                onChange={(e) => setAbTestConfig({
                  ...abTestConfig,
                  sampleSize: parseInt(e.target.value) || 30
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">
                Porcentaje de tu audiencia que recibirá las variantes durante la fase de prueba
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Criterio de Victoria
              </label>
              <select
                value={abTestConfig.winningCriteria}
                onChange={(e) => setAbTestConfig({
                  ...abTestConfig,
                  winningCriteria: e.target.value
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="open_rate">Tasa de Apertura</option>
                <option value="click_rate">Tasa de Click</option>
                <option value="conversion_rate">Tasa de Conversión</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Métrica que determinará la variante ganadora
              </p>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="autoSendWinner"
                checked={abTestConfig.autoSendWinner}
                onChange={(e) => setAbTestConfig({
                  ...abTestConfig,
                  autoSendWinner: e.target.checked
                })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="autoSendWinner" className="ml-2 block text-sm text-gray-900">
                Enviar automáticamente la variante ganadora
              </label>
              <div className="ml-2 text-gray-500">
                <AlertCircle className="w-4 h-4 inline" />
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Resumen de la Prueba</h4>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• La prueba durará <span className="font-medium">{abTestConfig.testDuration} horas</span></li>
              <li>• Se enviará a un <span className="font-medium">{abTestConfig.sampleSize}%</span> de tu audiencia</li>
              <li>• La variante ganadora se determinará por <span className="font-medium">{getWinningCriteriaText(abTestConfig.winningCriteria)}</span></li>
              <li>• {abTestConfig.autoSendWinner 
                ? 'La variante ganadora se enviará automáticamente al resto de la audiencia' 
                : 'Deberás enviar manualmente la variante ganadora al resto de la audiencia'}</li>
            </ul>
          </div>
        </div>

        {/* Variants Section */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Variantes</h3>
            <button
              onClick={() => {
                setEditingVariant(null);
                setVariantForm({
                  name: `Variante ${String.fromCharCode(65 + variants.length)}`,
                  subject: campaign.type === 'email' ? campaign.subject : '',
                  content: campaign.content,
                  weight: 50
                });
                setShowVariantForm(true);
              }}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2 transition-colors"
              disabled={variants.length >= 5}
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Variante</span>
            </button>
          </div>

          {loading ? (
            <div className="p-6 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {variants.length > 0 ? (
                <div className="grid grid-cols-1 gap-6">
                  {variants.map((variant) => (
                    <div 
                      key={variant.id} 
                      className={`border rounded-lg overflow-hidden ${
                        variant.is_winner ? 'border-green-300 bg-green-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-4">
                            <div className={`p-2 rounded-lg ${
                              variant.is_winner ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                            }`}>
                              {variant.is_winner ? <CheckCircle className="w-6 h-6" /> : <Split className="w-6 h-6" />}
                            </div>
                            <div>
                              <h3 className="font-medium text-lg text-gray-900">{variant.name}</h3>
                              <div className="flex items-center mt-2">
                                <span className="text-sm text-gray-500">
                                  Peso: {variant.weight}%
                                </span>
                                {variant.is_winner && (
                                  <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Variante Ganadora
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleEditVariant(variant)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                              title="Editar"
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDuplicateVariant(variant)}
                              className="p-1 text-gray-600 hover:bg-gray-50 rounded"
                              title="Duplicar"
                            >
                              <Copy className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteVariant(variant.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                              title="Eliminar"
                              disabled={variants.length <= 1}
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                        
                        {/* Variant Content Preview */}
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                          {campaign.type === 'email' && variant.subject && (
                            <div className="mb-3">
                              <h4 className="text-sm font-medium text-gray-700">Asunto:</h4>
                              <p className="text-sm text-gray-600">{variant.subject}</p>
                            </div>
                          )}
                          
                          <div>
                            <h4 className="text-sm font-medium text-gray-700">Contenido:</h4>
                            <p className="text-sm text-gray-600 line-clamp-3">{variant.content}</p>
                          </div>
                        </div>
                        
                        {/* Variant Performance Metrics */}
                        {(variant.sent_count > 0 || variant.is_winner) && (
                          <div className="mt-4 grid grid-cols-4 gap-4">
                            <div className="text-center">
                              <div className="text-lg font-bold text-gray-900">{variant.sent_count}</div>
                              <div className="text-xs text-gray-500">Enviados</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold text-blue-600">{calculateOpenRate(variant)}%</div>
                              <div className="text-xs text-gray-500">Tasa Apertura</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold text-green-600">{calculateClickRate(variant)}%</div>
                              <div className="text-xs text-gray-500">Tasa Click</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold text-purple-600">{calculateConversionRate(variant)}%</div>
                              <div className="text-xs text-gray-500">Conversión</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Split className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No hay variantes</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Crea al menos dos variantes para tu prueba A/B
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
        <button
          onClick={onClose}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSaveABTest}
          disabled={saving || variants.length < 1}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2 transition-colors"
        >
          {saving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>Guardar Configuración A/B</span>
        </button>
      </div>

      {/* Variant Form Modal */}
      {showVariantForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingVariant ? 'Editar Variante' : 'Nueva Variante'}
              </h2>
              <button
                onClick={() => {
                  setShowVariantForm(false);
                  setEditingVariant(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de la Variante *
                </label>
                <input
                  type="text"
                  value={variantForm.name}
                  onChange={(e) => setVariantForm({ ...variantForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Variante A"
                  required
                />
              </div>

              {campaign.type === 'email' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Asunto del Email *
                  </label>
                  <input
                    type="text"
                    value={variantForm.subject}
                    onChange={(e) => setVariantForm({ ...variantForm, subject: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Asunto del email"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contenido *
                </label>
                <textarea
                  rows={8}
                  value={variantForm.content}
                  onChange={(e) => setVariantForm({ ...variantForm, content: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Contenido del mensaje"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Peso de la Variante (%)
                </label>
                <input
                  type="number"
                  min="10"
                  max="90"
                  value={variantForm.weight}
                  onChange={(e) => setVariantForm({ ...variantForm, weight: parseInt(e.target.value) || 50 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Porcentaje de la audiencia de prueba que recibirá esta variante
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowVariantForm(false);
                  setEditingVariant(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveVariant}
                disabled={saving || !variantForm.name || !variantForm.content}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2 transition-colors"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{editingVariant ? 'Actualizar' : 'Crear'} Variante</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};