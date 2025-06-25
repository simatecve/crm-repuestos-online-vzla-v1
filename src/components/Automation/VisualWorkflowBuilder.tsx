import React, { useState, useRef, useEffect } from 'react';
import { 
  Zap, 
  Plus, 
  Play, 
  Pause, 
  Edit, 
  Trash2, 
  Clock, 
  Users, 
  Mail, 
  MessageSquare,
  Target,
  Filter,
  ArrowRight,
  Settings,
  Activity,
  Calendar,
  Bell,
  CheckCircle,
  AlertCircle,
  BarChart3,
  Eye,
  Copy,
  Download,
  Save,
  X,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Move,
  PlusCircle,
  Tag,
  UserPlus,
  FileText,
  Send
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useUserRole } from '../../hooks/useUserRole';
import toast from 'react-hot-toast';

interface Node {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    description?: string;
    icon?: string;
    config?: any;
  };
}

interface Edge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: string;
  animated?: boolean;
  style?: any;
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
  trigger_type: string;
  trigger_config: any;
  nodes: Node[];
  edges: Edge[];
  created_at: string;
  updated_at: string;
}

const triggerTypes = [
  { id: 'contact_added', name: 'Nuevo Contacto', icon: Users, description: 'Cuando se agrega un nuevo contacto' },
  { id: 'lead_stage_changed', name: 'Cambio de Etapa', icon: Target, description: 'Cuando un lead cambia de etapa' },
  { id: 'campaign_opened', name: 'Email Abierto', icon: Mail, description: 'Cuando se abre un email' },
  { id: 'time_based', name: 'Basado en Tiempo', icon: Clock, description: 'En fechas o intervalos específicos' },
  { id: 'form_submitted', name: 'Formulario Enviado', icon: CheckCircle, description: 'Cuando se envía un formulario' }
];

const actionTypes = [
  { id: 'send_email', name: 'Enviar Email', icon: Mail, description: 'Enviar un email personalizado' },
  { id: 'send_whatsapp', name: 'Enviar WhatsApp', icon: MessageSquare, description: 'Enviar mensaje de WhatsApp' },
  { id: 'add_tag', name: 'Agregar Etiqueta', icon: Tag, description: 'Agregar etiqueta al contacto' },
  { id: 'move_to_list', name: 'Mover a Lista', icon: Users, description: 'Agregar a una lista específica' },
  { id: 'create_task', name: 'Crear Tarea', icon: CheckCircle, description: 'Crear una tarea de seguimiento' },
  { id: 'update_field', name: 'Actualizar Campo', icon: Edit, description: 'Actualizar campo del contacto' }
];

const conditionTypes = [
  { id: 'if_else', name: 'Condición If/Else', icon: Activity, description: 'Bifurcar el flujo basado en una condición' },
  { id: 'switch', name: 'Switch (Múltiples Caminos)', icon: Filter, description: 'Múltiples caminos basados en un valor' },
  { id: 'wait', name: 'Esperar', icon: Clock, description: 'Esperar un tiempo específico antes de continuar' }
];

