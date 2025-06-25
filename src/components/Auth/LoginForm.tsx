import React, { useState } from 'react';
import { Mail, Lock, LogIn, AlertCircle, Shield, Eye } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await signIn(email, password);
      
      if (error) {
        toast.error('Credenciales incorrectas');
      } else {
        toast.success('¡Bienvenido al sistema!');
      }
    } catch (error) {
      toast.error('Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const demoCredentials = [
    {
      role: 'Administrador',
      email: 'admin@marketing.com',
      password: 'admin123',
      icon: Shield,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      role: 'Usuario',
      email: 'viewer@marketing.com',
      password: 'viewer123',
      icon: Eye,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    }
  ];

  const fillCredentials = (email: string, password: string) => {
    setEmail(email);
    setPassword(password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <LogIn className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Iniciar Sesión
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Accede a tu sistema integral de gestión de marketing
          </p>
        </div>

        {/* Demo Credentials */}
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Credenciales de Demostración
            </h3>
          </div>
          
          {demoCredentials.map((cred, index) => (
            <div 
              key={index}
              className={`${cred.bgColor} border ${cred.borderColor} rounded-lg p-4 cursor-pointer hover:shadow-md transition-all`}
              onClick={() => fillCredentials(cred.email, cred.password)}
            >
              <div className="flex items-start">
                <cred.icon className={`h-5 w-5 ${cred.color} mt-0.5`} />
                <div className="ml-3 flex-1">
                  <h4 className={`text-sm font-medium ${cred.color}`}>
                    {cred.role}
                  </h4>
                  <div className="mt-2 text-sm text-gray-700">
                    <p><strong>Email:</strong> {cred.email}</p>
                    <p><strong>Contraseña:</strong> {cred.password}</p>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Haz clic aquí para usar estas credenciales
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Login Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Correo Electrónico
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="admin@marketing.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Contraseña
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <LogIn className="h-5 w-5 mr-2" />
                  Iniciar Sesión
                </>
              )}
            </button>
          </div>
        </form>

        {/* Features Info */}
        <div className="mt-8 bg-white rounded-lg p-6 shadow-sm border border-gray-100">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Características del Sistema
          </h4>
          <ul className="text-sm text-gray-600 space-y-2">
            <li className="flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
              Gestión completa de contactos y leads
            </li>
            <li className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
              Campañas de email marketing y WhatsApp
            </li>
            <li className="flex items-center">
              <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
              Análisis y reportes detallados
            </li>
            <li className="flex items-center">
              <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
              Sistema Kanban para seguimiento de leads
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};