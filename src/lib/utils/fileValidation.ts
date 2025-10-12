import {
  MAX_FILE_SIZES,
  detectAssetTypeFromFile,
  getFileExtension,
  type AssetType
} from '@/lib/types/assets';

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  suggestedTypes?: AssetType[];
  category?: string;
}

export function validateFile(
  file: File,
  expectedType?: AssetType
): FileValidationResult {
  // Get file details
  const mimeType = file.type;
  const ext = getFileExtension(file.name);

  // Detect possible types for this file
  const detectedTypes = detectAssetTypeFromFile(file);

  // Special handling for audio files - accept audio files even if not in static mapping
  const audioExtensions = ['mp3', 'wav', 'm4a', 'aac', 'ogg'];
  const isAudioFile = mimeType.startsWith('audio/') || audioExtensions.includes(ext);

  if (detectedTypes.length === 0 && !isAudioFile) {
    return {
      valid: false,
      error: `Unsupported file type: ${mimeType || 'unknown'} (.${ext})`,
    };
  }

  // If audio file detected but no types returned, force VOICE_SAMPLE suggestion
  let finalDetectedTypes = detectedTypes;
  if (isAudioFile && detectedTypes.length === 0) {
    finalDetectedTypes = ['VOICE_SAMPLE'];
  }

  // Determine category based on MIME type first, then extension
  let category: string = 'document';

  if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
    category = 'image';
  } else if (mimeType.startsWith('audio/') || audioExtensions.includes(ext)) {
    category = 'audio';
  } else if (mimeType.startsWith('video/') || ['mp4', 'mov', 'webm'].includes(ext)) {
    category = 'video';
  } else if (mimeType.startsWith('text/') || ext === 'txt') {
    category = 'text';
  }

  // Check file size against category limit
  const maxSize = MAX_FILE_SIZES[category] || MAX_FILE_SIZES.document;
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File too large. Maximum size for ${category}: ${(maxSize / 1024 / 1024).toFixed(0)}MB`,
    };
  }

  // If expected type provided, validate it matches detected types
  if (expectedType) {
    // For audio files, always accept if expecting VOICE_SAMPLE or AUDIO_PILOT
    if (isAudioFile && (expectedType === 'VOICE_SAMPLE' || expectedType === 'AUDIO_PILOT')) {
      return {
        valid: true,
        suggestedTypes: [expectedType],
        category: 'audio',
      };
    }

    if (!finalDetectedTypes.includes(expectedType)) {
      return {
        valid: false,
        error: `This file type (${mimeType || ext}) cannot be used as ${expectedType}`,
      };
    }
  }

  return {
    valid: true,
    suggestedTypes: finalDetectedTypes,
    category,
  };
}


export function sanitizeFilename(filename: string): string {
  // Remove special characters, keep alphanumeric, dash, underscore, dot
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}