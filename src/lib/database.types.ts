export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type ProcessingStatus = 'UPLOADED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

export type AnalysisOutputType = 
  | 'CHARACTER_BIBLE' 
  | 'SYNOPSIS' 
  | 'LOGLINES' 
  | 'ONE_PAGER' 
  | 'GENRE_CLASSIFICATION' 
  | 'PACKAGING_BRIEF'

export type AnalysisStatus = 'GENERATING' | 'GENERATED' | 'FAILED'

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
          processing_status: ProcessingStatus
          extracted_text: string | null
          created_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          title: string
          storage_url: string
          storage_path: string
          file_size_bytes: number
          processing_status?: ProcessingStatus
          extracted_text?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          title?: string
          storage_url?: string
          storage_path?: string
          file_size_bytes?: number
          processing_status?: ProcessingStatus
          extracted_text?: string | null
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
      script_analysis_outputs: {
        Row: {
          id: string
          document_id: string
          output_type: AnalysisOutputType
          content: Json
          status: AnalysisStatus
          version: number
          processing_time_ms: number | null
          ai_model: string
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          document_id: string
          output_type: AnalysisOutputType
          content: Json
          status?: AnalysisStatus
          version?: number
          processing_time_ms?: number | null
          ai_model?: string
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          output_type?: AnalysisOutputType
          content?: Json
          status?: AnalysisStatus
          version?: number
          processing_time_ms?: number | null
          ai_model?: string
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}