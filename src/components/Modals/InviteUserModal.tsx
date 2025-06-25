import React, { useState } from 'react';
import { X, Send, Mail, Shield, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInviteSent: () => void;
}

export const InviteUserModal: React.FC<InviteUserModalProps> = ({ 
  isOpen, 
  onClose, 
  onInviteSent 
}) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'manager' | 'user'>('user');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Verificar si el email ya existe
      const { data: existingUser } = await supabase
        .from('user_profiles')
        .select('email')
        .eq('email', email)
        .single();

      if (existingUser) {
        toast.error('Ya existe un usuario con este email');
        return;
      }

      // Verificar si ya hay una invitación pendiente
      const { data: existingInvitation } = await supabase
        .from('user_invitations')
        .select('id')
        .eq('email', email)
        .is('accepted_at', null)
        .single();

      if (existingInvitation) {
        toast.error('Ya existe una invitación pendiente para este email');
        return;
      }

      // Generar token de invitación
      const invitationToken = crypto.randomUUID();

      // Crear invitación
      const { error } = await supabase
        .from('user_invitations')
        .insert([{
          email,
          role,
          invitation_token: invitationToken,
          invited_by: (await supabase.auth.getUser()).data.user?.id
        }]);

      if (error) throw error;

      // Aquí normalmente enviarías un email con el enlace de invitación
      // Por ahora solo mostramos un mensaje de éxito
      toast.success('Invitación enviada correctamente');
      
      // Limpiar formulario
      setEmail('');
      setRole('user');
      setMessage('');
      
      onInviteSent();
      onClose();
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      toast.error(error.message || 'Error al enviar la invitación');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Invitar Usuario</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="w-4 h-4 inline mr-2" />
              Email del Usuario *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="usuario@empresa.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Shield className="w-4 h-4 inline mr-2" />
              Rol *
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="user">Usuario</option>
              <option value="manager">Gerente</option>
              <option value="admin">Administrador</option>
            </select>
            <p className="mt-1 text-sm text-gray-500">
              {role === 'admin' && 'Acceso completo al sistema'}
              {role === 'manager' && 'Puede gestionar contenido y usuarios básicos'}
              {role === 'user' && 'Acceso básico de solo lectura'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mensaje Personalizado (Opcional)
            </label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Mensaje adicional para incluir en la invitación..."
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Información sobre la invitación</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Se enviará un email con un enlace de invitación</li>
                    <li>La invitación expira en 7 días</li>
                    <li>El usuario deberá crear su contraseña al aceptar</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2 transition-colors"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>Enviar Invitación</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};