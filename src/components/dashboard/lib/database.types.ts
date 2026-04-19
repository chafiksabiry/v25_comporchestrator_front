export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      integrations: {
        Row: {
          id: string
          name: string
          description: string
          category: string
          status: 'connected' | 'error' | 'pending'
          icon_url: string
          config: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          description: string
          category: string
          status?: 'connected' | 'error' | 'pending'
          icon_url: string
          config?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          category?: string
          status?: 'connected' | 'error' | 'pending'
          icon_url?: string
          config?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      integration_connections: {
        Row: {
          id: string
          integration_id: string
          status: 'active' | 'error' | 'pending'
          config: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          integration_id: string
          status?: 'active' | 'error' | 'pending'
          config: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          integration_id?: string
          status?: 'active' | 'error' | 'pending'
          config?: Json
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
