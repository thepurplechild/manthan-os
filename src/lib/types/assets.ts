export const ASSET_TYPES = {
  // Text-based assets
  SCRIPT: 'SCRIPT',
  OUTLINE: 'OUTLINE',
  CHARACTER_SHEET: 'CHARACTER_SHEET',
  DIALOGUE_SAMPLE: 'DIALOGUE_SAMPLE',
  TREATMENT: 'TREATMENT',

  // Audio assets
  VOICE_SAMPLE: 'VOICE_SAMPLE',
  AUDIO_PILOT: 'AUDIO_PILOT',

  // Image assets
  IMAGE_REFERENCE: 'IMAGE_REFERENCE',
  IMAGE_CONCEPT: 'IMAGE_CONCEPT',

  // Video assets
  VIDEO_REFERENCE: 'VIDEO_REFERENCE',

  // Document assets
  MOOD_BOARD: 'MOOD_BOARD',
  PITCH_DECK: 'PITCH_DECK',
} as const;

export type AssetType = typeof ASSET_TYPES[keyof typeof ASSET_TYPES];

export const ASSET_TYPE_CATEGORIES = {
  text: ['SCRIPT', 'OUTLINE', 'CHARACTER_SHEET', 'DIALOGUE_SAMPLE', 'TREATMENT'],
  audio: ['VOICE_SAMPLE', 'AUDIO_PILOT'],
  image: ['IMAGE_REFERENCE', 'IMAGE_CONCEPT'],
  video: ['VIDEO_REFERENCE'],
  document: ['MOOD_BOARD', 'PITCH_DECK'],
} as const;

export const MIME_TYPE_TO_ASSET_TYPE: Record<string, AssetType[]> = {
  // Text formats
  'application/pdf': ['SCRIPT', 'TREATMENT', 'MOOD_BOARD', 'PITCH_DECK'],
  'text/plain': ['SCRIPT', 'OUTLINE', 'CHARACTER_SHEET', 'DIALOGUE_SAMPLE'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['SCRIPT', 'TREATMENT'],

  // Audio formats
  'audio/mpeg': ['VOICE_SAMPLE', 'AUDIO_PILOT'],
  'audio/wav': ['VOICE_SAMPLE', 'AUDIO_PILOT'],
  'audio/mp4': ['VOICE_SAMPLE', 'AUDIO_PILOT'],

  // Image formats
  'image/jpeg': ['IMAGE_REFERENCE', 'IMAGE_CONCEPT'],
  'image/png': ['IMAGE_REFERENCE', 'IMAGE_CONCEPT'],
  'image/webp': ['IMAGE_REFERENCE', 'IMAGE_CONCEPT'],

  // Video formats
  'video/mp4': ['VIDEO_REFERENCE'],
  'video/quicktime': ['VIDEO_REFERENCE'],

  // Presentation formats
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['MOOD_BOARD', 'PITCH_DECK'],
  'application/vnd.ms-powerpoint': ['MOOD_BOARD', 'PITCH_DECK'],
};

export const MAX_FILE_SIZES: Record<string, number> = {
  text: 50 * 1024 * 1024,      // 50MB
  audio: 100 * 1024 * 1024,    // 100MB
  image: 20 * 1024 * 1024,     // 20MB
  video: 500 * 1024 * 1024,    // 500MB
  document: 50 * 1024 * 1024,  // 50MB
};

export interface AssetMetadata {
  // Common fields
  duration?: number;        // For audio/video (seconds)
  dimensions?: {            // For images/video
    width: number;
    height: number;
  };

  // Type-specific fields
  characterName?: string;   // For CHARACTER_SHEET, VOICE_SAMPLE
  location?: string;        // For IMAGE_REFERENCE, VIDEO_REFERENCE
  sceneNumber?: string;     // For DIALOGUE_SAMPLE
  pageCount?: number;       // For documents
  slideCount?: number;      // For presentations

  // Processing metadata
  thumbnailUrl?: string;    // Generated thumbnail
  transcription?: string;   // For audio/video (future)
  tags?: string[];         // User-defined or auto-generated
}

export interface DocumentWithAssets {
  id: string;
  title: string;
  asset_type: AssetType;
  mime_type: string;
  storage_url: string;
  file_size_bytes: number;
  is_primary: boolean;
  asset_metadata: AssetMetadata;
  processing_status: string;
  created_at: string;

  // Related assets (if this is a primary project)
  related_assets?: DocumentWithAssets[];
}

// Helper functions
export function getAssetCategory(assetType: AssetType): keyof typeof ASSET_TYPE_CATEGORIES {
  for (const [category, types] of Object.entries(ASSET_TYPE_CATEGORIES)) {
    if ((types as readonly string[]).includes(assetType)) {
      return category as keyof typeof ASSET_TYPE_CATEGORIES;
    }
  }
  throw new Error(`Unknown asset type: ${assetType}`);
}

export function getMaxFileSizeForAssetType(assetType: AssetType): number {
  const category = getAssetCategory(assetType);
  return MAX_FILE_SIZES[category];
}

export function getPossibleAssetTypesForMimeType(mimeType: string): AssetType[] {
  return MIME_TYPE_TO_ASSET_TYPE[mimeType] || [];
}

export function isValidMimeTypeForAssetType(mimeType: string, assetType: AssetType): boolean {
  const possibleTypes = getPossibleAssetTypesForMimeType(mimeType);
  return possibleTypes.includes(assetType);
}