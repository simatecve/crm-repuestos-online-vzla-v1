import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: 'admin' | 'manager' | 'user';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          full_name: string;
          role?: 'admin' | 'manager' | 'user';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: 'admin' | 'manager' | 'user';
          updated_at?: string;
        };
      };
      contacts: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string;
          tags: string[];
          segment: string;
          status: 'active' | 'inactive';
          created_at: string;
          updated_at: string;
          score: number;
          custom_fields: any;
          behavior_data: any;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          phone?: string;
          tags?: string[];
          segment?: string;
          status?: 'active' | 'inactive';
          created_at?: string;
          updated_at?: string;
          score?: number;
          custom_fields?: any;
          behavior_data?: any;
        };
        Update: {
          name?: string;
          email?: string;
          phone?: string;
          tags?: string[];
          segment?: string;
          status?: 'active' | 'inactive';
          updated_at?: string;
          score?: number;
          custom_fields?: any;
          behavior_data?: any;
        };
      };
      contact_groups: {
        Row: {
          id: string;
          name: string;
          description: string;
          color: string;
          is_active: boolean;
          member_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string;
          color?: string;
          is_active?: boolean;
          member_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string;
          color?: string;
          is_active?: boolean;
          member_count?: number;
          updated_at?: string;
        };
      };
      contact_tags: {
        Row: {
          id: string;
          name: string;
          description: string;
          color: string;
          is_active: boolean;
          usage_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string;
          color?: string;
          is_active?: boolean;
          usage_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string;
          color?: string;
          is_active?: boolean;
          usage_count?: number;
          updated_at?: string;
        };
      };
      grupos: {
        Row: {
          id: string;
          nombre: string;
          descripcion: string;
          color: string;
          total_contactos: number;
          activo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nombre: string;
          descripcion?: string;
          color?: string;
          total_contactos?: number;
          activo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          nombre?: string;
          descripcion?: string;
          color?: string;
          total_contactos?: number;
          activo?: boolean;
          updated_at?: string;
        };
      };
      etiquetas: {
        Row: {
          id: string;
          nombre: string;
          color: string;
          descripcion: string;
          activa: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nombre: string;
          color?: string;
          descripcion?: string;
          activa?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          nombre?: string;
          color?: string;
          descripcion?: string;
          activa?: boolean;
          updated_at?: string;
        };
      };
      listas: {
        Row: {
          id: string;
          nombre: string;
          descripcion: string;
          tipo: 'estatica' | 'dinamica';
          criterios: any;
          total_contactos: number;
          activa: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nombre: string;
          descripcion?: string;
          tipo?: 'estatica' | 'dinamica';
          criterios?: any;
          total_contactos?: number;
          activa?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          nombre?: string;
          descripcion?: string;
          tipo?: 'estatica' | 'dinamica';
          criterios?: any;
          total_contactos?: number;
          activa?: boolean;
          updated_at?: string;
        };
      };
      plantillas: {
        Row: {
          id: string;
          nombre: string;
          tipo: 'email' | 'whatsapp' | 'sms';
          asunto: string;
          contenido: string;
          variables: any;
          activa: boolean;
          uso_count: number;
          created_at: string;
          updated_at: string;
          conditional_content: any;
          target_segments: any;
        };
        Insert: {
          id?: string;
          nombre: string;
          tipo: 'email' | 'whatsapp' | 'sms';
          asunto?: string;
          contenido: string;
          variables?: any;
          activa?: boolean;
          uso_count?: number;
          created_at?: string;
          updated_at?: string;
          conditional_content?: any;
          target_segments?: any;
        };
        Update: {
          nombre?: string;
          tipo?: 'email' | 'whatsapp' | 'sms';
          asunto?: string;
          contenido?: string;
          variables?: any;
          activa?: boolean;
          uso_count?: number;
          updated_at?: string;
          conditional_content?: any;
          target_segments?: any;
        };
      };
      campaigns: {
        Row: {
          id: string;
          name: string;
          type: 'email' | 'whatsapp';
          subject: string;
          content: string;
          status: 'draft' | 'scheduled' | 'sent' | 'paused';
          sent_count: number;
          open_count: number;
          click_count: number;
          scheduled_at: string | null;
          created_at: string;
          updated_at: string;
          is_ab_test: boolean;
          ab_test_config: any;
          personalization_config: any;
        };
        Insert: {
          id?: string;
          name: string;
          type: 'email' | 'whatsapp';
          subject: string;
          content: string;
          status?: 'draft' | 'scheduled' | 'sent' | 'paused';
          sent_count?: number;
          open_count?: number;
          click_count?: number;
          scheduled_at?: string | null;
          created_at?: string;
          updated_at?: string;
          is_ab_test?: boolean;
          ab_test_config?: any;
          personalization_config?: any;
        };
        Update: {
          name?: string;
          type?: 'email' | 'whatsapp';
          subject?: string;
          content?: string;
          status?: 'draft' | 'scheduled' | 'sent' | 'paused';
          sent_count?: number;
          open_count?: number;
          click_count?: number;
          scheduled_at?: string | null;
          updated_at?: string;
          is_ab_test?: boolean;
          ab_test_config?: any;
          personalization_config?: any;
        };
      };
      leads: {
        Row: {
          id: string;
          name: string;
          email: string | null;
          phone: string;
          company: string;
          value: number;
          stage: string;
          priority: 'low' | 'medium' | 'high';
          assigned_to: string;
          notes: string;
          created_at: string;
          updated_at: string;
          score: number;
          custom_fields: any;
          behavior_data: any;
          instancia: string | null;
          push_name: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          email?: string | null;
          phone?: string;
          company?: string;
          value?: number;
          stage?: string;
          priority?: 'low' | 'medium' | 'high';
          assigned_to?: string;
          notes?: string;
          created_at?: string;
          updated_at?: string;
          score?: number;
          custom_fields?: any;
          behavior_data?: any;
          instancia?: string | null;
          push_name?: string | null;
        };
        Update: {
          name?: string;
          email?: string | null;
          phone?: string;
          company?: string;
          value?: number;
          stage?: string;
          priority?: 'low' | 'medium' | 'high';
          assigned_to?: string;
          notes?: string;
          updated_at?: string;
          score?: number;
          custom_fields?: any;
          behavior_data?: any;
          instancia?: string | null;
          push_name?: string | null;
        };
      };
      messages: {
        Row: {
          id: string;
          phone_number: string;
          pushname: string | null;
          message_content: string;
          message_type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location';
          direction: 'sent' | 'received';
          status: 'sent' | 'delivered' | 'read' | 'failed';
          timestamp: string;
          is_read: boolean;
          metadata: any;
          created_at: string;
          instancia: string;
          adjunto: string | null;
          conversation_id: string | null;
        };
        Insert: {
          id?: string;
          phone_number: string;
          pushname?: string | null;
          message_content: string;
          message_type?: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location';
          direction: 'sent' | 'received';
          status?: 'sent' | 'delivered' | 'read' | 'failed';
          timestamp?: string;
          is_read?: boolean;
          metadata?: any;
          created_at?: string;
          instancia?: string;
          adjunto?: string | null;
          conversation_id?: string | null;
        };
        Update: {
          phone_number?: string;
          pushname?: string | null;
          message_content?: string;
          message_type?: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location';
          direction?: 'sent' | 'received';
          status?: 'sent' | 'delivered' | 'read' | 'failed';
          timestamp?: string;
          is_read?: boolean;
          metadata?: any;
          instancia?: string;
          adjunto?: string | null;
          conversation_id?: string | null;
        };
      };
      conversations: {
        Row: {
          id: string;
          phone_number: string;
          contact_name: string | null;
          pushname: string | null;
          avatar_url: string | null;
          last_message: string | null;
          last_message_time: string | null;
          unread_count: number;
          is_archived: boolean;
          is_pinned: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          phone_number: string;
          contact_name?: string | null;
          pushname?: string | null;
          avatar_url?: string | null;
          last_message?: string | null;
          last_message_time?: string | null;
          unread_count?: number;
          is_archived?: boolean;
          is_pinned?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          phone_number?: string;
          contact_name?: string | null;
          pushname?: string | null;
          avatar_url?: string | null;
          last_message?: string | null;
          last_message_time?: string | null;
          unread_count?: number;
          is_archived?: boolean;
          is_pinned?: boolean;
          updated_at?: string;
        };
      };
      quick_replies: {
        Row: {
          id: string;
          title: string;
          content: string;
          category: string;
          is_active: boolean;
          usage_count: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          content: string;
          category?: string;
          is_active?: boolean;
          usage_count?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          content?: string;
          category?: string;
          is_active?: boolean;
          usage_count?: number;
          updated_at?: string;
        };
      };
      whatsapp_instances: {
        Row: {
          id: string;
          name: string;
          color: string;
          status: 'connected' | 'disconnected' | 'connecting';
          qr_code: string | null;
          session_data: any;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          color?: string;
          status?: 'connected' | 'disconnected' | 'connecting';
          qr_code?: string | null;
          session_data?: any;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          color?: string;
          status?: 'connected' | 'disconnected' | 'connecting';
          qr_code?: string | null;
          session_data?: any;
          updated_at?: string;
        };
      };
      ai_agents: {
        Row: {
          id: string;
          name: string;
          prompt: string;
          instance_id: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          instance_name: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          prompt: string;
          instance_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          instance_name?: string | null;
        };
        Update: {
          name?: string;
          prompt?: string;
          instance_id?: string | null;
          is_active?: boolean;
          updated_at?: string;
          instance_name?: string | null;
        };
      };
      mensajes: {
        Row: {
          id: string;
          campana_id: string | null;
          contacto_id: string | null;
          tipo: 'email' | 'whatsapp' | 'sms';
          asunto: string;
          contenido: string;
          estado: 'pendiente' | 'enviado' | 'entregado' | 'abierto' | 'error';
          enviado_en: string | null;
          entregado_en: string | null;
          abierto_en: string | null;
          click_en: string | null;
          respondido_en: string | null;
          error_mensaje: string;
          metadatos: any;
          created_at: string;
        };
        Insert: {
          id?: string;
          campana_id?: string | null;
          contacto_id?: string | null;
          tipo: 'email' | 'whatsapp' | 'sms';
          asunto?: string;
          contenido: string;
          estado?: 'pendiente' | 'enviado' | 'entregado' | 'abierto' | 'error';
          enviado_en?: string | null;
          entregado_en?: string | null;
          abierto_en?: string | null;
          click_en?: string | null;
          respondido_en?: string | null;
          error_mensaje?: string;
          metadatos?: any;
          created_at?: string;
        };
        Update: {
          campana_id?: string | null;
          contacto_id?: string | null;
          tipo?: 'email' | 'whatsapp' | 'sms';
          asunto?: string;
          contenido?: string;
          estado?: 'pendiente' | 'enviado' | 'entregado' | 'abierto' | 'error';
          enviado_en?: string | null;
          entregado_en?: string | null;
          abierto_en?: string | null;
          click_en?: string | null;
          respondido_en?: string | null;
          error_mensaje?: string;
          metadatos?: any;
        };
      };
      interacciones: {
        Row: {
          id: string;
          tipo: string;
          contacto_id: string | null;
          lead_id: string | null;
          campana_id: string | null;
          mensaje_id: string | null;
          usuario_id: string | null;
          titulo: string;
          descripcion: string;
          fecha: string;
          metadatos: any;
        };
        Insert: {
          id?: string;
          tipo: string;
          contacto_id?: string | null;
          lead_id?: string | null;
          campana_id?: string | null;
          mensaje_id?: string | null;
          usuario_id?: string | null;
          titulo: string;
          descripcion?: string;
          fecha?: string;
          metadatos?: any;
        };
        Update: {
          tipo?: string;
          contacto_id?: string | null;
          lead_id?: string | null;
          campana_id?: string | null;
          mensaje_id?: string | null;
          usuario_id?: string | null;
          titulo?: string;
          descripcion?: string;
          fecha?: string;
          metadatos?: any;
        };
      };
    };
  };
};