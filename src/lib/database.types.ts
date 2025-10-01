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
          storage_path: string
          file_size_bytes: number
          processing_status: string
          created_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          title: string
          storage_url: string
          storage_path: string
          file_size_bytes: number
          processing_status?: string
          created_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          title?: string
          storage_url?: string
          storage_path?: string
          file_size_bytes?: number
          processing_status?: string
          created_at?: string
        }
      }
      document_sections: {
        Row: {
          id: string
          document_id: string
          section_type: string
          content: Json
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          section_type: string
          content: Json
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          section_type?: string
          content?: Json
          created_at?: string
        }
      }
    }
  }
}