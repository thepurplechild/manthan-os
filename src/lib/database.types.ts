export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      documents: {
        Row: {
          id: string
          owner_id: string
          title: string
          storage_url: string
          processing_status: string
          created_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          title: string
          storage_url: string
          processing_status?: string
          created_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          title?: string
          storage_url?: string
          processing_status?: string
          created_at?: string
        }
      }
    }
  }
}