import React from 'react';
import { X, Mail, Eye, MousePointer, Users, TrendingUp, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Campaign {
  id: string;
  name: string;
  type: 'email' | 'whatsapp';
  subject: string;
  sent_count: number;
  open_count: number;
  click_count: number;
  created_at: string;
}

interface CampaignStatsModalProps {
  campaign: Campaign | null;
  isOpen: boolean;
  onClose: () => void;
}

const engagementData = [
  { name: 'Enviados', value: 1000, color: '#3B82F6' },
  { name: 'Entregados', value: 980, color: '#10B981' },
  { name: 'Abiertos', value: 350, color: '#F59E0B' },
  { name: 'Clicks', value: 120, color: '#EF4444' },
];

const timelineData = [
  { time: '00:00', opens: 5, clicks: 2 },
  { time: '06:00', opens: 15, clicks: 8 },
  { time: '12:00', opens: 45, clicks: 18 },
  { time: '18:00', opens: 35, clicks: 15 },
  { time: '24:00', opens: 8, clicks: 3 },
];

export const CampaignStatsModal: React.FC<CampaignStatsModalProps> = ({ 
  campaign, 
  isOpen, 
  onClose 
}) => {
  if (!isOpen || !campaign) return null;

  const openRate = campaign.sent_count > 0 ? Math.round((campaign.open_count / campaign.sent_count) * 100) : 0;
  const clickRate = campaign.sent_count > 0 ? Math.round((campaign.click_count / campaign.sent_count) * 100) : 0;
  const clickToOpenRate = campaign.open_count > 0 ? Math.round((campaign.click_count / campaign.open_count) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Estadísticas de Campaña</h2>
            <p className="text-gray-600 mt-1">{campaign.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-blue-50 p-6 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Enviados</p>
                  <p className="text-3xl font-bold text-blue-900 mt-2">{campaign.sent_count.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-lg bg-blue-500">
                  <Mail className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-green-50 p-6 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Abiertos</p>
                  <p className="text-3xl font-bold text-green-900 mt-2">{campaign.open_count.toLocaleString()}</p>
                  <p className="text-sm text-green-600 mt-1">{openRate}% tasa apertura</p>
                </div>
                <div className="p-3 rounded-lg bg-green-500">
                  <Eye className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-orange-50 p-6 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600">Clicks</p>
                  <p className="text-3xl font-bold text-orange-900 mt-2">{campaign.click_count.toLocaleString()}</p>
                  <p className="text-sm text-orange-600 mt-1">{clickRate}% tasa click</p>
                </div>
                <div className="p-3 rounded-lg bg-orange-500">
                  <MousePointer className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-purple-50 p-6 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">Click-to-Open</p>
                  <p className="text-3xl font-bold text-purple-900 mt-2">{clickToOpenRate}%</p>
                  <p className="text-sm text-purple-600 mt-1">De los que abrieron</p>
                </div>
                <div className="p-3 rounded-lg bg-purple-500">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Engagement Funnel */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Embudo de Engagement</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={engagementData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {engagementData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-2 gap-4">
                {engagementData.map((item, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-gray-600">{item.name}</span>
                    <span className="text-sm font-medium text-gray-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline Activity */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Actividad por Hora</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="opens" fill="#3B82F6" name="Aperturas" />
                  <Bar dataKey="clicks" fill="#10B981" name="Clicks" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detailed Stats Table */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Métricas Detalladas</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Métrica
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cantidad
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Porcentaje
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Benchmark
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      Tasa de Entrega
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {Math.round(campaign.sent_count * 0.98).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      98%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-green-600">{"Excelente (>95%)"}</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      Tasa de Apertura
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {campaign.open_count.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {openRate}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm ${openRate >= 20 ? 'text-green-600' : openRate >= 15 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {openRate >= 20 ? 'Excelente' : openRate >= 15 ? 'Bueno' : 'Mejorable'}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      Tasa de Click
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {campaign.click_count.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {clickRate}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm ${clickRate >= 3 ? 'text-green-600' : clickRate >= 2 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {clickRate >= 3 ? 'Excelente' : clickRate >= 2 ? 'Bueno' : 'Mejorable'}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      Click-to-Open Rate
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {campaign.click_count.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {clickToOpenRate}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm ${clickToOpenRate >= 15 ? 'text-green-600' : clickToOpenRate >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {clickToOpenRate >= 15 ? 'Excelente' : clickToOpenRate >= 10 ? 'Bueno' : 'Mejorable'}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Campaign Info */}
          <div className="mt-8 bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Información de la Campaña</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm font-medium text-gray-700">Tipo de Campaña</p>
                <p className="text-sm text-gray-900 mt-1 capitalize">{campaign.type}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Fecha de Envío</p>
                <p className="text-sm text-gray-900 mt-1">
                  {new Date(campaign.created_at).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Asunto</p>
                <p className="text-sm text-gray-900 mt-1">{campaign.subject || 'Sin asunto'}</p>
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