export const VisualWorkflowBuilder: React.FC = () => {
  const { canEdit, canCreate, canDelete } = useUserRole();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [showWorkflowForm, setShowWorkflowForm] = useState(false);
  const [showNodeForm, setShowNodeForm] = useState(false);
  const [showEdgeForm, setShowEdgeForm] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
  const [selectedNodeType, setSelectedNodeType] = useState<'trigger' | 'action' | 'condition' | null>(null);
  const [selectedActionType, setSelectedActionType] = useState<string | null>(null);
  const [nodeFormData, setNodeFormData] = useState<any>({});
  const [edgeFormData, setEdgeFormData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [workflowFormData, setWorkflowFormData] = useState({
    name: '',
    description: '',
    trigger_type: '',
    status: 'draft'
  });
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 1000, height: 600 });
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNode, setDraggedNode] = useState<Node | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isCreatingEdge, setIsCreatingEdge] = useState(false);
  const [edgeStart, setEdgeStart] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  
  useEffect(() => {
    fetchWorkflows();
    
    const handleResize = () => {
      if (canvasRef.current) {
        setCanvasSize({
          width: canvasRef.current.offsetWidth,
          height: canvasRef.current.offsetHeight
        });
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      
      // Simulate fetching workflows
      const mockWorkflows: Workflow[] = [
        {
          id: '1',
          name: 'Bienvenida a Nuevos Contactos',
          description: 'Envía un email de bienvenida cuando se agrega un nuevo contacto',
          status: 'active',
          trigger_type: 'contact_added',
          trigger_config: { segment: 'all' },
          nodes: [
            {
              id: 'node-1',
              type: 'trigger',
              position: { x: 100, y: 100 },
              data: { 
                label: 'Nuevo Contacto', 
                description: 'Cuando se agrega un nuevo contacto',
                icon: 'Users'
              }
            },
            {
              id: 'node-2',
              type: 'action',
              position: { x: 400, y: 100 },
              data: { 
                label: 'Enviar Email', 
                description: 'Enviar email de bienvenida',
                icon: 'Mail',
                config: {
                  template_id: 'welcome_email',
                  subject: 'Bienvenido a nuestra plataforma'
                }
              }
            },
            {
              id: 'node-3',
              type: 'action',
              position: { x: 700, y: 100 },
              data: { 
                label: 'Agregar Etiqueta', 
                description: 'Etiquetar como nuevo contacto',
                icon: 'Tag',
                config: {
                  tag: 'nuevo_contacto'
                }
              }
            }
          ],
          edges: [
            {
              id: 'edge-1-2',
              source: 'node-1',
              target: 'node-2',
              animated: true
            },
            {
              id: 'edge-2-3',
              source: 'node-2',
              target: 'node-3',
              animated: true
            }
          ],
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z'
        },
        {
          id: '2',
          name: 'Seguimiento de Leads Calificados',
          description: 'Crea tareas de seguimiento para leads que pasan a calificados',
          status: 'draft',
          trigger_type: 'lead_stage_changed',
          trigger_config: { from_stage: 'contactado', to_stage: 'calificado' },
          nodes: [
            {
              id: 'node-1',
              type: 'trigger',
              position: { x: 100, y: 100 },
              data: { 
                label: 'Cambio de Etapa', 
                description: 'Lead pasa a calificado',
                icon: 'Target'
              }
            },
            {
              id: 'node-2',
              type: 'condition',
              position: { x: 400, y: 100 },
              data: { 
                label: 'Verificar Valor', 
                description: 'Verificar valor del lead',
                icon: 'Activity',
                config: {
                  field: 'value',
                  operator: 'greater_than',
                  value: 5000
                }
              }
            },
            {
              id: 'node-3',
              type: 'action',
              position: { x: 700, y: 50 },
              data: { 
                label: 'Alta Prioridad', 
                description: 'Crear tarea de alta prioridad',
                icon: 'CheckCircle',
                config: {
                  task_title: 'Contactar lead de alto valor',
                  priority: 'high'
                }
              }
            },
            {
              id: 'node-4',
              type: 'action',
              position: { x: 700, y: 200 },
              data: { 
                label: 'Prioridad Normal', 
                description: 'Crear tarea de prioridad normal',
                icon: 'CheckCircle',
                config: {
                  task_title: 'Seguimiento de lead calificado',
                  priority: 'medium'
                }
              }
            }
          ],
          edges: [
            {
              id: 'edge-1-2',
              source: 'node-1',
              target: 'node-2',
              animated: true
            },
            {
              id: 'edge-2-3',
              source: 'node-2',
              target: 'node-3',
              label: 'Sí',
              type: 'success'
            },
            {
              id: 'edge-2-4',
              source: 'node-2',
              target: 'node-4',
              label: 'No',
              type: 'failure'
            }
          ],
          created_at: '2024-01-10T14:30:00Z',
          updated_at: '2024-01-20T09:15:00Z'
        }
      ];
      
      setWorkflows(mockWorkflows);
      if (mockWorkflows.length > 0) {
        setSelectedWorkflow(mockWorkflows[0]);
      }
    } catch (error) {
      console.error('Error fetching workflows:', error);
      toast.error('Error al cargar las automatizaciones');
    } finally {
      setLoading(false);
    }
  };
  
  const handleCreateWorkflow = () => {
    setEditingWorkflow(null);
    setWorkflowFormData({
      name: '',
      description: '',
      trigger_type: '',
      status: 'draft'
    });
    setShowWorkflowForm(true);
  };
  
  const handleEditWorkflow = (workflow: Workflow) => {
    setEditingWorkflow(workflow);
    setWorkflowFormData({
      name: workflow.name,
      description: workflow.description,
      trigger_type: workflow.trigger_type,
      status: workflow.status
    });
    setShowWorkflowForm(true);
  };
  
  const handleSaveWorkflow = () => {
    if (!workflowFormData.name || !workflowFormData.trigger_type) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }
    
    // Simulate saving workflow
    if (editingWorkflow) {
      // Update existing workflow
      const updatedWorkflow = {
        ...editingWorkflow,
        name: workflowFormData.name,
        description: workflowFormData.description,
        trigger_type: workflowFormData.trigger_type,
        status: workflowFormData.status,
        updated_at: new Date().toISOString()
      };
      
      setWorkflows(prev => 
        prev.map(wf => wf.id === editingWorkflow.id ? updatedWorkflow : wf)
      );
      
      if (selectedWorkflow?.id === editingWorkflow.id) {
        setSelectedWorkflow(updatedWorkflow);
      }
      
      toast.success('Automatización actualizada correctamente');
    } else {
      // Create new workflow
      const newWorkflow: Workflow = {
        id: Date.now().toString(),
        name: workflowFormData.name,
        description: workflowFormData.description,
        status: workflowFormData.status as 'draft',
        trigger_type: workflowFormData.trigger_type,
        trigger_config: {},
        nodes: [
          {
            id: `node-trigger-${Date.now()}`,
            type: 'trigger',
            position: { x: 100, y: 100 },
            data: { 
              label: triggerTypes.find(t => t.id === workflowFormData.trigger_type)?.name || 'Trigger', 
              description: triggerTypes.find(t => t.id === workflowFormData.trigger_type)?.description || '',
              icon: triggerTypes.find(t => t.id === workflowFormData.trigger_type)?.icon.name || 'Zap'
            }
          }
        ],
        edges: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      setWorkflows(prev => [...prev, newWorkflow]);
      setSelectedWorkflow(newWorkflow);
      toast.success('Automatización creada correctamente');
    }
    
    setShowWorkflowForm(false);
  };
  
  const handleDeleteWorkflow = (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta automatización?')) {
      return;
    }
    
    // Simulate deleting workflow
    setWorkflows(prev => prev.filter(wf => wf.id !== id));
    
    if (selectedWorkflow?.id === id) {
      setSelectedWorkflow(workflows.find(wf => wf.id !== id) || null);
    }
    
    toast.success('Automatización eliminada correctamente');
  };
  
  const handleAddNode = (type: 'trigger' | 'action' | 'condition') => {
    setSelectedNodeType(type);
    setSelectedActionType(null);
    setNodeFormData({});
    setShowNodeForm(true);
  };
  
  const handleSaveNode = () => {
    if (!selectedWorkflow || !selectedNodeType || !selectedActionType) {
      toast.error('Información incompleta para crear el nodo');
      return;
    }
    
    const actionTypeInfo = 
      selectedNodeType === 'trigger' 
        ? triggerTypes.find(t => t.id === selectedActionType)
        : selectedNodeType === 'action'
          ? actionTypes.find(a => a.id === selectedActionType)
          : conditionTypes.find(c => c.id === selectedActionType);
    
    if (!actionTypeInfo) {
      toast.error('Tipo de acción no válido');
      return;
    }
    
    // Create new node
    const newNode: Node = {
      id: `node-${selectedNodeType}-${Date.now()}`,
      type: selectedNodeType,
      position: { 
        x: selectedWorkflow.nodes.length > 0 
          ? Math.max(...selectedWorkflow.nodes.map(n => n.position.x)) + 300 
          : 100,
        y: 100
      },
      data: {
        label: actionTypeInfo.name,
        description: actionTypeInfo.description,
        icon: actionTypeInfo.icon.name,
        config: nodeFormData
      }
    };
    
    // Add node to workflow
    const updatedWorkflow = {
      ...selectedWorkflow,
      nodes: [...selectedWorkflow.nodes, newNode]
    };
    
    setWorkflows(prev => 
      prev.map(wf => wf.id === selectedWorkflow.id ? updatedWorkflow : wf)
    );
    
    setSelectedWorkflow(updatedWorkflow);
    setShowNodeForm(false);
    toast.success('Nodo agregado correctamente');
    
    // If there are other nodes, suggest connecting
    if (selectedWorkflow.nodes.length > 0) {
      toast('Arrastra desde un nodo a otro para conectarlos', {
        icon: '🔗',
        duration: 3000
      });
    }
  };
  
  const handleDeleteNode = (nodeId: string) => {
    if (!selectedWorkflow) return;
    
    // Remove node and any connected edges
    const updatedNodes = selectedWorkflow.nodes.filter(node => node.id !== nodeId);
    const updatedEdges = selectedWorkflow.edges.filter(
      edge => edge.source !== nodeId && edge.target !== nodeId
    );
    
    const updatedWorkflow = {
      ...selectedWorkflow,
      nodes: updatedNodes,
      edges: updatedEdges
    };
    
    setWorkflows(prev => 
      prev.map(wf => wf.id === selectedWorkflow.id ? updatedWorkflow : wf)
    );
    
    setSelectedWorkflow(updatedWorkflow);
    setSelectedNode(null);
    setShowContextMenu(false);
  };
  
  const handleCreateEdge = (sourceId: string, targetId: string) => {
    if (!selectedWorkflow) return;
    
    // Check if edge already exists
    const edgeExists = selectedWorkflow.edges.some(
      edge => edge.source === sourceId && edge.target === targetId
    );
    
    if (edgeExists) {
      toast.error('Esta conexión ya existe');
      return;
    }
    
    // Check if target is a trigger (not allowed)
    const targetNode = selectedWorkflow.nodes.find(node => node.id === targetId);
    if (targetNode?.type === 'trigger') {
      toast.error('No se puede conectar a un nodo de tipo trigger');
      return;
    }
    
    // Create new edge
    const newEdge: Edge = {
      id: `edge-${sourceId}-${targetId}`,
      source: sourceId,
      target: targetId,
      animated: true
    };
    
    // Add edge to workflow
    const updatedWorkflow = {
      ...selectedWorkflow,
      edges: [...selectedWorkflow.edges, newEdge]
    };
    
    setWorkflows(prev => 
      prev.map(wf => wf.id === selectedWorkflow.id ? updatedWorkflow : wf)
    );
    
    setSelectedWorkflow(updatedWorkflow);
  };
  
  const handleDeleteEdge = (edgeId: string) => {
    if (!selectedWorkflow) return;
    
    const updatedEdges = selectedWorkflow.edges.filter(edge => edge.id !== edgeId);
    
    const updatedWorkflow = {
      ...selectedWorkflow,
      edges: updatedEdges
    };
    
    setWorkflows(prev => 
      prev.map(wf => wf.id === selectedWorkflow.id ? updatedWorkflow : wf)
    );
    
    setSelectedWorkflow(updatedWorkflow);
    setSelectedEdge(null);
    setShowContextMenu(false);
  };
  
  const handleNodeMouseDown = (e: React.MouseEvent, node: Node) => {
    e.stopPropagation();
    
    if (e.button === 0) { // Left click
      setIsDragging(true);
      setDraggedNode(node);
      
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    } else if (e.button === 2) { // Right click
      e.preventDefault();
      setSelectedNode(node);
      setContextMenuPos({ x: e.clientX, y: e.clientY });
      setShowContextMenu(true);
    }
  };
  
  const handleEdgeMouseDown = (e: React.MouseEvent, edge: Edge) => {
    e.stopPropagation();
    
    if (e.button === 2) { // Right click
      e.preventDefault();
      setSelectedEdge(edge);
      setContextMenuPos({ x: e.clientX, y: e.clientY });
      setShowContextMenu(true);
    }
  };
  
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) { // Right click
      e.preventDefault();
      setSelectedNode(null);
      setSelectedEdge(null);
      setContextMenuPos({ x: e.clientX, y: e.clientY });
      setShowContextMenu(true);
    } else {
      setShowContextMenu(false);
    }
  };
  
  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isDragging && draggedNode && selectedWorkflow) {
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (!canvasRect) return;
      
      const x = (e.clientX - canvasRect.left - dragOffset.x) / zoom - pan.x;
      const y = (e.clientY - canvasRect.top - dragOffset.y) / zoom - pan.y;
      
      // Update node position
      const updatedNodes = selectedWorkflow.nodes.map(node => 
        node.id === draggedNode.id 
          ? { ...node, position: { x, y } }
          : node
      );
      
      setSelectedWorkflow({
        ...selectedWorkflow,
        nodes: updatedNodes
      });
    }
    
    if (isCreatingEdge) {
      setMousePos({
        x: e.clientX,
        y: e.clientY
      });
    }
  };
  
  const handleCanvasMouseUp = () => {
    setIsDragging(false);
    setDraggedNode(null);
    
    if (isCreatingEdge) {
      setIsCreatingEdge(false);
      setEdgeStart(null);
    }
  };
  
  const handleNodeClick = (e: React.MouseEvent, node: Node) => {
    e.stopPropagation();
    
    if (isCreatingEdge && edgeStart && edgeStart !== node.id) {
      handleCreateEdge(edgeStart, node.id);
      setIsCreatingEdge(false);
      setEdgeStart(null);
    } else {
      setSelectedNode(node);
    }
  };
  
  const handleStartEdgeCreation = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setIsCreatingEdge(true);
    setEdgeStart(nodeId);
    setMousePos({
      x: e.clientX,
      y: e.clientY
    });
  };
  
  const getNodeColor = (type: string) => {
    switch (type) {
      case 'trigger': return 'bg-blue-500 text-white';
      case 'action': return 'bg-green-500 text-white';
      case 'condition': return 'bg-yellow-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };
  
  const getNodeIcon = (iconName: string) => {
    switch (iconName) {
      case 'Users': return <Users className="w-5 h-5" />;
      case 'Target': return <Target className="w-5 h-5" />;
      case 'Mail': return <Mail className="w-5 h-5" />;
      case 'Clock': return <Clock className="w-5 h-5" />;
      case 'CheckCircle': return <CheckCircle className="w-5 h-5" />;
      case 'MessageSquare': return <MessageSquare className="w-5 h-5" />;
      case 'Tag': return <Tag className="w-5 h-5" />;
      case 'Edit': return <Edit className="w-5 h-5" />;
      case 'Activity': return <Activity className="w-5 h-5" />;
      case 'Filter': return <Filter className="w-5 h-5" />;
      case 'Zap': return <Zap className="w-5 h-5" />;
      default: return <Zap className="w-5 h-5" />;
    }
  };
  
  const getEdgeStyle = (type?: string) => {
    switch (type) {
      case 'success': return { stroke: '#10B981', strokeWidth: 2 };
      case 'failure': return { stroke: '#EF4444', strokeWidth: 2 };
      default: return { stroke: '#6B7280', strokeWidth: 2 };
    }
  };
  
  const renderNode = (node: Node) => {
    const nodeStyle = {
      transform: `translate(${node.position.x}px, ${node.position.y}px)`,
      cursor: 'move'
    };
    
    return (
      <div
        key={node.id}
        className={`absolute rounded-lg shadow-md ${getNodeColor(node.type)} w-64 select-none`}
        style={nodeStyle}
        onMouseDown={(e) => handleNodeMouseDown(e, node)}
        onClick={(e) => handleNodeClick(e, node)}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {getNodeIcon(node.data.icon || 'Zap')}
              <h3 className="font-medium">{node.data.label}</h3>
            </div>
            <div 
              className="p-1 rounded-full hover:bg-white hover:bg-opacity-20 cursor-pointer"
              onClick={(e) => handleStartEdgeCreation(e, node.id)}
              title="Crear conexión"
            >
              <PlusCircle className="w-4 h-4" />
            </div>
          </div>
          {node.data.description && (
            <p className="text-xs mt-1 text-white text-opacity-80">{node.data.description}</p>
          )}
        </div>
      </div>
    );
  };
  
  const renderEdge = (edge: Edge) => {
    if (!selectedWorkflow) return null;
    
    const sourceNode = selectedWorkflow.nodes.find(n => n.id === edge.source);
    const targetNode = selectedWorkflow.nodes.find(n => n.id === edge.target);
    
    if (!sourceNode || !targetNode) return null;
    
    // Calculate edge points
    const sourceX = sourceNode.position.x + 128; // Half of node width
    const sourceY = sourceNode.position.y + 30; // Half of node height
    const targetX = targetNode.position.x;
    const targetY = targetNode.position.y + 30; // Half of node height
    
    // Create a bezier curve
    const midX = (sourceX + targetX) / 2;
    const path = `M ${sourceX} ${sourceY} C ${midX} ${sourceY}, ${midX} ${targetY}, ${targetX} ${targetY}`;
    
    const edgeStyle = getEdgeStyle(edge.type);
    
    return (
      <g key={edge.id} onMouseDown={(e) => handleEdgeMouseDown(e, edge)}>
        <path
          d={path}
          fill="none"
          stroke={edgeStyle.stroke}
          strokeWidth={edgeStyle.strokeWidth}
          strokeDasharray={edge.animated ? "5,5" : "none"}
          markerEnd="url(#arrowhead)"
        />
        {edge.label && (
          <text
            x={midX}
            y={(sourceY + targetY) / 2 - 10}
            textAnchor="middle"
            fill="#6B7280"
            fontSize="12"
            fontWeight="500"
            className="select-none pointer-events-none"
          >
            {edge.label}
          </text>
        )}
      </g>
    );
  };
  
  const renderTempEdge = () => {
    if (!isCreatingEdge || !edgeStart || !selectedWorkflow) return null;
    
    const sourceNode = selectedWorkflow.nodes.find(n => n.id === edgeStart);
    if (!sourceNode) return null;
    
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return null;
    
    const sourceX = sourceNode.position.x + 128; // Half of node width
    const sourceY = sourceNode.position.y + 30; // Half of node height
    const targetX = (mousePos.x - canvasRect.left) / zoom - pan.x;
    const targetY = (mousePos.y - canvasRect.top) / zoom - pan.y;
    
    // Create a bezier curve
    const midX = (sourceX + targetX) / 2;
    const path = `M ${sourceX} ${sourceY} C ${midX} ${sourceY}, ${midX} ${targetY}, ${targetX} ${targetY}`;
    
    return (
      <path
        d={path}
        fill="none"
        stroke="#6B7280"
        strokeWidth={2}
        strokeDasharray="5,5"
        className="pointer-events-none"
      />
    );
  };
  
  const renderContextMenu = () => {
    if (!showContextMenu) return null;
    
    const menuStyle = {
      left: `${contextMenuPos.x}px`,
      top: `${contextMenuPos.y}px`
    };
    
    return (
      <div 
        className="fixed bg-white rounded-lg shadow-lg border border-gray-200 z-50 w-48"
        style={menuStyle}
      >
        {selectedNode && (
          <div className="py-1">
            <button
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
              onClick={() => {
                // Edit node
                setShowContextMenu(false);
              }}
            >
              <Edit className="w-4 h-4" />
              <span>Editar nodo</span>
            </button>
            <button
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
              onClick={() => {
                handleDeleteNode(selectedNode.id);
              }}
            >
              <Trash2 className="w-4 h-4" />
              <span>Eliminar nodo</span>
            </button>
          </div>
        )}
        
        {selectedEdge && (
          <div className="py-1">
            <button
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
              onClick={() => {
                // Edit edge
                setShowContextMenu(false);
              }}
            >
              <Edit className="w-4 h-4" />
              <span>Editar conexión</span>
            </button>
            <button
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
              onClick={() => {
                handleDeleteEdge(selectedEdge.id);
              }}
            >
              <Trash2 className="w-4 h-4" />
              <span>Eliminar conexión</span>
            </button>
          </div>
        )}
        
        {!selectedNode && !selectedEdge && (
          <div className="py-1">
            <button
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
              onClick={() => {
                handleAddNode('action');
                setShowContextMenu(false);
              }}
            >
              <Plus className="w-4 h-4" />
              <span>Agregar acción</span>
            </button>
            <button
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
              onClick={() => {
                handleAddNode('condition');
                setShowContextMenu(false);
              }}
            >
              <Plus className="w-4 h-4" />
              <span>Agregar condición</span>
            </button>
          </div>
        )}
      </div>
    );
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-900">Constructor de Automatizaciones</h2>
            {selectedWorkflow && (
              <div className="flex items-center space-x-2">
                <span className="text-gray-500">|</span>
                <span className="font-medium text-gray-700">{selectedWorkflow.name}</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  selectedWorkflow.status === 'active' ? 'bg-green-100 text-green-800' :
                  selectedWorkflow.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {selectedWorkflow.status === 'active' ? 'Activo' :
                   selectedWorkflow.status === 'paused' ? 'Pausado' :
                   selectedWorkflow.status === 'archived' ? 'Archivado' : 'Borrador'}
                </span>
              </div>
            )}
          </div>
          <div className="flex space-x-3">
            <div className="relative">
              <button
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 flex items-center space-x-2 transition-colors"
              >
                <span>Seleccionar Automatización</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg z-10 hidden group-hover:block">
                {workflows.map((workflow) => (
                  <button
                    key={workflow.id}
                    onClick={() => setSelectedWorkflow(workflow)}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                  >
                    {workflow.name}
                  </button>
                ))}
              </div>
            </div>
            <button 
              onClick={handleCreateWorkflow}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Automatización</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Toolbar */}
      <div className="bg-gray-50 border-b border-gray-200 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => handleAddNode('trigger')}
              className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center space-x-1"
            >
              <Plus className="w-4 h-4" />
              <span>Trigger</span>
            </button>
            <button
              onClick={() => handleAddNode('action')}
              className="px-3 py-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200 flex items-center space-x-1"
            >
              <Plus className="w-4 h-4" />
              <span>Acción</span>
            </button>
            <button
              onClick={() => handleAddNode('condition')}
              className="px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 flex items-center space-x-1"
            >
              <Plus className="w-4 h-4" />
              <span>Condición</span>
            </button>
            <div className="h-6 border-r border-gray-300"></div>
            <button
              className="p-1.5 text-gray-600 hover:bg-gray-200 rounded"
              title="Guardar"
            >
              <Save className="w-4 h-4" />
            </button>
            <button
              className="p-1.5 text-gray-600 hover:bg-gray-200 rounded"
              title="Ejecutar"
            >
              <Play className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center space-x-3">
            <button
              className="p-1.5 text-gray-600 hover:bg-gray-200 rounded"
              title="Zoom In"
              onClick={() => setZoom(prev => Math.min(prev + 0.1, 2))}
            >
              <Plus className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-600">{Math.round(zoom * 100)}%</span>
            <button
              className="p-1.5 text-gray-600 hover:bg-gray-200 rounded"
              title="Zoom Out"
              onClick={() => setZoom(prev => Math.max(prev - 0.1, 0.5))}
            >
              <Minus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden bg-gray-50" ref={canvasRef}>
        {selectedWorkflow ? (
          <div
            className="absolute inset-0"
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onContextMenu={(e) => e.preventDefault()}
            style={{
              transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
              transformOrigin: '0 0'
            }}
          >
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="10"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="#6B7280" />
                </marker>
              </defs>
              {selectedWorkflow.edges.map(renderEdge)}
              {renderTempEdge()}
            </svg>
            {selectedWorkflow.nodes.map(renderNode)}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Zap className="mx-auto h-16 w-16 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                No hay automatización seleccionada
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Selecciona una automatización existente o crea una nueva para comenzar
              </p>
              <button
                onClick={handleCreateWorkflow}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Nueva Automatización</span>
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Workflow Form Modal */}
      {showWorkflowForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingWorkflow ? 'Editar Automatización' : 'Nueva Automatización'}
              </h2>
              <button
                onClick={() => setShowWorkflowForm(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de la Automatización *
                  </label>
                  <input
                    type="text"
                    required
                    value={workflowFormData.name}
                    onChange={(e) => setWorkflowFormData({ ...workflowFormData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: Bienvenida a nuevos contactos"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción
                  </label>
                  <textarea
                    rows={2}
                    value={workflowFormData.description}
                    onChange={(e) => setWorkflowFormData({ ...workflowFormData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Descripción de la automatización (opcional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Trigger *
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {triggerTypes.map((trigger) => (
                      <div
                        key={trigger.id}
                        onClick={() => setWorkflowFormData({ ...workflowFormData, trigger_type: trigger.id })}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          workflowFormData.trigger_type === trigger.id 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                            <trigger.icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{trigger.name}</h4>
                            <p className="text-xs text-gray-600 mt-1">{trigger.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estado
                  </label>
                  <select
                    value={workflowFormData.status}
                    onChange={(e) => setWorkflowFormData({ ...workflowFormData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="draft">Borrador</option>
                    <option value="active">Activo</option>
                    <option value="paused">Pausado</option>
                    <option value="archived">Archivado</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowWorkflowForm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveWorkflow}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>{editingWorkflow ? 'Actualizar' : 'Crear'} Automatización</span>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Node Form Modal */}
      {showNodeForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {selectedNodeType === 'trigger' ? 'Configurar Trigger' : 
                 selectedNodeType === 'action' ? 'Agregar Acción' : 'Agregar Condición'}
              </h2>
              <button
                onClick={() => setShowNodeForm(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 space-y-6">
                  <h3 className="text-lg font-medium text-gray-900">
                    {selectedNodeType === 'trigger' ? 'Seleccionar Trigger' : 
                     selectedNodeType === 'action' ? 'Seleccionar Acción' : 'Seleccionar Condición'}
                  </h3>
                  <div className="space-y-2">
                    {selectedNodeType === 'trigger' && triggerTypes.map((trigger) => (
                      <div
                        key={trigger.id}
                        onClick={() => setSelectedActionType(trigger.id)}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedActionType === trigger.id 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                            <trigger.icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{trigger.name}</h4>
                            <p className="text-xs text-gray-600 mt-1">{trigger.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {selectedNodeType === 'action' && actionTypes.map((action) => (
                      <div
                        key={action.id}
                        onClick={() => setSelectedActionType(action.id)}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedActionType === action.id 
                            ? 'border-green-500 bg-green-50' 
                            : 'border-gray-200 hover:border-green-300 hover:bg-green-50'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="p-2 rounded-lg bg-green-100 text-green-600">
                            <action.icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{action.name}</h4>
                            <p className="text-xs text-gray-600 mt-1">{action.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {selectedNodeType === 'condition' && conditionTypes.map((condition) => (
                      <div
                        key={condition.id}
                        onClick={() => setSelectedActionType(condition.id)}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedActionType === condition.id 
                            ? 'border-yellow-500 bg-yellow-50' 
                            : 'border-gray-200 hover:border-yellow-300 hover:bg-yellow-50'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="p-2 rounded-lg bg-yellow-100 text-yellow-600">
                            <condition.icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{condition.name}</h4>
                            <p className="text-xs text-gray-600 mt-1">{condition.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="md:col-span-2 space-y-6">
                  <h3 className="text-lg font-medium text-gray-900">Configuración</h3>
                  
                  {selectedActionType === 'send_email' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Plantilla de Email
                        </label>
                        <select
                          value={nodeFormData.template_id || ''}
                          onChange={(e) => setNodeFormData({ ...nodeFormData, template_id: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Seleccionar plantilla</option>
                          <option value="welcome_email">Email de Bienvenida</option>
                          <option value="follow_up">Email de Seguimiento</option>
                          <option value="promotion">Email Promocional</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Asunto
                        </label>
                        <input
                          type="text"
                          value={nodeFormData.subject || ''}
                          onChange={(e) => setNodeFormData({ ...nodeFormData, subject: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Asunto del email"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Retraso (minutos)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={nodeFormData.delay || 0}
                          onChange={(e) => setNodeFormData({ ...nodeFormData, delay: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Tiempo de espera antes de enviar el email (0 para envío inmediato)
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {selectedActionType === 'send_whatsapp' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Plantilla de WhatsApp
                        </label>
                        <select
                          value={nodeFormData.template || ''}
                          onChange={(e) => setNodeFormData({ ...nodeFormData, template: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Seleccionar plantilla</option>
                          <option value="welcome_message">Mensaje de Bienvenida</option>
                          <option value="follow_up">Mensaje de Seguimiento</option>
                          <option value="appointment_reminder">Recordatorio de Cita</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Retraso (minutos)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={nodeFormData.delay || 0}
                          onChange={(e) => setNodeFormData({ ...nodeFormData, delay: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  )}
                  
                  {selectedActionType === 'add_tag' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Etiqueta
                        </label>
                        <select
                          value={nodeFormData.tag || ''}
                          onChange={(e) => setNodeFormData({ ...nodeFormData, tag: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Seleccionar etiqueta</option>
                          <option value="nuevo_contacto">Nuevo Contacto</option>
                          <option value="cliente_potencial">Cliente Potencial</option>
                          <option value="cliente_vip">Cliente VIP</option>
                        </select>
                      </div>
                    </div>
                  )}
                  
                  {selectedActionType === 'move_to_list' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Lista
                        </label>
                        <select
                          value={nodeFormData.list_id || ''}
                          onChange={(e) => setNodeFormData({ ...nodeFormData, list_id: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Seleccionar lista</option>
                          <option value="list_1">Lista de Clientes</option>
                          <option value="list_2">Lista de Prospectos</option>
                          <option value="list_3">Lista de Seguimiento</option>
                        </select>
                      </div>
                    </div>
                  )}
                  
                  {selectedActionType === 'create_task' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Título de la Tarea
                        </label>
                        <input
                          type="text"
                          value={nodeFormData.task_title || ''}
                          onChange={(e) => setNodeFormData({ ...nodeFormData, task_title: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Ej: Llamar al cliente"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Asignar a
                        </label>
                        <select
                          value={nodeFormData.assigned_to || ''}
                          onChange={(e) => setNodeFormData({ ...nodeFormData, assigned_to: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Seleccionar asignado</option>
                          <option value="user_1">Juan Pérez</option>
                          <option value="user_2">María García</option>
                          <option value="sales_team">Equipo de Ventas</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Prioridad
                        </label>
                        <select
                          value={nodeFormData.priority || 'medium'}
                          onChange={(e) => setNodeFormData({ ...nodeFormData, priority: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="low">Baja</option>
                          <option value="medium">Media</option>
                          <option value="high">Alta</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Fecha de vencimiento (días)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={nodeFormData.due_days || 1}
                          onChange={(e) => setNodeFormData({ ...nodeFormData, due_days: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Días a partir de hoy para la fecha de vencimiento
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {selectedActionType === 'update_field' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Campo a actualizar
                        </label>
                        <select
                          value={nodeFormData.field || ''}
                          onChange={(e) => setNodeFormData({ ...nodeFormData, field: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Seleccionar campo</option>
                          <option value="status">Estado</option>
                          <option value="segment">Segmento</option>
                          <option value="score">Puntuación</option>
                          <option value="custom_field_1">Campo personalizado 1</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nuevo valor
                        </label>
                        <input
                          type="text"
                          value={nodeFormData.value || ''}
                          onChange={(e) => setNodeFormData({ ...nodeFormData, value: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Nuevo valor para el campo"
                        />
                      </div>
                    </div>
                  )}
                  
                  {selectedActionType === 'if_else' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Campo a evaluar
                        </label>
                        <select
                          value={nodeFormData.field || ''}
                          onChange={(e) => setNodeFormData({ ...nodeFormData, field: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Seleccionar campo</option>
                          <option value="email">Email</option>
                          <option value="segment">Segmento</option>
                          <option value="score">Puntuación</option>
                          <option value="value">Valor</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Operador
                        </label>
                        <select
                          value={nodeFormData.operator || ''}
                          onChange={(e) => setNodeFormData({ ...nodeFormData, operator: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Seleccionar operador</option>
                          <option value="equals">Es igual a</option>
                          <option value="not_equals">No es igual a</option>
                          <option value="contains">Contiene</option>
                          <option value="not_contains">No contiene</option>
                          <option value="greater_than">Mayor que</option>
                          <option value="less_than">Menor que</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Valor
                        </label>
                        <input
                          type="text"
                          value={nodeFormData.value || ''}
                          onChange={(e) => setNodeFormData({ ...nodeFormData, value: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Valor para comparar"
                        />
                      </div>
                    </div>
                  )}
                  
                  {selectedActionType === 'wait' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tiempo de espera
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <input
                              type="number"
                              min="0"
                              value={nodeFormData.wait_amount || 1}
                              onChange={(e) => setNodeFormData({ ...nodeFormData, wait_amount: parseInt(e.target.value) })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <select
                              value={nodeFormData.wait_unit || 'days'}
                              onChange={(e) => setNodeFormData({ ...nodeFormData, wait_unit: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="minutes">Minutos</option>
                              <option value="hours">Horas</option>
                              <option value="days">Días</option>
                              <option value="weeks">Semanas</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Placeholder for other node types */}
                  {!selectedActionType && (
                    <div className="bg-gray-50 p-6 rounded-lg">
                      <p className="text-gray-600 text-center">
                        Selecciona un tipo de {selectedNodeType} para configurar
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowNodeForm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveNode}
                disabled={!selectedActionType}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>Agregar al Flujo</span>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Edge Form Modal */}
      {showEdgeForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Configurar Conexión</h2>
              <button
                onClick={() => setShowEdgeForm(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Etiqueta de la Conexión
                  </label>
                  <input
                    type="text"
                    value={edgeFormData.label || ''}
                    onChange={(e) => setEdgeFormData({ ...edgeFormData, label: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: Sí, No, Entonces, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Conexión
                  </label>
                  <select
                    value={edgeFormData.type || ''}
                    onChange={(e) => setEdgeFormData({ ...edgeFormData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Estándar</option>
                    <option value="success">Éxito (Verde)</option>
                    <option value="failure">Fallo (Rojo)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Animación
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="animated"
                      checked={edgeFormData.animated || false}
                      onChange={(e) => setEdgeFormData({ ...edgeFormData, animated: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="animated" className="text-sm text-gray-900">
                      Mostrar animación de flujo
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowEdgeForm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  // Handle save edge
                  setShowEdgeForm(false);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Guardar Conexión</span>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {renderContextMenu()}
    </div>
  );
};

// Minus icon component for zoom out
const Minus: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);