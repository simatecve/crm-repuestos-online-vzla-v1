import React, { useState } from 'react';
import { X, Calendar, Clock, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface Campaign {
  id: string;
  name: string;
  type: 'email' | 'whatsapp';
  subject: string;
}

interface CampaignScheduleModalProps {
  campaign: Campaign | null;
  isOpen: boolean;
  onClose: () => void;
  onScheduled: () => void;
}

export const CampaignScheduleModal: React.FC<CampaignScheduleModalProps> = ({ 
  campaign, 
  isOpen, 
  onClose, 
  onScheduled 
}) => {
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSchedule = async () => {
    if (!campaign || !scheduledDate || !scheduledTime) {
      toast.error('Por favor selecciona fecha y hora');
      return;
    }

    try {
      setLoading(true);
      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
      
      if (scheduledDateTime <= new Date()) {
        toast.error('La fecha debe ser futura');
        return;
      }

      const { error } = await supabase
        .from('campaigns')
        .update({ 
          status: 'scheduled',
          scheduled_at: scheduledDateTime.toISOString()
        })
        .eq('id', campaign.id);

      if (error) throw error;

      toast.success('Campaña programada correctamente');
      onScheduled();
      onClose();
    } catch (error) {
      console.error('Error scheduling campaign:', error);
      toast.error('Error al programar la campaña');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !campaign) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Programar Campaña</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Campaign Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900">{campaign.name}</h3>
            <p className="text-sm text-gray-600 mt-1">{campaign.subject}</p>
            <p className="text-sm text-gray-500 mt-1 capitalize">Campaña de {campaign.type}</p>
          </div>

          {/* Date Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-2" />
              Fecha de Envío
            </label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Time Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="w-4 h-4 inline mr-2" />
              Hora de Envío
            </label>
            <input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Quick Time Options */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">Horarios recomendados:</p>
            <div className="grid grid-cols-3 gap-2">
              {['09:00', '12:00', '15:00'].map((time) => (
                <button
                  key={time}
                  onClick={() => setScheduledTime(time)}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {time}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          {scheduledDate && scheduledTime && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>La campaña se enviará el:</strong><br />
                {new Date(`${scheduledDate}T${scheduledTime}`).toLocaleDateString('es-ES', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSchedule}
            disabled={!scheduledDate || !scheduledTime || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2 transition-colors"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Programar</span>
          </button>
        </div>
      </div>
    </div>
  );
};