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

// Final Draft MIME type (critical!)
export const FINAL_DRAFT_MIME = 'application/x-finaldraft';

// Comprehensive MIME type to asset type mapping
export const MIME_TYPE_TO_ASSET_TYPE: Record<string, AssetType[]> = {
  // Final Draft (highest priority)
  'application/x-finaldraft': ['SCRIPT'],

  // Documents - scripts, outlines, character sheets
  'application/pdf': ['SCRIPT', 'OUTLINE', 'CHARACTER_SHEET', 'DIALOGUE_SAMPLE', 'MOOD_BOARD', 'TREATMENT'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['SCRIPT', 'OUTLINE', 'CHARACTER_SHEET', 'DIALOGUE_SAMPLE', 'TREATMENT'],
  'application/msword': ['SCRIPT', 'OUTLINE', 'CHARACTER_SHEET', 'DIALOGUE_SAMPLE'],
  'text/plain': ['OUTLINE', 'CHARACTER_SHEET', 'DIALOGUE_SAMPLE'],

  // Images
  'image/jpeg': ['IMAGE_REFERENCE', 'IMAGE_CONCEPT'],
  'image/png': ['IMAGE_REFERENCE', 'IMAGE_CONCEPT'],
  'image/webp': ['IMAGE_REFERENCE', 'IMAGE_CONCEPT'],

  // Audio
  'audio/mpeg': ['VOICE_SAMPLE', 'AUDIO_PILOT'],
  'audio/wav': ['VOICE_SAMPLE', 'AUDIO_PILOT'],
  'audio/mp4': ['VOICE_SAMPLE', 'AUDIO_PILOT'],
  'audio/x-m4a': ['VOICE_SAMPLE', 'AUDIO_PILOT'],

  // Video
  'video/mp4': ['VIDEO_REFERENCE'],
  'video/quicktime': ['VIDEO_REFERENCE'],
  'video/webm': ['VIDEO_REFERENCE'],

  // Presentations
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['MOOD_BOARD'],
  'application/vnd.ms-powerpoint': ['MOOD_BOARD'],
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

// Smart detection based on filename patterns
export function detectAssetTypeFromFile(file: File): AssetType[] {
  const ext = file.name.split('.').pop()?.toLowerCase();
  const name = file.name.toLowerCase();

  // Extension-based detection (highest priority)
  if (ext === 'fdx') return ['SCRIPT'];

  // Filename pattern detection
  if (name.includes('outline') || name.includes('beat')) return ['OUTLINE'];
  if (name.includes('character') && !name.includes('concept')) return ['CHARACTER_SHEET'];
  if (name.includes('scene') || name.includes('dialogue')) return ['DIALOGUE_SAMPLE'];
  if (name.includes('mood') || name.includes('board')) return ['MOOD_BOARD'];
  if (name.includes('concept') || name.includes('art')) return ['IMAGE_CONCEPT'];
  if (name.includes('voice') || name.includes('sample')) return ['VOICE_SAMPLE'];
  if (name.includes('reference')) {
    if (ext && ['mp4', 'mov', 'webm'].includes(ext)) return ['VIDEO_REFERENCE'];
    if (ext && ['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return ['IMAGE_REFERENCE'];
  }

  // Fall back to MIME type detection
  const mimeTypes = MIME_TYPE_TO_ASSET_TYPE[file.type];
  if (mimeTypes && mimeTypes.length > 0) return mimeTypes;

  return [];
}

// Get file extension helper
export function getFileExtension(filename: string): string {
  return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2).toLowerCase();
}

// Format file size for display
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}