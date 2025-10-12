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
  // Detect possible types for this file
  const detectedTypes = detectAssetTypeFromFile(file);

  if (detectedTypes.length === 0) {
    return {
      valid: false,
      error: `Unsupported file type: ${file.type || 'unknown'} (.${getFileExtension(file.name)})`,
    };
  }

  // Determine category based on MIME type first, then extension
  let category: string = 'document';
  const mimeType = file.type;
  const ext = getFileExtension(file.name);

  if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
    category = 'image';
  } else if (mimeType.startsWith('audio/') || ['mp3', 'wav', 'm4a'].includes(ext)) {
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
    if (!detectedTypes.includes(expectedType)) {
      return {
        valid: false,
        error: `This file type (${mimeType || ext}) cannot be used as ${expectedType}`,
      };
    }
  }

  return {
    valid: true,
    suggestedTypes: detectedTypes,
    category,
  };
}


export function sanitizeFilename(filename: string): string {
  // Remove special characters, keep alphanumeric, dash, underscore, dot
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}