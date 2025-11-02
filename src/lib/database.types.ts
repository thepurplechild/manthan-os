export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type ProcessingStatus = 'UPLOADED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

export type AssetType =
  | 'SCRIPT'
  | 'OUTLINE'
  | 'CHARACTER_SHEET'
  | 'DIALOGUE_SAMPLE'
  | 'VOICE_SAMPLE'
  | 'AUDIO_PILOT'
  | 'IMAGE_REFERENCE'
  | 'IMAGE_CONCEPT'
  | 'VIDEO_REFERENCE'
  | 'MOOD_BOARD'
  | 'TREATMENT'
  | 'PITCH_DECK'

export type AnalysisOutputType =
  | 'CHARACTER_BIBLE'
  | 'SYNOPSIS'
  | 'LOGLINES'
  | 'ONE_PAGER'
  | 'GENRE_CLASSIFICATION'
  | 'PACKAGING_BRIEF'

export type AnalysisStatus = 'GENERATING' | 'GENERATED' | 'FAILED'

export type UserRole = 'creator' | 'founder'

export type DealStatus = 'introduced' | 'passed' | 'in_discussion' | 'deal_closed'

export interface AssetMetadata {
  duration?: number;
  dimensions?: {
    width: number;
    height: number;
  };
  characterName?: string;
  location?: string;
  sceneNumber?: string;
  pageCount?: number;
  slideCount?: number;
  thumbnailUrl?: string;
  transcription?: string;
  tags?: string[];
}

export interface Database {
  public: {
    Tables: {
      documents: {
        Row: {
          id: string
          owner_id: string
          title: string
          asset_type: AssetType
          storage_url: string
          storage_path: string
          file_size_bytes: number
          processing_status: ProcessingStatus
          extracted_text: string | null
          asset_metadata: AssetMetadata
          parent_document_id: string | null
          mime_type: string | null
          is_primary: boolean
          created_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          title: string
          asset_type?: AssetType
          storage_url: string
          storage_path: string
          file_size_bytes: number
          processing_status?: ProcessingStatus
          extracted_text?: string | null
          asset_metadata?: AssetMetadata
          parent_document_id?: string | null
          mime_type?: string | null
          is_primary?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          title?: string
          asset_type?: AssetType
          storage_url?: string
          storage_path?: string
          file_size_bytes?: number
          processing_status?: ProcessingStatus
          extracted_text?: string | null
          asset_metadata?: AssetMetadata
          parent_document_id?: string | null
          mime_type?: string | null
          is_primary?: boolean
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
      profiles: {
        Row: {
          id: string
          full_name: string | null
          role: UserRole
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          role?: UserRole
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          role?: UserRole
          created_at?: string
          updated_at?: string
        }
      }
      platform_mandates: {
        Row: {
          id: string
          platform_name: string
          mandate_description: string
          tags: string[]
          source: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          platform_name: string
          mandate_description: string
          tags?: string[]
          source?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          platform_name?: string
          mandate_description?: string
          tags?: string[]
          source?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      deal_pipeline: {
        Row: {
          id: string
          project_id: string
          target_buyer_name: string
          status: DealStatus
          feedback_notes: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          target_buyer_name: string
          status?: DealStatus
          feedback_notes?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          target_buyer_name?: string
          status?: DealStatus
          feedback_notes?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}