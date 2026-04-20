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
      gigs: {
        Row: {
          id: string
          org_id: string
          title: string
          description: string
          category: string
          seniority_level: string
          years_experience: string
          schedule_days: string[]
          schedule_hours: string
          schedule_timezone: string[]
          schedule_flexibility: string | null
          commission_per_call: number
          commission_bonus_amount: number
          commission_currency: Json
          commission_structure: string | null
          transaction_commission: number
          minimum_volume: Json
          additional_details: string | null
          team_size: number
          team_structure: Json
          team_territories: string[]
          prerequisites: string[]
          call_types: string[]
          status: 'to_activate' | 'active' | 'inactive' | 'archived'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          title: string
          description: string
          category: string
          seniority_level: string
          years_experience: string
          schedule_days: string[]
          schedule_hours: string
          schedule_timezone: string[]
          schedule_flexibility?: string | null
          commission_per_call?: number
          commission_bonus_amount?: number
          commission_currency?: Json
          commission_structure?: string | null
          transaction_commission?: number
          minimum_volume?: Json
          additional_details?: string | null
          team_size: number
          team_structure: Json
          team_territories: string[]
          prerequisites: string[]
          call_types: string[]
          status?: 'to_activate' | 'active' | 'inactive' | 'archived'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          title?: string
          description?: string
          category?: string
          seniority_level?: string
          years_experience?: string
          schedule_days?: string[]
          schedule_hours?: string
          schedule_timezone?: string[]
          schedule_flexibility?: string | null
          commission_per_call?: number
          commission_bonus_amount?: number
          commission_currency?: Json
          commission_structure?: string | null
          transaction_commission?: number
          minimum_volume?: Json
          additional_details?: string | null
          team_size?: string
          team_structure?: Json
          team_territories?: string[]
          prerequisites?: string[]
          call_types?: string[]
          created_at?: string
          updated_at?: string
        }
      }
      // ... other tables remain the same
    }
  }
}
