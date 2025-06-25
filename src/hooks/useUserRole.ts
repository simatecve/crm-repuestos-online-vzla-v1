import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export const useUserRole = () => {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<'admin' | 'manager' | 'user' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) {
        setUserRole(null);
        setLoading(false);
        return;
      }

      try {
        // Query the users table using the correct column names from your schema
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();

        if (userData && !userError) {
          setUserRole(userData.role);
        } else {
          // Fallback: use metadata del usuario o asignar rol por defecto
          const role = user.user_metadata?.role || 'admin'; // Por defecto admin para demo
          setUserRole(role);
          
          // Intentar crear el usuario si no existe
          try {
            await supabase
              .from('users')
              .insert([{
                id: user.id,
                email: user.email || '',
                full_name: user.user_metadata?.full_name || user.email || 'Usuario',
                role: role
              }]);
          } catch (insertError) {
            // Ignorar errores de inserción (puede que ya exista)
            console.log('User creation skipped:', insertError);
          }
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        // En caso de error, asignar rol admin para demo
        setUserRole('admin');
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [user]);

  const isAdmin = userRole === 'admin';
  const isManager = userRole === 'manager';
  const canEdit = isAdmin || isManager;
  const canDelete = isAdmin;
  const canCreate = isAdmin || isManager;

  return {
    userRole,
    loading,
    isAdmin,
    isManager,
    canEdit,
    canDelete,
    canCreate
  };
};