import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Tag, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  UserPlus, 
  UserMinus,
  Palette,
  Save,
  X,
  Eye,
  EyeOff
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useUserRole } from '../../hooks/useUserRole';
import toast from 'react-hot-toast';

interface ContactGroup {
  id: string;
  name: string;
  description: string;
  color: string;
  is_active: boolean;
  member_count: number;
  created_at: string;
}

interface ContactTag {
  id: string;
  name: string;
  description: string;
  color: string;
  is_active: boolean;
  usage_count: number;
  created_at: string;
}

interface Contact {
  id: string;
  name: string;
  email: string;
}

const colorOptions = [
  { name: 'Azul', value: '#3B82F6' },
  { name: 'Verde', value: '#10B981' },
  { name: 'Amarillo', value: '#F59E0B' },
  { name: 'Rojo', value: '#EF4444' },
  { name: 'Púrpura', value: '#8B5CF6' },
  { name: 'Rosa', value: '#EC4899' },
  { name: 'Índigo', value: '#6366F1' },
  { name: 'Gris', value: '#6B7280' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Naranja', value: '#F97316' }
];

export const GroupsTagsManager: React.FC = () => {
  const { canEdit, canCreate, canDelete } = useUserRole();
  const [activeTab, setActiveTab] = useState<'groups' | 'tags'>('groups');
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [tags, setTags] = useState<ContactTag[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form states
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [showTagForm, setShowTagForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ContactGroup | null>(null);
  const [editingTag, setEditingTag] = useState<ContactTag | null>(null);
  
  // Group form
  const [groupForm, setGroupForm] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    is_active: true
  });
  
  // Tag form
  const [tagForm, setTagForm] = useState({
    name: '',
    description: '',
    color: '#10B981',
    is_active: true
  });

  // Member management
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<ContactGroup | null>(null);
  const [groupMembers, setGroupMembers] = useState<Contact[]>([]);
  const [availableContacts, setAvailableContacts] = useState<Contact[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchGroups(),
        fetchTags(),
        fetchContacts()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    const { data, error } = await supabase
      .from('contact_groups')
      .select('*')
      .order('name');

    if (error) throw error;
    setGroups(data || []);
  };

  const fetchTags = async () => {
    const { data, error } = await supabase
      .from('contact_tags')
      .select('*')
      .order('name');

    if (error) throw error;
    setTags(data || []);
  };

  const fetchContacts = async () => {
    const { data, error } = await supabase
      .from('contacts')
      .select('id, name, email')
      .eq('status', 'active')
      .order('name');

    if (error) throw error;
    setContacts(data || []);
  };

  const handleCreateGroup = async () => {
    if (!canCreate) {
      toast.error('No tienes permisos para crear grupos');
      return;
    }

    if (!groupForm.name.trim()) {
      toast.error('El nombre del grupo es obligatorio');
      return;
    }

    try {
      const { error } = await supabase
        .from('contact_groups')
        .insert([groupForm]);

      if (error) throw error;

      toast.success('Grupo creado correctamente');
      setShowGroupForm(false);
      setGroupForm({ name: '', description: '', color: '#3B82F6', is_active: true });
      fetchGroups();
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error('Error al crear el grupo');
    }
  };

  const handleUpdateGroup = async () => {
    if (!canEdit || !editingGroup) {
      toast.error('No tienes permisos para editar grupos');
      return;
    }

    try {
      const { error } = await supabase
        .from('contact_groups')
        .update(groupForm)
        .eq('id', editingGroup.id);

      if (error) throw error;

      toast.success('Grupo actualizado correctamente');
      setShowGroupForm(false);
      setEditingGroup(null);
      setGroupForm({ name: '', description: '', color: '#3B82F6', is_active: true });
      fetchGroups();
    } catch (error) {
      console.error('Error updating group:', error);
      toast.error('Error al actualizar el grupo');
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!canDelete) {
      toast.error('No tienes permisos para eliminar grupos');
      return;
    }

    if (!confirm('¿Estás seguro de que quieres eliminar este grupo? Se eliminarán todas las asignaciones.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('contact_groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;

      toast.success('Grupo eliminado correctamente');
      fetchGroups();
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error('Error al eliminar el grupo');
    }
  };

  const handleCreateTag = async () => {
    if (!canCreate) {
      toast.error('No tienes permisos para crear etiquetas');
      return;
    }

    if (!tagForm.name.trim()) {
      toast.error('El nombre de la etiqueta es obligatorio');
      return;
    }

    try {
      const { error } = await supabase
        .from('contact_tags')
        .insert([tagForm]);

      if (error) throw error;

      toast.success('Etiqueta creada correctamente');
      setShowTagForm(false);
      setTagForm({ name: '', description: '', color: '#10B981', is_active: true });
      fetchTags();
    } catch (error) {
      console.error('Error creating tag:', error);
      toast.error('Error al crear la etiqueta');
    }
  };

  const handleUpdateTag = async () => {
    if (!canEdit || !editingTag) {
      toast.error('No tienes permisos para editar etiquetas');
      return;
    }

    try {
      const { error } = await supabase
        .from('contact_tags')
        .update(tagForm)
        .eq('id', editingTag.id);

      if (error) throw error;

      toast.success('Etiqueta actualizada correctamente');
      setShowTagForm(false);
      setEditingTag(null);
      setTagForm({ name: '', description: '', color: '#10B981', is_active: true });
      fetchTags();
    } catch (error) {
      console.error('Error updating tag:', error);
      toast.error('Error al actualizar la etiqueta');
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    if (!canDelete) {
      toast.error('No tienes permisos para eliminar etiquetas');
      return;
    }

    if (!confirm('¿Estás seguro de que quieres eliminar esta etiqueta? Se eliminarán todas las asignaciones.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('contact_tags')
        .delete()
        .eq('id', tagId);

      if (error) throw error;

      toast.success('Etiqueta eliminada correctamente');
      fetchTags();
    } catch (error) {
      console.error('Error deleting tag:', error);
      toast.error('Error al eliminar la etiqueta');
    }
  };

  const handleEditGroup = (group: ContactGroup) => {
    setEditingGroup(group);
    setGroupForm({
      name: group.name,
      description: group.description,
      color: group.color,
      is_active: group.is_active
    });
    setShowGroupForm(true);
  };

  const handleEditTag = (tag: ContactTag) => {
    setEditingTag(tag);
    setTagForm({
      name: tag.name,
      description: tag.description,
      color: tag.color,
      is_active: tag.is_active
    });
    setShowTagForm(true);
  };

  const handleManageMembers = async (group: ContactGroup) => {
    setSelectedGroup(group);
    
    try {
      // Fetch current group members
      const { data: membersData, error: membersError } = await supabase
        .from('contact_group_members')
        .select(`
          contact_id,
          contacts (id, name, email)
        `)
        .eq('group_id', group.id);

      if (membersError) throw membersError;

      const members = membersData?.map(m => m.contacts).filter(Boolean) || [];
      setGroupMembers(members as Contact[]);

      // Fetch available contacts (not in this group)
      const memberIds = members.map(m => m.id);
      const available = contacts.filter(c => !memberIds.includes(c.id));
      setAvailableContacts(available);

      setShowMemberModal(true);
    } catch (error) {
      console.error('Error fetching group members:', error);
      toast.error('Error al cargar los miembros del grupo');
    }
  };

  const handleAddMember = async (contactId: string) => {
    if (!selectedGroup) return;

    try {
      const { error } = await supabase
        .from('contact_group_members')
        .insert([{
          contact_id: contactId,
          group_id: selectedGroup.id
        }]);

      if (error) throw error;

      toast.success('Contacto agregado al grupo');
      handleManageMembers(selectedGroup); // Refresh
      fetchGroups(); // Update counts
    } catch (error) {
      console.error('Error adding member:', error);
      toast.error('Error al agregar el contacto al grupo');
    }
  };

  const handleRemoveMember = async (contactId: string) => {
    if (!selectedGroup) return;

    try {
      const { error } = await supabase
        .from('contact_group_members')
        .delete()
        .eq('contact_id', contactId)
        .eq('group_id', selectedGroup.id);

      if (error) throw error;

      toast.success('Contacto removido del grupo');
      handleManageMembers(selectedGroup); // Refresh
      fetchGroups(); // Update counts
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Error al remover el contacto del grupo');
    }
  };

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tag.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
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
          <h2 className="text-2xl font-bold text-gray-900">Grupos y Etiquetas</h2>
          <p className="text-gray-600 mt-1">
            Organiza tus contactos con grupos y etiquetas personalizadas
          </p>
        </div>
        {canCreate && (
          <div className="flex space-x-3">
            <button 
              onClick={() => {
                setActiveTab('groups');
                setShowGroupForm(true);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Grupo</span>
            </button>
            <button 
              onClick={() => {
                setActiveTab('tags');
                setShowTagForm(true);
              }}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Etiqueta</span>
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Grupos</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{groups.length}</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-500">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Grupos Activos</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {groups.filter(g => g.is_active).length}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-green-500">
              <Eye className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Etiquetas</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">{tags.length}</p>
            </div>
            <div className="p-3 rounded-lg bg-purple-500">
              <Tag className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Etiquetas Activas</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">
                {tags.filter(t => t.is_active).length}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-orange-500">
              <Tag className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('groups')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'groups'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Grupos ({groups.length})
            </button>
            <button
              onClick={() => setActiveTab('tags')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'tags'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Etiquetas ({tags.length})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={`Buscar ${activeTab === 'groups' ? 'grupos' : 'etiquetas'}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Content */}
          {activeTab === 'groups' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredGroups.map((group) => (
                <div key={group.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: group.color }}
                      />
                      <h4 className="font-medium text-gray-900">{group.name}</h4>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleManageMembers(group)}
                        className="p-1 hover:bg-gray-100 rounded text-blue-600"
                        title="Gestionar miembros"
                      >
                        <UserPlus className="w-4 h-4" />
                      </button>
                      {canEdit && (
                        <button
                          onClick={() => handleEditGroup(group)}
                          className="p-1 hover:bg-gray-100 rounded text-blue-600"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDeleteGroup(group.id)}
                          className="p-1 hover:bg-gray-100 rounded text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-4">{group.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      {group.member_count} miembros
                    </span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      group.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {group.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTags.map((tag) => (
                <div key={tag.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <span 
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white"
                      style={{ backgroundColor: tag.color }}
                    >
                      {tag.name}
                    </span>
                    <div className="flex items-center space-x-1">
                      {canEdit && (
                        <button
                          onClick={() => handleEditTag(tag)}
                          className="p-1 hover:bg-gray-100 rounded text-blue-600"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDeleteTag(tag.id)}
                          className="p-1 hover:bg-gray-100 rounded text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-4">{tag.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      Usado {tag.usage_count} veces
                    </span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      tag.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {tag.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty states */}
          {activeTab === 'groups' && filteredGroups.length === 0 && (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay grupos</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'No se encontraron grupos con ese criterio.' : 'Crea tu primer grupo para organizar contactos.'}
              </p>
            </div>
          )}

          {activeTab === 'tags' && filteredTags.length === 0 && (
            <div className="text-center py-12">
              <Tag className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay etiquetas</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'No se encontraron etiquetas con ese criterio.' : 'Crea tu primera etiqueta para categorizar contactos.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Group Form Modal */}
      {showGroupForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingGroup ? 'Editar Grupo' : 'Nuevo Grupo'}
              </h2>
              <button
                onClick={() => {
                  setShowGroupForm(false);
                  setEditingGroup(null);
                  setGroupForm({ name: '', description: '', color: '#3B82F6', is_active: true });
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Grupo *
                </label>
                <input
                  type="text"
                  value={groupForm.name}
                  onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Clientes VIP"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  rows={3}
                  value={groupForm.description}
                  onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Descripción del grupo..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setGroupForm({ ...groupForm, color: color.value })}
                      className={`w-10 h-10 rounded-lg border-2 ${
                        groupForm.color === color.value ? 'border-gray-400' : 'border-gray-200'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="group-active"
                  checked={groupForm.is_active}
                  onChange={(e) => setGroupForm({ ...groupForm, is_active: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="group-active" className="ml-2 block text-sm text-gray-900">
                  Grupo activo
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowGroupForm(false);
                  setEditingGroup(null);
                  setGroupForm({ name: '', description: '', color: '#3B82F6', is_active: true });
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={editingGroup ? handleUpdateGroup : handleCreateGroup}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>{editingGroup ? 'Actualizar' : 'Crear'} Grupo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tag Form Modal */}
      {showTagForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingTag ? 'Editar Etiqueta' : 'Nueva Etiqueta'}
              </h2>
              <button
                onClick={() => {
                  setShowTagForm(false);
                  setEditingTag(null);
                  setTagForm({ name: '', description: '', color: '#10B981', is_active: true });
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de la Etiqueta *
                </label>
                <input
                  type="text"
                  value={tagForm.name}
                  onChange={(e) => setTagForm({ ...tagForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Cliente VIP"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  rows={3}
                  value={tagForm.description}
                  onChange={(e) => setTagForm({ ...tagForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Descripción de la etiqueta..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setTagForm({ ...tagForm, color: color.value })}
                      className={`w-10 h-10 rounded-lg border-2 ${
                        tagForm.color === color.value ? 'border-gray-400' : 'border-gray-200'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
                <div className="mt-2">
                  <span 
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white"
                    style={{ backgroundColor: tagForm.color }}
                  >
                    {tagForm.name || 'Vista previa'}
                  </span>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="tag-active"
                  checked={tagForm.is_active}
                  onChange={(e) => setTagForm({ ...tagForm, is_active: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="tag-active" className="ml-2 block text-sm text-gray-900">
                  Etiqueta activa
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowTagForm(false);
                  setEditingTag(null);
                  setTagForm({ name: '', description: '', color: '#10B981', is_active: true });
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={editingTag ? handleUpdateTag : handleCreateTag}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>{editingTag ? 'Actualizar' : 'Crear'} Etiqueta</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Member Management Modal */}
      {showMemberModal && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Gestionar Miembros - {selectedGroup.name}
              </h2>
              <button
                onClick={() => setShowMemberModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Current Members */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Miembros Actuales ({groupMembers.length})
                  </h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {groupMembers.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{member.name}</p>
                          <p className="text-sm text-gray-600">{member.email}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="p-1 text-red-600 hover:bg-red-100 rounded"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {groupMembers.length === 0 && (
                      <p className="text-gray-500 text-center py-8">No hay miembros en este grupo</p>
                    )}
                  </div>
                </div>

                {/* Available Contacts */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Contactos Disponibles ({availableContacts.length})
                  </h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {availableContacts.map((contact) => (
                      <div key={contact.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{contact.name}</p>
                          <p className="text-sm text-gray-600">{contact.email}</p>
                        </div>
                        <button
                          onClick={() => handleAddMember(contact.id)}
                          className="p-1 text-green-600 hover:bg-green-100 rounded"
                        >
                          <UserPlus className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {availableContacts.length === 0 && (
                      <p className="text-gray-500 text-center py-8">Todos los contactos están en este grupo</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end p-6 border-t border-gray-200">
              <button
                onClick={() => setShowMemberModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};