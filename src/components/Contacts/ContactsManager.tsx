import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload,
  Edit,
  Trash2,
  Mail,
  Phone,
  Building,
  Tag,
  MoreVertical,
  UserPlus,
  FileSpreadsheet,
  Eye,
  X,
  Settings,
  List
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useUserRole } from '../../hooks/useUserRole';
import { ContactForm } from '../Forms/ContactForm';
import { GroupForm } from '../Forms/GroupForm';
import { TagForm } from '../Forms/TagForm';
import { ImportContactsModal } from '../Modals/ImportContactsModal';
import { ContactDetailsModal } from '../Modals/ContactDetailsModal';
import { GroupsTagsManager } from './GroupsTagsManager';
import { CustomFieldsManager } from '../Leads/CustomFieldsManager';
import toast from 'react-hot-toast';

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  tags: string[];
  segment: string;
  status: 'active' | 'inactive';
  created_at: string;
  custom_fields?: Record<string, any>;
}

interface Group {
  id: string;
  nombre: string;
  descripcion: string;
  color: string;
  total_contactos: number;
  activo: boolean;
}

interface TagData {
  id: string;
  nombre: string;
  color: string;
  descripcion: string;
  activa: boolean;
}

export const ContactsManager: React.FC = () => {
  const { canEdit, canCreate, canDelete, loading: roleLoading } = useUserRole();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [tags, setTags] = useState<TagData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSegment, setSelectedSegment] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [showContactForm, setShowContactForm] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [showTagForm, setShowTagForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showContactDetails, setShowContactDetails] = useState(false);
  const [showGroupsTagsManager, setShowGroupsTagsManager] = useState(false);
  const [showCustomFieldsManager, setShowCustomFieldsManager] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [editingTag, setEditingTag] = useState<TagData | null>(null);
  const [selectedContactForDetails, setSelectedContactForDetails] = useState<Contact | null>(null);
  const [activeTab, setActiveTab] = useState<'contacts' | 'groups' | 'tags'>('contacts');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch contacts
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false });

      if (contactsError) throw contactsError;

      // Fetch groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('grupos')
        .select('*')
        .eq('activo', true)
        .order('nombre');

      if (groupsError) throw groupsError;

      // Fetch tags
      const { data: tagsData, error: tagsError } = await supabase
        .from('etiquetas')
        .select('*')
        .eq('activa', true)
        .order('nombre');

      if (tagsError) throw tagsError;

      setContacts(contactsData || []);
      setGroups(groupsData || []);
      setTags(tagsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = 
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSegment = !selectedSegment || contact.segment === selectedSegment;
    const matchesStatus = !selectedStatus || contact.status === selectedStatus;
    
    return matchesSearch && matchesSegment && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Activo';
      case 'inactive': return 'Inactivo';
      default: return status;
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!canDelete) {
      toast.error('No tienes permisos para eliminar contactos');
      return;
    }

    if (!confirm('¿Estás seguro de que quieres eliminar este contacto?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId);

      if (error) throw error;

      toast.success('Contacto eliminado correctamente');
      fetchData();
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast.error('Error al eliminar el contacto');
    }
  };

  const handleBulkDelete = async () => {
    if (!canDelete) {
      toast.error('No tienes permisos para eliminar contactos');
      return;
    }

    if (selectedContacts.length === 0) {
      toast.error('Selecciona al menos un contacto');
      return;
    }

    if (!confirm(`¿Estás seguro de que quieres eliminar ${selectedContacts.length} contactos?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .in('id', selectedContacts);

      if (error) throw error;

      toast.success(`${selectedContacts.length} contactos eliminados correctamente`);
      setSelectedContacts([]);
      fetchData();
    } catch (error) {
      console.error('Error deleting contacts:', error);
      toast.error('Error al eliminar los contactos');
    }
  };

  const handleBulkUpdateStatus = async (status: 'active' | 'inactive') => {
    if (!canEdit) {
      toast.error('No tienes permisos para editar contactos');
      return;
    }

    if (selectedContacts.length === 0) {
      toast.error('Selecciona al menos un contacto');
      return;
    }

    try {
      const { error } = await supabase
        .from('contacts')
        .update({ status })
        .in('id', selectedContacts);

      if (error) throw error;

      toast.success(`${selectedContacts.length} contactos actualizados correctamente`);
      setSelectedContacts([]);
      fetchData();
    } catch (error) {
      console.error('Error updating contacts:', error);
      toast.error('Error al actualizar los contactos');
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!canDelete) {
      toast.error('No tienes permisos para eliminar grupos');
      return;
    }

    if (!confirm('¿Estás seguro de que quieres eliminar este grupo?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('grupos')
        .delete()
        .eq('id', groupId);

      if (error) throw error;

      toast.success('Grupo eliminado correctamente');
      fetchData();
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error('Error al eliminar el grupo');
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    if (!canDelete) {
      toast.error('No tienes permisos para eliminar etiquetas');
      return;
    }

    if (!confirm('¿Estás seguro de que quieres eliminar esta etiqueta?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('etiquetas')
        .delete()
        .eq('id', tagId);

      if (error) throw error;

      toast.success('Etiqueta eliminada correctamente');
      fetchData();
    } catch (error) {
      console.error('Error deleting tag:', error);
      toast.error('Error al eliminar la etiqueta');
    }
  };

  const exportContacts = () => {
    const csvContent = [
      ['Nombre', 'Email', 'Teléfono', 'Segmento', 'Estado', 'Etiquetas'],
      ...filteredContacts.map(contact => [
        contact.name,
        contact.email,
        contact.phone,
        contact.segment,
        contact.status,
        contact.tags.join('; ')
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contactos.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setShowContactForm(true);
  };

  const handleEditGroup = (group: Group) => {
    setEditingGroup(group);
    setShowGroupForm(true);
  };

  const handleEditTag = (tag: TagData) => {
    setEditingTag(tag);
    setShowTagForm(true);
  };

  const handleViewContact = (contact: Contact) => {
    setSelectedContactForDetails(contact);
    setShowContactDetails(true);
  };

  const handleCloseContactForm = () => {
    setShowContactForm(false);
    setEditingContact(null);
  };

  const handleCloseGroupForm = () => {
    setShowGroupForm(false);
    setEditingGroup(null);
  };

  const handleCloseTagForm = () => {
    setShowTagForm(false);
    setEditingTag(null);
  };

  const handleSelectContact = (contactId: string) => {
    setSelectedContacts(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleSelectAllContacts = () => {
    if (selectedContacts.length === filteredContacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(filteredContacts.map(contact => contact.id));
    }
  };

  if (loading || roleLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show Custom Fields Manager
  if (showCustomFieldsManager) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowCustomFieldsManager(false)}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
          >
            <X className="w-4 h-4" />
            <span>Volver a Contactos</span>
          </button>
        </div>
        <CustomFieldsManager />
      </div>
    );
  }

  // Show Groups & Tags Manager
  if (showGroupsTagsManager) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowGroupsTagsManager(false)}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
          >
            <X className="w-4 h-4" />
            <span>Volver a Contactos</span>
          </button>
        </div>
        <GroupsTagsManager />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Contactos</h2>
          <p className="text-gray-600 mt-1">
            Administra tu base de datos de contactos, grupos y etiquetas
          </p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={() => setShowCustomFieldsManager(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center space-x-2 transition-colors"
          >
            <List className="w-4 h-4" />
            <span>Campos Personalizados</span>
          </button>
          <button 
            onClick={() => setShowGroupsTagsManager(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center space-x-2 transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>Grupos y Etiquetas</span>
          </button>
          <button 
            onClick={() => setShowImportModal(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center space-x-2 transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>Importar</span>
          </button>
          <button 
            onClick={exportContacts}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center space-x-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Exportar</span>
          </button>
          <button 
            onClick={() => setShowContactForm(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Contacto</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Contactos</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{contacts.length}</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-500">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Contactos Activos</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {contacts.filter(c => c.status === 'active').length}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-green-500">
              <UserPlus className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Grupos Activos</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">{groups.length}</p>
            </div>
            <div className="p-3 rounded-lg bg-purple-500">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Etiquetas</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">{tags.length}</p>
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
              onClick={() => setActiveTab('contacts')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'contacts'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Contactos ({contacts.length})
            </button>
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
          {activeTab === 'contacts' && (
            <>
              {/* Filters and Bulk Actions */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar contactos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <select
                  value={selectedSegment}
                  onChange={(e) => setSelectedSegment(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Todos los segmentos</option>
                  <option value="general">General</option>
                  <option value="premium">Premium</option>
                  <option value="vip">VIP</option>
                  <option value="prospecto">Prospecto</option>
                </select>

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Todos los estados</option>
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                </select>

                <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 flex items-center space-x-2 transition-colors">
                  <Filter className="w-4 h-4" />
                  <span>Filtros Avanzados</span>
                </button>

                {selectedContacts.length > 0 && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleBulkUpdateStatus('active')}
                      className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 text-sm"
                    >
                      Activar
                    </button>
                    <button
                      onClick={() => handleBulkUpdateStatus('inactive')}
                      className="bg-orange-600 text-white px-3 py-2 rounded-lg hover:bg-orange-700 text-sm"
                    >
                      Desactivar
                    </button>
                    <button
                      onClick={handleBulkDelete}
                      className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 text-sm"
                    >
                      Eliminar
                    </button>
                  </div>
                )}
              </div>

              {/* Contacts Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={selectedContacts.length === filteredContacts.length && filteredContacts.length > 0}
                          onChange={handleSelectAllContacts}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contacto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Segmento
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Etiquetas
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Campos Personalizados
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredContacts.map((contact) => (
                      <tr key={contact.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedContacts.includes(contact.id)}
                            onChange={() => handleSelectContact(contact.id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                                <span className="text-sm font-medium text-white">
                                  {contact.name.charAt(0)}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {contact.name}
                              </div>
                              <div className="text-sm text-gray-500 flex items-center space-x-4">
                                {contact.email && (
                                  <span className="flex items-center">
                                    <Mail className="w-3 h-3 mr-1" />
                                    {contact.email}
                                  </span>
                                )}
                                {contact.phone && (
                                  <span className="flex items-center">
                                    <Phone className="w-3 h-3 mr-1" />
                                    {contact.phone}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {contact.segment}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(contact.status)}`}>
                            {getStatusText(contact.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-wrap gap-1">
                            {contact.tags.slice(0, 2).map((tag, index) => (
                              <span 
                                key={index}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                              >
                                {tag}
                              </span>
                            ))}
                            {contact.tags.length > 2 && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                +{contact.tags.length - 2}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-wrap gap-1">
                            {contact.custom_fields && Object.keys(contact.custom_fields).length > 0 ? (
                              Object.entries(contact.custom_fields).slice(0, 2).map(([key, value], index) => (
                                <span 
                                  key={index}
                                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                                >
                                  {key}: {value?.toString().substring(0, 10)}{value?.toString().length > 10 ? '...' : ''}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-gray-500">Sin campos personalizados</span>
                            )}
                            {contact.custom_fields && Object.keys(contact.custom_fields).length > 2 && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                +{Object.keys(contact.custom_fields).length - 2}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleViewContact(contact)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEditContact(contact)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteContact(contact.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredContacts.length === 0 && (
                <div className="text-center py-12">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No hay contactos</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm || selectedSegment || selectedStatus 
                      ? 'No se encontraron contactos con los filtros aplicados.'
                      : 'Comienza agregando tu primer contacto.'
                    }
                  </p>
                </div>
              )}
            </>
          )}

          {activeTab === 'groups' && (
            <>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">Grupos de Contactos</h3>
                <button
                  onClick={() => setShowGroupForm(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nuevo Grupo</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groups.map((group) => (
                  <div key={group.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: group.color }}
                        />
                        <h4 className="font-medium text-gray-900">{group.nombre}</h4>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleEditGroup(group)}
                          className="p-1 hover:bg-gray-100 rounded text-blue-600"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteGroup(group.id)}
                          className="p-1 hover:bg-gray-100 rounded text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">{group.descripcion}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        {group.total_contactos} contactos
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        group.activo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {group.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {groups.length === 0 && (
                <div className="text-center py-12">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No hay grupos</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Crea grupos para organizar mejor tus contactos.
                  </p>
                </div>
              )}
            </>
          )}

          {activeTab === 'tags' && (
            <>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">Etiquetas</h3>
                <button
                  onClick={() => setShowTagForm(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nueva Etiqueta</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tags.map((tag) => (
                  <div key={tag.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <span 
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white"
                        style={{ backgroundColor: tag.color }}
                      >
                        {tag.nombre}
                      </span>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleEditTag(tag)}
                          className="p-1 hover:bg-gray-100 rounded text-blue-600"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTag(tag.id)}
                          className="p-1 hover:bg-gray-100 rounded text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">{tag.descripcion}</p>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      tag.activa ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {tag.activa ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                ))}
              </div>

              {tags.length === 0 && (
                <div className="text-center py-12">
                  <Tag className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No hay etiquetas</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Crea etiquetas para categorizar tus contactos.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Forms and Modals */}
      <ContactForm
        contact={editingContact}
        isOpen={showContactForm}
        onClose={handleCloseContactForm}
        onSave={fetchData}
      />

      <GroupForm
        group={editingGroup}
        isOpen={showGroupForm}
        onClose={handleCloseGroupForm}
        onSave={fetchData}
      />

      <TagForm
        tag={editingTag}
        isOpen={showTagForm}
        onClose={handleCloseTagForm}
        onSave={fetchData}
      />

      <ImportContactsModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportComplete={fetchData}
      />

      <ContactDetailsModal
        contact={selectedContactForDetails}
        isOpen={showContactDetails}
        onClose={() => setShowContactDetails(false)}
      />
    </div>
  );
};