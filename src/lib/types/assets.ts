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

/**
 * Detects the most appropriate asset type(s) for a given file
 * Priority: MIME type → Filename refinement → Extension fallback
 */
export function detectAssetTypeFromFile(file: File): AssetType[] {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const name = file.name.toLowerCase();
  const mimeType = file.type;

  // ═══════════════════════════════════════════════════════════
  // PRIORITY 1: MIME TYPE DETECTION (Most reliable)
  // ═══════════════════════════════════════════════════════════

  // IMAGE FILES - Detect by MIME type first
  if (mimeType.startsWith('image/') || ['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
    // Refine by filename pattern within images
    if (name.includes('concept') || name.includes('art')) {
      return ['IMAGE_CONCEPT'];
    }
    // Default all images to IMAGE_REFERENCE
    return ['IMAGE_REFERENCE'];
  }

  // AUDIO FILES - Detect by MIME type first
  if (mimeType.startsWith('audio/') || ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a'].includes(mimeType)) {
    return ['VOICE_SAMPLE'];
  }

  // VIDEO FILES - Detect by MIME type first
  if (mimeType.startsWith('video/') || ['video/mp4', 'video/quicktime', 'video/webm'].includes(mimeType)) {
    return ['VIDEO_REFERENCE'];
  }

  // DOCUMENT FILES - Detect by MIME type, refine by filename
  // PDF files can be multiple types - use filename to disambiguate
  if (mimeType === 'application/pdf') {
    if (name.includes('script')) return ['SCRIPT'];
    if (name.includes('outline') || name.includes('beat')) return ['OUTLINE'];
    if (name.includes('character')) return ['CHARACTER_SHEET'];
    if (name.includes('scene') || name.includes('dialogue')) return ['DIALOGUE_SAMPLE'];
    if (name.includes('mood') || name.includes('board')) return ['MOOD_BOARD'];
    // Default PDF to script if no pattern matches
    return ['SCRIPT', 'OUTLINE', 'MOOD_BOARD'];
  }

  // WORD DOCUMENTS - Can be multiple types
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword') {
    if (name.includes('script')) return ['SCRIPT'];
    if (name.includes('outline') || name.includes('beat')) return ['OUTLINE'];
    if (name.includes('character')) return ['CHARACTER_SHEET'];
    if (name.includes('scene') || name.includes('dialogue')) return ['DIALOGUE_SAMPLE'];
    // Default Word docs to outline/character sheet
    return ['OUTLINE', 'CHARACTER_SHEET'];
  }

  // TEXT FILES - Usually outline, character, or dialogue
  if (mimeType === 'text/plain') {
    if (name.includes('outline') || name.includes('beat')) return ['OUTLINE'];
    if (name.includes('character')) return ['CHARACTER_SHEET'];
    if (name.includes('scene') || name.includes('dialogue')) return ['DIALOGUE_SAMPLE'];
    // Default text files to outline/character
    return ['OUTLINE', 'CHARACTER_SHEET', 'DIALOGUE_SAMPLE'];
  }

  // POWERPOINT - Mood boards
  if (mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      mimeType === 'application/vnd.ms-powerpoint') {
    return ['MOOD_BOARD'];
  }

  // ═══════════════════════════════════════════════════════════
  // PRIORITY 2: EXTENSION-BASED DETECTION (For special cases)
  // ═══════════════════════════════════════════════════════════

  // Final Draft files (.fdx) - Special case, highest priority for scripts
  if (ext === 'fdx') {
    return ['SCRIPT'];
  }

  // Image extensions (in case MIME type is missing or generic)
  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
    if (name.includes('concept') || name.includes('art')) return ['IMAGE_CONCEPT'];
    return ['IMAGE_REFERENCE'];
  }

  // Audio extensions (backup)
  if (['mp3', 'wav', 'm4a', 'aac'].includes(ext)) {
    return ['VOICE_SAMPLE'];
  }

  // Video extensions (backup)
  if (['mp4', 'mov', 'webm', 'avi'].includes(ext)) {
    return ['VIDEO_REFERENCE'];
  }

  // Document extensions (backup)
  if (['pdf'].includes(ext)) {
    return ['SCRIPT', 'OUTLINE', 'MOOD_BOARD'];
  }
  if (['docx', 'doc'].includes(ext)) {
    return ['OUTLINE', 'CHARACTER_SHEET'];
  }
  if (['txt'].includes(ext)) {
    return ['OUTLINE', 'CHARACTER_SHEET', 'DIALOGUE_SAMPLE'];
  }
  if (['pptx', 'ppt'].includes(ext)) {
    return ['MOOD_BOARD'];
  }

  // ═══════════════════════════════════════════════════════════
  // PRIORITY 3: FALLBACK TO MIME TYPE MAPPING
  // ═══════════════════════════════════════════════════════════

  // Use the static mapping as final fallback
  const mappedTypes = MIME_TYPE_TO_ASSET_TYPE[mimeType];
  if (mappedTypes && mappedTypes.length > 0) {
    return mappedTypes;
  }

  // No detection possible
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